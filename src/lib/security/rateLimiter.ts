import type { NextFunction, Request, Response } from 'express';

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  maxEntries?: number;
  now?: () => number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetEpochSec: number;
  retryAfterSec: number;
}

/**
 * Sliding-window per-IP rate limiter with automatic expired-entry eviction.
 *
 * NOTE: This rate limiter is per-instance (in-memory only). In a horizontally scaled
 * multi-instance deployment, each container maintains its own counters; pair with a
 * shared store (e.g., Redis) for cluster-wide enforcement.
 */
export class PerInstanceIpRateLimiter {
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly maxEntries: number;
  private readonly now: () => number;
  private readonly hits = new Map<string, number[]>();
  private lastPruneMs = 0;

  constructor(options: RateLimiterOptions) {
    if (!Number.isFinite(options.windowMs) || options.windowMs <= 0) {
      throw new RangeError('windowMs must be a positive finite number');
    }
    if (!Number.isInteger(options.maxRequests) || options.maxRequests <= 0) {
      throw new RangeError('maxRequests must be a positive integer');
    }
    if (
      options.maxEntries !== undefined &&
      (!Number.isInteger(options.maxEntries) || options.maxEntries <= 0)
    ) {
      throw new RangeError('maxEntries must be a positive integer');
    }
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.maxEntries = options.maxEntries ?? 10_000;
    this.now = options.now ?? (() => Date.now());
  }

  public pruneExpired(currentMs = this.now()): number {
    const cutoffMs = currentMs - this.windowMs;
    let removed = 0;
    for (const [key, timestamps] of this.hits.entries()) {
      const latest = timestamps[timestamps.length - 1];
      if (latest === undefined || latest <= cutoffMs) {
        this.hits.delete(key);
        removed += 1;
      } else {
        const active = timestamps.filter((ts) => ts > cutoffMs);
        if (active.length === 0) {
          this.hits.delete(key);
          removed += 1;
        } else if (active.length !== timestamps.length) {
          this.hits.set(key, active);
        }
      }
    }
    this.lastPruneMs = currentMs;
    return removed;
  }

  public size(): number {
    return this.hits.size;
  }

  public check(ipKey: string): RateLimitCheckResult {
    const currentMs = this.now();
    if (
      currentMs - this.lastPruneMs >= this.windowMs ||
      this.hits.size >= this.maxEntries
    ) {
      this.pruneExpired(currentMs);
    }

    const cutoffMs = currentMs - this.windowMs;
    const existing = this.hits.get(ipKey) ?? [];
    const active = existing.filter((ts) => ts > cutoffMs);

    if (active.length >= this.maxRequests) {
      const oldestActive = active[0] ?? currentMs;
      const retryAfterMs = Math.max(1, oldestActive + this.windowMs - currentMs);
      this.hits.delete(ipKey);
      this.hits.set(ipKey, active);
      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        resetEpochSec: Math.ceil((oldestActive + this.windowMs) / 1000),
        retryAfterSec: Math.ceil(retryAfterMs / 1000),
      };
    }

    if (!this.hits.has(ipKey) && this.hits.size >= this.maxEntries) {
      // Evict oldest tracked key if still at capacity after pruning expired entries
      const oldestKey = this.hits.keys().next().value;
      if (oldestKey !== undefined) {
        this.hits.delete(oldestKey);
      }
    }

    active.push(currentMs);
    this.hits.delete(ipKey);
    this.hits.set(ipKey, active);

    const oldest = active[0] ?? currentMs;
    return {
      allowed: true,
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - active.length),
      resetEpochSec: Math.ceil((oldest + this.windowMs) / 1000),
      retryAfterSec: 0,
    };
  }

  public clear(): void {
    this.hits.clear();
  }
}

export function extractClientIp(req: Request): string {
  const raw = req.ip || req.socket?.remoteAddress || 'unknown';
  return raw.replace(/^::ffff:/, '');
}

export function createRateLimitMiddleware(limiter: PerInstanceIpRateLimiter) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = extractClientIp(req);
    const result = limiter.check(ip);

    res.setHeader('X-RateLimit-Limit', String(result.limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('X-RateLimit-Reset', String(result.resetEpochSec));

    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfterSec));
      res.status(429).json({
        error: 'Too many requests. Please wait a moment and try again.',
        code: 'RATE_LIMITED',
      });
      return;
    }

    next();
  };
}

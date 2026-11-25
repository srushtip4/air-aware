import type { NextFunction, Request, Response } from 'express';

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
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
 * Sliding-window per-IP rate limiter.
 *
 * NOTE: This rate limiter is per-instance (in-memory only). In a horizontally scaled
 * multi-instance deployment, each container maintains its own counters; pair with a
 * shared store (e.g., Redis) for cluster-wide enforcement.
 */
export class PerInstanceIpRateLimiter {
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly now: () => number;
  private readonly hits = new Map<string, number[]>();

  constructor(options: RateLimiterOptions) {
    if (!Number.isFinite(options.windowMs) || options.windowMs <= 0) {
      throw new RangeError('windowMs must be a positive finite number');
    }
    if (!Number.isInteger(options.maxRequests) || options.maxRequests <= 0) {
      throw new RangeError('maxRequests must be a positive integer');
    }
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.now = options.now ?? (() => Date.now());
  }

  public check(ipKey: string): RateLimitCheckResult {
    const currentMs = this.now();
    const cutoffMs = currentMs - this.windowMs;
    const existing = this.hits.get(ipKey) ?? [];
    const active = existing.filter((ts) => ts > cutoffMs);

    if (active.length >= this.maxRequests) {
      const oldestActive = active[0] ?? currentMs;
      const retryAfterMs = Math.max(1, oldestActive + this.windowMs - currentMs);
      this.hits.set(ipKey, active);
      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        resetEpochSec: Math.ceil((oldestActive + this.windowMs) / 1000),
        retryAfterSec: Math.ceil(retryAfterMs / 1000),
      };
    }

    active.push(currentMs);
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

import { describe, expect, it, vi } from 'vitest';
import {
  computeAssistCacheKey,
  toCoarseProfile,
} from '../../src/lib/ai';
import {
  CircuitBreaker,
  CircuitOpenError,
  UpstreamTimeoutError,
  isTransientError,
  withRetryAndTimeout,
} from '../../src/lib/resilience';
import {
  PerInstanceIpRateLimiter,
  SECURITY_HEADERS,
  createServerLogger,
  redactSensitiveText,
} from '../../src/lib/security';
import type { UserProfile } from '../../src/types';

const baseProfile: UserProfile = {
  locationQuery: '123 Secret Street, Apt 4B, New Delhi',
  household: {
    hasChildren: true,
    hasElderly: false,
    hasRespiratoryCondition: true,
    householdSize: 4,
  },
  commuteMode: 'car_petrol',
  commuteDistanceKmOneWay: 12,
  commuteDaysPerWeek: 5,
  cookingFuel: 'lpg',
  heatingSource: 'electric_heater',
  homeType: 'apartment',
  budgetTier: 'low_cost',
};

describe('Resilience: CircuitBreaker and Retry/Timeout', () => {
  it('opens circuit after failureThreshold and recovers through HALF_OPEN', async () => {
    let clock = 1_000;
    const breaker = new CircuitBreaker({
      name: 'test-upstream',
      failureThreshold: 2,
      cooldownMs: 5_000,
      now: () => clock,
    });

    await expect(
      breaker.execute(async () => {
        throw new Error('fail-1');
      }),
    ).rejects.toThrow('fail-1');
    expect(breaker.getState()).toBe('CLOSED');

    await expect(
      breaker.execute(async () => {
        throw new Error('fail-2');
      }),
    ).rejects.toThrow('fail-2');
    expect(breaker.getState()).toBe('OPEN');

    await expect(breaker.execute(async () => 'blocked')).rejects.toThrow(
      CircuitOpenError,
    );

    clock += 5_000;
    expect(breaker.getState()).toBe('HALF_OPEN');

    const recovered = await breaker.execute(async () => 'ok');
    expect(recovered).toBe('ok');
    expect(breaker.getState()).toBe('CLOSED');

    breaker.reset();
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('retries transient errors with exponential backoff and skips retry on 400', async () => {
    const delays: number[] = [];
    let attempts = 0;

    const result = await withRetryAndTimeout(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          const err = Object.assign(new Error('Upstream 503'), { statusCode: 503 });
          throw err;
        }
        return 'success';
      },
      {
        timeoutMs: 1_000,
        maxRetries: 2,
        baseDelayMs: 100,
        sleepFn: async (ms) => {
          delays.push(ms);
        },
      },
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
    expect(delays).toEqual([100, 200]);

    const badReqAttempts = vi.fn(async () => {
      throw Object.assign(new Error('Bad Request'), { statusCode: 400 });
    });
    await expect(
      withRetryAndTimeout(badReqAttempts, {
        maxRetries: 2,
        sleepFn: async () => undefined,
      }),
    ).rejects.toThrow('Bad Request');
    expect(badReqAttempts).toHaveBeenCalledTimes(1);
  });

  it('aborts and throws UpstreamTimeoutError when operation exceeds timeoutMs', async () => {
    await expect(
      withRetryAndTimeout(
        (signal) =>
          new Promise((_, reject) => {
            signal.addEventListener('abort', () => {
              reject(new Error('aborted'));
            });
          }),
        {
          timeoutMs: 25,
          maxRetries: 0,
        },
      ),
    ).rejects.toThrow(UpstreamTimeoutError);

    expect(isTransientError(new UpstreamTimeoutError(100))).toBe(true);
    expect(isTransientError(new CircuitOpenError('x', 100))).toBe(false);
  });
});

describe('Security helpers, coarse privacy, and cache key hashing', () => {
  it('enforces per-IP sliding window rate limits and resets after window', () => {
    let clock = 10_000;
    const limiter = new PerInstanceIpRateLimiter({
      windowMs: 1_000,
      maxRequests: 2,
      now: () => clock,
    });

    expect(limiter.check('1.2.3.4').allowed).toBe(true);
    expect(limiter.check('1.2.3.4').remaining).toBe(0);
    const blocked = limiter.check('1.2.3.4');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);

    // Different IP is independent
    expect(limiter.check('5.6.7.8').allowed).toBe(true);

    clock += 1_001;
    expect(limiter.check('1.2.3.4').allowed).toBe(true);
    limiter.clear();
  });

  it('evicts expired entries automatically and bounds memory at maxEntries', () => {
    let clock = 1_000;
    const limiter = new PerInstanceIpRateLimiter({
      windowMs: 500,
      maxRequests: 2,
      maxEntries: 3,
      now: () => clock,
    });

    limiter.check('10.0.0.1');
    limiter.check('10.0.0.2');
    limiter.check('10.0.0.3');
    expect(limiter.size()).toBe(3);

    // Adding a 4th active IP within window evicts oldest entry so size stays bounded at maxEntries
    limiter.check('10.0.0.4');
    expect(limiter.size()).toBe(3);

    // Advance past windowMs: next check triggers automatic pruneExpired(), leaving only the new IP
    clock += 600;
    limiter.check('10.0.0.5');
    expect(limiter.size()).toBe(1);
    limiter.clear();
  });

  it('defines strict security headers and redacts secrets in server logs', () => {
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("default-src 'self'");
    expect(SECURITY_HEADERS['Referrer-Policy']).toBeTruthy();
    expect(SECURITY_HEADERS['Permissions-Policy']).toBeTruthy();
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('SAMEORIGIN');

    const redacted = redactSensitiveText(
      'Failed with key AIzaSyD1234567890abcdefghij and Bearer secret_token_123',
    );
    expect(redacted).not.toContain('AIzaSyD');
    expect(redacted).not.toContain('secret_token_123');
    expect(redacted).toContain('[REDACTED]');

    const lines: string[] = [];
    const logger = createServerLogger((line) => lines.push(line));
    logger.log({
      level: 'error',
      event: 'test_event',
      route: '/api/assist',
      detail: 'api_key=supersecret',
    });
    expect(lines[0]).not.toContain('supersecret');
  });

  it('strips street addresses into coarse profile buckets and hashes cache keys deterministically', () => {
    const coarse = toCoarseProfile(baseProfile);
    expect(JSON.stringify(coarse)).not.toContain('Secret Street');
    expect(coarse.householdSizeBucket).toBe('small_2_4');
    expect(coarse.commuteDistanceBucket).toBe('medium_6_15km');

    const key1 = computeAssistCacheKey({
      city: '  New Delhi ',
      band: 'Very Poor',
      profile: baseProfile,
    });
    const key2 = computeAssistCacheKey({
      city: 'new delhi',
      band: 'Very Poor',
      profile: {
        ...baseProfile,
        locationQuery: 'Completely Different Street 99',
        household: { ...baseProfile.household, householdSize: 3 },
        commuteDistanceKmOneWay: 10,
      },
    });
    expect(key1).toBe(key2);

    const keyDifferentBand = computeAssistCacheKey({
      city: 'New Delhi',
      band: 'Severe',
      profile: baseProfile,
    });
    expect(keyDifferentBand).not.toBe(key1);
  });
});

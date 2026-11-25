import { describe, expect, it, vi } from 'vitest';
import { TtlCache } from '../../src/lib/cache';

describe('TtlCache with deduplication and stale-while-error', () => {
  it('validates constructor and set options', () => {
    expect(() => new TtlCache({ ttlMs: 0 })).toThrow(RangeError);
    expect(() => new TtlCache({ ttlMs: 1000, staleWhileErrorMs: -1 })).toThrow(
      RangeError,
    );
    expect(() => new TtlCache({ ttlMs: 1000, maxEntries: 0 })).toThrow(RangeError);

    const cache = new TtlCache<string>({ ttlMs: 1000 });
    expect(() => cache.set('k', 'v', -5)).toThrow(RangeError);
  });

  it('returns cache hits within TTL and refetches after expiration', async () => {
    let clock = 10_000;
    const cache = new TtlCache<number>({
      ttlMs: 1_000,
      now: () => clock,
    });

    const fetcher = vi.fn(async () => clock);

    const first = await cache.getOrFetch('aqi:delhi', fetcher);
    expect(first.status).toBe('miss');
    expect(first.value).toBe(10_000);
    expect(fetcher).toHaveBeenCalledTimes(1);

    clock += 500;
    const second = await cache.getOrFetch('aqi:delhi', fetcher);
    expect(second.status).toBe('hit');
    expect(second.value).toBe(10_000);
    expect(fetcher).toHaveBeenCalledTimes(1);

    clock += 600; // past 1,000ms TTL
    const third = await cache.getOrFetch('aqi:delhi', fetcher);
    expect(third.status).toBe('miss');
    expect(third.value).toBe(11_100);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent in-flight fetches for the same key', async () => {
    let resolveUpstream!: (value: string) => void;
    const upstreamPromise = new Promise<string>((resolve) => {
      resolveUpstream = resolve;
    });

    const fetcher = vi.fn(() => upstreamPromise);
    const cache = new TtlCache<string>({ ttlMs: 5_000 });

    const p1 = cache.getOrFetch('city:kanpur', fetcher);
    const p2 = cache.getOrFetch('city:kanpur', fetcher);
    const p3 = cache.getOrFetch('city:kanpur', fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);

    resolveUpstream('AQI-326');
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    expect(r1.value).toBe('AQI-326');
    expect(r1.status).toBe('miss');
    expect(r2.value).toBe('AQI-326');
    expect(r2.status).toBe('deduped');
    expect(r3.value).toBe('AQI-326');
    expect(r3.status).toBe('deduped');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('serves stale-while-error within grace window and rethrows after grace expires', async () => {
    let clock = 1_000;
    const cache = new TtlCache<string>({
      ttlMs: 1_000,
      staleWhileErrorMs: 5_000,
      now: () => clock,
    });

    await cache.getOrFetch('aqi:kanpur', async () => 'AQI-290');

    clock += 2_000; // expired, within 5,000ms stale grace
    const staleResult = await cache.getOrFetch('aqi:kanpur', async () => {
      throw new Error('Upstream 503');
    });

    expect(staleResult.status).toBe('stale_on_error');
    expect(staleResult.value).toBe('AQI-290');
    expect(staleResult.error).toContain('Upstream 503');

    clock += 10_000; // past stale grace window
    await expect(
      cache.getOrFetch('aqi:kanpur', async () => {
        throw new Error('Still down');
      }),
    ).rejects.toThrow('Still down');
  });

  it('clears in-flight promise on error when no stale value exists so future calls retry', async () => {
    const cache = new TtlCache<string>({ ttlMs: 1_000 });
    const failingFetcher = vi.fn(async () => {
      throw new Error('Network failure');
    });

    await expect(cache.getOrFetch('k', failingFetcher)).rejects.toThrow(
      'Network failure',
    );

    const succeedingFetcher = vi.fn(async () => 'recovered');
    const result = await cache.getOrFetch('k', succeedingFetcher);
    expect(result.value).toBe('recovered');
  });

  it('evicts oldest entry at maxEntries and prunes expired entries', () => {
    let clock = 0;
    const cache = new TtlCache<number>({
      ttlMs: 100,
      staleWhileErrorMs: 50,
      maxEntries: 2,
      now: () => clock,
    });

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // evicts 'a'

    expect(cache.size()).toBe(2);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')?.value).toBe(2);

    clock = 200; // past ttl (100) + stale (50)
    expect(cache.pruneExpired()).toBe(2);
    expect(cache.size()).toBe(0);

    cache.set('x', 9);
    expect(cache.delete('x')).toBe(true);
    cache.set('y', 10);
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});

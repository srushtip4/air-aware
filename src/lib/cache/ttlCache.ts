export interface TtlCacheOptions {
  ttlMs: number;
  staleWhileErrorMs?: number;
  maxEntries?: number;
  now?: () => number;
}

export type CacheStatus = 'hit' | 'miss' | 'deduped' | 'stale_on_error';

export interface CacheEntry<TValue> {
  value: TValue;
  cachedAt: number;
  expiresAt: number;
}

export interface CacheFetchResult<TValue> {
  value: TValue;
  status: CacheStatus;
  cachedAt: number;
  expiresAt: number;
  error?: string;
}

interface InFlightResult<TValue> {
  value: TValue;
  status: 'miss' | 'stale_on_error';
  cachedAt: number;
  expiresAt: number;
  error?: string;
}

export class TtlCache<TValue> {
  private readonly ttlMs: number;
  private readonly staleWhileErrorMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;
  private readonly store = new Map<string, CacheEntry<TValue>>();
  private readonly inFlight = new Map<string, Promise<InFlightResult<TValue>>>();

  constructor(options: TtlCacheOptions) {
    if (!Number.isFinite(options.ttlMs) || options.ttlMs <= 0) {
      throw new RangeError('ttlMs must be a positive finite number');
    }
    const staleMs = options.staleWhileErrorMs ?? 0;
    if (!Number.isFinite(staleMs) || staleMs < 0) {
      throw new RangeError('staleWhileErrorMs must be a non-negative finite number');
    }
    const maxEntries = options.maxEntries ?? 500;
    if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
      throw new RangeError('maxEntries must be a positive integer');
    }

    this.ttlMs = options.ttlMs;
    this.staleWhileErrorMs = staleMs;
    this.maxEntries = maxEntries;
    this.now = options.now ?? (() => Date.now());
  }

  public get(key: string): CacheEntry<TValue> | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }
    if (this.now() >= entry.expiresAt) {
      return undefined;
    }
    return entry;
  }

  public set(key: string, value: TValue, customTtlMs?: number): CacheEntry<TValue> {
    const ttl = customTtlMs ?? this.ttlMs;
    if (!Number.isFinite(ttl) || ttl <= 0) {
      throw new RangeError('customTtlMs must be a positive finite number');
    }

    const timestamp = this.now();
    const entry: CacheEntry<TValue> = {
      value,
      cachedAt: timestamp,
      expiresAt: timestamp + ttl,
    };

    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, entry);
    return entry;
  }

  public delete(key: string): boolean {
    return this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }

  public size(): number {
    return this.store.size;
  }

  public pruneExpired(): number {
    const current = this.now();
    let removed = 0;
    for (const [key, entry] of this.store.entries()) {
      if (current > entry.expiresAt + this.staleWhileErrorMs) {
        this.store.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  public async getOrFetch(
    key: string,
    fetcher: () => Promise<TValue>,
  ): Promise<CacheFetchResult<TValue>> {
    const fresh = this.get(key);
    if (fresh) {
      return {
        value: fresh.value,
        status: 'hit',
        cachedAt: fresh.cachedAt,
        expiresAt: fresh.expiresAt,
      };
    }

    const existingFlight = this.inFlight.get(key);
    if (existingFlight) {
      const shared = await existingFlight;
      return {
        value: shared.value,
        status: shared.status === 'stale_on_error' ? 'stale_on_error' : 'deduped',
        cachedAt: shared.cachedAt,
        expiresAt: shared.expiresAt,
        error: shared.error,
      };
    }

    const flightPromise = this.executeFetch(key, fetcher);
    this.inFlight.set(key, flightPromise);

    try {
      const result = await flightPromise;
      return result;
    } finally {
      this.inFlight.delete(key);
    }
  }

  private async executeFetch(
    key: string,
    fetcher: () => Promise<TValue>,
  ): Promise<InFlightResult<TValue>> {
    try {
      const value = await fetcher();
      const entry = this.set(key, value);
      return {
        value: entry.value,
        status: 'miss',
        cachedAt: entry.cachedAt,
        expiresAt: entry.expiresAt,
      };
    } catch (err) {
      const existing = this.store.get(key);
      const currentTime = this.now();
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (
        existing &&
        this.staleWhileErrorMs > 0 &&
        currentTime <= existing.expiresAt + this.staleWhileErrorMs
      ) {
        return {
          value: existing.value,
          status: 'stale_on_error',
          cachedAt: existing.cachedAt,
          expiresAt: existing.expiresAt,
          error: errorMessage,
        };
      }

      throw err;
    }
  }
}

# Efficiency & Performance

AirAware minimizes upstream API calls, payload sizes, memory footprint, and production startup overhead.

## Implemented Practices & File Paths

- **TTL Caching & In-Flight Deduplication (`src/lib/cache/ttlCache.ts`)**: Concurrent identical geocoding, AQI, and AI assistant requests share a single in-flight promise (`deduped`), avoiding duplicate upstream requests. Configurable via `AQI_CACHE_TTL_MS` (default `600000` ms) and `AQI_CACHE_STALE_MS` (default `3600000` ms).
- **Stale-While-Error Grace (`src/lib/cache/ttlCache.ts`, `src/app/api/airHandler.ts`)**: When Open-Meteo fails or times out, recently expired readings within the stale window are returned with `isStale: true` instead of failing immediately.
- **HTTP Compression (`src/app/createApp.ts`)**: Applies `compression()` middleware to compress HTML, JS, CSS, and JSON responses.
- **Production Bundle & Lazy Dev Middleware (`package.json`, `server.ts`)**: `npm run build` bundles the Vite client (`dist/`) and builds a standalone Node ESM bundle (`dist-server/server.mjs` via `esbuild`); `server.ts` dynamically imports `vite` only when `NODE_ENV !== 'production'`.
- **Bounded In-Memory Maps (`src/lib/cache/ttlCache.ts`, `src/lib/security/rateLimiter.ts`)**: `TtlCache` enforces LRU eviction at `maxEntries: 500`, and `PerInstanceIpRateLimiter` prunes expired buckets and caps tracked IPs at `maxEntries: 5000` to prevent unbounded heap growth.
- **Coarse Prompt Payloads (`src/lib/ai/assistant.ts`)**: `toCoarseProfile()` strips personal/granular inputs down to compact enums before invoking Gemini, reducing token usage.

## Known Limitations

- **No Shared Distributed Cache**: Cache and rate-limiter maps are local to each Node process and reset on server restart or redeploy.
- **Client Bundle Size**: The built frontend bundle (`dist/assets/index-*.js` ~589 kB raw / ~166 kB gzipped) ships as a single chunk without route-level code splitting.
- **Cold-Start Upstream Calls**: The first request for a city or unique `(city, band, profile, question)` hash incurs upstream Open-Meteo or Gemini latency before cache population.

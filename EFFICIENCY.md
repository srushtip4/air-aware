# Efficiency & Performance

AirAware optimizes runtime performance, memory usage, and bandwidth across all client and server operations.

## Efficiency Practices & File Paths

- **In-Flight Request Deduplication**: `src/lib/cache/ttlCache.ts` ensures concurrent identical upstream fetch requests share a single in-flight promise.
- **TTL Caching & Stale-While-Error**: AQI and geocoding responses are cached with configurable TTL (`AQI_CACHE_TTL_MS`) and served via stale-while-error grace if upstream services experience transient dropouts.
- **Coarse Payload Minimization**: `src/lib/ai/assistant.ts` strips out names and free text before sending context payloads to Gemini, reducing payload size and token consumption.
- **Lightweight Dependencies**: Uses high-performance libraries (`zod`, `express`, `@google/genai`) without unnecessary bundle bloat.

## Known Limitations

- **In-Memory Cache Size**: Caches use an LRU eviction strategy capped at `maxEntries: 500` per instance; cache state is lost upon server restart.

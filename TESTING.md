# Testing Architecture & Coverage

AirAware maintains a rigorous test suite achieving >94% line coverage across all domain libraries and API routes.

## Test Categories & File Paths

- **AQI & Adapters Unit Tests**: `tests/unit/aqi.test.ts` (CPCB NAQI math, trend calculation, OpenMeteoAdapter error handling & offline demo adapter).
- **Recommendations Engine Tests**: `tests/unit/recommendations.test.ts` (deterministic branch coverage across routines, hacks tiers, and safety precautions).
- **Impact Calculator Tests**: `tests/unit/impact.test.ts` (verified sourced factors, weekly totals, null handling, and community projections).
- **TTL Cache & Deduplication Tests**: `tests/unit/cache.test.ts` (TTL expiration, in-flight de-duplication, stale-while-error grace).
- **Validation Tests**: `tests/unit/validation.test.ts` (Zod strict schemas, length/range bounds, unknown field rejection).
- **Config & AI Tests**: `tests/unit/config_and_ai.test.ts` (env validation, `GEMINI_MODEL` runtime wiring).
- **Resilience & Security Tests**: `tests/unit/resilience_and_security.test.ts` (circuit breaker states, backoff retries, rate limiter sliding window, secret redaction).
- **API Route Integration Tests**: `tests/api/routes.test.ts` (GET `/api/air`, POST `/api/plan`, POST `/api/assist`, rate-limit headers, prompt injection, timeout fallback).

## Known Limitations

- **Unit Test Mocks**: External Open-Meteo and Gemini API calls are mocked in unit/integration tests to ensure determinism and zero network dependency; live upstream flakiness cannot be fully simulated without integration environments.

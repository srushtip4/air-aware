# API Documentation

AirAware exposes a REST API alongside its static frontend from a single Express server (default port `3000`, configurable via `PORT`).

## Endpoints & File Paths

### `GET /api/health`
- **File**: `src/app/createApp.ts`
- **Rate Limit**: None
- **Response (`200`)**: `{ "status": "ok", "service": "AirAware" }`

### `GET /api/air`
- **File**: `src/app/api/airHandler.ts`
- **Validation**: `airRouteQuerySchema` (`src/lib/validation/schemas.ts`, `.strict()`)
- **Rate Limit**: `60 req / 60s` per IP per instance (`generalRateLimiter`)
- **Query Parameters**:
  - `q` (string, `1..120` chars) **OR** `lat` (`-90..90`) & `lon` (`-180..180`) with optional `locationName`
  - `demo` (optional `'true'` | `'false'` | boolean)
- **Response (`200`)**:
  - `reading`: `AirQualityReading` (`aqi`, `pm25`, `pm10`, `no2`, `o3`, `band`, `source`, `timestamp`, `isDemoData`, `locationName`, `hourly`, `trend`)
  - `locations`: `GeocodedLocation[]`
  - `cacheStatus`: `'hit' | 'miss' | 'deduped' | 'stale_on_error'`
  - `isStale`: `boolean` (`true` when served via `stale_on_error`)
  - `cachedAt`: ISO timestamp string
  - `expiresAt`: ISO timestamp string
- **Error Responses**: `400 VALIDATION_ERROR`, `404 LOCATION_NOT_FOUND`, `429 RATE_LIMITED`, `503 UPSTREAM_UNAVAILABLE`

### `POST /api/plan`
- **File**: `src/app/api/planHandler.ts`
- **Validation**: `recommendationsRequestSchema` (`src/lib/validation/schemas.ts`, `.strict()`)
- **Rate Limit**: `60 req / 60s` per IP per instance (`generalRateLimiter`)
- **Request Body**: `{ band, trend, profile, communityHouseholds? }`
- **Response (`200`)**: `{ plan, impact, medicalDisclaimer }` (deterministic recommendations across `dailyRoutine`, `indoorHacks`, `sustainableAlternatives`, `safetyPrecautions`, plus factor-annotated `impact`)
- **Error Responses**: `400 VALIDATION_ERROR`, `400 INVALID_JSON`, `429 RATE_LIMITED`

### `POST /api/assist`
- **File**: `src/app/api/assistHandler.ts`
- **Validation**: `assistRequestSchema` (`src/lib/validation/schemas.ts`, `.strict()`)
- **Rate Limit**: `10 req / 60s` per IP per instance (`assistRateLimiter`)
- **Request Body**: `{ city, aqi, trend, profile, question?, communityHouseholds? }`
- **Behavior**: Strips profile to coarse buckets (`toCoarseProfile`), caches by SHA-256 hash of `(city, band, coarseProfile, question)`, invokes Gemini with `GEMINI_MODEL`, and validates structured JSON output with `geminiAssistOutputSchema` + secret/safety filters. If Gemini is unconfigured, times out, fails, or triggers the circuit breaker, returns HTTP `200` with `fallback: true`, `fallbackReason`, `assist: null`, and the full deterministic `plan` and `impact`.
- **Response (`200`)**: `{ fallback, fallbackReason?, cached, cacheStatus, bandInfo, plan, impact, assist, medicalDisclaimer }`
- **Error Responses**: `400 VALIDATION_ERROR`, `400 INVALID_JSON`, `429 RATE_LIMITED`

## Common Rate Limit & Security Headers

Every API response includes security headers (`src/lib/security/headers.ts`). Rate-limited endpoints return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and (on `429`) `Retry-After` headers.

## Known Limitations

- **Per-Instance Rate Limits**: Rate limit buckets are stored in server memory per process (`src/lib/security/rateLimiter.ts`) and do not coordinate across multiple instances.
- **Same-Origin Defaults**: No cross-origin CORS headers are emitted by default; clients are expected to be served from the same Express origin.
- **AI Availability**: `POST /api/assist` degrades to deterministic fallback responses (`fallback: true`) whenever `GEMINI_API_KEY` / `GEMINI_MODEL` are unset or upstream Gemini quotas fail.

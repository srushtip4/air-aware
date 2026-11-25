# Testing Architecture & Coverage

AirAware verifies domain rules, API endpoints, React components, accessibility, and production HTTP serving using Vitest, React Testing Library, Playwright, `axe-core`, and `scripts/verify-http.mjs`.

## Test Suites & File Paths

- **AQI & Adapters Unit Tests (`tests/unit/aqi.test.ts` — 31 tests)**: Indian CPCB NAQI sub-index math, `categorize()`, hourly trend classification, `OpenMeteoAdapter` abort/error handling, and `DemoAirQualityAdapter`.
- **Recommendations Engine (`tests/unit/recommendations.test.ts` — 13 tests)**: Deterministic `dailyRoutine`, `indoorHacks` (free / low-cost / investment), `sustainableAlternatives`, and safety precautions across AQI bands and profiles.
- **Impact Calculator & Factor Honesty (`tests/unit/impact.test.ts` — 9 tests)**: Baseline isolation (`indoor_pm25` vs `cooking_pm25`), 90% multiplicative indoor exposure cap, community projections, and `sourced` / `proxy` / `assumption` factor metadata.
- **TTL Cache (`tests/unit/cache.test.ts` — 6 tests)**: Expiration, in-flight deduplication, LRU eviction (`maxEntries`), and stale-while-error fallback.
- **Resilience & Security (`tests/unit/resilience_and_security.test.ts` — 7 tests)**: Circuit breaker state transitions, retry with exponential backoff, per-IP rate limiting + eviction, secret redaction, and security headers.
- **Config & AI Guardrails (`tests/unit/config_and_ai.test.ts` — 4 tests)**: Runtime `GEMINI_MODEL` wiring (`requireGeminiConfig`), coarse profile stripping, and prompt construction.
- **Validation (`tests/unit/validation.test.ts` — 3 tests)**: `.strict()` Zod schema bounds and unknown-key rejection.
- **API Route Integration (`tests/api/routes.test.ts` — 8 tests)**: Supertest/fetch checks for `/api/health`, `/api/air`, `/api/plan`, `/api/assist`, `400` validation errors, `429` rate limits, cache hits, Gemini fallback, and prompt-injection safety.
- **UI Component & Accessibility (`tests/component/ui.test.tsx` — 10 tests)**: React Testing Library + `axe-core` WCAG checks across `Navbar`, `FallbackBanner`, `ProfileView`, `NotFoundView`, `FactorBadge`, `PlanView`, `HomeView`, `App` freshness banners, and `AssistantView` `"AI unavailable"` fallback.
- **Playwright E2E & Full-Page Accessibility (`tests/e2e/smoke.spec.ts` — 1 end-to-end journey)**: Real headless Chromium test against the built Express server (`PORT=3100`) covering keyboard skip-link focus flow, `aria-live` announcements, city search (demo mode), household profile save, Clean-Air Plan calculation drawer, Impact slider/table, Assistant `"AI unavailable"` fallback, Printable Plan, and `axe-core` WCAG 2.1 AA audits on all 7 screen states.
- **Production HTTP Verification (`scripts/verify-http.mjs`)**: Boots `dist-server/server.mjs` in `NODE_ENV=production` and asserts `GET /` (200 HTML), `GET /api/air?q=New%20Delhi&demo=true` (200), `400` validation failures, `429` rate limiting on `/api/assist`, and all required security headers.

## Measured Results & Coverage

- **Vitest Run**: **9 test files passed, 91 tests passed** (`npm run test:coverage`).
- **Vitest V8 Coverage Scope** (`vitest.config.ts`: `include: ['src/lib/**/*.ts']`, excluding barrel `index.ts` and `src/lib/storage.ts`):
  - **Statements**: `94.36%`
  - **Branches**: `81.89%`
  - **Functions**: `95.42%`
  - **Lines**: `94.50%`
- **Playwright E2E (`npm run test:e2e`)**: **1 passed** (7 `axe-core` WCAG 2.1 AA scans with 0 violations).
- **Production HTTP Smoke (`npm run verify:http`)**: Passed against `dist-server/server.mjs`.

## Known Limitations

- **Coverage Scope**: `vitest.config.ts` measures V8 line/branch coverage over `src/lib/**/*.ts` (excluding `src/lib/**/index.ts` and `src/lib/storage.ts`); React UI views (`src/components/*`) and Express route wiring (`src/app/*`) are covered functionally by `tests/component/ui.test.tsx`, `tests/api/routes.test.ts`, and `tests/e2e/smoke.spec.ts` rather than included in the `src/lib` percentage.
- **Mocked Upstream Calls**: Unit, API, component, and E2E tests mock live Open-Meteo and Gemini network calls so CI executes deterministically offline without API keys or external network flakiness.

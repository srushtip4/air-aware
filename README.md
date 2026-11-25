# AirAware — Winter Smog & Urban Air Quality Assistant

AirAware is a zero-cost, single-service full-stack GenAI assistant helping families and communities navigate severe winter smog and urban air pollution. It combines live Open-Meteo AQI tracking (plus an offline Demo Mode), Indian CPCB NAQI category bands, a deterministic clean-air recommendations engine, a factor-transparent impact calculator, and optional Google Gemini explanations with automatic `"AI unavailable"` rule-based fallback.

## Features

- **Live AQI & Offline Demo Mode (`src/lib/aqi/`)**: Geocoding + hourly AQI via `OpenMeteoAdapter` behind a swappable `AirQualityDataAdapter` interface, with `DemoAirQualityAdapter`, freshness/stale-cache banners, and source/observation timestamps displayed next to every reading.
- **Tailored Clean-Air Plan (`src/lib/recommendations/`)**: Time-of-day routines, tiered indoor air quality hacks (`free`, `low_cost`, `investment`), sustainable alternatives, and household vulnerability precautions stored locally in browser `localStorage` (`src/lib/storage.ts`).
- **Transparent Impact Calculations (`src/lib/impact/`)**: Calculates weekly CO2e, PM2.5, and baseline-isolated indoor/cooking PM2.5 exposure reductions (90% multiplicative cap), displaying explicit `Proxy` (UK DESNZ/DEFRA 2024 CO2e with directional notes) and `Assumption` (author estimates, low confidence) badges and citations inside `"How was this calculated?"`.
- **Privacy-Safe GenAI Assistant (`src/lib/ai/`)**: Uses `GEMINI_API_KEY` and `GEMINI_MODEL` strictly server-side, sends only coarse profile buckets, validates structured JSON via Zod, and falls back gracefully with a clear `"AI unavailable"` banner and the deterministic rule-based plan whenever Gemini is unconfigured, times out, or hits quotas.

## Environment Variables

Copy `.env.example` to `.env` for local runs or configure these variables on your hosting provider:

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Optional (for live AI) | Unset | Server-side Google Gemini API key. If unset, `/api/assist` serves the rule-based fallback (`fallback: true`). |
| `GEMINI_MODEL` | Required for live AI | Unset | Gemini model identifier read strictly from `process.env` (never hard-coded in app code; e.g., set in host env or `.env`). |
| `PORT` | Optional | `3000` | HTTP port bound by Express (`0.0.0.0`). |
| `NODE_ENV` | Production hosts | `development` | Set `NODE_ENV=production` so `server.ts` serves pre-built `dist/` static assets without loading Vite. |
| `AQI_CACHE_TTL_MS` | Optional | `600000` | Freshness TTL for AQI and AI caches (10 min default). |
| `AQI_CACHE_STALE_MS` | Optional | `3600000` | Stale-while-error grace window for Open-Meteo outages (60 min default). |
| `OPEN_METEO_TIMEOUT_MS` | Optional | `8000` | Upstream timeout for Open-Meteo requests. |

## Scripts & Verification

```bash
npm install               # Install dependencies
npm run dev               # Run dev Express + Vite middleware on port 3000
npm run lint              # Run oxlint + tsc --noEmit
npm run typecheck         # Run TypeScript strict typecheck
npm run test:coverage     # Run Vitest unit, API, and component tests + V8 coverage
npm run build             # Build frontend (dist/) and server bundle (dist-server/server.mjs)
npm start                 # Run built production server (set NODE_ENV=production)
npm run verify:http       # Boot built server and assert /, demo /api/air, 400, 429, headers
npm run test:e2e          # Run Playwright E2E journey + 7 WCAG 2.1 AA axe-core audits
```

## Measured Test Results & Coverage

- **Vitest Suite (`npm run test:coverage`)**: **9 test files passed, 92 tests passed** (`tests/unit/*`, `tests/api/routes.test.ts`, `tests/component/ui.test.tsx`).
- **Vitest V8 Coverage** (`src/lib/**/*.ts`, excluding `src/lib/**/index.ts` and `src/lib/storage.ts`):
  - **Statements**: `94.36%`
  - **Branches**: `81.89%`
  - **Functions**: `95.42%`
  - **Lines**: `94.50%`
- **Playwright E2E + Accessibility (`npm run test:e2e`)**: **1 E2E journey passed** in headless Chromium covering keyboard skip-link focus, `aria-live` announcements, city search, hourly AQI chart rendering, profile save, Clean-Air Plan drawer, Impact slider/table, `"AI unavailable"` fallback, Printable Plan, Light/Dark theme toggle, and **13 `axe-core` WCAG 2.1 AA checks** (7 Light mode + 6 Dark mode, 0 violations).
- **HTTP Verification (`npm run verify:http`)**: Verified built `dist-server/server.mjs` serving HTML (`200`), demo `/api/air` (`200`), validation failures (`400`), `/api/assist` rate limit (`429`), and security headers.

## Single-Host Free Deployment (One Node Service)

AirAware runs both the built React frontend (`dist/`) and the Express `/api/*` backend from one Node process (`dist-server/server.mjs`), deployable on any free Node host (Render Web Service, Railway, or Fly.io):

1. **Connect Repository**: Create a new Node Web Service pointing to your AirAware repository.
2. **Build Command**: `npm ci && npm run build`
3. **Start Command**: `NODE_ENV=production npm start` (runs `node dist-server/server.mjs`, binding `0.0.0.0:${PORT:-3000}`).
4. **Environment Variables**:
   - Set `NODE_ENV=production`.
   - Optionally set `GEMINI_API_KEY` and `GEMINI_MODEL` (your chosen runtime Gemini model identifier). If omitted or if free-tier quotas are exhausted, AirAware continues operating fully via deterministic plans with a visible `"AI unavailable"` notice.
   - Optionally tune `AQI_CACHE_TTL_MS`, `AQI_CACHE_STALE_MS`, and `OPEN_METEO_TIMEOUT_MS`.
5. **Health Check Path**: `/api/health` (returns HTTP `200` `{"status":"ok","service":"AirAware"}`).

## Known Limitations

- **Per-Instance Cache & Rate Limits**: In-memory TTL caching (`src/lib/cache/ttlCache.ts`) and per-IP rate limiting (`src/lib/security/rateLimiter.ts`: `60 req/min` general, `10 req/min` AI assist) live in Node process memory. Multi-instance deployments do not share cache or rate-limit counters, and restarts clear state.
- **Impact Estimates (`Proxy` & `Assumption` Factors)**: Emission and exposure figures are modeled estimates (`src/lib/impact/factors.ts`), not household sensor measurements. Transport CO2e values use UK DESNZ/DEFRA 2024 factors as proxies (`confidence: 'medium'`), and cooking/waste/filtration PM2.5 reductions without verifiable published tables are labeled as author estimates (`confidence: 'low'`).
- **AI Quotas & Free-Tier Model Limits**: Google Gemini free-tier keys impose strict requests-per-minute and daily token quotas and may experience cold-start latency or throttling; when quotas or keys fail, `/api/assist` automatically serves the rule-based plan (`fallback: true`) with an explicit `"AI unavailable"` UI notice.
- **Device-Local Persistence**: Household profiles and last readings reside only in browser `localStorage` with zero server database or cross-device sync.

## Additional Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Problem Statement Alignment](./PROBLEM_ALIGNMENT.md)
- [API Documentation](./API_DOCS.md)
- [Testing & Coverage](./TESTING.md)
- [Security Documentation](./SECURITY.md)
- [Accessibility Documentation](./ACCESSIBILITY.md)
- [Efficiency & Performance](./EFFICIENCY.md)
- [Code Quality Guidelines](./CODE_QUALITY.md)

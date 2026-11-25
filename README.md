# AirAware — Winter Smog & Urban Air Quality Assistant

AirAware is a full-stack GenAI-powered assistant helping families and communities navigate severe winter smog and urban air pollution. It provides location-based AQI monitoring (Open-Meteo or offline demo mode), deterministic exposure-reduction recommendations, transparent impact estimations (avoided CO2e, PM2.5 emissions, and indoor exposure reduction), and privacy-safe Zod-validated Gemini assistant explanations.

## Quick Start

1. Install dependencies: `npm install`
2. Configure environment: Copy `.env.example` to `.env` and set `GEMINI_API_KEY` and `GEMINI_MODEL="gemini-4-hydrogen"`.
3. Run development server: `npm run dev`
4. Run tests & coverage: `npm run test:coverage`
5. Typecheck & lint: `npm run lint`

## Project Structure

- `server.ts`: Express server entrypoint mounting API routes and Vite middleware.
- `src/app/createApp.ts`: Express app factory with security headers and rate limiters.
- `src/app/api/`: API route handlers (`/api/air`, `/api/plan`, `/api/assist`).
- `src/lib/aqi/`: Open-Meteo adapter, offline demo adapter, Indian CPCB AQI bands, and trend analysis.
- `src/lib/recommendations/`: Deterministic rules engine (`dailyRoutine`, `indoorHacks`, `sustainableAlternatives`, safety precautions).
- `src/lib/impact/`: Sourced emission and exposure factors (`factors.ts`), calculator, weekly totals, and community projections.
- `src/lib/ai/`: Coarse privacy sanitation, Gemini structured JSON prompt builder, Zod validation, and cache-backed assistant runner.
- `src/lib/cache/`: TTL cache with in-flight request deduplication and stale-while-error fallback.
- `src/lib/resilience/`: Circuit breaker, timeout wrapper, and exponential backoff retry.
- `src/lib/security/`: Per-IP per-instance rate limiter, security headers, and privacy-safe structured logger.
- `src/lib/validation/`: Strict Zod schemas for profiles and all API routes.
- `tests/`: Comprehensive unit and API route test suites.

## Known Limitations

- **Per-Instance State**: In-memory caching (`src/lib/cache/ttlCache.ts`) and per-IP rate limiting (`src/lib/security/rateLimiter.ts`) are scoped to the running server process instance. In a horizontally scaled multi-container cluster, cache entries and rate limits are not shared across nodes.
- **Emission Estimates**: Impact figures are approximations based on published UK DEFRA/DESNZ, EMEP/EEA, and WHO conversion factors and lifestyle assumptions; individual variations in appliance efficiency and driving cycles apply.
- **AI Quotas**: Gemini API features depend on the availability and quota tier of the configured `GEMINI_API_KEY` and model.

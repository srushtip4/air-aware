# Problem Statement Alignment

This document maps every clause of the AirAware problem statement to the implemented application features and exact repository files.

**Problem Statement:**
> "Create a GenAI-powered assistant that helps families and communities navigate severe winter smog and urban air pollution. The application should suggest low-emission daily routines, indoor air quality hacks, and sustainable alternatives tailored to their location and lifestyle, while clearly explaining the direct impact of their choices."

## Clause-by-Clause Traceability

| Problem Statement Clause | Implemented Feature | Primary Implementation Files |
| :--- | :--- | :--- |
| **"Create a GenAI-powered assistant"** | Server-side Google Gemini structured-JSON Q&A grounded in deterministic impact & plan context, SHA-256 cached with prompt-injection screening, Zod schema validation, and explicit `"AI unavailable"` fallback banner displaying the rule-based plan when Gemini is unconfigured or unavailable | `src/lib/ai/assistant.ts`, `src/app/api/assistHandler.ts`, `src/lib/validation/schemas.ts`, `src/components/AssistantView.tsx`, `src/components/FallbackBanner.tsx` |
| **"that helps families and communities"** | Household vulnerability flags (children, elderly, respiratory conditions, household size), bilingual EN/HI UI labels, printable family clean-air sheet, and interactive community-scaling projection (`10` to `5,000` households) | `src/components/ProfileView.tsx`, `src/components/PrintablePlanView.tsx`, `src/lib/impact/calculator.ts`, `src/components/ImpactView.tsx`, `src/i18n/translations.ts` |
| **"navigate severe winter smog and urban air pollution."** | Indian CPCB NAQI categorization (`Good` through `Severe`), hourly inversion/worsening/improving trend analysis, live Open-Meteo data adapter with offline Demo Mode and stale-cache indicator banners showing source and observed timestamp | `src/lib/aqi/bands.ts`, `src/lib/aqi/trend.ts`, `src/lib/aqi/adapter.ts`, `src/app/api/airHandler.ts`, `src/components/HomeView.tsx`, `src/components/FallbackBanner.tsx` |
| **"The application should suggest low-emission daily routines,"** | Deterministic time-slotted daily routine schedule (`morning_inversion`, `midday_window`, `evening_lockdown`, `commute_window`) adapting ventilation and outdoor exertion windows to AQI band and hourly trend | `src/lib/recommendations/engine.ts`, `src/app/api/planHandler.ts`, `src/components/PlanView.tsx` |
| **"indoor air quality hacks,"** | Household- and budget-tiered indoor air quality hacks (`free`, `low_cost` e.g., DIY box fan MERV-13 filter, `investment` e.g., HEPA purifier, cross-ventilation, weatherstripping, exhaust hood) | `src/lib/recommendations/engine.ts`, `src/components/PlanView.tsx` |
| **"and sustainable alternatives"** | Actionable lifestyle shifts (car-to-transit, car-to-carpool, remote workdays, induction/LPG upgrades from biomass/coal, clean winter heating, zero leaf/waste burning) | `src/lib/recommendations/engine.ts`, `src/components/PlanView.tsx` |
| **"tailored to their location and lifestyle,"** | Geocoded city lookup (`q`) or coordinates (`lat`/`lon`) paired with local device-only household lifestyle profile (`localStorage`: commute mode/distance/days, cooking fuel, heating source, home type, budget tier) | `src/lib/aqi/adapter.ts`, `src/lib/storage.ts`, `src/components/ProfileView.tsx`, `src/lib/recommendations/engine.ts` |
| **"while clearly explaining the direct impact of their choices."** | Per-action and weekly CO2e, PM2.5, and baseline-isolated indoor/cooking PM2.5 exposure reductions (multiplicative indoor cap at 90%), `"How was this calculated?"` drawer, visible `Sourced` / `Proxy` / `Assumption` + confidence badges, citations, and stand-in notes | `src/lib/impact/factors.ts`, `src/lib/impact/calculator.ts`, `src/components/FactorBadge.tsx`, `src/components/PlanView.tsx`, `src/components/ImpactView.tsx` |

## Architectural Constraint Alignment

| Constraint | Implementation | File Paths |
| :--- | :--- | :--- |
| **Zero cost, no database, no accounts** | Profiles & latest AQI stored exclusively in browser `localStorage`; free Open-Meteo APIs; in-memory TTL cache; optional free-tier Gemini API | `src/lib/storage.ts`, `src/lib/cache/ttlCache.ts`, `src/lib/aqi/adapter.ts` |
| **Swappable weather/AQI adapter + offline demo mode** | `AirQualityDataAdapter` interface implemented by `OpenMeteoAdapter` and `DemoAirQualityAdapter` | `src/types/index.ts`, `src/lib/aqi/adapter.ts` |
| **Runtime-configurable AI model** | `GEMINI_MODEL` and `GEMINI_API_KEY` read strictly from server `process.env` (zero hard-coded model IDs) | `src/lib/config/env.ts` |

## Known Limitations

- **Regional Proxy & Author Estimates**: No Indian vehicle fleet CO2e table or household daily cooking/wood mass survey is bundled; transport CO2e factors are marked `proxy` (UK DESNZ/DEFRA 2024 with directional error notes) and PM2.5/exposure percentages without a verified table citation are explicitly labeled `assumption` (`Author estimate`, low confidence).
- **Single-Node In-Memory State**: TTL caching and rate limiting live in process memory (`src/lib/cache/ttlCache.ts`, `src/lib/security/rateLimiter.ts`) and do not synchronize across multiple server instances.
- **No Longitudinal Database**: Because profiles reside solely in `localStorage`, history and preferences do not sync across devices or persist if browser storage is cleared.
- **AI Availability & Quotas**: Live Gemini responses depend on `GEMINI_API_KEY`, `GEMINI_MODEL`, and external API quotas; when unavailable, AirAware serves the deterministic rule-based plan with an `"AI unavailable"` notice.

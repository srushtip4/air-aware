# Problem Statement Alignment

This document maps each requirement of the AirAware problem statement to the specific features and file paths implementing them.

| Problem Statement Requirement | Feature Implemented | Primary Implementation File Path |
| :--- | :--- | :--- |
| **GenAI-powered assistant helping families navigate severe winter smog** | Zod-validated structured AI explanations & conversational assistance | `src/lib/ai/assistant.ts` |
| **Suggest low-emission daily routines** | Time-of-slot routine generator (morning inversions, midday windows, evening lockdown) | `src/lib/recommendations/engine.ts` |
| **Indoor air quality hacks** | Free, low-cost (DIY box-fan), and investment (HEPA) tiers tailored to home type | `src/lib/recommendations/engine.ts` |
| **Sustainable alternatives** | Transit, carpool, WFH, clean cooking fuel, and waste-burning alternatives | `src/lib/recommendations/engine.ts` |
| **Clearly explaining direct impact of choices** | Sourced CO2e, PM2.5, and exposure reduction calculator with unit & citation comments | `src/lib/impact/calculator.ts`, `src/lib/impact/factors.ts` |
| **Tailored to location and lifestyle** | Location adapter & profile-driven rules engine (household, commute, cooking, heating, budget) | `src/lib/aqi/adapter.ts`, `src/lib/recommendations/engine.ts` |
| **Zero cost, no paid services, no database, device storage** | Client-side `localStorage` profile storage, free Open-Meteo & Gemini APIs, in-memory caching | `src/app/createApp.ts`, `src/lib/cache/ttlCache.ts` |
| **Open-Meteo Air Quality + Geocoding APIs behind swappable adapter + demo mode** | `OpenMeteoAdapter` and `DemoAirQualityAdapter` implementing `AirQualityDataAdapter` | `src/lib/aqi/adapter.ts` |
| **TTL cache with in-flight request de-duplication & stale-while-error** | Robust generic `TtlCache` class | `src/lib/cache/ttlCache.ts` |
| **Zod schemas with max lengths and strict fields** | Strict `.strict()` validation schemas for profiles and all API endpoints | `src/lib/validation/schemas.ts` |
| **Env validation at startup, model name from GEMINI_MODEL** | Startup env validation requiring `GEMINI_MODEL` | `src/lib/config/env.ts` |

## Known Limitations

- **Estimates Basis**: Impact calculations reflect published scientific literature averages rather than direct sensor measurement of a specific household.
- **Per-Instance Caching**: Caching and rate limiting are process-local.

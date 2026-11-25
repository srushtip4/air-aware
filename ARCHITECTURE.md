# Architecture Overview

AirAware follows a modular full-stack TypeScript architecture built with Express, Vite, and the `@google/genai` SDK.

## System Architecture Diagram

```mermaid
graph TD
    Client[Browser Frontend] -->|GET /api/air, POST /api/plan, POST /api/assist| Express[Express Server (/server.ts & /src/app/createApp.ts)]
    
    subgraph Security & Resilience Layers
        Express -->|Security Headers & CORS| Headers[src/lib/security/headers.ts]
        Express -->|Per-IP Rate Limiting| RateLimit[src/lib/security/rateLimiter.ts]
        Express -->|Structured Logging| Logger[src/lib/security/logger.ts]
    end

    subgraph API Route Handlers
        Express -->|GET /api/air| AirRoute[src/app/api/airHandler.ts]
        Express -->|POST /api/plan| PlanRoute[src/app/api/planHandler.ts]
        Express -->|POST /api/assist| AssistRoute[src/app/api/assistHandler.ts]
    end

    subgraph Core Domain Libs
        AirRoute -->|Adapter & TTL Cache| AQI[src/lib/aqi/adapter.ts & ttlCache.ts]
        PlanRoute -->|Rules Engine & Impact| Rec[src/lib/recommendations/engine.ts & impact/calculator.ts]
        AssistRoute -->|Coarse Privacy, Zod & Circuit Breaker| AI[src/lib/ai/assistant.ts & resilience/upstream.ts]
    end

    AQI -->|Open-Meteo API / Offline Demo| External[Open-Meteo Air Quality & Geocoding]
    AI -->|Server-Side SDK| Gemini[Google GenAI API]
```

## Core Modules & File Paths

- **Server Entrypoint**: `server.ts`
- **App Factory & Middleware**: `src/app/createApp.ts`
- **API Handlers**: `src/app/api/airHandler.ts`, `src/app/api/planHandler.ts`, `src/app/api/assistHandler.ts`
- **AQI & Adapters**: `src/lib/aqi/adapter.ts`, `src/lib/aqi/bands.ts`, `src/lib/aqi/trend.ts`
- **Recommendations Engine**: `src/lib/recommendations/engine.ts`
- **Impact Calculator & Factors**: `src/lib/impact/calculator.ts`, `src/lib/impact/factors.ts`
- **AI Assistant & Coarse Privacy**: `src/lib/ai/assistant.ts`
- **Cache & Resilience**: `src/lib/cache/ttlCache.ts`, `src/lib/resilience/upstream.ts`
- **Security & Validation**: `src/lib/security/rateLimiter.ts`, `src/lib/security/headers.ts`, `src/lib/validation/schemas.ts`

## Known Limitations

- **In-Memory State**: Caches and rate limiters reside in process memory and do not synchronize across multiple container instances without an external store like Redis.
- **Upstream Latency**: Open-Meteo and Gemini API calls are subject to external network latency and rate limits; graceful fallbacks handle upstream failures.

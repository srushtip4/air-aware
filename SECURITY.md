# Security Documentation

AirAware implements defense-in-depth controls across Express middleware, Zod validation, AI prompt boundaries, and logging.

## Implemented Security Controls & File Paths

- **Server-Side Secrets Only (`src/lib/config/env.ts`)**: `GEMINI_API_KEY` and `GEMINI_MODEL` are read exclusively on the server via `process.env` and never bundled into Vite client code (`VITE_*` is not used for secrets).
- **Security Headers (`src/lib/security/headers.ts`, `src/app/createApp.ts`)**:
  - `Content-Security-Policy`: restricts `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, and `frame-ancestors 'self' https://aistudio.google.com https://*.usercontent.goog`.
  - `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(self), interest-cohort=()`, `Cross-Origin-Opener-Policy: same-origin`, and `app.disable('x-powered-by')`.
- **Proxy & Request Size Guardrails (`src/app/createApp.ts`)**: Configures `app.set('trust proxy', 1)` for a single reverse-proxy hop, caps JSON request bodies at `32kb`, handles malformed JSON cleanly with HTTP `400 INVALID_JSON`, and returns generic client errors on `500` without stack traces.
- **Strict Input Validation (`src/lib/validation/schemas.ts`)**: Every endpoint uses Zod `.strict()` schemas rejecting unknown fields, enforcing string lengths, and bounding numeric ranges.
- **Bounded Per-IP Rate Limiting (`src/lib/security/rateLimiter.ts`)**: Sliding-window per-instance rate limiter (`60 req/min` on `/api/air` and `/api/plan`; `10 req/min` on `/api/assist`), sweeping expired buckets and enforcing a `maxEntries: 5000` memory cap.
- **Privacy-Safe Logging (`src/lib/security/logger.ts`)**: Emits structured JSON logs on the server while redacting API keys (`AIza...`), bearer tokens, and URL query strings; personal names and free-text health notes are neither requested nor logged.
- **Prompt Injection & Output Guardrails (`src/lib/ai/assistant.ts`)**:
  - `toCoarseProfile()` converts profile fields to coarse categorical buckets before sending context to Gemini.
  - `FIXED_ASSIST_SYSTEM_PROMPT` treats `untrustedUserQuestion` strictly as JSON data.
  - Gemini responses are validated against `geminiAssistOutputSchema` and filtered for secret leaks (`SECRET_LEAK_PATTERN`) or unsafe AQI safety overrides (`UNSAFE_OVERRIDE_PATTERN`).

## Known Limitations

- **Per-Instance Rate Limiting**: Rate limits are stored in per-process memory (`Map`); behind multi-instance load balancers, an attacker could reach `N × limit` requests unless backed by a shared store such as Redis.
- **CSP Inline Scripts/Styles**: `Content-Security-Policy` permits `'unsafe-inline'` in `script-src` and `style-src` for bundled React/Vite/Tailwind compatibility rather than strict per-request nonces.
- **Device-Only Profile Storage**: User profiles are stored unencrypted in browser `localStorage` so there is zero server database, meaning anyone with access to the same browser profile can view them and clearing browser storage erases them.

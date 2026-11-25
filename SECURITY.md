# Security Documentation

AirAware implements robust security-by-default controls across all server-side routes and data flows.

## Key Security Controls & File Paths

- **Server-Side Secrets**: `GEMINI_API_KEY` and `GEMINI_MODEL` are accessed exclusively via server-side `process.env` (`src/lib/config/env.ts`) and are never exposed in client bundles.
- **Security Headers**: `src/lib/security/headers.ts` applies strict CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and frame protection (`X-Frame-Options: SAMEORIGIN`).
- **Strict Input Validation**: `src/lib/validation/schemas.ts` uses Zod with `.strict()` schemas, enforcing maximum string lengths, numeric bounds, and rejecting unknown fields.
- **Per-IP Rate Limiting**: `src/lib/security/rateLimiter.ts` provides per-instance sliding-window rate limiting with stricter limits on AI assistant endpoints (`POST /api/assist`).
- **Privacy-Safe Logger**: `src/lib/security/logger.ts` redacts potential secrets and avoids logging personal data (names, street addresses, free-text health symptoms).
- **Prompt Injection & Output Filtering**: `src/lib/ai/assistant.ts` treats user input as data only under a fixed system prompt, strips identifying profile details to coarse buckets (`toCoarseProfile`), validates structured JSON output against Zod schemas, and screens for safety-rule overrides.

## Known Limitations

- **Per-Instance Rate Limiting**: Rate limiting and caching state are kept in server memory (`Map`), meaning limits are tracked per container instance rather than globally across a load-balanced cluster.
- **Client-Side Storage**: User profiles are stored exclusively in browser `localStorage` on the user's device with zero server persistence; clearing browser data resets the profile.

# Code Quality Guidelines

AirAware enforces strict static typing, linting, modular boundaries, and automated test coverage gates across the repository.

## Code Quality Practices & File Paths

- **Strict TypeScript (`tsconfig.json`)**: Enables `strict: true`, `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, and `noEmit` type verification (`npm run typecheck`). Zero `any` types are permitted.
- **Static Linting (`oxlint.json`)**: `npm run lint` executes `oxlint` across `server.ts`, `src`, `tests`, `scripts`, and `playwright.config.ts` with `typescript/no-explicit-any`, `no-unused-vars`, `eqeqeq`, `no-var`, and `prefer-const` set to `error`, followed by `tsc --noEmit`.
- **Coverage Thresholds (`vitest.config.ts`)**: Enforces V8 coverage minimums across `src/lib/**/*.ts` (excluding barrel `index.ts` and `src/lib/storage.ts`): `lines >= 85%`, `functions >= 85%`, `branches >= 75%`, `statements >= 85%`.
- **Modular Separation of Concerns**: Pure domain libraries (`src/lib/{aqi,recommendations,impact,ai,cache,resilience,security,validation,config}`) are decoupled from Express HTTP handlers (`src/app/api/*`) and React views (`src/components/*`).
- **Environment-Driven AI Configuration (`src/lib/config/env.ts`)**: Model IDs (`GEMINI_MODEL`) and secrets (`GEMINI_API_KEY`) are validated from server environment variables with zero hard-coded model names in application code.

## Known Limitations

- **Frontend Bundle Coverage Exclusion**: `vitest.config.ts` measures line/branch coverage over `src/lib/**/*.ts` (`storage.ts` excluded); UI components (`src/components/*`) and HTTP route wrappers (`src/app/*`) are verified behaviorally via component, API, HTTP smoke, and Playwright E2E tests.
- **Single-Chunk Client Bundle**: Vite bundles frontend code into a single JS chunk, triggering a `>500 kB` chunk warning during `npm run build` without breaking runtime functionality.

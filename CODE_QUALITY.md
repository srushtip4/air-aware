# Code Quality Guidelines

AirAware adheres to senior-engineer software quality standards across the entire TypeScript codebase.

## Code Quality Standards & Practices

- **Strict TypeScript**: `tsconfig.json` enforces strict type checking (`strict: true`, `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`).
- **Static Analysis**: `oxlint` (`oxlint.json`) enforces clean lint rules, forbidding explicit `any` and unused variables.
- **Modular Architecture**: Clean separation of concerns across `/src/lib` (aqi, impact, recommendations, ai, cache, validation, config, resilience, security) and `/src/app/api`.
- **Pure Functions & Determinism**: Core domain logic is decoupled from UI and side-effects, making business logic fully unit-testable.

## Known Limitations

- **Refactoring Scope**: Strict type safety requires explicit typing across all interfaces; external library updates may occasionally require type definition maintenance.

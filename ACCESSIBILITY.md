# Accessibility (a11y) Architecture

AirAware is built for WCAG 2.1 Level AA compliance across desktop and mobile viewports, verified with automated `axe-core` checks in both JSDOM component tests (`tests/component/ui.test.tsx`) and headless Chromium Playwright runs (`tests/e2e/smoke.spec.ts`).

## Implemented Accessibility Controls & File Paths

- **Skip Link & Focus Management (`src/components/Navbar.tsx`, all views)**: Provides a keyboard-focusable `<a href="#main-content">Skip to main content</a>` link that moves keyboard focus directly to `<main id="main-content" tabIndex={-1}>` across every view (`HomeView`, `ProfileView`, `PlanView`, `ImpactView`, `AssistantView`, `PrintablePlanView`, `NotFoundView`).
- **Semantic Landmarks & Native Controls**: Uses `<header>`, `<nav aria-label="Main Navigation">`, `<main>`, `<section aria-labelledby="...">`, `<footer>`, `<aside role="status">`, and native `<button>`, `<input>`, `<select>`, and `<input type="range">` controls with explicit `<label htmlFor>` / `aria-label` attributes.
- **Screen Reader `aria-live` Announcements**:
  - `src/components/HomeView.tsx`: Visually hidden `role="status" aria-live="polite"` (`Air quality update`) announces loaded city, AQI, band, and source; `role="alert" aria-live="assertive"` announces fetch errors.
  - `src/components/ProfileView.tsx`: `role="status" aria-live="polite"` confirms profile updates.
  - `src/components/ImpactView.tsx`: `aria-live="polite"` updates community scaling summaries when the households slider changes, paired with a semantic `<table>` breakdown.
  - `src/components/FallbackBanner.tsx` & `src/components/AssistantView.tsx`: `role="status" aria-live="polite"` announces demo mode, stale cache timestamps, AI responses, and `"AI unavailable"` deterministic fallbacks.
- **Expandable Transparency Controls (`src/components/PlanView.tsx`)**: `"How was this calculated?"` accordions use `aria-expanded` and `aria-controls` linked to focusable calculation drawers.
- **Non-Color Indicators & WCAG AA Contrast (`src/components/FactorBadge.tsx`, `src/components/HomeView.tsx`)**: Factor reliability badges (`Sourced`, `Proxy`, `Assumption` + confidence), AQI bands, and trend pills always pair distinct icons and text labels with verified `>= 4.5:1` contrast ratios.

## Known Limitations

- **Partial Hindi Translation Coverage**: `src/i18n/translations.ts` translates navigation, primary headers, and status banners into Hindi (`hi`), while detailed recommendation copy inside `src/lib/recommendations/engine.ts` and secondary form options remain in English.
- **Color Scheme Following OS Preference Only**: Dark-mode contrast relies on Tailwind `dark:` classes honoring system preference rather than providing a dedicated in-app high-contrast or dark-theme toggle.
- **Automated vs. Assistive Hardware Testing**: Accessibility verification is automated via `axe-core` and Playwright keyboard navigation rather than manual testing with physical NVDA, JAWS, or VoiceOver screen readers.

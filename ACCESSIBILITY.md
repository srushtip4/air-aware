# Accessibility (a11y) Architecture

AirAware is designed to be fully accessible to families, elderly users, and community members relying on assistive technologies.

## Accessibility Standards & Practices

- **Semantic HTML & ARIA**: Uses semantic HTML5 landmarks (`<main>`, `<nav>`, `<header>`, `<section>`), native buttons (`<button>`), form inputs with explicit labels, and descriptive ARIA attributes where needed.
- **Color Contrast & AQI Indicators**: AQI category bands use distinct color tokens with high contrast against light/dark surfaces, accompanied by textual badges and hazard summaries rather than relying on color alone.
- **Keyboard Navigation & Focus**: All interactive controls support full keyboard tabbing, visible focus rings, and screen-reader accessibility announcements.

## Known Limitations

- **Complex Visual Charts**: Advanced hourly AQI trend graphs and community projection sliders require clear text fallback summaries for screen reader users, which are provided alongside visual charts.

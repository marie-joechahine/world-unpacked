# World Unpacked

A production-quality MVP for an immersive country-discovery world map. The app uses Next.js, React, TypeScript, TailwindCSS, D3 projection utilities, react-simple-maps SVG geography rendering, Framer Motion cinematic animation, and Zustand interaction state.

## Features

- Fullscreen premium dark world-map experience.
- Individually targetable country boundaries loaded from GeoJSON.
- Smooth hover, focus, and tap interactions for desktop, keyboard, tablet, and mobile.
- Cinematic floating flag reveal powered by FlagCDN SVG assets.
- Subtle dimming, glow, bloom, ambient starfield, and responsive information overlay.
- Reduced-motion support for motion-sensitive users.
- Future-ready state for country selection, country pages, learning panels, quizzes, and audio hooks.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Checks

```bash
npm run typecheck
npm run build
npm run test:e2e
```

> Note: if you previously hit a React 19 peer-dependency conflict, remove `node_modules` and `package-lock.json` and rerun `npm install`; the project now pins React/React DOM to `18.3.1` for `react-simple-maps@3` compatibility.

## Playwright E2E testing

Install Playwright and its browser binaries once after `npm install`:

```bash
npm run playwright:install
```

Run the automated browser checks:

```bash
npm run test:e2e
```

Useful local debugging modes:

```bash
npm run test:e2e:headed
npm run test:e2e:ui
```

The E2E suite starts the Next.js dev server automatically through `playwright.config.ts`. Tests mock the remote GeoJSON and FlagCDN SVG responses so hover behavior, keyboard focus, and the cinematic flag reveal can be verified without depending on third-party network availability.

## Technical decisions

- React is pinned to `18.3.1` because `react-simple-maps@3` declares React peer support through React 18; this keeps `npm install` strict-peer compatible while still satisfying Next.js 15's React 18.2+ minimum.
- `react-simple-maps` keeps the v1 renderer lightweight and SVG-native while preserving per-country pointer and keyboard accessibility.
- D3 Equal Earth projection settings live in `lib/mapProjection.ts` so future globe or projection modes can be swapped without rewriting components.
- Zustand stores hovered and selected countries separately so click-to-open country pages can be added without coupling to transient hover animation.
- Flag assets are derived from ISO2 codes and served by FlagCDN as SVGs, avoiding local image bloat while keeping flags high-resolution.
- Motion is isolated to overlays and CSS/SVG paint changes; pointer movement is RAF-throttled to avoid forcing a full SVG-tree rerender on every mouse event.

## Scaling guidance

- Add a route such as `/countries/[iso3]` and subscribe it to `selectedCountry` for country stories and educational facts.
- Add a cached metadata build step if the product needs offline mode or enriched data from REST Countries.
- Add quiz/timeline overlays as separate subscribers to the map interaction store.
- Keep expensive visual effects outside the country paths; prefer transform and opacity animation for 60fps.
- Add audio through a separate opt-in sound controller that listens to the same hover/selection state.

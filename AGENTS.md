# Agent Guide

<!-- BEGIN:nextjs-agent-rules -->
## This Is Not The Next.js You Know

This project uses Next.js 16.2.6. APIs, conventions, and file structure may differ from older Next.js versions and from model training data. Before changing Next.js code, read the relevant local guide in `node_modules/next/dist/docs/` and follow any deprecation notices.
<!-- END:nextjs-agent-rules -->

Useful local docs to check first:

- App Router pages/layouts: `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- Server and client components: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- Route handlers: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- Images: `node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`
- Caching and dynamic data: `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`

## Project Snapshot

- Next.js App Router project under `src/app`.
- React 19, TypeScript strict mode, Tailwind CSS v4, CSS Modules, and the `@/*` alias for `src/*`.
- Main UI experiments live in `src/components`.
- Current routes include `/` for MapLibre, `/mapbox` for Mapbox GL JS, `/three` for React Three Fiber, and `/country` for country data/image sandboxes.
- API routes live under `src/app/api` and fetch live data from World Bank, Wikidata, Wikimedia Commons, and UNdata.

## Commands

- `npm run dev` - start the local Next dev server.
- `npm run lint` - run ESLint.
- `npm run build` - run a production build and type check through Next.
- `npm run start` - serve a production build.

Run `npm run lint` after normal source edits. Run `npm run build` when touching routing, API handlers, Next config, data loading, or dependency versions.

## Environment

- `.env.local` is local-only and must not be committed with real secrets.
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is required for the `/mapbox` route.
- The default MapLibre route should remain usable without a Mapbox token.

## Coding Conventions

- Prefer App Router patterns in `src/app`; do not add a `pages/` tree.
- Keep browser-only map, WebGL, and React Three Fiber code inside `"use client"` components.
- Clean up imperative map/canvas resources in `useEffect` cleanup paths.
- Use CSS Modules next to components for component styling. Keep `src/app/globals.css` for truly global styles only.
- Use `@/*` imports for project modules instead of long relative paths.
- Preserve strict TypeScript behavior; avoid `any` unless there is no reasonable typed boundary.
- Do not edit generated artifacts such as `.next/`, `next-env.d.ts`, `tsconfig.tsbuildinfo`, or dev-server logs.

## API And Data Rules

- Route handlers that fetch live external data should be explicit about dynamic behavior and runtime when needed.
- Keep external requests bounded with timeouts, clear user agents where APIs expect them, and graceful fallback responses.
- Validate query parameters against the country option lists in `src/lib` before calling external services.
- Avoid adding new remote image hosts without updating `next.config.ts` and checking the current Next images documentation.

## UI Verification

- After map or WebGL UI changes, open the affected route in a browser and verify that the canvas/map renders, controls respond, and text does not overlap on desktop and mobile widths.
- For `/mapbox`, verify both the missing-token state and the token-backed map when a token is available.
- For API-backed country pages, confirm loading, success, and unavailable/error states.

## Dependency Changes

- Prefer existing dependencies before adding new ones.
- If dependencies change, update both `package.json` and `package-lock.json`.
- Re-check `next.config.ts` when changing libraries that need transpilation, image domains, or other Next integration.

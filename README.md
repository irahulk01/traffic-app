# GatiLive

Traffic conditions on monitored roads in **Hazaribagh, Jharkhand**, built for iPhone and desktop browsers. The app opens directly into a map and traffic workspace at `/` or `/traffic-map`.

GatiLive monitors **15 configured directional routes** across the city and its approaches. It helps users identify affected roads, inspect individual slow or heavy sections, and locate those sections on the map.

> Coverage is route-based, not citywide incident detection. A road coloured by Google's traffic layer does not automatically generate a card.

## Features

- **Road-focused feed:** one expandable card per affected road and direction, with separate sections and a “Show worst section” map action.
- **Accurate geometry handling:** decoded Google Routes polylines preserve distinct severity intervals and normal gaps. Lengths describe approximate affected stretches, not vehicle queues.
- **Responsive workspace:** desktop sidebar and map; mobile Explore, Map, and Sections views with a bounded, vertically draggable panel.
- **Readable mobile layout:** compact counters, safe-area spacing, visual-viewport sizing, and navigation that reserves its own space rather than covering cards.
- **Purposeful motion:** animated count changes, card arrivals and removals, reordering, update highlights, and expanding/collapsing sections. Reduced-motion preferences are respected.
- **Resilient updates:** visible freshness and route availability, retained older observations, offline feedback, scheduled recovery, and manual retry.
- **Efficient rendering:** the base map stays mounted through traffic, selection, and theme changes. Highlight overlays reuse existing lines and skip unchanged geometry.
- **Optional device alerts:** fresh normal/slow-to-heavy route transitions can trigger notifications while the app is open, with duplicate suppression and a 10-minute per-route cooldown.
- **Explicit location access:** location is requested only through “Show my location” or “Near me”; it does not expand monitoring coverage.

## Local development

### Requirements

- A Node.js version supported by Vite 8; Node 22.12+ is a suitable baseline.
- npm.
- Google Maps Platform keys with Maps JavaScript API and Routes API enabled for their respective uses.

```sh
npm ci
cp .env.example .env
```

Set these variables in `.env`:

| Variable | Purpose |
| --- | --- |
| `VITE_GOOGLE_MAPS_API_KEY` | Browser key for Maps JavaScript API. Restrict it to allowed website referrers and the required API. |
| `GOOGLE_API_KEY` | Server-only key for Routes API. Never expose it through a `VITE_` variable. |

The browser key is included in the frontend bundle by design; its restrictions matter. Keep the server key private. Environment files are ignored by Git; `.env.example` contains names only.

Start both services:

```sh
npm run dev:all
```

Open the **Local** URL printed by Vite. The backend defaults to port **3001**; Vite selects an available frontend port. The local preview has been running at `http://localhost:5174/`.

Alternatively, use two terminals:

```sh
npm run server
```

```sh
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:3001`. If the backend port changes, update the proxy in `vite.config.js` too. Restart Vite after changing frontend environment variables.

## How traffic reaches the interface

```text
Browser → /api/traffic → shared process cache / in-flight request
                              ↓ when a batch is needed
                       Google Routes API
                              ↓
                  Normalized severity intervals
                              ↓
                Road cards + section map overlays

Google Maps JavaScript API → base map + native TrafficLayer
```

These are separate data paths:

| Source | Responsibility |
| --- | --- |
| Google Maps JavaScript API | Base map and the native, automatically refreshed traffic layer. |
| Google Routes API | Conditions on the explicitly configured routes, used for cards and highlighted sections. |

The collector uses `TRAFFIC_AWARE_OPTIMAL`, `TRAFFIC_ON_POLYLINE`, high-quality polylines, and an explicit response field mask. The interface does not invent speed measurements or local delay values.

### Refresh and recovery

- The client normally schedules the next check 60 seconds after a completed update, also respecting the server's next-refresh time.
- Repeated failed or incomplete updates use delays of 1, 2, then at most 3 minutes. A fresh success resets the recovery cadence.
- Polling pauses while the document is hidden or the browser is offline. Visibility and connection events resume checks.
- The client allows one request at a time and aborts requests after 25 seconds; each upstream route request has a 12-second timeout.
- The backend shares a batch for 60 seconds and deduplicates concurrent requests **within one process**. Requests arriving during collection join that refresh.
- Failed updates can retain observations under 15 minutes old, preserving their original timestamps and labelling them stale. Unavailable coverage remains distinct from clear traffic.
- The collector is request-driven; an idle backend does not continuously poll Google.

### Consumption and caching boundaries

A complete batch makes **15 Routes API requests**, one per configured direction. At one batch per minute, that is approximately **900 upstream requests per active hour per backend process**. This is a planning estimate, not a billing report: request duration, recovery, idle periods, cold starts, and multiple instances change actual usage. Maps JavaScript usage is separate.

`GET /api/traffic/usage` exposes process-local diagnostics for cache hits, joined requests, batches, and upstream attempts. Counters reset on restart and do not represent deployment-wide billing. Use Google Cloud reports for account-level consumption.

The app does not download an offline copy of Hazaribagh or maintain a custom Google tile cache. Google and the browser manage map resource caching. The service worker caches the app shell, excludes external resources and API responses, and never replays cached traffic as a fresh observation.

## Notifications

Notifications require explicit opt-in and system permission. The settings drawer includes a test action, and delivery uses the service worker.

On iPhone/iPad, supported Home Screen web apps require iOS/iPadOS 16.4 or later: add the site to the Home Screen and open it there before enabling notifications. System settings and Focus modes control presentation.

**Closed-app traffic monitoring and background push delivery are not implemented.** They require a durable subscription store and an independently scheduled traffic monitor. An installed service worker alone does not provide background traffic polling.

## Project structure

| Path | Responsibility |
| --- | --- |
| `src/components/TrafficMapPage.jsx` | Workspace state, filters, selection, mobile panel, and alert coordination. |
| `src/components/GoogleMapView.jsx` | Persistent map, native traffic layer, section overlays, and polling integration. |
| `src/components/telemetry/` | Summary counters, grouped road cards, section cards, and feed transitions. |
| `src/data/monitoredRoutes.json` | Configured route endpoints and directions. |
| `src/data/groupTrafficSections.js` | Road/direction grouping without joining separate section geometry. |
| `src/services/trafficPolling.js` | Request deduplication, timeouts, offline pauses, and recovery scheduling. |
| `server/routes/traffic.cjs` | Google Routes collection, shared cache, stale retention, and usage diagnostics. |
| `api/traffic.js` | Vercel entry point for the traffic router. |
| `public/sw.js` | App-shell caching and notification handling. |
| `vercel.json` | Build, API routing, and SPA fallback configuration. |

## Validation

```sh
npm test
npm run build
npm run lint
```

The current suite contains **18 tests** using fixtures and mocked requests, not paid provider calls. It covers polyline decoding, omitted zero indices, normal gaps, separate severity intervals, stale timestamps, concurrent backend requests, route grouping, polling recovery, timeouts, offline behavior, and notification safeguards.

A successful API response and passing tests do not establish a measured real-world traffic accuracy percentage. Provider traffic is an estimate; field validation is a separate activity.

## Vercel deployment

The repository builds with `npm run build` and serves `dist/`. `api/traffic.js` provides `/api/traffic` and `/api/traffic/usage`; other frontend paths use the SPA fallback.

1. Configure both environment variables for the intended Preview and Production environments.
2. Include the appropriate deployment domains in the browser key's referrer restrictions.
3. Redeploy after changing environment variables so the browser bundle receives the new configuration.
4. Verify map loading, route availability, freshness, and notification permissions on the target device.

Each function instance owns its own cache and counters; there is no distributed cache or persistent traffic history. Deployment-wide request deduplication and background monitoring would require additional infrastructure.

## Extending coverage

Add verified endpoints and a distinct direction identifier to `src/data/monitoredRoutes.json`. Check the returned road geometry and both travel directions before treating a new route as covered. Every additional configured direction adds one upstream request per collected batch.

Prioritize useful local connections over increasing card counts. Keep the coverage note visible, retain Google attribution, and continue distinguishing unavailable data from normal traffic.

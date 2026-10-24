# GatiLive · Hazaribagh traffic

A responsive traffic monitor with a Google map and an affected-section list. It monitors 15 explicitly configured directional routes around Hazaribagh; it does not claim to cover every road in the district.

## Run locally

With dependencies installed and the existing `.env` configured:

```sh
npm run dev:all
```

This starts the traffic backend on port 3001 and Vite on its next available port. Open the **Local** address printed by Vite to go directly to the Hazaribagh traffic map. Alternatively, run `npm run server` and `npm run dev` in separate terminals.

Required configuration:

- `VITE_GOOGLE_MAPS_API_KEY`: browser key authorized for the Maps JavaScript API and the app's allowed origins.
- `GOOGLE_API_KEY`: server key authorized for the Routes API. Keep it server-side.

Vite proxies `/api` to the local backend. Vercel uses `api/traffic.js` for the same traffic router and `vercel.json` for the SPA fallback. Configure both keys for Preview and Production in Vercel; redeploy after changing environment variables. Browser-key origin restrictions must include the deployment domain. The usage meter counts only one function instance and resets on cold starts; Vercel may run multiple instances, so use Google Cloud usage reports for deployment-wide consumption.

## What the interface shows

- Desktop: affected-section sidebar beside the map.
- Mobile: Explore, Map and Sections views. Selecting a card from the full list opens the matching map section.
- Heavy/slow filters apply to the highlighted sections. Google's native traffic layer may show additional roads independently.
- Selection uses the actual decoded provider geometry. A normal gap is never merged into a jam.
- Distances describe the approximate length of an affected route stretch, not an observed vehicle queue.
- Source/fetch time, route availability and older/unavailable states stay distinct. Speeds and local delays are not invented.
- The traffic-watch drawer uses the same heavy sections as the map. Device alerts are explicitly opt-in and use the notification service worker. They trigger for a fresh normal/slow-to-heavy route change while the app is open, with a per-route 10-minute cooldown. The drawer includes a test button. On iPhone/iPad (16.4+), first add the site to the Home Screen and open it there; system permission and Focus settings control presentation. Closed-app background traffic alerts are not enabled: they require a durable push-subscription store and a separate background monitor. This Vercel Hobby deployment cannot schedule minute-frequency cron jobs.
- Location is requested only when **Show my location** or **Near me** is chosen. It does not expand monitoring coverage.

The backend deduplicates concurrent requests and shares a 60-second cached batch. Requests have timeouts; retained results preserve their original fetch times and become explicitly stale. The collector does not run upstream requests just because the backend is idle. Frontend polling pauses when the document is hidden.

## Checks

```sh
npm test
npm run build
npm run lint
```

Tests use fixtures, not paid provider requests, and cover polyline decoding, omitted zero indices, normal gaps, separate severity intervals, failed/normal states, stale timestamps and backend request deduplication.

Provider traffic is an estimate that changes over time. Successful API retrieval and UI tests do not establish a measured real-world accuracy percentage.

The mobile traffic sheet has bounded vertical dragging. Navigation occupies its own footer row; safe-area insets and the Safari visual viewport are reserved in layout so the final card can scroll above navigation.

Both `/` and `/traffic-map` open the traffic workspace directly; there is no city-selection landing step.

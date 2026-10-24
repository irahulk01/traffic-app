const express = require('express');
const routes = require('../../src/data/monitoredRoutes.json');
const router = express.Router();
const TTL = 60_000;
let snapshot = null;
let inFlight = null;
let lastAttempt = 0;
// Process-local diagnostics count actual dispatches, not estimated billing.
const usage = { startedAt: new Date().toISOString(), clientRequests: 0, cacheHits: 0, joinedRequests: 0, batches: 0, upstreamAttempts: 0, upstreamHttpSuccesses: 0, upstreamFailures: 0, coveredRoutes: 0 };
router.get('/usage', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ...usage, scope: 'current backend process; resets on restart', routesPerBatch: routes.length, cacheSeconds: TTL / 1000, inFlight: Boolean(inFlight), lastBatchStartedAt: lastAttempt ? new Date(lastAttempt).toISOString() : null });
});

async function collect() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('Traffic provider is not configured');
  usage.batches++;
  const results = await Promise.all(routes.map(async route => {
    const previous = snapshot?.results.find(r => r.routeId === route.id && r.success);
    try {
      usage.upstreamAttempts++;
      let response;
      try { response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST', signal: AbortSignal.timeout(12_000),
        headers: {
          'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.polyline.encodedPolyline,routes.travelAdvisory.speedReadingIntervals',
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: route.origin.lat, longitude: route.origin.lng } } },
          destination: { location: { latLng: { latitude: route.dest.lat, longitude: route.dest.lng } } },
          travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
          extraComputations: ['TRAFFIC_ON_POLYLINE'], polylineQuality: 'HIGH_QUALITY',
        }),
      });
      } catch (error) { usage.upstreamFailures++; throw error; }
      if (response.ok) usage.upstreamHttpSuccesses++;
      else usage.upstreamFailures++;
      if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
      const data = await response.json();
      const value = data.routes?.[0];
      if (!value?.polyline?.encodedPolyline || !value.travelAdvisory?.speedReadingIntervals?.length) throw new Error('Traffic coverage unavailable');
      usage.coveredRoutes++;
      return { routeId: route.id, routeName: route.name, success: true, isStale: false, fetchedAt: new Date().toISOString(), data: value };
    } catch (error) {
      // Retained observations keep their original age and never masquerade as fresh.
      if (previous && Date.now() - Date.parse(previous.fetchedAt) < 15 * 60_000) return { ...previous, isStale: true, error: error.message };
      return { routeId: route.id, routeName: route.name, success: false, error: error.message };
    }
  }));
  snapshot = { timestamp: new Date().toISOString(), results };
  return snapshot;
}

router.get('/', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  usage.clientRequests++;
  try {
    if (snapshot && Date.now() - lastAttempt < TTL) { usage.cacheHits++; return res.json(snapshot); }
    if (!inFlight) {
      lastAttempt = Date.now();
      inFlight = collect().finally(() => { inFlight = null; });
    } else { usage.joinedRequests++; }
    return res.json(await inFlight);
  } catch {
    return res.status(503).json({ error: 'Traffic data is temporarily unavailable', results: [] });
  }
});
module.exports = router;

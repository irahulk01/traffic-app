const test = require('node:test');
const assert = require('node:assert/strict');
const routeCount = require('../../src/data/monitoredRoutes.json').length;

test('concurrent viewers share one upstream batch; a failed refresh preserves age and marks stale', async () => {
  const originalFetch = global.fetch;
  const originalNow = Date.now;
  const originalKey = process.env.GOOGLE_API_KEY;
  process.env.GOOGLE_API_KEY = 'test-only';
  let calls = 0, fail = false;
  global.fetch = async () => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 10));
    return { ok: !fail, status: fail ? 429 : 200, json: async () => ({ routes: [{ polyline: { encodedPolyline: 'fixture' }, travelAdvisory: { speedReadingIntervals: [{ endPolylinePointIndex: 1, speed: 'NORMAL' }] } }] }) };
  };
  const { default: app } = await import('../../api/[...path].js');
  const server = await new Promise(resolve => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
  const url = `http://127.0.0.1:${server.address().port}/api/traffic`;
  try {
    const missing = await originalFetch(`http://127.0.0.1:${server.address().port}/api/missing`);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error, 'API endpoint not found');
    const responses = await Promise.all([originalFetch(url), originalFetch(url)]);
    const snapshots = await Promise.all(responses.map(r => r.json()));
    assert.equal(calls, routeCount);
    assert.equal(snapshots[0].results.length, routeCount);
    assert.equal(snapshots[0].results[0].fetchedAt, snapshots[1].results[0].fetchedAt);
    const meter = await (await originalFetch(`${url}/usage`)).json();
    assert.equal(meter.upstreamAttempts, routeCount);
    assert.equal(meter.upstreamHttpSuccesses, routeCount);
    assert.equal(meter.joinedRequests, 1);
    const firstTime = snapshots[0].results[0].fetchedAt;
    fail = true;
    Date.now = () => originalNow() + 61000;
    const stale = await (await originalFetch(url)).json();
    assert.equal(calls, routeCount * 2);
    assert.equal(stale.results[0].isStale, true);
    assert.equal(stale.results[0].fetchedAt, firstTime);
    await originalFetch(url);
    assert.equal(calls, routeCount * 2, 'cached failures must not fan out again immediately');
    const finalMeter = await (await originalFetch(`${url}/usage`)).json();
    assert.equal(finalMeter.upstreamFailures, routeCount);
    assert.equal(finalMeter.cacheHits, 1);
    assert.equal(finalMeter.coveredRoutes, routeCount);
  } finally {
    global.fetch = originalFetch; Date.now = originalNow;
    if (originalKey === undefined) delete process.env.GOOGLE_API_KEY; else process.env.GOOGLE_API_KEY = originalKey;
    await new Promise(resolve => server.close(resolve));
  }
});

test('local Hazaribagh connections stay within the city and include the return direction', () => {
  const catalog = require('../../src/data/monitoredRoutes.json');
  assert.equal(new Set(catalog.map(route => route.id)).size, catalog.length);
  const local = catalog.filter(route => route.area === 'Hazaribagh city');
  assert.ok(local.length >= 8);
  for (const route of local) {
    for (const point of [route.origin, route.dest]) {
      assert.ok(point.lat >= 23.94 && point.lat <= 24.06 && point.lng >= 85.31 && point.lng <= 85.43, `${route.id} must stay near Hazaribagh`);
    }
    assert.ok(local.some(reverse => reverse.origin.lat === route.dest.lat && reverse.origin.lng === route.dest.lng && reverse.dest.lat === route.origin.lat && reverse.dest.lng === route.origin.lng), `${route.id} needs a return direction`);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrafficSections, decodePolyline, normalizeTraffic } from './trafficSections.js';

function encode(points) {
  let last = [0, 0], result = '';
  for (const point of points) {
    const current = [Math.round(point.lat * 1e5), Math.round(point.lng * 1e5)];
    current.forEach((value, axis) => {
      let delta = value - last[axis];
      delta = delta < 0 ? ~(delta << 1) : delta << 1;
      while (delta >= 32) { result += String.fromCharCode((32 | (delta & 31)) + 63); delta >>>= 5; }
      result += String.fromCharCode(delta + 63);
    });
    last = current;
  }
  return result;
}
const points = Array.from({ length: 5 }, (_, i) => ({ lat: 24 + i * .001, lng: 85.36 }));
function result(intervals) { return { routeId: 'test', routeName: 'Test route', success: true, fetchedAt: '2026-10-24T12:00:00Z', data: { polyline: { encodedPolyline: encode(points) }, travelAdvisory: { speedReadingIntervals: intervals }, duration: '100s', staticDuration: '80s' } }; }

test('decodes the published polyline example', () => {
  assert.deepEqual(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@'), [{ lat: 38.5, lng: -120.2 }, { lat: 40.7, lng: -120.95 }, { lat: 43.252, lng: -126.453 }]);
});
test('omitted start index is zero; normal gap does not become a jam', () => {
  const sections = buildTrafficSections(result([{ endPolylinePointIndex: 1, speed: 'TRAFFIC_JAM' }, { startPolylinePointIndex: 1, endPolylinePointIndex: 3, speed: 'NORMAL' }, { startPolylinePointIndex: 3, endPolylinePointIndex: 4, speed: 'TRAFFIC_JAM' }]));
  assert.equal(sections.length, 2);
  assert.deepEqual(sections[0].path, points.slice(0, 2));
  assert.deepEqual(sections[1].path, points.slice(3));
  assert.equal(sections[0].speed, null);
  assert.equal(sections[0].delay, null);
  assert.ok(sections[0].affectedLengthMeters >= 110 && sections[0].affectedLengthMeters <= 112);
});
test('adjacent slow and heavy sections remain distinct', () => {
  const sections = buildTrafficSections(result([{ endPolylinePointIndex: 2, speed: 'SLOW' }, { startPolylinePointIndex: 2, endPolylinePointIndex: 4, speed: 'TRAFFIC_JAM' }]));
  assert.deepEqual(sections.map(s => s.level), ['moderate', 'heavy']);
});
test('missing intervals are unavailable; normal observed route is fresh', () => {
  assert.equal(normalizeTraffic({ results: [{ routeId: 'failed', success: false }] }).meta.dataState, 'unavailable');
  const normal = result([{ endPolylinePointIndex: 4, speed: 'NORMAL' }]);
  const output = normalizeTraffic({ results: [normal] });
  assert.equal(output.meta.dataState, 'fresh');
  assert.equal(output.meta.availableRoutes, 1);
  assert.equal(output.sections.length, 0);
  assert.equal(output.meta.routeSummaries[0].level, 'normal');
  assert.equal(output.meta.routeSummaries[0].durationSeconds, 100);
  assert.deepEqual(output.meta.routeSummaries[0].path, points);
  assert.equal(normalizeTraffic({ results: [{ success: false, routeId: 'bad' }] }).meta.routeSummaries.length, 0);
  assert.equal(normalizeTraffic({ results: [normal, { success: false, routeId: 'bad' }] }).meta.dataState, 'partial');
});
test('stale observations retain original timestamps and never appear fresh', () => {
  const observed = { ...result([{ endPolylinePointIndex: 4, speed: 'SLOW' }]), isStale: true };
  const output = normalizeTraffic({ results: [observed] });
  assert.equal(output.meta.dataState, 'stale');
  assert.equal(output.sections[0].lastUpdated, observed.fetchedAt);
  assert.equal(output.meta.routeSummaries[0].isStale, true);
  assert.equal(output.meta.routeSummaries[0].level, 'moderate');
});
test('truncated geometry and invalid intervals are rejected', () => {
  assert.throws(() => decodePolyline('_'));
  assert.throws(() => buildTrafficSections(result([{ endPolylinePointIndex: 200, speed: 'SLOW' }])));
});

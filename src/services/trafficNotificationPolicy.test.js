import test from 'node:test';
import assert from 'node:assert/strict';
import { heavyRouteTransitions } from './trafficNotificationPolicy.js';
const now = Date.now();
const route = (level, extra = {}) => ({ routeId: 'local-road', name: 'Local road', level, lastUpdated: new Date(now).toISOString(), ...extra });
test('existing heavy traffic is a silent baseline; a normal-to-heavy change alerts once', () => {
  assert.equal(heavyRouteTransitions(null, [route('heavy')], now).entered.length, 0);
  const baseline = heavyRouteTransitions(null, [route('normal')], now);
  const changed = heavyRouteTransitions(baseline.states, [route('heavy')], now);
  assert.equal(changed.entered.length, 1);
  assert.equal(heavyRouteTransitions(changed.states, [route('heavy', { id: 'new-polyline-indices' })], now).entered.length, 0);
});
test('stale and missing results cannot clear a jam or trigger an alert', () => {
  const baseline = heavyRouteTransitions(null, [route('heavy')], now);
  const stale = heavyRouteTransitions(baseline.states, [route('normal', { isStale: true })], now);
  assert.equal(stale.states.get('local-road'), true);
  assert.equal(heavyRouteTransitions(stale.states, [route('heavy')], now).entered.length, 0);
  const normal = heavyRouteTransitions(null, [route('normal')], now);
  assert.equal(heavyRouteTransitions(normal.states, [route('heavy', { lastUpdated: new Date(now - 181000).toISOString() })], now).entered.length, 0);
  assert.equal(heavyRouteTransitions(baseline.states, [], now).states.get('local-road'), true);
});

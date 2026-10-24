// Route-level transitions avoid duplicate alerts when polyline indices change.
export function heavyRouteTransitions(previous, routes, now = Date.now()) {
  const states = new Map(previous || []), entered = [];
  for (const route of routes) {
    const fetched = Date.parse(route.lastUpdated);
    if (route.isStale || !Number.isFinite(fetched) || now - fetched > 180000) continue;
    const heavy = route.level === 'heavy';
    if (previous && heavy && states.get(route.routeId) === false) entered.push(route);
    states.set(route.routeId, heavy);
  }
  return { states, entered };
}

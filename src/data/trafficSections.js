// Preserve provider interval boundaries. A normal gap must never become a jam.
export function decodePolyline(encoded) {
  if (typeof encoded !== 'string' || !encoded.length) throw new Error('Missing route geometry');
  const points = [];
  let index = 0, lat = 0, lng = 0;
  const read = () => {
    let value = 0, shift = 0, byte;
    do {
      if (index >= encoded.length || shift > 30) throw new Error('Invalid route geometry');
      byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63) throw new Error('Invalid route geometry');
      value |= (byte & 31) << shift;
      shift += 5;
    } while (byte >= 32);
    return value & 1 ? ~(value >> 1) : value >> 1;
  };
  while (index < encoded.length) {
    lat += read(); lng += read();
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

export function pathLength(path) {
  let sum = 0;
  const rad = x => x * Math.PI / 180;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
    sum += 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
  }
  return Math.round(sum);
}

export function buildTrafficSections(result) {
  const route = result.data;
  const points = decodePolyline(route?.polyline?.encodedPolyline);
  if (points.length < 2) throw new Error('Incomplete route geometry');
  const intervals = route.travelAdvisory?.speedReadingIntervals;
  if (!Array.isArray(intervals) || !intervals.length) throw new Error('Traffic intervals unavailable');
  const groups = [];
  let previousEnd = 0;
  for (const interval of intervals) {
    const start = interval.startPolylinePointIndex ?? 0;
    const end = interval.endPolylinePointIndex;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start < previousEnd || end <= start || end >= points.length || !['NORMAL', 'SLOW', 'TRAFFIC_JAM'].includes(interval.speed)) {
      throw new Error('Invalid traffic interval');
    }
    previousEnd = end;
    if (interval.speed === 'NORMAL') continue;
    const previous = groups.at(-1);
    if (previous && previous.speed === interval.speed && previous.end === start) previous.end = end;
    else groups.push({ start, end, speed: interval.speed });
  }
  const fetchedAt = result.fetchedAt || null;
  return groups.map((group, i) => {
    const path = points.slice(group.start, group.end + 1);
    const affectedLengthMeters = pathLength(path);
    const sectionLabel = `Section ${i + 1} of this monitored route`;
    return {
      id: `${result.routeId}:${group.speed}:${group.start}:${group.end}`,
      routeId: result.routeId,
      routeName: result.routeName,
      name: result.routeName,
      sectionLabel,
      landmark: sectionLabel,
      level: group.speed === 'TRAFFIC_JAM' ? 'heavy' : 'moderate',
      coordinates: path[Math.floor(path.length / 2)],
      path, affectedLengthMeters,
      startCoordinates: path[0], endCoordinates: path.at(-1),
      lastUpdated: fetchedAt, isStale: Boolean(result.isStale),
      speed: null, delay: null,
      // Durations belong to the entire parent route, not this affected section.
      routeDurationSeconds: parseDuration(route.duration),
      routeStaticDurationSeconds: parseDuration(route.staticDuration),
    };
  });
}

function parseDuration(value) {
  if (typeof value !== 'string' || !/^\d+(\.\d+)?s$/.test(value)) return null;
  return Number(value.slice(0, -1));
}

export function normalizeTraffic(payload) {
  const sections = [], failures = [], routeSummaries = [];
  let availableRoutes = 0, staleRoutes = 0;
  for (const result of payload.results || []) {
    if (!result.success || !result.data) { failures.push(result.routeId); continue; }
    try {
      const affected = buildTrafficSections(result);
      sections.push(...affected);
      const path = decodePolyline(result.data.polyline.encodedPolyline);
      const level = affected.some(s => s.level === 'heavy') ? 'heavy' : affected.length ? 'moderate' : 'normal';
      routeSummaries.push({ id: `route:${result.routeId}`, routeId: result.routeId, name: result.routeName, path, coordinates: path[Math.floor(path.length / 2)], level, isRoute: true, isStale: Boolean(result.isStale), lastUpdated: result.fetchedAt, durationSeconds: parseDuration(result.data.duration), sectionLabel: 'Entire monitored route', affectedLengthMeters: pathLength(path) });
      availableRoutes++;
      if (result.isStale) staleRoutes++;
    } catch { failures.push(result.routeId); }
  }
  sections.sort((a, b) => (a.level === b.level ? b.affectedLengthMeters - a.affectedLengthMeters : a.level === 'heavy' ? -1 : 1));
  const dataState = !availableRoutes ? 'unavailable' : staleRoutes === availableRoutes ? 'stale' : failures.length || staleRoutes ? 'partial' : 'fresh';
  const times = (payload.results || []).filter(r => r.success && r.fetchedAt).map(r => Date.parse(r.fetchedAt)).filter(Number.isFinite);
  return { sections, meta: { routeSummaries, dataState, availableRoutes, totalRoutes: payload.results?.length || 0, lastUpdated: times.length ? new Date(Math.min(...times)).toISOString() : null, failedRoutes: failures } };
}

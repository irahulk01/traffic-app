import React, { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, Radio } from 'lucide-react';
import RoadTrafficCard from './RoadTrafficCard';
import { groupTrafficSections } from '../../data/groupTrafficSections';

export default function CorridorCardsFeed({ streets = [], selectedStreet, onSelectStreet, dataState = 'fresh', activeFilter = 'all', isRefreshing = false }) {
  const roads = useMemo(() => groupTrafficSections(streets), [streets]);
  const [rows, setRows] = useState(() => roads.map(street => ({ street, phase: 'enter' })));
  const previous = useRef(roads);
  const elements = useRef(new Map());
  const positions = useRef(new Map());
  useEffect(() => {
    const old = new Map(previous.current.map(street => [street.id, street]));
    const incoming = new Set(roads.map(street => street.id));
    const next = roads.map(street => {
      const before = old.get(street.id);
      const changed = before && (before.level !== street.level || before.affectedLengthMeters !== street.affectedLengthMeters || before.isStale !== street.isStale || before.sectionCount !== street.sectionCount);
      return { street, phase: !before ? 'enter' : changed ? 'changed' : 'stable' };
    });
    // Removed observations become non-interactive immediately, then leave gently.
    old.forEach(street => { if (!incoming.has(street.id)) next.push({ street, phase: 'exit' }); });
    previous.current = roads;
    setRows(next);
    const timer = setTimeout(() => setRows(current => current.filter(row => row.phase !== 'exit').map(row => ({ ...row, phase: 'stable' }))), 320);
    return () => clearTimeout(timer);
  }, [roads]);
  useLayoutEffect(() => {
    const next = new Map();
    elements.current.forEach((element, id) => {
      const top = element.getBoundingClientRect().top;
      const before = positions.current.get(id);
      if (before != null && before !== top && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        element.animate?.([{ transform: `translateY(${before - top}px)` }, { transform: 'translateY(0)' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
      next.set(id, top);
    });
    positions.current = next;
  }, [rows]);
  if (rows.length === 0) {
    const content = {
      loading: [LoaderCircle, 'Checking monitored routes', 'Traffic sections will appear when route data is available.'],
      unavailable: [AlertCircle, 'Traffic data unavailable', 'The monitored routes could not be checked. Try refreshing later.'],
      stale: [AlertCircle, 'No current sections available', 'Previously received data may be out of date.'],
      partial: activeFilter === 'all' ? [Radio, 'No affected sections reported', 'Some route data is missing, so coverage is incomplete.'] : [Radio, 'No sections in this filter', 'Try another traffic category.'],
      fresh: activeFilter === 'all' ? [CheckCircle2, 'No affected sections reported', 'No slow or heavy sections were returned for available routes.'] : [Radio, 'No sections in this filter', 'Try another traffic category.'],
    }[dataState] || [AlertCircle, 'Traffic data unavailable', 'Current route conditions are not available.'];
    const Icon = content[0];
    return <div className={`corridors-empty-state empty-${dataState}`} role="status"><span className="empty-state-icon"><Icon size={20} /></span><h3>{content[1]}</h3><p>{content[2]}</p></div>;
  }
  return <div className="traffic-feed-region" aria-busy={isRefreshing}>
    <div className={`traffic-refresh-status ${isRefreshing ? 'is-checking' : ''}`} role="status"><span className="refresh-status-dot" />{isRefreshing ? 'Checking for traffic changes…' : `${roads.length} affected ${roads.length === 1 ? 'road' : 'roads'} · ${streets.length} sections`}</div>
    <div className="corridor-cards-feed" aria-label="Traffic on monitored roads">{rows.map(({ street, phase }) => <div key={street.id} ref={element => { if (element) elements.current.set(street.id, element); else elements.current.delete(street.id); }} className={`traffic-card-transition phase-${phase}`} aria-hidden={phase === 'exit' ? true : undefined} inert={phase === 'exit' ? true : undefined}><RoadTrafficCard road={street} selectedStreet={selectedStreet} onSelectStreet={onSelectStreet} /></div>)}</div>
  </div>;
}

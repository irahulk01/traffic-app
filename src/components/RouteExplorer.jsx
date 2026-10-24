import { useMemo, useState } from 'react';
import { Search, Star, LocateFixed, ChevronRight } from 'lucide-react';
import catalog from '../data/monitoredRoutes.json';
import { pathLength } from '../data/trafficSections';

export default function RouteExplorer({ routes = [], selectedId, onSelect }) {
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState(() => { try { const value = JSON.parse(localStorage.getItem('traffic-favourite-routes') || '[]'); return Array.isArray(value) ? value.filter(id => catalog.some(r => r.id === id)) : []; } catch { return []; } });
  const [location, setLocation] = useState(null);
  const [note, setNote] = useState('');
  const [locating, setLocating] = useState(false);
  const items = useMemo(() => catalog.map(route => {
    const observation = routes.find(r => r.routeId === route.id);
    const distance = location && observation?.path?.length ? Math.min(...observation.path.map(point => pathLength([location, point]))) : null;
    return { ...route, observation, distance };
  }).filter(r => r.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => location ? (a.distance ?? Infinity) - (b.distance ?? Infinity) : (Number(saved.includes(b.id)) - Number(saved.includes(a.id)) || Number(Boolean(b.area)) - Number(Boolean(a.area)))), [routes, location, saved, query]);
  const toggle = id => { const next = saved.includes(id) ? saved.filter(value => value !== id) : [...saved, id]; setSaved(next); try { localStorage.setItem('traffic-favourite-routes', JSON.stringify(next)); } catch { /* Saving is optional. */ } };
  const nearby = () => {
    if (!navigator.geolocation) { setNote('Location is unavailable in this browser.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => { setLocation({ lat: coords.latitude, lng: coords.longitude }); setLocating(false); setNote('Sorted by distance to monitored roads. Coverage stays in Hazaribagh.'); }, () => { setLocating(false); setNote('Location unavailable. You can choose any road below.'); }, { timeout: 8000, maximumAge: 300000 });
  };
  return <section className="route-explorer" aria-label="Explore monitored routes">
    <div className="section-heading"><h2>Hazaribagh roads</h2><button className="nearby-button" type="button" onClick={nearby} disabled={locating}><LocateFixed size={14} />{locating ? 'Locating…' : location ? 'Nearest first' : 'Near me'}</button></div>
    <label className="route-search"><Search size={17} /><input type="search" placeholder="Find a monitored road" value={query} onChange={e => setQuery(e.target.value)} aria-label="Find a monitored road" /></label>
    {note && <p className="route-note" role="status">{note}</p>}
    <p className="route-note">City connections include both directions. Cards cover these routes; other roads may only appear in Google’s traffic layer.</p>
    <div className="route-list">
      {items.map(({ id, name, observation, distance }) => {
        const status = !observation ? 'Waiting for data' : observation.isStale ? 'Older observation' : observation.level === 'heavy' ? 'Heavy sections' : observation.level === 'moderate' ? 'Slow sections' : 'No slowdown reported';
        return <div className={`route-row ${selectedId === id ? 'is-focused' : ''}`} key={id}>
          <button type="button" className="route-open" disabled={!observation} onClick={() => onSelect(selectedId === id ? null : observation)} aria-pressed={selectedId === id}>
            <span className={`route-condition ${observation?.isStale ? 'unknown' : observation?.level || 'unknown'}`} /><span className="route-row-copy"><strong>{name}</strong><span>{status}{distance != null ? ` · ${(distance / 1000).toFixed(1)} km away` : ''}</span></span><ChevronRight size={15} />
          </button>
          <button type="button" className="route-save" aria-label={`${saved.includes(id) ? 'Unsave' : 'Save'} ${name}`} aria-pressed={saved.includes(id)} onClick={() => toggle(id)}><Star size={17} fill={saved.includes(id) ? 'currentColor' : 'none'} /></button>
        </div>;
      })}
      {!items.length && <p className="route-note">No monitored road matches your search.</p>}
    </div>
    {selectedId && <button className="show-all-roads" type="button" onClick={() => onSelect(null)}>Show all monitored roads</button>}
  </section>;
}

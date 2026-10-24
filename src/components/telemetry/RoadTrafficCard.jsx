import { useState } from 'react';
import { ChevronDown, ArrowUpRight, Clock } from 'lucide-react';
import CorridorCard from './CorridorCard';

const lengthLabel = metres => metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`;
export default function RoadTrafficCard({ road, selectedStreet, onSelectStreet }) {
  const [expanded, setExpanded] = useState(false);
  const selected = road.sections.some(section => section.id === selectedStreet?.id);
  const time = Date.parse(road.lastUpdated);
  return <article className={`road-group-card ${selected ? 'is-selected' : ''}`}>
    <div className="road-group-top"><span className={`road-severity severity-${road.level === 'heavy' ? 'heavy' : 'slow'}`}><i />{road.level === 'heavy' ? 'Heavy traffic' : 'Slow traffic'}</span>{road.isStale && <span className="road-stale-label">Older data</span>}</div>
    <h3>{road.name}</h3>
    <p className="road-group-description">{road.sectionCount} affected {road.sectionCount === 1 ? 'section' : 'sections'} · Approx. {lengthLabel(road.affectedLengthMeters)} in total</p>
    <div className="road-group-meta"><span>{road.heavyCount > 0 && `${road.heavyCount} heavy`}{road.heavyCount > 0 && road.slowCount > 0 && ' · '}{road.slowCount > 0 && `${road.slowCount} slow`}</span><span><Clock size={12} />{Number.isFinite(time) ? new Date(time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : 'Time unavailable'}</span></div>
    <div className="road-group-actions"><button type="button" onClick={() => onSelectStreet(road.sections[0])}>Show worst section <ArrowUpRight size={15} /></button><button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} aria-controls={`sections-${road.routeId}`}>{expanded ? 'Hide sections' : 'View sections'}<ChevronDown size={15} className={expanded ? 'is-expanded' : ''} /></button></div>
    <div className={`road-group-disclosure ${expanded ? 'is-open' : ''}`} inert={!expanded ? true : undefined} aria-hidden={!expanded}><div className="road-group-sections" id={`sections-${road.routeId}`} aria-label={`Affected sections on ${road.name}`}>{road.sections.map(section => <CorridorCard key={section.id} street={section} isSelected={section.id === selectedStreet?.id} onSelect={onSelectStreet} />)}</div></div>
  </article>;
}

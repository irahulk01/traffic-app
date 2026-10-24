import React from 'react';
import { Clock, MapPin, Route } from 'lucide-react';

export default function CorridorCard({ street, isSelected, onSelect, updatedTime }) {
  const heavy = street.level === 'heavy';
  const label = heavy ? 'Heavy' : 'Slow';
  const time = street.lastUpdated || updatedTime;
  const formattedTime = time && !Number.isNaN(Date.parse(time)) ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (time || 'Time unavailable');
  const length = Number(street.affectedLengthMeters);
  const lengthText = Number.isFinite(length) && length > 0 ? `Approx. ${length >= 1000 ? `${(length / 1000).toFixed(1)} km` : `${Math.round(length)} m`} affected` : null;
  const section = street.sectionLabel || [street.startDescription, street.endDescription].filter(Boolean).join(' – ');

  return <button type="button" className={`traffic-simple-card road-section-card ${heavy ? 'border-high' : ''} ${isSelected ? 'card-selected' : ''}`} onClick={() => onSelect(street)} aria-pressed={isSelected}>
    <span className={`road-card-accent ${heavy ? 'accent-heavy' : 'accent-slow'}`} />
    <span className="road-card-main">
      <span className="road-card-topline"><span className={`road-severity severity-${heavy ? 'heavy' : 'slow'}`}><i />{label} traffic</span>{street.isStale && <span className="road-stale-label">Older data</span>}</span>
      <span className="road-name">{street.name || street.routeName || 'Affected road section'}</span>
      {(street.routeName || section || street.landmark) && <span className="road-route-line"><Route size={13} />{street.routeName && street.routeName !== street.name ? `${street.routeName} · ` : ''}{section || street.landmark}</span>}
      <span className="road-card-meta">{lengthText && <span><MapPin size={12} />{lengthText}</span>}<span><Clock size={12} />{formattedTime}</span></span>
    </span>
  </button>;
}

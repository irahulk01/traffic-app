import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

export default function CorridorCard({ street, isSelected, onSelect }) {
  const isHighTraffic = street.level === 'heavy';
  const isModerate = street.level === 'moderate';

  const badgeText = isHighTraffic
    ? 'High Traffic'
    : isModerate
    ? 'Moderate'
    : 'Normal Flow';

  const badgeClass = isHighTraffic
    ? 'high'
    : isModerate
    ? 'moderate'
    : 'normal';

  return (
    <article
      className={`traffic-simple-card ${isHighTraffic ? 'border-high' : ''} ${
        isSelected ? 'card-selected' : ''
      }`}
      onClick={() => onSelect(street)}
      role="button"
      tabIndex={0}
    >
      <div className="card-top-line">
        <div className="road-title-wrap">
          <h3 className="road-name">{street.name}</h3>
          {street.landmark && (
            <div className="road-landmark">
              <MapPin size={12} className="landmark-pin" />
              <span>{street.landmark}</span>
            </div>
          )}
        </div>

        <span className={`road-status-tag ${badgeClass}`}>
          {badgeText}
        </span>
      </div>

      <div className="road-metrics-row">
        <span className="metric-chip delay">
          <strong>Delay:</strong> {street.delay}
        </span>
        <span className="metric-chip speed">
          <strong>Speed:</strong> {street.speed} km/h
        </span>
        {street.direction && (
          <span className="metric-chip direction">
            <Navigation size={11} />
            <span>{street.direction}</span>
          </span>
        )}
      </div>

      {(street.trafficAdvisory || street.advisory) && (
        <div className="road-advisory-line">
          <span>{street.trafficAdvisory || street.advisory}</span>
        </div>
      )}
    </article>
  );
}

import React from 'react';
import { Radio } from 'lucide-react';

export default function MapCityTag({ cityName, mapEngine }) {
  return (
    <div className="map-city-tag">
      <div className="live-pulse-dot" />
      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{cityName}</span>
      <span
        style={{
          fontSize: 10,
          padding: '2px 8px',
          borderRadius: 12,
          background:
            mapEngine === 'google' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(56, 189, 248, 0.25)',
          color: mapEngine === 'google' ? '#4ade80' : '#38bdf8',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Radio size={10} />
        {mapEngine === 'google' ? 'Live Google Traffic' : 'Live Vector Traffic'}
      </span>

      {/* Severity Color Legend */}
      <div className="map-traffic-indicator">
        <span
          className="traffic-legend-dot"
          style={{ background: '#ef4444' }}
          title="Heavy Congestion (Red)"
        />
        <span
          className="traffic-legend-dot"
          style={{ background: '#f97316' }}
          title="Moderate Delay (Orange)"
        />
        <span
          className="traffic-legend-dot"
          style={{ background: '#22c55e' }}
          title="Smooth Flow (Green)"
        />
        <span
          className="traffic-legend-dot"
          style={{ background: '#94a3b8' }}
          title="Clear (Neutral)"
        />
      </div>
    </div>
  );
}

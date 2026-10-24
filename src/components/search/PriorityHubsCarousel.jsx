import React from 'react';
import { ArrowUpRight, MapPin, Radio } from 'lucide-react';

export default function PriorityHubsCarousel({ hubs = [], onSelectCity }) {
  return (
    <div className="hub-card-grid">
      {hubs.map((hub) => (
        <button key={hub.name} type="button" className="hub-card" onClick={() => onSelectCity(hub)}>
          <div className="hub-card-top"><span className="hub-card-icon"><MapPin size={17} /></span><span className="hub-card-state">{hub.state}</span></div>
          <h3>{hub.name}</h3><p>{hub.division}</p>
          <div className="hub-card-coverage"><Radio size={14} /><span>{hub.corridorSummary}</span><span className="hub-card-status">Data status available on map</span></div>
          <span className="hub-card-link">View monitoring area <ArrowUpRight size={15} /></span>
        </button>
      ))}
    </div>
  );
}

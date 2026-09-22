import React from 'react';
import { MapPin, ArrowRight } from 'lucide-react';

export default function CityDirectoryGrid({ spotlightCities = [], onSelectCity }) {
  return (
    <section className="directory-section">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">Major Indian Traffic Corridors</h2>
          <p className="section-subtext">Quick access to key state capitals and regional transit networks</p>
        </div>
      </div>

      <div className="directory-cities-grid">
        {spotlightCities.map((c) => (
          <div
            key={c.name}
            className="directory-city-card"
            onClick={() => onSelectCity(c)}
            role="button"
            tabIndex={0}
          >
            <div className="dir-card-left">
              <div className="dir-pin-box">
                <MapPin size={16} />
              </div>
              <div className="dir-info-box">
                <span className="dir-city-name">{c.name}</span>
                <span className="dir-state-name">{c.state}</span>
              </div>
            </div>
            <ArrowRight size={14} className="dir-arrow-icon" />
          </div>
        ))}
      </div>
    </section>
  );
}

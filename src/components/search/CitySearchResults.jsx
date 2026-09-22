import React from 'react';
import { MapPin, ChevronRight } from 'lucide-react';

export default function CitySearchResults({ searchQuery, searchResults = [], onSelectCity }) {
  return (
    <section className="search-results-section" aria-label="Search Results">
      <div className="section-header-row">
        <div>
          <div className="section-title-wrap">
            <h2 className="section-title">Matching Cities</h2>
            <span className="results-count-pill">{searchResults.length}</span>
          </div>
          <p className="section-subtext">
            Results for "{searchQuery}"
          </p>
        </div>
      </div>

      {searchResults.length > 0 ? (
        <div className="directory-cities-grid">
          {searchResults.map((c) => (
            <div
              key={`${c.name}-${c.stateCode || c.state || c.lat}`}
              className="directory-city-card"
              onClick={() => onSelectCity(c)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectCity(c);
                }
              }}
            >
              <div className="dir-card-left">
                <div className="dir-pin-box">
                  <MapPin size={15} />
                </div>
                <div className="dir-info-box">
                  <span className="dir-city-name">{c.name}</span>
                  <span className="dir-state-name">
                    {c.state ? `${c.state} • India` : 'India'}
                  </span>
                </div>
              </div>
              <div className="dir-card-right">
                <span className="view-map-hint">View Map</span>
                <ChevronRight size={15} className="dir-arrow-icon" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="search-empty-box">
          <p className="empty-title">No city matching "{searchQuery}"</p>
          <p className="empty-subtitle">Try searching another Indian city, district, or town name.</p>
        </div>
      )}
    </section>
  );
}


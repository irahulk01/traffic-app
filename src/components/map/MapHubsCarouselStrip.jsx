import React from 'react';

export default function MapHubsCarouselStrip({ hubs = [], currentCityName = '', onSelectCity }) {
  return (
    <div className="map-hubs-carousel-bar">
      <div className="map-hubs-track">
        {hubs.map((hub) => {
          const isSelected = hub.name.toLowerCase() === (currentCityName || '').toLowerCase();
          return (
            <button
              key={hub.name}
              type="button"
              className={`map-hub-slide-card ${isSelected ? 'selected' : ''} severity-${hub.statusLevel}`}
              onClick={() => onSelectCity && onSelectCity(hub)}
              title={`Switch to ${hub.name} traffic map (${hub.delayText})`}
            >
              <div className="map-hub-card-top">
                <span className="map-hub-pulse-dot" />
                <span className="map-hub-city-name">{hub.name}</span>
              </div>
              <div className="map-hub-card-meta">
                <span className="map-hub-delay-pill">{hub.delayText.split(' ')[0]}</span>
                <span className="map-hub-choke-label">{hub.landmark ? hub.landmark.split('&')[0].trim() : 'Active Feed'}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

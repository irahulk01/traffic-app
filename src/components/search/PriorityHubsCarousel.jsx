import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Clock, MapPin, ArrowRight } from 'lucide-react';

export default function PriorityHubsCarousel({ hubs = [], onSelectCity }) {
  const trackRef = useRef(null);

  const scrollCarousel = (direction) => {
    if (trackRef.current) {
      const scrollAmount = 340;
      trackRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="priority-section">
      <div className="section-header-row">
        <div>
          <div className="section-eyebrow">
            <span className="live-dot" />
            <span>Live Corridor Telemetry</span>
          </div>
          <h2 className="section-title">Monitored Traffic Hubs ({hubs.length})</h2>
          <p className="section-subtext">Swipe horizontally or use arrows to view live delays and choke points</p>
        </div>

        {/* Carousel Navigation Arrows */}
        <div className="carousel-nav-arrows">
          <button
            type="button"
            className="carousel-nav-arrow-btn"
            onClick={() => scrollCarousel('left')}
            title="Scroll left"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="carousel-nav-arrow-btn"
            onClick={() => scrollCarousel('right')}
            title="Scroll right"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Cards Track with Edge Peek Affordance */}
      <div className="priority-carousel-wrapper">
        <div className="priority-cards-carousel" ref={trackRef}>
          {hubs.map((hub) => {
            const isHeavy = hub.statusLevel === 'heavy';
            const isModerate = hub.statusLevel === 'moderate';

            return (
              <div
                key={hub.name}
                className={`jurisdiction-tile jurisdiction-carousel-tile severity-${hub.statusLevel}`}
                onClick={() => onSelectCity(hub)}
                role="button"
                tabIndex={0}
              >
                <div className="tile-top-row">
                  <div className="tile-title-box">
                    <span className="tile-city-name">{hub.name}</span>
                    <span className="tile-state-name">{hub.division} • {hub.state}</span>
                  </div>

                  <div className={`severity-capsule severity-${hub.statusLevel}`}>
                    <span className="capsule-dot" />
                    <span>{isHeavy ? 'Heavy Delay' : isModerate ? 'Moderate Delay' : 'Smooth Flow'}</span>
                  </div>
                </div>

                <div className="tile-advisory-box">
                  <AlertTriangle
                    size={14}
                    className={isHeavy ? 'advisory-icon-heavy' : 'advisory-icon-moderate'}
                  />
                  <span className="advisory-text">{hub.statusLabel}</span>
                </div>

                <div className="tile-metrics-row">
                  <div className="tile-delay-stat">
                    <Clock size={12} />
                    <span>{hub.delayText}</span>
                  </div>
                  <div className="corridor-summary-pill">
                    <span>{hub.corridorSummary}</span>
                  </div>
                </div>

                <div className="tile-footer-row">
                  <span className="tile-landmark-text">
                    <MapPin size={12} />
                    <span>{hub.landmark}</span>
                  </span>
                  <span className="tile-action-link">
                    <span>View Map</span>
                    <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="carousel-edge-fade" />
      </div>
    </section>
  );
}

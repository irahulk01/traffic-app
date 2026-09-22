import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  MapPin,
  X,
  Shield,
  ArrowRight,
  Radio,
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Loader2,
  AlertCircle,
  Bell,
  Activity,
  Compass,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  PhoneCall,
  Flame,
} from 'lucide-react';
import { searchIndianCities, findNearestIndianCity } from '../data/citiesService';
import TrafficAlertModal from './TrafficAlertModal';
import { getHeavyTrafficUnder50Km } from '../data/trafficEngine';

// Verified monitored high-traffic divisions (4 Core Indian Police Hubs)
export const POLICE_MONITORED_JURISDICTIONS = [
  {
    name: 'Hazaribagh',
    division: 'Hazaribagh Traffic Division',
    state: 'Jharkhand',
    stateCode: 'JH',
    lat: 23.9924,
    lng: 85.3616,
    statusLevel: 'heavy',
    statusLabel: 'Critical Bottleneck at Jhanda Chowk & NH-33',
    delayText: '+22 mins arterial delay',
    patrolUnits: '6 Police Patrol Units on Duty',
    corridorSummary: '3 Heavy • 2 Moderate • 3 Clear',
    hqLandmark: 'Control Room: Sadar Thana Hub',
  },
  {
    name: 'Giridih',
    division: 'Giridih Traffic Division',
    state: 'Jharkhand',
    stateCode: 'JH',
    lat: 24.2500,
    lng: 85.9167,
    statusLevel: 'heavy',
    statusLabel: 'Severe Choke Point near Tower Chowk',
    delayText: '+19 mins arterial delay',
    patrolUnits: '4 Police Patrol Units on Duty',
    corridorSummary: '2 Heavy • 2 Moderate • 3 Clear',
    hqLandmark: 'Control Room: Tower Chowk Post',
  },
  {
    name: 'Ranchi',
    division: 'Ranchi Traffic Division',
    state: 'Jharkhand',
    stateCode: 'JH',
    lat: 23.3432,
    lng: 85.3094,
    statusLevel: 'moderate',
    statusLabel: 'Moderate Slowdown at Kantatoli & Main Road',
    delayText: '+11 mins peak hour delay',
    patrolUnits: '12 Police Patrol Units on Duty',
    corridorSummary: '3 Heavy • 4 Moderate • 5 Clear',
    hqLandmark: 'Control Room: Kantatoli Chowk Post',
  },
  {
    name: 'Dhanbad',
    division: 'Dhanbad Traffic Division',
    state: 'Jharkhand',
    stateCode: 'JH',
    lat: 23.7957,
    lng: 86.4304,
    statusLevel: 'heavy',
    statusLabel: 'Commercial Truck Gridlock on Bank More & GT Road',
    delayText: '+18 mins arterial delay',
    patrolUnits: '8 Police Patrol Units on Duty',
    corridorSummary: '4 Heavy • 2 Moderate • 4 Clear',
    hqLandmark: 'Control Room: Bank More Chowk Hub',
  },
];

export default function CitySearchPage({ onSelectCity, theme = 'night', onToggleTheme }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectError, setDetectError] = useState('');
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const priorityTrackRef = useRef(null);

  const scrollPriority = (direction) => {
    if (priorityTrackRef.current) {
      const scrollAmount = 350;
      priorityTrackRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };


  // Handle GPS location detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setDetectError('GPS location service not supported on this browser.');
      setTimeout(() => setDetectError(''), 4000);
      return;
    }

    setIsDetecting(true);
    setDetectError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Attempt reverse geocoding via Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { signal: AbortSignal.timeout(3500) }
          );

          if (res.ok) {
            const data = await res.json();
            const detectedName =
              data.address?.city ||
              data.address?.town ||
              data.address?.district ||
              data.address?.county ||
              data.address?.state_district;

            const nearest = findNearestIndianCity(latitude, longitude);
            setIsDetecting(false);

            if (detectedName) {
              onSelectCity({
                ...nearest,
                name: detectedName,
                state: data.address?.state || nearest?.state || 'India',
                lat: latitude,
                lng: longitude,
              });
              return;
            }
          }
        } catch (e) {
          // fallback to nearest Indian city algorithm
        }

        const nearestCity = findNearestIndianCity(latitude, longitude);
        setIsDetecting(false);

        if (nearestCity) {
          onSelectCity(nearestCity);
        } else {
          setDetectError('No supported traffic division found near your location.');
          setTimeout(() => setDetectError(''), 4000);
        }
      },
      (err) => {
        setIsDetecting(false);
        console.warn('GPS Error:', err);
        let msg = 'Location access denied. Please search city manually.';
        if (err.code === 2) msg = 'GPS signal unavailable on device.';
        if (err.code === 3) msg = 'Location detection timed out.';
        setDetectError(msg);
        setTimeout(() => setDetectError(''), 4000);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
    );
  };

  // 50km heavy alerts for primary monitored jurisdiction (Hazaribagh Hub)
  const radarAlerts = useMemo(() => {
    return getHeavyTrafficUnder50Km({
      name: 'Hazaribagh',
      state: 'Jharkhand',
      lat: 23.9924,
      lng: 85.3616,
    });
  }, []);

  // Search results across cities
  const searchResults = useMemo(() => {
    return searchIndianCities(searchQuery, 40);
  }, [searchQuery]);

  const displayedPriorityCards = POLICE_MONITORED_JURISDICTIONS;

  return (
    <div className="search-page-scroll-wrap">
      {/* Top Police Control Room Brand Header */}
      <header className="brand-header-bar">
        <div className="brand-logo-group">
          <div className="brand-icon-box police-badge-icon-box">
            <Shield size={20} className="brand-icon" />
          </div>
          <div className="brand-text">
            <div className="brand-title-row">
              <span className="brand-name">GatiLive</span>
              <span className="police-flag-pill">TRAFFIC POLICE</span>
            </div>
            <span className="brand-tagline">Arterial Monitoring & Control Portal</span>
          </div>
        </div>

        <div className="header-actions-group">
          <div className="radar-status-badge police-status-badge">
            <div className="live-status-dot" />
            <span>50 km Radar Grid Active</span>
          </div>

          {/* High-Visibility Day / Night Toggle */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={theme === 'day' ? 'Switch to Night Command Mode (Low Light)' : 'Switch to Day Patrol Visibility Mode (High Contrast)'}
          >
            {theme === 'day' ? <Moon size={15} /> : <Sun size={15} />}
            <span className="theme-toggle-label">{theme === 'day' ? 'Night Mode' : 'Day Mode'}</span>
          </button>

          <button
            type="button"
            className={`notification-icon-btn ${radarAlerts.heavyAlerts.length > 0 ? 'active-alerts' : ''}`}
            onClick={() => setIsAlertModalOpen(true)}
            title="50km Heavy Bottleneck Alerts & Police Dispatch Push"
          >
            <Bell size={17} />
            {radarAlerts.heavyAlerts.length > 0 && (
              <span className="notification-pill-count">
                {radarAlerts.heavyAlerts.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero Welcome & Overview */}
      <section className="hero-command-section">
        <div className="hero-text-content">
          <div className="hero-eyebrow police-eyebrow">
            <Shield size={13} className="eyebrow-icon" />
            <span>झारखंड पुलिस • Jharkhand Traffic Police Command & Commuter Portal</span>
          </div>
          <h1 className="hero-heading">
            Live City Traffic & <span>Arterial Control Grid</span>
          </h1>
          <p className="hero-description">
            Real-time arterial choke points, crawl speeds, and 50 km perimeter monitoring across Hazaribagh, Giridih, Ranchi, and Dhanbad traffic divisions.
          </p>
        </div>

        {/* Quick Hub Jump Bar */}
        <div className="quick-hub-jump-bar">
          <span className="quick-hub-label">Quick Jump to Division:</span>
          <div className="quick-hub-chips">
            {POLICE_MONITORED_JURISDICTIONS.map((hub) => (
              <button
                key={hub.name}
                type="button"
                className={`quick-hub-chip ${hub.statusLevel === 'heavy' ? 'chip-heavy' : 'chip-moderate'}`}
                onClick={() => onSelectCity(hub)}
              >
                <span className={`chip-dot ${hub.statusLevel}`} />
                <span className="chip-city-name">{hub.name}</span>
                <span className="chip-delay-badge">{hub.delayText.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="hero-stats-row">
          <div className="hero-stat-card">
            <Radio size={15} className="stat-icon-green" />
            <div className="stat-text">
              <span className="stat-value">10-Min Live Feed</span>
              <span className="stat-label">Continuous Road Telemetry</span>
            </div>
          </div>

          <div className="hero-stat-card">
            <Compass size={15} className="stat-icon-blue" />
            <div className="stat-text">
              <span className="stat-value">50 km Jurisdiction</span>
              <span className="stat-label">Highway & Chowk Radar</span>
            </div>
          </div>

          <div className="hero-stat-card">
            <CheckCircle2 size={15} className="stat-icon-gold" />
            <div className="stat-text">
              <span className="stat-value">4 Monitored Hubs</span>
              <span className="stat-label">Hazaribagh • Giridih • Ranchi • Dhanbad</span>
            </div>
          </div>
        </div>
      </section>

      {/* Modern Floating Search Island */}
      <section className="search-island-container">
        <div className="search-island-box">
          <Search size={19} className="search-island-icon" />
          <input
            type="text"
            className="search-island-input"
            placeholder="Search division, chowk, NH highway, or landmark (e.g. Hazaribagh, Giridih, Ranchi)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search input"
            >
              <X size={15} />
            </button>
          )}

          {/* Integrated Detect Location Button */}
          <button
            type="button"
            className={`detect-location-pill ${isDetecting ? 'detecting' : ''}`}
            onClick={handleDetectLocation}
            disabled={isDetecting}
            title="Detect nearest traffic division via GPS"
          >
            {isDetecting ? (
              <Loader2 size={14} className="spinning-loader" />
            ) : (
              <Crosshair size={14} />
            )}
            <span>{isDetecting ? 'Locating...' : 'Detect Division'}</span>
          </button>
        </div>

        {/* Location Detection Toast Message */}
        {detectError && (
          <div className="search-error-toast">
            <AlertCircle size={14} />
            <span>{detectError}</span>
          </div>
        )}
      </section>

      {/* Priority Monitored Jurisdictions Horizontally Movable Carousel */}
      {!searchQuery && (
        <section className="priority-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Monitored Traffic Divisions (4)</h2>
              <p className="section-subtext">Swipe or use arrows to view live corridor telemetry, active patrols, and chowk bottlenecks</p>
            </div>
            
            <div className="section-header-actions-right">
              <div className="section-live-tag">
                <span className="live-dot" />
                <span>Live Feed Active</span>
              </div>

              {/* Navigation arrows */}
              <div className="carousel-nav-arrows">
                <button
                  type="button"
                  className="carousel-nav-arrow-btn"
                  onClick={() => scrollPriority('left')}
                  title="Scroll left"
                  aria-label="Scroll left"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="carousel-nav-arrow-btn"
                  onClick={() => scrollPriority('right')}
                  title="Scroll right"
                  aria-label="Scroll right"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Horizontally scrollable cards container */}
          <div className="priority-carousel-wrapper">
            <div className="priority-cards-carousel" ref={priorityTrackRef}>
              {displayedPriorityCards.map((j) => {
                const isHeavy = j.statusLevel === 'heavy';
                const isModerate = j.statusLevel === 'moderate';

                return (
                  <div
                    key={j.name}
                    className={`jurisdiction-tile jurisdiction-carousel-tile severity-${j.statusLevel}`}
                    onClick={() => onSelectCity(j)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="tile-top-row">
                      <div className="tile-title-box">
                        <span className="tile-city-name">{j.name}</span>
                        <span className="tile-state-name">{j.division} • {j.state}</span>
                      </div>

                      <div className={`severity-capsule severity-${j.statusLevel}`}>
                        <span className="capsule-dot" />
                        <span>{isHeavy ? 'Heavy Gridlock' : isModerate ? 'Moderate Delay' : 'Smooth Flow'}</span>
                      </div>
                    </div>

                    <div className="tile-advisory-box">
                      <AlertTriangle
                        size={14}
                        className={isHeavy ? 'advisory-icon-heavy' : 'advisory-icon-moderate'}
                      />
                      <span className="advisory-text">{j.statusLabel}</span>
                    </div>

                    <div className="tile-metrics-row">
                      <span className="tile-delay-stat">{j.delayText}</span>
                      <span className="tile-patrol-stat">{j.patrolUnits}</span>
                    </div>

                    <div className="tile-footer-row">
                      <span className="corridor-summary-text">{j.corridorSummary}</span>
                      <span className="tile-action-link">
                        <span>Open Control Grid</span>
                        <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Search Results (Only shown when user types in search) */}
      {searchQuery && (
        <section className="directory-section search-results-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">
                Matching Cities & Divisions ({searchResults.length})
              </h2>
              <p className="section-subtext">
                Showing matching jurisdictions for "{searchQuery}"
              </p>
            </div>
          </div>

          <div className="directory-list-container">
            {searchResults.length > 0 ? (
              searchResults.map((city) => (
                <div
                  key={city.id || `${city.name}-${city.lat}`}
                  className="directory-item-card"
                  onClick={() => onSelectCity(city)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="directory-item-left">
                    <div className="directory-pin-box">
                      <MapPin size={16} />
                    </div>
                    <div>
                      <span className="directory-city-title">{city.name}</span>
                      <div className="directory-meta-row">
                        <span className="directory-state-tag">{city.state}</span>
                        <span className="directory-coords">
                          {city.lat.toFixed(2)}°N, {city.lng.toFixed(2)}°E
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="directory-item-right">
                    <span className="launch-text">Open Control Grid</span>
                    <ArrowRight size={15} className="directory-arrow-icon" />
                  </div>
                </div>
              ))
            ) : (
              <div className="directory-empty-state">
                <MapPin size={34} className="empty-icon" />
                <h3>No division found for "{searchQuery}"</h3>
                <p>Try searching for Hazaribagh, Giridih, Ranchi, or Dhanbad.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* National & State Emergency & Highway Helpline Bar */}
      <footer className="emergency-helpline-bar">
        <div className="helpline-title-group">
          <Shield size={16} className="helpline-shield-icon" />
          <span className="helpline-heading">24x7 Emergency & Highway Helplines:</span>
        </div>
        <div className="helpline-badges-row">
          <a href="tel:112" className="helpline-badge badge-emergency" title="All-India Emergency Response">
            <span className="helpline-number">🚨 112</span>
            <span className="helpline-name">National Emergency</span>
          </a>
          <a href="tel:1033" className="helpline-badge badge-nhai" title="National Highway Authority of India Assistance">
            <span className="helpline-number">🛣️ 1033</span>
            <span className="helpline-name">NHAI Highway Helpline</span>
          </a>
          <a href="tel:1073" className="helpline-badge badge-traffic" title="Traffic Police Road Safety & Accident Helpline">
            <span className="helpline-number">👮 1073</span>
            <span className="helpline-name">Traffic Control Room</span>
          </a>
          <a href="tel:108" className="helpline-badge badge-ambulance" title="Medical Emergency & Ambulance">
            <span className="helpline-number">🚑 108</span>
            <span className="helpline-name">Ambulance Service</span>
          </a>
        </div>
      </footer>

      {/* 50km Radar Alerts Modal */}
      <TrafficAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        cityName={radarAlerts.cityName}
        heavyStreets={radarAlerts.heavyAlerts}
        onSelectStreet={() => {
          setIsAlertModalOpen(false);
          onSelectCity({
            name: radarAlerts.cityName,
            state: radarAlerts.state,
            lat: 23.9924,
            lng: 85.3616,
          });
        }}
      />
    </div>
  );
}


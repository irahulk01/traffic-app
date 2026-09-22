import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  X,
  Shield,
  ArrowRight,
  Radio,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Crosshair,
  Loader2,
  AlertCircle,
  Bell,
} from 'lucide-react';
import { searchIndianCities, findNearestIndianCity } from '../data/citiesService';
import TrafficAlertModal from './TrafficAlertModal';
import { getHeavyTrafficUnder50Km } from '../data/trafficEngine';


// Priority monitored jurisdictions for Traffic Police
const POLICE_MONITORED_JURISDICTIONS = [
  {
    name: 'Hazaribagh',
    state: 'Jharkhand',
    stateCode: 'JH',
    lat: 23.9924,
    lng: 85.3616,
    statusLevel: 'heavy',
    statusLabel: 'Critical Jhanda Chowk Delay',
    delayText: '+22m Delay on NH-33',
    patrolUnits: '6 Active Patrols',
    corridorSummary: '3 Heavy • 2 Moderate • 3 Clear',
  },
  {
    name: 'Giridih',
    state: 'Jharkhand',
    stateCode: 'JH',
    lat: 24.2500,
    lng: 85.9167,
    statusLevel: 'heavy',
    statusLabel: 'Tower Chowk Bottleneck',
    delayText: '+19m Delay on Main Road',
    patrolUnits: '4 Active Patrols',
    corridorSummary: '2 Heavy • 2 Moderate • 3 Clear',
  },
  {
    name: 'Ranchi',
    state: 'Jharkhand',
    stateCode: 'JH',
    lat: 23.3432,
    lng: 85.3094,
    statusLevel: 'moderate',
    statusLabel: 'Kantatoli & Main Road Slowdowns',
    delayText: '+11m Peak Hour Slowdown',
    patrolUnits: '12 Active Patrols',
    corridorSummary: '3 Heavy • 4 Moderate • 5 Clear',
  },
  {
    name: 'Dhanbad',
    state: 'Jharkhand',
    stateCode: 'JH',
    lat: 23.7957,
    lng: 86.4304,
    statusLevel: 'heavy',
    statusLabel: 'Bank More Commercial Gridlock',
    delayText: '+18m Delay on GT Road',
    patrolUnits: '8 Active Patrols',
    corridorSummary: '4 Heavy • 2 Moderate • 4 Clear',
  },
  {
    name: 'Bokaro',
    state: 'Jharkhand',
    stateCode: 'JH',
    lat: 23.6693,
    lng: 86.1511,
    statusLevel: 'low',
    statusLabel: 'Normal Industrial Flow',
    delayText: 'On Time (0 delay)',
    patrolUnits: '5 Active Patrols',
    corridorSummary: '0 Heavy • 2 Moderate • 6 Clear',
  },
  {
    name: 'Patna',
    state: 'Bihar',
    stateCode: 'BR',
    lat: 25.5941,
    lng: 85.1376,
    statusLevel: 'heavy',
    statusLabel: 'Dak Bungalow & Bailey Road Alert',
    delayText: '+24m Delay on Bailey Rd',
    patrolUnits: '15 Active Patrols',
    corridorSummary: '5 Heavy • 3 Moderate • 4 Clear',
  },
  {
    name: 'Delhi',
    state: 'Delhi',
    stateCode: 'DL',
    lat: 28.6139,
    lng: 77.2090,
    statusLevel: 'heavy',
    statusLabel: 'Ring Road & ITO Junction Grid',
    delayText: '+28m Peak Congestion',
    patrolUnits: '24 Active Patrols',
    corridorSummary: '6 Heavy • 5 Moderate • 3 Clear',
  },
  {
    name: 'Bengaluru',
    state: 'Karnataka',
    stateCode: 'KA',
    lat: 12.9716,
    lng: 77.5946,
    statusLevel: 'heavy',
    statusLabel: 'Silk Board & Outer Ring Road',
    delayText: '+32m Critical Delay',
    patrolUnits: '20 Active Patrols',
    corridorSummary: '7 Heavy • 4 Moderate • 3 Clear',
  },
];

const STATE_FILTERS = [
  { label: 'All Jurisdictions', code: 'ALL' },
  { label: 'Jharkhand (JH)', code: 'JH' },
  { label: 'Bihar (BR)', code: 'BR' },
  { label: 'Delhi (DL)', code: 'DL' },
  { label: 'Karnataka (KA)', code: 'KA' },
];

export default function CitySearchPage({ onSelectCity }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState('ALL');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectError, setDetectError] = useState('');

  // Handle GPS location detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setDetectError('GPS geolocation not supported by your browser');
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
            { signal: AbortSignal.timeout(3000) }
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
          setDetectError('No Indian city found near your current location.');
          setTimeout(() => setDetectError(''), 4000);
        }
      },
      (err) => {
        setIsDetecting(false);
        console.warn('GPS Error:', err);
        let msg = 'Location access denied. Please search manually.';
        if (err.code === 2) msg = 'Location unavailable on device.';
        if (err.code === 3) msg = 'Location detection timed out.';
        setDetectError(msg);
        setTimeout(() => setDetectError(''), 4000);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
    );
  };

  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  // 50km heavy alerts for primary monitored jurisdiction (Hazaribagh Command Hub)
  const radarAlerts = useMemo(() => {
    return getHeavyTrafficUnder50Km({
      name: 'Hazaribagh',
      state: 'Jharkhand',
      lat: 23.9924,
      lng: 85.3616,
    });
  }, []);

  // Search results across all 4,242 Indian cities
  const searchResults = useMemo(() => {
    const results = searchIndianCities(searchQuery, 40);
    if (selectedStateFilter === 'ALL') return results;
    return results.filter((c) => c.stateCode === selectedStateFilter);
  }, [searchQuery, selectedStateFilter]);

  // Monitored cards filtered by selected state
  const displayedPriorityCards = useMemo(() => {
    if (selectedStateFilter === 'ALL') return POLICE_MONITORED_JURISDICTIONS;
    return POLICE_MONITORED_JURISDICTIONS.filter(
      (c) => c.stateCode === selectedStateFilter
    );
  }, [selectedStateFilter]);

  return (
    <div className="search-page">
      {/* Official Traffic Police & Command Header */}
      <div className="police-command-hero">
        <div className="command-header-top-bar">
          <div className="police-header-badge">
            <Shield size={13} color="#60a5fa" />
            <span>Traffic Police Command • 50km Radar Grid</span>
            <div className="live-pulse-dot" />
          </div>

          <button
            type="button"
            className={`header-btn notification-bell-btn ${radarAlerts.heavyAlerts.length > 0 ? 'has-alerts' : ''}`}
            onClick={() => setIsAlertModalOpen(true)}
            title="50km Heavy Traffic Alerts & Mobile Push"
          >
            <Bell size={16} />
            {radarAlerts.heavyAlerts.length > 0 && (
              <span className="bell-badge-count">{radarAlerts.heavyAlerts.length}</span>
            )}
          </button>
        </div>

        <h2>
          India Traffic <span>Control Portal</span>
        </h2>

        <p>
          Real-time arterial congestion, corridor speeds, and traffic warden dispatch data
        </p>

        {/* Live Operational Metrics Ribbon */}
        <div className="police-stats-ribbon">
          <div className="police-stat-pill">
            <Radio size={11} color="#22c55e" />
            <span>10-Min Live Feed</span>
          </div>
          <div className="police-stat-pill">
            <CheckCircle2 size={11} color="#60a5fa" />
            <span>4,242 Cities Indexed</span>
          </div>
          <div className="police-stat-pill">
            <Clock size={11} color="#f59e0b" />
            <span>Rate-Limit Protected</span>
          </div>
        </div>
      </div>

      {/* Primary City Search Box with Detect Me Button Inside */}
      <div className="search-box-container">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search city / district (e.g. Hazaribagh, Giridih)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              title="Clear Search"
            >
              <X size={14} />
            </button>
          )}

          {/* Detect Me Button */}
          <button
            type="button"
            className={`detect-me-btn ${isDetecting ? 'detecting' : ''}`}
            onClick={handleDetectLocation}
            disabled={isDetecting}
            title="Detect my current location"
          >
            {isDetecting ? (
              <Loader2 size={13} className="spin-icon" />
            ) : (
              <Crosshair size={13} />
            )}
            <span>{isDetecting ? 'Detecting...' : 'Detect Me'}</span>
          </button>
        </div>

        {/* Location Detection Error Toast */}
        {detectError && (
          <div className="detect-error-toast">
            <AlertCircle size={13} />
            <span>{detectError}</span>
          </div>
        )}
      </div>


      {/* State Filter Tabs */}
      <div className="state-filter-container">
        <div className="filter-label-row">
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Filter size={12} color="#94a3b8" />
            Filter By State
          </span>
          <span style={{ fontSize: 10, color: '#64748b' }}>
            Official Police Zones
          </span>
        </div>
        <div className="state-filter-chips">
          {STATE_FILTERS.map((f) => (
            <button
              key={f.code}
              className={`state-filter-btn ${
                selectedStateFilter === f.code ? 'active' : ''
              }`}
              onClick={() => setSelectedStateFilter(f.code)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Priority Monitored Jurisdictions (When not performing specific text query) */}
      {!searchQuery && (
        <div className="priority-jurisdiction-section">
          <div className="section-label">
            <span>High-Priority Police Jurisdictions</span>
            <span style={{ fontSize: 10, color: '#22c55e' }}>● Live Feed Active</span>
          </div>

          <div className="jurisdiction-grid">
            {displayedPriorityCards.map((j) => (
              <div
                key={j.name}
                className={`jurisdiction-card severity-${j.statusLevel}`}
                onClick={() => onSelectCity(j)}
              >
                <div className="jurisdiction-card-header">
                  <div className="jurisdiction-title-group">
                    <span className="jurisdiction-name">{j.name}</span>
                    <span className="jurisdiction-state-tag">
                      {j.state} • {j.stateCode}
                    </span>
                  </div>
                  <div className={`jurisdiction-pill level-${j.statusLevel}`}>
                    <span className="pill-dot" />
                    <span>{j.statusLevel === 'heavy' ? 'Heavy' : j.statusLevel === 'moderate' ? 'Moderate' : 'Low'}</span>
                  </div>
                </div>

                <div className="jurisdiction-advisory">
                  <AlertTriangle
                    size={13}
                    color={j.statusLevel === 'heavy' ? '#ef4444' : '#f97316'}
                  />
                  <span>{j.statusLabel}</span>
                </div>

                <div className="jurisdiction-footer">
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
                    {j.delayText}
                  </span>
                  <span className="view-link">
                    <span>Dispatch Map</span>
                    <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Results List (Across 4,242 Indian Cities) */}
      <div className="city-results-container" style={{ marginTop: 16 }}>
        <div className="section-label">
          <span>
            {searchQuery
              ? `Search Results (${searchResults.length})`
              : 'All Administrative Districts'}
          </span>
        </div>

        <div className="city-results-list">
          {searchResults.length > 0 ? (
            searchResults.map((city) => (
              <div
                key={city.id || city.name}
                className="city-card-item"
                onClick={() => onSelectCity(city)}
              >
                <div className="city-info-group">
                  <div className="city-pin-icon">
                    <MapPin size={17} />
                  </div>
                  <div>
                    <div className="city-name">{city.name}</div>
                    <div className="city-state">
                      <span className="state-pill">{city.state}</span>
                      <span style={{ fontSize: 10.5, color: '#64748b' }}>
                        {city.lat.toFixed(3)}°N, {city.lng.toFixed(3)}°E
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowRight size={15} className="city-action-arrow" />
              </div>
            ))
          ) : (
            <div className="empty-results-box">
              <MapPin size={30} color="#64748b" />
              <h4>No jurisdiction found for "{searchQuery}"</h4>
              <p style={{ fontSize: 12 }}>Check spelling or select a different state filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* 50km Radar Alerts Modal for Primary Hub */}
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


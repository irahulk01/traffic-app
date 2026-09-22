import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  RotateCw,
  Clock,
  MapPin,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Shield,
  Radio,
  Navigation,
  Bell,
  Sun,
  Moon,
  PhoneCall,
  Flame,
} from 'lucide-react';
import GoogleMapView from './GoogleMapView';
import TrafficAlertModal from './TrafficAlertModal';
import { getCityTrafficData } from '../data/trafficEngine';
import { dispatchHeavyTrafficAlert } from '../services/notificationService';
import { POLICE_MONITORED_JURISDICTIONS } from './CitySearchPage';

export default function TrafficMapPage({
  city,
  onSelectCity,
  onBack,
  apiKey,
  theme = 'night',
  onToggleTheme,
}) {
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'heavy' | 'moderate' | 'low' | 'none'
  const [selectedStreet, setSelectedStreet] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [secondsUntilSync, setSecondsUntilSync] = useState(600); // 10 minutes countdown
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  // 1. Fetch live traffic data (cached for 10 minutes)
  const trafficData = useMemo(() => {
    return getCityTrafficData(city, refreshTrigger > 0);
  }, [city, refreshTrigger]);

  const { streets, summary, fetchedAt, nextSyncAt } = trafficData;

  // Active heavy corridors under 50km
  const heavyStreetsUnder50 = useMemo(() => {
    return streets.filter((s) => s.level === 'heavy' && (s.distanceKm ?? 0) <= 50);
  }, [streets]);

  // Push native mobile notification on sync if heavy congestion exists and permission is granted
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      if (heavyStreetsUnder50.length > 0) {
        dispatchHeavyTrafficAlert(heavyStreetsUnder50[0], city.name);
      }
    }
  }, [city.name, refreshTrigger]);

  // 2. 10-Minute Auto-Refresh Countdown Timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const remainingSec = Math.max(0, Math.floor((nextSyncAt - now) / 1000));
      setSecondsUntilSync(remainingSec);

      // Trigger automatic 10-minute refresh when countdown hits 0
      if (remainingSec <= 0) {
        setRefreshTrigger((prev) => prev + 1);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextSyncAt]);

  // Format MM:SS for countdown
  const countdownFormatted = useMemo(() => {
    const m = Math.floor(secondsUntilSync / 60);
    const s = secondsUntilSync % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [secondsUntilSync]);

  // 3. Filter corridors based on severity
  const filteredStreets = useMemo(() => {
    if (activeFilter === 'all') return streets;
    return streets.filter((s) => s.level === activeFilter);
  }, [streets, activeFilter]);

  // Manual refresh button
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="traffic-dashboard-viewport">
      {/* LEFT / PRIMARY TELEMETRY PANEL */}
      <aside className="telemetry-panel">
        {/* Navigation & Status Header */}
        <header className="telemetry-header">
          <div className="telemetry-header-left">
            <button
              type="button"
              className="back-nav-btn"
              onClick={onBack}
              title="Return to City Selection"
            >
              <ArrowLeft size={17} />
            </button>
            <div className="telemetry-title-group">
              <div className="city-title-row">
                <h1 className="city-display-name">{city.name}</h1>
                <span className="radar-perimeter-pill">50 KM RADAR</span>
              </div>
              <div className="city-meta-row">
                <span>{city.state || 'Jharkhand'} Traffic Police</span>
                <span className="meta-separator">•</span>
                <span className="live-feed-text">
                  <span className="pulse-beacon-dot" />
                  Live Feed
                </span>
              </div>
            </div>
          </div>

          <div className="telemetry-header-actions">
            {/* Day / Night Theme Toggle */}
            <button
              type="button"
              className="header-action-btn theme-quick-toggle-btn"
              onClick={onToggleTheme}
              title={theme === 'day' ? 'Switch to Night Command Mode' : 'Switch to Day Patrol Visibility Mode'}
            >
              {theme === 'day' ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            {/* Notification Bell with 50km Alert Counter */}
            <button
              type="button"
              className={`header-action-btn bell-alert-btn ${heavyStreetsUnder50.length > 0 ? 'has-active-alerts' : ''}`}
              onClick={() => setIsAlertModalOpen(true)}
              title="50km Heavy Bottleneck Alerts & Police Dispatch Push"
            >
              <Bell size={16} />
              {heavyStreetsUnder50.length > 0 && (
                <span className="bell-badge-pill">{heavyStreetsUnder50.length}</span>
              )}
            </button>

            {/* 10-Minute Auto-Refresh Countdown Display */}
            <div className="sync-countdown-pill" title="Telemetry auto-refreshes every 10 minutes">
              <Clock size={12} className="countdown-icon" />
              <span>{countdownFormatted}</span>
            </div>

            {/* Manual Sync Trigger */}
            <button
              type="button"
              className="header-action-btn refresh-sync-btn"
              onClick={handleManualRefresh}
              title="Force Live Data Sync"
            >
              <RotateCw
                size={15}
                className={isRefreshing ? 'spin-animation' : ''}
              />
            </button>
          </div>
        </header>

        {/* Quick Division Switcher Strip */}
        <div className="quick-division-strip">
          <span className="division-strip-label">Switch Hub:</span>
          <div className="division-strip-buttons">
            {POLICE_MONITORED_JURISDICTIONS.map((hub) => {
              const isSelected = hub.name.toLowerCase() === city.name.toLowerCase();
              return (
                <button
                  key={hub.name}
                  type="button"
                  className={`division-strip-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectCity && onSelectCity(hub)}
                >
                  <span className={`strip-dot ${hub.statusLevel}`} />
                  <span>{hub.name}</span>
                </button>
              );
            })}
          </div>
        </div>


        {/* Scrollable Telemetry Body */}
        <div className="telemetry-scroll-body">
          {/* Real-Time Jurisdiction Summary Card */}
          <section className="telemetry-summary-card">
            <div className="summary-card-top">
              <div className="congestion-gauge-widget">
                <div
                  className={`gauge-score-capsule score-${
                    summary.congestionScore >= 55
                      ? 'heavy'
                      : summary.congestionScore >= 30
                      ? 'moderate'
                      : 'low'
                  }`}
                >
                  <TrendingUp size={16} />
                  <span>{summary.congestionScore}%</span>
                </div>
                <div className="gauge-text-group">
                  <span className="congestion-status-title">Traffic: {summary.statusLabel}</span>
                  <span className="congestion-sync-meta">
                    Synced at {summary.lastUpdatedTime} • 10m TTL
                  </span>
                </div>
              </div>
            </div>

            <div className="summary-metrics-strip">
              <div className="summary-metric-box">
                <span className="metric-box-val">{summary.avgSpeed} <small>km/h</small></span>
                <span className="metric-box-lbl">Avg Transit Speed</span>
              </div>
              <div className="summary-metric-box">
                <span className="metric-box-val highlight-heavy">{summary.heavyCount}</span>
                <span className="metric-box-lbl">Heavy Bottlenecks</span>
              </div>
              <div className="summary-metric-box">
                <span className="metric-box-val highlight-total">{summary.totalCount}</span>
                <span className="metric-box-lbl">Monitored Roads</span>
              </div>
            </div>
          </section>

          {/* Severity Filter Tabs */}
          <nav className="filter-segmented-bar" aria-label="Filter corridors by severity">
            <button
              type="button"
              className={`filter-segment-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              <span>All Roads</span>
              <span className="segment-count">{summary.totalCount}</span>
            </button>

            <button
              type="button"
              className={`filter-segment-btn filter-heavy ${activeFilter === 'heavy' ? 'active' : ''}`}
              onClick={() => setActiveFilter('heavy')}
            >
              <span className="segment-dot dot-heavy" />
              <span>Heavy</span>
              <span className="segment-count">{summary.heavyCount}</span>
            </button>

            <button
              type="button"
              className={`filter-segment-btn filter-moderate ${activeFilter === 'moderate' ? 'active' : ''}`}
              onClick={() => setActiveFilter('moderate')}
            >
              <span className="segment-dot dot-moderate" />
              <span>Moderate</span>
              <span className="segment-count">{summary.moderateCount}</span>
            </button>

            <button
              type="button"
              className={`filter-segment-btn filter-low ${activeFilter === 'low' ? 'active' : ''}`}
              onClick={() => setActiveFilter('low')}
            >
              <span className="segment-dot dot-low" />
              <span>Smooth</span>
              <span className="segment-count">{summary.lowCount}</span>
            </button>

            <button
              type="button"
              className={`filter-segment-btn filter-none ${activeFilter === 'none' ? 'active' : ''}`}
              onClick={() => setActiveFilter('none')}
            >
              <span className="segment-dot dot-none" />
              <span>Clear</span>
              <span className="segment-count">{summary.noneCount}</span>
            </button>
          </nav>

          {/* Arterial Corridors Feed */}
          <div className="corridor-cards-feed">
            {filteredStreets.length > 0 ? (
              filteredStreets.map((street) => {
                const isSelected = selectedStreet?.id === street.id;
                const speedPercentage = Math.min(100, Math.round((street.speed / street.speedLimit) * 100));

                return (
                  <article
                    key={street.id}
                    className={`corridor-card severity-${street.level} ${isSelected ? 'corridor-selected' : ''}`}
                    onClick={() => setSelectedStreet(street)}
                  >
                    {/* Header Row */}
                    <div className="corridor-card-header">
                      <div className="corridor-name-group">
                        <h3 className="corridor-name">{street.name}</h3>
                        <div className="corridor-landmark-row">
                          <MapPin size={12} className="landmark-pin-icon" />
                          <span>Chowk / Landmark: {street.landmark}</span>
                        </div>
                      </div>

                      <div className={`corridor-badge badge-${street.level}`}>
                        <span className="badge-pulse-dot" />
                        <span>{street.badgeText}</span>
                      </div>
                    </div>

                    {/* Metrics Strip */}
                    <div className="corridor-telemetry-row">
                      <div className="telemetry-cell">
                        <span className="telemetry-label">Crawl Speed</span>
                        <div className="speed-progress-group">
                          <span className="telemetry-value">
                            {street.speed} <small>/{street.speedLimit} km/h</small>
                          </span>
                          <div className="speed-mini-track">
                            <div
                              className={`speed-mini-bar level-${street.level}`}
                              style={{ width: `${speedPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="telemetry-cell">
                        <span className="telemetry-label">Arterial Delay</span>
                        <span className={`telemetry-value delay-metric-${street.level}`}>
                          {street.delay}
                        </span>
                      </div>

                      <div className="telemetry-cell">
                        <span className="telemetry-label">Perimeter Radius</span>
                        <span className="telemetry-value distance-metric">
                          {street.distanceKm ? `${street.distanceKm} km from Hub` : street.length}
                        </span>
                      </div>
                    </div>

                    {/* Police Advisory Capsule */}
                    <div className="police-advisory-capsule">
                      <Shield size={13} className={`advisory-shield-${street.level}`} />
                      <span className="advisory-text">Police Advisory: {street.policeAdvisory}</span>
                    </div>

                    {/* Action Footer */}
                    <div className="corridor-footer-action">
                      <span className="corridor-flow-direction">
                        <Navigation size={12} />
                        <span>Direction: {street.direction}</span>
                      </span>

                      <span className="pinpoint-cta-text">
                        <span>{isSelected ? 'Pinpointed on Map' : 'Pinpoint on Map'}</span>
                        <ChevronRight size={14} className="cta-arrow" />
                      </span>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="corridors-empty-state">
                <AlertTriangle size={28} className="empty-state-icon" />
                <h4>No corridors found under this filter</h4>
                <p>Select "All Roads" to view the full district monitoring grid.</p>
              </div>
            )}
          </div>

          {/* Quick Police & Commuter Emergency Strip */}
          <div className="telemetry-emergency-strip">
            <span className="emergency-strip-heading">Emergency Hotlines:</span>
            <div className="emergency-strip-links">
              <a href="tel:112" className="emergency-link-btn" title="National Emergency Response">
                <span>🚨 112</span>
              </a>
              <a href="tel:1033" className="emergency-link-btn" title="NHAI Highway Helpline">
                <span>🛣️ 1033</span>
              </a>
              <a href="tel:1073" className="emergency-link-btn" title="Traffic Control Room">
                <span>👮 1073</span>
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT / MAP DISPLAY PANEL */}
      <main className="map-display-panel">
        <GoogleMapView
          city={city}
          streets={streets}
          selectedStreet={selectedStreet}
          apiKey={apiKey}
          theme={theme}
        />
      </main>

      {/* 50km Radar Alerts Modal */}
      <TrafficAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        cityName={city.name}
        heavyStreets={heavyStreetsUnder50}
        onSelectStreet={(street) => {
          setSelectedStreet(street);
          setIsAlertModalOpen(false);
        }}
      />
    </div>
  );
}

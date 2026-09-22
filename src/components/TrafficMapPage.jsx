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
  CheckCircle2,
  Navigation,
  Bell,
} from 'lucide-react';
import GoogleMapView from './GoogleMapView';
import TrafficAlertModal from './TrafficAlertModal';
import { getCityTrafficData } from '../data/trafficEngine';
import { dispatchHeavyTrafficAlert } from '../services/notificationService';

export default function TrafficMapPage({
  city,
  onBack,
  apiKey,
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
    <div className="traffic-dashboard-page">
      {/* Official Police Traffic Command Header */}
      <header className="app-header">
        <div className="header-left">
          <button className="header-btn" onClick={onBack} title="Back to Command Hub">
            <ArrowLeft size={18} />
          </button>
          <div className="header-title-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h1>{city.name} Control Grid</h1>
              <span className="police-dispatch-badge">50 KM RADAR</span>
            </div>
            <div className="header-subtitle">
              <span>{city.state}, India</span>
              <span>•</span>
              <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Radio size={10} /> Live 10-Min Feed
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Notification Bell with 50km Heavy Alert Counter */}
          <button
            className={`header-btn notification-bell-btn ${heavyStreetsUnder50.length > 0 ? 'has-alerts' : ''}`}
            onClick={() => setIsAlertModalOpen(true)}
            title="50km Heavy Traffic Alerts & Mobile Notification Push"
          >
            <Bell size={16} />
            {heavyStreetsUnder50.length > 0 && (
              <span className="bell-badge-count">{heavyStreetsUnder50.length}</span>
            )}
          </button>

          {/* 10-Minute Auto-Refresh Countdown Display */}
          <div className="sync-timer-chip" title="Real-time data auto-fetches every 10 minutes">
            <Clock size={11} color="#60a5fa" />
            <span>{countdownFormatted}</span>
          </div>

          <button
            className="header-btn"
            onClick={handleManualRefresh}
            title="Force Live Data Sync"
          >
            <RotateCw
              size={15}
              style={{
                transform: isRefreshing ? 'rotate(360deg)' : 'none',
                transition: 'transform 0.6s ease',
              }}
            />
          </button>
        </div>
      </header>

      {/* TOP 50% OF SCREEN: Interactive Google Map with Live TrafficLayer & 50km Radar Perimeter */}
      <GoogleMapView
        city={city}
        streets={streets}
        selectedStreet={selectedStreet}
        apiKey={apiKey}
      />



      {/* BOTTOM 50% OF SCREEN: Traffic Police Arterial Feed & Controls */}
      <div className="feed-half-container">
        {/* Real-Time Jurisdiction Summary Bar */}
        <div className="traffic-summary-banner">
          <div className="summary-score-group">
            <div
              className={`congestion-gauge-box ${
                summary.congestionScore >= 55
                  ? 'heavy'
                  : summary.congestionScore >= 30
                  ? 'moderate'
                  : 'low'
              }`}
            >
              <TrendingUp size={15} />
              <span>{summary.congestionScore}%</span>
            </div>
            <div className="summary-stats-text">
              <span className="summary-stats-title">{summary.statusLabel}</span>
              <span className="summary-stats-sub">
                Synced at {summary.lastUpdatedTime} • 10m TTL
              </span>
            </div>
          </div>

          <div className="summary-quick-stats">
            <div className="quick-stat-item">
              <span className="quick-stat-val">{summary.avgSpeed} km/h</span>
              <span className="quick-stat-lbl">Avg Transit</span>
            </div>
            <div className="quick-stat-item">
              <span className="quick-stat-val" style={{ color: '#ef4444' }}>
                {summary.heavyCount}
              </span>
              <span className="quick-stat-lbl">Severe</span>
            </div>
          </div>
        </div>

        {/* Severity Filter Tabs (All / Heavy / Moderate / Low / No Traffic) */}
        <div className="filter-tabs-row">
          <button
            className={`filter-tab-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            <span>All Corridors</span>
            <span className="filter-badge-count">{summary.totalCount}</span>
          </button>

          <button
            className={`filter-tab-btn heavy-tab ${
              activeFilter === 'heavy' ? 'active' : ''
            }`}
            onClick={() => setActiveFilter('heavy')}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
            <span>Heavy (Red)</span>
            <span className="filter-badge-count">{summary.heavyCount}</span>
          </button>

          <button
            className={`filter-tab-btn moderate-tab ${
              activeFilter === 'moderate' ? 'active' : ''
            }`}
            onClick={() => setActiveFilter('moderate')}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f97316' }} />
            <span>Moderate (Orange)</span>
            <span className="filter-badge-count">{summary.moderateCount}</span>
          </button>

          <button
            className={`filter-tab-btn low-tab ${
              activeFilter === 'low' ? 'active' : ''
            }`}
            onClick={() => setActiveFilter('low')}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
            <span>Low (Green)</span>
            <span className="filter-badge-count">{summary.lowCount}</span>
          </button>

          {/* Explicit 'No Traffic' Filter as Requested */}
          <button
            className={`filter-tab-btn none-tab ${
              activeFilter === 'none' ? 'active' : ''
            }`}
            onClick={() => setActiveFilter('none')}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#94a3b8' }} />
            <span>No Traffic (Clear)</span>
            <span className="filter-badge-count">{summary.noneCount}</span>
          </button>
        </div>

        {/* Scrollable Street Cards Feed */}
        <div className="street-cards-scroll">
          {filteredStreets.length > 0 ? (
            filteredStreets.map((street) => {
              const isSelected = selectedStreet?.id === street.id;

              return (
                <div
                  key={street.id}
                  className={`street-card ${street.cardClass} ${
                    isSelected ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedStreet(street)}
                >
                  {/* Street Name & Status Badge */}
                  <div className="street-header-row">
                    <div className="street-name-box">
                      <div className="street-name">{street.name}</div>
                      <div className="street-landmark">
                        <MapPin size={11} color="#64748b" />
                        <span>{street.landmark}</span>
                      </div>
                    </div>

                    <div className={`traffic-pill ${street.cardClass}`}>
                      <div className="traffic-pill-dot" />
                      <span>{street.badgeText}</span>
                    </div>
                  </div>

                  {/* Traffic Metrics: Speed vs Limit, Delay, Stretch */}
                  <div className="street-metrics-grid">
                    <div className="metric-cell">
                      <span className="metric-lbl">Speed / Limit</span>
                      <span className="metric-val">
                        {street.speed} / {street.speedLimit} km/h
                      </span>
                    </div>

                    <div className="metric-cell">
                      <span className="metric-lbl">Congestion Delay</span>
                      <span
                        className={`metric-val ${
                          street.level === 'heavy'
                            ? 'delay-alert'
                            : street.level === 'moderate'
                            ? 'moderate-alert'
                            : street.level === 'none'
                            ? 'no-traffic-val'
                            : ''
                        }`}
                      >
                        {street.delay}
                      </span>
                    </div>

                    <div className="metric-cell">
                      <span className="metric-lbl">Distance / Stretch</span>
                      <span className="metric-val">
                        {street.distanceKm ? `${street.distanceKm} km away` : street.length}
                      </span>
                    </div>
                  </div>

                  {/* Traffic Police Dispatch Advisory Banner */}
                  <div className="police-advisory-box">
                    <Shield size={12} color={street.color} />
                    <span>{street.policeAdvisory}</span>
                  </div>

                  {/* Street Footer / Action */}
                  <div className="street-footer-row">
                    <span className="corridor-direction">
                      <Navigation size={11} />
                      {street.direction}
                    </span>
                    <span className="view-on-map-cta">
                      <span>{isSelected ? 'Pinpoint on Map' : 'Locate on Map'}</span>
                      <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-results-box">
              <AlertTriangle size={24} color="#64748b" />
              <h4>No corridors matching this filter</h4>
              <p style={{ fontSize: 12 }}>
                Select "All Corridors" to view full arterial police monitoring grid.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 50km Heavy Traffic Alerts & PWA Push Modal */}
      <TrafficAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        cityName={city.name}
        heavyStreets={heavyStreetsUnder50}
        onSelectStreet={(street) => setSelectedStreet(street)}
      />
    </div>
  );
}


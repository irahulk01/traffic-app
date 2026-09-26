import React from 'react';
import { ArrowLeft, RotateCw, Navigation, Sun, Moon } from 'lucide-react';
import NotificationBell from '../common/NotificationBell';

export default function TelemetryHeader({
  city,
  onBack,
  alertCount,
  onOpenAlerts,
  isRefreshing,
  onManualRefresh,
  // GPS-resolved locality (from reverse geocoding of the blue dot)
  gpsLocality = null,
  theme,
  onToggleTheme,
}) {
  // If GPS locality is resolved and different from the selected city, show it as
  // "📍 You are in [locality]" below the selected city name
  const showGpsLocality =
    gpsLocality &&
    gpsLocality.locality &&
    gpsLocality.locality.toLowerCase() !== (city?.name || '').toLowerCase();

  return (
    <header className="telemetry-header">
      <div className="telemetry-header-left">
        <button
          type="button"
          className="back-nav-btn"
          onClick={onBack}
          title="Return to City Selection"
          aria-label="Return to City Selection"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="telemetry-title-group">
          <h1 className="city-display-name" title="Hazaribagh Traffic Monitor">
            HAZARIBAGH TRAFFIC MONITOR
          </h1>
          <div className="city-meta-row">
            <span className="city-state-text" style={{ color: '#ef4444', fontWeight: 'bold' }}>LIVE</span>
            <span style={{ marginLeft: 8, color: '#94a3b8' }}>Google Traffic</span>
          </div>
        </div>
      </div>

      <div className="telemetry-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Theme Toggle */}
        {onToggleTheme && (
          <button
            type="button"
            className="header-action-btn"
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'day' ? 'Dark' : 'Light'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'day' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        )}

        {/* Manual Reload Trigger */}
        {onManualRefresh && (
          <button
            type="button"
            className="header-action-btn refresh-sync-btn"
            onClick={onManualRefresh}
            title="Reload traffic data"
            aria-label="Reload traffic data"
          >
            <RotateCw
              size={16}
              className={isRefreshing ? 'spin-animation' : ''}
            />
          </button>
        )}

        {/* Notification Bell with Alert Counter */}
        <NotificationBell
          alertCount={alertCount}
          onClick={onOpenAlerts}
          className="bell-alert-btn"
        />
      </div>
    </header>
  );
}

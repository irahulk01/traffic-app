import React from 'react';
import { ArrowLeft, RotateCw, Navigation } from 'lucide-react';
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
          <h1 className="city-display-name" title={city.name}>
            {city.name}
          </h1>

          {/* State label */}
          {city.state && (
            <div className="city-meta-row">
              <span className="city-state-text">{city.state}</span>
            </div>
          )}

          {/* GPS blue-dot locality — shown when resolved & different from selected city */}
          {showGpsLocality && (
            <div
              className="city-meta-row gps-locality-row"
              title={gpsLocality.fullAddress || gpsLocality.locality}
            >
              <Navigation size={10} style={{ color: '#2563eb', flexShrink: 0 }} />
              <span className="gps-locality-label">
                You are in {gpsLocality.sublocality
                  ? `${gpsLocality.sublocality}, `
                  : ''}
                {gpsLocality.locality}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="telemetry-header-actions">
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

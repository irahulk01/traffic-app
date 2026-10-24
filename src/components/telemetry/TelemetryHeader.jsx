import React from 'react';
import { ArrowLeft, RotateCw, Sun, Moon } from 'lucide-react';
import NotificationBell from '../common/NotificationBell';

export default function TelemetryHeader({ city, onBack, alertCount, onOpenAlerts, isRefreshing, onManualRefresh, gpsLocality = null, theme, onToggleTheme, dataState = 'loading', totalRoutes, availableRoutes }) {
  const label = ({ loading: 'Loading', fresh: 'Updated', partial: 'Partial data', stale: 'Stale data', unavailable: 'Unavailable' })[dataState] || 'Data status';
  const locality = gpsLocality?.locality && gpsLocality.locality.toLowerCase() !== (city?.name || '').toLowerCase() ? gpsLocality.locality : null;
  return (
    <header className="telemetry-header">
      <div className="telemetry-header-left">
        <button type="button" className="back-nav-btn" onClick={onBack} aria-label="Back to monitoring areas" title="Back to monitoring areas"><ArrowLeft size={18} /></button>
        <div className="telemetry-title-group">
          <h1 className="city-display-name">{city?.name || 'Traffic monitor'}</h1>
          <div className="city-meta-row"><span className="telemetry-source-dot" /> Google Routes <span className={`data-state-pill state-${dataState}`}>{label}</span></div>
          <div className="telemetry-coverage-line">{availableRoutes ?? '—'} of {totalRoutes ?? '—'} monitored routes checked{locality ? ` · You are near ${locality}` : ''}</div>
        </div>
      </div>
      <div className="telemetry-header-actions">
        {onManualRefresh && <button type="button" className="header-action-btn" onClick={onManualRefresh} disabled={Boolean(isRefreshing)} aria-label="Refresh traffic data" title="Refresh traffic data"><RotateCw size={16} className={isRefreshing ? 'spin-animation' : ''} /></button>}
        {onToggleTheme && <button type="button" className="header-action-btn" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'day' ? 'night' : 'day'} theme`} title={`Switch to ${theme === 'day' ? 'Night' : 'Day'} mode`}>{theme === 'day' ? <Moon size={16} /> : <Sun size={16} />}</button>}
        <NotificationBell alertCount={alertCount} onClick={onOpenAlerts} className="bell-alert-btn" />
      </div>
    </header>
  );
}

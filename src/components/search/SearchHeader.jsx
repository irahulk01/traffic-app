import React from 'react';
import { Layers } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';
import NotificationBell from '../common/NotificationBell';

export default function SearchHeader({ theme, onToggleTheme, alertCount, onOpenAlerts }) {
  return (
    <header className="brand-header-bar">
      <div className="brand-logo-group">
        <div className="brand-icon-box traffic-layer-icon-box">
          <Layers size={22} className="traffic-logo-icon" />
          <span className="logo-status-dot" />
        </div>
        <div className="brand-title-group">
          <div className="brand-name-row">
            <span className="brand-name">Traffic Monitoring</span>
            <span className="brand-badge-pill">LIVE</span>
          </div>
          <span className="brand-tagline">Real-Time Traffic Layers & Telemetry</span>
        </div>
      </div>

      <div className="header-actions-group">
        <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
        <NotificationBell alertCount={alertCount} onClick={onOpenAlerts} />
      </div>
    </header>
  );
}

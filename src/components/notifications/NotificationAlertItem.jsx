import React from 'react';
import { MapPin, ShieldAlert, Navigation, ChevronRight } from 'lucide-react';

export default function NotificationAlertItem({ street, onLocate }) {
  return (
    <div className="notif-alert-item">
      <div className="notif-item-top">
        <div className="notif-severity-badge">
          <span className="badge-pulse-dot" />
          <span>CRITICAL CHOKE POINT</span>
        </div>
        <span className="notif-time-tag">
          {street.formattedTime ? `${street.formattedTime} • 24h Alert` : 'Active • 24h Window'}
        </span>
      </div>

      <h4 className="notif-corridor-name">{street.name}</h4>

      {street.landmark && (
        <div className="notif-landmark-line">
          <MapPin size={12} />
          <span>Chowk / Landmark: {street.landmark}</span>
        </div>
      )}

      <div className="notif-stats-grid">
        <div className="notif-stat-box highlight">
          <span className="stat-lbl">Delay Impact</span>
          <span className="stat-val red">{street.delay}</span>
        </div>
        <div className="notif-stat-box">
          <span className="stat-lbl">Crawl Speed</span>
          <span className="stat-val">{street.speed} km/h</span>
        </div>
        <div className="notif-stat-box">
          <span className="stat-lbl">Speed Limit</span>
          <span className="stat-val muted">{street.speedLimit} km/h</span>
        </div>
      </div>

      {(street.trafficAdvisory || street.advisory) && (
        <div className="notif-advisory-callout">
          <ShieldAlert size={13} className="advisory-callout-icon" />
          <span>{street.trafficAdvisory || street.advisory}</span>
        </div>
      )}

      <button
        type="button"
        className="notif-locate-action"
        onClick={() => onLocate && onLocate(street)}
      >
        <Navigation size={13} />
        <span>Pinpoint Corridor on Map</span>
        <ChevronRight size={13} style={{ marginLeft: 'auto' }} />
      </button>
    </div>
  );
}

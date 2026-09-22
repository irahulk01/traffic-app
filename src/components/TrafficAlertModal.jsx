import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  AlertTriangle,
  MapPin,
  Clock,
  Shield,
  Radio,
  CheckCircle2,
  Send,
  Navigation,
  Sparkles,
} from 'lucide-react';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendMobileTrafficPush,
} from '../services/notificationService';

export default function TrafficAlertModal({
  isOpen,
  onClose,
  cityName = 'Selected Area',
  heavyStreets = [],
  onSelectStreet,
}) {
  const [permission, setPermission] = useState('default');
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
      setTestSent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEnablePush = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      sendMobileTrafficPush({
        title: '🟢 GatiLive 50km Traffic Radar Active',
        body: `You will receive live mobile notifications for heavy traffic bottlenecks within 50km of ${cityName}.`,
        tag: 'gatilive-welcome',
      });
      setTestSent(true);
      setTimeout(() => setTestSent(false), 4000);
    }
  };

  const handleSendTestPush = async () => {
    const firstHeavy = heavyStreets[0];
    const title = firstHeavy
      ? `🚨 Heavy Traffic: ${firstHeavy.name} (${firstHeavy.distanceKm} km away)`
      : `🚨 Test Alert: 50km Traffic Radar Active for ${cityName}`;
    const body = firstHeavy
      ? `${firstHeavy.delay} • Crawl speed: ${firstHeavy.speed} km/h • ${firstHeavy.policeAdvisory}`
      : `All clear within 50km radius. Test notification sent successfully to mobile panel.`;

    const success = await sendMobileTrafficPush({
      title,
      body,
      tag: 'test-heavy-alert',
    });

    if (success) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 4000);
    }
  };

  const handleLocateStreet = (street) => {
    if (onSelectStreet) {
      onSelectStreet(street);
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content-sheet radar-alert-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-title-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="radar-bell-box">
              <Bell size={18} color="#ef4444" />
              <div className="radar-ping-indicator" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  50 km Traffic Radar Alerts
                </h3>
                <span className="radius-tag-badge">50 KM RADIUS</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                Active bottlenecks under 50km of {cityName}
              </p>
            </div>
          </div>
          <button className="clear-search-btn" onClick={onClose} title="Close Alerts">
            <X size={16} />
          </button>
        </div>

        {/* PWA Mobile Notification Controls */}
        <div className="pwa-push-card">
          <div className="pwa-push-left">
            <Radio size={16} color={permission === 'granted' ? '#22c55e' : '#60a5fa'} />
            <div>
              <div className="pwa-push-title">
                Mobile Notification Panel
                {permission === 'granted' ? (
                  <span className="pwa-badge active">PWA ACTIVE</span>
                ) : (
                  <span className="pwa-badge inactive">TAP TO ENABLE</span>
                )}
              </div>
              <div className="pwa-push-desc">
                {permission === 'granted'
                  ? 'Push enabled: Severe bottlenecks under 50km will alert your notification tray.'
                  : 'Enable PWA mobile alerts to receive notifications in your phone panel.'}
              </div>
            </div>
          </div>

          <div className="pwa-push-actions">
            {permission !== 'granted' ? (
              <button className="pwa-enable-btn" onClick={handleEnablePush}>
                <Bell size={13} />
                <span>Enable Alerts</span>
              </button>
            ) : (
              <button
                className="pwa-test-btn"
                onClick={handleSendTestPush}
                title="Send a sample notification to your device notification tray"
              >
                <Send size={13} />
                <span>{testSent ? 'Alert Dispatched!' : 'Send Test Mobile Push'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Heavy Traffic List under 50km */}
        <div className="radar-alerts-list">
          {heavyStreets.length > 0 ? (
            heavyStreets.map((street) => (
              <div key={street.id || street.name} className="radar-alert-card">
                <div className="radar-card-top">
                  <div className="radar-badge-group">
                    <span className="heavy-danger-badge">
                      <AlertTriangle size={11} />
                      HEAVY BOTTLENECK
                    </span>
                    <span className="corridor-dist-badge">
                      <MapPin size={10} />
                      {street.distanceKm ? `${street.distanceKm} km away` : '< 50 km'}
                    </span>
                  </div>
                  <span className="radar-delay-tag">{street.delay}</span>
                </div>

                <div className="radar-road-name">{street.name}</div>

                {street.landmark && (
                  <div className="radar-landmark-text">
                    <MapPin size={11} color="#60a5fa" />
                    <span>{street.landmark}</span>
                  </div>
                )}

                <div className="radar-metrics-row">
                  <div className="metric-chip">
                    <span className="label">Current Crawl</span>
                    <span className="val danger">{street.speed} km/h</span>
                  </div>
                  <div className="metric-chip">
                    <span className="label">Speed Limit</span>
                    <span className="val">{street.speedLimit} km/h</span>
                  </div>
                  <div className="metric-chip">
                    <span className="label">ETA Impact</span>
                    <span className="val warning">+{street.delayMinutes} min delay</span>
                  </div>
                </div>

                {street.policeAdvisory && (
                  <div className="radar-advisory-box">
                    <Shield size={12} color="#3b82f6" />
                    <span>{street.policeAdvisory}</span>
                  </div>
                )}

                <button
                  className="radar-locate-btn"
                  onClick={() => handleLocateStreet(street)}
                >
                  <Navigation size={13} />
                  <span>Locate Corridor on Map</span>
                </button>
              </div>
            ))
          ) : (
            <div className="radar-empty-state">
              <div className="radar-all-clear-circle">
                <CheckCircle2 size={32} color="#22c55e" />
              </div>
              <h4>All Clear Within 50 km</h4>
              <p>
                No heavy bottlenecks or critical congestion reported within the 50km radius zone around {cityName}.
              </p>
              <div className="clean-radius-note">
                <Sparkles size={13} color="#22c55e" />
                <span>Radius monitoring active • Auto-checks every 10 mins</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="radar-sheet-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Radio size={11} color="#22c55e" />
            <span>50 km Surveillance Grid • Real-Time Google Traffic Filter</span>
          </div>
          <button className="radar-close-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

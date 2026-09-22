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
  cityName = 'Selected Division',
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
        title: '🚨 GatiLive: 50km Traffic Radar Active',
        body: `You will receive instant mobile alerts for heavy choke points within 50km of ${cityName} Division.`,
        tag: 'gatilive-welcome',
      });
      setTestSent(true);
      setTimeout(() => setTestSent(false), 4000);
    }
  };

  const handleSendTestPush = async () => {
    const firstHeavy = heavyStreets[0];
    const title = firstHeavy
      ? `🚨 Traffic Alert: ${firstHeavy.name} (${firstHeavy.distanceKm ? `${firstHeavy.distanceKm} km away` : 'Within 50km'})`
      : `🟢 50km All Clear: ${cityName} Division`;
    const body = firstHeavy
      ? `${firstHeavy.delay} • Crawl speed: ${firstHeavy.speed} km/h • ${firstHeavy.policeAdvisory}`
      : `All arterial corridors within 50km radius are flowing normally. Test alert received successfully.`;

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
              <Shield size={18} color="#ef4444" />
              <div className="radar-ping-indicator" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  50 km Radar & Choke Point Alerts
                </h3>
                <span className="radius-tag-badge">50 KM RADAR</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                Active heavy bottlenecks within 50 km of {cityName} Division
              </p>
            </div>
          </div>
          <button className="clear-search-btn" onClick={onClose} title="Close Alerts">
            <X size={16} />
          </button>
        </div>

        {/* Police Mobile Notification Controls */}
        <div className="pwa-push-card">
          <div className="pwa-push-left">
            <Radio size={16} color={permission === 'granted' ? '#22c55e' : '#38bdf8'} />
            <div>
              <div className="pwa-push-title">
                Mobile Notification Push Alerts
                {permission === 'granted' ? (
                  <span className="pwa-badge active">PUSH ACTIVE</span>
                ) : (
                  <span className="pwa-badge inactive">TAP TO ENABLE</span>
                )}
              </div>
              <div className="pwa-push-desc">
                {permission === 'granted'
                  ? 'Active: Critical choke points within 50 km will dispatch notifications straight to your phone tray.'
                  : 'Enable mobile notifications to receive immediate alerts on your device for road slowdowns.'}
              </div>
            </div>
          </div>

          <div className="pwa-push-actions">
            {permission !== 'granted' ? (
              <button className="pwa-enable-btn" onClick={handleEnablePush}>
                <Bell size={13} />
                <span>Enable Mobile Alerts</span>
              </button>
            ) : (
              <button
                className="pwa-test-btn"
                onClick={handleSendTestPush}
                title="Send a sample notification to your device notification tray"
              >
                <Send size={13} />
                <span>{testSent ? 'Alert Dispatched!' : 'Send Test Notification'}</span>
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
                      CRITICAL CHOKE POINT
                    </span>
                    <span className="corridor-dist-badge">
                      <MapPin size={10} />
                      {street.distanceKm ? `${street.distanceKm} km from Hub` : '< 50 km'}
                    </span>
                  </div>
                  <span className="radar-delay-tag">{street.delay}</span>
                </div>

                <div className="radar-road-name">{street.name}</div>

                {street.landmark && (
                  <div className="radar-landmark-text">
                    <MapPin size={11} color="#38bdf8" />
                    <span>Chowk / Landmark: {street.landmark}</span>
                  </div>
                )}

                <div className="radar-metrics-row">
                  <div className="metric-chip">
                    <span className="label">Crawl Speed</span>
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
                    <Shield size={12} color="#38bdf8" />
                    <span>Police Advisory: {street.policeAdvisory}</span>
                  </div>
                )}

                <button
                  className="radar-locate-btn"
                  onClick={() => handleLocateStreet(street)}
                >
                  <Navigation size={13} />
                  <span>Pinpoint Corridor on Map</span>
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
                No heavy choke points or critical gridlocks reported within the 50 km jurisdiction radius around {cityName} Division.
              </p>
              <div className="clean-radius-note">
                <Sparkles size={13} color="#22c55e" />
                <span>Surveillance active • 10-minute auto telemetry check</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="radar-sheet-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Radio size={11} color="#22c55e" />
            <span>50 km Police Radar Grid • Real-Time Highway Feed</span>
          </div>
          <button className="radar-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

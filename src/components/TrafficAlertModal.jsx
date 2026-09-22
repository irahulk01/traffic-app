import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  Activity,
  Sliders,
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import {
  closeNotificationDrawer,
  setPermission,
  addDispatchedAlert,
  triggerSuddenAlert,
} from '../store/notificationsSlice';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendMobileTrafficPush,
} from '../services/notificationService';
import {
  generateSuddenTrafficAlert,
  playAlertChime,
} from '../services/trafficAlertEngine';
import NotificationAlertItem from './notifications/NotificationAlertItem';
import NotificationPushSettings from './notifications/NotificationPushSettings';

export default function TrafficAlertModal({
  isOpen: propIsOpen,
  onClose: propOnClose,
  cityName: propCityName,
  heavyStreets: propHeavyStreets,
  onSelectStreet,
}) {
  const dispatch = useDispatch();
  const reduxIsOpen = useSelector((state) => state.notifications.isOpen);
  const reduxPermission = useSelector((state) => state.notifications.permission);
  const reduxActiveAlerts = useSelector((state) => state.notifications.activeAlerts);
  const reduxIpLocation = useSelector((state) => state.notifications.ipLocation);

  const isOpen = propIsOpen !== undefined ? propIsOpen : reduxIsOpen;
  const heavyStreets = propHeavyStreets !== undefined ? propHeavyStreets : reduxActiveAlerts;
  const cityName = propCityName || reduxIpLocation?.city || 'Your Area';

  const [testSent, setTestSent] = useState(false);
  const [activeTab, setActiveTab] = useState('alerts'); // 'alerts' | 'settings'

  useEffect(() => {
    if (isOpen) {
      const currentPerm = getNotificationPermission();
      dispatch(setPermission(currentPerm));
      setTestSent(false);
      setActiveTab('alerts');
    }
  }, [isOpen, dispatch]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    }
    dispatch(closeNotificationDrawer());
  };

  const handleEnablePush = async () => {
    const res = await requestNotificationPermission();
    dispatch(setPermission(res));
    if (res === 'granted') {
      const payload = {
        title: '🚨 Traffic Monitoring Active',
        body: `Instant notifications enabled for real-time heavy traffic in ${cityName}.`,
        tag: 'traffic-monitoring-welcome',
      };
      sendMobileTrafficPush(payload);
      dispatch(addDispatchedAlert(payload));
      setTestSent(true);
      setTimeout(() => setTestSent(false), 4000);
    }
  };

  const handleSendTestPush = async () => {
    const firstHeavy = heavyStreets[0];
    const title = firstHeavy
      ? `🚨 Choke Point Alert: ${firstHeavy.name}`
      : `🟢 All Clear in ${cityName}`;
    const body = firstHeavy
      ? `${firstHeavy.delay} • Speed: ${firstHeavy.speed} km/h • ${firstHeavy.trafficAdvisory || firstHeavy.advisory}`
      : `Arterial corridors are flowing normally without delay.`;

    const payload = {
      title,
      body,
      tag: 'test-heavy-alert',
    };

    const success = await sendMobileTrafficPush(payload);
    if (success) {
      dispatch(addDispatchedAlert(payload));
      setTestSent(true);
      setTimeout(() => setTestSent(false), 4000);
    }
  };

  const handleLocateStreet = (street) => {
    if (onSelectStreet) {
      onSelectStreet(street);
    }
    handleClose();
  };

  return (
    <div className="notification-panel-backdrop" onClick={handleClose}>
      <div
        className="notification-panel-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Traffic Notifications & Alerts"
      >
        {/* Top Header */}
        <div className="notif-panel-header">
          <div className="notif-header-left">
            <div className="notif-bell-avatar">
              <Bell size={18} />
              {heavyStreets.length > 0 && <span className="notif-pulse-dot" />}
            </div>
            <div>
              <div className="notif-title-row">
                <h3 className="notif-main-title">Notifications & Alerts</h3>
                {heavyStreets.length > 0 ? (
                  <span className="notif-count-chip">{heavyStreets.length} Active</span>
                ) : (
                  <span className="notif-count-chip clear">0 Active</span>
                )}
              </div>
              <p className="notif-subtext">
                Live heavy disruptions in {cityName} • Retained for 24h
              </p>
            </div>
          </div>
          <button
            type="button"
            className="notif-close-btn"
            onClick={handleClose}
            title="Close notifications"
            aria-label="Close notifications"
          >
            <X size={17} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="notif-tab-bar">
          <button
            type="button"
            className={`notif-tab-item ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <Activity size={14} />
            <span>Active Alerts ({heavyStreets.length})</span>
          </button>
          <button
            type="button"
            className={`notif-tab-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Sliders size={14} />
            <span>Push Notification Settings</span>
          </button>
        </div>

        {/* Tab Content: Alerts Feed */}
        {activeTab === 'alerts' && (
          <div className="notif-feed-container">
            {/* Quick Push Banner if not granted */}
            {reduxPermission !== 'granted' && (
              <div className="notif-banner-strip">
                <div className="notif-banner-info">
                  <Bell size={14} className="banner-bell-icon" />
                  <span>Get alerted on heavy choke points & gridlocks</span>
                </div>
                <button
                  type="button"
                  className="notif-banner-action-btn"
                  onClick={handleEnablePush}
                >
                  Turn On
                </button>
              </div>
            )}

            {heavyStreets.length > 0 ? (
              <div className="notif-cards-list">
                {heavyStreets.map((street, idx) => (
                  <NotificationAlertItem
                    key={street.id || street.name || idx}
                    street={street}
                    onLocate={handleLocateStreet}
                  />
                ))}
              </div>
            ) : (
              <div className="notif-empty-state">
                <div className="notif-empty-icon-wrap">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="notif-empty-title">No Heavy Traffic</h4>
                <p className="notif-empty-desc">
                  No heavy traffic disruptions currently detected in {cityName}. Notifications trigger if and only if real-time heavy traffic occurs in your IP location, and stay active for 24 hours.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Push Notification Settings */}
        {activeTab === 'settings' && (
          <NotificationPushSettings
            permission={reduxPermission}
            testSent={testSent}
            onEnablePush={handleEnablePush}
            onSendTestPush={handleSendTestPush}
            onTriggerPopupAlert={() => {
              const alert = generateSuddenTrafficAlert();
              playAlertChime();
              dispatch(triggerSuddenAlert(alert));
              handleClose();
            }}
          />
        )}

        {/* Footer */}
        <div className="notif-panel-footer">
          <div className="footer-live-status">
            <span className="live-dot-pulse" />
            <span>Live Arterial Feed • Redux State Managed</span>
          </div>
          <button type="button" className="notif-dismiss-btn" onClick={handleClose}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

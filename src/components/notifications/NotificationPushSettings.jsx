import React from 'react';
import { Radio, Check, Bell, Send, Layers, AlertTriangle } from 'lucide-react';

export default function NotificationPushSettings({
  permission,
  testSent,
  onEnablePush,
  onSendTestPush,
  onTriggerPopupAlert,
}) {
  return (
    <div className="notif-settings-container">
      <div className="notif-setting-card">
        <div className="notif-setting-header">
          <div className="notif-setting-icon-box">
            <Radio size={20} />
          </div>
          <div className="notif-setting-details">
            <h4 className="setting-title">Mobile Push Notifications</h4>
            <p className="setting-desc">
              Receive instant alerts on your iPhone / mobile phone whenever sudden high traffic or road choke points occur.
            </p>
          </div>
        </div>

        <div className="notif-setting-status-row">
          <span className="status-label">Status:</span>
          {permission === 'granted' ? (
            <span className="permission-chip granted">
              <Check size={11} />
              <span>Enabled</span>
            </span>
          ) : permission === 'denied' ? (
            <span className="permission-chip denied">Blocked in Browser</span>
          ) : (
            <span className="permission-chip default">Not Configured</span>
          )}
        </div>

        <div className="notif-setting-actions">
          {permission !== 'granted' ? (
            <button
              type="button"
              className="notif-primary-btn"
              onClick={onEnablePush}
            >
              <Bell size={14} />
              <span>Enable iPhone Notifications</span>
            </button>
          ) : (
            <button
              type="button"
              className="notif-test-btn"
              onClick={onSendTestPush}
            >
              <Send size={13} />
              <span>{testSent ? 'Test Alert Dispatched!' : 'Send Test Notification'}</span>
            </button>
          )}

          {onTriggerPopupAlert && (
            <button
              type="button"
              className="notif-test-btn"
              onClick={onTriggerPopupAlert}
              style={{ marginTop: '8px' }}
            >
              <AlertTriangle size={13} />
              <span>Trigger Sudden Traffic Pop-up Now</span>
            </button>
          )}
        </div>
      </div>

      <div className="notif-info-box">
        <div className="info-title">
          <Layers size={14} />
          <span>Local City Alerts</span>
        </div>
        <p className="info-text">
          Alerts pop up automatically when localized traffic spikes occur across city chowks and arterial corridors.
        </p>
      </div>
    </div>
  );
}

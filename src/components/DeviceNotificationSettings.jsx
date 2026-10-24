import { useState } from 'react';
import { BellRing, BellOff } from 'lucide-react';
import { notificationSupport, enableDeviceNotifications, disableDeviceNotifications, sendMobileTrafficPush } from '../services/notificationService';

export default function DeviceNotificationSettings() {
  const [support, setSupport] = useState(notificationSupport);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const test = async () => {
    setBusy(true);
    const sent = await sendMobileTrafficPush({ title: 'GatiLive alerts are ready', body: 'Test notification. New heavy traffic on monitored Hazaribagh roads can appear here while the app is open.', tag: 'gatilive-test' });
    setMessage(sent ? 'Test sent. Check Notification Center; your Focus and notification settings control how it appears.' : 'The test could not be sent. Check notification permission in your device settings.');
    setBusy(false);
  };
  const enable = async () => {
    setBusy(true);
    const result = await enableDeviceNotifications();
    setSupport(notificationSupport());
    setBusy(false);
    setMessage(result === 'granted' ? 'Device alerts enabled. Use Send test to check Notification Center.' : result === 'denied' ? 'Notifications are blocked. Allow GatiLive notifications in your device or browser settings.' : 'Notifications could not be enabled on this device.');
  };
  const disable = async () => { setBusy(true); await disableDeviceNotifications(); setSupport(notificationSupport()); setBusy(false); setMessage('Device alerts are off.'); };
  return <section className="device-alert-settings" aria-labelledby="device-alert-heading">
    <h3 id="device-alert-heading"><BellRing size={17} />Notification Center</h3>
    {support.needsInstall ? <p>On iPhone, open this site in Safari, tap Share → Add to Home Screen, then open GatiLive from its icon to enable device notifications.</p> : !support.supported ? <p>Device notifications are unavailable in this browser. Open GatiLive in Safari or another supported browser.</p> : <><p>Get a device alert when a monitored road changes to heavy traffic while GatiLive is open. Existing jams and older observations won’t repeatedly notify you.</p><div className="device-alert-actions">{support.enabled ? <><button type="button" onClick={test} disabled={busy}>Send test notification</button><button type="button" onClick={disable} disabled={busy}><BellOff size={14} />Turn off</button></> : <button type="button" onClick={enable} disabled={busy || support.permission === 'denied'}>{support.permission === 'denied' ? 'Blocked in device settings' : busy ? 'Enabling…' : 'Enable device alerts'}</button>}</div></>}
    <p className="device-alert-scope">Closed-app traffic alerts are not enabled. Monitoring pauses when the app is hidden.</p>
    {message && <p className="device-alert-message" role="status">{message}</p>}
  </section>;
}

// Device notifications are opt-in and never request permission from a timer.
let registrationPromise;
const ENABLED_KEY = 'gatilive-device-alerts-v1';
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return null;
  if (!registrationPromise) registrationPromise = navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => { registrationPromise = null; return null; });
  return registrationPromise;
}
export function getNotificationPermission() {
  return 'Notification' in window ? Notification.permission : 'unsupported';
}
export function deviceNotificationsEnabled() {
  try { return localStorage.getItem(ENABLED_KEY) === 'true' && getNotificationPermission() === 'granted'; } catch { return false; }
}
export function notificationSupport() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  return { needsInstall: ios && !installed, supported: window.isSecureContext && 'Notification' in window && 'serviceWorker' in navigator, permission: getNotificationPermission(), enabled: deviceNotificationsEnabled() };
}
export async function requestNotificationPermission() {
  if (!notificationSupport().supported || notificationSupport().needsInstall) return 'unsupported';
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}
export async function enableDeviceNotifications() {
  // This call must start directly from the Enable button's click handler.
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return permission;
  const registration = await registerServiceWorker();
  if (!registration) return 'unavailable';
  try { localStorage.setItem(ENABLED_KEY, 'true'); } catch { return 'unavailable'; }
  return 'granted';
}
export async function disableDeviceNotifications() {
  try { localStorage.removeItem(ENABLED_KEY); } catch { /* Preference storage can be unavailable. */ }
  const registration = await navigator.serviceWorker?.getRegistration();
  const notifications = await registration?.getNotifications?.();
  notifications?.forEach(notification => notification.close());
}
export async function sendMobileTrafficPush({ title = 'GatiLive traffic update', body = 'Heavy traffic reported on a monitored road.', tag = 'gatilive-traffic', data = {} } = {}) {
  if (!deviceNotificationsEnabled()) return false;
  const registration = await registerServiceWorker();
  if (!registration) return false;
  let timeout;
  try {
    // Avoid hanging on serviceWorker.ready if registration or activation fails.
    await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Notification worker unavailable')), 5000); })]);
    await registration.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/badge-96.png', tag, data: { ...data, url: '/traffic-map' } });
    return true;
  } catch { return false; } finally { clearTimeout(timeout); }
}
export async function dispatchHeavyTrafficAlert(street) {
  return sendMobileTrafficPush({ title: 'Heavy traffic in Hazaribagh', body: `${street.name || street.routeName} · Heavy traffic reported on a monitored section.`, tag: `gatilive-heavy-${street.routeId || street.id}` });
}

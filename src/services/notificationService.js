// GatiLive PWA Mobile Notification & Push Service

let swRegistration = null;

/**
 * Register Service Worker on application load
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker is not supported in this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    swRegistration = registration;
    console.log('GatiLive Service Worker registered successfully:', registration.scope);
    return registration;
  } catch (error) {
    console.warn('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Get the current notification permission state: 'default' | 'granted' | 'denied'
 */
export function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Push native notification directly to Mobile Notification Tray
 */
export async function sendMobileTrafficPush({
  title = '🚨 GatiLive 50km Heavy Traffic Alert',
  body = 'Heavy congestion reported in your 50km radius zone.',
  tag = 'gatilive-alert',
  data = {},
} = {}) {
  // If permission not granted, request first
  if (!('Notification' in window)) return false;

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await requestNotificationPermission();
  }

  if (permission !== 'granted') {
    return false;
  }

  const options = {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag,
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: window.location.href,
      timestamp: Date.now(),
      ...data,
    },
  };

  try {
    // Attempt via Service Worker registration (native mobile notification panel)
    if (swRegistration && 'showNotification' in swRegistration) {
      await swRegistration.showNotification(title, options);
      return true;
    }

    // Try getting ready registration
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, options);
        return true;
      }
    }

    // Direct Notification fallback (desktop/safari window)
    new Notification(title, options);
    return true;
  } catch (err) {
    console.error('Failed to trigger mobile push notification:', err);
    return false;
  }
}

/**
 * Format and dispatch an alert for a specific heavy traffic corridor
 */
export async function dispatchHeavyTrafficAlert(street, cityName = '') {
  const distText = street.distanceKm ? ` (${street.distanceKm} km away)` : ' (Within 50km)';
  const title = `🚨 Severe Traffic: ${street.name}${distText}`;
  const body = `${street.delay || 'Heavy delays'} • Crawl speed: ${street.speed} km/h • ${street.policeAdvisory || 'Police on alert'}`;

  return sendMobileTrafficPush({
    title,
    body,
    tag: `heavy-traffic-${street.id || street.name}`,
    data: {
      streetName: street.name,
      cityName,
      coordinates: street.coordinates,
    },
  });
}

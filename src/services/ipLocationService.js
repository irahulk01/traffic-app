/**
 * IP Address Geolocation Service
 * Automatically detects the user's city and coordinates via their IP address
 */

export async function detectCityByIP() {
  const defaultHazaribagh = {
    city: 'Hazaribagh',
    state: 'Jharkhand',
    country: 'India',
    lat: 23.9924,
    lng: 85.3616,
    ip: 'Local IP',
    source: 'default',
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('https://ipwho.is/', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return defaultHazaribagh;
    }

    const data = await res.json();

    if (data && data.success) {
      return {
        city: data.city || 'Hazaribagh',
        state: data.region || 'Jharkhand',
        country: data.country || 'India',
        lat: Number(data.latitude) || 23.9924,
        lng: Number(data.longitude) || 85.3616,
        ip: data.ip,
        source: 'ip_lookup',
      };
    }

    return defaultHazaribagh;
  } catch (err) {
    console.warn('IP lookup timed out or failed, using Hazaribagh default:', err);
    return defaultHazaribagh;
  }
}

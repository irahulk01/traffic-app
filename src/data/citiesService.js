import Fuse from 'fuse.js';
import indiaCitiesData from './indiaCities.json';

// Pre-indexed Indian cities
let cachedCities = null;
let fuseIndex = null;

export function getAllIndianCities() {
  if (cachedCities) return cachedCities;
  cachedCities = indiaCitiesData;

  // Initialize Fuse.js for rapid fuzzy searching across all 4,242 Indian cities
  fuseIndex = new Fuse(cachedCities, {
    keys: [
      { name: 'name', weight: 0.7 },
      { name: 'state', weight: 0.3 },
    ],
    threshold: 0.3,
    distance: 100,
    minMatchCharLength: 1,
  });

  return cachedCities;
}

export function searchIndianCities(query, limit = 35) {
  const cities = getAllIndianCities();
  if (!query || query.trim() === '') {
    return cities.slice(0, limit);
  }

  const cleanQuery = query.trim();
  const lowerQuery = cleanQuery.toLowerCase();

  // Fast prefix matching
  const prefixMatches = [];
  for (let i = 0; i < cities.length; i++) {
    if (cities[i].name.toLowerCase().startsWith(lowerQuery)) {
      prefixMatches.push(cities[i]);
      if (prefixMatches.length >= limit) break;
    }
  }

  if (prefixMatches.length >= limit) {
    return prefixMatches;
  }

  // Fuzzy matching fallback
  const fuseResults = fuseIndex.search(cleanQuery).map((res) => res.item);
  const combined = [...prefixMatches];
  const seenIds = new Set(prefixMatches.map((c) => c.id));

  for (const item of fuseResults) {
    if (!seenIds.has(item.id)) {
      combined.push(item);
      seenIds.add(item.id);
      if (combined.length >= limit) break;
    }
  }

  return combined;
}

// Popular / Spotlight Indian Cities including Hazaribagh & Giridih
export const SPOTLIGHT_CITIES = [
  { name: 'Hazaribagh', state: 'Jharkhand', stateCode: 'JH', lat: 23.9924, lng: 85.3616 },
  { name: 'Giridih', state: 'Jharkhand', stateCode: 'JH', lat: 24.2500, lng: 85.9167 },
  { name: 'Ranchi', state: 'Jharkhand', stateCode: 'JH', lat: 23.3432, lng: 85.3094 },
  { name: 'Patna', state: 'Bihar', stateCode: 'BR', lat: 25.5941, lng: 85.1376 },
  { name: 'Delhi', state: 'Delhi', stateCode: 'DL', lat: 28.6139, lng: 77.2090 },
  { name: 'Bengaluru', state: 'Karnataka', stateCode: 'KA', lat: 12.9716, lng: 77.5946 },
  { name: 'Mumbai', state: 'Maharashtra', stateCode: 'MH', lat: 19.0760, lng: 72.8774 },
  { name: 'Kolkata', state: 'West Bengal', stateCode: 'WB', lat: 22.5726, lng: 88.3639 },
];

/**
 * Finds the nearest Indian city from user's current GPS coordinates
 * @param {number} lat Latitude
 * @param {number} lng Longitude
 */
export function findNearestIndianCity(lat, lng) {
  const cities = getAllIndianCities();
  let closest = null;
  let minDistance = Infinity;

  for (let i = 0; i < cities.length; i++) {
    const c = cities[i];
    const dLat = c.lat - lat;
    const dLng = c.lng - lng;
    const distSq = dLat * dLat + dLng * dLng;

    if (distSq < minDistance) {
      minDistance = distSq;
      closest = c;
    }
  }

  // Include exact user coordinates if within range
  if (closest) {
    return {
      ...closest,
      exactUserLat: lat,
      exactUserLng: lng,
    };
  }

  return closest;
}


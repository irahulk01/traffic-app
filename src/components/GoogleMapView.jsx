import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GOOGLE_MAPS_DARK_STYLE, GOOGLE_MAPS_DAY_STYLE } from './map/mapStyles';
import MapFloatingControls from './map/MapFloatingControls';
import MapCityTag from './map/MapCityTag';

// ─── Load Google Maps script exactly once ────────────────────────────────────
// Never removes an existing <script> tag — just waits for the already-loading
// promise if one exists, or resolves immediately if the API is already ready.
function loadGoogleMaps(apiKey) {
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google);
  }

  if (window.__gmapLoadingPromise) {
    return window.__gmapLoadingPromise;
  }

  window.__gmapLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker,places,geometry&loading=async&callback=__onGoogleMapsCallback`;
    script.async = true;
    script.defer = true;

    window.__onGoogleMapsCallback = () => {
      resolve(window.google);
    };

    script.onerror = () => {
      window.__gmapLoadingPromise = null; // allow retry on failure
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });

  return window.__gmapLoadingPromise;
}

// ── Fixed Hazaribagh Road Network Configuration ──────────────────────────────
// Define important traffic corridors originating from or passing through Hazaribagh.
const HAZARIBAGH_MONITORED_ROUTES = [
  {
    id: 'nh20-north',
    name: 'NH20 (Towards Barhi)',
    origin: { lat: 23.9966, lng: 85.3691 },
    dest: { lat: 24.1612, lng: 85.3900 }
  },
  {
    id: 'nh20-south',
    name: 'NH20 (Towards Ranchi)',
    origin: { lat: 23.9966, lng: 85.3691 },
    dest: { lat: 23.8340, lng: 85.4200 }
  },
  {
    id: 'nh100-east',
    name: 'NH100 (Towards Bagodar)',
    origin: { lat: 23.9966, lng: 85.3691 },
    dest: { lat: 24.0040, lng: 85.5500 }
  },
  {
    id: 'nh100-west',
    name: 'NH100 (Towards Chatra)',
    origin: { lat: 23.9966, lng: 85.3691 },
    dest: { lat: 24.0450, lng: 85.1800 }
  },
  {
    id: 'hazaribagh-bypass',
    name: 'Hazaribagh Bypass',
    origin: { lat: 23.9510, lng: 85.3690 },
    dest: { lat: 24.0150, lng: 85.3350 }
  }
];

// Auto-refresh interval — 60 seconds.
const TRAFFIC_REFRESH_INTERVAL_MS = 60 * 1000;
// Cache TTL — same as refresh interval so cache is always fresh when refresh fires.
const CACHE_TTL_MS = TRAFFIC_REFRESH_INTERVAL_MS;

export default function GoogleMapView({
  city,
  streets = [],
  selectedStreet,
  apiKey,
  theme = 'night',
  // Callbacks — called once with result, no polling
  onGpsLocality,      // ({ locality, sublocality, fullAddress }) => void
  onRealTrafficData,  // (Map<corridorId, { level, durationRatio }>) => void
  onGpsError,
}) {
  const mapContainerRef = useRef(null);
  const [mapEngine, setMapEngine] = useState('loading'); // 'google' | 'leaflet' | 'loading'
  const [trafficEnabled, setTrafficEnabled] = useState(true);
  const [mapType, setMapType] = useState('roadmap'); // 'roadmap' | 'satellite'

  // Google Maps references — created ONCE, never replaced
  const gMapRef = useRef(null);
  const gTrafficLayerRef = useRef(null);
  const gPolylinesRef = useRef([]);
  const gMarkerRef = useRef(null);
  const gInfoWindowRef = useRef(null);
  const gUserLocationMarkerRef = useRef(null);

  // Leaflet fallback references — created ONCE if Google fails
  const lMapRef = useRef(null);
  const lPolylinesRef = useRef([]);
  const lMarkerRef = useRef(null);
  const lUserLocationMarkerRef = useRef(null);

  // The city selected on the landing page — used as the traffic monitoring CENTER.
  const cityLat = Number(city.lat);
  const cityLng = Number(city.lng);
  const hasValidCity = cityLat !== 0 && cityLng !== 0 && !isNaN(cityLat) && !isNaN(cityLng);

  const [cityCenter, setCityCenter] = useState(() => ({
    lat: hasValidCity ? cityLat : 0,
    lng: hasValidCity ? cityLng : 0,
  }));

  // User's live GPS coordinates — used for the blue "you are here" pin.
  const [userCoords, setUserCoords] = useState(() => ({
    lat: hasValidCity ? cityLat : 23.3432,
    lng: hasValidCity ? cityLng : 85.3094,
  }));

  // ── Detect live GPS for the blue pin (once per session) ───────────────────
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserCoords({ lat, lng });

          // Always use Hazaribagh center for routing, GPS is just a blue pin.
          // We do not change cityCenter based on GPS anymore.

          // Reverse geocode the GPS position to get the real locality name.
          if (onGpsLocality && window.google && window.google.maps) {
            reverseGeocodeCoords(lat, lng);
          } else if (onGpsLocality) {
            pendingGeocodeCoordsRef.current = { lat, lng };
          }
        },
        (err) => {
          console.warn('GPS unavailable, using city center for location pin:', err);
          if (!hasValidCity && onGpsError) {
             onGpsError();
          }
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 300000 },
      );
    }
  }, []); // Only once on mount

  // Pending GPS coords to geocode once Google Maps loads
  const pendingGeocodeCoordsRef = useRef(null);

  // ── Reverse geocode helper — extracts locality + sublocality ──────────────
  const reverseGeocodeCoords = useCallback((lat, lng) => {
    if (!onGpsLocality || !window.google || !window.google.maps) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== 'OK' || !results || results.length === 0) return;

      let locality = '';
      let sublocality = '';
      let fullAddress = '';

      // Walk the address components to find locality and sublocality
      for (const result of results) {
        for (const comp of result.address_components) {
          if (!locality && comp.types.includes('locality')) {
            locality = comp.long_name;
          }
          if (!sublocality && comp.types.includes('sublocality_level_1')) {
            sublocality = comp.long_name;
          }
          if (!sublocality && comp.types.includes('sublocality')) {
            sublocality = comp.long_name;
          }
        }
        if (locality) {
          fullAddress = result.formatted_address || '';
          break;
        }
      }

      if (locality || sublocality) {
        onGpsLocality({ locality, sublocality, fullAddress });
      }
    });
  }, [onGpsLocality]);

  // ── EFFECT 1: Initialize the map ONCE on mount ────────────────────────────
  // This effect runs exactly once. It creates the Google Map (or Leaflet
  // fallback) and the TrafficLayer. Neither is ever recreated.
  useEffect(() => {
    let isMounted = true;

    // Listen for Google Maps auth failure (bad key / domain restriction)
    window.gm_authFailure = () => {
      if (isMounted && !lMapRef.current) {
        const center = {
          lat: Number(city.lat) || 23.9924,
          lng: Number(city.lng) || 85.3616,
        };
        initLeafletMap(center);
        setMapEngine('leaflet');
      }
    };

    async function initMap() {
      if (!mapContainerRef.current) return;

      const center = {
        lat: Number(city.lat) || 23.9924,
        lng: Number(city.lng) || 85.3616,
      };

      const key = (apiKey || '').trim();

      if (key.length > 10) {
        try {
          const google = await loadGoogleMaps(key);
          if (!isMounted || !mapContainerRef.current) return;

          // Guard: if map was already created (StrictMode double-invoke), skip
          if (gMapRef.current) return;

          const activeStyles = theme === 'day' ? GOOGLE_MAPS_DAY_STYLE : GOOGLE_MAPS_DARK_STYLE;

          const map = new google.maps.Map(mapContainerRef.current, {
            center,
            zoom: 13,
            mapId: 'DEMO_MAP_ID',
            disableDefaultUI: true,
            zoomControl: false,
            mapTypeId: mapType,
            styles: mapType === 'roadmap' ? activeStyles : [],
          });

          gMapRef.current = map;

          // Create TrafficLayer once with autoRefresh (default is already true,
          // but we set it explicitly to document intent).
          // TrafficLayer auto-refreshes its own live data — we never call
          // setMap(null) / setMap(map) unnecessarily.
          const trafficLayer = new google.maps.TrafficLayer({ autoRefresh: true });
          trafficLayer.setMap(map);
          gTrafficLayerRef.current = trafficLayer;

          // If GPS resolved before the map loaded, geocode now
          if (pendingGeocodeCoordsRef.current) {
            reverseGeocodeCoords(
              pendingGeocodeCoordsRef.current.lat,
              pendingGeocodeCoordsRef.current.lng,
            );
            pendingGeocodeCoordsRef.current = null;
          }

          setMapEngine('google');
          return;
        } catch (err) {
          console.warn('Google Maps failed, falling back to Leaflet:', err);
        }
      }

      // Leaflet fallback
      if (!isMounted) return;
      initLeafletMap(center);
      setMapEngine('leaflet');
    }

    initMap();

    return () => {
      isMounted = false;
      // Only clean up Leaflet (Google Maps cleans itself via DOM)
      if (lMapRef.current) {
        lMapRef.current.remove();
        lMapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally mount-only

  // ── EFFECT 2: Pan/recenter when city changes — NO map recreation ──────────
  useEffect(() => {
    const lat = Number(city.lat);
    const lng = Number(city.lng);
    if (!lat || !lng) return;

    if (mapEngine === 'google' && gMapRef.current) {
      gMapRef.current.setCenter({ lat, lng });
      gMapRef.current.setZoom(13);
    } else if (mapEngine === 'leaflet' && lMapRef.current) {
      lMapRef.current.setView([lat, lng], 13);
    }
  }, [city.lat, city.lng, mapEngine]);

  // ── Leaflet fallback initialiser ──────────────────────────────────────────
  const initLeafletMap = useCallback((center) => {
    if (!mapContainerRef.current || lMapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    const tileUrl =
      theme === 'day'
        ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, { maxZoom: 19, subdomains: 'abcd' }).addTo(map);

    lMapRef.current = map;

    // Ensure tiles render full-width after layout settles
    setTimeout(() => { map.invalidateSize(); }, 150);
  }, [theme]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Draw street polylines on Google Map ───────────────────────────────────
  const drawStreetsOnGoogleMap = useCallback((map, google, streetList) => {
    // Remove previous polylines
    gPolylinesRef.current.forEach((p) => p.setMap(null));
    gPolylinesRef.current = [];

    streetList.forEach((street) => {
      // Require a path with at least 2 points — trafficEngine now always provides this
      if (!street.path || street.path.length < 2) return;

      const poly = new google.maps.Polyline({
        path: street.path,
        geodesic: true,
        strokeColor: street.color,
        strokeOpacity: 0.92,
        strokeWeight: street.level === 'heavy' ? 7 : street.level === 'moderate' ? 5 : 4,
        map,
      });

      poly.addListener('click', () => {
        focusStreetOnGoogleMap(street);
      });

      gPolylinesRef.current.push(poly);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Draw street polylines on Leaflet ─────────────────────────────────────
  const drawStreetsOnLeaflet = useCallback((map, streetList) => {
    lPolylinesRef.current.forEach((p) => p.remove());
    lPolylinesRef.current = [];

    streetList.forEach((street) => {
      if (!street.path || street.path.length < 2) return;

      const latLngs = street.path.map((p) => [p.lat, p.lng]);
      const poly = L.polyline(latLngs, {
        color: street.color,
        weight: street.level === 'heavy' ? 7 : street.level === 'moderate' ? 5 : 4,
        opacity: 0.92,
      }).addTo(map);

      poly.bindPopup(`
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;line-height:1.5">
          <strong style="color:${street.color};font-size:13px">${street.name}</strong><br/>
          <span>Status: <b>${street.badgeText}</b> (${street.delay})</span><br/>
          <span>Speed: <b>${street.speed} km/h</b> (Limit: ${street.speedLimit} km/h)</span><br/>
          <span style="color:#b45309">${street.trafficAdvisory || street.advisory || 'Normal Flow'}</span>
        </div>
      `);

      poly.on('click', () => { focusStreetOnLeaflet(street); });

      lPolylinesRef.current.push(poly);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-draw street overlays when streets data or engine changes ───────────
  // NOTE: On Google Maps we do NOT draw custom polylines.
  // The TrafficLayer already shows real traffic on actual road geometry.
  // Custom polylines from offset math produce fake straight lines that cross the
  // map randomly — exactly the visual noise visible in the screenshot.
  // Polylines are only used on the Leaflet fallback (no traffic layer there).
  useEffect(() => {
    if (mapEngine === 'google' && gMapRef.current) {
      // Clear any stale polylines that may exist (e.g. from a prior render)
      gPolylinesRef.current.forEach((p) => p.setMap(null));
      gPolylinesRef.current = [];
    } else if (mapEngine === 'leaflet' && lMapRef.current) {
      drawStreetsOnLeaflet(lMapRef.current, streets);
    }
  }, [streets, mapEngine, drawStreetsOnLeaflet]);

  // ── Dynamic Traffic Discovery via Routes API ──────────────────────────────
  // Queries 8 compass directions from the user's location.
  // Uses Routes API v2 to get speedReadingIntervals for accurate traffic locations.
  // Groups nearby affected segments.
  const realTrafficCacheRef = useRef({});
  const geocodeCacheRef = useRef({}); // Cache reverse geocoding results

  // Helper to safely format coordinate
  const formatCoord = (c) => Math.round(c * 1000) / 1000;

  useEffect(() => {
    if (mapEngine !== 'google' || !gMapRef.current || !window.google || !onRealTrafficData) return;

    const lat = cityCenter.lat;
    const lng = cityCenter.lng;

    if (lat === 0 && lng === 0) return;
    if (!isFinite(lat) || !isFinite(lng)) return;

    const cityKey = `${formatCoord(lat)}_${formatCoord(lng)}`;
    console.log('[TrafficDiscovery] Starting Routes API fetch from', lat, lng);

    let isCancelled = false;

    const fetchTrafficData = async () => {
      const now = Date.now();
      const cached = realTrafficCacheRef.current[cityKey];
      if (cached && now - cached.timestamp < CACHE_TTL_MS) {
        console.log('[TrafficDiscovery] Serving from cache:', Object.keys(cached.trafficMap).length, 'areas');
        onRealTrafficData(cached.trafficMap, cached.streets);
        return;
      }

      const google = window.google;
      
      // We will collect all dynamically discovered traffic areas here
      let discoveredStreetsMap = {};
      let trafficDataMap = {};
      let failedRoutes = new Set();
      
      const routes = HAZARIBAGH_MONITORED_ROUTES;

      // Start with placeholder while fetching
      const placeholderStreets = routes.map((r) => ({
        id: r.id,
        name: `Scanning ${r.name}...`,
        landmark: 'Hazaribagh Road Network',
        direction: r.name,
        coordinates: r.origin,
        path: [r.origin, r.dest],
      }));
      const placeholderTraffic = Object.fromEntries(
        routes.map((r) => [r.id, { level: 'checking', realSpeed: 0, normalDuration: '', trafficDuration: '' }])
      );
      onRealTrafficData(placeholderTraffic, placeholderStreets);

      console.log('[TrafficDiscovery] Querying', routes.length, 'routes via Routes API...');

      const apiKeyToUse = (apiKey || '').trim();
      const routesApiUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';

      const fetchPromises = routes.map(async (route) => {
        try {
          const payload = {
            origin: { location: { latLng: { latitude: route.origin.lat, longitude: route.origin.lng } } },
            destination: { location: { latLng: { latitude: route.dest.lat, longitude: route.dest.lng } } },
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
            extraComputations: ['TRAFFIC_ON_POLYLINE']
          };

          const response = await fetch(routesApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKeyToUse,
              'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.travelAdvisory,routes.legs'
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            throw new Error(`Routes API error: ${response.status}`);
          }

          const data = await response.json();
          const apiRoute = data.routes?.[0];
          
          if (!apiRoute || !apiRoute.polyline || !apiRoute.polyline.encodedPolyline) {
             return; // No route found
          }

          // Decode polyline to get coordinates
          const polylineCoords = google.maps.geometry.encoding.decodePath(apiRoute.polyline.encodedPolyline);
          const intervals = apiRoute.travelAdvisory?.speedReadingIntervals || [];
          
          // Group adjacent affected segments
          // We only care about SLOW and TRAFFIC_JAM
          const affectedIntervals = intervals.filter(i => i.speed === 'SLOW' || i.speed === 'TRAFFIC_JAM');
          
          if (affectedIntervals.length === 0) return;

          // Sort by start index
          affectedIntervals.sort((a, b) => a.startPolylinePointIndex - b.startPolylinePointIndex);
          
          let groupedAreas = [];
          let currentGroup = null;
          
          const POINT_MERGE_THRESHOLD = 30; // Max points gap to merge intervals
          
          affectedIntervals.forEach((interval) => {
             if (!currentGroup) {
                currentGroup = {
                   startIdx: interval.startPolylinePointIndex,
                   endIdx: interval.endPolylinePointIndex,
                   maxSeverity: interval.speed,
                   intervals: [interval]
                };
             } else {
                if (interval.startPolylinePointIndex - currentGroup.endIdx <= POINT_MERGE_THRESHOLD) {
                   // Merge
                   currentGroup.endIdx = Math.max(currentGroup.endIdx, interval.endPolylinePointIndex);
                   if (interval.speed === 'TRAFFIC_JAM') currentGroup.maxSeverity = 'TRAFFIC_JAM';
                   currentGroup.intervals.push(interval);
                } else {
                   // Close current group
                   groupedAreas.push(currentGroup);
                   currentGroup = {
                      startIdx: interval.startPolylinePointIndex,
                      endIdx: interval.endPolylinePointIndex,
                      maxSeverity: interval.speed,
                      intervals: [interval]
                   };
                }
             }
          });
          if (currentGroup) groupedAreas.push(currentGroup);

          // Process each grouped area into a street card
          const geocoder = new google.maps.Geocoder();
          
          for (let i = 0; i < groupedAreas.length; i++) {
             const area = groupedAreas[i];
             const startIdx = Math.max(0, area.startIdx);
             const endIdx = Math.min(polylineCoords.length - 1, area.endIdx);
             
             if (startIdx >= endIdx) continue;
             
             const pathPoints = [];
             for (let j = startIdx; j <= endIdx; j++) {
                pathPoints.push({
                   lat: polylineCoords[j].lat(),
                   lng: polylineCoords[j].lng()
                });
             }
             
             const midIdx = Math.floor((startIdx + endIdx) / 2);
             const midPoint = polylineCoords[midIdx];
             const centerCoord = { lat: midPoint.lat(), lng: midPoint.lng() };
             
             const areaId = `${route.id}-area-${i}-${startIdx}`;
             
             const displayLevel = area.maxSeverity === 'TRAFFIC_JAM' ? 'heavy' : 'moderate';
             
             // Base street info
             const streetObj = {
                id: areaId,
                name: `Traffic near ${formatCoord(centerCoord.lat)}, ${formatCoord(centerCoord.lng)}`,
                landmark: `Route: ${route.name}`,
                direction: route.name,
                coordinates: centerCoord,
                path: pathPoints
             };
             
             discoveredStreetsMap[areaId] = streetObj;
             
             trafficDataMap[areaId] = {
                level: displayLevel,
                durationRatio: displayLevel === 'heavy' ? 1.5 : 1.2,
                realSpeed: displayLevel === 'heavy' ? 10 : 25,
                normalDuration: '',
                trafficDuration: 'Google Live Traffic',
                intervalCount: endIdx - startIdx, // size of the traffic jam
             };
             
             // Fire off reverse geocoding asynchronously to update the name
             const geoKey = `${formatCoord(centerCoord.lat)}_${formatCoord(centerCoord.lng)}`;
             if (geocodeCacheRef.current[geoKey]) {
                streetObj.name = geocodeCacheRef.current[geoKey].name;
                streetObj.landmark = geocodeCacheRef.current[geoKey].landmark;
             } else {
                geocoder.geocode({ location: centerCoord }, (results, status) => {
                   if (status === 'OK' && results[0]) {
                      let routeName = '';
                      let locality = '';
                      let poiName = '';

                      for (const result of results) {
                        for (const comp of result.address_components) {
                          if (comp.types.includes('route') && !routeName) routeName = comp.long_name;
                          if (comp.types.includes('point_of_interest') && !poiName) poiName = comp.long_name;
                          if (comp.types.includes('locality') && !locality) locality = comp.long_name;
                          if (comp.types.includes('premise') && !poiName) poiName = comp.long_name;
                          if (comp.types.includes('neighborhood') && !locality) locality = comp.long_name;
                        }
                      }
                      
                      const formattedName = routeName || route.name;
                      const formattedLandmark = poiName || locality || '';
                      
                      geocodeCacheRef.current[geoKey] = {
                         name: formattedName,
                         landmark: formattedLandmark
                      };
                      
                      // We could force a re-render here, but since the traffic refreshes every 5 mins,
                      // we can just mutate the object so the next map access sees it, OR we can dispatch an update.
                      // For now, we update the object directly.
                      streetObj.name = formattedName;
                      if (formattedLandmark) streetObj.landmark = formattedLandmark;
                      
                      // Trigger a quick re-emit to update UI immediately
                      if (!isCancelled) {
                         const currentStreets = Object.values(discoveredStreetsMap).sort((a, b) => {
                            const tA = trafficDataMap[a.id];
                            const tB = trafficDataMap[b.id];
                            if (!tA || !tB) return 0;
                            if (tA.level === 'heavy' && tB.level !== 'heavy') return -1;
                            if (tB.level === 'heavy' && tA.level !== 'heavy') return 1;
                            return (tB.intervalCount || 0) - (tA.intervalCount || 0);
                         });
                         onRealTrafficData({...trafficDataMap}, currentStreets);
                      }
                   }
                });
             }
          }
          
        } catch (err) {
          console.warn(`[TrafficDiscovery] ${route.name} FAILED:`, err);
          failedRoutes.add(route.id);
        }
      });

      await Promise.all(fetchPromises);
      
      if (isCancelled) return;
      
      // Carry over stale data for failed routes
      if (failedRoutes.size > 0 && cached) {
         cached.streets.forEach(street => {
            // Find which route this street belonged to. routeId is part of areaId: `${route.id}-area-...`
            const routeId = street.id.split('-area-')[0];
            if (failedRoutes.has(routeId) || failedRoutes.has(routeId + '-' + street.id.split('-area-')[0].split('-')[1])) { // quick hack to match route.id
               // It's from a failed route, let's copy it over
               discoveredStreetsMap[street.id] = street;
               const oldTraffic = cached.trafficMap[street.id];
               trafficDataMap[street.id] = {
                  ...oldTraffic,
                  isStale: true
               };
            }
         });
      }
      
      const finalStreets = Object.values(discoveredStreetsMap).sort((a, b) => {
         const tA = trafficDataMap[a.id];
         const tB = trafficDataMap[b.id];
         if (!tA || !tB) return 0;
         if (tA.level === 'heavy' && tB.level !== 'heavy') return -1;
         if (tB.level === 'heavy' && tA.level !== 'heavy') return 1;
         return (tB.intervalCount || 0) - (tA.intervalCount || 0);
      });
      console.log('[TrafficDiscovery] All done. Emitting', finalStreets.length, 'traffic areas.');
      
      if (finalStreets.length === 0) {
        // If NO traffic is found, we should clear the checking state, but not invent traffic.
        // Returning an empty array is the correct representation.
        onRealTrafficData({}, []);
        realTrafficCacheRef.current[cityKey] = {
           timestamp: Date.now(),
           trafficMap: {},
           streets: []
        };
      } else {
        realTrafficCacheRef.current[cityKey] = {
          timestamp: Date.now(),
          trafficMap: trafficDataMap,
          streets: finalStreets,
        };
        onRealTrafficData(trafficDataMap, finalStreets);
      }
    };

    fetchTrafficData();

    const refreshTimer = setInterval(fetchTrafficData, TRAFFIC_REFRESH_INTERVAL_MS);

    return () => {
      isCancelled = true;
      clearInterval(refreshTimer);
    };
  }, [mapEngine, cityCenter.lat, cityCenter.lng, onRealTrafficData]);

  // ── Blue user location pin — Leaflet ─────────────────────────────────────
  const drawUserLocationOnLeaflet = (map, coords) => {
    if (!map) return;
    if (lUserLocationMarkerRef.current) {
      lUserLocationMarkerRef.current.remove();
    }

    const bluePinIcon = L.divIcon({
      className: 'user-exact-location-pin',
      html: `
        <div class="user-location-pin-wrap" title="Your Exact Current Location">
          <div class="user-location-radar-pulse"></div>
          <div class="user-location-center-dot"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([coords.lat, coords.lng], {
      icon: bluePinIcon,
      zIndexOffset: 1000,
    }).addTo(map);

    marker.bindPopup(`
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12.5px;padding:2px">
        <div style="display:flex;align-items:center;gap:6px;font-weight:800;color:#2563eb">
          <span style="width:10px;height:10px;border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 0 8px rgba(37,99,235,0.8);display:inline-block"></span>
          <span>Your Exact Location</span>
        </div>
        <div style="font-size:11px;color:#64748b;margin-top:4px">
          GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}
        </div>
      </div>
    `);

    lUserLocationMarkerRef.current = marker;
  };

  // ── Blue user location pin — Google Maps ──────────────────────────────────
  const drawUserLocationOnGoogleMap = (map, google, coords) => {
    if (!map || !google) return;

    // Remove previous pin cleanly
    if (gUserLocationMarkerRef.current) {
      if (typeof gUserLocationMarkerRef.current.setMap === 'function') {
        gUserLocationMarkerRef.current.setMap(null);
      } else {
        gUserLocationMarkerRef.current.map = null;
      }
      gUserLocationMarkerRef.current = null;
    }

    const pos = { lat: coords.lat, lng: coords.lng };

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#0f172a;padding:4px">
          <strong style="color:#2563eb;font-size:13px">📍 Your Exact Location</strong><br/>
          <span style="color:#475569;font-size:11px">GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}</span>
        </div>
      `,
    });

    if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
      const pin = document.createElement('div');
      pin.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#2563eb;border:3.5px solid #ffffff;box-shadow:0 0 10px rgba(37,99,235,0.8)';
      pin.title = 'Your Exact Location';

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: pos,
        map,
        title: 'Your Exact Location',
        content: pin,
        zIndex: 1000,
      });

      marker.addListener('click', () => { infoWindow.open({ map, anchor: marker }); });
      gUserLocationMarkerRef.current = marker;
    } else {
      const marker = new google.maps.Marker({
        position: pos,
        map,
        title: 'Your Exact Location',
        zIndex: 1000,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3.5,
        },
      });

      marker.addListener('click', () => { infoWindow.open(map, marker); });
      gUserLocationMarkerRef.current = marker;
    }
  };

  // ── Update blue pin when coords or engine changes ─────────────────────────
  useEffect(() => {
    if (mapEngine === 'leaflet' && lMapRef.current) {
      drawUserLocationOnLeaflet(lMapRef.current, userCoords);
    } else if (mapEngine === 'google' && gMapRef.current && window.google) {
      drawUserLocationOnGoogleMap(gMapRef.current, window.google, userCoords);
    }
  }, [userCoords, mapEngine]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Theme & map type changes — no recreation, just setOptions ────────────
  useEffect(() => {
    if (gMapRef.current && window.google) {
      const activeStyles = theme === 'day' ? GOOGLE_MAPS_DAY_STYLE : GOOGLE_MAPS_DARK_STYLE;
      gMapRef.current.setOptions({
        styles: mapType === 'roadmap' ? activeStyles : [],
        mapTypeId: mapType,
      });
    }
  }, [theme, mapType]);

  // ── Traffic layer toggle ──────────────────────────────────────────────────
  // We only ever call setMap once per toggle change, and guard against redundant calls.
  // The TrafficLayer itself (autoRefresh:true) handles its own live data updates.
  useEffect(() => {
    if (mapEngine !== 'google' || !gTrafficLayerRef.current) return;
    const targetMap = trafficEnabled && gMapRef.current ? gMapRef.current : null;
    // Only set if it's actually changing to prevent redundant calls
    const currentMap = gTrafficLayerRef.current.getMap ? gTrafficLayerRef.current.getMap() : undefined;
    if (currentMap !== targetMap) {
      gTrafficLayerRef.current.setMap(targetMap);
    }
  }, [trafficEnabled, mapEngine]);

  // ── Focus street on Google Map (from card click or selectedStreet) ────────
  const focusStreetOnGoogleMap = (street) => {
    if (!gMapRef.current || !window.google) return;
    const gMap = gMapRef.current;
    const pos = { lat: street.coordinates.lat, lng: street.coordinates.lng };

    gMap.panTo(pos);
    gMap.setZoom(15);

    if (gMarkerRef.current) {
      if (typeof gMarkerRef.current.setMap === 'function') {
        gMarkerRef.current.setMap(null);
      } else {
        gMarkerRef.current.map = null;
      }
      gMarkerRef.current = null;
    }
    if (gInfoWindowRef.current) {
      gInfoWindowRef.current.close();
    }

    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:6px;max-width:240px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="width:8px;height:8px;border-radius:50%;background:${street.color};display:inline-block"></span>
            <strong style="font-size:13px;color:${street.color}">${street.name}</strong>
          </div>
          <div style="font-size:11.5px;color:#334155;line-height:1.5">
            <strong>Status:</strong> ${street.badgeText} (${street.delay})<br/>
            <strong>Speed:</strong> ${street.speed} km/h (Limit: ${street.speedLimit} km/h)<br/>
            <strong>Advisory:</strong> <span style="color:#d97706">${street.trafficAdvisory || street.advisory || 'Normal flow'}</span>
          </div>
        </div>
      `,
    });

    if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
      const pin = document.createElement('div');
      pin.style.cssText = `display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${street.color || '#ef4444'};border:2px solid #ffffff;box-shadow:0 2px 10px rgba(0,0,0,0.5)`;
      pin.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#ffffff"></span>';

      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: pos,
        map: gMap,
        title: street.name,
        content: pin,
      });

      infoWindow.open({ map: gMap, anchor: marker });
      marker.addListener('click', () => { infoWindow.open({ map: gMap, anchor: marker }); });

      gMarkerRef.current = marker;
      gInfoWindowRef.current = infoWindow;
    } else {
      const marker = new window.google.maps.Marker({
        position: pos,
        map: gMap,
        title: street.name,
        animation: window.google.maps.Animation.DROP,
      });

      infoWindow.open(gMap, marker);
      marker.addListener('click', () => { infoWindow.open(gMap, marker); });

      gMarkerRef.current = marker;
      gInfoWindowRef.current = infoWindow;
    }
  };

  // ── Focus street on Leaflet ───────────────────────────────────────────────
  const focusStreetOnLeaflet = (street) => {
    if (!lMapRef.current) return;
    lMapRef.current.flyTo([street.coordinates.lat, street.coordinates.lng], 15, { duration: 1.0 });

    if (lMarkerRef.current) {
      lMarkerRef.current.remove();
    }

    const icon = L.divIcon({
      className: 'traffic-pulse-pin',
      html: `
        <div style="background:${street.color};width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 0 16px ${street.color}"></div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    lMarkerRef.current = L.marker(
      [street.coordinates.lat, street.coordinates.lng],
      { icon },
    ).addTo(lMapRef.current);
  };

  // ── Respond to selected street from Redux ─────────────────────────────────
  useEffect(() => {
    if (!selectedStreet) return;
    if (mapEngine === 'google') {
      focusStreetOnGoogleMap(selectedStreet);
    } else if (mapEngine === 'leaflet') {
      focusStreetOnLeaflet(selectedStreet);
    }
  }, [selectedStreet, mapEngine]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Controls ──────────────────────────────────────────────────────────────
  const handleRecenter = () => {
    if (mapEngine === 'google' && gMapRef.current) {
      gMapRef.current.panTo({ lat: userCoords.lat, lng: userCoords.lng });
      gMapRef.current.setZoom(14);
    } else if (mapEngine === 'leaflet' && lMapRef.current) {
      lMapRef.current.flyTo([userCoords.lat, userCoords.lng], 14, { duration: 1.0 });
    }
  };

  const handleToggleMapType = () => {
    const nextType = mapType === 'roadmap' ? 'satellite' : 'roadmap';
    setMapType(nextType);
    if (mapEngine === 'google' && gMapRef.current) {
      gMapRef.current.setMapTypeId(nextType);
      const activeStyles = theme === 'day' ? GOOGLE_MAPS_DAY_STYLE : GOOGLE_MAPS_DARK_STYLE;
      gMapRef.current.setOptions({ styles: nextType === 'roadmap' ? activeStyles : [] });
    }
  };

  const handleZoomIn = () => {
    if (mapEngine === 'google' && gMapRef.current) {
      gMapRef.current.setZoom(Math.min(20, (gMapRef.current.getZoom() || 13) + 1));
    } else if (mapEngine === 'leaflet' && lMapRef.current) {
      lMapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapEngine === 'google' && gMapRef.current) {
      gMapRef.current.setZoom(Math.max(3, (gMapRef.current.getZoom() || 13) - 1));
    } else if (mapEngine === 'leaflet' && lMapRef.current) {
      lMapRef.current.zoomOut();
    }
  };

  return (
    <div className="map-half-container">
      <div ref={mapContainerRef} className="google-map-element" />

      <MapFloatingControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRecenter={handleRecenter}
        trafficEnabled={trafficEnabled}
        onToggleTraffic={() => setTrafficEnabled((prev) => !prev)}
        mapEngine={mapEngine}
        mapType={mapType}
        onToggleMapType={handleToggleMapType}
      />

      <MapCityTag cityName={city.name} mapEngine={mapEngine} />
    </div>
  );
}

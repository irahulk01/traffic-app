import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  Crosshair,
  Sparkles,
  ShieldCheck,
  AlertOctagon,
  Radio,
  Sun,
  Moon,
} from 'lucide-react';

// Tactical Dark Mode Styling for Google Maps (Night Command)
const GOOGLE_MAPS_DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#181e2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#181e2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8c9bb0' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cbd5e1' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#273349' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#090d16' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3b82f6' }],
  },
];

// High-Contrast Daylight Styling for Google Maps (Patrol Field Visibility)
const GOOGLE_MAPS_DAY_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 3 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#1e293b' }] },
  {
    featureType: 'administrative',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#0f172a' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#475569' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#cbd5e1' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#fed7aa' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#f97316' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#bae6fd' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#0284c7' }],
  },
];

// Helper to reliably load Google Maps script
function loadGoogleMaps(apiKey) {
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google);
  }

  if (window.__gmapLoadingPromise) {
    return window.__gmapLoadingPromise;
  }

  window.__gmapLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('google-maps-script');
    if (existing) {
      existing.remove();
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&callback=__onGoogleMapsCallback`;
    script.async = true;
    script.defer = true;

    window.__onGoogleMapsCallback = () => {
      resolve(window.google);
    };

    script.onerror = (e) => {
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });

  return window.__gmapLoadingPromise;
}

export default function GoogleMapView({
  city,
  streets = [],
  selectedStreet,
  apiKey,
  theme = 'night',
}) {


  const mapContainerRef = useRef(null);
  const [mapEngine, setMapEngine] = useState('loading'); // 'google' | 'leaflet' | 'loading'
  const [trafficEnabled, setTrafficEnabled] = useState(true);
  const [mapType, setMapType] = useState('roadmap'); // 'roadmap' | 'satellite'

  // Google Maps references
  const gMapRef = useRef(null);
  const gTrafficLayerRef = useRef(null);
  const gPolylinesRef = useRef([]);
  const gMarkerRef = useRef(null);
  const gInfoWindowRef = useRef(null);
  const gCircleRef = useRef(null);

  // Leaflet fallback references
  const lMapRef = useRef(null);
  const lPolylinesRef = useRef([]);
  const lMarkerRef = useRef(null);
  const lCircleRef = useRef(null);


  // 1. Initialize Map
  useEffect(() => {
    let isMounted = true;

    // Listen for Google Maps Authentication failure
    window.gm_authFailure = () => {
      if (isMounted) {
        initCleanLeafletMap({
          lat: Number(city.lat) || 23.99241,
          lng: Number(city.lng) || 85.36162,
        });
        setMapEngine('leaflet');
      }
    };

    async function setupMap() {
      if (!mapContainerRef.current) return;

      const center = {
        lat: Number(city.lat) || 23.99241,
        lng: Number(city.lng) || 85.36162,
      };

      const key = (apiKey || '').trim();

      if (key.length > 10) {
        try {
          const google = await loadGoogleMaps(key);
          if (!isMounted || !mapContainerRef.current) return;

          // Clear any previous child nodes
          mapContainerRef.current.innerHTML = '';

          const activeStyles = theme === 'day' ? GOOGLE_MAPS_DAY_STYLE : GOOGLE_MAPS_DARK_STYLE;

          const map = new google.maps.Map(mapContainerRef.current, {
            center,
            zoom: 13,
            disableDefaultUI: true,
            zoomControl: false,
            mapTypeId: mapType,
            styles: mapType === 'roadmap' ? activeStyles : [],
          });

          gMapRef.current = map;

          // Render 50km Surveillance Perimeter Radar Ring
          const circle = new google.maps.Circle({
            strokeColor: theme === 'day' ? '#1d4ed8' : '#38bdf8',
            strokeOpacity: 0.8,
            strokeWeight: 1.5,
            fillColor: theme === 'day' ? '#2563eb' : '#38bdf8',
            fillOpacity: 0.04,
            map,
            center,
            radius: 50000, // 50 km surveillance radius
            clickable: false,
          });
          gCircleRef.current = circle;
          map.fitBounds(circle.getBounds());

          // Add live authentic Google Maps TrafficLayer
          const trafficLayer = new google.maps.TrafficLayer();
          trafficLayer.setMap(map);
          gTrafficLayerRef.current = trafficLayer;

          setMapEngine('google');
          return;
        } catch (err) {
          console.warn('Google Maps load error:', err);
        }
      }

      // Clean OpenStreetMap Fallback (Zero Carto watermarks)
      if (!isMounted) return;
      initCleanLeafletMap(center);
      setMapEngine('leaflet');
    }

    setupMap();

    return () => {
      isMounted = false;
      if (lMapRef.current) {
        lMapRef.current.remove();
        lMapRef.current = null;
      }
    };
  }, [city.lat, city.lng, apiKey]);

  // Dynamically update Google Map styles when theme or mapType changes
  useEffect(() => {
    if (gMapRef.current && window.google) {
      const activeStyles = theme === 'day' ? GOOGLE_MAPS_DAY_STYLE : GOOGLE_MAPS_DARK_STYLE;
      gMapRef.current.setOptions({
        styles: mapType === 'roadmap' ? activeStyles : [],
        mapTypeId: mapType,
      });
    }
  }, [theme, mapType]);


  // Clean Leaflet fallback using official OpenStreetMap (No watermarks)
  const initCleanLeafletMap = (center) => {
    if (!mapContainerRef.current) return;
    mapContainerRef.current.innerHTML = '';

    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
    });

    // Official OpenStreetMap tile layer (100% free, zero watermarks)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Render 50km surveillance perimeter circle
    const circle = L.circle([center.lat, center.lng], {
      radius: 50000, // 50 km
      color: '#3b82f6',
      weight: 1.5,
      opacity: 0.8,
      fillColor: '#3b82f6',
      fillOpacity: 0.04,
    }).addTo(map);
    lCircleRef.current = circle;
    map.fitBounds(circle.getBounds(), { padding: [15, 15] });

    lMapRef.current = map;
  };


  // Focus street on Google Map
  const focusStreetOnGoogleMap = (street) => {
    if (!gMapRef.current || !window.google) return;
    const gMap = gMapRef.current;
    const pos = { lat: street.coordinates.lat, lng: street.coordinates.lng };

    gMap.panTo(pos);
    gMap.setZoom(15);

    if (gMarkerRef.current) {
      gMarkerRef.current.setMap(null);
    }
    if (gInfoWindowRef.current) {
      gInfoWindowRef.current.close();
    }

    const marker = new window.google.maps.Marker({
      position: pos,
      map: gMap,
      title: street.name,
      animation: window.google.maps.Animation.DROP,
    });

    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 6px; max-width: 240px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${street.color}; display: inline-block;"></span>
            <strong style="font-size: 13px; color: ${street.color};">${street.name}</strong>
          </div>
          <div style="font-size: 11.5px; color: #334155; line-height: 1.4;">
            <strong>Status:</strong> ${street.badgeText} (${street.delay})<br/>
            <strong>Speed:</strong> ${street.speed} km/h (Limit: ${street.speedLimit} km/h)<br/>
            <strong>Police Note:</strong> <span style="color: #d97706;">${street.policeAdvisory}</span>
          </div>
        </div>
      `,
    });

    infoWindow.open(gMap, marker);
    gMarkerRef.current = marker;
    gInfoWindowRef.current = infoWindow;
  };

  // Focus street on Leaflet Map
  const focusStreetOnLeaflet = (street) => {
    if (!lMapRef.current) return;
    const lMap = lMapRef.current;
    lMap.flyTo([street.coordinates.lat, street.coordinates.lng], 15, { duration: 1.0 });

    if (lMarkerRef.current) {
      lMarkerRef.current.remove();
    }

    const icon = L.divIcon({
      className: 'police-traffic-pin',
      html: `
        <div style="
          background: ${street.color};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 16px ${street.color};
          animation: pulse-dot 1.5s infinite;
        "></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    lMarkerRef.current = L.marker(
      [street.coordinates.lat, street.coordinates.lng],
      { icon }
    ).addTo(lMap);
  };

  // Handle selected street change from props
  useEffect(() => {
    if (!selectedStreet) return;

    if (mapEngine === 'google') {
      focusStreetOnGoogleMap(selectedStreet);
    } else if (mapEngine === 'leaflet') {
      focusStreetOnLeaflet(selectedStreet);
    }
  }, [selectedStreet, mapEngine]);

  // Handle traffic layer toggle
  useEffect(() => {
    if (mapEngine === 'google' && gTrafficLayerRef.current) {
      gTrafficLayerRef.current.setMap(
        trafficEnabled && gMapRef.current ? gMapRef.current : null
      );
    }
  }, [trafficEnabled, mapEngine]);


  // Recenter to 50km surveillance perimeter
  const handleRecenter = () => {
    if (mapEngine === 'google' && gMapRef.current && gCircleRef.current) {
      gMapRef.current.fitBounds(gCircleRef.current.getBounds());
    } else if (mapEngine === 'leaflet' && lMapRef.current && lCircleRef.current) {
      lMapRef.current.fitBounds(lCircleRef.current.getBounds(), { padding: [15, 15] });
    } else {
      const cityLat = Number(city.lat) || 23.99241;
      const cityLng = Number(city.lng) || 85.36162;
      if (mapEngine === 'google' && gMapRef.current) {
        gMapRef.current.panTo({ lat: cityLat, lng: cityLng });
        gMapRef.current.setZoom(11);
      } else if (mapEngine === 'leaflet' && lMapRef.current) {
        lMapRef.current.flyTo([cityLat, cityLng], 11);
      }
    }
  };


  // Toggle Map Type
  const handleToggleMapType = () => {
    const nextType = mapType === 'roadmap' ? 'satellite' : 'roadmap';
    setMapType(nextType);
    if (mapEngine === 'google' && gMapRef.current) {
      gMapRef.current.setMapTypeId(nextType);
      if (nextType === 'roadmap') {
        gMapRef.current.setOptions({ styles: GOOGLE_MAPS_DARK_STYLE });
      } else {
        gMapRef.current.setOptions({ styles: [] });
      }
    }
  };

  return (
    <div className="map-half-container">
      <div ref={mapContainerRef} className="google-map-element" />

      {/* Floating Map Controls */}
      <div className="map-floating-overlay">
        <button
          className="map-control-btn"
          onClick={handleRecenter}
          title="Recenter Map"
        >
          <Crosshair size={17} />
        </button>

        <button
          className={`map-control-btn ${trafficEnabled ? 'active' : ''}`}
          onClick={() => setTrafficEnabled(!trafficEnabled)}
          title="Toggle Traffic Layer"
        >
          <Layers size={17} />
        </button>

        {mapEngine === 'google' && (
          <button
            className={`map-control-btn ${mapType === 'satellite' ? 'active' : ''}`}
            onClick={handleToggleMapType}
            title="Satellite / Road Map"
          >
            <Sparkles size={16} />
          </button>
        )}
      </div>


      {/* Police Jurisdiction & Engine Status Tag */}
      <div className="map-city-tag">
        <div className="live-pulse-dot" />
        <span style={{ fontWeight: 700, color: '#ffffff' }}>{city.name} Division</span>
        <span
          style={{
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 12,
            background:
              mapEngine === 'google' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(234, 179, 8, 0.25)',
            color: mapEngine === 'google' ? '#4ade80' : '#facc15',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Radio size={10} />
          {mapEngine === 'google' ? 'Live Google Traffic' : 'Live Vector Traffic'}
        </span>

        <span
          style={{
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 12,
            background: 'rgba(56, 189, 248, 0.2)',
            color: '#38bdf8',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Crosshair size={10} />
          50 km Radar Radius
        </span>


        {/* Severity Color Legend */}
        <div className="map-traffic-indicator">
          <span
            className="traffic-legend-dot"
            style={{ background: '#ef4444' }}
            title="Heavy (Red)"
          />
          <span
            className="traffic-legend-dot"
            style={{ background: '#f97316' }}
            title="Moderate (Orange)"
          />
          <span
            className="traffic-legend-dot"
            style={{ background: '#22c55e' }}
            title="Low (Green)"
          />
          <span
            className="traffic-legend-dot"
            style={{ background: '#94a3b8' }}
            title="No Traffic (Neutral)"
          />
        </div>
      </div>
    </div>
  );
}

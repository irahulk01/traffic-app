import { useEffect, useRef, useState } from 'react';
import { LocateFixed, LoaderCircle, MapPinned } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { GOOGLE_MAPS_DARK_STYLE, GOOGLE_MAPS_DAY_STYLE } from './map/mapStyles';
import MapFloatingControls from './map/MapFloatingControls';
import MapCityTag from './map/MapCityTag';
import monitoredRoutes from '../data/monitoredRoutes.json';
import { normalizeTraffic } from '../data/trafficSections';

const CENTER = { lat: 23.9966, lng: 85.3691 };
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function loadGoogleMaps(apiKey) {
  if (window.google?.maps) return Promise.resolve(window.google);
  if (window.__gmapLoadingPromise) return window.__gmapLoadingPromise;
  window.__gmapLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => reject(new Error('Map loading timed out')), 18000);
    window.__onGoogleMapsCallback = () => { clearTimeout(timer); resolve(window.google); };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&callback=__onGoogleMapsCallback`;
    script.async = true;
    script.onerror = () => { clearTimeout(timer); window.__gmapLoadingPromise = null; reject(new Error('Map could not load')); };
    document.head.appendChild(script);
  });
  return window.__gmapLoadingPromise;
}

export default function GoogleMapView({ city, streets = [], selectedStreet, apiKey, theme = 'night', onRealTrafficData, onSelectStreet, onDataState, refreshToken = 0, filterKey = 'all', selectionToken = 0, dataReady = false, focusedRoute }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const layerRef = useRef(null);
  const linesRef = useRef([]);
  const popupRef = useRef(null);
  const userMarkerRef = useRef(null);
  const callbacks = useRef({ onRealTrafficData, onSelectStreet, onDataState });
  callbacks.current = { onRealTrafficData, onSelectStreet, onDataState };
  const lastFocusedRef = useRef(null);
  const lastFilterRef = useRef('all');
  const popupDismissedRef = useRef(false);
  const lastSelectionEventRef = useRef(0);
  const hasFramedRef = useRef(false);
  const [engine, setEngine] = useState('loading');
  const [trafficEnabled, setTrafficEnabled] = useState(true);
  const [mapType, setMapType] = useState('roadmap');
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState('');
  const lastSnapshotRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let created = null;
    const oldAuthFailure = window.gm_authFailure;
    const fallback = async () => {
      if (cancelled || leafletRef.current) return;
      try {
        const { default: L } = await import('leaflet');
        if (cancelled || !containerRef.current) return;
        mapRef.current = null;
        containerRef.current.replaceChildren();
        const map = L.map(containerRef.current, { center: [CENTER.lat, CENTER.lng], zoom: 13, zoomControl: false });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO', maxZoom: 19,
        }).addTo(map);
        leafletRef.current = map;
        created = map;
        setEngine('leaflet');
        callbacks.current.onDataState?.({ dataState: 'unavailable', error: 'Base map only. Live traffic could not be loaded.' });
      } catch {
        if (!cancelled) { setEngine('error'); callbacks.current.onDataState?.({ dataState: 'unavailable' }); }
      }
    };
    window.gm_authFailure = fallback;
    (async () => {
      if (!apiKey?.trim()) return fallback();
      try {
        const google = await loadGoogleMaps(apiKey.trim());
        if (cancelled || !containerRef.current || leafletRef.current) return;
        const map = new google.maps.Map(containerRef.current, {
          center: CENTER, zoom: 13, disableDefaultUI: true, clickableIcons: false,
          styles: theme === 'day' ? GOOGLE_MAPS_DAY_STYLE : GOOGLE_MAPS_DARK_STYLE,
          gestureHandling: 'greedy', mapTypeControl: false, streetViewControl: false,
        });
        created = map;
        mapRef.current = map;
        const traffic = new google.maps.TrafficLayer({ autoRefresh: true });
        traffic.setMap(map);
        layerRef.current = traffic;
        setEngine('google');
      } catch { if (!cancelled) fallback(); }
    })();
    const observer = new ResizeObserver(() => {
      if (leafletRef.current) leafletRef.current.invalidateSize();
      else if (mapRef.current && window.google) window.google.maps.event.trigger(mapRef.current, 'resize');
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      cancelled = true;
      observer.disconnect();
      window.gm_authFailure = oldAuthFailure;
      layerRef.current?.setMap(null);
      linesRef.current.forEach(line => line.setMap(null));
      linesRef.current = [];
      popupRef.current?.close();
      userMarkerRef.current?.setMap(null);
      if (leafletRef.current && leafletRef.current === created) { leafletRef.current.remove(); leafletRef.current = null; }
      if (mapRef.current && mapRef.current === created) { window.google?.maps.event.clearInstanceListeners(created); mapRef.current = null; }
    };
    // The initialized map stays alive through data, selection and theme changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useEffect(() => {
    let cancelled = false;
    let pending = false;
    let controller;
    const collect = async () => {
      if (pending || document.visibilityState === 'hidden') return;
      pending = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 16000);
      callbacks.current.onDataState?.({ isFetching: true });
      try {
        const response = await fetch('/api/traffic', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Traffic service unavailable');
        const payload = await response.json();
        if (cancelled) return;
        const normalized = normalizeTraffic(payload);
        if (normalized.meta.dataState === 'unavailable') throw new Error('Traffic coverage unavailable');
        lastSnapshotRef.current = normalized;
        callbacks.current.onRealTrafficData?.(normalized.sections, normalized.meta);
      } catch (error) {
        if (cancelled) return;
        const previous = lastSnapshotRef.current;
        if (previous?.meta.lastUpdated && Date.now() - Date.parse(previous.meta.lastUpdated) < 15 * 60000) {
          callbacks.current.onRealTrafficData?.(previous.sections.map(s => ({ ...s, isStale: true })), { ...previous.meta, dataState: 'stale', error: 'Update failed. Showing the last successful observation.' });
        } else callbacks.current.onDataState?.({ dataState: 'unavailable', error: error.name === 'AbortError' ? 'Traffic request timed out.' : 'Traffic is temporarily unavailable. Try refresh.' });
      } finally {
        clearTimeout(timeout); pending = false;
        if (!cancelled) callbacks.current.onDataState?.({ isFetching: false });
      }
    };
    collect();
    const interval = setInterval(collect, 60000);
    const resume = () => { if (document.visibilityState === 'visible') collect(); };
    document.addEventListener('visibilitychange', resume);
    return () => { cancelled = true; controller?.abort(); clearInterval(interval); document.removeEventListener('visibilitychange', resume); };
  }, [refreshToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (engine !== 'google' || !map) return;
    map.setOptions({ styles: mapType === 'roadmap' ? (theme === 'day' ? GOOGLE_MAPS_DAY_STYLE : GOOGLE_MAPS_DARK_STYLE) : [], mapTypeId: mapType === 'satellite' ? 'hybrid' : 'roadmap' });
  }, [theme, mapType, engine]);

  useEffect(() => {
    if (engine !== 'google' || !mapRef.current) return;
    layerRef.current?.setMap(trafficEnabled ? mapRef.current : null);
    linesRef.current.forEach(line => line.setMap(null));
    linesRef.current = [];
    if (!trafficEnabled) return;
    if (focusedRoute?.path?.length) linesRef.current.push(new window.google.maps.Polyline({ map: mapRef.current, path: focusedRoute.path, strokeColor: '#007aff', strokeOpacity: 0.55, strokeWeight: 4, zIndex: 1, clickable: false }));
    const selectedId = selectedStreet?.id;
    for (const street of streets) {
      if (!street.path?.length) continue;
      const selected = street.id === selectedId;
      const line = new window.google.maps.Polyline({
        map: mapRef.current, path: street.path, strokeColor: street.color,
        strokeOpacity: selected ? 1 : 0.72, strokeWeight: selected ? 9 : 5,
        zIndex: selected ? 20 : 5, clickable: true,
      });
      line.addListener('click', () => callbacks.current.onSelectStreet?.(street));
      linesRef.current.push(line);
    }
    return () => { linesRef.current.forEach(line => line.setMap(null)); linesRef.current = []; };
  }, [streets, selectedStreet?.id, focusedRoute, trafficEnabled, engine]);

  useEffect(() => {
    const map = mapRef.current;
    if (!selectedStreet || engine !== 'google' || !map) { popupRef.current?.close(); lastFocusedRef.current = null; return; }
    const google = window.google;
    const userSelected = lastSelectionEventRef.current !== selectionToken;
    lastSelectionEventRef.current = selectionToken;
    if (lastFocusedRef.current !== selectedStreet.id || userSelected) {
      popupDismissedRef.current = false;
      const bounds = new google.maps.LatLngBounds();
      selectedStreet.path.forEach(point => bounds.extend(point));
      map.fitBounds(bounds, { top: 110, bottom: 80, left: 60, right: 60 });
      google.maps.event.addListenerOnce(map, 'idle', () => { if (map.getZoom() > 17) map.setZoom(17); });
      lastFocusedRef.current = selectedStreet.id;
    }
    if (popupDismissedRef.current) return;
    popupRef.current?.close();
    const length = selectedStreet.affectedLengthMeters >= 1000 ? `${(selectedStreet.affectedLengthMeters / 1000).toFixed(1)} km` : `${selectedStreet.affectedLengthMeters} m`;
    const popup = new google.maps.InfoWindow({
      position: selectedStreet.coordinates,
      content: `<div class="traffic-map-popup"><span class="popup-eyebrow">${selectedStreet.isStale ? 'OLDER OBSERVATION' : selectedStreet.isRoute ? 'MONITORED ROUTE' : 'SELECTED SECTION'}</span><h3>${escapeHTML(selectedStreet.name)}</h3><p>${escapeHTML(selectedStreet.isRoute ? (selectedStreet.level === 'normal' ? 'No slowdown reported' : selectedStreet.level === 'heavy' ? 'Heavy sections on this route' : 'Slow sections on this route') : selectedStreet.level === 'heavy' ? 'Heavy traffic' : 'Slow traffic')} · ${escapeHTML(length)} ${selectedStreet.isRoute ? "route" : "affected"}</p><p class="popup-muted">${escapeHTML(selectedStreet.sectionLabel)}</p><p class="popup-muted">Google traffic · Fetched ${escapeHTML(selectedStreet.lastUpdated ? new Date(selectedStreet.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'time unavailable')}</p></div>`,
      ariaLabel: selectedStreet.name, maxWidth: 300,
    });
    popup.addListener('closeclick', () => { popupDismissedRef.current = true; });
    popup.open({ map, shouldFocus: false });
    popupRef.current = popup;
  }, [selectedStreet, engine, selectionToken]);

  useEffect(() => {
    if (engine !== 'google' || !mapRef.current || !dataReady) return;
    if (hasFramedRef.current && lastFilterRef.current === filterKey) return;
    const initialCityView = !hasFramedRef.current && !selectedStreet;
    hasFramedRef.current = true;
    lastFilterRef.current = filterKey;
    const map = mapRef.current;
    if (initialCityView) {
      const bounds = new window.google.maps.LatLngBounds();
      monitoredRoutes.filter(route => route.area === 'Hazaribagh city').forEach(route => { bounds.extend(route.origin); bounds.extend(route.dest); });
      if (!bounds.isEmpty()) { map.fitBounds(bounds, 45); return; }
    }
    if (!streets.length) return;
    const bounds = new window.google.maps.LatLngBounds();
    streets.forEach(street => street.path.forEach(point => bounds.extend(point)));
    map.fitBounds(bounds, 60);
  }, [filterKey, streets, engine, dataReady]);

  const recenter = () => {
    callbacks.current.onSelectStreet?.(null);
    lastFocusedRef.current = null;
    popupRef.current?.close();
    if (mapRef.current) {
      if (streets.length) {
        const bounds = new window.google.maps.LatLngBounds();
        streets.forEach(street => street.path.forEach(point => bounds.extend(point)));
        mapRef.current.fitBounds(bounds, 60);
      } else { mapRef.current.panTo(CENTER); mapRef.current.setZoom(13); }
    }
    leafletRef.current?.setView([CENTER.lat, CENTER.lng], 13);
  };
  const locate = () => {
    if (!navigator.geolocation) { setLocationNote('Location is not supported by this browser.'); return; }
    setLocating(true); setLocationNote('');
    navigator.geolocation.getCurrentPosition(position => {
      setLocating(false);
      const point = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (mapRef.current && window.google) {
        userMarkerRef.current?.setMap(null);
        userMarkerRef.current = new window.google.maps.Marker({ map: mapRef.current, position: point, title: 'Your location', icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#38bdf8', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 } });
        mapRef.current.panTo(point); mapRef.current.setZoom(14);
      } else leafletRef.current?.setView([point.lat, point.lng], 14);
      setLocationNote('Location shown. Monitoring remains limited to Hazaribagh routes.');
    }, () => { setLocating(false); setLocationNote('Location access unavailable. You can still explore monitored routes.'); }, { timeout: 8000, maximumAge: 300000 });
  };

  return <div className={`map-half-container map-engine-${engine}`}>
    <div ref={containerRef} className="google-map-element" aria-label="Hazaribagh traffic map" />
    {engine === 'loading' && <div className="map-loading-state" role="status"><LoaderCircle className="spin-animation" size={24} /><span>Opening your traffic map…</span></div>}
    {engine === 'error' && <div className="map-loading-state" role="status"><MapPinned size={28} /><span>The map could not load. Please refresh.</span></div>}
    <MapCityTag cityName={city?.name || 'Hazaribagh'} mapEngine={engine} />
    <MapFloatingControls onZoomIn={() => { if (mapRef.current) mapRef.current.setZoom(Math.min(19, mapRef.current.getZoom() + 1)); else leafletRef.current?.zoomIn(); }} onZoomOut={() => { if (mapRef.current) mapRef.current.setZoom(Math.max(5, mapRef.current.getZoom() - 1)); else leafletRef.current?.zoomOut(); }} onRecenter={recenter} trafficEnabled={trafficEnabled} onToggleTraffic={() => setTrafficEnabled(v => !v)} mapEngine={engine} mapType={mapType} onToggleMapType={() => setMapType(v => v === 'roadmap' ? 'satellite' : 'roadmap')} />
    <button type="button" className="map-locate-button" onClick={locate} disabled={locating} aria-label="Show my location">{locating ? <LoaderCircle size={17} className="spin-animation" /> : <LocateFixed size={17} />}</button>
    <div className="map-data-caption"><span className="caption-full">{engine === 'google' ? 'Cards cover monitored Hazaribagh routes. Google’s traffic layer also shows unmonitored roads.' : engine === 'loading' ? 'Connecting to the traffic map…' : 'Base map only · Live traffic unavailable'}</span><span className="caption-compact">{engine === 'google' ? 'Cards: monitored roads only' : engine === 'loading' ? 'Opening traffic map…' : 'Base map · Traffic unavailable'}</span></div>
    {locationNote && <div className="map-location-note" role="status">{locationNote}<button type="button" onClick={() => setLocationNote('')} aria-label="Dismiss location message">×</button></div>}
  </div>;
}

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Map, List, PanelsTopLeft } from 'lucide-react';
import GoogleMapView from './GoogleMapView';
import './TrafficMapPage.css';
import monitoredRoutes from '../data/monitoredRoutes.json';
import RouteExplorer from './RouteExplorer';
import TrafficAlertModal from './TrafficAlertModal';
import { setSelectedStreet, setMobileView } from '../store/uiSlice';
import TelemetryHeader from './telemetry/TelemetryHeader';
import CongestionGaugeCard from './telemetry/CongestionGaugeCard';
import { heavyRouteTransitions } from '../services/trafficNotificationPolicy';
import { deviceNotificationsEnabled, sendMobileTrafficPush } from '../services/notificationService';
import CorridorCardsFeed from './telemetry/CorridorCardsFeed';

const COLORS = { heavy: '#f16d73', moderate: '#f4b557' };

export default function TrafficMapPage({ city, onBack, apiKey, theme = 'night', onToggleTheme }) {
  const dispatch = useDispatch();
  const mobileView = useSelector(state => state.ui.mobileView);
  const selectedStreet = useSelector(state => state.ui.selectedStreet);
  const [mapShare, setMapShare] = useState(.28);
  const sheetGesture = useRef(null);
  const sheetDragged = useRef(false);
  const [contentView, setContentView] = useState('updates');
  const [focusedRoute, setFocusedRoute] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sections, setSections] = useState([]);
  const [meta, setMeta] = useState({ dataState: 'loading', totalRoutes: monitoredRoutes.length, availableRoutes: 0, lastUpdated: null, isFetching: true });
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectionToken, setSelectionToken] = useState(0);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [now, setNow] = useState(Date.now);
  const closeAlerts = useCallback(() => setAlertsOpen(false), []);

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer); }, []);
  const handleData = useCallback((values, status) => {
    setSections(values.map(section => ({ ...section, color: COLORS[section.level], badgeText: section.level === 'heavy' ? 'Heavy traffic' : 'Slow traffic' })));
    setMeta(previous => ({ ...previous, ...status, error: status.error || null, isFetching: false }));
    setNow(Date.now());
  }, []);
  const handleState = useCallback(status => {
    if (status.dataState === 'unavailable') setSections([]);
    setMeta(previous => ({ ...previous, ...status, ...(status.dataState === 'unavailable' ? { isFetching: false, availableRoutes: 0 } : {}) }));
  }, []);
  const lastTime = meta.lastUpdated ? Date.parse(meta.lastUpdated) : null;
  const dataState = lastTime && now - lastTime > 180000 && meta.dataState === 'fresh' ? 'stale' : meta.dataState;
  const streets = useMemo(() => sections.map(section => ({ ...section, isStale: section.isStale || dataState === 'stale' || dataState === 'unavailable' })), [sections, dataState]);
  const filtered = useMemo(() => streets.filter(street => (!focusedRoute || street.routeId === focusedRoute) && (activeFilter === 'all' || street.level === activeFilter)), [streets, activeFilter, focusedRoute]);
  const routeSummaries = useMemo(() => (meta.routeSummaries || []).map(route => ({ ...route, isStale: route.isStale || dataState === 'stale' || dataState === 'unavailable' })), [meta.routeSummaries, dataState]);
  const notificationStates = useRef(null);
  useEffect(() => {
    if (!routeSummaries.length) return;
    const next = heavyRouteTransitions(notificationStates.current, routeSummaries);
    notificationStates.current = next.states;
    if (!deviceNotificationsEnabled()) return;
    const candidates = next.entered.filter(route => {
      try { return Date.now() - Number(localStorage.getItem(`gatilive-notified:${route.routeId}`) || 0) > 10 * 60000; } catch { return false; }
    });
    if (!candidates.length) return;
    const names = candidates.slice(0, 3).map(route => route.name).join('; ');
    sendMobileTrafficPush({ title: 'Heavy traffic in Hazaribagh', body: `${names}${candidates.length > 3 ? ` and ${candidates.length - 3} more routes` : ''}. Updated Google traffic on monitored roads.`, tag: 'gatilive-new-heavy' }).then(sent => {
      if (sent) candidates.forEach(route => { try { localStorage.setItem(`gatilive-notified:${route.routeId}`, String(Date.now())); } catch { /* Alert delivery does not depend on storing history. */ } });
    });
  }, [routeSummaries]);
  const routeOverview = routeSummaries.find(route => route.routeId === focusedRoute);
  const selected = selectedStreet ? filtered.find(street => street.id === selectedStreet.id) || null : routeOverview || null;
  const heavy = streets.filter(street => street.level === 'heavy');
  const summary = {
    ...meta, dataState,
    updateAge: lastTime ? (now - lastTime < 60000 ? "Updated just now" : `Updated ${Math.floor((now - lastTime) / 60000)} min ago`) : "Waiting for update",
    totalCount: streets.length,
    heavyCount: heavy.length,
    moderateCount: streets.filter(street => street.level === 'moderate').length,
    lastUpdatedTime: lastTime ? new Date(lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not yet available',
    statusLabel: dataState === 'unavailable' ? 'Traffic data unavailable' : dataState === 'loading' ? 'Checking monitored roads' : dataState === 'stale' ? 'Showing an older observation' : dataState === 'partial' ? 'Some routes are unavailable' : streets.length ? 'Traffic at a glance' : 'No slow sections reported',
  };
  const refresh = () => {
    if (meta.isFetching) return;
    setMeta(previous => ({ ...previous, isFetching: true, error: null }));
    setRefreshToken(value => value + 1);
  };
  const selectStreet = useCallback(street => {
    dispatch(setSelectedStreet(street));
    setSelectionToken(value => value + 1);
    if (street && window.matchMedia('(max-width: 899px)').matches && mobileView === 'feed') dispatch(setMobileView('map'));
  }, [dispatch, mobileView]);
  const changeFilter = value => { setActiveFilter(value); dispatch(setSelectedStreet(null)); };

  const resizeSheet = event => {
    const gesture = sheetGesture.current;
    if (!gesture) return;
    const delta = event.clientY - gesture.y;
    if (Math.abs(delta) > 4) sheetDragged.current = true;
    setMapShare(Math.max(.18, Math.min(.36, gesture.share + delta / gesture.height)));
  };
  return <div className={`traffic-dashboard-viewport mobile-view-${mobileView} ${mapShare < .23 ? 'sheet-expanded' : ''}`} style={{ '--map-share': mapShare }}>

    <aside className={`telemetry-panel ${mobileView === 'map' ? 'hidden-on-mobile' : ''}`} aria-label="Monitored traffic sections">
      <button type="button" className="traffic-sheet-handle" aria-label="Resize traffic panel" aria-description="Drag up or down. The panel stops before traffic cards become hidden. Use arrow keys to resize." onPointerDown={event => { sheetDragged.current = false; sheetGesture.current = { y: event.clientY, share: mapShare, height: event.currentTarget.closest('.traffic-dashboard-viewport').clientHeight }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={resizeSheet} onPointerUp={event => { sheetGesture.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { sheetGesture.current = null; sheetDragged.current = true; }} onClick={() => { if (!sheetDragged.current) setMapShare(value => value < .23 ? .28 : .18); }} onKeyDown={event => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); setMapShare(value => Math.max(.18, Math.min(.36, value + (event.key === 'ArrowUp' ? -.04 : .04)))); } }}><span /></button>
      <TelemetryHeader city={city} onBack={onBack} onOpenAlerts={() => setAlertsOpen(true)} alertCount={heavy.length} dataState={dataState} totalRoutes={meta.totalRoutes} availableRoutes={meta.availableRoutes} isRefreshing={meta.isFetching} onManualRefresh={refresh} theme={theme} onToggleTheme={onToggleTheme} />
      <div className="telemetry-scroll-body">
        <CongestionGaugeCard summary={summary} activeFilter={contentView === 'updates' ? activeFilter : null} onSelectFilter={value => { changeFilter(value); setFocusedRoute(null); setContentView('updates'); if (mobileView === 'map') dispatch(setMobileView('split')); }} />
        {meta.connectionState === 'offline' || meta.connectionState === 'recovering' ? <div className="traffic-recovery-status" role="status"><span>{meta.connectionState === 'offline' ? 'Offline · Waiting for connection' : `Retry scheduled${meta.nextRetryAt ? ` · ${new Date(meta.nextRetryAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}`}</span><button type="button" onClick={refresh} disabled={meta.isFetching || meta.connectionState === 'offline'}>Retry now</button></div> : null}
        <nav className="workspace-tabs" aria-label="Traffic workspace"><button type="button" aria-pressed={contentView === 'updates'} onClick={() => setContentView('updates')}>Affected roads <span>{new Set(streets.map(street => street.routeId)).size}</span></button><button type="button" aria-pressed={contentView === 'roads'} onClick={() => setContentView('roads')}>Your roads <span>{meta.totalRoutes}</span></button></nav>
        {contentView === 'roads' && <RouteExplorer routes={routeSummaries} selectedId={focusedRoute} onSelect={route => { setFocusedRoute(route?.routeId || null); dispatch(setSelectedStreet(null)); setSelectionToken(value => value + 1); }} />}
        {contentView === 'updates' && <>
        {focusedRoute && <button type="button" className="show-all-roads" onClick={() => { setFocusedRoute(null); dispatch(setSelectedStreet(null)); }}>Show updates from all roads</button>}
        {routeOverview && <div className="section-heading affected-heading"><h2>{routeOverview.name}</h2><span>{filtered.length} sections</span></div>}
        {meta.error && <details className="traffic-data-notice"><summary>{dataState === 'unavailable' ? 'Traffic update unavailable' : 'Update failed · Showing older data'}</summary><p>{meta.error}</p></details>}
        <CorridorCardsFeed key={`${activeFilter}:${focusedRoute || "all"}`} isRefreshing={meta.isFetching} streets={filtered} selectedStreet={selected} onSelectStreet={selectStreet} updatedTime={summary.lastUpdatedTime} dataState={dataState} activeFilter={activeFilter} />
        </>}
      </div>
      <footer className="coverage-footer"><span className={`coverage-dot ${dataState}`} />Google Routes · {meta.availableRoutes}/{meta.totalRoutes} routes available<span>Hazaribagh city + approaches · Every minute while open</span></footer>
    </aside>
    <main className={`map-display-panel ${mobileView === 'feed' ? 'hidden-on-mobile' : ''}`} aria-label="Live traffic map">
      <GoogleMapView city={city} streets={dataState === 'unavailable' ? [] : filtered} focusedRoute={routeOverview} selectedStreet={selected} apiKey={apiKey} theme={theme} onRealTrafficData={handleData} onDataState={handleState} onSelectStreet={selectStreet} refreshToken={refreshToken} filterKey={`${activeFilter}:${focusedRoute || "all"}`} selectionToken={selectionToken} dataReady={['fresh', 'partial', 'stale'].includes(dataState)} />
    </main>
    <nav className="mobile-view-switcher" aria-label="Mobile traffic view">
      {[['split', PanelsTopLeft, 'Explore'], ['map', Map, 'Map'], ['feed', List, 'Sections']].map(([value, Icon, label]) => <button key={value} type="button" aria-pressed={mobileView === value} onClick={() => dispatch(setMobileView(value))}><Icon size={16} /><span>{label}</span></button>)}
    </nav>
    <TrafficAlertModal isOpen={alertsOpen} onClose={closeAlerts} cityName="Hazaribagh" streets={heavy} dataState={dataState} onSelectStreet={street => { selectStreet(street); setActiveFilter('all'); setAlertsOpen(false); }} />
  </div>;
}

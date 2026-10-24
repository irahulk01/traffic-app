import React from 'react';
import { ArrowRight, MapPin, Radio, Route, ShieldCheck } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import TrafficAlertModal from './TrafficAlertModal';
import SearchHeader from './search/SearchHeader';
import PriorityHubsCarousel from './search/PriorityHubsCarousel';
import { openNotificationDrawer, closeNotificationDrawer } from '../store/notificationsSlice';

const MONITORED_TRAFFIC_HUBS = [{
  name: 'Hazaribagh',
  division: 'Hazaribagh urban roads and approaches',
  state: 'Jharkhand',
  lat: 23.9924,
  lng: 85.3616,
  landmark: 'Jhanda Chowk and Matwari',
}];

export default function CitySearchPage({ onSelectCity, theme = 'night', onToggleTheme }) {
  const dispatch = useDispatch();
  const isAlertModalOpen = useSelector((state) => state.notifications.isOpen);
  const hubs = MONITORED_TRAFFIC_HUBS.map((hub) => ({
    ...hub,
    statusLevel: 'unknown',
    statusLabel: 'Open the map to view the latest available data',
    corridorSummary: '7 monitored routes',
  }));

  return (
    <div className="search-page-scroll-wrap">
      <SearchHeader theme={theme} onToggleTheme={onToggleTheme} onOpenAlerts={() => dispatch(openNotificationDrawer())} />
      <main className="landing-content">
        <section className="landing-hero">
          <div className="landing-copy">
            <div className="landing-kicker"><span className="landing-kicker-dot" /> HAZARIBAGH · TRAFFIC OVERVIEW</div>
            <h1>Know the roads.<br /><span>Move with clarity.</span></h1>
            <p>Explore traffic on Hazaribagh’s key routes. Find slow stretches, locate the affected section, and check the latest available conditions.</p>
            <button className="landing-primary-action" type="button" onClick={() => onSelectCity(hubs[0])}>
              Open traffic map <ArrowRight size={17} />
            </button>
          </div>
          <div className="landing-map-art" aria-hidden="true">
            <div className="art-grid" /><div className="art-road art-road-one" /><div className="art-road art-road-two" />
            <div className="art-road art-road-three" /><div className="art-route-line" />
            <span className="art-pin art-pin-one" /><span className="art-pin art-pin-two" /><span className="art-pin art-pin-three" />
            <div className="art-location-label"><MapPin size={13} /> Hazaribagh</div>
            <div className="art-data-chip"><Radio size={13} /> Route overview</div>
          </div>
        </section>

        <section className="coverage-strip" aria-label="Monitoring coverage">
          <div className="coverage-item"><Route size={18} /><div><strong>7 monitored routes</strong><span>Selected Hazaribagh routes</span></div></div>
          <div className="coverage-divider" />
          <div className="coverage-item"><ShieldCheck size={18} /><div><strong>Find the affected stretch</strong><span>Select a section to locate it</span></div></div>
          <div className="coverage-divider" />
          <div className="coverage-item"><Radio size={18} /><div><strong>Google traffic data</strong><span>Update times shown clearly</span></div></div>
        </section>

        <section className="landing-monitor-section">
          <div className="landing-section-heading"><div><span className="section-overline">YOUR MONITORING AREA</span><h2>Hazaribagh traffic</h2><p>Key routes around town and its approaches.</p></div><span className="coverage-count-pill">7 routes monitored</span></div>
          <PriorityHubsCarousel hubs={hubs} onSelectCity={onSelectCity} />
        </section>
        <footer className="landing-footer"><span>Traffic conditions can change between provider updates.</span><span>GatiLive <span className="footer-separator">·</span> Monitoring view</span></footer>
      </main>
      <TrafficAlertModal isOpen={isAlertModalOpen} onClose={() => dispatch(closeNotificationDrawer())} onSelectStreet={(street) => {
        if (street?.coordinates) onSelectCity({ name: street.cityName || street.name, lat: street.coordinates.lat, lng: street.coordinates.lng });
        dispatch(closeNotificationDrawer());
      }} />
    </div>
  );
}

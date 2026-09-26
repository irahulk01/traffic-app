import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Activity } from 'lucide-react';
import { searchIndianCities, findNearestIndianCity } from '../data/citiesService';
import TrafficAlertModal from './TrafficAlertModal';
import { getCityTrafficData } from '../data/trafficEngine';
import SearchHeader from './search/SearchHeader';
import PriorityHubsCarousel from './search/PriorityHubsCarousel';
import { openNotificationDrawer, closeNotificationDrawer } from '../store/notificationsSlice';

// Verified Priority Monitored Regional & Urban Traffic Hubs (Jharkhand Focus)
// Contains ONLY geographic metadata — NO hardcoded traffic status.
export const MONITORED_TRAFFIC_HUBS = [
  {
    name: 'Hazaribagh',
    division: 'Hazaribagh Urban & NH Transit',
    state: 'Jharkhand',
    lat: 23.9924,
    lng: 85.3616,
    landmark: 'Jhanda Chowk & Matwari Ring Road',
  }
];

export default function CitySearchPage({ onSelectCity, theme = 'night', onToggleTheme }) {
  const dispatch = useDispatch();
  const isAlertModalOpen = useSelector((state) => state.notifications.isOpen);

  // Display predefined regional hubs without fake live data
  const liveHubs = useMemo(() => {
    return MONITORED_TRAFFIC_HUBS.map((hub) => ({
      ...hub,
      statusLevel: 'none',
      delayText: 'Live tracking active',
      statusLabel: 'Click to view live traffic',
      corridorSummary: 'Monitoring 50km radius',
    }));
  }, []);



  return (
    <div className="search-page-scroll-wrap">
      {/* 1. Header Bar */}
      <SearchHeader
        theme={theme}
        onToggleTheme={onToggleTheme}
        onOpenAlerts={() => dispatch(openNotificationDrawer())}
      />

      {/* 2. Hero Section */}
      <section className="hero-command-section">
        <div className="hero-text-content">
          <div className="hero-eyebrow">
            <Activity size={13} className="eyebrow-icon" />
            <span>Real-Time Traffic Telemetry</span>
          </div>
          <h1 className="hero-heading">
            Live City Traffic & <span>Congestion Layers</span>
          </h1>
          <p className="hero-description">
            Monitor arterial transit delays, live congestion heatmaps, and major choke points across India.
          </p>
        </div>
      </section>

      {/* 4. Featured Monitored Traffic Hubs Slidable Carousel */}
      <PriorityHubsCarousel
        hubs={liveHubs}
        onSelectCity={onSelectCity}
      />

      {/* 7. Traffic Alerts Drawer Modal */}
      <TrafficAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => dispatch(closeNotificationDrawer())}
        onSelectStreet={(street) => {
          if (street && street.coordinates) {
            onSelectCity({
              name: street.cityName || street.name,
              lat: street.coordinates.lat,
              lng: street.coordinates.lng,
            });
          }
          dispatch(closeNotificationDrawer());
        }}
      />
    </div>
  );
}

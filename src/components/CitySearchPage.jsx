import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Activity } from 'lucide-react';
import { searchIndianCities, findNearestIndianCity } from '../data/citiesService';
import TrafficAlertModal from './TrafficAlertModal';
import { getCityTrafficData } from '../data/trafficEngine';
import SearchHeader from './search/SearchHeader';
import SearchIslandBar from './search/SearchIslandBar';
import PriorityHubsCarousel from './search/PriorityHubsCarousel';
import CitySearchResults from './search/CitySearchResults';
import { openNotificationDrawer, closeNotificationDrawer } from '../store/notificationsSlice';
import { saveUserLocation } from '../store/uiSlice';
import { detectCityByIP } from '../services/ipLocationService';

// Verified Priority Monitored Regional & Urban Traffic Hubs (Jharkhand Focus)
export const MONITORED_TRAFFIC_HUBS = [
  {
    name: 'Hazaribagh',
    division: 'Hazaribagh Urban & NH Transit',
    state: 'Jharkhand',
    lat: 23.9924,
    lng: 85.3616,
    statusLevel: 'heavy',
    statusLabel: 'Choke Point at Jhanda Chowk & NH-33 Link',
    delayText: '+18 mins delay',
    corridorSummary: '2 Heavy • 1 Moderate • 2 Clear',
    landmark: 'Jhanda Chowk & Matwari Ring Road',
  },
  {
    name: 'Giridih',
    division: 'Giridih Central & GT Axis',
    state: 'Jharkhand',
    lat: 24.2500,
    lng: 85.9167,
    statusLevel: 'heavy',
    statusLabel: 'Dense Market Bottleneck at Makatpur Chowk',
    delayText: '+14 mins delay',
    corridorSummary: '1 Heavy • 2 Moderate • 2 Clear',
    landmark: 'Makatpur Chowk & Station Road',
  },
  {
    name: 'Ranchi',
    division: 'Ranchi Metropolitan Area',
    state: 'Jharkhand',
    lat: 23.3432,
    lng: 85.3094,
    statusLevel: 'heavy',
    statusLabel: 'Severe Congestion at Kantatoli & Main Road',
    delayText: '+22 mins delay',
    corridorSummary: '3 Heavy • 2 Moderate • 1 Clear',
    landmark: 'Kantatoli Flyover & Albert Ekka Chowk',
  },
  {
    name: 'Jamshedpur',
    division: 'Steel City & Marine Drive Axis',
    state: 'Jharkhand',
    lat: 22.8046,
    lng: 86.2029,
    statusLevel: 'heavy',
    statusLabel: 'Industrial Transit Rush at Sakchi & Bistupur',
    delayText: '+20 mins delay',
    corridorSummary: '2 Heavy • 2 Moderate • 1 Clear',
    landmark: 'Sakchi Roundabout & Marine Drive',
  },
  {
    name: 'Dhanbad',
    division: 'Coal Belt & Station Road Network',
    state: 'Jharkhand',
    lat: 23.7957,
    lng: 86.4304,
    statusLevel: 'heavy',
    statusLabel: 'Severe Choke Point at Bank More & Station Road',
    delayText: '+24 mins delay',
    corridorSummary: '2 Heavy • 2 Moderate • 1 Clear',
    landmark: 'Bank More Flyover & Shramik Chowk',
  },
];

export default function CitySearchPage({ onSelectCity, theme = 'night', onToggleTheme }) {
  const dispatch = useDispatch();
  const isAlertModalOpen = useSelector((state) => state.notifications.isOpen);

  const [searchQuery, setSearchQuery] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectError, setDetectError] = useState('');

  // Handle GPS / IP location detection and save in localStorage
  const handleDetectLocation = async () => {
    setIsDetecting(true);
    setDetectError('');

    const saveAndProceed = (locationObj) => {
      dispatch(saveUserLocation(locationObj));
      setIsDetecting(false);
      onSelectCity(locationObj);
    };

    const fallbackToIP = async () => {
      try {
        const ipData = await detectCityByIP();
        if (ipData && ipData.lat && ipData.lng) {
          const loc = {
            name: ipData.city || 'My Location',
            state: ipData.state || 'India',
            lat: ipData.lat,
            lng: ipData.lng,
            ip: ipData.ip || null,
            source: 'ip',
          };
          saveAndProceed(loc);
          return;
        }
      } catch (err) {
        console.warn('IP location detection failed:', err);
      }

      // Default fallback if both GPS and IP fail
      const defaultHub = MONITORED_TRAFFIC_HUBS[0] || {
        name: 'Hazaribagh',
        state: 'Jharkhand',
        lat: 23.9924,
        lng: 85.3616,
      };
      saveAndProceed(defaultHub);
    };

    if ('geolocation' in navigator) {
      let isHandled = false;

      // Timeout fallback: if browser GPS prompt is ignored or takes too long, fall back to IP
      const gpsTimeout = setTimeout(async () => {
        if (!isHandled) {
          isHandled = true;
          await fallbackToIP();
        }
      }, 3500);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (isHandled) return;
          isHandled = true;
          clearTimeout(gpsTimeout);

          const { latitude, longitude } = position.coords;
          const nearestCity = findNearestIndianCity(latitude, longitude);

          let detectedIp = null;
          try {
            const ipInfo = await detectCityByIP();
            detectedIp = ipInfo?.ip || null;
          } catch {
            // ignore
          }

          const locationData = {
            name: nearestCity?.name || 'My Location',
            state: nearestCity?.state || 'India',
            lat: latitude,
            lng: longitude,
            ip: detectedIp,
            source: 'gps',
          };

          saveAndProceed(locationData);
        },
        async (geoError) => {
          if (isHandled) return;
          isHandled = true;
          clearTimeout(gpsTimeout);
          console.warn('GPS prompt denied or unavailable, trying IP geolocation:', geoError);
          await fallbackToIP();
        },
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 }
      );
    } else {
      await fallbackToIP();
    }
  };

  // Compute live hub conditions dynamically based on real-time traffic status
  const liveHubs = useMemo(() => {
    return MONITORED_TRAFFIC_HUBS.map((hub) => {
      const live = getCityTrafficData(hub);
      const hasHeavy = live.summary.heavyCount > 0;
      const hasModerate = live.summary.moderateCount > 0;
      const statusLevel = hasHeavy ? 'heavy' : hasModerate ? 'moderate' : 'none';
      const delayText = hasHeavy
        ? `+${live.streets.find((s) => s.level === 'heavy')?.delayMinutes || 12}m delay`
        : hasModerate
        ? '+5m delay'
        : 'Normal Flow (Clear)';
      const statusLabel = hasHeavy
        ? `Choke Point at ${live.streets.find((s) => s.level === 'heavy')?.name || hub.landmark}`
        : hasModerate
        ? 'Moderate Flow'
        : 'Free Flowing • Normal Traffic';

      return {
        ...hub,
        statusLevel,
        delayText,
        statusLabel,
        corridorSummary: `${live.summary.heavyCount} High Traffic • ${live.summary.moderateCount} Moderate • ${live.summary.lowCount + live.summary.noneCount} Clear`,
      };
    });
  }, []);

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchIndianCities(searchQuery, 12);
  }, [searchQuery]);

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

        {/* 3. High-Contrast Smart Search Bar */}
        <SearchIslandBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery('')}
          isDetecting={isDetecting}
          onDetectLocation={handleDetectLocation}
          detectError={detectError}
        />
      </section>

      {/* 4. Featured Monitored Traffic Hubs Slidable Carousel */}
      {!searchQuery && (
        <PriorityHubsCarousel
          hubs={liveHubs}
          onSelectCity={onSelectCity}
        />
      )}

      {/* 6. On-Demand Search Results */}
      {searchQuery && (
        <CitySearchResults
          searchQuery={searchQuery}
          searchResults={searchResults}
          onSelectCity={onSelectCity}
        />
      )}

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

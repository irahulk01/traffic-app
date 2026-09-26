import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import GoogleMapView from './GoogleMapView';
import TrafficAlertModal from './TrafficAlertModal';
import {
  openNotificationDrawer,
  closeNotificationDrawer,
} from '../store/notificationsSlice';
import {
  setSelectedStreet,
  setGpsLocality,
} from '../store/uiSlice';
import { useCityTraffic } from '../queries/useCityTraffic';
import { getSeverityColors } from '../data/trafficEngine';
import TelemetryHeader from './telemetry/TelemetryHeader';
import CongestionGaugeCard from './telemetry/CongestionGaugeCard';
import SeverityFilterBar from './telemetry/SeverityFilterBar';
import CorridorCardsFeed from './telemetry/CorridorCardsFeed';

export default function TrafficMapPage({
  city,
  onSelectCity,
  onBack,
  apiKey,
  theme = 'night',
}) {
  const dispatch = useDispatch();

  // Redux state
  const isAlertModalOpen = useSelector((state) => state.notifications.isOpen);
  const mobileView = useSelector((state) => state.ui.mobileView);
  const selectedStreet = useSelector((state) => state.ui.selectedStreet);
  const gpsLocality = useSelector((state) => state.ui.gpsLocality);

  // Local filter
  const [activeFilter, setActiveFilter] = useState('all');

  // Real traffic data from DirectionsService — { corridorId: { level, realSpeed, ... } }
  // Updated once per city (on map load), cached 10 min inside GoogleMapView
  const [realTrafficMap, setRealTrafficMap] = useState({});

  const [dynamicStreets, setDynamicStreets] = useState([]);
  const [isFetchingTraffic, setIsFetchingTraffic] = useState(true);
  
  // Local map theme decoupled from global application theme
  const [mapTheme, setMapTheme] = useState(theme);

  // 2. Map real DirectionsService traffic levels onto the dynamically discovered geographic corridors.
  const streets = useMemo(() => {
    if (!realTrafficMap || Object.keys(realTrafficMap).length === 0) return [];
    if (!dynamicStreets || dynamicStreets.length === 0) return [];

    return dynamicStreets
      .filter((street) => realTrafficMap[street.id] !== undefined)
      .map((street) => {
        const real = realTrafficMap[street.id];
        // 'checking' is a placeholder while Directions API is in-flight
        const displayLevel = real.level === 'checking' ? 'none' : real.level;
        const severity = getSeverityColors(displayLevel);

        return {
          ...street,
          level: displayLevel,
          isChecking: real.level === 'checking',
          isStale: real.isStale,
          intervalCount: real.intervalCount || 0,
          color: real.level === 'checking' ? '#64748b' : severity.color,
          colorName: severity.colorName,
          badgeText: real.level === 'checking' ? 'Checking...' : severity.badgeText,
          cardClass: real.level === 'checking' ? 'level-checking' : severity.cardClass,
          speed: real.realSpeed || 0,
          advisory: real.level === 'checking'
            ? 'Fetching live traffic data...'
            : (real.trafficDuration ? `Expected duration: ${real.trafficDuration}` : 'Normal flow'),
          trafficAdvisory: real.level === 'checking'
            ? 'Fetching live traffic data...'
            : (real.trafficDuration ? `Expected duration: ${real.trafficDuration}` : 'Normal flow'),
          delay: real.level === 'checking'
            ? 'Live data incoming...'
            : (real.normalDuration && real.durationRatio > 1
              ? `+${Math.max(1, Math.round((real.durationRatio - 1) * parseInt(real.normalDuration) || 0))} mins delay`
              : 'No Delays (Free Flow)'),
        };
      });
  }, [dynamicStreets, realTrafficMap]);

  // 3. Recompute summary from merged streets (real traffic levels considered)
  const summary = useMemo(() => {
    if (streets.length === 0) {
      let label = 'No significant traffic detected nearby.';
      if (isFetchingTraffic === 'error') {
        label = 'Location access is required to monitor nearby traffic.';
      } else if (isFetchingTraffic) {
        label = 'Loading live traffic...';
      }
      return {
        congestionScore: 0,
        statusLabel: label,
        avgSpeed: 0,
        heavyCount: 0,
        moderateCount: 0,
        lowCount: 0,
        noneCount: 0,
        totalCount: 0,
        lastUpdatedTime: new Date().toLocaleTimeString([], {
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }),
      };
    }

    const heavyCount = streets.filter((s) => s.level === 'heavy').length;
    const moderateCount = streets.filter((s) => s.level === 'moderate').length;
    const lowCount = streets.filter((s) => s.level === 'low').length;
    const noneCount = streets.filter((s) => s.level === 'none').length;
    const totalCount = streets.length;
    const avgSpeed = Math.round(streets.reduce((sum, s) => sum + s.speed, 0) / (totalCount || 1));
    const congestionScore = Math.round(
      ((heavyCount * 1.0 + moderateCount * 0.5 + lowCount * 0.1) / totalCount) * 100,
    );

    let statusLabel = 'Normal Flow';
    let statusColor = '#22c55e';
    if (congestionScore >= 55) { statusLabel = 'Critical Traffic Delay'; statusColor = '#ef4444'; }
    else if (congestionScore >= 30) { statusLabel = 'Moderate Congestion'; statusColor = '#f97316'; }

    return {
      congestionScore,
      statusLabel,
      statusColor,
      avgSpeed,
      heavyCount,
      moderateCount,
      lowCount,
      noneCount,
      totalCount,
      lastUpdatedTime: new Date().toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }),
    };
  }, [streets]);

  // 4. Filter and SORT corridors based on severity
  const filteredStreets = useMemo(() => {
    if (!streets || streets.length === 0) return [];
    
    let result = streets;
    if (activeFilter === 'heavy') result = streets.filter((s) => s.level === 'heavy');
    else if (activeFilter === 'moderate') result = streets.filter((s) => s.level === 'moderate');
    else if (activeFilter === 'normal' || activeFilter === 'low' || activeFilter === 'none') {
      result = streets.filter((s) => s.level === 'low' || s.level === 'none' || s.level === 'normal');
    } else if (activeFilter !== 'all') {
      result = streets.filter((s) => s.level === activeFilter);
    }
    
    // Guarantee heavy traffic is always forced to the very top, followed by size
    return [...result].sort((a, b) => {
      if (a.level === 'heavy' && b.level !== 'heavy') return -1;
      if (b.level === 'heavy' && a.level !== 'heavy') return 1;
      return (b.intervalCount || 0) - (a.intervalCount || 0);
    });
  }, [streets, activeFilter]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleManualRefresh = () => {
    setIsFetchingTraffic(true);
    // Clear cached real traffic for this city so DirectionsService re-runs
    setRealTrafficMap({});
  };

  const handleSelectStreet = (street) => {
    dispatch(setSelectedStreet(street));
  };

  // Called by GoogleMapView when GPS reverse geocoding resolves
  const handleGpsLocality = useCallback((localityInfo) => {
    dispatch(setGpsLocality(localityInfo));
  }, [dispatch]);

  // Called by GoogleMapView when DirectionsService real traffic data is ready
  const handleRealTrafficData = useCallback((trafficMapData, discoveredStreets) => {
    setIsFetchingTraffic(false);
    if (discoveredStreets) {
      setDynamicStreets(discoveredStreets);
    }
    setRealTrafficMap(trafficMapData);
  }, []);

  return (
    <div className={`traffic-dashboard-viewport mobile-view-${mobileView}`}>
      {/* LEFT / PRIMARY TELEMETRY PANEL */}
      <aside className={`telemetry-panel ${mobileView === 'map' ? 'hidden-on-mobile' : ''}`}>
        {/* Navigation & Status Header */}
        <TelemetryHeader
          city={city}
          onBack={onBack}
          onOpenAlerts={() => dispatch(openNotificationDrawer())}
          isRefreshing={isFetchingTraffic}
          onManualRefresh={handleManualRefresh}
          gpsLocality={gpsLocality}
          theme={mapTheme}
          onToggleTheme={() => setMapTheme((prev) => (prev === 'day' ? 'night' : 'day'))}
        />

        {/* Scrollable Telemetry Body */}
        <div className="telemetry-scroll-body">
          {/* Real-Time Jurisdiction Summary Card */}
          <CongestionGaugeCard summary={summary} />

          {/* Severity Filter Tabs */}
          <SeverityFilterBar
            activeFilter={activeFilter}
            onSelectFilter={setActiveFilter}
            summary={summary}
          />

          {/* Arterial Corridors Feed */}
          <CorridorCardsFeed
            streets={filteredStreets}
            selectedStreet={selectedStreet}
            onSelectStreet={handleSelectStreet}
            updatedTime={summary.lastUpdatedTime}
          />
        </div>
      </aside>

      {/* RIGHT / MAP DISPLAY PANEL */}
      <main className={`map-display-panel ${mobileView === 'feed' ? 'hidden-on-mobile' : ''}`}>
        <GoogleMapView
          city={city}
          streets={streets}
          selectedStreet={selectedStreet}
          apiKey={apiKey}
          theme={mapTheme}
          onGpsLocality={handleGpsLocality}
          onRealTrafficData={handleRealTrafficData}
          onGpsError={() => setIsFetchingTraffic('error')}
        />
      </main>

      {/* Bottleneck Alerts Modal connected via Redux */}
      <TrafficAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => dispatch(closeNotificationDrawer())}
        cityName={city.name}
        onSelectStreet={(street) => {
          handleSelectStreet(street);
          dispatch(closeNotificationDrawer());
        }}
      />
    </div>
  );
}

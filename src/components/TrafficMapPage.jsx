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

  // 1. TanStack Query: static corridor telemetry (local compute, 10-min cache)
  const {
    data: trafficData,
    isLoading,
    isFetching,
    refetch,
  } = useCityTraffic(city);

  // Base streets from local trafficEngine (static estimates)
  const baseStreets = useMemo(() => trafficData?.streets || [], [trafficData?.streets]);

  // 2. Merge real DirectionsService traffic levels into the static corridors.
  //    When realTrafficMap has data for a corridor, its level + speed override
  //    the static estimate. Color and badge are recalculated accordingly.
  const streets = useMemo(() => {
    if (Object.keys(realTrafficMap).length === 0) return baseStreets;

    return baseStreets.map((street) => {
      const real = realTrafficMap[street.id];
      if (!real) return street;

      // Only update if the real level actually differs from static
      if (real.level === street.level && real.realSpeed === street.speed) return street;

      const severity = getSeverityColors(real.level);

      return {
        ...street,
        level: real.level,
        color: severity.color,
        colorName: severity.colorName,
        badgeText: severity.badgeText,
        cardClass: severity.cardClass,
        speed: real.realSpeed || street.speed,
        // Append real duration info to the advisory if available
        trafficAdvisory: real.trafficDuration
          ? `${street.trafficAdvisory || street.advisory || ''} • ${real.trafficDuration} with traffic`
          : street.trafficAdvisory || street.advisory,
        advisory: real.trafficDuration
          ? `${street.advisory || ''} • ${real.trafficDuration} with traffic`
          : street.advisory,
        // Keep static delay text unless we have real data
        delay: real.normalDuration
          ? `+${Math.max(0, Math.round((real.durationRatio - 1) * parseFloat(real.normalDuration) || 0))} mins delay`
          : street.delay,
      };
    });
  }, [baseStreets, realTrafficMap]);

  // 3. Recompute summary from merged streets (real traffic levels considered)
  const summary = useMemo(() => {
    if (streets.length === 0) {
      return trafficData?.summary || {
        congestionScore: 0,
        statusLabel: 'Syncing Data...',
        avgSpeed: 0,
        heavyCount: 0,
        moderateCount: 0,
        lowCount: 0,
        noneCount: 0,
        totalCount: 0,
        lastUpdatedTime: 'Just now',
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
  }, [streets, trafficData?.summary]);

  // 4. Filter corridors based on severity
  const filteredStreets = useMemo(() => {
    if (!streets || streets.length === 0) return [];
    if (activeFilter === 'all') return streets;
    if (activeFilter === 'heavy') return streets.filter((s) => s.level === 'heavy');
    if (activeFilter === 'moderate') return streets.filter((s) => s.level === 'moderate');
    if (activeFilter === 'normal' || activeFilter === 'low' || activeFilter === 'none') {
      return streets.filter((s) => s.level === 'low' || s.level === 'none' || s.level === 'normal');
    }
    return streets.filter((s) => s.level === activeFilter);
  }, [streets, activeFilter]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleManualRefresh = () => {
    refetch();
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
  const handleRealTrafficData = useCallback((trafficMapData) => {
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
          isRefreshing={isFetching || isLoading}
          onManualRefresh={handleManualRefresh}
          gpsLocality={gpsLocality}
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
          theme={theme}
          onGpsLocality={handleGpsLocality}
          onRealTrafficData={handleRealTrafficData}
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

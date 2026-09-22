import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { playAlertChime } from '../services/trafficAlertEngine';
import {
  setIpLocation,
  recordHeavyTrafficAlert,
  pruneExpiredAlerts,
  load24hAlertsFromStorage,
  NOTIFICATION_TTL_MS,
} from '../store/notificationsSlice';
import { setUserLocation, getSavedLocation } from '../store/uiSlice';
import { sendMobileTrafficPush } from '../services/notificationService';
import { detectCityByIP } from '../services/ipLocationService';
import { getCityTrafficData } from '../data/trafficEngine';

export function useSuddenTrafficWatcher() {
  const dispatch = useDispatch();
  const ipLocation = useSelector((state) => state.notifications.ipLocation);
  const isCheckingRef = useRef(false);
  const ipDataRef = useRef(null);

  /**
   * Evaluates real-time traffic condition mapped to the user's detected IP location.
   * Principle: If and only if there is real-time heavy traffic in the IP location,
   * trigger the notification in the mobile application. The notification stays for 24 hours.
   */
  const checkIpTrafficCondition = useCallback(
    async (force = false) => {
      if (isCheckingRef.current && !force) return;
      isCheckingRef.current = true;

      try {
        // 1. Prune any alerts older than 24 hours first
        dispatch(pruneExpiredAlerts());

        // 2. Resolve IP location if not already detected
        let currentIpData = ipDataRef.current;
        if (!currentIpData) {
          currentIpData = await detectCityByIP();
          ipDataRef.current = currentIpData;
          if (currentIpData) {
            dispatch(setIpLocation(currentIpData));

            // Populate user location if not previously saved in local storage
            const saved = getSavedLocation();
            if (!saved || !saved.lat || !saved.lng) {
              dispatch(
                setUserLocation({
                  lat: currentIpData.lat,
                  lng: currentIpData.lng,
                  city: currentIpData.city,
                }),
              );
            }
          }
        }

        if (!currentIpData || !currentIpData.city) {
          return;
        }

        // 3. Map IP location data to real-time traffic engine
        const trafficData = getCityTrafficData({
          name: currentIpData.city,
          state: currentIpData.state,
          lat: currentIpData.lat,
          lng: currentIpData.lng,
        });

        if (!trafficData || !trafficData.streets) {
          return;
        }

        // 4. Strict principle check: Filter ONLY genuine real-time heavy traffic corridors
        const heavyStreets = trafficData.streets.filter((s) => s.level === 'heavy');

        // If NO real-time heavy traffic in the IP location, DO NOT push any notification!
        if (heavyStreets.length === 0) {
          return;
        }

        // 5. Check against active 24-hour alerts list to prevent spam / repeat pushes
        const existing24hAlerts = load24hAlertsFromStorage();
        const now = Date.now();

        heavyStreets.forEach((corridor) => {
          const corridorKey = corridor.id || corridor.name;

          // Check if this corridor was already alerted within the 24-hour retention window
          const alreadyAlertedWithin24h = existing24hAlerts.some(
            (a) =>
              (a.corridorId === corridorKey || a.name === corridor.name) &&
              now - a.timestamp < NOTIFICATION_TTL_MS,
          );

          if (alreadyAlertedWithin24h) {
            // Already active in the 24h store; no need to push duplicate notifications
            return;
          }

          // Trigger mobile application push notification
          sendMobileTrafficPush({
            title: `🚨 Heavy Traffic Alert: ${corridor.name}`,
            body: `Heavy congestion detected in ${currentIpData.city}. ${corridor.delay} • Crawl speed ${corridor.speed} km/h • ${corridor.trafficAdvisory}`,
            tag: `ip-traffic-${corridorKey}`,
            data: {
              corridorId: corridorKey,
              coordinates: corridor.coordinates,
              cityName: currentIpData.city,
            },
          });

          // Play subtle audio alert chime
          playAlertChime();

          // Record and persist alert in Redux & localStorage for 24 hours
          dispatch(
            recordHeavyTrafficAlert({
              corridorId: corridorKey,
              name: corridor.name,
              cityName: currentIpData.city,
              landmark: corridor.landmark,
              level: 'heavy',
              speed: corridor.speed,
              speedLimit: corridor.speedLimit,
              delay: corridor.delay,
              delayMinutes: corridor.delayMinutes,
              trafficAdvisory: corridor.trafficAdvisory,
              coordinates: corridor.coordinates,
            }),
          );
        });
      } catch (err) {
        console.warn('Traffic condition check error:', err);
      } finally {
        isCheckingRef.current = false;
      }
    },
    [dispatch],
  );

  // Initial check on mount
  useEffect(() => {
    checkIpTrafficCondition();
  }, [checkIpTrafficCondition]);

  // Periodic polling every 3 minutes & window focus check
  useEffect(() => {
    const pollInterval = setInterval(() => {
      checkIpTrafficCondition();
    }, 3 * 60 * 1000); // 3 minutes

    const pruneInterval = setInterval(() => {
      dispatch(pruneExpiredAlerts());
    }, 60 * 1000); // 1 minute

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkIpTrafficCondition();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      clearInterval(pollInterval);
      clearInterval(pruneInterval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [checkIpTrafficCondition, dispatch]);

  return {
    checkIpTrafficCondition,
    ipLocation,
  };
}

export default useSuddenTrafficWatcher;


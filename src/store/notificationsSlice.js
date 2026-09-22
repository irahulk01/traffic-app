import { createSlice } from '@reduxjs/toolkit';
import { getNotificationPermission } from '../services/notificationService';

export const NOTIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours
export const STORAGE_KEY = 'gati_notifications_24h';

/**
 * Load valid alerts from localStorage that are younger than 24 hours
 */
export function load24hAlertsFromStorage() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const valid = (Array.isArray(parsed) ? parsed : []).filter(
      (a) => a && a.timestamp && now - a.timestamp < NOTIFICATION_TTL_MS,
    );
    if (valid.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch {
    return [];
  }
}

/**
 * Save active 24-hour alerts to localStorage
 */
export function save24hAlertsToStorage(alerts) {
  if (typeof window === 'undefined') return;
  try {
    const now = Date.now();
    const valid = (alerts || []).filter(
      (a) => a && a.timestamp && now - a.timestamp < NOTIFICATION_TTL_MS,
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
  } catch {
    // ignore storage quota errors
  }
}

const initialAlerts = load24hAlertsFromStorage();

const initialState = {
  isOpen: false,
  permission: typeof window !== 'undefined' ? getNotificationPermission() : 'default',
  ipLocation: null, // { city, state, country, lat, lng, ip }
  activeAlerts: initialAlerts, // Retained for 24 hours
  currentPopupAlert: null, // In-app sudden spike banner
  history: initialAlerts,
  unreadCount: initialAlerts.length,
  lastCheckedAt: null,
};

export const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    openNotificationDrawer: (state) => {
      state.isOpen = true;
      state.unreadCount = 0;
    },
    closeNotificationDrawer: (state) => {
      state.isOpen = false;
    },
    toggleNotificationDrawer: (state) => {
      state.isOpen = !state.isOpen;
      if (state.isOpen) {
        state.unreadCount = 0;
      }
    },
    setPermission: (state, action) => {
      state.permission = action.payload;
    },
    setIpLocation: (state, action) => {
      state.ipLocation = action.payload;
    },
    /**
     * Record a heavy traffic alert for the IP location.
     * Retained for 24 hours and deduplicated against recent alerts.
     */
    recordHeavyTrafficAlert: (state, action) => {
      const payload = action.payload;
      if (!payload) return;

      const now = Date.now();
      const corridorKey = payload.corridorId || payload.id || payload.name || payload.locationName;

      // Deduplicate: check if this corridor was already alerted within the 24-hour window
      const alreadyAlerted = state.activeAlerts.some(
        (a) =>
          (a.corridorId === corridorKey || a.name === payload.name || a.name === payload.locationName) &&
          now - a.timestamp < NOTIFICATION_TTL_MS,
      );

      if (alreadyAlerted) {
        return; // Prevent duplicate / unnecessary notification
      }

      const newAlert = {
        id: payload.id || `notif-${corridorKey}-${now}`,
        corridorId: corridorKey,
        name: payload.name || payload.locationName,
        locationName: payload.name || payload.locationName,
        cityName: payload.cityName || state.ipLocation?.city || 'Local Area',
        landmark: payload.landmark || '',
        level: 'heavy',
        speed: payload.speed,
        speedLimit: payload.speedLimit,
        delay: payload.delay,
        delayMinutes: payload.delayMinutes,
        trafficAdvisory: payload.trafficAdvisory || payload.advisory || 'Heavy congestion choke point',
        advisory: payload.trafficAdvisory || payload.advisory || 'Heavy congestion choke point',
        coordinates: payload.coordinates,
        timestamp: now,
        expiresAt: now + NOTIFICATION_TTL_MS,
        formattedTime: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        formattedDate: new Date(now).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      };

      state.activeAlerts.unshift(newAlert);
      state.currentPopupAlert = newAlert;
      state.unreadCount += 1;
      state.history.unshift(newAlert);
      if (state.history.length > 50) {
        state.history.pop();
      }

      save24hAlertsToStorage(state.activeAlerts);
    },
    /**
     * Prune alerts older than 24 hours
     */
    pruneExpiredAlerts: (state) => {
      const now = Date.now();
      const valid = state.activeAlerts.filter(
        (a) => a && a.timestamp && now - a.timestamp < NOTIFICATION_TTL_MS,
      );
      if (valid.length !== state.activeAlerts.length) {
        state.activeAlerts = valid;
        save24hAlertsToStorage(valid);
      }
    },
    triggerSuddenAlert: (state, action) => {
      // Direct alias to recordHeavyTrafficAlert to maintain compatibility
      notificationsSlice.caseReducers.recordHeavyTrafficAlert(state, action);
    },
    setPopupAlert: (state, action) => {
      state.currentPopupAlert = action.payload;
    },
    dismissPopupAlert: (state) => {
      state.currentPopupAlert = null;
    },
    addDispatchedAlert: (state, action) => {
      state.history.unshift({
        ...action.payload,
        dispatchedAt: Date.now(),
      });
      if (state.history.length > 50) {
        state.history.pop();
      }
    },
    markAllAsRead: (state) => {
      state.unreadCount = 0;
    },
    clearAllAlerts: (state) => {
      state.activeAlerts = [];
      state.unreadCount = 0;
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
      }
    },
    // Maintained for compatibility if needed, but prunes expired
    setActiveAlerts: (state, action) => {
      // No-op to prevent foreign city map browsing from overriding the 24h IP notifications
    },
  },
});

export const {
  openNotificationDrawer,
  closeNotificationDrawer,
  toggleNotificationDrawer,
  setPermission,
  setIpLocation,
  recordHeavyTrafficAlert,
  pruneExpiredAlerts,
  triggerSuddenAlert,
  setPopupAlert,
  dismissPopupAlert,
  addDispatchedAlert,
  markAllAsRead,
  clearAllAlerts,
  setActiveAlerts,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;


import { createSlice } from '@reduxjs/toolkit';

export const HAZARIBAGH_HUB = {
  name: 'Hazaribagh',
  state: 'Jharkhand',
  division: 'Hazaribagh District & Locality',
  lat: 23.9924,
  lng: 85.3616,
};

export const getSavedLocation = () => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('traffic_saved_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
};

const getInitialTheme = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('gatilive_theme') || 'night';
  }
  return 'night';
};

const savedLoc = getSavedLocation();

const initialState = {
  theme: getInitialTheme(),
  currentPage: savedLoc ? 'map' : 'search', // Opens map directly if location saved, else landing search page
  selectedCity: savedLoc || null,
  selectedStreet: null,
  mobileView: 'split', // 'split' | 'map' | 'feed'
  userLocation: savedLoc
    ? { lat: savedLoc.lat, lng: savedLoc.lng, city: savedLoc.name }
    : { lat: 23.9924, lng: 85.3616 },
  // Reverse-geocoded locality name from the GPS blue dot (null until resolved)
  gpsLocality: null,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('gatilive_theme', action.payload);
        document.documentElement.setAttribute('data-theme', action.payload);
      }
    },
    toggleTheme: (state) => {
      const nextTheme = state.theme === 'night' ? 'day' : 'night';
      state.theme = nextTheme;
      if (typeof window !== 'undefined') {
        localStorage.setItem('gatilive_theme', nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
      }
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    setSelectedCity: (state, action) => {
      state.selectedCity = action.payload;
      if (action.payload) {
        state.currentPage = 'map';
        if (action.payload.lat && action.payload.lng) {
          state.userLocation = {
            lat: action.payload.lat,
            lng: action.payload.lng,
            city: action.payload.name,
          };
        }
      }
    },
    saveUserLocation: (state, action) => {
      const loc = action.payload;
      if (loc && typeof window !== 'undefined') {
        try {
          localStorage.setItem('traffic_saved_location', JSON.stringify(loc));
        } catch (e) {
          console.warn('Failed to save to localStorage:', e);
        }
      }
      state.selectedCity = loc;
      if (loc && loc.lat && loc.lng) {
        state.userLocation = {
          lat: loc.lat,
          lng: loc.lng,
          city: loc.name,
        };
      }
      state.currentPage = 'map';
    },
    clearSavedLocation: (state) => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('traffic_saved_location');
      }
      state.selectedCity = null;
      state.currentPage = 'search';
    },
    setSelectedStreet: (state, action) => {
      state.selectedStreet = action.payload;
    },
    setMobileView: (state, action) => {
      state.mobileView = action.payload;
    },
    setUserLocation: (state, action) => {
      state.userLocation = action.payload;
    },
    setGpsLocality: (state, action) => {
      // action.payload: { locality, sublocality, fullAddress } from reverse geocoding
      state.gpsLocality = action.payload;
    },
  },
});

export const {
  setTheme,
  toggleTheme,
  setCurrentPage,
  setSelectedCity,
  saveUserLocation,
  clearSavedLocation,
  setSelectedStreet,
  setMobileView,
  setUserLocation,
  setGpsLocality,
} = uiSlice.actions;

export default uiSlice.reducer;


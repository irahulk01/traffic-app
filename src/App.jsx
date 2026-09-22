import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import MobileFrame from './components/MobileFrame';
import CitySearchPage from './components/CitySearchPage';
import TrafficMapPage from './components/TrafficMapPage';
import TrafficPopupAlert from './components/notifications/TrafficPopupAlert';
import { useSuddenTrafficWatcher } from './hooks/useSuddenTrafficWatcher';
import {
  toggleTheme,
  setCurrentPage,
  setSelectedCity,
} from './store/uiSlice';

export default function App() {
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.ui.theme);
  const currentPage = useSelector((state) => state.ui.currentPage);
  const selectedCity = useSelector((state) => state.ui.selectedCity);

  // Background watcher for random sudden local traffic changes & IP geolocation
  useSuddenTrafficWatcher();

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Clean up any legacy key from browser localStorage to ensure no key is exposed
  useEffect(() => {
    try {
      localStorage.removeItem('gatilive_google_maps_key');
    } catch {
      // ignore
    }
  }, []);

  // Update root attribute and persist theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  const handleSelectCity = (city) => {
    dispatch(setSelectedCity(city));
  };

  const handleBackToSearch = () => {
    dispatch(setCurrentPage('search'));
  };

  return (
    <div data-theme={theme} className="app-theme-provider">
      <MobileFrame theme={theme} onToggleTheme={handleToggleTheme}>
        {currentPage === 'search' || !selectedCity ? (
          <CitySearchPage
            onSelectCity={handleSelectCity}
            theme={theme}
            onToggleTheme={handleToggleTheme}
          />
        ) : (
          <TrafficMapPage
            city={selectedCity}
            onSelectCity={handleSelectCity}
            onBack={handleBackToSearch}
            apiKey={apiKey}
            theme={theme}
            onToggleTheme={handleToggleTheme}
          />
        )}

        {/* Real-time Pop-up Notification for Sudden Local Traffic Changes */}
        <TrafficPopupAlert />
      </MobileFrame>
    </div>
  );
}

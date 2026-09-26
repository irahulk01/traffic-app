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

  const [currentPath, setCurrentPath] = React.useState(window.location.pathname);
  const [isBooting, setIsBooting] = React.useState(true);

  useEffect(() => {
    // Initial boot loading screen
    const timer = setTimeout(() => {
      setIsBooting(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const handleSelectCity = (city) => {
    dispatch(setSelectedCity(city));
    window.history.pushState({}, '', '/traffic-map');
    setCurrentPath('/traffic-map');
  };

  const handleBackToSearch = () => {
    dispatch(setCurrentPage('search'));
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
  };

  // Check if test mode is enabled via environment
  const isTestMode = import.meta.env.VITE_TRAFFIC_TEST_MODE === 'true';

  const renderContent = () => {
    if (currentPath === '/traffic-map') {
      // Fixed Hazaribagh operating area
      let effectiveCity = selectedCity;
      if (!effectiveCity) {
        effectiveCity = {
          name: 'Hazaribagh, Jharkhand',
          lat: 23.9966,
          lng: 85.3691
        };
      }
      return (
        <TrafficMapPage
          city={effectiveCity}
          onSelectCity={handleSelectCity}
          onBack={handleBackToSearch}
          apiKey={apiKey}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      );
    }
    
    return (
      <CitySearchPage
        onSelectCity={handleSelectCity}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  };


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

  if (isBooting) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: theme === 'day' ? '#f8fafc' : '#020617' }}>
         <style>
         {`
            .traffic-loader {
               display: flex;
               gap: 16px;
               background: #1e293b;
               padding: 16px 24px;
               border-radius: 40px;
               box-shadow: 0 10px 25px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.1);
               border: 2px solid #334155;
            }
            .traffic-dot {
               width: 24px;
               height: 24px;
               border-radius: 50%;
               opacity: 0.2;
               animation: traffic-blink 1.5s infinite;
            }
            .traffic-dot.red { background: #ef4444; color: #ef4444; animation-delay: 0s; }
            .traffic-dot.yellow { background: #eab308; color: #eab308; animation-delay: 0.5s; }
            .traffic-dot.green { background: #22c55e; color: #22c55e; animation-delay: 1.0s; }

            @keyframes traffic-blink {
               0%, 100% { opacity: 0.2; box-shadow: none; }
               30%, 50% { opacity: 1; box-shadow: 0 0 20px currentColor, 0 0 40px currentColor; }
            }
         `}
         </style>
         <div className="traffic-loader">
            <div className="traffic-dot red"></div>
            <div className="traffic-dot yellow"></div>
            <div className="traffic-dot green"></div>
         </div>
         <h2 style={{ marginTop: '32px', color: theme === 'day' ? '#0f172a' : '#f8fafc', fontWeight: 'bold', fontFamily: 'system-ui, sans-serif', letterSpacing: '1px' }}>
           INITIALIZING TRAFFIC GRID
         </h2>
      </div>
    );
  }

  return (
    <div data-theme={theme} className="app-theme-provider">
      <MobileFrame theme={theme} onToggleTheme={handleToggleTheme}>
        {renderContent()}

        {/* Real-time Pop-up Notification for Sudden Local Traffic Changes */}
        <TrafficPopupAlert />
      </MobileFrame>
    </div>
  );
}

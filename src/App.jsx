import React, { useState, useEffect } from 'react';
import MobileFrame from './components/MobileFrame';
import CitySearchPage from './components/CitySearchPage';
import TrafficMapPage from './components/TrafficMapPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState('search'); // 'search' (Page 1) | 'map' (Page 2)
  const [selectedCity, setSelectedCity] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gatilive_theme') || 'night';
    }
    return 'night';
  });

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Clean up any legacy key from browser localStorage to ensure no key is exposed
  useEffect(() => {
    try {
      localStorage.removeItem('gatilive_google_maps_key');
    } catch (e) {
      // ignore
    }
  }, []);

  // Update root attribute and persist theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('gatilive_theme', theme);
    } catch (e) {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'night' ? 'day' : 'night'));
  };

  const handleSelectCity = (city) => {
    setSelectedCity(city);
    setCurrentPage('map');
  };

  const handleBackToSearch = () => {
    setCurrentPage('search');
  };

  return (
    <div data-theme={theme} className="app-theme-provider">
      <MobileFrame theme={theme} onToggleTheme={toggleTheme}>
        {currentPage === 'search' || !selectedCity ? (
          <CitySearchPage
            onSelectCity={handleSelectCity}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        ) : (
          <TrafficMapPage
            city={selectedCity}
            onSelectCity={handleSelectCity}
            onBack={handleBackToSearch}
            apiKey={apiKey}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}
      </MobileFrame>
    </div>
  );
}



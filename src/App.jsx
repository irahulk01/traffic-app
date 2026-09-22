import React, { useState, useEffect } from 'react';
import MobileFrame from './components/MobileFrame';
import CitySearchPage from './components/CitySearchPage';
import TrafficMapPage from './components/TrafficMapPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState('search'); // 'search' (Page 1) | 'map' (Page 2)
  const [selectedCity, setSelectedCity] = useState(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Clean up any legacy key from browser localStorage to ensure no key is exposed
  useEffect(() => {
    try {
      localStorage.removeItem('gatilive_google_maps_key');
    } catch (e) {
      // ignore
    }
  }, []);

  const handleSelectCity = (city) => {
    setSelectedCity(city);
    setCurrentPage('map');
  };

  const handleBackToSearch = () => {
    setCurrentPage('search');
  };

  return (
    <MobileFrame>
      {currentPage === 'search' || !selectedCity ? (
        <CitySearchPage onSelectCity={handleSelectCity} />
      ) : (
        <TrafficMapPage
          city={selectedCity}
          onBack={handleBackToSearch}
          apiKey={apiKey}
        />
      )}
    </MobileFrame>
  );
}


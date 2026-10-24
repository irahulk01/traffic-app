import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import MobileFrame from './components/MobileFrame';
import CitySearchPage from './components/CitySearchPage';
import TrafficMapPage from './components/TrafficMapPage';
import { toggleTheme, setCurrentPage, setSelectedCity } from './store/uiSlice';

const HAZARIBAGH = { name: 'Hazaribagh', state: 'Jharkhand', lat: 23.9966, lng: 85.3691 };

export default function App() {
  const dispatch = useDispatch();
  const theme = useSelector(state => state.ui.theme);
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const back = () => setPath(window.location.pathname);
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  }, []);
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  const selectCity = () => {
    dispatch(setSelectedCity(HAZARIBAGH));
    window.history.pushState({}, '', '/traffic-map'); setPath('/traffic-map');
  };
  const back = () => {
    dispatch(setCurrentPage('search'));
    window.history.pushState({}, '', '/'); setPath('/');
  };
  const changeTheme = () => dispatch(toggleTheme());
  return <div data-theme={theme} className="app-theme-provider"><MobileFrame>
    {path === '/traffic-map' ? <TrafficMapPage city={HAZARIBAGH} onBack={back} apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''} theme={theme} onToggleTheme={changeTheme} /> : <CitySearchPage onSelectCity={selectCity} theme={theme} onToggleTheme={changeTheme} />}
  </MobileFrame></div>;
}

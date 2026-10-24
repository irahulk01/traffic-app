import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import MobileFrame from './components/MobileFrame';
import TrafficMapPage from './components/TrafficMapPage';
import { toggleTheme } from './store/uiSlice';

const HAZARIBAGH = { name: 'Hazaribagh', state: 'Jharkhand', lat: 23.9966, lng: 85.3691 };

export default function App() {
  const dispatch = useDispatch();
  const theme = useSelector(state => state.ui.theme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'day' ? '#f5f5f7' : '#161618');
  }, [theme]);
  return <div data-theme={theme} className="app-theme-provider"><MobileFrame>
    <TrafficMapPage city={HAZARIBAGH} apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''} theme={theme} onToggleTheme={() => dispatch(toggleTheme())} />
  </MobileFrame></div>;
}

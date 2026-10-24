import React from 'react';
import { Radio } from 'lucide-react';

export default function MapCityTag({ cityName, mapEngine }) {
  const source = mapEngine === 'google' ? 'Google Maps' : mapEngine === 'leaflet' ? 'OpenStreetMap' : 'Map loading';
  return <div className="map-city-tag"><span className="map-tag-area">{cityName || 'Monitored area'}</span><span className="map-tag-source"><Radio size={13} />{source}</span></div>;
}

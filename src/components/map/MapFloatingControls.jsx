import React from 'react';
import { Crosshair, Layers, Map, Plus, Minus } from 'lucide-react';

export default function MapFloatingControls({ onZoomIn, onZoomOut, onRecenter, trafficEnabled, onToggleTraffic, mapEngine, mapType, onToggleMapType }) {
  return <>
    <div className="map-floating-overlay" role="group" aria-label="Map display options">
      <button type="button" className={`map-control-btn ${trafficEnabled ? 'active' : ''}`} onClick={onToggleTraffic} aria-label={`${trafficEnabled ? 'Hide' : 'Show'} traffic layer`} aria-pressed={Boolean(trafficEnabled)} title={`${trafficEnabled ? 'Hide' : 'Show'} traffic layer`}><Layers size={17} /></button>
      {mapEngine === 'google' && <button type="button" className={`map-control-btn ${mapType === 'satellite' ? 'active' : ''}`} onClick={onToggleMapType} aria-label={`Switch to ${mapType === 'satellite' ? 'roadmap' : 'satellite'} view`} aria-pressed={mapType === 'satellite'} title={`Switch to ${mapType === 'satellite' ? 'Roadmap' : 'Satellite'} view`}><Map size={17} /></button>}
    </div>
    <div className="map-bottom-right-controls">
      <button type="button" className="map-control-btn recenter-btn" onClick={onRecenter} aria-label="Fit listed traffic sections" title="Show all listed sections"><Crosshair size={17} /></button>
      <div className="map-zoom-group"><button type="button" className="map-control-btn zoom-btn" onClick={onZoomIn} aria-label="Zoom in" title="Zoom in"><Plus size={18} /></button><button type="button" className="map-control-btn zoom-btn" onClick={onZoomOut} aria-label="Zoom out" title="Zoom out"><Minus size={18} /></button></div>
    </div>
  </>;
}

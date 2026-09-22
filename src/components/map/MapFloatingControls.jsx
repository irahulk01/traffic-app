import React from 'react';
import { Crosshair, Layers, Sparkles, Plus, Minus } from 'lucide-react';

export default function MapFloatingControls({
  onZoomIn,
  onZoomOut,
  onRecenter,
  trafficEnabled,
  onToggleTraffic,
  mapEngine,
  mapType,
  onToggleMapType,
}) {
  return (
    <>
      {/* Top Right Floating Controls (Traffic, MapType) */}
      <div className="map-floating-overlay">
        {/* Traffic Layer Toggle */}
        <button
          type="button"
          className={`map-control-btn ${trafficEnabled ? 'active' : ''}`}
          onClick={onToggleTraffic}
          title="Toggle Traffic Layer"
          aria-label="Toggle Traffic Layer"
        >
          <Layers size={17} />
        </button>

        {/* Satellite or Roadmap Switch */}
        {mapEngine === 'google' && (
          <button
            type="button"
            className={`map-control-btn ${mapType === 'satellite' ? 'active' : ''}`}
            onClick={onToggleMapType}
            title="Satellite / Road Map"
            aria-label="Satellite or Road Map"
          >
            <Sparkles size={16} />
          </button>
        )}
      </div>

      {/* Bottom Right Controls: Recenter on left, Zoom +/- on right */}
      <div className="map-bottom-right-controls">
        {/* Recenter to Location Pin (aligned with Minus button) */}
        <button
          type="button"
          className="map-control-btn map-recenter-btn"
          onClick={onRecenter}
          title="Recenter Map to Exact Position"
          aria-label="Recenter Map to Exact Position"
        >
          <Crosshair size={17} />
        </button>

        {/* Zoom In & Zoom Out Buttons (+ on top, - on bottom) */}
        <div className="map-zoom-group">
          <button
            type="button"
            className="map-control-btn zoom-btn zoom-in-btn"
            onClick={onZoomIn}
            title="Zoom In (+)"
            aria-label="Zoom In on map"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            className="map-control-btn zoom-btn zoom-out-btn"
            onClick={onZoomOut}
            title="Zoom Out (-)"
            aria-label="Zoom Out on map"
          >
            <Minus size={18} />
          </button>
        </div>
      </div>
    </>
  );
}

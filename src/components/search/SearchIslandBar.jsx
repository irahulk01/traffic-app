import React from 'react';
import { Search, X, Crosshair, Loader2, AlertCircle } from 'lucide-react';

export default function SearchIslandBar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  isDetecting,
  onDetectLocation,
  detectError,
}) {
  return (
    <div className="search-island-container">
      <div className="search-island-box">
        <Search size={18} className="search-island-icon" />
        <input
          type="text"
          className="search-island-input"
          placeholder="Search any Indian city, highway, or landmark (e.g. Ranchi, Hazaribagh, Giridih)..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />

        {searchQuery && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={onClearSearch}
            title="Clear search input"
            aria-label="Clear search input"
          >
            <X size={14} />
          </button>
        )}

        {/* Locate Me Button inside Search Box */}
        <button
          type="button"
          className={`locate-me-btn ${isDetecting ? 'detecting' : ''}`}
          onClick={onDetectLocation}
          disabled={isDetecting}
          title="Detect position and center map"
        >
          {isDetecting ? (
            <Loader2 size={13} className="spinning-loader" />
          ) : (
            <Crosshair size={13} />
          )}
          <span>{isDetecting ? 'Locating...' : 'Locate Me'}</span>
        </button>
      </div>

      {detectError && (
        <div className="search-error-toast">
          <AlertCircle size={14} />
          <span>{detectError}</span>
        </div>
      )}
    </div>
  );
}

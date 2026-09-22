import React from 'react';

export default function SeverityFilterBar({ activeFilter, onSelectFilter, summary }) {
  if (!summary) return null;

  const normalCount = (summary.lowCount || 0) + (summary.noneCount || 0);

  return (
    <nav className="filter-segmented-bar" aria-label="Filter roads by traffic level">
      <button
        type="button"
        className={`filter-segment-btn ${activeFilter === 'all' ? 'active' : ''}`}
        onClick={() => onSelectFilter('all')}
      >
        <span>All</span>
        <span className="segment-count">{summary.totalCount}</span>
      </button>

      <button
        type="button"
        className={`filter-segment-btn filter-heavy ${activeFilter === 'heavy' ? 'active' : ''}`}
        onClick={() => onSelectFilter('heavy')}
      >
        <span className="segment-dot dot-heavy" />
        <span>High Traffic</span>
        <span className="segment-count">{summary.heavyCount}</span>
      </button>

      <button
        type="button"
        className={`filter-segment-btn filter-moderate ${activeFilter === 'moderate' ? 'active' : ''}`}
        onClick={() => onSelectFilter('moderate')}
      >
        <span className="segment-dot dot-moderate" />
        <span>Moderate</span>
        <span className="segment-count">{summary.moderateCount}</span>
      </button>

      <button
        type="button"
        className={`filter-segment-btn filter-low ${
          activeFilter === 'normal' || activeFilter === 'low' || activeFilter === 'none'
            ? 'active'
            : ''
        }`}
        onClick={() => onSelectFilter('normal')}
      >
        <span className="segment-dot dot-low" />
        <span>Normal</span>
        <span className="segment-count">{normalCount}</span>
      </button>
    </nav>
  );
}

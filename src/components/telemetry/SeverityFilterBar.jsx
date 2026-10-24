import React from 'react';

export default function SeverityFilterBar({ activeFilter, onSelectFilter, summary }) {
  if (!summary) return null;
  const options = [
    { id: 'all', label: 'Affected', count: summary.totalCount ?? 0 },
    { id: 'heavy', label: 'Heavy', count: summary.heavyCount ?? 0 },
    { id: 'moderate', label: 'Slow', count: summary.moderateCount ?? 0 },
  ];
  return <nav className="filter-segmented-bar" aria-label="Filter affected road sections">
    {options.map((option) => <button key={option.id} type="button" className={`filter-segment-btn ${option.id !== 'all' ? `filter-${option.id}` : ''} ${activeFilter === option.id ? 'active' : ''}`} aria-pressed={activeFilter === option.id} onClick={() => onSelectFilter(option.id)}>
      {option.id !== 'all' && <span className={`segment-dot dot-${option.id}`} />}<span>{option.label}</span><span className="segment-count">{option.count}</span>
    </button>)}
  </nav>;
}

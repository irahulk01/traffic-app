import React from 'react';

export default function CongestionGaugeCard({ summary }) {
  if (!summary) return null;

  const hasHighTraffic = summary.heavyCount > 0;
  const isModerate = summary.moderateCount > 0 && !hasHighTraffic;

  return (
    <section className="traffic-simple-summary">
      <div className="summary-status-header">
        <div className="status-indicator-row">
          <span
            className={`status-circle ${
              hasHighTraffic ? 'high' : isModerate ? 'moderate' : 'normal'
            }`}
          />
          <span className="status-heading">
            {hasHighTraffic
              ? `High Traffic Active (${summary.heavyCount} Choke Points)`
              : isModerate
              ? 'Moderate Traffic'
              : 'Normal Traffic Flow'}
          </span>
        </div>
        <span className="summary-sync-label">
          Synced at {summary.lastUpdatedTime}
        </span>
      </div>

      <div className="summary-metrics-grid">
        <div className="metric-cell">
          <span className="metric-num">{summary.avgSpeed} km/h</span>
          <span className="metric-label">Avg Speed</span>
        </div>
        <div className="metric-cell">
          <span className={`metric-num ${hasHighTraffic ? 'red' : ''}`}>
            {summary.heavyCount}
          </span>
          <span className="metric-label">High Traffic</span>
        </div>
        <div className="metric-cell">
          <span className="metric-num">{summary.totalCount}</span>
          <span className="metric-label">Total Roads</span>
        </div>
      </div>
    </section>
  );
}

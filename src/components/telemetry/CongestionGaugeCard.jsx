import React from 'react';
import AnimatedTrafficCount from './AnimatedTrafficCount';
import { Activity, Clock, Route } from 'lucide-react';

const messages = {
  loading: ['Checking configured routes', 'Route conditions will appear as data arrives.'],
  fresh: ['Latest route conditions', 'No affected sections reported in the latest route results.'],
  partial: ['Some route data is missing', 'Conditions are shown only for routes with available data.'],
  stale: ['Showing older route data', 'The update may no longer reflect current conditions.'],
  unavailable: ['Traffic data unavailable', 'No current route results are available.'],
};

export default function CongestionGaugeCard({ summary, activeFilter = 'all', onSelectFilter }) {
  if (!summary) return null;
  const dataState = summary.dataState || 'fresh';
  const high = (summary.heavyCount || 0) > 0;
  const moderate = (summary.moderateCount || 0) > 0;
  const [defaultTitle, defaultDescription] = messages[dataState] || messages.unavailable;
  const title = dataState !== 'fresh' ? defaultTitle : high ? 'Heavy traffic reported' : moderate ? 'A few roads are slowing' : 'No slowdown reported';
  const description = high || moderate ? `${summary.totalCount || 0} affected section${summary.totalCount === 1 ? '' : 's'} in the available route data.` : defaultDescription;
  return (
    <section className={`traffic-simple-summary summary-${dataState}`} aria-live="polite">
      <div className="summary-status-header">
        <div className="summary-icon"><Activity size={17} /></div>
        <div className="summary-copy"><span className="summary-eyebrow">HAZARIBAGH · TRAFFIC NOW</span><h2>{title}</h2><p>{description}</p></div>
      </div>
      <nav className="summary-metrics-grid" aria-label="Open traffic cards by condition">
        {[['all', summary.totalCount, 'Affected sections', ''], ['heavy', summary.heavyCount, 'Heavy', 'metric-high'], ['moderate', summary.moderateCount, 'Slow', 'metric-moderate']].map(([id, count, label, tone]) => <button key={id} type="button" className="metric-cell" aria-pressed={activeFilter === id} onClick={() => onSelectFilter?.(id)} aria-label={`Show ${label.toLowerCase()} cards, ${count ?? 0} sections`}><span className={`metric-num ${tone}`}><AnimatedTrafficCount value={['loading', 'unavailable'].includes(dataState) ? '—' : count ?? 0} /></span><span className="metric-label"><span className="metric-label-full">{label}</span><span className="metric-label-compact">{id === "all" ? "Affected" : label}</span></span></button>)}
      </nav>
      <div className="summary-foot"><span><Route size={13} /> {summary.availableRoutes ?? '—'} / {summary.totalRoutes ?? '—'} routes</span><span className="summary-age"><Clock size={13} />{dataState === 'stale' && <strong className="summary-inline-state">Older · </strong>}{dataState === 'partial' && <strong className="summary-inline-state">Partial · </strong>}{dataState === 'unavailable' && <strong className="summary-inline-state">Unavailable · </strong>}<span className="summary-age-full">{summary.updateAge || summary.lastUpdatedTime || 'Update time unavailable'}</span><span className="summary-age-compact">{(summary.updateAge || summary.lastUpdatedTime || 'Waiting for update').replace(/^Updated /, '')}</span></span></div>
    </section>
  );
}

import React from 'react';
import { MapPin, Navigation, Clock, Activity } from 'lucide-react';

export default function CorridorCard({ street, isSelected, onSelect, updatedTime }) {
  const isHighTraffic = street.level === 'heavy';
  const isStale = street.isStale;
  
  const badgeText = isHighTraffic ? '🔴 HEAVY TRAFFIC' : '🟠 SLOW TRAFFIC';
  const badgeClass = isHighTraffic ? 'high' : 'moderate';

  return (
    <article
      className={`traffic-simple-card ${isHighTraffic ? 'border-high' : ''} ${
        isSelected ? 'card-selected' : ''
      }`}
      onClick={() => onSelect(street)}
      role="button"
      tabIndex={0}
      style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: isHighTraffic ? '#ef4444' : '#f97316' }}>
          {badgeText}
        </span>
        {isStale && (
          <span style={{ fontSize: '10px', color: '#ef4444', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
            ⚠ STALE DATA
          </span>
        )}
      </div>

      <div className="road-title-wrap" style={{ marginTop: '4px' }}>
        <h3 className="road-name" style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{street.name}</h3>
      </div>
      
      <div style={{ marginTop: '8px' }}>
         <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Affected section:</span>
         <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
           <MapPin size={13} style={{ color: '#94a3b8' }} />
           <span>{street.landmark}</span>
         </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', fontSize: '12px', color: '#64748b' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase' }}>Source</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500', color: 'var(--text-main)' }}>
            <Activity size={12} /> Google Traffic
          </span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: isStale ? '#ef4444' : 'inherit' }}>
            {isStale ? 'Last successful update' : 'Updated'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isStale ? '#ef4444' : 'inherit' }}>
            <Clock size={12} /> {updatedTime || new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </article>
  );
}

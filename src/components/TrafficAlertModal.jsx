import { useEffect, useRef } from 'react';
import { Bell, X, ArrowUpRight, CircleCheck, CloudOff } from 'lucide-react';
import './TrafficAlertModal.css';

export default function TrafficAlertModal({ isOpen, onClose, cityName = 'Hazaribagh', streets = [], dataState = 'unavailable', onSelectStreet }) {
  const dialog = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    dialog.current?.focus();
    const keydown = event => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const buttons = [...(dialog.current?.querySelectorAll('button,a[href],input,select,textarea') || [])].filter(el => !el.disabled);
        if (!buttons.length) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === buttons[0] || document.activeElement === dialog.current)) { event.preventDefault(); buttons.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  const unavailable = ['unavailable', 'loading'].includes(dataState);
  return <div className="live-alert-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="live-alert-title" className="live-alert-dialog">
      <header><span className="live-alert-icon"><Bell size={22} /></span><div><p>TRAFFIC WATCH</p><h2 id="live-alert-title">Heavy traffic sections</h2></div><button type="button" onClick={onClose} aria-label="Close traffic alerts"><X size={20} /></button></header>
      <p className="live-alert-intro">{cityName} · The same verified sections shown on your map.</p>
      {dataState === 'stale' && <p className="live-alert-warning">These are older observations. The latest update failed.</p>}
      {dataState === 'partial' && <p className="live-alert-warning">Some routes are unavailable. This list may be incomplete.</p>}
      {unavailable ? <div className="live-alert-empty"><CloudOff size={30} /><h3>{dataState === 'loading' ? 'Checking traffic' : 'Traffic data unavailable'}</h3><p>We cannot confirm current heavy traffic until the monitored routes return data.</p></div> : streets.length ? <div className="live-alert-list">{streets.map(street => <button type="button" key={street.id} onClick={() => onSelectStreet?.(street)}><span className="live-alert-marker" /><span><strong>{street.name}</strong><small>{street.sectionLabel}</small></span><ArrowUpRight size={18} /></button>)}</div> : <div className="live-alert-empty"><CircleCheck size={30} /><h3>{dataState === 'stale' ? 'No heavy sections in the older observation' : 'No heavy sections reported'}</h3><p>This applies to the available monitored routes, not every road in the district.</p></div>}
      <footer>Source: Google Routes · In-app traffic watch</footer>
    </section>
  </div>;
}

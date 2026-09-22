import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AlertTriangle, MapPin, X, Navigation } from 'lucide-react';
import { dismissPopupAlert } from '../../store/notificationsSlice';
import { setSelectedStreet, setCurrentPage } from '../../store/uiSlice';

export default function TrafficPopupAlert() {
  const dispatch = useDispatch();
  const currentAlert = useSelector((state) => state.notifications.currentPopupAlert);

  // Auto-dismiss after 9 seconds
  useEffect(() => {
    if (!currentAlert) return;

    const timer = setTimeout(() => {
      dispatch(dismissPopupAlert());
    }, 9000);

    return () => clearTimeout(timer);
  }, [currentAlert, dispatch]);

  if (!currentAlert) return null;

  const handleViewOnMap = () => {
    dispatch(
      setSelectedStreet({
        id: currentAlert.id,
        name: currentAlert.locationName,
        landmark: currentAlert.landmark,
        coordinates: currentAlert.coordinates,
        level: 'heavy',
        speed: currentAlert.speed,
        speedLimit: currentAlert.speedLimit,
        delay: currentAlert.delay,
        trafficAdvisory: currentAlert.advisory,
        color: '#ef4444',
      }),
    );
    dispatch(setCurrentPage('map'));
    dispatch(dismissPopupAlert());
  };

  return (
    <aside
      className="traffic-popup-banner-wrap"
      role="alert"
      aria-live="assertive"
    >
      <div className="traffic-popup-card">
        <div className="popup-card-header">
          <div className="popup-tag-row">
            <span className="popup-pulse-indicator" />
            <AlertTriangle size={14} className="popup-alert-icon" />
            <span className="popup-tag-text">SUDDEN TRAFFIC SPIKE</span>
            <span className="popup-time-text">{currentAlert.formattedTime || 'Just now'}</span>
          </div>

          <button
            type="button"
            className="popup-close-btn"
            onClick={() => dispatch(dismissPopupAlert())}
            title="Dismiss Alert"
            aria-label="Dismiss Alert"
          >
            <X size={15} />
          </button>
        </div>

        <div className="popup-card-body">
          <h4 className="popup-location-name">{currentAlert.locationName}</h4>
          {currentAlert.landmark && (
            <div className="popup-landmark-row">
              <MapPin size={12} />
              <span>{currentAlert.landmark}</span>
            </div>
          )}

          <div className="popup-metrics-pill-row">
            <span className="popup-metric-badge delay">{currentAlert.delay}</span>
            <span className="popup-metric-badge speed">Speed: {currentAlert.speed} km/h</span>
          </div>

          {currentAlert.advisory && (
            <p className="popup-advisory-note">{currentAlert.advisory}</p>
          )}
        </div>

        <div className="popup-card-actions">
          <button
            type="button"
            className="popup-action-btn view-map-btn"
            onClick={handleViewOnMap}
          >
            <Navigation size={13} />
            <span>Show Location on Map</span>
          </button>

          <button
            type="button"
            className="popup-action-btn dismiss-btn"
            onClick={() => dispatch(dismissPopupAlert())}
          >
            Dismiss
          </button>
        </div>
      </div>
    </aside>
  );
}

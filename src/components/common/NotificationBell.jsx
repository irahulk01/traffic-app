import React from 'react';
import { Bell } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { openNotificationDrawer } from '../../store/notificationsSlice';

export default function NotificationBell({
  alertCount,
  onClick,
  className = '',
}) {
  const dispatch = useDispatch();
  const reduxActiveAlerts = useSelector((state) => state.notifications.activeAlerts);

  // Notifications shown IF AND ONLY IF there is high traffic (level === 'heavy')
  const highTrafficAlerts = (reduxActiveAlerts || []).filter(
    (a) => a.level === 'heavy' || a.statusLevel === 'heavy',
  );

  const count =
    alertCount !== undefined ? alertCount : highTrafficAlerts.length;

  const hasHighTraffic = count > 0;

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    } else {
      dispatch(openNotificationDrawer());
    }
  };

  return (
    <button
      type="button"
      className={`notification-icon-btn ${hasHighTraffic ? 'active-alerts' : ''} ${className}`}
      onClick={handleClick}
      title={
        hasHighTraffic
          ? `${count} High Traffic Disruptions`
          : 'No High Traffic'
      }
      aria-label="Traffic notifications"
    >
      <Bell size={16} />
      {hasHighTraffic && (
        <span className="notification-pill-count">
          {count}
        </span>
      )}
    </button>
  );
}

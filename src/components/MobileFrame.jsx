import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Wifi, Battery, Signal } from 'lucide-react';

export default function MobileFrame({ children }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="desktop-wrapper">
      <div className="desktop-ambient-glow" />

      {/* Simulator view toggle button for desktop testing */}
      <button
        className="simulator-toggle-btn"
        onClick={() => setIsFullscreen(!isFullscreen)}
        title="Toggle between phone simulator frame and full window mobile view"
      >
        {isFullscreen ? <Smartphone size={14} /> : <Monitor size={14} />}
        <span>{isFullscreen ? 'Phone Frame' : 'Full Window'}</span>
      </button>

      {/* Mobile Device Frame */}
      <div className={`mobile-device-frame ${isFullscreen ? 'fullscreen-mode' : ''}`}>
        {/* Dynamic Island / Notch */}
        {!isFullscreen && (
          <div className="device-island">
            <div className="island-camera" />
            <div className="island-sensor" />
          </div>
        )}

        <div className="mobile-app-container">
          {/* iOS / Android Status Bar */}
          <div className="mobile-status-bar">
            <span>{currentTime || '9:41 AM'}</span>
            <div className="status-bar-icons">
              <Signal size={13} strokeWidth={2.5} />
              <Wifi size={13} strokeWidth={2.5} />
              <Battery size={15} strokeWidth={2.5} />
            </div>
          </div>

          {/* Main App Screens */}
          {children}
        </div>
      </div>
    </div>
  );
}

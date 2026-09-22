import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor } from 'lucide-react';

export default function MobileFrame({ children }) {
  // Default to expansive, breathable desktop view; allow toggling phone simulator frame for testing
  const [isPhoneFrame, setIsPhoneFrame] = useState(false);

  return (
    <div className={`app-root-wrapper ${isPhoneFrame ? 'simulated-phone-active' : 'expansive-mode'}`}>
      <div className="ambient-background-glow" />

      {/* Simulator view toggle button for testing on desktop */}
      <button
        type="button"
        className="layout-view-toggle-btn"
        onClick={() => setIsPhoneFrame(!isPhoneFrame)}
        title={isPhoneFrame ? 'Switch to expansive layout' : 'Preview mobile phone frame'}
      >
        {isPhoneFrame ? <Monitor size={14} /> : <Smartphone size={14} />}
        <span>{isPhoneFrame ? 'Expansive View' : 'Phone Preview'}</span>
      </button>

      {/* Main Container: expands naturally or wraps in phone frame when toggled */}
      <div className={`app-viewport-shell ${isPhoneFrame ? 'phone-frame-shell' : 'fluid-shell'}`}>
        {isPhoneFrame && (
          <div className="phone-bezel-island">
            <div className="island-lens" />
          </div>
        )}

        <div className="app-content-surface">
          {children}
        </div>
      </div>
    </div>
  );
}


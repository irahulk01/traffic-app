import React from 'react';

export default function MobileFrame({ children }) {
  return (
    <div className="app-root-wrapper">
      <div className="app-viewport-shell fluid-shell">
        <div className="app-content-surface">{children}</div>
      </div>
    </div>
  );
}

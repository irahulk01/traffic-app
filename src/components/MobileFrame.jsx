import { useEffect } from 'react';

export default function MobileFrame({ children }) {
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      // Safari toolbars and the on-screen keyboard change the visible viewport.
      // Keep pinch-zoom native instead of resizing the app while the user zooms.
      if (!viewport || viewport.scale === 1) document.documentElement.style.setProperty('--app-height', `${Math.round(viewport?.height || window.innerHeight)}px`);
    };
    resize();
    window.addEventListener('resize', resize);
    viewport?.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); viewport?.removeEventListener('resize', resize); document.documentElement.style.removeProperty('--app-height'); };
  }, []);
  return <div className="app-root-wrapper"><div className="app-viewport-shell fluid-shell"><div className="app-content-surface">{children}</div></div></div>;
}

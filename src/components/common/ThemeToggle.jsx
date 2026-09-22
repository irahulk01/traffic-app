import React from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ theme = 'night', onToggleTheme, showLabel = true, className = '' }) {
  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={onToggleTheme}
      title={theme === 'day' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
      aria-label="Toggle visual theme"
    >
      {theme === 'day' ? <Moon size={15} /> : <Sun size={15} />}
      {showLabel && (
        <span className="theme-toggle-label">{theme === 'day' ? 'Night' : 'Day'}</span>
      )}
    </button>
  );
}

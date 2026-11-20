import { Moon, Sun } from 'lucide-react';

export function ThemeToggle({ darkMode, onToggle, className, labelClassName }) {
  return (
    <button
      type="button"
      className={className}
      role="switch"
      aria-label="Dark mode"
      aria-checked={darkMode}
      onClick={onToggle}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        <span className="theme-toggle-rotor">
          <span className="theme-toggle-face"><Moon size={17} /></span>
          <span className="theme-toggle-face theme-toggle-back"><Sun size={17} /></span>
        </span>
      </span>
      {labelClassName !== undefined && (
        <span className={labelClassName} aria-hidden="true">{darkMode ? 'Light' : 'Dark'}</span>
      )}
    </button>
  );
}

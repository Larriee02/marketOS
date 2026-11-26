import { ArrowUpRight } from 'lucide-react';
import { MarketOSLogo } from '../ui/MarketOSLogo';
import { ThemeToggle } from '../ui/ThemeToggle';
import './auth.css';

export function AuthLayout({ signup = false, darkMode, setDarkMode, onNavigate, children }) {
  return (
    <div className={`auth-layout${signup ? ' auth-layout--signup' : ''}`}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="auth-shopfront">
        <div className="auth-brand"><MarketOSLogo variant="monochrome" /></div>
      </div>
      <div className="auth-paper">
        <header className="auth-toolbar">
          <button type="button" onClick={() => onNavigate(signup ? '/login' : '/signup')}>
            {signup ? 'Sign in' : 'Create account'} <ArrowUpRight size={15} aria-hidden="true" />
          </button>
          <ThemeToggle darkMode={darkMode} onToggle={() => setDarkMode((current) => !current)} className="auth-theme" />
        </header>
        <main id="main-content" tabIndex={-1} className="auth-sheet">
          {children}
          <a href="/privacy">Privacy and data requests</a>
        </main>
      </div>
    </div>
  );
}

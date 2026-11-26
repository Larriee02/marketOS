import { ArrowLeft, LogOut, Settings } from 'lucide-react';
import { MarketOSLogo } from '../components/ui/MarketOSLogo';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { AdminConsole } from '../components/admin/AdminConsole';
import './admin-page.css';

export function AdminPage({ currentUser, darkMode, setDarkMode, onNavigate, onLogout, onToast }) {
  return (
    <div className="admin-page">
      <header className="admin-top">
        <div className="admin-wrap">
          <div className="admin-identity">
            <MarketOSLogo variant="icon" size="sm" />
            <span>{currentUser.full_name}<small>Administrator</small></span>
          </div>
          <div className="admin-actions" aria-label="Account actions" role="group">
            <button type="button" className="admin-button" onClick={() => onNavigate('/store/sell')}>
              <ArrowLeft size={16} aria-hidden="true" /> Back to shop
            </button>
            <button type="button" className="admin-button" onClick={() => onNavigate('/settings')} aria-label="Shop settings" title="Shop settings">
              <Settings size={17} aria-hidden="true" />
            </button>
            <ThemeToggle darkMode={darkMode} onToggle={() => setDarkMode((value) => !value)} className="admin-button" />
            <button type="button" className="admin-button" onClick={onLogout} aria-label="Sign out" title="Sign out">
              <LogOut size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      <main className="admin-wrap admin-main">
        <h1>Admin console</h1>
        <AdminConsole currentUser={currentUser} onToast={onToast} />
      </main>
    </div>
  );
}

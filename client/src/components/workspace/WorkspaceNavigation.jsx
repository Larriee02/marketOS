import { ThemeToggle } from '../ui/ThemeToggle';
import { BarChart3, CalendarCheck, Grid2X2, History, House, LogOut, Package, Plus, Settings, ShieldCheck, UserRound, Users, Wallet } from 'lucide-react';

const links = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'inventory', label: 'Stock', icon: Package },
  { id: 'history', label: 'Sales', icon: History },
  { id: 'cashbook', label: 'Cashbook', icon: Wallet },
  { id: 'debtors', label: 'Debts', icon: Users },
  { id: 'analytics', label: 'Reports', icon: BarChart3 },
];

const mobileLinks = [...links.slice(0, 2), { id: 'counter', label: 'Sale', icon: Plus }, links[4], { id: 'more', label: 'More', icon: Grid2X2 }];

export function WorkspaceNavigation({ active, user, darkMode, onTheme, onSelect, onSettings, onAdmin, onLogout, onClosing }) {
  const name = user.full_name || user.business_name || 'MarketOS';
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return (
    <>
      <aside className="workspace-sidebar" aria-label="Workspace">
        <div className="space-y-5">
          <button className="workspace-wordmark" onClick={() => onSelect('home')}>MarketOS</button>
          <div className="workspace-owner"><Package size={16} /><span>{user.business_name || 'Your shop'}</span></div>
          <button className="workspace-primary w-full" onClick={() => onSelect('counter')} aria-current={active === 'counter' ? 'page' : undefined}>
            <Plus size={17} /> Record Sale
          </button>
          <nav className="space-y-1" aria-label="Desktop navigation">
            {links.map(({ id, label, icon: Icon }) => (
              <button key={id} className="workspace-link" aria-current={id === active ? 'page' : undefined} onClick={() => onSelect(id)}>
                <Icon size={17} /> {label}
              </button>
            ))}
            <button className="workspace-link" onClick={onClosing}><CalendarCheck size={17} /> Daily Closing</button>
          </nav>
        </div>
        <div className="space-y-1">
          <button className="workspace-link" onClick={onSettings}><Settings size={17} /> Settings &amp; Shop</button>
          {onAdmin && <button className="workspace-link" onClick={onAdmin}><ShieldCheck size={17} /> Admin Console</button>}
          <button className="workspace-link" onClick={onLogout}><LogOut size={17} /> Sign Out</button>
        </div>
      </aside>
      <header className="workspace-topbar">
        <div className="workspace-desktop-title"><b>MarketOS Workspace</b><span aria-hidden="true">/</span><span>{links.find((link) => link.id === active)?.label || 'Main Counter'}</span></div>
        <div className="workspace-mobile-title">
          <button className="workspace-wordmark" onClick={() => onSelect('home')}>MarketOS</button>
          <span>{user.business_name || 'Your shop'}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <ThemeToggle className="workspace-icon-button workspace-theme-toggle" darkMode={darkMode} onToggle={onTheme} />
          <button className="workspace-profile" onClick={onSettings} aria-label="Account settings">
            <span className="workspace-avatar">{initials || <UserRound size={16} />}</span>
            <span className="workspace-profile-name">{name}</span>
          </button>
        </div>
      </header>
      <nav className="workspace-bottom-nav" aria-label="Mobile navigation">
        {mobileLinks.map(({ id, label, icon: Icon }) => (
          <button key={id} className="workspace-mobile-link" aria-current={id === active ? 'page' : undefined} onClick={() => onSelect(id)}>
            <span className={id === 'counter' ? 'workspace-sale-icon' : ''}><Icon size={id === 'counter' ? 23 : 19} /></span>
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}

export function WorkspaceMore({ user, onSelect, onSettings, onAdmin, onLogout, onClosing }) {
  const items = [
    ['Sales & activity', History, () => onSelect('history')],
    ['Cashbook', Wallet, () => onSelect('cashbook')],
    ['Daily Closing', CalendarCheck, onClosing],
    ['Reports', BarChart3, () => onSelect('analytics')],
    ['Settings & Shop', Settings, onSettings],
    ...(onAdmin ? [['Admin Console', ShieldCheck, onAdmin]] : []),
    ['Sign Out', LogOut, onLogout],
  ];
  return (
    <section className="space-y-4">
      <h1 className="workspace-title">More</h1>
      <div className="workspace-panel divide-y divide-[var(--border-outer)]">
        {items.map(([label, Icon, handler]) => (
          <button className="workspace-link min-h-12" key={label} onClick={handler}><Icon size={18} />{label}</button>
        ))}
      </div>
    </section>
  );
}

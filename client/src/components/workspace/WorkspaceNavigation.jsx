import {
  BarChart3, CalendarCheck, ChevronRight, Grid2X2, History, House, LogOut,
  Package, Plus, Settings, ShieldCheck, Store, UserRound, Users, Wallet,
} from 'lucide-react';
import { MarketOSLogo } from '../ui/MarketOSLogo';
import { ThemeToggle } from '../ui/ThemeToggle';

const home = { id: 'home', label: 'Home', icon: House };
const stock = { id: 'inventory', label: 'Stock', icon: Package };
const money = { id: 'cashbook', label: 'Money', icon: Wallet };
const more = { id: 'more', label: 'More', icon: Grid2X2 };
const sell = { id: 'counter', label: 'Sell', icon: Plus };
const desktopLinks = [home, stock, money, more];
const mobileLinks = [home, stock, sell, money, more];
const otherPageNames = { counter: 'Make a sale', history: 'Sales & stock history', debtors: 'Debts', analytics: 'Reports' };

function ShopWordmark({ onClick }) {
  return (
    <button className="workspace-wordmark" onClick={onClick} aria-label="MarketOS home">
      <MarketOSLogo variant="icon" size="sm" />
      <span>Market<span className="workspace-wordmark-os">OS</span></span>
    </button>
  );
}

export function WorkspaceNavigation({ active, user, darkMode, onTheme, onSelect, onSettings, onAdmin, onLogout }) {
  const name = user.full_name || user.business_name || 'MarketOS';
  const shop = user.business_name || 'Your shop';
  const page = desktopLinks.find((link) => link.id === active)?.label || otherPageNames[active];
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <>
      <aside className="workspace-sidebar" aria-label="Workspace">
        <div className="workspace-sidebar-main">
          <ShopWordmark onClick={() => onSelect('home')} />
          <button className="workspace-sell-link" onClick={() => onSelect('counter')} aria-current={active === 'counter' ? 'page' : undefined}>
            <Plus size={19} /> Make a sale
          </button>
          <nav className="workspace-rail-links" aria-label="Desktop navigation">
            {desktopLinks.map(({ id, label, icon: Icon }) => (
              <button key={id} className="workspace-link" aria-current={id === active ? 'page' : undefined} onClick={() => onSelect(id)}>
                <Icon size={19} /> {label}
              </button>
            ))}
          </nav>
        </div>
        <div className="workspace-rail-account">
          <button className="workspace-link" onClick={onSettings}><Settings size={18} /> Settings &amp; Shop</button>
          {onAdmin && <button className="workspace-link" onClick={onAdmin}><ShieldCheck size={18} /> Admin Console</button>}
          <button className="workspace-link" onClick={onLogout}><LogOut size={18} /> Sign Out</button>
        </div>
      </aside>

      <header className="workspace-topbar">
        <div className="workspace-desktop-title">
          <Store size={18} aria-hidden="true" /><span className="workspace-shop-name">{shop}</span>
          <ChevronRight size={14} aria-hidden="true" /><strong>{page}</strong>
        </div>
        <div className="workspace-mobile-title"><ShopWordmark onClick={() => onSelect('home')} /></div>
        <div className="workspace-account-controls">
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
            <span className={id === 'counter' ? 'workspace-sale-icon' : ''}><Icon size={id === 'counter' ? 22 : 19} /></span>
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}

export function WorkspaceMore({ onSelect, onSettings, onAdmin, onLogout, onClosing }) {
  const groups = [
    ['Shop records', [
      ['Sales & activity', History, () => onSelect('history')],
      ['Customer debts', Users, () => onSelect('debtors')],
      ['Check today’s cash', CalendarCheck, onClosing],
      ['Reports', BarChart3, () => onSelect('analytics')],
    ]],
    ['Your account', [
      ['Settings & Shop', Settings, onSettings],
      ...(onAdmin ? [['Admin Console', ShieldCheck, onAdmin]] : []),
      ['Sign Out', LogOut, onLogout],
    ]],
  ];
  return (
    <section className="workspace-directory">
      <h1 className="workspace-title">More</h1>
      <div className="workspace-directory-groups">
        {groups.map(([title, items]) => (
          <section className="workspace-directory-section" key={title}>
            <h2>{title}</h2>
            {items.map(([label, Icon, handler]) => (
              <button key={label} onClick={handler}><Icon size={19} />{label}<ChevronRight size={16} /></button>
            ))}
          </section>
        ))}
      </div>
    </section>
  );
}

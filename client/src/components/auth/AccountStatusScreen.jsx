import '../../pages/account-pages.css';
import { ThemeToggle } from '../ui/ThemeToggle';
import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldAlert,
  XCircle,
  RefreshCw,
  LogOut,
  Store,
  Mail,
  Settings,
} from 'lucide-react';
import { apiFetch } from '../../services/api';
import { Badge } from '../ui/Badge';
import { MarketOSLogo } from '../ui/MarketOSLogo';

export function AccountStatusScreen({
  user,
  darkMode,
  setDarkMode,
  onUserUpdated,
  onNavigate,
  onLogout,
}) {
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(new Date());

  const checkStatus = async () => {
    setChecking(true);
    try {
      const data = await apiFetch('/api/v1/auth/me');
      setLastChecked(new Date());
      if (data?.user) {
        onUserUpdated(data.user);
      }
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (user?.status !== 'PENDING') return;
    const timer = setInterval(checkStatus, 10000);
    return () => clearInterval(timer);
  }, [user?.status]);

  const isPending = user?.status === 'PENDING';
  const isSuspended = user?.status === 'SUSPENDED';

  return (
    <div className="account-page account-status min-h-screen flex flex-col p-4 sm:p-6">
      <header className="account-status-header max-w-4xl w-full mx-auto flex items-center justify-between flex-wrap gap-3">
        <MarketOSLogo size="sm" />

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('/settings')}
              className="liquid-glass-subtle px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 text-theme-primary cursor-pointer"
            >
              <Settings className="w-4 h-4 text-theme-brand" />
              <span>Settings</span>
            </button>
          )}

          <ThemeToggle darkMode={darkMode} onToggle={() => setDarkMode((current) => !current)}
            className="liquid-glass-subtle px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 text-theme-primary cursor-pointer" labelClassName="" />

          <button
            type="button"
            onClick={onLogout}
            className="liquid-glass-subtle px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 text-theme-outflow cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="max-w-lg w-full mx-auto my-auto py-8">
        <div className="account-status-card space-y-5">
          <div className="w-14 h-14 rounded-2xl liquid-glass-subtle flex items-center justify-center">
            {isPending ? (
              <Clock className="w-8 h-8 text-theme-warning" />
            ) : isSuspended ? (
              <ShieldAlert className="w-8 h-8 text-theme-outflow" />
            ) : (
              <XCircle className="w-8 h-8 text-theme-outflow" />
            )}
          </div>

          <div className="space-y-2">
            <Badge variant={isPending ? 'warning' : 'danger'}>
              {isPending
                ? 'PENDING APPROVAL'
                : isSuspended
                ? 'ACCOUNT SUSPENDED'
                : 'ACCESS DECLINED'}
            </Badge>

            <h1 className="text-xl sm:text-2xl font-extrabold font-luxury text-theme-primary pt-1">
              {isPending
                ? 'Your shop is under review'
                : isSuspended
                ? 'Your account is paused'
                : 'Registration declined'}
            </h1>

            <p className="text-xs sm:text-sm text-theme-secondary leading-relaxed">
              {isPending
                ? 'We received your registration. Your shop will open here when an administrator approves it.'
                : isSuspended
                ? 'Access to this account has been temporarily paused by an administrator.'
                : 'Your registration request was declined by the administrator.'}
            </p>
          </div>

          <div className="account-facts text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-theme-secondary font-semibold flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" /> Shop name
              </span>
              <span className="font-extrabold text-theme-primary">{user?.business_name}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-theme-secondary font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email
              </span>
              <span className="font-bold text-theme-primary">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-theme-secondary font-semibold">Sign-in method</span>
              <Badge variant="info">{user?.auth_provider}</Badge>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={checkStatus}
              disabled={checking}
              className="liquid-btn-primary flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking...' : 'Check Status'}</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="liquid-glass-subtle py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold text-theme-secondary cursor-pointer"
            >
              Switch Account
            </button>
          </div>

          <p className="text-[11px] text-theme-secondary">
            Last checked at {lastChecked.toLocaleTimeString()}
          </p>
        </div>
      </main>

    </div>
  );
}

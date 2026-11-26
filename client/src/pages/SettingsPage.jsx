import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, LogOut } from 'lucide-react';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { MarketOSLogo } from '../components/ui/MarketOSLogo';
import { apiFetch } from '../services/api';
import { CURRENCY_OPTIONS } from '../utils/currency';
import { BUSINESS_TYPES, LAGOS_LOCATIONS } from '../components/auth/OAuthButtons';
import './shop-settings.css';

const emptyPassword = { current_password: '', new_password: '', confirm_password: '' };
const currencyChoices = CURRENCY_OPTIONS.map(({ code, name }) => [code, `${code} · ${name}`]);

function shopDetails(user) {
  return {
    full_name: user.full_name || '',
    business_name: user.business_name || '',
    phone: user.phone || '',
    business_type: user.business_type || BUSINESS_TYPES[0],
    city: user.city || LAGOS_LOCATIONS[0],
    currency: user.currency || 'NGN',
  };
}

export function SettingsPage({
  currentUser, darkMode, setDarkMode, onUserUpdated, onNavigate, onLogout, onToast,
}) {
  const [profile, setProfile] = useState(() => shopDetails(currentUser));
  const [password, setPassword] = useState(emptyPassword);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const passwordRequired = currentUser.must_change_password;

  const editProfile = (event) => {
    const { name, value } = event.target;
    setProfile((previous) => ({ ...previous, [name]: value }));
    setProfileError('');
  };

  async function saveProfile(event) {
    event.preventDefault();
    if (submittingProfile) return;
    setSubmittingProfile(true);
    setProfileError('');
    try {
      const { user } = await apiFetch('/api/v1/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      });
      setProfile(shopDetails(user));
      onUserUpdated(user);
      onToast('Shop details saved.');
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setSubmittingProfile(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    if (submittingPassword) return;
    if (password.new_password !== password.confirm_password) {
      setPasswordError('The new passwords don’t match.');
      return;
    }
    setPasswordError('');
    setSubmittingPassword(true);
    try {
      const { user } = await apiFetch('/api/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: password.current_password,
          new_password: password.new_password,
        }),
      });
      onUserUpdated(user);
      setPassword(emptyPassword);
      onToast('Password updated.');
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setSubmittingPassword(false);
    }
  }

  const profileChoices = [
    ['business_type', 'Business category', BUSINESS_TYPES.map((type) => [type, type])],
    ['city', 'Location', LAGOS_LOCATIONS.map((location) => [location, location])],
    ['currency', 'Shop currency', currencyChoices],
  ];

  const details = (
    <section id="shop-details" className="settings-panel" aria-labelledby="shop-details-title">
      <header>
        <h2 id="shop-details-title">Shop details</h2>
        <p>Shop name and contact details are used on receipts.</p>
      </header>
      <form onSubmit={saveProfile}>
        <fieldset disabled={submittingProfile} className="settings-fields">
          <label htmlFor="shop-business_name">Shop name
            <input id="shop-business_name" name="business_name" value={profile.business_name} onChange={editProfile} autoComplete="organization" required />
          </label>
          <label htmlFor="shop-full_name">Full name
            <input id="shop-full_name" name="full_name" value={profile.full_name} onChange={editProfile} autoComplete="name" required />
          </label>
          <label htmlFor="shop-phone"><span>Phone number <small>(optional)</small></span>
            <input id="shop-phone" name="phone" type="tel" value={profile.phone} onChange={editProfile} autoComplete="tel" />
          </label>
          {profileChoices.map(([name, label, options]) => (
            <label key={name} htmlFor={'shop-' + name}>{label}
              <select id={'shop-' + name} name={name} value={profile[name]} onChange={editProfile}
                aria-describedby={name === 'currency' ? 'settings-currency-help' : undefined}>
                {!options.some(([code]) => code === profile[name]) && <option value={profile[name]}>{profile[name]}</option>}
                {options.map(([code, text]) => <option key={code} value={code}>{text}</option>)}
              </select>
              {name === 'currency' && <small id="settings-currency-help">Sets the currency shown on prices, sales, and reports.</small>}
            </label>
          ))}
        </fieldset>
        <footer className="settings-save">
          {profileError && <p role="alert">{profileError}</p>}
          <button type="submit" className="settings-primary" disabled={submittingProfile}>
            {submittingProfile ? 'Saving…' : 'Save shop details'}
          </button>
        </footer>
      </form>
    </section>
  );

  const security = (
    <section id="shop-security" className="settings-panel" aria-labelledby="shop-security-title">
      <header>
        <h2 id="shop-security-title">Password &amp; security</h2>
        <p>{passwordRequired ? 'Change your temporary password to open your workspace.'
          : 'Use at least 12 characters for your new password.'}</p>
      </header>
      <form onSubmit={changePassword}>
        <fieldset disabled={submittingPassword} className="settings-fields settings-password-fields">
          {[
            ['current_password', 'Current password'],
            ['new_password', 'New password'],
            ['confirm_password', 'Confirm new password'],
          ].map(([name, label]) => (
            <label key={name} htmlFor={'shop-' + name}>{label}
              <input id={'shop-' + name} type="password" value={password[name]}
                autoComplete={name === 'current_password' ? 'current-password' : 'new-password'}
                required={name !== 'current_password' || passwordRequired || currentUser.auth_provider === 'EMAIL'}
                minLength={name === 'current_password' ? undefined : 12}
                onChange={(event) => {
                  setPassword({ ...password, [name]: event.target.value });
                  setPasswordError('');
                }} />
            </label>
          ))}
        </fieldset>
        <footer className="settings-save">
          {passwordError && <p role="alert">{passwordError}</p>}
          <button type="submit" className="settings-primary" disabled={submittingPassword}>
            {submittingPassword ? 'Updating…' : 'Update password'}
          </button>
        </footer>
      </form>
    </section>
  );

  return (
    <div className="shop-settings">
      <header className="settings-top">
        <div className="settings-wrap">
          <MarketOSLogo variant="icon" size="sm" />
          <div className="settings-top-actions">
            <ThemeToggle darkMode={darkMode} onToggle={() => setDarkMode((value) => !value)} className="settings-button settings-theme" />
            {!passwordRequired && <button type="button" className="settings-button" onClick={() => onNavigate('/store/sell')}>
              <ArrowLeft size={16} aria-hidden="true" /> Back to shop
            </button>}
          </div>
        </div>
      </header>
      <main className="settings-wrap settings-main">
        <h1>Shop settings</h1>
        <div className="settings-layout">
          <aside className="settings-account">
            <h2>Signed-in account</h2>
            <strong>{currentUser.full_name}</strong>
            <p>{currentUser.email}</p>
            <div className="settings-account-actions">
              {currentUser.role === 'ADMIN' && !passwordRequired && (
                <button type="button" className="settings-button" onClick={() => onNavigate('/admin')}>
                  Admin console <ArrowUpRight size={15} aria-hidden="true" />
                </button>
              )}
              <button type="button" className="settings-button" onClick={onLogout}>
                <LogOut size={15} aria-hidden="true" /> Sign out
              </button>
            </div>
          </aside>
          <div className="settings-panels">
            {passwordRequired ? <>{security}{details}</> : <>{details}{security}</>}
          </div>
        </div>
      </main>
    </div>
  );
}

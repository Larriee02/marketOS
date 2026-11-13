import React, { useState } from 'react';
import {
  Package,
  ShoppingCart,
  Wallet,
  Users,
  BarChart3,
  Sun,
  Moon,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  UserPlus,
  ShieldCheck,
} from 'lucide-react';
import { apiFetch, setStoredToken } from '../services/api';
import { OAuthButtons } from '../components/auth/OAuthButtons';
import { OtpVerificationStep } from '../components/auth/OtpVerificationStep';
import { MarketOSLogo } from '../components/ui/MarketOSLogo';

export function LoginPage({ darkMode, setDarkMode, onAuthenticated, onNavigate }) {
  const [loginMethod, setLoginMethod] = useState('EMAIL'); // 'EMAIL' | 'PHONE'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step state: 'FORM' | 'OTP'
  const [step, setStep] = useState('FORM');
  const [otpInfo, setOtpInfo] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const data = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      // Two-Factor Email OTP required
      if (data.otpRequired) {
        setOtpInfo(data);
        setStep('OTP');
        return;
      }

      if (data.token) setStoredToken(data.token);
      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtpAndLogin = async (otpCode) => {
    setSubmitting(true);
    setError('');
    try {
      const data = await apiFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: otpInfo?.email || identifier.trim(),
          password,
          otp: otpCode,
        }),
      });

      if (data.token) setStoredToken(data.token);
      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    const data = await apiFetch('/api/v1/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({
        purpose: 'LOGIN',
        identifier: otpInfo?.email || identifier.trim(),
      }),
    });
    setOtpInfo(data);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {/* Header */}
      <header className="max-w-6xl w-full mx-auto flex flex-wrap items-center justify-between gap-3">
        <MarketOSLogo size="md" showTagline />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('/signup')}
            className="liquid-btn-primary px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>

          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="liquid-glass-subtle px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 text-theme-primary cursor-pointer"
          >
            {darkMode ? (
              <>
                <Sun className="w-4 h-4 text-sky-400" />
                <span className="hidden xs:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-theme-brand" />
                <span className="hidden xs:inline">Dark</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main
        id="main-content"
        className="max-w-6xl w-full mx-auto my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center"
      >
        {/* Left Column: MarketOS Brand Overview */}
        <div className="lg:col-span-6 space-y-6">
          <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold font-luxury leading-[1.12] text-theme-primary">
            Everything your business needs, <span className="text-theme-brand">in one place.</span>
          </h1>

          <p className="text-sm text-theme-secondary leading-relaxed max-w-md">
            Track stock, record sales, manage cash, and monitor debts — in one simple platform.
          </p>

          {/* Live 3D Layered MarketOS App-Frame Preview */}
          <div className="app-frame-3d pt-1">
            <div className="app-frame-3d-inner liquid-glass-elevated rounded-3xl p-4 space-y-3">
              <div className="marketos-hero-card rounded-2xl p-3.5 relative overflow-hidden">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 280 64"
                  className="absolute right-0 bottom-0 w-44 h-16 opacity-25 pointer-events-none"
                  fill="none"
                >
                  <path
                    d="M0 54 C 45 48, 80 30, 125 36 C 170 42, 205 18, 260 10"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="relative flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-100">
                      Business Overview
                    </p>
                    <p className="text-xl font-extrabold font-luxury tabular-nums text-white mt-0.5">
                      ₦245,000
                    </p>
                  </div>
                  <span className="text-[11px] font-extrabold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 px-2.5 py-0.5 rounded-full tabular-nums">
                    +12% this week
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="liquid-glass-subtle rounded-xl p-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-theme-secondary">
                    Stock Left
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-base font-extrabold font-luxury tabular-nums text-theme-primary">
                      542
                    </span>
                    <span className="text-[10px] font-bold text-theme-inflow">In Stock</span>
                  </div>
                </div>
                <div className="liquid-glass-subtle rounded-xl p-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-theme-secondary">
                    Cash Balance
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-base font-extrabold font-luxury tabular-nums text-theme-primary">
                      ₦98,500
                    </span>
                    <span className="text-[10px] font-bold text-theme-brand">Synced</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sign In Card */}
        <div className="lg:col-span-6">
          <div className="liquid-glass-elevated rounded-3xl p-5 sm:p-8 space-y-5">
            {step === 'OTP' ? (
              <OtpVerificationStep
                purpose="LOGIN"
                email={otpInfo?.email || identifier}
                maskedDestination={otpInfo?.maskedDestination}
                otpPreview={otpInfo?.otpPreview}
                deliveryResults={otpInfo?.deliveryResults}
                submitting={submitting}
                error={error}
                onVerify={handleVerifyOtpAndLogin}
                onResend={handleResendOtp}
                onBack={() => setStep('FORM')}
              />
            ) : (
              <>
                <div className="flex items-center justify-between border-b pb-4 theme-divider">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold font-luxury text-theme-primary">
                      Sign In
                    </h2>
                    <p className="text-xs text-theme-secondary mt-0.5">
                      Access your store workspace or admin console
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('/signup')}
                    className="text-xs font-extrabold text-theme-brand hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Create Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Google OAuth Button */}
                <OAuthButtons
                  actionLabel="Sign in"
                  onAuthenticated={onAuthenticated}
                  onError={setError}
                />

                <div className="relative flex items-center justify-center">
                  <div className="border-t w-full theme-divider" />
                  <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-theme-muted whitespace-nowrap">
                    or sign in with email or phone
                  </span>
                  <div className="border-t w-full theme-divider" />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="p-3 rounded-2xl text-xs font-bold text-theme-outflow bg-rose-500/10 border border-rose-500/25"
                  >
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Sign-In Method Switcher: Email or Phone Number */}
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl liquid-glass-subtle">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMethod('EMAIL');
                        setIdentifier('');
                        setError('');
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        loginMethod === 'EMAIL'
                          ? 'liquid-btn-primary'
                          : 'text-theme-secondary hover:text-theme-primary'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email Address</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMethod('PHONE');
                        setIdentifier('');
                        setError('');
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        loginMethod === 'PHONE'
                          ? 'liquid-btn-primary'
                          : 'text-theme-secondary hover:text-theme-primary'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Phone Number</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-theme-primary">
                      {loginMethod === 'PHONE' ? 'Phone Number' : 'Email Address'}
                    </label>
                    <div className="relative">
                      {loginMethod === 'PHONE' ? (
                        <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-secondary" />
                      ) : (
                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-secondary" />
                      )}
                      <input
                        type={loginMethod === 'PHONE' ? 'tel' : 'email'}
                        required
                        autoComplete={loginMethod === 'PHONE' ? 'tel' : 'email'}
                        placeholder={
                          loginMethod === 'PHONE' ? '0803 000 0000' : 'name@company.com'
                        }
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="liquid-input w-full pl-10 pr-4 py-3 rounded-2xl text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-theme-primary">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-secondary" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="liquid-input w-full pl-10 pr-10 py-3 rounded-2xl text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-secondary hover:text-theme-primary cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="liquid-btn-primary w-full py-3.5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{submitting ? 'Verifying...' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="pt-2 border-t theme-divider text-center">
                  <p className="text-xs text-theme-secondary">
                    Don&apos;t have an account yet?{' '}
                    <button
                      type="button"
                      onClick={() => onNavigate('/signup')}
                      className="font-extrabold text-theme-brand underline cursor-pointer"
                    >
                      Register a new account
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-6xl w-full mx-auto text-center text-[11px] text-theme-muted">
        MarketOS • Run your market. Smarter. • Track • Manage • Grow
      </footer>
    </div>
  );
}

import { AuthLayout } from '../components/auth/AuthLayout';
import React, { useState } from 'react';
import {
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import { apiFetch, setStoredToken } from '../services/api';
import { OAuthButtons } from '../components/auth/OAuthButtons';
import { OtpVerificationStep } from '../components/auth/OtpVerificationStep';

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
    <AuthLayout darkMode={darkMode} setDarkMode={setDarkMode} onNavigate={onNavigate}>
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
          <div className="auth-intro">
            <h1>Sign in to your shop</h1>
            <p>Use Google, email or your phone number to sign in.</p>
          </div>

          {/* Google OAuth Button */}
          <OAuthButtons
            actionLabel="Sign in"
            onAuthenticated={onAuthenticated}
            onError={setError}
          />

          <div className="auth-separator">
            <div className="border-t w-full theme-divider" />
            <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-theme-muted whitespace-nowrap">
              or
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
            <div className="auth-methods">
              <button
                type="button"
                aria-pressed={loginMethod === 'EMAIL'}
                onClick={() => {
                  setLoginMethod('EMAIL');
                  setIdentifier('');
                  setError('');
                }}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Address</span>
              </button>
              <button
                type="button"
                aria-pressed={loginMethod === 'PHONE'}
                onClick={() => {
                  setLoginMethod('PHONE');
                  setIdentifier('');
                  setError('');
                }}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Phone Number</span>
              </button>
            </div>

            <div>
              <label htmlFor="login-identifier" className="block text-xs font-bold mb-1.5 text-theme-primary">
                {loginMethod === 'PHONE' ? 'Phone Number' : 'Email Address'}
              </label>
              <div className="relative">
                {loginMethod === 'PHONE' ? (
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-secondary" />
                ) : (
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-secondary" />
                )}
                <input id="login-identifier"
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
              <label htmlFor="login-password" className="block text-xs font-bold mb-1.5 text-theme-primary">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-secondary" />
                <input id="login-password"
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

        </>
      )}
    </AuthLayout>
  );
}

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
import { apiFetch } from '../services/api';
import { OAuthButtons } from '../components/auth/OAuthButtons';
import { OtpVerificationStep } from '../components/auth/OtpVerificationStep';

export function LoginPage({ darkMode, setDarkMode, onAuthenticated, onNavigate }) {
  const [loginMethod, setLoginMethod] = useState('EMAIL'); // 'EMAIL' | 'PHONE'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(() => new URLSearchParams(location.search).has('oauth_error') ? 'Google sign-in could not be completed. Please try again or use your original sign-in method.' : '');

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
          rememberMe,
          password,
        }),
      });

      // Two-Factor Email OTP required
      if (data.otpRequired) {
        setOtpInfo(data);
        setStep('OTP');
        return;
      }

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
          rememberMe,
          password,
          otp: otpCode,
        }),
      });

      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    const data = await apiFetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        password,
        identifier: otpInfo?.email || identifier.trim(),
      }),
    });
    setOtpInfo(data);
  };

  const handleRecovery = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const requesting = step === 'REQUEST';
      const result = await apiFetch('/api/v1/auth/password/' + (requesting ? 'request' : 'reset'), {
        method: 'POST',
        body: JSON.stringify(requesting ? { email: resetEmail } : { email: resetEmail, code: resetCode, password: newPassword }),
      });
      setNotice(result.message);
      setStep(requesting ? 'RESET' : 'FORM');
      if (!requesting) {
        setIdentifier(resetEmail);
        setLoginMethod('EMAIL');
        setPassword('');
        setNewPassword('');
        setResetCode('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout darkMode={darkMode} setDarkMode={setDarkMode} onNavigate={onNavigate}>
      {notice && <p role="status">{notice}</p>}
      {step === 'REQUEST' || step === 'RESET' ? (
        <form onSubmit={handleRecovery} className="space-y-4">
          <div className="auth-intro"><h1>Reset your password</h1></div>
          {error && <p role="alert" className="text-theme-outflow">{error}</p>}
          <label className="block">Account email
            <input type="email" required autoComplete="email" readOnly={step === 'RESET'} value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="liquid-input w-full p-3" />
          </label>
          {step === 'RESET' && <>
            <label className="block">6-digit email code
              <input required inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" value={resetCode} onChange={e => setResetCode(e.target.value)} className="liquid-input w-full p-3" />
            </label>
            <label className="block">New password
              <input required type="password" minLength={12} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="liquid-input w-full p-3" />
            </label>
          </>}
          <button disabled={submitting} className="liquid-btn-primary w-full p-3">{step === 'REQUEST' ? 'Email reset code' : 'Save new password'}</button>
          <button type="button" disabled={submitting} onClick={() => { setStep('FORM'); setError(''); setNotice(''); setNewPassword(''); setResetCode(''); }}>Back to sign in</button>
        </form>
      ) : step === 'OTP' ? (
        <OtpVerificationStep
          purpose="LOGIN"
          email={otpInfo?.email || identifier}
          maskedDestination={otpInfo?.maskedDestination}
          otpPreview={otpInfo?.otpPreview}
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

            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} /> Remember me</label>
              <button type="button" className="text-theme-brand" onClick={() => { setResetEmail(loginMethod === 'EMAIL' ? identifier : ''); setError(''); setNotice(''); setStep('REQUEST'); }}>Forgot password?</button>
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

          <div className="auth-google">
            <OAuthButtons actionLabel="Sign in" showPopupNotice={false} onAuthenticated={onAuthenticated} onError={setError} />
          </div>

        </>
      )}
    </AuthLayout>
  );
}

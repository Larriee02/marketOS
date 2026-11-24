import { AuthLayout } from '../components/auth/AuthLayout';
import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  Store,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  Globe,
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { CURRENCY_OPTIONS } from '../utils/currency';
import {
  OAuthButtons,
  BUSINESS_TYPES,
  LAGOS_LOCATIONS,
} from '../components/auth/OAuthButtons';
import { OtpVerificationStep } from '../components/auth/OtpVerificationStep';

export function SignupPage({ darkMode, setDarkMode, onAuthenticated, onNavigate }) {
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step state: 'FORM' | 'OTP'
  const [step, setStep] = useState('FORM');
  const [otpInfo, setOtpInfo] = useState(null);

  const [signupForm, setSignupForm] = useState({
    full_name: '',
    business_name: '',
    email: '',
    phone: '',
    business_type: BUSINESS_TYPES[0],
    city: LAGOS_LOCATIONS[0],
    currency: 'NGN',
    role: 'USER',
    password: '',
    confirm_password: '',
  });

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (signupForm.password !== signupForm.confirm_password) {
      return setError('Passwords do not match.');
    }
    setSubmitting(true);
    setError('');
    try {
      const data = await apiFetch('/api/v1/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({
          purpose: 'SIGNUP',
          email: signupForm.email.trim(),
          full_name: signupForm.full_name.trim(),
          business_name: signupForm.business_name.trim(),
        }),
      });

      setOtpInfo(data);
      setStep('OTP');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtpAndRegister = async (otpCode) => {
    setSubmitting(true);
    setError('');
    try {
      const data = await apiFetch('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          ...signupForm,
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
    const data = await apiFetch('/api/v1/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({
        purpose: 'SIGNUP',
        email: signupForm.email.trim(),
        full_name: signupForm.full_name.trim(),
      }),
    });
    setOtpInfo(data);
  };

  return (
    <AuthLayout signup darkMode={darkMode} setDarkMode={setDarkMode} onNavigate={onNavigate}>
      {step === 'OTP' ? (
        <OtpVerificationStep
          purpose="SIGNUP"
          email={signupForm.email}
          maskedDestination={otpInfo?.maskedDestination}
          otpPreview={otpInfo?.otpPreview}
          deliveryResults={otpInfo?.deliveryResults}
          submitting={submitting}
          error={error}
          onVerify={handleVerifyOtpAndRegister}
          onResend={handleResendOtp}
          onBack={() => setStep('FORM')}
        />
      ) : (
        <>
          <div className="auth-intro">
            <h1>Create your account</h1>
            <p>Enter your shop details. We’ll email you a code to verify your account.</p>
          </div>

          {/* Google OAuth Sign-Up Button */}
          <OAuthButtons
            actionLabel="Sign up"
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

          <form onSubmit={handleRequestOtp} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="signup-name" className="block text-xs font-bold mb-1 text-theme-primary">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-secondary" />
                  <input id="signup-name"
                    type="text"
                    required
                    placeholder="Full name"
                    value={signupForm.full_name}
                    onChange={(e) =>
                      setSignupForm({ ...signupForm, full_name: e.target.value })
                    }
                    className="liquid-input w-full pl-10 pr-3 py-2.5 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-shop" className="block text-xs font-bold mb-1 text-theme-primary">
                  Shop name
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-secondary" />
                  <input id="signup-shop"
                    type="text"
                    required
                    placeholder="Business or store name"
                    value={signupForm.business_name}
                    onChange={(e) =>
                      setSignupForm({ ...signupForm, business_name: e.target.value })
                    }
                    className="liquid-input w-full pl-10 pr-3 py-2.5 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="signup-email" className="block text-xs font-bold mb-1 text-theme-primary">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-secondary" />
                  <input id="signup-email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={signupForm.email}
                    onChange={(e) =>
                      setSignupForm({ ...signupForm, email: e.target.value })
                    }
                    className="liquid-input w-full pl-10 pr-3 py-2.5 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-phone" className="block text-xs font-bold mb-1 text-theme-primary">
                  Phone number (optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-secondary" />
                  <input id="signup-phone"
                    type="tel"
                    placeholder="0803 000 0000"
                    value={signupForm.phone}
                    onChange={(e) =>
                      setSignupForm({ ...signupForm, phone: e.target.value })
                    }
                    className="liquid-input w-full pl-10 pr-3 py-2.5 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label htmlFor="signup-currency" className="block text-xs font-bold mb-1 text-theme-primary">
                  Default Currency
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-secondary" />
                  <select id="signup-currency"
                    value={signupForm.currency}
                    onChange={(e) =>
                      setSignupForm({ ...signupForm, currency: e.target.value })
                    }
                    className="liquid-input w-full pl-10 pr-3 py-2.5 rounded-xl text-xs"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} — {c.code} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="signup-category" className="block text-xs font-bold mb-1 text-theme-primary">
                  Business Category
                </label>
                <select id="signup-category"
                  value={signupForm.business_type}
                  onChange={(e) =>
                    setSignupForm({ ...signupForm, business_type: e.target.value })
                  }
                  className="liquid-input w-full px-3 py-2.5 rounded-xl text-xs"
                >
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="signup-city" className="block text-xs font-bold mb-1 text-theme-primary">
                  Location
                </label>
                <select id="signup-city"
                  value={signupForm.city}
                  onChange={(e) => setSignupForm({ ...signupForm, city: e.target.value })}
                  className="liquid-input w-full px-3 py-2.5 rounded-xl text-xs"
                >
                  {LAGOS_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="signup-password" className="block text-xs font-bold mb-1 text-theme-primary">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-secondary" />
                  <input id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={12}
                    placeholder="Minimum 12 characters"
                    value={signupForm.password}
                    onChange={(e) =>
                      setSignupForm({ ...signupForm, password: e.target.value })
                    }
                    className="liquid-input w-full pl-10 pr-9 py-2.5 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-secondary cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="signup-confirm" className="block text-xs font-bold mb-1 text-theme-primary">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-secondary" />
                  <input id="signup-confirm"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={12}
                    placeholder="Re-enter password"
                    value={signupForm.confirm_password}
                    onChange={(e) =>
                      setSignupForm({ ...signupForm, confirm_password: e.target.value })
                    }
                    className="liquid-input w-full pl-10 pr-3 py-2.5 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>


            <button
              type="submit"
              disabled={submitting}
              className="liquid-btn-primary w-full py-3.5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>
                {submitting ? 'Sending Verification Code...' : 'Continue to verification'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

        </>
      )}
    </AuthLayout>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Phone,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Sparkles,
} from 'lucide-react';

export function OtpVerificationStep({
  purpose = 'LOGIN', // 'LOGIN' | 'SIGNUP'
  email,
  phone,
  maskedDestination,
  otpPreview,
  deliveryResults = [],
  submitting,
  error,
  onVerify,
  onResend,
  onBack,
}) {
  const [code, setCode] = useState('');
  const [customPhone, setCustomPhone] = useState(phone || '');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.trim().length !== 6) return;
    onVerify(code.trim());
  };

  const activePhone = (customPhone || phone || '').trim();

  const handleTriggerResend = async (channel) => {
    if (channel === 'SMS' && !activePhone) {
      setShowPhoneInput(true);
      return;
    }
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setResendMessage('');
    try {
      await onResend(channel, activePhone);
      setResendMessage(
        channel === 'SMS'
          ? `New SMS OTP sent to ${activePhone}!`
          : channel === 'BOTH'
          ? 'New OTP sent via Email & SMS!'
          : `New Email OTP sent to ${email}!`
      );
      setShowPhoneInput(false);
      setResendCooldown(30);
    } catch {
      // error handled by parent
    } finally {
      setResending(false);
    }
  };

  const handleUsePreview = () => {
    if (otpPreview) {
      setCode(String(otpPreview));
    }
  };

  const emailDelivered =
    Array.isArray(deliveryResults) &&
    deliveryResults.some(
      (d) => d.channel === 'EMAIL' && d.success && d.provider !== 'console-simulated'
    );

  const smsDelivered =
    Array.isArray(deliveryResults) &&
    deliveryResults.some(
      (d) => d.channel === 'SMS' && d.success && d.provider !== 'console-simulated'
    );

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <div className="w-12 h-12 mx-auto rounded-2xl liquid-btn-primary flex items-center justify-center mb-2">
          <KeyRound className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-extrabold font-luxury text-theme-primary">
          {purpose === 'SIGNUP' ? 'Verify Your Account (Email & SMS OTP)' : 'Two-Factor OTP Verification'}
        </h3>
        <p className="text-xs text-theme-secondary max-w-sm mx-auto leading-relaxed">
          A 6-digit verification code has been dispatched to{' '}
          <strong className="text-theme-primary">{maskedDestination || email}</strong>.
        </p>
      </div>

      {(emailDelivered || smsDelivered) && (
        <div className="space-y-1.5">
          {emailDelivered && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Mail className="w-4 h-4 shrink-0" />
              <span>Email OTP delivered — check your Inbox or Spam</span>
            </div>
          )}
          {smsDelivered && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Phone className="w-4 h-4 shrink-0" />
              <span>SMS OTP delivered to your phone</span>
            </div>
          )}
        </div>
      )}

      {otpPreview && (
        <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-300">
            <Sparkles className="w-4 h-4 shrink-0 text-sky-500" />
            <span>
              Preview Code: <strong className="font-mono text-sm tracking-widest">{otpPreview}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={handleUsePreview}
            className="text-[11px] font-extrabold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer shrink-0"
          >
            Auto-Fill
          </button>
        </div>
      )}

      {resendMessage && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center">
          {resendMessage}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3 rounded-2xl text-xs font-bold text-theme-outflow bg-rose-500/10 border border-rose-500/25"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold mb-1.5 text-center text-theme-primary">
            Enter 6-Digit Verification Code
          </label>
          <div className="relative max-w-xs mx-auto">
            <input
              type="text"
              required
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="liquid-input w-full text-center text-2xl font-mono font-extrabold tracking-[0.5em] py-3 rounded-2xl"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || code.length !== 6}
          className="liquid-btn-primary w-full py-3.5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span>
            {submitting
              ? 'Verifying...'
              : purpose === 'SIGNUP'
              ? 'Verify & Complete Account Setup'
              : 'Verify & Sign In'}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Resend Options via Email & SMS */}
        <div className="pt-2 border-t theme-divider space-y-2.5">
          <div className="text-center text-[11px] text-theme-secondary">
            Didn&apos;t receive the verification code?
          </div>

          {showPhoneInput && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary" />
                <input
                  type="tel"
                  placeholder="Enter phone (e.g. 0803 000 0000)"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  className="liquid-input w-full pl-9 pr-3 py-2 rounded-xl text-xs"
                />
              </div>
              <button
                type="button"
                disabled={!customPhone.trim() || resending}
                onClick={() => handleTriggerResend('SMS')}
                className="liquid-btn-primary px-3 py-2 rounded-xl text-xs font-extrabold cursor-pointer disabled:opacity-50"
              >
                Send SMS
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={resendCooldown > 0 || resending}
              onClick={() => handleTriggerResend('EMAIL')}
              className="liquid-glass-subtle py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-theme-primary disabled:opacity-40 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>Resend Email OTP</span>
            </button>

            <button
              type="button"
              disabled={(resendCooldown > 0 && Boolean(activePhone)) || resending}
              onClick={() => handleTriggerResend('SMS')}
              className="liquid-glass-subtle py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-theme-primary disabled:opacity-40 cursor-pointer"
              title={activePhone ? `Send SMS OTP to ${activePhone}` : 'Enter phone number for SMS OTP'}
            >
              <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>{activePhone ? 'Resend SMS OTP' : 'Send via SMS'}</span>
            </button>
          </div>

          <div className="text-center text-[11px] text-theme-muted">
            {resendCooldown > 0 ? (
              <span>Resend available in {resendCooldown}s</span>
            ) : (
              <span>You can request a new code via Email or SMS above</span>
            )}
          </div>
        </div>

        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-bold text-theme-secondary hover:text-theme-primary inline-flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{purpose === 'SIGNUP' ? 'Back to Edit Details' : 'Back to Sign In'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

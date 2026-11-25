import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export function OtpVerificationStep({
  purpose = 'LOGIN', // 'LOGIN' | 'SIGNUP'
  email,
  maskedDestination,
  otpPreview,
  submitting,
  error,
  onVerify,
  onResend,
  onBack,
}) {
  const [code, setCode] = useState('');
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

  const handleTriggerResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setResendMessage('');
    try {
      await onResend();
      setCode('');
      setResendMessage('New code sent.');
      setResendCooldown(30);
    } catch {
      // error handled by parent
    } finally {
      setResending(false);
    }
  };

  const isSignup = purpose === 'SIGNUP';

  return (
    <section className="auth-verification">
      <header className="auth-intro">
        <h1>Check your email</h1>
        <p id="verification-instructions">
          Enter the six-digit code sent to <strong>{maskedDestination || email}</strong>.
        </p>
      </header>

      {otpPreview && (
        <button type="button" className="auth-otp-link" onClick={() => setCode(String(otpPreview))}>
          Use preview code <code>{otpPreview}</code>
        </button>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="verification-code" className="block font-bold mb-1.5">Verification code</label>
          <input
            id="verification-code"
            className="liquid-input auth-otp-code"
            type="text"
            required
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            placeholder="••••••"
            value={code}
            aria-describedby={error ? 'verification-instructions verification-error' : 'verification-instructions'}
            aria-invalid={error ? true : undefined}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          {error && <p id="verification-error" role="alert" className="mt-2 text-sm text-theme-outflow">{error}</p>}
        </div>

        <button type="submit" disabled={submitting || resending || code.length !== 6} className="liquid-btn-primary w-full items-center font-bold disabled:opacity-60">
          <span>{submitting ? 'Verifying…' : isSignup ? 'Verify and create account' : 'Verify and sign in'}</span>
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </form>

      <div className="auth-otp-footer">
        <button type="button" className="auth-otp-link" onClick={onBack}>
          <ArrowLeft size={15} aria-hidden="true" />
          {isSignup ? 'Edit details' : 'Back to sign in'}
        </button>
        <button type="button" className="auth-otp-link" onClick={handleTriggerResend} disabled={resendCooldown > 0 || resending || submitting}>
          {resending ? 'Sending…' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
        </button>
      </div>
      <p role="status" className="auth-otp-status">{resendMessage}</p>
    </section>
  );
}

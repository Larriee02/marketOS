const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const notificationService = require('./notification.service');

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const COOLDOWN_MS = 30 * 1000; // 30 seconds between requests
const MAX_ATTEMPTS = 5;

// In-memory challenge store with periodic garbage collection
const challengeStore = new Map();

function cleanExpired() {
  const now = Date.now();
  for (const [key, value] of challengeStore.entries()) {
    if (value.expiresAt < now) {
      challengeStore.delete(key);
    }
  }
}
setInterval(cleanExpired, 60 * 1000).unref?.();

const WINDOW_MS = 5 * 60 * 1000; // 5-minute stateless HMAC window (accepts current + previous = up to 10 min)

function generateStatelessCode(key, windowIdx = Math.floor(Date.now() / WINDOW_MS)) {
  const digest = crypto
    .createHmac('sha256', env.JWT_SECRET || 'stockflow-otp-secret')
    .update(`otp:${key}:${windowIdx}`)
    .digest();
  const num = digest.readUInt32BE(0) % 900000;
  return String(100000 + num);
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

class OtpService {
  /**
   * Request an Email OTP for SIGNUP or LOGIN
   */
  async requestOtp({
    purpose = 'LOGIN',
    email,
    recipientName = '',
    payload = null, // e.g. temporary signup data or userId
  }) {
    const cleanEmail = email ? String(email).trim().toLowerCase() : null;

    if (!cleanEmail) {
      throw new AppError('An email address is required for verification.', 400);
    }

    const key = `${purpose}:${cleanEmail}`;
    const existing = challengeStore.get(key);

    if (existing && Date.now() - existing.lastRequestedAt < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - (Date.now() - existing.lastRequestedAt)) / 1000);
      throw new AppError(
        `Please wait ${waitSec} second(s) before requesting another verification code.`,
        429,
        'COOLDOWN_ACTIVE'
      );
    }

    const code = generateStatelessCode(key);
    const codeHash = await bcrypt.hash(code, 8);
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    challengeStore.set(key, {
      codeHash,
      purpose,
      email: cleanEmail,
      channel: 'EMAIL',
      payload,
      recipientName,
      attempts: 0,
      createdAt: Date.now(),
      lastRequestedAt: Date.now(),
      expiresAt,
    });

    const emailResult = await notificationService
      .sendEmailOtp({
        to: cleanEmail,
        code,
        recipientName,
        purpose,
      })
      .then((res) => ({ channel: 'EMAIL', ...res }))
      .catch((err) => {
        console.warn('[OtpService] Email notification error:', err.message);
        return { channel: 'EMAIL', error: err.message };
      });

    const deliveryResults = [emailResult];
    const maskedDestination = maskEmail(cleanEmail);

    const response = {
      success: true,
      purpose,
      channel: 'EMAIL',
      maskedDestination,
      expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
      message: `Verification code sent to ${maskedDestination}.`,
      deliveryResults,
    };

    const allSimulated =
      deliveryResults.length === 0 ||
      deliveryResults.every((d) => d.provider === 'console-simulated' || Boolean(d.error));

    if (env.ALLOW_OTP_PREVIEW || allSimulated) {
      response.otpPreview = code;
    }

    return response;
  }

  /**
   * Verify an Email OTP challenge
   */
  async verifyOtp({ purpose, email, code }) {
    const cleanEmail = email ? String(email).trim().toLowerCase() : null;
    const cleanCode = String(code || '').trim();

    if (!cleanCode) {
      throw new AppError('Please enter the 6-digit verification code.', 400, 'OTP_REQUIRED');
    }

    const key = `${purpose}:${cleanEmail}`;
    const challenge = challengeStore.get(key);

    // Stateless HMAC window check (ensures Vercel multi-instance serverless cold starts never drop OTP state)
    const nowWin = Math.floor(Date.now() / WINDOW_MS);
    const statelessValid =
      cleanCode === generateStatelessCode(key, nowWin) ||
      cleanCode === generateStatelessCode(key, nowWin - 1);

    if (!challenge) {
      if (statelessValid) {
        return {
          verified: true,
          purpose,
          email: cleanEmail,
          payload: null,
        };
      }
      throw new AppError(
        'Verification code has expired or was not requested. Please request a new code.',
        400,
        'OTP_NOT_FOUND'
      );
    }

    if (challenge.expiresAt < Date.now()) {
      challengeStore.delete(key);
      throw new AppError(
        'Verification code has expired. Please request a new code.',
        400,
        'OTP_EXPIRED'
      );
    }

    if (challenge.attempts >= MAX_ATTEMPTS) {
      challengeStore.delete(key);
      throw new AppError(
        'Too many incorrect attempts. Please request a new verification code.',
        429,
        'TOO_MANY_ATTEMPTS'
      );
    }

    const valid = statelessValid || (await bcrypt.compare(cleanCode, challenge.codeHash));
    if (!valid) {
      challenge.attempts += 1;
      const remaining = MAX_ATTEMPTS - challenge.attempts;
      throw new AppError(
        `Incorrect verification code. ${remaining} attempt(s) remaining.`,
        400,
        'INVALID_OTP'
      );
    }

    // OTP Verified! Consume the challenge so it cannot be re-used.
    challengeStore.delete(key);

    return {
      verified: true,
      purpose: challenge.purpose,
      email: challenge.email,
      payload: challenge.payload,
    };
  }
}

module.exports = new OtpService();

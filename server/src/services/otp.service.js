const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const db = require('../config/db');
const AppError = require('../utils/AppError');
const notificationService = require('./notification.service');

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

class OtpService {
  async requestOtp({ purpose = 'LOGIN', email, recipientName = '', payload = null }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const key = `${purpose}:${cleanEmail}`;
    const code = String(crypto.randomInt(100000, 1000000));
    const hash = await bcrypt.hash(code, 10);
    const now = Date.now();
    await db.withTransaction(async (client) => {
      await client.query('DELETE FROM otp_challenges WHERE expires_at <= $1', [now]);
      const result = await client.query(
        `INSERT INTO otp_challenges (challenge_key, code_hash, requested_at, expires_at, payload)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (challenge_key) DO UPDATE SET code_hash = EXCLUDED.code_hash,
           requested_at = EXCLUDED.requested_at, expires_at = EXCLUDED.expires_at,
           payload = EXCLUDED.payload, attempts = 0
         WHERE otp_challenges.requested_at <= $6 RETURNING challenge_key`,
        [key, hash, now, now + OTP_EXPIRY_MS, JSON.stringify(payload), now - COOLDOWN_MS]
      );
      if (!result.rows.length) throw new AppError('Please wait 30 seconds before requesting another code.', 429, 'COOLDOWN_ACTIVE');
    });

    const delivery = await notificationService.sendEmailOtp({ to: cleanEmail, code, recipientName, purpose })
      .catch(() => ({ success: false }));
    if (!env.ALLOW_OTP_PREVIEW && (!delivery.success || delivery.provider === 'console-simulated')) {
      await db.query('DELETE FROM otp_challenges WHERE challenge_key = $1 AND code_hash = $2', [key, hash]);
      throw new AppError('Email delivery is unavailable. Please try again.', 503, 'OTP_DELIVERY_FAILED');
    }
    const maskedDestination = maskEmail(cleanEmail);
    return {
      success: true, purpose, channel: 'EMAIL', maskedDestination,
      expiresInSeconds: OTP_EXPIRY_MS / 1000,
      message: `Verification code sent to ${maskedDestination}.`,
      deliveryResults: [{ channel: 'EMAIL', ...delivery }],
      ...(env.ALLOW_OTP_PREVIEW ? { otpPreview: code } : {}),
    };
  }

  async verifyOtp({ purpose, email, code }) {
    if (!code) throw new AppError('Please enter the verification code.', 400, 'OTP_REQUIRED');
    const cleanEmail = String(email || '').trim().toLowerCase();
    const key = `${purpose}:${cleanEmail}`;
    const result = await db.withTransaction(async (client) => {
      const { rows: [challenge] } = await client.query(
        'SELECT * FROM otp_challenges WHERE challenge_key = $1 FOR UPDATE', [key]
      );
      if (!challenge || Number(challenge.expires_at) <= Date.now()) {
        throw new AppError('Please request a new verification code.', 400, 'OTP_NOT_FOUND');
      }
      if (challenge.attempts >= MAX_ATTEMPTS) {
        throw new AppError('Too many incorrect attempts. Request another code.', 429, 'TOO_MANY_ATTEMPTS');
      }
      if (!await bcrypt.compare(String(code).trim(), challenge.code_hash)) {
        await client.query('UPDATE otp_challenges SET attempts = attempts + 1 WHERE challenge_key = $1', [key]);
        return null; // Commit the failed attempt before reporting the error.
      }
      await client.query('DELETE FROM otp_challenges WHERE challenge_key = $1 AND code_hash = $2', [key, challenge.code_hash]);
      return { verified: true, purpose, email: cleanEmail, payload: challenge.payload };
    });
    if (!result) throw new AppError('Incorrect verification code.', 400, 'INVALID_OTP');
    return result;
  }
}

module.exports = new OtpService();

const validatePassword = require('../utils/password');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { signSession } = require('../utils/session');
const userRepo = require('../repositories/user.repository');
const auditRepo = require('../repositories/audit.repository');
const {
  verifyGoogleIdToken,
  verifyGoogleAccessToken,
} = require('./oauth.service');
const { seedStarterCatalog } = require('../db/starterCatalog');
const otpService = require('./otp.service');
const notificationService = require('./notification.service');
const { isOwnerEmail } = require('../config/owner');

const MAX_FAILED_ATTEMPTS = 6;
const LOCK_MINUTES = 15;
// Match the password-check cost for unknown accounts.
const dummyPasswordHash = "$2a$10$KXK0PiGFZK9D57PsycuQheccyfRxtW138tS6U3Kzhigy2vbcbJOUS";

const supportedCurrencies = new Set(['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR', 'CAD']);

function normalizeCurrency(value) {
  const code = String(value).trim().toUpperCase();
  if (!supportedCurrencies.has(code)) {
    throw new AppError('Select a supported shop currency.', 400, 'INVALID_CURRENCY');
  }
  return code;
}

class AuthService {
  getPublicConfig() {
    return {
      googleClientId: env.GOOGLE_CLIENT_ID || null,
      appleClientId: env.APPLE_CLIENT_ID || null,
      appleRedirectUri: env.APPLE_REDIRECT_URI || null,
      autoApproveUsers: env.AUTO_APPROVE_USERS,
      supportWhatsapp: env.SUPPORT_WHATSAPP || null,
      otpNotificationEnabled: true,
      allowOtpPreview: env.ALLOW_OTP_PREVIEW,
    };
  }

  /**
   * Request OTP for Signup
   */
  async requestSignupOtp(payload) {
    const email = String(payload.email || '').trim().toLowerCase();
    const fullName = String(payload.full_name || '').trim();
    const businessName = String(payload.business_name || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('Please enter a valid email address.', 400, 'INVALID_EMAIL');
    }
    if (!fullName || fullName.length < 2) {
      throw new AppError('Please enter your full name.', 400, 'INVALID_NAME');
    }
    if (!businessName || businessName.length < 2) {
      throw new AppError('Please enter your shop or business name.', 400, 'INVALID_BUSINESS');
    }

    if (isOwnerEmail(email)) {
      throw new AppError('This email address is reserved.', 403, 'EMAIL_RESERVED');
    }

    return otpService.requestOtp({
      purpose: 'SIGNUP',
      email,
      recipientName: fullName,
    });
  }

  /**
   * Send a reset code only to accounts that use a password.
   */
  async requestPasswordReset({ email }) {
    const address = String(email || '').trim().toLowerCase();
    const user = await userRepo.findAuthByEmail(address);
    if (user?.password_hash) {
      await otpService.requestOtp({ purpose: 'RESET', email: address, recipientName: user.full_name,
        payload: { userId: user.id } });
    }
    return { message: 'If this account uses a password, check your email for a reset code.' };
  }

  async resetPassword({ email, code, password }) {
    validatePassword(password);
    const challenge = await otpService.verifyOtp({ purpose: 'RESET', email, code });
    await userRepo.setPassword(challenge.payload.userId, await bcrypt.hash(password, 10));
    return { message: 'Password updated. Sign in with your new password.' };
  }

  async register(payload, ip = null) {
    const email = String(payload.email || '').trim().toLowerCase();
    const password = payload.password;
    const fullName = String(payload.full_name || '').trim();
    const businessName = String(payload.business_name || '').trim();
    const phone = String(payload.phone || '').trim() || null;
    const businessType = String(payload.business_type || 'Provision Store').trim();
    const city = String(payload.city || 'Lagos').trim();
    const seedCatalog = payload.seed_catalog !== false;
    const otp = payload.otp ? String(payload.otp).trim() : null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('Please enter a valid email address.', 400, 'INVALID_EMAIL');
    }
    if (!fullName || fullName.length < 2) {
      throw new AppError('Please enter your full name.', 400, 'INVALID_NAME');
    }
    if (!businessName || businessName.length < 2) {
      throw new AppError('Please enter your shop or business name.', 400, 'INVALID_BUSINESS');
    }
    validatePassword(password);
    if (isOwnerEmail(email)) {
      throw new AppError('This email address is reserved.', 403, 'EMAIL_RESERVED');
    }

    await otpService.verifyOtp({ purpose: 'SIGNUP', email, code: otp });
    const existing = await userRepo.findAuthByEmail(email);
    if (existing) {
      throw new AppError(
        'An account with this email already exists. Please sign in instead.',
        409,
        'EMAIL_TAKEN'
      );
    }


    const passwordHash = await bcrypt.hash(password, 10);
    // Self-registration can NEVER create an administrator. Any client-supplied `role` is ignored.
    // The sole admin (platform owner) is provisioned server-side at boot.
    const role = 'USER';
    const status = env.AUTO_APPROVE_USERS ? 'APPROVED' : 'PENDING';
    const currency = normalizeCurrency(payload.currency ?? 'NGN');

    const userId = await db.withTransaction(async (tx) => {
      const id = await userRepo.create(
        {
          email,
          password_hash: passwordHash,
          full_name: fullName,
          business_name: businessName,
          phone,
          business_type: businessType,
          city,
          currency,
          role,
          status,
          auth_provider: 'EMAIL',
        },
        tx
      );
      if (seedCatalog) {
        await seedStarterCatalog(tx, id, businessType);
      }
      await auditRepo.log(
        {
          actorUserId: id,
          action: 'USER_SIGNUP',
          targetUserId: id,
          details: { provider: 'EMAIL', business_name: businessName, status, role },
          ip,
        },
        tx
      );
      return id;
    });

    const authUser = await userRepo.findAuthById(userId);
    const publicUser = await userRepo.findPublicById(userId);
    const token = await signSession(authUser);

    // Send Welcome Email Notification asynchronously
    notificationService
      .sendWelcomeEmail({
        to: email,
        recipientName: fullName,
        businessName,
        currency,
      })
      .catch(() => {});

    return { user: publicUser, token };
  }

  async login(payload, ip = null) {
    const identifier = String(payload.identifier || payload.email || payload.phone || '').trim();
    const password = String(payload.password || '');
    const otp = payload.otp ? String(payload.otp).trim() : null;

    if (!identifier || !password) {
      throw new AppError(
        'Please enter your email or phone number and password.',
        400,
        'MISSING_CREDENTIALS'
      );
    }

    const user = await userRepo.findAuthByIdentifier(identifier);
    const valid = await bcrypt.compare(password, user?.password_hash || dummyPasswordHash);
    if (!valid || !user?.password_hash) {
      if (user?.password_hash && !(new Date(user.locked_until) > new Date())) {
        await userRepo.recordLoginFailure(user.id, MAX_FAILED_ATTEMPTS, LOCK_MINUTES);
      }
      throw new AppError('Invalid email/phone or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minsLeft = Math.max(
        1,
        Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000)
      );
      throw new AppError(
        `Too many failed login attempts. Try again in ${minsLeft} minute(s).`,
        429,
        'ACCOUNT_LOCKED'
      );
    }

    if (user.must_change_password && !(new Date(user.temporary_password_expires_at).getTime() > Date.now())) {
      throw new AppError('Request a password reset code to continue.', 401, 'TEMPORARY_PASSWORD_EXPIRED');
    }

    // Two-factor Email OTP step: if OTP was not supplied, issue an Email OTP challenge
    if (!otp) {
      const otpRes = await otpService.requestOtp({
        purpose: 'LOGIN',
        email: user.email,
        recipientName: user.full_name,
        payload: { userId: user.id },
      });

      return {
        otpRequired: true,
        email: user.email,
        maskedDestination: otpRes.maskedDestination,
        channel: otpRes.channel,
        message: otpRes.message,
        expiresInSeconds: otpRes.expiresInSeconds,
        otpPreview: otpRes.otpPreview,
        deliveryResults: otpRes.deliveryResults,
      };
    }

    // Verify submitted Email OTP
    await otpService.verifyOtp({
      purpose: 'LOGIN',
      email: user.email,
      code: otp,
    });

    await userRepo.recordLoginSuccess(user.id);
    await auditRepo.log({
      actorUserId: user.id,
      action: 'USER_LOGIN',
      targetUserId: user.id,
      details: { provider: 'EMAIL', otp_verified: true },
      ip,
    });

    const publicUser = await userRepo.findPublicById(user.id);
    const token = await signSession(user);
    return { user: publicUser, token };
  }

  async oauthSignIn(payload, ip = null, exchangedProfile = null) {
    const provider = String(payload.provider || '').toUpperCase();
    if (provider !== 'GOOGLE') {
      throw new AppError('Unsupported OAuth provider.', 400, 'INVALID_PROVIDER');
    }

    let verified = exchangedProfile;
    if (!verified) {
      if (payload.id_token) verified = await verifyGoogleIdToken(payload.id_token);
      else if (payload.access_token) verified = await verifyGoogleAccessToken(payload.access_token);
    }
    if (!verified?.sub || !verified.email || verified.emailVerified !== true) {
      throw new AppError('A verified Google credential is required.', 401, 'INVALID_GOOGLE_TOKEN');
    }
    const profile = {
      sub: verified.sub,
      email: verified.email,
      fullName: verified.name || verified.email.split('@')[0],
      avatarUrl: verified.picture || null,
    };

    // The platform owner (sole admin) can only sign in with email + password + OTP.
    if (isOwnerEmail(profile.email)) {
      throw new AppError(
        'This account must sign in with email and password.',
        403,
        'OWNER_PASSWORD_LOGIN_ONLY'
      );
    }

    let user = await userRepo.findAuthByProviderSub(provider, profile.sub);
    if (user && (user.role === 'ADMIN' || user.email.toLowerCase() !== profile.email)) {
      throw new AppError('Google account does not match the linked account.', 403, 'GOOGLE_ACCOUNT_MISMATCH');
    }
    if (!user) {
      user = await userRepo.findAuthByEmail(profile.email);
      if (user && user.role === 'ADMIN') {
        throw new AppError('This account must sign in with email and password.', 403);
      }
      if (user) {
        throw new AppError('Sign in with the method already linked to this account.', 403, 'ACCOUNT_LINK_REQUIRED');
      }
    }

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      // OAuth sign-up can NEVER create an administrator. Any client-supplied `role` is ignored.
      const role = 'USER';
      const status = env.AUTO_APPROVE_USERS ? 'APPROVED' : 'PENDING';
      const businessName =
        String(payload.business_name || '').trim() || `${profile.fullName}'s Store`;
      const currency = normalizeCurrency(payload.currency ?? 'NGN');

      const newId = await db.withTransaction(async (tx) => {
        const id = await userRepo.create(
          {
            email: profile.email,
            password_hash: null,
            full_name: profile.fullName,
            business_name: businessName,
            phone: payload.phone ? String(payload.phone).trim() : null,
            business_type: payload.business_type || 'Retail Store',
            city: payload.city || 'Lagos',
            currency,
            role,
            status,
            auth_provider: provider,
            google_sub: provider === 'GOOGLE' ? profile.sub : null,
            apple_sub: provider === 'APPLE' ? profile.sub : null,
            avatar_url: profile.avatarUrl,
          },
          tx
        );
        await seedStarterCatalog(tx, id, payload.business_type || 'Wholesale & General Merchandise');
        await auditRepo.log(
          {
            actorUserId: id,
            action: 'USER_SIGNUP',
            targetUserId: id,
            details: { provider, business_name: businessName, status, role },
            ip,
          },
          tx
        );
        return id;
      });

      user = await userRepo.findAuthById(newId);

      // Send Welcome Email Notification asynchronously for new Google OAuth stores
      notificationService
        .sendWelcomeEmail({
          to: profile.email,
          recipientName: profile.fullName,
          businessName,
          currency,
        })
        .catch(() => {});
    } else {
      await userRepo.recordLoginSuccess(user.id);
      await auditRepo.log({
        actorUserId: user.id,
        action: 'USER_LOGIN',
        targetUserId: user.id,
        details: { provider },
        ip,
      });
    }

    const publicUser = await userRepo.findPublicById(user.id);
    const token = await signSession(user);
    return { user: publicUser, token, isNewUser };
  }

  async updateProfile(userId, payload) {
    const current = await userRepo.findPublicById(userId);
    if (!current) throw new AppError('Account not found.', 404, 'USER_NOT_FOUND');

    const fullName = String(payload.full_name ?? current.full_name).trim();
    const businessName = String(payload.business_name ?? current.business_name).trim();
    if (!fullName || !businessName) {
      throw new AppError('Full name and business name cannot be empty.', 400);
    }

    const requestedCurrency = payload.currency == null ? null : String(payload.currency).trim().toUpperCase();
    // Keep legacy currency codes readable and allow profile edits without changing them.
    const currency = requestedCurrency === current.currency || requestedCurrency === null
      ? null
      : normalizeCurrency(requestedCurrency);

    let timeZone = null;
    let locale = null;
    if (payload.time_zone !== undefined) {
      try {
        if (typeof payload.time_zone !== 'string' || /^[+-]/.test(payload.time_zone)) throw new RangeError();
        timeZone = new Intl.DateTimeFormat('en', { timeZone: payload.time_zone }).resolvedOptions().timeZone;
      } catch {
        throw new AppError('Select a valid shop time zone.', 400, 'INVALID_TIME_ZONE');
      }
    }
    if (payload.locale !== undefined) {
      try {
        if (typeof payload.locale !== 'string') throw new RangeError();
        [locale] = Intl.DateTimeFormat.supportedLocalesOf(payload.locale);
        if (!locale) throw new RangeError();
      } catch {
        throw new AppError('Select a supported date and number format.', 400, 'INVALID_LOCALE');
      }
    }
    const updated = await userRepo.updateProfile(userId, {
      full_name: fullName,
      business_name: businessName,
      phone: payload.phone !== undefined ? String(payload.phone || '').trim() || null : current.phone,
      business_type:
        payload.business_type !== undefined
          ? String(payload.business_type || '').trim() || null
          : current.business_type,
      city: payload.city !== undefined ? String(payload.city || 'Lagos').trim() : current.city,
      address:
        payload.address !== undefined ? String(payload.address || '').trim() || null : current.address,
      currency,
      time_zone: timeZone,
      locale,
    });
    if (!updated) {
      throw new AppError('Shop currency is locked after stock or financial records have been created.', 409, 'CURRENCY_LOCKED');
    }


    return userRepo.findPublicById(userId);
  }

  async changePassword(userId, { current_password, new_password }, ip = null) {
    const user = await userRepo.findAuthById(userId);
    if (!user) throw new AppError('Account not found.', 404);

    validatePassword(new_password);

    if (user.password_hash) {
      const ok = await bcrypt.compare(String(current_password || ''), user.password_hash);
      if (!ok) {
        throw new AppError('Current password is incorrect.', 401, 'INVALID_PASSWORD');
      }
    }

    const hash = await bcrypt.hash(String(new_password), 10);
    const updated = await userRepo.setPassword(userId, hash, { expectedVersion: user.token_version });
    if (!updated) throw new AppError('Your credentials changed. Please sign in again.', 401);
    await auditRepo.log({
      actorUserId: userId,
      action: 'PASSWORD_CHANGED',
      targetUserId: userId,
      details: {},
      ip,
    });

    return { user: await userRepo.findPublicById(userId), token: await signSession({ id: userId, token_version: updated.token_version }) };
  }
}

module.exports = new AuthService();

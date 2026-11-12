const crypto = require('crypto');
const { createRemoteJWKSet, jwtVerify } = require('jose');
const env = require('../config/env');
const AppError = require('../utils/AppError');

// JWKS sets are cached and refreshed automatically by jose.
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

function getRequestOrigin(req) {
  if (!req || !req.headers) {
    return `http://localhost:${env.PORT}`;
  }
  const proto =
    (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() ||
    req.protocol ||
    'http';
  const host =
    (req.headers['x-forwarded-host'] || '').split(',')[0].trim() ||
    (typeof req.get === 'function' ? req.get('host') : req.headers.host) ||
    `localhost:${env.PORT}`;
  return `${proto}://${host}`;
}

function signOAuthState(data) {
  const payload = Buffer.from(JSON.stringify({ ...data, ts: Date.now() })).toString('base64url');
  const sig = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyOAuthState(stateStr) {
  if (!stateStr || typeof stateStr !== 'string' || !stateStr.includes('.')) {
    return {};
  }
  const [payload, sig] = stateStr.split('.');
  const expected = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(payload)
    .digest('base64url');
  if (sig !== expected) return {};
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return {};
  }
}

/**
 * Verifies a Google Identity Services / OIDC ID token.
 */
async function verifyGoogleIdToken(idToken, clientIdOverride = null) {
  const audience = clientIdOverride || env.GOOGLE_CLIENT_ID;
  if (!idToken || typeof idToken !== 'string') {
    throw new AppError('Missing Google credential.', 400, 'INVALID_GOOGLE_TOKEN');
  }
  try {
    const verifyOptions = {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
    };
    if (audience) {
      verifyOptions.audience = audience;
    }
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, verifyOptions);
    if (!payload.email) throw new Error('No email in token');
    return {
      sub: String(payload.sub),
      email: String(payload.email).toLowerCase(),
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      name: payload.name || '',
      picture: payload.picture || null,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Google sign-in could not be verified. Please try again.', 401, 'INVALID_GOOGLE_TOKEN');
  }
}

/**
 * Verifies a Google OAuth 2.0 access_token via Google's official OIDC userinfo endpoint.
 */
async function verifyGoogleAccessToken(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new AppError('Missing Google access token.', 400, 'INVALID_GOOGLE_TOKEN');
  }
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new AppError('Failed to verify Google access token with accounts.google.com.', 401, 'INVALID_GOOGLE_TOKEN');
  }
  const data = await res.json();
  if (!data.email) {
    throw new AppError('Google account did not return an email address.', 400, 'INVALID_GOOGLE_TOKEN');
  }
  return {
    sub: String(data.sub),
    email: String(data.email).toLowerCase(),
    emailVerified: Boolean(data.email_verified),
    name: data.name || '',
    picture: data.picture || null,
  };
}

/**
 * Exchanges a Google OAuth 2.0 authorization code for tokens and returns the verified profile.
 */
async function exchangeGoogleCodeForProfile({ code, redirectUri, clientId, clientSecret }) {
  const finalClientId = clientId || env.GOOGLE_CLIENT_ID;
  const finalClientSecret = clientSecret || env.GOOGLE_CLIENT_SECRET;

  if (!finalClientId || !finalClientSecret) {
    throw new AppError(
      'Google OAuth code exchange requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      400,
      'GOOGLE_SECRET_MISSING'
    );
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: finalClientId,
      client_secret: finalClientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new AppError(
      tokenData.error_description || tokenData.error || 'Failed to exchange Google authorization code.',
      401,
      'GOOGLE_CODE_EXCHANGE_FAILED'
    );
  }

  if (tokenData.id_token) {
    return verifyGoogleIdToken(tokenData.id_token, finalClientId);
  }
  if (tokenData.access_token) {
    return verifyGoogleAccessToken(tokenData.access_token);
  }
  throw new AppError('Google token response did not include id_token or access_token.', 401);
}

/**
 * Verifies a Sign in with Apple ID token (from AppleID.auth.signIn() or form_post callback).
 */
async function verifyAppleIdToken(idToken, clientIdOverride = null) {
  const audience = clientIdOverride || env.APPLE_CLIENT_ID;
  if (!idToken || typeof idToken !== 'string') {
    throw new AppError('Missing Apple credential.', 400, 'INVALID_APPLE_TOKEN');
  }
  try {
    const verifyOptions = {
      issuer: 'https://appleid.apple.com',
    };
    if (audience) {
      verifyOptions.audience = audience;
    }
    const { payload } = await jwtVerify(idToken, APPLE_JWKS, verifyOptions);
    return {
      sub: String(payload.sub),
      email: payload.email ? String(payload.email).toLowerCase() : null,
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
    };
  } catch {
    throw new AppError('Apple sign-in could not be verified. Please try again.', 401, 'INVALID_APPLE_TOKEN');
  }
}

/**
 * Builds the official Google OAuth 2.0 / OIDC authorization URL (https://accounts.google.com/o/oauth2/v2/auth)
 */
function buildGoogleAuthorizeUrl({ req, state, clientId }) {
  const origin = getRequestOrigin(req);
  const redirectUri = env.GOOGLE_REDIRECT_URI || `${origin}/api/v1/auth/oauth/google/callback`;
  const finalClientId = clientId || env.GOOGLE_CLIENT_ID;
  const hasSecret = Boolean(env.GOOGLE_CLIENT_SECRET);

  const params = new URLSearchParams({
    client_id: finalClientId,
    redirect_uri: redirectUri,
    response_type: hasSecret ? 'code' : 'token id_token',
    scope: 'openid email profile',
    prompt: 'select_account',
    state,
  });

  if (!hasSecret) {
    params.set('nonce', crypto.randomBytes(12).toString('hex'));
  } else {
    params.set('access_type', 'online');
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Builds the official Apple OAuth 2.0 / OIDC authorization URL (https://appleid.apple.com/auth/authorize)
 */
function buildAppleAuthorizeUrl({ req, state, clientId }) {
  const origin = getRequestOrigin(req);
  const redirectUri = env.APPLE_REDIRECT_URI || `${origin}/api/v1/auth/oauth/apple/callback`;
  const finalClientId = clientId || env.APPLE_CLIENT_ID;

  const params = new URLSearchParams({
    client_id: finalClientId,
    redirect_uri: redirectUri,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
    state,
    nonce: crypto.randomBytes(12).toString('hex'),
  });

  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders the authentic Google Accounts (accounts.google.com) or Apple ID (appleid.apple.com)
 * OAuth 2.0 Authorization & Account Chooser window when an external Client ID is not yet set in .env,
 * OR allows pasting a live GOOGLE_CLIENT_ID / APPLE_CLIENT_ID to redirect straight to Google/Apple.
 */
function renderOAuthProviderGatewayHtml({ provider, state, callbackUrl, authorizeUrl, origin, error = '' }) {
  const isGoogle = provider === 'GOOGLE';

  if (isGoogle) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in - Google Accounts</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Google Sans", Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      background-color: #f0f4f9;
      color: #1f1f1f;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .g-card {
      background: #ffffff;
      border-radius: 28px;
      width: 100%;
      max-width: 440px;
      padding: 36px 36px 28px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.04);
    }
    .g-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 16px;
      margin-bottom: 20px;
      border-bottom: 1px solid #e3e3e3;
      font-size: 14px;
      color: #444746;
      font-weight: 500;
    }
    .g-title {
      font-size: 24px;
      font-weight: 400;
      color: #1f1f1f;
      margin-bottom: 8px;
    }
    .g-subtitle {
      font-size: 15px;
      color: #444746;
      margin-bottom: 24px;
    }
    .g-subtitle strong {
      color: #0b57d0;
      font-weight: 600;
    }
    .g-error {
      background: #fce8e6;
      color: #c5221f;
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 13px;
      margin-bottom: 16px;
    }
    .g-field {
      margin-bottom: 14px;
    }
    .g-label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: #444746;
      margin-bottom: 5px;
    }
    .g-input {
      width: 100%;
      padding: 13px 15px;
      border: 1px solid #747775;
      border-radius: 8px;
      font-size: 15px;
      color: #1f1f1f;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .g-input:focus {
      border-color: #0b57d0;
      box-shadow: 0 0 0 1px #0b57d0;
    }
    .g-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .g-consent {
      font-size: 12px;
      color: #444746;
      line-height: 1.5;
      margin: 18px 0 22px;
    }
    .g-consent a {
      color: #0b57d0;
      text-decoration: none;
      font-weight: 500;
    }
    .g-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .g-btn-cancel {
      background: transparent;
      border: none;
      color: #0b57d0;
      font-size: 14px;
      font-weight: 500;
      padding: 10px 16px;
      border-radius: 20px;
      cursor: pointer;
    }
    .g-btn-cancel:hover {
      background: rgba(11, 87, 208, 0.08);
    }
    .g-btn-submit {
      background: #0b57d0;
      color: #ffffff;
      border: none;
      font-size: 14px;
      font-weight: 500;
      padding: 10px 24px;
      border-radius: 20px;
      cursor: pointer;
      transition: background 0.15s, box-shadow 0.15s;
    }
    .g-btn-submit:hover {
      background: #0842a0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .g-footer {
      max-width: 440px;
      width: 100%;
      margin-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #444746;
      padding: 0 8px;
    }
    details.g-dev {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px dashed #d3d8e0;
      font-size: 12px;
      color: #444746;
    }
    details.g-dev summary {
      cursor: pointer;
      color: #0b57d0;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="g-card">
    <div class="g-header">
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
        <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/>
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
      </svg>
      <span>Sign in with Google</span>
    </div>

    <h1 class="g-title">Choose an account</h1>
    <p class="g-subtitle">to continue to <strong>MarketOS</strong></p>

    ${error ? `<div class="g-error">${escapeHtml(error)}</div>` : ''}

    <form method="POST" action="${escapeHtml(callbackUrl)}">
      <input type="hidden" name="state" value="${escapeHtml(state)}" />
      <input type="hidden" name="provider" value="GOOGLE" />

      <div class="g-field">
        <label class="g-label" for="email">Google Account Email</label>
        <input class="g-input" id="email" name="email" type="email" required autofocus placeholder="you@gmail.com" />
      </div>

      <div class="g-row">
        <div class="g-field">
          <label class="g-label" for="full_name">Your Name</label>
          <input class="g-input" id="full_name" name="full_name" type="text" placeholder="e.g. Tunde Bakare" />
        </div>
        <div class="g-field">
          <label class="g-label" for="business_name">Store Name (if new)</label>
          <input class="g-input" id="business_name" name="business_name" type="text" placeholder="e.g. Bakare Stores" />
        </div>
      </div>

      <p class="g-consent">
        To continue, Google will share your name, email address, and profile picture with <strong>MarketOS</strong>.
      </p>

      <div class="g-actions">
        <button type="button" class="g-btn-cancel" onclick="window.close(); window.location.href='/login';">Cancel</button>
        <button type="submit" class="g-btn-submit">Continue as Google User</button>
      </div>
    </form>

    <details class="g-dev">
      <summary>Have a Google Cloud OAuth Client ID? Connect live accounts.google.com</summary>
      <form method="GET" action="${escapeHtml(authorizeUrl)}" style="margin-top:10px; display:flex; gap:8px;">
        <input class="g-input" style="padding:8px 10px; font-size:12px;" name="client_id" placeholder="xxxx.apps.googleusercontent.com" required />
        <button type="submit" class="g-btn-submit" style="padding:8px 14px; font-size:12px; white-space:nowrap;">Redirect to Google</button>
      </form>
      <p style="margin-top:6px; font-size:11px; color:#5f6368;">
        Authorized redirect URI: <code>${escapeHtml(origin)}/api/v1/auth/oauth/google/callback</code>
      </p>
    </details>
  </div>

  <div class="g-footer">
    <span>English (United States)</span>
    <span>Google OAuth 2.0 • MarketOS</span>
  </div>
</body>
</html>`;
  }

  // Apple ID OAuth 2.0 Gateway (appleid.apple.com look & feel)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in with Apple ID</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
      background-color: #000000;
      color: #f5f5f7;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .a-card {
      background: #1c1c1e;
      border: 1px solid #2c2c2e;
      border-radius: 24px;
      width: 100%;
      max-width: 430px;
      padding: 36px 32px 28px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
      text-align: center;
    }
    .a-logo {
      width: 44px;
      height: 44px;
      margin: 0 auto 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
    }
    .a-title {
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }
    .a-subtitle {
      font-size: 14px;
      color: #86868b;
      margin-bottom: 24px;
    }
    .a-subtitle strong {
      color: #f5f5f7;
    }
    .a-error {
      background: rgba(255, 69, 58, 0.16);
      color: #ff453a;
      border: 1px solid rgba(255, 69, 58, 0.35);
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 13px;
      margin-bottom: 16px;
      text-align: left;
    }
    .a-field {
      margin-bottom: 12px;
      text-align: left;
    }
    .a-label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: #a1a1a6;
      margin-bottom: 5px;
    }
    .a-input {
      width: 100%;
      padding: 13px 14px;
      background: #2c2c2e;
      border: 1px solid #3a3a3c;
      border-radius: 12px;
      font-size: 15px;
      color: #f5f5f7;
      outline: none;
      transition: border-color 0.15s;
    }
    .a-input:focus {
      border-color: #0a84ff;
    }
    .a-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .a-consent {
      font-size: 12px;
      color: #86868b;
      line-height: 1.45;
      margin: 16px 0 22px;
    }
    .a-actions {
      display: flex;
      gap: 10px;
    }
    .a-btn-cancel {
      flex: 1;
      background: #2c2c2e;
      color: #f5f5f7;
      border: none;
      font-size: 14px;
      font-weight: 500;
      padding: 12px 16px;
      border-radius: 12px;
      cursor: pointer;
    }
    .a-btn-submit {
      flex: 2;
      background: #0071e3;
      color: #ffffff;
      border: none;
      font-size: 14px;
      font-weight: 600;
      padding: 12px 20px;
      border-radius: 12px;
      cursor: pointer;
    }
    .a-btn-submit:hover {
      background: #0077ed;
    }
    details.a-dev {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid #2c2c2e;
      font-size: 11px;
      color: #86868b;
      text-align: left;
    }
    details.a-dev summary {
      cursor: pointer;
      color: #0a84ff;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="a-card">
    <div class="a-logo">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
      </svg>
    </div>

    <h1 class="a-title">Sign in with Apple</h1>
    <p class="a-subtitle">Use your Apple ID to sign in to <strong>MarketOS</strong>.</p>

    ${error ? `<div class="a-error">${escapeHtml(error)}</div>` : ''}

    <form method="POST" action="${escapeHtml(callbackUrl)}">
      <input type="hidden" name="state" value="${escapeHtml(state)}" />
      <input type="hidden" name="provider" value="APPLE" />

      <div class="a-field">
        <label class="a-label" for="email">Apple ID (Email)</label>
        <input class="a-input" id="email" name="email" type="email" required autofocus placeholder="name@icloud.com" />
      </div>

      <div class="a-row">
        <div class="a-field">
          <label class="a-label" for="full_name">Name</label>
          <input class="a-input" id="full_name" name="full_name" type="text" placeholder="Your Full Name" />
        </div>
        <div class="a-field">
          <label class="a-label" for="business_name">Store Name (if new)</label>
          <input class="a-input" id="business_name" name="business_name" type="text" placeholder="Your Shop Name" />
        </div>
      </div>

      <p class="a-consent">
        MarketOS will receive your verified Apple ID email and name to sign you in or set up your store workspace.
      </p>

      <div class="a-actions">
        <button type="button" class="a-btn-cancel" onclick="window.close(); window.location.href='/login';">Cancel</button>
        <button type="submit" class="a-btn-submit">Continue with Apple</button>
      </div>
    </form>

    <details class="a-dev">
      <summary>Have an Apple Developer Service ID? Connect live appleid.apple.com</summary>
      <form method="GET" action="${escapeHtml(authorizeUrl)}" style="margin-top:10px; display:flex; gap:8px;">
        <input class="a-input" style="padding:8px 10px; font-size:12px;" name="client_id" placeholder="com.yourcompany.marketos" required />
        <button type="submit" class="a-btn-submit" style="padding:8px 14px; font-size:12px; white-space:nowrap;">Redirect to Apple</button>
      </form>
      <p style="margin-top:6px; font-size:11px; color:#86868b;">
        Return URL: <code>${escapeHtml(origin)}/api/v1/auth/oauth/apple/callback</code>
      </p>
    </details>
  </div>
</body>
</html>`;
}

/**
 * Renders an intermediate HTML page when Google returns `#id_token=...` or `#access_token=...`
 * in the URL hash fragment (Implicit / OIDC fragment mode when GOOGLE_CLIENT_SECRET is not set),
 * automatically forwarding the token to the server POST callback.
 */
function renderOAuthHashExtractorHtml({ callbackUrl, state }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Completing Sign-In...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0B1220;
      color: #E7EEF7;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .box { text-align: center; }
  </style>
</head>
<body>
  <div class="box">
    <p>Verifying your account with MarketOS...</p>
    <form id="hashForm" method="POST" action="${escapeHtml(callbackUrl)}">
      <input type="hidden" name="state" value="${escapeHtml(state)}" />
      <input type="hidden" name="id_token" id="id_token" />
      <input type="hidden" name="access_token" id="access_token" />
    </form>
  </div>
  <script>
    (function() {
      var hash = window.location.hash ? window.location.hash.substring(1) : '';
      var params = new URLSearchParams(hash);
      var idToken = params.get('id_token') || '';
      var accessToken = params.get('access_token') || '';
      if (idToken || accessToken) {
        document.getElementById('id_token').value = idToken;
        document.getElementById('access_token').value = accessToken;
        document.getElementById('hashForm').submit();
      } else {
        window.location.href = '/login?oauth_error=' + encodeURIComponent('Authorization was cancelled or did not return a token.');
      }
    })();
  </script>
</body>
</html>`;
}

/**
 * Renders the final OAuth 2.0 callback completion page:
 * - Saves the session token to localStorage
 * - Posts `{ type: 'MARKETOS_OAUTH_SUCCESS', token, user, isNewUser, provider }` to `window.opener`
 * - Closes the OAuth popup window automatically, or redirects the full window to `/store/sell`
 */
function renderOAuthCallbackSuccessHtml({ user, token, isNewUser, provider }) {
  const payloadJson = JSON.stringify({
    type: 'MARKETOS_OAUTH_SUCCESS',
    provider,
    token,
    user,
    isNewUser: Boolean(isNewUser),
  }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Authenticated — MarketOS</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0B1220;
      color: #E7EEF7;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .card {
      background: #111C2E;
      border: 1px solid #29384D;
      border-radius: 20px;
      padding: 28px 32px;
      text-align: center;
      max-width: 360px;
    }
    .badge {
      display: inline-block;
      background: rgba(52, 211, 153, 0.16);
      color: #34D399;
      border: 1px solid rgba(52, 211, 153, 0.35);
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">✓ Connected</div>
    <h3 style="margin:0 0 6px; font-size:18px;">Signed in as ${escapeHtml(user.full_name)}</h3>
    <p style="margin:0; font-size:13px; color:#A7B4C5;">Redirecting to your store workspace...</p>
  </div>
  <script>
    (function() {
      var data = ${payloadJson};
      try {
        localStorage.setItem('marketos_auth_token', data.token);
      } catch (e) {}

      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage(data, window.location.origin);
          setTimeout(function() { window.close(); }, 180);
          return;
        } catch (e) {}
      }

      var dest = data.user && data.user.role === 'ADMIN'
        ? '/admin'
        : (data.user && data.user.status !== 'APPROVED' ? '/pending' : '/store/sell');
      window.location.replace(dest + '?oauth_token=' + encodeURIComponent(data.token));
    })();
  </script>
</body>
</html>`;
}

module.exports = {
  getRequestOrigin,
  signOAuthState,
  verifyOAuthState,
  verifyGoogleIdToken,
  verifyGoogleAccessToken,
  exchangeGoogleCodeForProfile,
  verifyAppleIdToken,
  buildGoogleAuthorizeUrl,
  buildAppleAuthorizeUrl,
  renderOAuthProviderGatewayHtml,
  renderOAuthHashExtractorHtml,
  renderOAuthCallbackSuccessHtml,
};

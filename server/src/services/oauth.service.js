const crypto = require('crypto');
const { createRemoteJWKSet, jwtVerify } = require('jose');
const env = require('../config/env');
const AppError = require('../utils/AppError');

// JWKS sets are cached and refreshed automatically by jose.
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

function getRequestOrigin(req) {
  if (!req || !req.headers) {
    return `http://localhost:${env.PORT}`;
  }
  const proto = env.IS_PROD ? 'https' : req.protocol || 'http';
  return `${proto}://${req.get('host')}`;
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
    throw new AppError('Restart Google sign-in.', 400, 'INVALID_STATE');
  }
  const [payload, sig, extra] = stateStr.split('.');
  const expected = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(payload)
    .digest('base64url');
  if (extra !== undefined || sig !== expected) throw new AppError('Restart Google sign-in.', 400, 'INVALID_STATE');
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isFinite(data.ts) || data.ts > Date.now() || Date.now() - data.ts >= 600000) throw new Error();
    return data;
  } catch {
    throw new AppError('Restart Google sign-in.', 400, 'INVALID_STATE');
  }
}

/**
 * Verifies a Google Identity Services / OIDC ID token.
 */
async function verifyGoogleIdToken(idToken, expectedNonce) {
  const audience = env.GOOGLE_CLIENT_ID;
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
    if (expectedNonce && payload.nonce !== expectedNonce) throw new Error('Invalid nonce');
    if (!payload.email || !payload.sub) throw new Error('No email in token');
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
  const infoUrl = new URL('https://oauth2.googleapis.com/tokeninfo');
  infoUrl.searchParams.set('access_token', accessToken);
  const info = await fetch(infoUrl);
  if (!info.ok || (await info.json()).aud !== env.GOOGLE_CLIENT_ID) {
    throw new AppError('Invalid Google token audience.', 401, 'INVALID_GOOGLE_TOKEN');
  }
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new AppError('Failed to verify Google access token with accounts.google.com.', 401, 'INVALID_GOOGLE_TOKEN');
  }
  const data = await res.json();
  if (!data.email || !data.sub) {
    throw new AppError('Google account did not return an email address.', 400, 'INVALID_GOOGLE_TOKEN');
  }
  return {
    sub: String(data.sub),
    email: String(data.email).toLowerCase(),
    emailVerified: data.email_verified === true || data.email_verified === 'true',
    name: data.name || '',
    picture: data.picture || null,
  };
}

/**
 * Exchanges a Google OAuth 2.0 authorization code for tokens and returns the verified profile.
 */
async function exchangeGoogleCodeForProfile({ code, redirectUri, clientId, clientSecret, verifier, nonce }) {
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
      code_verifier: verifier,
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
    return verifyGoogleIdToken(tokenData.id_token, nonce);
  }
  throw new AppError('Missing Google ID token.', 401);
}

function buildGoogleAuthorizeUrl({ req, state, clientId, nonce, challenge }) {
  const origin = getRequestOrigin(req);
  const redirectUri = env.GOOGLE_REDIRECT_URI || `${origin}/api/v1/auth/oauth/google/callback`;
  const finalClientId = clientId || env.GOOGLE_CLIENT_ID;
  const hasSecret = Boolean(env.GOOGLE_CLIENT_SECRET);

  const params = new URLSearchParams({
    client_id: finalClientId,
    redirect_uri: redirectUri,
    response_type: hasSecret ? 'code' : 'id_token',
    scope: 'openid email profile',
    prompt: 'select_account',
    state,
    nonce,
  });

  if (hasSecret) {
    params.set('code_challenge_method', 'S256');
    params.set('code_challenge', challenge);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

module.exports = { getRequestOrigin, signOAuthState, verifyOAuthState, verifyGoogleIdToken,
  verifyGoogleAccessToken, exchangeGoogleCodeForProfile, buildGoogleAuthorizeUrl };

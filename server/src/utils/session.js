const { randomUUID } = require('crypto');
const db = require('../config/db');
const { SignJWT, jwtVerify } = require('jose');
const env = require('../config/env');
const AppError = require('./AppError');

const COOKIE_NAME = 'mos_session';
const secretKey = () => {
  if (!env.JWT_SECRET) {
    throw new AppError(
      'Server authentication is not configured (JWT_SECRET missing). Contact the administrator.',
      503,
      'AUTH_NOT_CONFIGURED'
    );
  }
  return new TextEncoder().encode(env.JWT_SECRET);
};

async function signSession(user) {
  return new SignJWT({ tv: user.token_version || 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setJti(randomUUID())
    .setIssuedAt()
    .setIssuer('marketos')
    .setAudience('marketos-cookie')
    .setExpirationTime(`${env.SESSION_DAYS}d`)
    .sign(secretKey());
}

async function verifySession(token) {
  const { payload } = await jwtVerify(token, secretKey(), { issuer: 'marketos', audience: 'marketos-cookie', algorithms: ['HS256'] });
  return { userId: Number(payload.sub), tokenVersion: Number(payload.tv || 0), id: payload.jti, expiresAt: new Date(payload.exp * 1000) };
}

const temporaryRevocations = new Map();

async function revokeSession({ id, expiresAt }) {
  if (db.mode === 'serverless') {
    for (const [key, expiry] of temporaryRevocations) {
      if (expiry <= Date.now()) temporaryRevocations.delete(key);
    }
    temporaryRevocations.set(id, expiresAt.getTime());
    return;
  }
  await db.query('DELETE FROM revoked_sessions WHERE expires_at <= NOW()');
  await db.query('INSERT INTO revoked_sessions (id, expires_at) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, expiresAt]);
}

async function isSessionRevoked(id) {
  if (!id) return true;
  if (db.mode === 'serverless') return temporaryRevocations.has(id);
  const { rows } = await db.query('SELECT 1 FROM revoked_sessions WHERE id = $1', [id]);
  return rows.length > 0;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: env.SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
}

function issueSessionCookie(res, token, persistent = true) {
  const options = cookieOptions();
  if (!persistent) delete options.maxAge;
  res.cookie(COOKIE_NAME, token, options);
  return token;
}

function clearSessionCookie(res) {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(COOKIE_NAME, opts);
}

function readToken(req) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === COOKIE_NAME) {
      return part.slice(idx + 1).trim();
    }
  }
  return null;
}

module.exports = { signSession, verifySession, issueSessionCookie, clearSessionCookie, readToken, isSessionRevoked, revokeSession };

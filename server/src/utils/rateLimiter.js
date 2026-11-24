const { createHash } = require('crypto');
const { isIP } = require('net');
const db = require('../config/db');
const AppError = require('./AppError');

function clientIp(req) {
  const forwarded = req.headers['x-real-ip'];
  if (process.env.VERCEL && isIP(forwarded)) return forwarded;
  return req.socket.remoteAddress || 'unknown';
}

const temporaryLimits = new Map();
async function increment(key, windowMs) {
  const now = Date.now();
  if (db.mode === 'serverless') {
    for (const [k, row] of temporaryLimits) {
      if (row.expires_at <= now) temporaryLimits.delete(k);
    }
    const row = temporaryLimits.get(key) || { hits: 0, expires_at: now + windowMs };
    row.hits++;
    temporaryLimits.set(key, row);
    return row;
  }
  if (Math.random() < 0.01) await db.query('DELETE FROM request_limits WHERE expires_at <= $1', [now]);
  const result = await db.query(
    `INSERT INTO request_limits AS r (key, hits, expires_at) VALUES ($1, 1, $2)
     ON CONFLICT (key) DO UPDATE SET hits = CASE WHEN r.expires_at <= $3 THEN 1 ELSE r.hits + 1 END,
       expires_at = CASE WHEN r.expires_at <= $3 THEN EXCLUDED.expires_at ELSE r.expires_at END
     RETURNING hits, expires_at`, [key, now + windowMs, now]);
  return result.rows[0];
}

async function limit(scope, value, windowMs, max, message) {
  const key = scope + ':' + createHash('sha256').update(value).digest('hex');
  const row = await increment(key, windowMs);
  if (row.hits > max) throw new AppError(message, 429, 'RATE_LIMIT_EXCEEDED');
}

function createRateLimiter({ scope, windowMs, max, message }) {
  return (req, res, next) => limit(scope, clientIp(req), windowMs, max, message).then(() => next(), next);
}

module.exports = { createRateLimiter, limit, clientIp };

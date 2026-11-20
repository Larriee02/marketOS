const bcrypt = require('bcryptjs');
const { createHash, randomBytes } = require('crypto');
const env = require('./env');

const configuredEmail = (process.env.OWNER_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const OWNER_EMAIL = configuredEmail || 'lanresanni0@gmail.com';
const OWNER_NAME = process.env.OWNER_NAME || process.env.ADMIN_NAME || 'Platform Owner';

function isLegacyOwnerHash(hash) {
  // Recognize existing accounts provisioned with the retired bundled credential.
  return Boolean(hash) && createHash('sha256').update(hash).digest('hex') ===
    '49212779bfc75e71cc8f43348e7c1b932cf7b84b3b7e50f4952b13e7bdc85a2e';
}

let cachedHash = null;
function getOwnerPasswordHash() {
  if (cachedHash) return cachedHash;
  const hash = process.env.OWNER_PASSWORD_HASH;
  const password = process.env.OWNER_PASSWORD || process.env.ADMIN_PASSWORD;
  if (env.IS_PROD) {
    if (!configuredEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configuredEmail)) {
      throw new Error('Set a valid OWNER_EMAIL in production.');
    }
    if (!hash && (!password || password.trim().length < 12 || Buffer.byteLength(password) > 72)) {
      throw new Error('Set OWNER_PASSWORD_HASH or a strong OWNER_PASSWORD in production.');
    }
  }
  if (hash && (!/^\$2[aby]\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$/.test(hash) || isLegacyOwnerHash(hash))) {
    throw new Error('Set a valid OWNER_PASSWORD_HASH for a new password.');
  }
  cachedHash = hash || bcrypt.hashSync(password || randomBytes(32).toString('hex'), 12);
  return cachedHash;
}

function isOwnerEmail(email) {
  return Boolean(email) && String(email).trim().toLowerCase() === OWNER_EMAIL;
}

function isOwnerUser(user) {
  return Boolean(user) && user.role === 'ADMIN' && isOwnerEmail(user.email);
}

module.exports = {
  OWNER_EMAIL,
  OWNER_NAME,
  getOwnerPasswordHash,
  isLegacyOwnerHash,
  isOwnerEmail,
  isOwnerUser,
};

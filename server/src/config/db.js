const path = require('path');
const { Pool } = require('pg');
const env = require('./env');
const migrations = require('../db/migrations');
const { seedStarterCatalog } = require('../db/starterCatalog');
const serverlessStore = require('./serverlessStore');
const AppError = require('../utils/AppError');
const { OWNER_EMAIL, OWNER_NAME, getOwnerPasswordHash, isLegacyOwnerHash } = require('./owner');

function sanitizeDatabaseUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let cleaned = raw
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/^DATABASE_URL=/i, '')
    .trim();
  cleaned = cleaned.replace(/:\[([^\]]+)\]@/, ':$1@');
  const match = cleaned.match(/^(postgres(?:ql)?:\/\/[^:/]+:)(.+)(@[^@]+)$/i);
  if (match) {
    const [, prefix, rawPass, suffix] = match;
    let decoded = rawPass;
    try {
      decoded = decodeURIComponent(rawPass);
    } catch {
      // keep raw
    }
    cleaned = `${prefix}${encodeURIComponent(decoded)}${suffix}`;
  }
  try {
    const parsed = new URL(cleaned);
    // Strip libpq-specific sslmode/channel_binding params so node-postgres (`pg`)
    // uses the explicit `ssl: { rejectUnauthorized: false }` config cleanly on Neon poolers.
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('channel_binding');
    return ['postgres:', 'postgresql:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

const isTestEnv = process.env.NODE_ENV === 'test';
const connectionString = isTestEnv ? null : sanitizeDatabaseUrl(env.DATABASE_URL);
const hasValidPgUrl = Boolean(connectionString) && !connectionString.includes('YOUR-PASSWORD');

const mode = hasValidPgUrl || env.IS_PROD ? 'postgres'
  : env.ALLOW_TEMPORARY_STORE ? 'serverless' : 'embedded';

let pool = null;
let pglite = null;
let pglitePromise = null;

if (mode === 'postgres' && hasValidPgUrl) {
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
  pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: env.IS_PROD ? 3 : 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 8000,
  });
  pool.on('error', (err) => console.error('[DB] Idle client error:', err.message));
}

async function getPglite() {
  if (pglite) return pglite;
  if (!pglitePromise) {
    pglitePromise = (async () => {
      const { PGlite } = require('@electric-sql/pglite');
      const db = new PGlite(path.join(__dirname, '../../pgdata'));
      await db.waitReady;
      pglite = db;
      return db;
    })();
  }
  return pglitePromise;
}

async function rawQuery(text, params = []) {
  if (mode === 'serverless') return serverlessStore.query(text, params);
  if (mode === 'postgres') return pool.query(text, params);
  const db = await getPglite();
  return db.query(text, params);
}

async function rawTransaction(fn) {
  if (mode === 'serverless') return serverlessStore.withTransaction(fn);
  if (mode === 'postgres') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn({ query: (t, p = []) => client.query(t, p) });
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore
      }
      throw err;
    } finally {
      client.release();
    }
  }
  const db = await getPglite();
  return db.transaction((tx) => fn({ query: (t, p = []) => tx.query(t, p) }));
}

async function runMigrations() {
  if (mode === 'serverless') return;

  const runAll = async (q, exec) => {
    await q(`CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(120) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    const { rows } = await q('SELECT id FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.id));
    for (const migration of migrations) {
      if (applied.has(migration.id)) continue;
      await exec(
        `BEGIN;\n${migration.sql}\nINSERT INTO schema_migrations (id) VALUES ('${migration.id}');\nCOMMIT;`
      );
      console.log(`[DB] Applied migration ${migration.id}`);
    }
  };

  if (mode === 'postgres') {
    const client = await pool.connect();
    try {
      await client.query('SELECT pg_advisory_lock(727274001)');
      await runAll(
        (t, p) => client.query(t, p),
        async (sql) => {
          try {
            await client.query(sql);
          } catch (err) {
            await client.query('ROLLBACK').catch(() => {});
            throw err;
          }
        }
      );
    } finally {
      await client.query('SELECT pg_advisory_unlock(727274001)').catch(() => {});
      client.release();
    }
    return;
  }

  const db = await getPglite();
  await runAll(
    (t, p) => db.query(t, p),
    async (sql) => {
      try {
        await db.exec(sql);
      } catch (err) {
        await db.exec('ROLLBACK').catch(() => {});
        throw err;
      }
    }
  );
}

async function bootstrapAdmin({ query }) {
  let bootstrappedAdminId = null;
  {
    const existing = await query(
      'SELECT id, role, password_hash FROM users WHERE LOWER(email) = $1',
      [OWNER_EMAIL]
    );
    if (existing.rows.length === 0) {
      const inserted = await query(
        `INSERT INTO users (email, password_hash, full_name, business_name, phone, business_type, city, role, status, approved_at)
         VALUES ($1, $2, $3, 'MarketOS HQ', NULL, 'Provision Store', 'Lagos', 'ADMIN', 'APPROVED', NOW())
         RETURNING id`,
        [OWNER_EMAIL, getOwnerPasswordHash(), OWNER_NAME]
      );
      bootstrappedAdminId = inserted.rows[0].id;
      console.log('[DB] Provisioned platform owner account');
    } else {
      const row = existing.rows[0];
      if (row.role !== 'ADMIN' || !row.password_hash || isLegacyOwnerHash(row.password_hash)) {
        // Account with the owner email existed without owner privileges: take it over with the
        // configured owner password and revoke any existing sessions.
        await query(
          `UPDATE users SET role = 'ADMIN', status = 'APPROVED', password_hash = $2,
             token_version = token_version + 1, updated_at = NOW() WHERE id = $1`,
          [row.id, getOwnerPasswordHash()]
        );
      }
      bootstrappedAdminId = row.id;
    }
    // Enforce single-admin policy: demote every other administrator account.
    await query(
      `UPDATE users SET role = 'USER', token_version = token_version + 1, updated_at = NOW()
       WHERE role = 'ADMIN' AND LOWER(email) <> $1`,
      [OWNER_EMAIL]
    );
  }

  const admin = await query(
    `SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id ASC LIMIT 1`
  );
  if (admin.rows.length) {
    const adminId = admin.rows[0].id;
    await query(
      `DELETE FROM products
       WHERE user_id IS NULL
         AND sku IN (SELECT sku FROM products WHERE user_id = $1)`,
      [adminId]
    );
    for (const table of ['products', 'stock_movements', 'cash_transactions', 'credit_records']) {
      await query(`UPDATE ${table} SET user_id = $1 WHERE user_id IS NULL`, [adminId]);
    }
    if (bootstrappedAdminId) {
      await seedStarterCatalog({ query }, adminId);
    }
  }
}

let readyPromise = null;
function ready() {
  if (!readyPromise) {
    readyPromise = (async () => {
      if (env.IS_PROD && !env.JWT_SECRET) {
        throw new Error('Set a random JWT_SECRET of at least 32 bytes in production.');
      }
      if (env.IS_PROD && !pool) {
        throw new Error('Set a valid PostgreSQL DATABASE_URL in production.');
      }
      if (env.IS_PROD) getOwnerPasswordHash();
      if (mode === 'serverless') return;

      await runMigrations();
      await rawTransaction(async (client) => {
        if (mode === 'postgres') await client.query('SELECT pg_advisory_xact_lock(727274002)');
        await bootstrapAdmin(client);
      });
    })().catch((err) => {
      readyPromise = null;
      console.error('[DB] Initialization failed:', err.message);
      throw new AppError('The service is temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
    });
  }
  return readyPromise;
}

const db = {
  get mode() {
    return mode;
  },
  ready,
  async checkHealth() {
    await ready();
    if (mode === 'serverless') return;
    try {
      await rawQuery('SELECT 1');
    } catch {
      throw new AppError('The database is temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
    }
  },
  async query(text, params = []) {
    await ready();
    return rawQuery(text, params);
  },
  async withTransaction(fn) {
    await ready();
    return rawTransaction(fn);
  },
};

module.exports = db;

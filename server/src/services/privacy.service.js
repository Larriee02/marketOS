const { randomUUID } = require('crypto');
const db = require('../config/db');
const AppError = require('../utils/AppError');

const kinds = ['Access', 'Correction', 'Deletion', 'Restriction', 'Objection', 'Other'];

async function submit({ email, shop, kind } = {}) {
  email = typeof email === 'string' ? email.trim() : '';
  shop = typeof shop === 'string' ? shop.trim() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || shop.length > 150 || !kinds.includes(kind)) {
    throw new AppError('Enter a valid reply email, request type and shop name of up to 150 characters.', 400);
  }
  const reference = randomUUID();
  await db.query('INSERT INTO privacy_requests (reference, email, shop, kind) VALUES ($1, $2, $3, $4)',
    [reference, email, shop, kind]);
  return { reference };
}

async function list() {
  const { rows } = await db.query(
    'SELECT reference, email, shop, kind, created_at FROM privacy_requests ORDER BY created_at, reference LIMIT 50'
  );
  return rows;
}

async function complete(reference) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reference)) {
    throw new AppError('Invalid request reference.', 400);
  }
  // Clear intake contact details once the operator has answered the request.
  await db.query('DELETE FROM privacy_requests WHERE reference = $1', [reference]);
}

module.exports = { submit, list, complete };

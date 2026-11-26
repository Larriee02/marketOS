const db = require('../config/db');
const AppError = require('../utils/AppError');

// Only these merchant-facing fields can enter a downloaded file.
const fields = {
  products: 'id, sku, name, category, unit, cost_price, selling_price, stock_quantity, reorder_level, supplier_name, created_at, updated_at',
  stock_movements: 'id, product_id, movement_type, quantity_change, previous_stock, new_stock, unit_price, unit_cost, total_value, counterparty_name, note, created_at',
  cash_transactions: 'id, type, category, amount, payment_method, counterparty_name, description, stock_movement_id, transaction_date, status, expense_reason, correction_reason, parent_transaction_id, replaced_by_id, corrected_at',
  cashbook_sessions: 'id, session_date, time_zone, opening_balance, opening_cash, opening_bank_pos, opening_note, expected_closing_balance, actual_closing_balance, actual_closing_cash, actual_closing_bank_pos, variance, closing_note, status, opened_at, closed_at',
  credit_records: 'id, customer_name, phone, customer_address, items_summary, total_amount, amount_paid, balance_due, status, due_date, notes, created_at, updated_at',
  credit_repayments: 'id, credit_record_id, customer_name, amount, payment_method, note, created_at',
};

async function exportShopPage(userId, collection, after = '0') {
  if (!Object.hasOwn(fields, collection) || typeof after !== 'string' || !/^\d{1,10}$/.test(after) || Number(after) > 2147483647) {
    throw new AppError('Invalid export collection or cursor.', 400);
  }
  const pageSize = 100;
  const { rows } = await db.query(
    `/* shop export */ SELECT ${fields[collection]} FROM ${collection}
     WHERE user_id = $1 AND id > $2 ORDER BY id LIMIT $3`,
    [userId, Number(after), pageSize + 1]
  );
  const records = rows.slice(0, pageSize);
  return { shopId: userId, records, next: rows.length > pageSize ? records.at(-1).id : null };
}

module.exports = { exportShopPage, collections: Object.keys(fields) };

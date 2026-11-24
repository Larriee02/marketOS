const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.ALLOW_OTP_PREVIEW = 'true';
const auth = require('./src/services/auth.service');
const otp = require('./src/services/otp.service');
const notifications = require('./src/services/notification.service');
const db = require('./src/config/db');
const env = require('./src/config/env');
const cashbook = require('./src/services/cashbook.service');
const inventory = require('./src/services/inventory.service');
const registerMerchant = require('./test-support/register-merchant');

async function run() {
  const details = {
    email: `review-${Date.now()}@example.test`, password: 'MerchantPass123!',
    full_name: 'Review Merchant', business_name: 'Review Store', seed_catalog: false,
  };
  await assert.rejects(auth.register(details), { code: 'OTP_REQUIRED' });
  await assert.rejects(auth.oauthSignIn({ provider: 'GOOGLE' }), { code: 'INVALID_GOOGLE_TOKEN' });
  const { user } = await registerMerchant(auth, details);

  const originalDelivery = notifications.sendEmailOtp;
  let resetCode;
  notifications.sendEmailOtp = async ({ code }) => {
    resetCode = code;
    return { success: true, provider: 'smtp' };
  };
  try {
    const reset = { email: details.email, password: 'NewMerchantPass123!' };
    await auth.requestPasswordReset(reset);
    await auth.resetPassword({ ...reset, code: resetCode });
    await assert.rejects(auth.resetPassword({ ...reset, code: resetCode }), { code: 'OTP_NOT_FOUND' });
    await assert.rejects(auth.login({ identifier: details.email, password: details.password }), { code: 'INVALID_CREDENTIALS' });
    const repo = require('./src/repositories/user.repository');
    const updated = await repo.findAuthById(user.id);
    assert.ok(await require('bcryptjs').compare(reset.password, updated.password_hash));
    assert.equal(Number(updated.token_version), 1);
    const { issueSessionCookie } = require('./src/utils/session');
    for (const persistent of [false, true]) {
      await issueSessionCookie({ cookie(name, token, options) {
        assert.equal(Boolean(options.maxAge), persistent);
        assert.equal(options.httpOnly, true);
      } }, updated, persistent);
    }
  } finally {
    notifications.sendEmailOtp = originalDelivery;
  }
  const request = { purpose: 'LOGIN', email: details.email };
  const send = notifications.sendEmailOtp;
  env.ALLOW_OTP_PREVIEW = false;
  try {
    for (const delivery of [
      async () => ({ success: true, provider: 'console-simulated' }),
      async () => { throw new Error('Delivery failed'); },
    ]) {
      notifications.sendEmailOtp = delivery;
      await assert.rejects(otp.requestOtp(request), { code: 'OTP_DELIVERY_FAILED' });
    }
    notifications.sendEmailOtp = async () => ({ success: true, provider: 'smtp' });
    const delivered = await otp.requestOtp({ ...request, purpose: 'SIGNUP' });
    assert.equal(delivered.otpPreview, undefined);
  } finally {
    notifications.sendEmailOtp = send;
    env.ALLOW_OTP_PREVIEW = true;
  }

  const challenge = await otp.requestOtp(request);
  await assert.rejects(otp.requestOtp(request), { code: 'COOLDOWN_ACTIVE' });
  const verify = () => otp.verifyOtp({ ...request, code: challenge.otpPreview });
  const concurrent = await Promise.allSettled([verify(), verify()]);
  assert.equal(concurrent.filter((result) => result.status === 'fulfilled').length, 1);
  await assert.rejects(verify(), { code: 'OTP_NOT_FOUND' });

  const product = await inventory.createProduct(user.id, {
    name: 'Tea', sku: 'TEA', category: 'Drinks', unit: 'box',
    cost_price: 1000, selling_price: 1500, stock_quantity: 0, reorder_level: 0,
  });
  await inventory.recordMovement(user.id, {
    product_id: product.id, movement_type: 'RESTOCK', quantity: 1, record_cash: true,
  });
  const sale = await inventory.checkoutCart(user.id, { items: [{ product_id: product.id, quantity: 1 }] });
  const period = { start: '2000-01-01', end: '2100-01-01' };
  let report = await cashbook.getFinancialReport(user.id, period);
  assert.equal(report.metrics.netOperatingProfit, 500);
  assert.equal(report.channelBreakdown[0].outflow, 1000);
  await cashbook.correctTransaction(user.id, sale.cashTransaction.id, {
    mode: 'AMEND', correction_reason: 'Payment channel', payment_method: 'POS',
  });
  await cashbook.recordTransaction(user.id, { type: 'INFLOW', category: 'Wholesale Order', amount: 250 });
  report = await cashbook.getFinancialReport(user.id, period);
  assert.equal(report.metrics.salesRevenue, 1750);

  // Use an isolated historical day so this checks the full SQL aggregation and close workflow.
  await db.query(
    `INSERT INTO cash_transactions (user_id, type, category, amount, description, transaction_date)
     SELECT $1, 'INFLOW', 'Credit Repayment', 1, 'Collection', '2001-01-01T10:00:00Z'
     FROM generate_series(1, 2001)`, [user.id]
  );
  const collections = await cashbook.getFinancialReport(user.id, { start: '2001-01-01', end: '2001-01-02' });
  assert.equal(collections.metrics.salesRevenue, 0);
  assert.equal(collections.metrics.netOperatingProfit, 0);
  assert.equal(collections.channelBreakdown[0].inflow, 2001);
  const close = await cashbook.closeCashbookSession(user.id, { session_date: '2001-01-01', actual_closing_cash: 2001 });
  assert.equal(Number(close.expected_closing_balance), 2001);
  assert.equal(Number(close.variance), 0);
}

run().then(() => console.log('Auth and cashbook regressions passed.')).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

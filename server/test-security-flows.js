const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.ALLOW_OTP_PREVIEW = 'true';

const app = require('./src/app');
const notifications = require('./src/services/notification.service');
const admin = require('./src/services/admin.service');
const repo = require('./src/repositories/user.repository');
const { OWNER_EMAIL } = require('./src/config/owner');
const { verifyOAuthState } = require('./src/services/oauth.service');
const { createHash } = require('node:crypto');

async function run() {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const email = `security-${Date.now()}@example.test`;
  const password = 'RetailerPassword123';
  const shop = { email, password, business_name: 'Books & More', full_name: 'Alice & Bob' };
  const messages = [];
  notifications.deliverEmail = async msg => {
    messages.push(msg);
    return { success: true, provider: 'test' };
  };
  async function call(path, body, cookie) {
    const res = await fetch(base + '/api/v1' + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json();
    const session = res.headers.get('set-cookie')?.split(';')[0];
    return { status: res.status, data, session };
  }
  async function login(pw) {
    const credentials = { identifier: email, password: pw };
    const { data } = await call('/auth/login', credentials);
    assert.ok(data.otpPreview);
    const result = await call('/auth/login', { ...credentials, otp: data.otpPreview });
    assert.equal(result.status, 200);
    assert.ok(result.session);
    assert.equal(result.data.token, undefined);
    return result.session;
  }
  try {
    const start = await fetch(base + '/api/v1/auth/oauth/google/authorize', { redirect: 'manual' });
    const params = new URL(start.headers.get('location')).searchParams;
    const cookie = start.headers.get('set-cookie').split(';')[0].split('=')[1];
    const state = verifyOAuthState(params.get('state'));
    assert.equal(state.challenge, createHash('sha256').update(cookie).digest('base64url'));
    assert.equal(state.nonce, params.get('nonce'));
    assert.match(start.headers.get('set-cookie'), /HttpOnly/i);

    const oauth = require('./src/services/oauth.service');
    const originalVerify = oauth.verifyGoogleIdToken;
    const env = require('./src/config/env');
    const originalSecret = env.GOOGLE_CLIENT_SECRET;
    try {
      env.GOOGLE_CLIENT_SECRET = '';
      oauth.verifyGoogleIdToken = async (_credential, nonce) => {
        assert.equal(nonce, state.nonce);
        return { sub: email, email: 'google-' + email, emailVerified: true, name: 'Test Merchant' };
      };
      const callback = await fetch(base + '/api/v1/auth/oauth/google/callback', {
        method: 'POST', headers: { cookie: 'mos_google=' + cookie },
        body: new URLSearchParams({ state: params.get('state'), id_token: 'test-provider-credential' }),
        redirect: 'manual',
      });
      assert.equal(callback.status, 200);
      assert.match(callback.headers.get('set-cookie'), /mos_session=/);
      assert.match(await callback.text(), /oauth-complete.js/);
    } finally {
      oauth.verifyGoogleIdToken = originalVerify;
      env.GOOGLE_CLIENT_SECRET = originalSecret;
    }

    const { data } = await call('/auth/otp/request', { ...shop, purpose: 'SIGNUP' });
    assert.match(messages.find(msg => msg.to === email).html, /Alice &amp; Bob/);
    const signup = await call('/auth/register', { ...shop, otp: data.otpPreview });
    assert.equal(signup.status, 201);
    assert.ok(signup.session);
    assert.equal(signup.data.token, undefined);
    const secondSession = await login(password);
    assert.equal((await call('/auth/logout', {}, signup.session)).status, 200);
    assert.equal((await call('/auth/me', null, signup.session)).status, 401);
    assert.equal((await call('/auth/me', null, secondSession)).status, 200);

    const owner = await repo.findAuthByEmail(OWNER_EMAIL);
    const privacyPath = '/privacy/requests';
    const queuePath = '/admin/privacy-requests';
    const intake = { email: 'customer@example.test', shop: 'Local market', kind: 'Deletion' };
    assert.equal((await call(privacyPath, { ...intake, email: 'invalid' })).status, 400);
    const submitted = await call(privacyPath, intake);
    assert.equal(submitted.status, 201);
    assert.deepEqual(Object.keys(submitted.data), ['reference']);
    assert.equal((await call(queuePath)).status, 401);
    assert.equal((await call(queuePath, null, secondSession)).status, 403);
    const { signSession } = require('./src/utils/session');
    const ownerSession = 'mos_session=' + await signSession(owner);
    const queue = await call(queuePath, null, ownerSession);
    assert.equal(queue.status, 200);
    assert.equal(queue.data.find(item => item.reference === submitted.data.reference).email, intake.email);
    const closePath = base + '/api/v1' + queuePath + '/' + submitted.data.reference;
    assert.equal((await fetch(closePath, { method: 'DELETE', headers: { cookie: secondSession } })).status, 403);
    assert.equal((await fetch(closePath, { method: 'DELETE', headers: { cookie: ownerSession } })).status, 204);
    assert.ok(!(await call(queuePath, null, ownerSession)).data.some(item => item.reference === submitted.data.reference));

    const temporary = await admin.resetUserPassword(owner.id, signup.data.user.id);
    assert.equal((await call('/auth/me', null, secondSession)).status, 401);
    const restricted = await login(temporary.temporaryPassword);
    assert.equal((await call('/auth/me', null, restricted)).data.user.must_change_password, true);
    assert.equal((await call('/products', null, restricted)).data.code, 'PASSWORD_CHANGE_REQUIRED');
    const change = await call('/auth/change-password', {
      current_password: temporary.temporaryPassword, new_password: 'MyReplacementPass123',
    }, restricted);
    assert.equal(change.status, 200);
    assert.equal(change.data.user.must_change_password, false);
    assert.equal((await call('/auth/me', null, restricted)).status, 401);
    assert.equal((await call('/products', null, change.session)).status, 200);
    const resetKnown = await call('/auth/password/request', { email });
    const resetUnknown = await call('/auth/password/request', { email: 'absent-' + email });
    assert.equal(resetKnown.status, 200);
    assert.equal(resetUnknown.status, 200);
    assert.deepEqual(resetKnown.data, resetUnknown.data);

    const validatePassword = require('./src/utils/password');
    assert.throws(() => validatePassword('short'), { code: 'WEAK_PASSWORD' });
    assert.throws(() => validatePassword('é'.repeat(37)), { code: 'WEAK_PASSWORD' });
    validatePassword('é'.repeat(36));

    const { limit } = require('./src/utils/rateLimiter');
    const requests = await Promise.allSettled(Array.from({ length: 5 }, () =>
      limit('test', email, 60000, 2, 'Please wait.')));
    assert.equal(requests.filter(result => result.status === 'fulfilled').length, 2);
    assert.ok(requests.filter(result => result.status === 'rejected')
      .every(result => result.reason.code === 'RATE_LIMIT_EXCEEDED'));
    console.log('PASS cookie-only authentication, logout isolation, temporary credentials, password rotation and OAuth completion with a simulated provider');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(err => { console.error(err); process.exitCode = 1; });

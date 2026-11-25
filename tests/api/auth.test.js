import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { beforeEach, test } from 'node:test';
import { parseSetCookie } from 'cookie';
import express from 'express';
import { gaxios, OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { closePool } from '../../server/db/pool.js';
import { verifyGoogleIdToken } from '../../server/auth/google.js';
import { readSession } from '../../server/auth/jwt.js';
import { requireAuth } from '../../server/auth/middleware.js';
import { createAuthRouter } from '../../server/routes/auth.js';
import { postgresUnavailable, startTestDatabase } from '../helpers/postgres.js';

const audience = 'nholau-test.invalid';
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const cert = publicKey.export({ type: 'spki', format: 'pem' });
const issuer = 'https://accounts.google.com';
const now = () => Math.floor(Date.now() / 1000);
const postgresSkip = await postgresUnavailable();

delete process.env.DATABASE_URL;
process.env.GOOGLE_CLIENT_ID = audience;
process.env.JWT_SECRET = randomBytes(48).toString('base64');
beforeEach(() => {
  process.env.NODE_ENV = 'production';
  process.env.DEV_AUTH = '0';
});

function googleToken(changes = {}, key = privateKey) {
  return jwt.sign({
    iss: issuer, aud: audience, sub: 'google-a', email: 'a@example.invalid', email_verified: true,
    name: 'An', picture: 'https://example.invalid/a.png', exp: now() + 3600, ...changes,
  }, key, { algorithm: 'RS256', keyid: 'test' });
}

async function serve(t) {
  // Chỉ thay nguồn khóa công khai. OAuth2Client vẫn xác minh chữ ký và các claim.
  const googleClient = new OAuth2Client();
  t.mock.method(googleClient, 'getFederatedSignonCertsAsync', async () => ({ certs: { test: cert } }));
  const app = express();
  app.use(express.json());
  app.use('/api', createAuthRouter({ googleClient }));
  app.get('/probe', requireAuth, (req, res) => res.json(req.user));
  // Đại diện cho error handler cuối của At để thử lỗi ngoài xác thực.
  app.use((error, req, res, next) => res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ.' } }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve())));
  const origin = 'http://127.0.0.1:' + server.address().port;
  return async function request(path, { body, cookie, headers = {}, method = body ? 'POST' : 'GET' } = {}) {
    const response = await fetch(origin + path, {
      method,
      headers: { ...headers, ...(cookie && { Cookie: cookie }), ...(body && { 'Content-Type': 'application/json' }) },
      body: body && JSON.stringify(body),
    });
    return {
      status: response.status, headers: response.headers,
      body: response.status === 204 ? null : await response.json(),
    };
  };
}

function assertError(response, status, code) {
  assert.equal(response.status, status);
  assert.deepEqual(Object.keys(response.body), ['error']);
  assert.deepEqual(Object.keys(response.body.error).sort(), ['code', 'message']);
  assert.equal(response.body.error.code, code);
  assert.equal(typeof response.body.error.message, 'string');
  assert.equal(response.headers.get('set-cookie'), null);
}

test('Google yêu cầu idToken trong JSON và từ chối thông tin chưa xác minh', async t => {
  const request = await serve(t);
  for (const body of [{}, { idToken: [] }, { idToken: ' ' }, { userId: randomUUID(), email: 'a@example.invalid' }]) {
    assertError(await request('/api/auth/google?idToken=ignored', { body }), 400, 'VALIDATION_ERROR');
  }
  const wrongKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  const invalid = [
    'invalid', jwt.sign({ aud: audience }, null, { algorithm: 'none', keyid: 'test' }),
    googleToken({}, wrongKey), googleToken({ aud: 'other.invalid' }), googleToken({ iss: 'https://example.invalid' }),
    googleToken({ exp: now() - 1 }), googleToken({ email_verified: false }), googleToken({ email_verified: 'true' }),
    googleToken({ email: '' }), googleToken({ sub: '' }),
  ];
  for (const idToken of invalid) {
    assertError(await request('/api/auth/google', { body: { idToken } }), 401, 'UNAUTHORIZED');
  }
});

test('chỉ chấp nhận JWT có HS256, chữ ký, thời hạn, UUID và phiên bản hợp lệ trong cookie', async t => {
  const request = await serve(t);
  const claims = { sub: randomUUID(), tv: 0 };
  const key = process.env.JWT_SECRET;
  const active = { ...claims, exp: now() + 3600 };
  for (const token of [
    'invalid', jwt.sign(active, null, { algorithm: 'none' }), jwt.sign(active, key, { algorithm: 'HS384' }),
    jwt.sign(active, randomBytes(48)), jwt.sign({ ...claims, exp: now() - 1 }, key), jwt.sign(claims, key),
    jwt.sign({ ...active, sub: 'abc' }, key), jwt.sign({ ...active, tv: '0' }, key),
    jwt.sign({ sub: claims.sub, exp: active.exp }, key),
  ]) {
    const cookie = 'nholau_session=' + token;
    assert.equal(readSession({ headers: { cookie } }), null);
    assertError(await request('/api/me', { cookie }), 401, 'UNAUTHORIZED');
  }
  const token = jwt.sign(active, key);
  assertError(await request('/api/me?token=' + token, { headers: { Authorization: 'Bearer ' + token } }), 401, 'UNAUTHORIZED');
});

test('thiếu client ID hoặc không lấy được khóa Google thì không cấp phiên, không lộ token', async t => {
  const request = await serve(t);
  delete process.env.GOOGLE_CLIENT_ID;
  try {
    assertError(await request('/api/auth/google', { body: { idToken: 'test' } }), 500, 'INTERNAL_ERROR');
  } finally {
    process.env.GOOGLE_CLIENT_ID = audience;
  }
  const client = new OAuth2Client();
  const idToken = googleToken();
  t.mock.method(client, 'getFederatedSignonCertsAsync', async () => {
    throw new gaxios.GaxiosError(idToken, { url: new URL('https://example.invalid') });
  });
  await assert.rejects(verifyGoogleIdToken(idToken, client), { message: 'Không lấy được khóa xác minh của Google.' });
});

test('X-Dev-User chỉ hoạt động khi cả hai cờ dev đều bật', async t => {
  const request = await serve(t);
  const id = randomUUID();
  for (const [env, flag] of [['production', '1'], ['production', '0'], ['test', '1'], ['development', '0']]) {
    process.env.NODE_ENV = env;
    process.env.DEV_AUTH = flag;
    for (const header of [id, 'sai']) {
      assertError(await request('/probe', { headers: { 'X-Dev-User': header } }), 401, 'UNAUTHORIZED');
    }
  }
  process.env.NODE_ENV = 'development';
  process.env.DEV_AUTH = '1';
  assertError(await request('/probe'), 401, 'UNAUTHORIZED');
  assertError(await request('/probe', { headers: { 'X-Dev-User': 'sai' } }), 400, 'VALIDATION_ERROR');
  const dev = await request('/probe?userId=' + randomUUID(), { headers: { 'X-Dev-User': id } });
  assert.equal(dev.status, 200);
  assert.deepEqual(dev.body, { id });
});

test('giới hạn 20 lượt trong 15 phút theo IP Cloudflare, dự phòng bằng IP kết nối', async t => {
  const request = await serve(t);
  const attempt = headers => request('/api/auth/google', { body: {}, headers });
  for (let n = 0; n < 20; n++) {
    assert.equal((await attempt({ 'CF-Connecting-IP': '192.0.2.1' })).status, 400);
    assert.equal((await attempt({ 'X-Forwarded-For': '192.0.2.' + (n + 1) })).status, 400);
  }
  const limited = await attempt({ 'CF-Connecting-IP': '192.0.2.1' });
  assertError(limited, 429, 'RATE_LIMITED');
  const retryAfter = Number(limited.headers.get('retry-after'));
  assert.match(limited.headers.get('ratelimit-policy'), /\bw=900\b/);
  assert.ok(retryAfter > 0 && retryAfter <= 900);
  assertError(await attempt({ 'CF-Connecting-IP': 'sai-dia-chi' }), 429, 'RATE_LIMITED');
  assertError(await attempt({ 'CF-Connecting-IP': '192.0.2.2' }), 400, 'VALIDATION_ERROR');
});

test('đăng nhập, hồ sơ, thu hồi và đăng xuất với hai người dùng trên PostgreSQL 16', { skip: postgresSkip }, async t => {
  const db = await startTestDatabase();
  t.after(async () => {
    await closePool();
    await db.stop();
  });
  await db.migrate();
  await db.grantApp();
  process.env.DATABASE_URL = db.appUrl;
  process.env.PGSSLMODE = 'disable';
  process.env.DEV_AUTH = '1'; // Vẫn ở production.
  const request = await serve(t);
  const login = (claims, fields = {}) => request('/api/auth/google', { body: { ...fields, idToken: googleToken(claims) } });
  const cookieOf = response => response.headers.get('set-cookie').split(';')[0];

  const strongKey = process.env.JWT_SECRET;
  process.env.JWT_SECRET = randomBytes(4).toString('hex');
  try {
    assertError(await login({ sub: 'chua-duoc-luu' }), 500, 'INTERNAL_ERROR');
    assert.equal((await db.admin.query('SELECT 1 FROM users')).rowCount, 0);
  } finally {
    process.env.JWT_SECRET = strongKey;
  }

  const [a, again] = await Promise.all([login({}), login({})]);
  assert.equal(a.status, 200);
  assert.equal(again.status, 200);
  assert.deepEqual(again.body, a.body);
  const first = a.body.user;
  assert.deepEqual(first, { id: first.id, name: 'An', email: 'a@example.invalid', avatarUrl: 'https://example.invalid/a.png' });
  const cookieA = cookieOf(a);
  const cookie = parseSetCookie(a.headers.get('set-cookie'));
  assert.equal(cookie.name, 'nholau_session');
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.secure, true);
  assert.equal(cookie.sameSite, 'lax');
  assert.equal(cookie.path, '/');
  assert.equal(cookie.maxAge, 604800);
  const session = jwt.verify(cookie.value, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  assert.equal(session.sub, first.id);
  assert.equal(session.tv, 0);
  assert.equal(session.exp - session.iat, 604800);
  const wrongSignature = jwt.sign({ sub: first.id, tv: 0, exp: now() + 3600 }, randomBytes(48));
  assertError(await request('/api/me', { cookie: 'nholau_session=' + wrongSignature }), 401, 'UNAUTHORIZED');
  // Kể cả chữ ký đúng, nếu không đọc được token_version thì không cho qua middleware.
  await db.admin.query('REVOKE SELECT ON users FROM nholau_app');
  try {
    assertError(await request('/probe', { cookie: cookieA }), 401, 'UNAUTHORIZED');
  } finally {
    await db.admin.query('GRANT SELECT ON users TO nholau_app');
  }

  // Cùng email nhưng khác google_sub phải là hai user. Bỏ qua id, email, tên và phiên bản do client gửi.
  const b = await login({ sub: 'google-b', iss: 'accounts.google.com', name: 'Bình', picture: null },
    { userId: first.id, user_id: first.id, google_sub: 'google-a', email: 'fake@example.invalid', tokenVersion: 9 });
  assert.equal(b.status, 200);
  const second = b.body.user;
  assert.notEqual(second.id, first.id);
  assert.deepEqual(second, { id: second.id, email: first.email, name: 'Bình', avatarUrl: null });
  const cookieB = cookieOf(b);
  for (const [own, other, cookie] of [[first, second, cookieA], [second, first, cookieB]]) {
    const me = await request('/api/me?userId=' + other.id + '&user_id=' + other.id, { cookie, headers: { 'X-Dev-User': other.id } });
    assert.equal(me.status, 200);
    assert.deepEqual(me.body, { user: own });
    assert.equal(me.headers.get('cache-control'), 'no-store');
  }
  await db.admin.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [first.id]);
  assertError(await request('/api/me', { cookie: cookieA }), 401, 'UNAUTHORIZED');
  assert.deepEqual((await request('/api/me', { cookie: cookieB })).body, { user: second });
  const changed = await login({ email: 'new@example.invalid', name: 'An mới', picture: 'https://example.invalid/new.png' });
  assert.equal(changed.status, 200);
  assert.deepEqual(changed.body.user, { id: first.id, email: 'new@example.invalid', name: 'An mới', avatarUrl: 'https://example.invalid/new.png' });
  assert.equal((await db.admin.query('SELECT id FROM users')).rowCount, 2);
  const freshA = cookieOf(changed);
  assert.deepEqual((await request('/api/me', { cookie: freshA })).body, changed.body);
  assertError(await request('/api/me', { cookie: cookieA }), 401, 'UNAUTHORIZED');

  process.env.NODE_ENV = 'development';
  const local = await login({ sub: 'google-b' });
  assert.equal(local.status, 200);
  assert.ok(!parseSetCookie(local.headers.get('set-cookie')).secure);
  process.env.NODE_ENV = 'production';

  const logout = await request('/api/auth/logout', { cookie: cookieB, body: { userId: first.id } });
  assert.equal(logout.status, 204);
  const cleared = parseSetCookie(logout.headers.get('set-cookie'));
  assert.deepEqual([cleared.name, cleared.value, cleared.maxAge, cleared.path, cleared.sameSite, cleared.httpOnly, cleared.secure],
    [cookie.name, '', 0, '/', 'lax', true, true]);
  assertError(await request('/api/me', { cookie: cookieOf(logout) }), 401, 'UNAUTHORIZED');
  assertError(await request('/api/me'), 401, 'UNAUTHORIZED');
  assert.equal((await request('/api/auth/logout', { method: 'POST' })).status, 204);
  assert.deepEqual((await request('/api/me', { cookie: freshA })).body, changed.body);
  await db.admin.query('DELETE FROM users WHERE id = $1', [first.id]);
  assertError(await request('/api/me', { cookie: freshA }), 401, 'UNAUTHORIZED');
});

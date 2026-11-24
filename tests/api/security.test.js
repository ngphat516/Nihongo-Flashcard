import assert from 'node:assert/strict';
import { test } from 'node:test';
import { serve, USER_A, USER_B } from './helpers.js';

test('API: static allowlist, header và auth thật ở production', async t => {
  process.env.NODE_ENV = 'production';
  process.env.DEV_AUTH = '1';
  const request = await serve(t);
  for (const path of ['/.env', '/.env.example', '/server/index.js', '/db/migrations/001_init.sql',
    '/package.json', '/pages/home/analytics.test.js', '/tests/api/security.test.js', '/pages/study/screenshots/s12-320.jpg', '/core/../server/index.js']) {
    assert.equal((await request(path)).status, 404, path);
  }
  for (const user of [USER_A, USER_B]) {
    for (const path of ['/api/decks', '/api/cards', '/api/reviewLogs', '/api/me/data', '/api/reviews']) {
      const response = await request(path, { user, method: path === '/api/reviews' ? 'POST' : 'GET' });
      assert.equal(response.status, 401, path);
    }
  }
  const page = await request('/pages/study/');
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(page.headers.get('x-frame-options'), 'DENY');
  assert.equal(page.headers.get('referrer-policy'), 'same-origin');
  assert.equal(page.headers.get('access-control-allow-origin'), null);
});

test('API: JSON lỗi, quá 2 MB, sai Content-Type và origin ngoài', async t => {
  const request = await serve(t);
  const cases = [
    [{ method: 'POST', raw: 'abc', headers: { 'Content-Type': 'text/plain' } }, 415],
    [{ method: 'POST', raw: '{', headers: { 'Content-Type': 'application/json' } }, 400],
    [{ method: 'POST', body: { text: 'a'.repeat(2 * 1024 * 1024) } }, 413],
    [{ method: 'POST', body: {}, headers: { Origin: 'https://other.invalid' } }, 403],
  ];
  for (const [options, status] of cases) {
    const response = await request('/api/decks/batch', options);
    assert.equal(response.status, status);
    assert.deepEqual(Object.keys(response.body), ['error']);
    assert.equal(typeof response.body.error.code, 'string');
    assert.equal(typeof response.body.error.message, 'string');
  }
});

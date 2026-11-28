// account.js (BE6): gọi API đăng nhập / đăng xuất, đổi lỗi HTTP thành câu hiện được.
// Dùng fetch giả, không gọi Google hay server thật.
import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { installMemoryStorage } from './helpers/memory-storage.js';
import { ACCOUNT_MESSAGES, fetchGoogleClientId, onSignIn, signInWithGoogle, signOut } from '../core/account.js';
import { SIGNED_IN_KEY } from '../core/storage.js';

const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'a@example.invalid', name: 'A', avatarUrl: null };

let local;
let calls;
function fakeFetch(handler) {
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const call = { method: init.method ?? 'GET', path: u.pathname.replace(/^.*\/api\//, ''), init,
      body: init.body === undefined ? undefined : JSON.parse(init.body) };
    calls.push(call);
    const { status = 200, body = null, throws } = handler(call) ?? {};
    if (throws) throw new TypeError('Failed to fetch');
    return new Response(status === 204 ? null : JSON.stringify(body), { status });
  };
}
const error = (message) => ({ error: { code: 'X', message } });

const realFetch = globalThis.fetch;
beforeEach(() => {
  local = installMemoryStorage();
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('fetchGoogleClientId', () => {
  test('200 → client ID, gọi GET /api/auth/config cùng origin', async () => {
    fakeFetch(() => ({ body: { googleClientId: 'abc.apps.googleusercontent.com' } }));
    assert.equal(await fetchGoogleClientId(), 'abc.apps.googleusercontent.com');
    assert.deepEqual(calls.map((c) => [c.method, c.path, c.init.credentials]), [['GET', 'auth/config', 'same-origin']]);
  });

  test('404 (python http.server, không có API) → báo cần máy chủ Node', async () => {
    fakeFetch(() => ({ status: 404, body: null }));
    await assert.rejects(fetchGoogleClientId(), { name: 'NetworkError', message: ACCOUNT_MESSAGES.noServer });
  });

  test('503 (server chưa cấu hình) → câu của server; 200 thiếu ID → lỗi máy chủ', async () => {
    fakeFetch(() => ({ status: 503, body: error('Máy chủ chưa cấu hình đăng nhập Google.') }));
    await assert.rejects(fetchGoogleClientId(), { message: 'Máy chủ chưa cấu hình đăng nhập Google.' });
    fakeFetch(() => ({ body: {} }));
    await assert.rejects(fetchGoogleClientId(), { message: ACCOUNT_MESSAGES.server });
  });

  test('mất mạng → lỗi mạng', async () => {
    fakeFetch(() => ({ throws: true }));
    await assert.rejects(fetchGoogleClientId(), { name: 'NetworkError', message: ACCOUNT_MESSAGES.network });
  });
});

describe('signInWithGoogle', () => {
  test('200 → POST { idToken } dạng JSON, ghi dấu đã đăng nhập, chạy hàm onSignIn, trả user', async () => {
    const seen = [];
    onSignIn(async (user) => seen.push(user.id));
    onSignIn(() => {
      throw new Error('BE7 lỗi');
    }); // lỗi trong hàm sau đăng nhập không chặn việc đăng nhập
    const realError = console.error;
    console.error = () => {};
    try {
      fakeFetch(() => ({ body: { user: USER } }));
      assert.deepEqual(await signInWithGoogle('google-token'), USER);
    } finally {
      console.error = realError;
    }
    const [call] = calls;
    assert.equal(call.method, 'POST');
    assert.equal(call.path, 'auth/google');
    assert.deepEqual(call.body, { idToken: 'google-token' });
    assert.equal(call.init.headers['Content-Type'], 'application/json');
    assert.equal(call.init.credentials, 'same-origin');
    assert.equal(local.getItem(SIGNED_IN_KEY), '1');
    assert.deepEqual(seen, [USER.id]);
  });

  test('400 / 401 → "Đăng nhập không thành công", không ghi dấu', async () => {
    for (const status of [400, 401]) {
      fakeFetch(() => ({ status, body: error('chi tiết của server') }));
      await assert.rejects(signInWithGoogle('t'), { name: 'NetworkError', message: ACCOUNT_MESSAGES.signInFailed });
      assert.equal(local.getItem(SIGNED_IN_KEY), null);
    }
  });

  test('429 → nhắc thử lại sau; 404 → cần máy chủ Node; 5xx → câu của server', async () => {
    fakeFetch(() => ({ status: 429, body: error('x') }));
    await assert.rejects(signInWithGoogle('t'), { message: ACCOUNT_MESSAGES.rateLimited });
    fakeFetch(() => ({ status: 404 }));
    await assert.rejects(signInWithGoogle('t'), { message: ACCOUNT_MESSAGES.noServer });
    fakeFetch(() => ({ status: 500, body: error('Lỗi máy chủ, vui lòng thử lại.') }));
    await assert.rejects(signInWithGoogle('t'), { message: 'Lỗi máy chủ, vui lòng thử lại.' });
    assert.equal(local.getItem(SIGNED_IN_KEY), null);
  });

  test('mất mạng → lỗi mạng, không ghi dấu', async () => {
    fakeFetch(() => ({ throws: true }));
    await assert.rejects(signInWithGoogle('t'), { message: ACCOUNT_MESSAGES.network });
    assert.equal(local.getItem(SIGNED_IN_KEY), null);
  });
});

describe('signOut', () => {
  test('204 → POST /api/auth/logout rồi xóa dấu đã đăng nhập', async () => {
    local.setItem(SIGNED_IN_KEY, '1');
    fakeFetch(() => ({ status: 204 }));
    await signOut();
    assert.deepEqual(calls.map((c) => [c.method, c.path, c.body]), [['POST', 'auth/logout', undefined]]);
    assert.equal(local.getItem(SIGNED_IN_KEY), null);
  });

  test('401 (phiên đã hết) → coi như đã đăng xuất', async () => {
    local.setItem(SIGNED_IN_KEY, '1');
    fakeFetch(() => ({ status: 401, body: error('x') }));
    await signOut();
    assert.equal(local.getItem(SIGNED_IN_KEY), null);
  });

  test('mất mạng hoặc server lỗi → ném lỗi, GIỮ dấu (cookie phiên vẫn còn)', async () => {
    for (const reply of [{ throws: true }, { status: 500, body: error('Lỗi máy chủ.') }, { status: 404 }]) {
      local.setItem(SIGNED_IN_KEY, '1');
      fakeFetch(() => reply);
      await assert.rejects(signOut(), { name: 'NetworkError' });
      assert.equal(local.getItem(SIGNED_IN_KEY), '1');
    }
  });
});

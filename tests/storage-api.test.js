// storage.js: chọn chế độ, gọi đúng API, đổi lỗi HTTP thành lớp lỗi. Dùng fetch giả, không cần server.
import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { installMemoryStorage } from './helpers/memory-storage.js';
import * as storage from '../core/storage.js';
import { seedDemoData } from '../core/seed.js';
import { migrateCards } from '../core/migrate.js';

const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'a@example.invalid', name: 'A', avatarUrl: null };
const ID = '22222222-2222-4222-8222-222222222222';

let local;
let calls;
/** routes: (method, path) → { status, body } ; mặc định /api/me trả 200. */
function fakeFetch(handler) {
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const call = { method: init.method ?? 'GET', path: u.pathname.replace(/^.*\/api\//, ''), search: u.search,
      body: init.body === undefined ? undefined : JSON.parse(init.body), headers: init.headers ?? {} };
    calls.push(call);
    const { status = 200, body = null, throws } = handler(call) ?? {};
    if (throws) throw new TypeError('Failed to fetch');
    return new Response(status === 204 ? null : JSON.stringify(body), { status });
  };
}
const signedIn = (rest = () => {}) => {
  storage.rememberSignedIn(true);
  fakeFetch((c) => (c.path === 'me' ? { body: { user: USER } } : rest(c)));
};

const realFetch = globalThis.fetch;
beforeEach(() => {
  local = installMemoryStorage();
  globalThis.location = { protocol: 'http:' };
  storage.forgetSession();
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete globalThis.location;
  storage.forgetSession();
});

describe('chọn chế độ', () => {
  test('không có location http/https (test Node, file://) → khách, không gọi mạng', async () => {
    delete globalThis.location;
    fakeFetch(() => assert.fail('không được gọi fetch'));
    assert.deepEqual(await storage.session(), { mode: 'local', user: null });
  });

  test('chưa có dấu đã đăng nhập → khách, không gọi mạng (Console không có lỗi 401/404)', async () => {
    fakeFetch(() => assert.fail('không được gọi fetch'));
    assert.equal(await storage.isSignedIn(), false);
  });

  test('/api/me 200 → API, kèm user; chỉ hỏi một lần mỗi lần mở trang', async () => {
    signedIn();
    assert.deepEqual(await storage.session(), { mode: 'api', user: USER });
    assert.equal(await storage.isSignedIn(), true);
    assert.equal(calls.filter((c) => c.path === 'me').length, 1);
  });

  test('401 (chưa đăng nhập) hoặc 404 (server tĩnh) → khách', async () => {
    for (const status of [401, 404]) {
      storage.forgetSession();
      storage.rememberSignedIn(true);
      fakeFetch(() => ({ status, body: { error: { code: 'X', message: 'x' } } }));
      assert.equal(await storage.isSignedIn(), false);
      assert.equal(local.getItem(storage.SIGNED_IN_KEY), null, 'xóa dấu đã đăng nhập');
    }
  });

  test('mất mạng hoặc 5xx → NetworkError, lần sau hỏi lại', async () => {
    storage.rememberSignedIn(true);
    fakeFetch(() => ({ throws: true }));
    await assert.rejects(storage.session(), { name: 'NetworkError' });
    for (const status of [500, 503]) {
      fakeFetch(() => ({ status, body: {} }));
      await assert.rejects(storage.session(), { name: 'NetworkError' });
      assert.equal(local.getItem(storage.SIGNED_IN_KEY), '1');
    }
    fakeFetch(() => ({ body: { user: USER } }));
    assert.equal(await storage.isSignedIn(), true);
  });

  test('khách: đọc/ghi vẫn ở localStorage, không gọi API dữ liệu', async () => {
    fakeFetch(() => assert.fail('không được gọi mạng'));
    await storage.put('decks', { id: ID, name: 'A' }, { expectedUpdatedAt: 5 });
    assert.equal(JSON.parse(local.getItem('nholau:decks'))[ID].name, 'A');
    assert.equal(local.getItem('nholau:decks').includes('expectedUpdatedAt'), false);
  });
});

describe('chế độ API', () => {
  test('put gửi PUT kèm expectedUpdatedAt và trả bản server lưu', async () => {
    signedIn((c) => ({ body: { item: { ...c.body, updatedAt: 99 } } }));
    const saved = await storage.put('cards', { id: ID, term: 'x' }, { expectedUpdatedAt: 7 });
    const call = calls.at(-1);
    assert.equal(call.method, 'PUT');
    assert.equal(call.path, 'cards/' + ID);
    assert.equal(call.body.expectedUpdatedAt, 7);
    assert.equal(call.headers['Content-Type'], 'application/json');
    assert.equal(saved.updatedAt, 99);
  });

  test('list: cards gửi ?deckId=, reviewLogs đổi [from, to) thành from/to của server (lấy cả mốc to)', async () => {
    signedIn(() => ({ body: { items: [] } }));
    await storage.list('cards', { deckId: ID });
    assert.equal(calls.at(-1).search, '?deckId=' + ID);
    await storage.list('reviewLogs', { from: 100, to: 200 });
    assert.equal(calls.at(-1).search, '?from=100&to=199');
    await storage.list('reviewLogs', { from: 0, to: Infinity });
    assert.equal(calls.at(-1).search, '');
    const before = calls.length;
    assert.deepEqual(await storage.list('reviewLogs', { from: 200, to: 200 }), []);
    assert.equal(calls.length, before, 'khoảng rỗng thì không gọi server');
  });

  test('id không phải UUID: get trả null, list theo deckId trả [], không gọi server', async () => {
    signedIn(() => assert.fail('không được gọi server'));
    await storage.session();
    assert.equal(await storage.get('decks', 'constructor'), null);
    assert.deepEqual(await storage.list('cards', { deckId: 'abc' }), []);
  });

  test('get 404 → null; list theo bộ không có → []', async () => {
    signedIn(() => ({ status: 404, body: { error: { code: 'NOT_FOUND', message: 'Không tìm thấy dữ liệu.' } } }));
    assert.equal(await storage.get('cards', ID), null);
    assert.deepEqual(await storage.list('cards', { deckId: ID }), []);
  });

  test('lỗi HTTP → lớp lỗi có message tiếng Việt', async () => {
    const cases = [
      [400, 'ValidationError', 'Tên bộ thẻ không được để trống.'],
      [401, 'AuthError', 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'],
      [404, 'NotFoundError', 'Không tìm thấy dữ liệu.'],
      [409, 'ConflictError', 'Dữ liệu đã được sửa ở máy khác, hãy tải lại trang.'],
      [413, 'NetworkError', 'Dữ liệu vượt quá 2 MB.'],
    ];
    for (const [status, name, message] of cases) {
      signedIn(() => ({ status, body: { error: { code: 'X', message } } }));
      await assert.rejects(storage.put('decks', { id: ID }), { name, message });
    }
    signedIn(() => ({ throws: true }));
    await assert.rejects(storage.remove('decks', ID), { name: 'NetworkError' });
    const message = 'Máy chủ đang lỗi, vui lòng thử lại sau.';
    signedIn(() => ({ status: 503, body: { error: { code: 'INTERNAL_ERROR', message } } }));
    await assert.rejects(storage.get('decks', ID), { name: 'NetworkError', message });
    assert.equal(local.getItem(storage.SIGNED_IN_KEY), '1', 'lỗi máy chủ giữa phiên vẫn giữ dấu');
    signedIn(() => ({ status: 401, body: {} }));
    await assert.rejects(storage.get('decks', ID), { name: 'AuthError' });
    assert.equal(local.getItem(storage.SIGNED_IN_KEY), null, 'hết phiên giữa chừng thì xóa dấu');
  });

  test('putMany và removeMany chia lô 1000', async () => {
    signedIn((c) => (c.method === 'POST' && c.path.endsWith('/batch') ? { body: { items: c.body.items } } : { status: 204 }));
    const items = Array.from({ length: 2500 }, (_, i) => ({ id: `${ID.slice(0, -4)}${String(i).padStart(4, '0')}` }));
    assert.equal((await storage.putMany('cards', items)).length, 2500);
    assert.deepEqual(calls.filter((c) => c.path === 'cards/batch').map((c) => c.body.items.length), [1000, 1000, 500]);
    await storage.removeMany('cards', items.map((i) => i.id));
    assert.equal(calls.filter((c) => c.path === 'cards/delete').length, 3);
    await storage.removeMany('cards', []);
    assert.equal(calls.filter((c) => c.path === 'cards/delete').length, 3, 'danh sách rỗng thì không gọi');
  });

  test('review, undoReview, removeDeck gọi route transaction của server', async () => {
    signedIn((c) => {
      if (c.path === 'reviews') return { body: { card: c.body.card, log: c.body.log } };
      if (c.path.endsWith('/undo')) return { body: { card: c.body.card } };
      return { status: 204 };
    });
    await storage.review({ id: ID }, { id: USER.id }, { expectedUpdatedAt: 3 });
    assert.deepEqual(calls.at(-1).body, { card: { id: ID }, log: { id: USER.id }, expectedUpdatedAt: 3 });
    await storage.undoReview(USER.id, { id: ID });
    assert.equal(calls.at(-1).path, `reviews/${USER.id}/undo`);
    await storage.removeDeck(ID);
    assert.deepEqual([calls.at(-1).method, calls.at(-1).path], ['DELETE', 'decks/' + ID]);
  });
});

describe('khóa dữ liệu thật khi đã đăng nhập', () => {
  test('seedDemoData ném lỗi, không gọi DELETE /api/me/data', async () => {
    signedIn(() => assert.fail('không được gọi server'));
    await assert.rejects(seedDemoData(), /Đang đăng nhập/);
    assert.equal(calls.some((c) => c.method === 'DELETE'), false);
  });

  test('migrateCards không đọc/ghi thẻ trên server', async () => {
    signedIn(() => assert.fail('không được gọi server'));
    assert.equal(await migrateCards(), 0);
  });
});

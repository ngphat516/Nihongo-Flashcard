// repo.js ở chế độ đăng nhập, chạy thật qua storage.js → Express → PostgreSQL (BE5).
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../../server/index.js';
import { postgresUnavailable } from '../helpers/postgres.js';
import { database, USER_A, USER_B } from './helpers.js';
import { installMemoryStorage } from '../helpers/memory-storage.js';
import * as storage from '../../core/storage.js';
import * as repo from '../../core/repo.js';
import { Rating } from '../../core/scheduler.js';

const skip = await postgresUnavailable();

/** Cho storage.js gọi server test: URL gốc API của nó là file://…/api/, đổi sang origin của server, user qua X-Dev-User. */
function browserAs(origin, user) {
  const realFetch = globalThis.__realFetch ??= globalThis.fetch;
  globalThis.location = { protocol: 'http:' };
  globalThis.fetch = (url, init = {}) => {
    const u = new URL(url);
    const apiPath = u.pathname.slice(u.pathname.lastIndexOf('/api/'));
    return realFetch(origin + apiPath + u.search, {
      ...init, headers: { ...init.headers, 'X-Dev-User': user, Origin: origin },
    });
  };
  storage.rememberSignedIn(true);
  storage.forgetSession();
}

test('repo.js chế độ API: CRUD, chấm/hoàn tác, xóa bộ, 409, tách 2 user', { skip }, async (t) => {
  const { request } = await database(t);
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const local = installMemoryStorage();
  t.after(() => {
    globalThis.fetch = globalThis.__realFetch;
    delete globalThis.location;
  });

  browserAs(origin, USER_A);
  assert.equal((await storage.session()).mode, 'api');
  assert.equal((await storage.session()).user.id, USER_A);

  // Bộ và thẻ
  const deck = await repo.createDeck({ name: 'Bộ A', color: 'sky', direction: 'vi-ja' });
  assert.equal(deck.color, 'sky');
  const next = await repo.createDeck({ name: 'Bộ A2' });
  assert.equal(next.color, 'lavender', 'màu kế tiếp tính từ bộ trên server');
  const cards = await repo.createCards(deck.id, [
    { term: '約束[やくそく]', meaning: 'lời hứa' },
    { term: 'ねこ', meaning: 'con mèo', example: '猫[ねこ]がいる' },
  ]);
  assert.equal((await repo.getCards(deck.id)).length, 2);
  assert.equal((await repo.getCards()).length, 2);
  assert.deepEqual([...Array(local.length).keys()].map((i) => local.key(i)), [storage.SIGNED_IN_KEY],
    'localStorage chỉ có dấu đã đăng nhập, không có bộ/thẻ');

  const renamed = await repo.updateDeck(deck.id, { name: 'Bộ A mới' });
  assert.equal((await repo.getDeck(deck.id)).name, 'Bộ A mới');
  assert.ok(renamed.updatedAt > deck.updatedAt);
  await repo.updateCard(cards[0].id, { reading: 'やくそく' });
  assert.equal((await repo.getCard(cards[0].id)).reading, 'やくそく');
  await assert.rejects(repo.updateCard(cards[0].id, { meaning: '  ' }), { name: 'ValidationError' });

  // Chấm điểm, hoàn tác
  const { card: reviewed, log, undo } = await repo.reviewCard(cards[0].id, Rating.GOOD, { timeMs: 1200 });
  assert.equal(reviewed.reps, 1);
  assert.equal((await repo.getReviewLogs()).length, 1);
  assert.equal((await repo.getReviewLogs({ from: log.reviewedAt, to: log.reviewedAt + 1 })).length, 1);
  assert.equal((await repo.getReviewLogs({ from: log.reviewedAt + 1 })).length, 0);
  assert.equal((await repo.getReviewLogs({ to: log.reviewedAt })).length, 0, 'to không lấy mốc to');
  const queue = await repo.getStudyQueue(deck.id);
  assert.equal(queue.deck.id, deck.id);
  const restored = await undo();
  assert.equal(restored.reps, 0);
  assert.equal((await repo.getCard(cards[0].id)).state, 'new');
  assert.equal((await repo.getReviewLogs()).length, 0);
  assert.equal((await undo()).reps, 0, 'hoàn tác 2 lần không lỗi');

  // Máy khác sửa thẻ sau khi máy này đã đọc → 409
  const stale = await repo.getCard(cards[1].id);
  const other = await request('/api/cards/' + stale.id, { method: 'PUT', body: { ...stale, meaning: 'mèo (máy khác)' } });
  assert.equal(other.status, 200);
  await assert.rejects(
    storage.put('cards', { ...stale, meaning: 'mèo' }, { expectedUpdatedAt: stale.updatedAt }),
    { name: 'ConflictError', message: 'Dữ liệu đã được sửa ở máy khác, hãy tải lại trang.' },
  );
  // repo luôn đọc bản mới nhất trước khi sửa nên vẫn lưu được
  await repo.updateCard(stale.id, { meaning: 'con mèo' });
  assert.equal((await repo.getCard(stale.id)).meaning, 'con mèo');

  // Học lại từ đầu
  await repo.reviewCard(cards[1].id, Rating.EASY);
  assert.equal((await repo.resetCard(cards[1].id)).state, 'new');

  // User B không thấy, không sửa được dữ liệu của A
  browserAs(origin, USER_B);
  assert.equal((await repo.getDecks()).length, 0);
  assert.equal(await repo.getDeck(deck.id), null);
  assert.equal(await repo.getCard(cards[0].id), null);
  assert.deepEqual(await repo.getCards(deck.id), []);
  await assert.rejects(repo.updateCard(cards[0].id, { meaning: 'x' }), { name: 'NotFoundError' });
  await assert.rejects(storage.put('cards', { ...stale, meaning: 'x' }), { name: 'NotFoundError' });

  // Xóa bộ: mất thẻ, giữ lịch sử ôn
  browserAs(origin, USER_A);
  await repo.deleteDeck(deck.id);
  assert.equal(await repo.getDeck(deck.id), null);
  assert.equal((await repo.getCards()).length, 0);
  assert.equal((await repo.getReviewLogs()).length, 1);
  assert.equal((await repo.getDeckOverview()).length, 1);
});

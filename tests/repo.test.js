import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { installMemoryStorage } from './helpers/memory-storage.js';
import * as repo from '../core/repo.js';
import { Rating } from '../core/scheduler.js';
import { seedDemoData } from '../core/seed.js';

beforeEach(() => installMemoryStorage());

describe('bộ thẻ', () => {
  test('tạo, sửa, đọc lại', async () => {
    const deck = await repo.createDeck({ name: '  Tiếng Nhật  ' });
    assert.equal(deck.name, 'Tiếng Nhật');
    assert.equal(deck.newPerDay, 20);

    await repo.updateDeck(deck.id, { description: 'N5', newPerDay: 10 });
    const saved = await repo.getDeck(deck.id);
    assert.equal(saved.description, 'N5');
    assert.equal(saved.newPerDay, 10);
    assert.equal(saved.name, 'Tiếng Nhật');
  });

  test('tên trống hoặc số thẻ mới sai → ValidationError', async () => {
    await assert.rejects(repo.createDeck({ name: '   ' }), { name: 'ValidationError' });
    await assert.rejects(repo.createDeck({ name: 'A', newPerDay: -1 }), { name: 'ValidationError' });
  });

  test('xóa bộ → xóa thẻ, giữ lịch sử ôn', async () => {
    const deck = await repo.createDeck({ name: 'A' });
    const card = await repo.createCard({ deckId: deck.id, front: 'x', back: 'y' });
    await repo.reviewCard(card.id, Rating.GOOD);

    await repo.deleteDeck(deck.id);
    assert.equal(await repo.getDeck(deck.id), null);
    assert.equal((await repo.getCards()).length, 0);
    assert.equal((await repo.getReviewLogs()).length, 1);
  });
});

describe('thẻ', () => {
  test('tạo một thẻ và nhiều thẻ, giữ thứ tự', async () => {
    const deck = await repo.createDeck({ name: 'A' });
    await repo.createCard({ deckId: deck.id, front: 'một', back: '1' });
    await repo.createCards(deck.id, [
      { front: 'hai', back: '2' },
      { front: 'ba', back: '3' },
    ]);
    const fronts = (await repo.getCards(deck.id)).map((c) => c.front);
    assert.deepEqual(fronts, ['một', 'hai', 'ba']);
  });

  test('mặt trống hoặc bộ không tồn tại → lỗi', async () => {
    const deck = await repo.createDeck({ name: 'A' });
    await assert.rejects(repo.createCard({ deckId: deck.id, front: '', back: 'y' }), { name: 'ValidationError' });
    await assert.rejects(repo.createCard({ deckId: 'khong-co', front: 'x', back: 'y' }), { name: 'NotFoundError' });
    await assert.rejects(
      repo.createCards(deck.id, [{ front: 'ok', back: 'ok' }, { front: 'thiếu mặt sau', back: '' }]),
      { name: 'ValidationError' },
    );
    assert.equal((await repo.getCards(deck.id)).length, 0); // lượt lỗi không lưu thẻ nào
  });

  test('updateCard chỉ sửa nội dung, không đụng tiến độ', async () => {
    const deck = await repo.createDeck({ name: 'A' });
    const card = await repo.createCard({ deckId: deck.id, front: 'x', back: 'y' });
    const updated = await repo.updateCard(card.id, { front: 'x mới', state: 'review', interval: 99 });
    assert.equal(updated.front, 'x mới');
    assert.equal(updated.state, 'new');
    assert.equal(updated.interval, 0);
  });
});

describe('học', () => {
  test('reviewCard lưu thẻ + ghi log; undo khôi phục', async () => {
    const deck = await repo.createDeck({ name: 'A' });
    const card = await repo.createCard({ deckId: deck.id, front: 'x', back: 'y' });

    const { card: after, log, undo } = await repo.reviewCard(card.id, Rating.GOOD, { timeMs: 4200 });
    assert.equal(after.state, 'learning');
    assert.equal(log.prevState, 'new');
    assert.equal(log.timeMs, 4200);
    assert.equal((await repo.getCard(card.id)).state, 'learning');
    assert.equal((await repo.getReviewLogs()).length, 1);

    await undo();
    assert.equal((await repo.getCard(card.id)).state, 'new');
    assert.equal((await repo.getReviewLogs()).length, 0);
  });

  test('getStudyQueue tôn trọng giới hạn thẻ mới mỗi ngày', async () => {
    const deck = await repo.createDeck({ name: 'A', newPerDay: 2 });
    await repo.createCards(deck.id, [1, 2, 3].map((n) => ({ front: `q${n}`, back: `a${n}` })));

    let queue = await repo.getStudyQueue(deck.id);
    assert.deepEqual(queue.counts, { new: 2, learning: 0, review: 0 });
    assert.equal(queue.card.front, 'q1');

    await repo.reviewCard(queue.card.id, Rating.GOOD); // q1 → đang học (10 phút)
    queue = await repo.getStudyQueue(deck.id, { lastCardId: queue.card.id });
    assert.deepEqual(queue.counts, { new: 1, learning: 1, review: 0 });
    assert.equal(queue.card.front, 'q2');
  });

  test('getDeckOverview', async () => {
    const a = await repo.createDeck({ name: 'A' });
    await repo.createDeck({ name: 'B' });
    await repo.createCard({ deckId: a.id, front: 'x', back: 'y' });

    const overview = await repo.getDeckOverview();
    assert.deepEqual(overview.map((o) => [o.deck.name, o.total, o.due.new]), [['A', 1, 1], ['B', 0, 0]]);
  });
});

test('dữ liệu mẫu tạo được và hợp lệ', async () => {
  const now = Date.now();
  const result = await seedDemoData({ now });
  assert.equal(result.decks, 3);
  assert.ok(result.reviewLogs > 50, `chỉ có ${result.reviewLogs} lượt ôn`);

  const logs = await repo.getReviewLogs();
  assert.ok(logs.every((l) => l.reviewedAt <= now));
  const overview = await repo.getDeckOverview({ now });
  assert.equal(overview.length, 3);
  assert.equal(overview[2].due.new, 8); // bộ Lịch sử để nguyên chưa học
});

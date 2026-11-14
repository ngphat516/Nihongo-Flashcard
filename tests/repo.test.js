import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { installMemoryStorage } from './helpers/memory-storage.js';
import * as repo from '../core/repo.js';
import { DECK_COLORS } from '../core/models.js';
import { Rating } from '../core/scheduler.js';
import { seedDemoData } from '../core/seed.js';

let storage;
beforeEach(() => {
  storage = installMemoryStorage();
});

/** Bản ghi đúng như đang nằm trong localStorage (không qua repo). */
const raw = (collection) => JSON.parse(storage.getItem(`nholau:${collection}`) ?? '{}');
const putRaw = (collection, items) =>
  storage.setItem(`nholau:${collection}`, JSON.stringify(Object.fromEntries(items.map((item) => [item.id, item]))));

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
    const card = await repo.createCard({ deckId: deck.id, term: 'x', meaning: 'y' });
    await repo.reviewCard(card.id, Rating.GOOD);

    await repo.deleteDeck(deck.id);
    assert.equal(await repo.getDeck(deck.id), null);
    assert.equal((await repo.getCards()).length, 0);
    assert.equal((await repo.getReviewLogs()).length, 1);
  });
});

describe('màu bìa', () => {
  test('bộ mới lấy màu kế tiếp theo DECK_COLORS, hết 6 màu thì quay lại pink', async () => {
    const colors = [];
    for (let i = 0; i < 7; i++) colors.push((await repo.createDeck({ name: `Bộ ${i}` })).color);
    assert.deepEqual(colors, [...DECK_COLORS, 'pink']);
  });

  test('màu kế tiếp tính theo màu của bộ tạo gần nhất, kể cả khi bộ đó tự chọn màu', async () => {
    await repo.createDeck({ name: 'A' }); // pink
    assert.equal((await repo.createDeck({ name: 'B', color: 'sky' })).color, 'sky');
    assert.equal((await repo.createDeck({ name: 'C' })).color, 'lavender');
  });

  test('màu lạ → ValidationError, khi tạo và khi sửa', async () => {
    await assert.rejects(repo.createDeck({ name: 'A', color: 'red' }), { name: 'ValidationError' });
    const deck = await repo.createDeck({ name: 'A' });
    await assert.rejects(repo.updateDeck(deck.id, { color: '#ff0000' }), { name: 'ValidationError' });
    assert.equal((await repo.updateDeck(deck.id, { color: 'green' })).color, 'green');
    assert.equal((await repo.getDeck(deck.id)).color, 'green');
  });

  test('bộ cũ chưa có màu: đọc ra theo thứ tự (giống COVER_COLORS[i % 6]), chỉ ghi màu khi lưu lại bộ', async () => {
    const old = ['Một', 'Hai', 'Ba'].map((name, i) => ({
      id: `old-${i}`, name, description: '', newPerDay: 20, createdAt: 1000 + i, updatedAt: 1000 + i,
    }));
    putRaw('decks', [old[2], old[0], old[1]]); // thứ tự trong storage không quan trọng

    assert.deepEqual((await repo.getDecks()).map((d) => d.color), ['pink', 'peach', 'yellow']);
    assert.equal((await repo.getDeck('old-1')).color, 'peach');
    assert.deepEqual((await repo.getDeckOverview()).map((o) => o.deck.color), ['pink', 'peach', 'yellow']);
    assert.ok(Object.values(raw('decks')).every((d) => d.color === undefined), 'đọc thôi thì chưa ghi màu');

    await repo.updateDeck('old-1', { name: 'Hai mới' });
    assert.equal(raw('decks')['old-1'].color, 'peach');
    assert.equal(raw('decks')['old-0'].color, undefined);

    assert.equal((await repo.createDeck({ name: 'Bốn' })).color, 'green'); // kế tiếp sau yellow
  });
});

describe('thẻ', () => {
  test('tạo thẻ tiếng Nhật đủ trường; trường không bắt buộc mặc định rỗng', async () => {
    const deck = await repo.createDeck({ name: 'N5' });
    const full = await repo.createCard({
      deckId: deck.id, term: ' 約束[やくそく] ', meaning: 'lời hứa', reading: 'やくそく',
      example: '約束[やくそく]を守[まも]る。', jlpt: 'N4',
    });
    assert.equal(full.term, '約束[やくそく]');
    assert.equal(full.reading, 'やくそく');
    assert.equal(full.example, '約束[やくそく]を守[まも]る。');
    assert.equal(full.jlpt, 'N4');

    const short = await repo.createCard({ deckId: deck.id, term: 'すし', meaning: 'sushi' });
    assert.deepEqual([short.reading, short.example, short.jlpt], ['', '', '']);
  });

  test('tạo một thẻ và nhiều thẻ, giữ thứ tự', async () => {
    const deck = await repo.createDeck({ name: 'A' });
    await repo.createCard({ deckId: deck.id, term: 'một', meaning: '1' });
    await repo.createCards(deck.id, [
      { term: 'hai', meaning: '2' },
      { term: 'ba', meaning: '3', jlpt: 'N5' },
    ]);
    const cards = await repo.getCards(deck.id);
    assert.deepEqual(cards.map((c) => c.term), ['một', 'hai', 'ba']);
    assert.equal(cards[2].jlpt, 'N5');
  });

  test('từ hoặc nghĩa trống, jlpt sai, quá dài, bộ không tồn tại → lỗi', async () => {
    const deck = await repo.createDeck({ name: 'A' });
    const bad = [
      { term: '', meaning: 'y' },
      { term: 'x', meaning: '  ' },
      { term: 'x', meaning: 'y', jlpt: 'N6' },
      { term: 'x', meaning: 'y', jlpt: 'n5' },
      { term: 'x', meaning: 'y', reading: 'あ'.repeat(2001) },
      { term: 'x', meaning: 'y', example: 'あ'.repeat(2001) },
    ];
    for (const fields of bad) {
      await assert.rejects(repo.createCard({ deckId: deck.id, ...fields }), { name: 'ValidationError' }, JSON.stringify(fields).slice(0, 60));
    }
    await assert.rejects(repo.createCard({ deckId: 'khong-co', term: 'x', meaning: 'y' }), { name: 'NotFoundError' });
    await assert.rejects(
      repo.createCards(deck.id, [{ term: 'ok', meaning: 'ok' }, { term: 'thiếu nghĩa', meaning: '' }]),
      { name: 'ValidationError' },
    );
    assert.equal((await repo.getCards(deck.id)).length, 0); // lượt lỗi không lưu thẻ nào
  });

  test('updateCard chỉ sửa trường được gửi, không đụng tiến độ', async () => {
    const deck = await repo.createDeck({ name: 'A' });
    const card = await repo.createCard({ deckId: deck.id, term: '食[た]べる', meaning: 'ăn' });
    await repo.reviewCard(card.id, Rating.GOOD);
    const updated = await repo.updateCard(card.id, { reading: 'たべる', jlpt: 'N5', state: 'review', interval: 99 });
    assert.equal(updated.term, '食[た]べる');
    assert.equal(updated.reading, 'たべる');
    assert.equal(updated.jlpt, 'N5');
    assert.equal(updated.state, 'learning'); // từ lần chấm ở trên, không lấy từ input
    assert.equal(updated.interval, 0);
    await assert.rejects(repo.updateCard(card.id, { jlpt: 'N9' }), { name: 'ValidationError' });
  });
});

describe('lớp tương thích front/back (tạm, bỏ ở L6b)', () => {
  const oldCard = {
    id: 'old-card', deckId: 'deck-1', front: 'dependency', back: 'thư viện phụ thuộc',
    state: 'new', due: 0, interval: 0, ease: 0, step: 0, reps: 0, lapses: 0, lastReview: null,
    createdAt: 1, updatedAt: 1,
  };
  const oldDeck = { id: 'deck-1', name: 'Cũ', description: '', newPerDay: 20, createdAt: 1, updatedAt: 1 };

  test('đọc thẻ cũ: front → term, back → meaning; thẻ trả ra kèm front/back', async () => {
    putRaw('decks', [oldDeck]);
    putRaw('cards', [oldCard]);
    const [card] = await repo.getCards('deck-1');
    assert.equal(card.term, 'dependency');
    assert.equal(card.meaning, 'thư viện phụ thuộc');
    assert.deepEqual([card.reading, card.example, card.jlpt], ['', '', '']);
    assert.equal(card.front, 'dependency');
    assert.equal(card.back, 'thư viện phụ thuộc');
    assert.equal((await repo.getCard('old-card')).term, 'dependency');
    assert.equal((await repo.getStudyQueue('deck-1')).card.front, 'dependency');
  });

  test('ghi: nhận { front, back } như { term, meaning }, storage chỉ lưu trường mới', async () => {
    const deck = await repo.createDeck({ name: 'A' });
    const card = await repo.createCard({ deckId: deck.id, front: 'x', back: 'y' });
    assert.equal(card.term, 'x');
    assert.equal(card.front, 'x'); // trang cũ đọc tạm
    const [batch] = await repo.createCards(deck.id, [{ front: 'p', back: 'q' }]);
    await repo.updateCard(card.id, { back: 'y mới' });

    for (const stored of Object.values(raw('cards'))) {
      assert.ok(!('front' in stored) && !('back' in stored), `còn front/back: ${JSON.stringify(stored)}`);
    }
    assert.equal(raw('cards')[card.id].meaning, 'y mới');
    assert.equal(raw('cards')[batch.id].term, 'p');
  });

  test('có cả term lẫn front thì term thắng', async () => {
    const deck = await repo.createDeck({ name: 'A' });
    const card = await repo.createCard({ deckId: deck.id, term: 'term', front: 'front', meaning: 'm' });
    assert.equal(card.term, 'term');
  });

  test('thẻ cũ được lưu lại (sửa, chấm, hoàn tác, học lại) thì bỏ front/back', async () => {
    putRaw('decks', [oldDeck]);
    putRaw('cards', [oldCard]);
    const { undo } = await repo.reviewCard('old-card', Rating.GOOD);
    assert.equal(raw('cards')['old-card'].term, 'dependency');
    assert.ok(!('front' in raw('cards')['old-card']));
    await undo();
    assert.ok(!('front' in raw('cards')['old-card']));
    await repo.resetCard('old-card');
    assert.deepEqual(
      Object.keys(raw('cards')['old-card']).filter((k) => ['term', 'meaning', 'front', 'back'].includes(k)).sort(),
      ['meaning', 'term'],
    );
  });
});

describe('học', () => {
  test('reviewCard lưu thẻ + ghi log; undo khôi phục và trả về thẻ đã khôi phục (B3)', async () => {
    const deck = await repo.createDeck({ name: 'A' });
    const card = await repo.createCard({ deckId: deck.id, term: 'x', meaning: 'y' });

    const { card: after, log, undo } = await repo.reviewCard(card.id, Rating.GOOD, { timeMs: 4200 });
    assert.equal(after.state, 'learning');
    assert.equal(log.prevState, 'new');
    assert.equal(log.timeMs, 4200);
    assert.equal((await repo.getCard(card.id)).state, 'learning');
    assert.equal((await repo.getReviewLogs()).length, 1);

    const restored = await undo();
    assert.equal(restored.id, card.id);
    assert.equal(restored.state, 'new');
    assert.equal(restored.term, 'x');
    assert.equal((await repo.getCard(card.id)).state, 'new');
    assert.equal((await repo.getReviewLogs()).length, 0);
  });

  test('reviewCard ghi lượt ôn trước rồi mới ghi thẻ (B5)', async () => {
    const deck = await repo.createDeck({ name: 'A' });
    const card = await repo.createCard({ deckId: deck.id, term: 'x', meaning: 'y' });
    const writes = [];
    const setItem = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
      writes.push(key);
      setItem(key, value);
    };
    await repo.reviewCard(card.id, Rating.GOOD);
    assert.deepEqual(writes, ['nholau:reviewLogs', 'nholau:cards']);
  });

  test('getStudyQueue tôn trọng giới hạn thẻ mới mỗi ngày', async () => {
    const deck = await repo.createDeck({ name: 'A', newPerDay: 2 });
    await repo.createCards(deck.id, [1, 2, 3].map((n) => ({ term: `q${n}`, meaning: `a${n}` })));

    let queue = await repo.getStudyQueue(deck.id);
    assert.deepEqual(queue.counts, { new: 2, learning: 0, review: 0 });
    assert.equal(queue.card.term, 'q1');

    await repo.reviewCard(queue.card.id, Rating.GOOD); // q1 → đang học (10 phút)
    queue = await repo.getStudyQueue(deck.id, { lastCardId: queue.card.id });
    assert.deepEqual(queue.counts, { new: 1, learning: 1, review: 0 });
    assert.equal(queue.card.term, 'q2');
  });

  test('getDeckOverview', async () => {
    const a = await repo.createDeck({ name: 'A' });
    await repo.createDeck({ name: 'B' });
    await repo.createCard({ deckId: a.id, term: 'x', meaning: 'y' });

    const overview = await repo.getDeckOverview();
    assert.deepEqual(overview.map((o) => [o.deck.name, o.total, o.due.new, o.deck.color]), [['A', 1, 1, 'pink'], ['B', 0, 0, 'peach']]);
  });
});

describe('lỗi đã sửa', () => {
  test('B2: tạo bộ với số thẻ mới mỗi ngày bỏ trống → 20', async () => {
    for (const newPerDay of ['', '  ', null, undefined]) {
      assert.equal((await repo.createDeck({ name: 'A', newPerDay })).newPerDay, 20, JSON.stringify(newPerDay));
    }
    assert.equal((await repo.createDeck({ name: 'A', newPerDay: '0' })).newPerDay, 0); // 0 vẫn là số hợp lệ
  });

  test('B2: sửa bộ với số thẻ mới mỗi ngày bỏ trống → ValidationError, không thành 0', async () => {
    const deck = await repo.createDeck({ name: 'A', newPerDay: 15 });
    for (const newPerDay of ['', '   ', null]) {
      await assert.rejects(repo.updateDeck(deck.id, { newPerDay }), { name: 'ValidationError' }, JSON.stringify(newPerDay));
    }
    assert.equal((await repo.getDeck(deck.id)).newPerDay, 15);
  });

  test('B4: id trùng tên thuộc tính của Object → null', async () => {
    await repo.createDeck({ name: 'A' });
    for (const id of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
      assert.equal(await repo.getDeck(id), null, id);
      assert.equal(await repo.getCard(id), null, id);
    }
    await assert.rejects(repo.getStudyQueue('constructor'), { name: 'NotFoundError' });
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
  assert.deepEqual(overview.map((o) => o.deck.color), ['pink', 'peach', 'yellow']); // giống màu trước L6

  const stored = Object.values(raw('cards'));
  assert.ok(stored.every((c) => c.term && c.meaning && !('front' in c)), 'thẻ mẫu dùng trường mới');
  assert.equal((await repo.getCards(overview[0].deck.id))[0].term, 'algorithm');
});

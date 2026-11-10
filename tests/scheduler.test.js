import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, Rating, fuzzRange, previewRatings, schedule } from '../core/scheduler.js';
import { MINUTE, addDays, dayStart, formatDays } from '../core/date.js';

const NOW = new Date(2026, 10, 10, 9, 0).getTime(); // 9h sáng 10/11/2026 (giờ máy)
const noFuzz = { now: NOW, fuzz: false };
const daysFrom = (n, from = NOW) => addDays(dayStart(from), n);

function newCard(extra = {}) {
  return {
    id: 'card-1', deckId: 'deck-1', front: 'f', back: 'b',
    state: 'new', due: 0, interval: 0, ease: 0, step: 0, reps: 0, lapses: 0, lastReview: null,
    createdAt: 0, updatedAt: 0,
    ...extra,
  };
}

/** Thẻ đang ôn, đến hạn đúng hôm nay (hoặc trễ `lateDays` ngày). */
function reviewing(interval, ease = 2.5, lateDays = 0) {
  return newCard({ state: 'review', interval, ease, reps: 5, due: daysFrom(-lateDays) });
}

describe('thẻ mới', () => {
  test('Lại → bước đầu, 1 phút', () => {
    const c = schedule(newCard(), Rating.AGAIN, noFuzz);
    assert.equal(c.state, 'learning');
    assert.equal(c.step, 0);
    assert.equal(c.due, NOW + 1 * MINUTE);
    assert.equal(c.reps, 1);
  });

  test('Khó ở bước đầu → trung bình 2 bước đầu (5,5 phút)', () => {
    const c = schedule(newCard(), Rating.HARD, noFuzz);
    assert.equal(c.state, 'learning');
    assert.equal(c.due, NOW + 5.5 * MINUTE);
  });

  test('Tốt → bước 10 phút; Tốt lần nữa → tốt nghiệp với 1 ngày', () => {
    const a = schedule(newCard(), Rating.GOOD, noFuzz);
    assert.equal(a.state, 'learning');
    assert.equal(a.step, 1);
    assert.equal(a.due, NOW + 10 * MINUTE);

    const later = NOW + 10 * MINUTE;
    const b = schedule(a, Rating.GOOD, { now: later, fuzz: false });
    assert.equal(b.state, 'review');
    assert.equal(b.interval, 1);
    assert.equal(b.ease, 2.5);
    assert.equal(b.due, daysFrom(1, later));
  });

  test('Dễ → tốt nghiệp ngay với 4 ngày', () => {
    const c = schedule(newCard(), Rating.EASY, noFuzz);
    assert.equal(c.state, 'review');
    assert.equal(c.interval, 4);
    assert.equal(c.due, daysFrom(4));
  });

  test('đang ở bước 2: Khó → lặp lại bước đó, Lại → về bước đầu', () => {
    const card = newCard({ state: 'learning', step: 1, reps: 1, due: NOW });
    const hard = schedule(card, Rating.HARD, noFuzz);
    assert.equal(hard.step, 1);
    assert.equal(hard.due, NOW + 10 * MINUTE);

    const again = schedule(card, Rating.AGAIN, noFuzz);
    assert.equal(again.step, 0);
    assert.equal(again.due, NOW + 1 * MINUTE);
  });
});

describe('thẻ ôn tập', () => {
  test('đúng hạn, I = 10, E = 2.5: Khó 12, Tốt 25, Dễ 33 ngày', () => {
    const card = reviewing(10);
    const hard = schedule(card, Rating.HARD, noFuzz);
    const good = schedule(card, Rating.GOOD, noFuzz);
    const easy = schedule(card, Rating.EASY, noFuzz);

    assert.deepEqual([hard.interval, good.interval, easy.interval], [12, 25, 33]);
    assert.deepEqual([hard.ease, good.ease, easy.ease], [2.35, 2.5, 2.65]);
    assert.equal(good.due, daysFrom(25));
    assert.equal(good.state, 'review');
  });

  test('trễ 4 ngày: Tốt = (I + L/2) × E, Dễ = (I + L) × E × 1.3', () => {
    const card = reviewing(10, 2.5, 4);
    assert.equal(schedule(card, Rating.HARD, noFuzz).interval, 12);
    assert.equal(schedule(card, Rating.GOOD, noFuzz).interval, 30);
    assert.equal(schedule(card, Rating.EASY, noFuzz).interval, 46);
  });

  test('mỗi nút dài hơn nút trước ít nhất 1 ngày', () => {
    const card = reviewing(1);
    const intervals = [Rating.HARD, Rating.GOOD, Rating.EASY].map((r) => schedule(card, r, noFuzz).interval);
    assert.deepEqual(intervals, [2, 3, 4]);
  });

  test('Lại → học lại sau 10 phút, interval về 1, E − 0.2, lapses + 1', () => {
    const c = schedule(reviewing(10), Rating.AGAIN, noFuzz);
    assert.equal(c.state, 'relearning');
    assert.equal(c.step, 0);
    assert.equal(c.due, NOW + 10 * MINUTE);
    assert.equal(c.interval, 1);
    assert.equal(c.ease, 2.3);
    assert.equal(c.lapses, 1);
  });

  test('học lại xong: Tốt → ôn sau 1 ngày, Dễ → 2 ngày', () => {
    const lapsed = schedule(reviewing(10), Rating.AGAIN, noFuzz);
    const later = NOW + 10 * MINUTE;
    const good = schedule(lapsed, Rating.GOOD, { now: later, fuzz: false });
    assert.equal(good.state, 'review');
    assert.equal(good.interval, 1);
    assert.equal(good.due, daysFrom(1, later));
    assert.equal(good.ease, 2.3);

    const easy = schedule(lapsed, Rating.EASY, { now: later, fuzz: false });
    assert.equal(easy.interval, 2);
  });

  test('ease không xuống dưới 1.3', () => {
    assert.equal(schedule(reviewing(10, 1.35), Rating.AGAIN, noFuzz).ease, 1.3);
    assert.equal(schedule(reviewing(10, 1.3), Rating.HARD, noFuzz).ease, 1.3);
  });

  test('interval không vượt quá maxInterval', () => {
    const c = schedule(reviewing(30000), Rating.EASY, noFuzz);
    assert.equal(c.interval, DEFAULT_CONFIG.maxInterval);
  });
});

describe('fuzz', () => {
  test('khoảng fuzz giống Anki', () => {
    assert.deepEqual(fuzzRange(1), [1, 1]);
    assert.deepEqual(fuzzRange(2), [2, 2]);
    assert.deepEqual(fuzzRange(4), [3, 5]);
    assert.deepEqual(fuzzRange(25), [22, 28]); // delta = 1 + 0.15×4.5 + 0.1×13 + 0.05×5 = 3.225
    assert.deepEqual(fuzzRange(100), [93, 107]);
  });

  test('interval sau fuzz nằm trong khoảng', () => {
    const card = reviewing(10); // Tốt → 25 trước fuzz → [22, 28]
    assert.equal(schedule(card, Rating.GOOD, { now: NOW, random: () => 0 }).interval, 22);
    assert.equal(schedule(card, Rating.GOOD, { now: NOW, random: () => 0.9999 }).interval, 28);
  });

  test('cùng thẻ, cùng số lần ôn → cùng kết quả, nên nút hiện đúng số ngày', () => {
    const card = reviewing(10);
    const a = schedule(card, Rating.GOOD, { now: NOW });
    const b = schedule(card, Rating.GOOD, { now: NOW + 5 * MINUTE });
    assert.equal(a.interval, b.interval);
    assert.equal(previewRatings(card, { now: NOW })[Rating.GOOD].label, formatDays(a.interval));
  });
});

describe('khác', () => {
  test('không sửa thẻ truyền vào', () => {
    const card = Object.freeze(newCard());
    schedule(card, Rating.GOOD, noFuzz);
    assert.equal(card.state, 'new');
  });

  test('rating sai → báo lỗi', () => {
    assert.throws(() => schedule(newCard(), 5), RangeError);
    assert.throws(() => schedule(newCard(), 0), RangeError);
  });

  test('previewRatings cho thẻ mới', () => {
    const p = previewRatings(newCard(), { now: NOW });
    assert.equal(p[1].label, '1 phút');
    assert.equal(p[2].label, '6 phút');
    assert.equal(p[3].label, '10 phút');
    assert.match(p[4].label, /^[345] ngày$/); // 4 ngày ± fuzz
  });
});

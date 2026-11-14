import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { countDue, describeDue, newCardsLeft, nextLearningDue, pickNextCard } from '../core/queue.js';
import { MINUTE, addDays, dayKey, dayStart, daysBetween, formatDays, formatSpan } from '../core/date.js';

const NOW = new Date(2026, 10, 10, 9, 0).getTime();

const card = (id, state, due, createdAt = 0) => ({ id, state, due, createdAt });

describe('pickNextCard', () => {
  const cards = [
    card('new-1', 'new', 0, 1),
    card('new-2', 'new', 0, 2),
    card('review-due', 'review', dayStart(NOW)),
    card('review-later', 'review', addDays(dayStart(NOW), 3)),
    card('learning-due', 'learning', NOW - MINUTE),
    card('learning-soon', 'learning', NOW + 5 * MINUTE),
  ];

  test('thứ tự: đang học đến giờ → ôn đến hạn → mới → đang học sắp đến giờ', () => {
    assert.equal(pickNextCard(cards, { now: NOW }).id, 'learning-due');

    const noLearningDue = cards.filter((c) => c.id !== 'learning-due');
    assert.equal(pickNextCard(noLearningDue, { now: NOW }).id, 'review-due');

    const onlyNewAndSoon = noLearningDue.filter((c) => c.id !== 'review-due');
    assert.equal(pickNextCard(onlyNewAndSoon, { now: NOW }).id, 'new-1');
    assert.equal(pickNextCard(onlyNewAndSoon, { now: NOW, newLeft: 0 }).id, 'learning-soon');
  });

  test('không lặp lại ngay thẻ vừa chấm', () => {
    const only = [card('learning-soon', 'learning', NOW + 5 * MINUTE)];
    assert.equal(pickNextCard(only, { now: NOW, lastCardId: 'learning-soon' }), null);
    assert.equal(nextLearningDue(only), NOW + 5 * MINUTE);
  });

  test('hết thẻ → null', () => {
    assert.equal(pickNextCard([card('review-later', 'review', addDays(dayStart(NOW), 3))], { now: NOW }), null);
  });
});

describe('đếm thẻ', () => {
  test('countDue giới hạn thẻ mới theo newLeft', () => {
    const cards = [
      card('a', 'new', 0), card('b', 'new', 0), card('c', 'new', 0),
      card('d', 'review', dayStart(NOW)),
      card('e', 'relearning', NOW + 10 * MINUTE),
      card('f', 'learning', NOW + 60 * MINUTE), // quá 20 phút → chưa tính
    ];
    assert.deepEqual(countDue(cards, { now: NOW, newLeft: 2 }), { new: 2, learning: 1, review: 1 });
  });

  test('newCardsLeft chỉ tính thẻ mới đã học trong ngày học hiện tại', () => {
    const deck = { id: 'd1', newPerDay: 5 };
    const logs = [
      { deckId: 'd1', prevState: 'new', reviewedAt: NOW - 30 * MINUTE },
      { deckId: 'd1', prevState: 'new', reviewedAt: NOW - 60 * MINUTE },
      { deckId: 'd1', prevState: 'learning', reviewedAt: NOW - 20 * MINUTE }, // không phải thẻ mới
      { deckId: 'd1', prevState: 'new', reviewedAt: addDays(NOW, -1) }, // hôm qua
      { deckId: 'd2', prevState: 'new', reviewedAt: NOW - 10 * MINUTE }, // bộ khác
    ];
    assert.equal(newCardsLeft(deck, logs, NOW), 3);
  });

  test('describeDue', () => {
    assert.equal(describeDue(card('a', 'new', 0), NOW), 'Chưa học');
    assert.equal(describeDue(card('a', 'review', dayStart(NOW)), NOW), 'Đến hạn');
    assert.equal(describeDue(card('a', 'learning', NOW + 10 * MINUTE), NOW), 'Sau 10 phút');
    assert.equal(describeDue(card('a', 'review', addDays(dayStart(NOW), 1)), NOW), 'Ngày mai');
    assert.equal(describeDue(card('a', 'review', addDays(dayStart(NOW), 5)), NOW), 'Sau 5 ngày');
  });
});

describe('ngày học bắt đầu lúc 4h sáng', () => {
  test('3h sáng vẫn thuộc ngày hôm trước', () => {
    assert.equal(dayKey(new Date(2026, 10, 11, 3, 59).getTime()), '2026-11-10');
    assert.equal(dayKey(new Date(2026, 10, 11, 4, 0).getTime()), '2026-11-11');
  });

  test('daysBetween đếm theo ngày học', () => {
    const lateNight = new Date(2026, 10, 10, 23, 0).getTime();
    assert.equal(daysBetween(lateNight, new Date(2026, 10, 11, 3, 59).getTime()), 0);
    assert.equal(daysBetween(lateNight, new Date(2026, 10, 11, 4, 0).getTime()), 1);
  });

  test('định dạng khoảng thời gian', () => {
    assert.equal(formatSpan(30 * 1000), '<1 phút');
    assert.equal(formatSpan(10 * MINUTE), '10 phút');
    assert.equal(formatSpan(90 * MINUTE), '1,5 giờ');
    assert.equal(formatDays(1), '1 ngày');
    assert.equal(formatDays(45), '1,5 tháng');
    assert.equal(formatDays(400), '1,1 năm');
  });

  test('B5: ranh giới phút/giờ/ngày không hiện "60 phút" hay "24 giờ"', () => {
    assert.equal(formatSpan(59.4 * MINUTE), '59 phút');
    assert.equal(formatSpan(59.6 * MINUTE), '1 giờ');
    assert.equal(formatSpan(60 * MINUTE), '1 giờ');
    assert.equal(formatSpan(23.9 * 60 * MINUTE), '23,9 giờ');
    assert.equal(formatSpan(23.97 * 60 * MINUTE), '1 ngày');
    assert.equal(formatSpan(24 * 60 * MINUTE), '1 ngày');
  });
});

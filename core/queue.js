/**
 * Chọn thẻ để học và đếm số thẻ cần học. Hàm thuần — test ở tests/queue.test.js.
 *
 * Thứ tự trong một buổi học (giống Anki):
 *   1. Thẻ đang học (learning/relearning) đã đến giờ
 *   2. Thẻ ôn tập đến hạn hôm nay
 *   3. Thẻ mới (tối đa deck.newPerDay thẻ mỗi ngày)
 *   4. Hết thẻ thì cho học trước thẻ đang học sắp đến giờ (trong vòng 20 phút),
 *      nhưng không lặp lại ngay thẻ vừa chấm.
 */
import { MINUTE, dayStart, daysBetween, formatSpan, formatDays } from './date.js';

export const LEARN_AHEAD_MS = 20 * MINUTE;

export const STATE_LABELS = Object.freeze({
  new: 'Mới',
  learning: 'Đang học',
  relearning: 'Học lại',
  review: 'Ôn tập',
});

export const isLearning = (card) => card.state === 'learning' || card.state === 'relearning';

const byDue = (a, b) => a.due - b.due;
const byCreated = (a, b) => a.createdAt - b.createdAt;

/** Hôm nay bộ này còn được học bao nhiêu thẻ mới (dựa vào log của ngày học hiện tại). */
export function newCardsLeft(deck, logs, now = Date.now()) {
  const start = dayStart(now);
  const studied = logs.filter(
    (log) => log.deckId === deck.id && log.prevState === 'new' && log.reviewedAt >= start && log.reviewedAt <= now,
  ).length;
  return Math.max(0, deck.newPerDay - studied);
}

/**
 * Đếm số thẻ cần học ngay — 3 con số hiện trên đầu trang học.
 * @returns {{ new: number, learning: number, review: number }}
 */
export function countDue(cards, { now = Date.now(), newLeft = Infinity } = {}) {
  let fresh = 0;
  let learning = 0;
  let review = 0;
  for (const card of cards) {
    if (card.state === 'new') fresh++;
    else if (isLearning(card)) {
      if (card.due <= now + LEARN_AHEAD_MS) learning++;
    } else if (card.state === 'review' && card.due <= now) review++;
  }
  return { new: Math.min(fresh, newLeft), learning, review };
}

/** Thẻ tiếp theo cần học, hoặc null nếu đã học xong. */
export function pickNextCard(cards, { now = Date.now(), newLeft = Infinity, lastCardId = null } = {}) {
  const learningNow = cards.filter((c) => isLearning(c) && c.due <= now).sort(byDue);
  if (learningNow.length) return learningNow[0];

  const reviews = cards.filter((c) => c.state === 'review' && c.due <= now).sort(byDue);
  if (reviews.length) return reviews[0];

  if (newLeft > 0) {
    const fresh = cards.filter((c) => c.state === 'new').sort(byCreated);
    if (fresh.length) return fresh[0];
  }

  const ahead = cards
    .filter((c) => isLearning(c) && c.due <= now + LEARN_AHEAD_MS && c.id !== lastCardId)
    .sort(byDue);
  return ahead[0] ?? null;
}

/** Thời điểm sớm nhất có thẻ đang học đến giờ (để hiện "Quay lại lúc 14:32"), hoặc null. */
export function nextLearningDue(cards) {
  const dues = cards.filter(isLearning).map((c) => c.due);
  return dues.length ? Math.min(...dues) : null;
}

/** Mô tả hạn ôn của thẻ: "Chưa học", "Đến hạn", "Sau 10 phút", "Ngày mai", "Sau 5 ngày". */
export function describeDue(card, now = Date.now()) {
  if (card.state === 'new') return 'Chưa học';
  if (card.due <= now) return 'Đến hạn';
  const days = daysBetween(now, card.due);
  if (days === 0) return `Sau ${formatSpan(card.due - now)}`;
  if (days === 1) return 'Ngày mai';
  return `Sau ${formatDays(days)}`;
}

/**
 * Định nghĩa dữ liệu của app. Mọi object lưu xuống localStorage đều được tạo qua các hàm ở đây,
 * nên đây cũng là "bản thiết kế database" khi làm backend sau này (3 bảng: decks, cards, reviewLogs).
 */

/** Tên các "bảng" trong localStorage. */
export const COLLECTIONS = Object.freeze({
  decks: 'decks',
  cards: 'cards',
  reviewLogs: 'reviewLogs',
});

export const LIMITS = Object.freeze({
  deckName: 80,
  deckDescription: 300,
  cardText: 2000,
  newPerDayMax: 999,
});

/**
 * Bộ thẻ (album).
 * @typedef {Object} Deck
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {number} newPerDay   số thẻ mới tối đa được học mỗi ngày
 * @property {number} createdAt   timestamp (ms)
 * @property {number} updatedAt   timestamp (ms)
 */

/**
 * @typedef {'new'|'learning'|'review'|'relearning'} CardState
 *   new: chưa học · learning: đang học lần đầu · review: đang ôn · relearning: quên, đang học lại
 */

/**
 * Một flashcard.
 * @typedef {Object} Card
 * @property {string} id
 * @property {string} deckId
 * @property {string} front       mặt trước (câu hỏi)
 * @property {string} back        mặt sau (đáp án)
 * @property {CardState} state
 * @property {number} due         thời điểm đến hạn ôn (ms). Thẻ mới: 0
 * @property {number} interval    số ngày giữa 2 lần ôn
 * @property {number} ease        hệ số dễ (2.5 = 250%). Thẻ mới: 0
 * @property {number} step        đang ở bước học thứ mấy (thẻ learning/relearning)
 * @property {number} reps        tổng số lần đã chấm điểm
 * @property {number} lapses      số lần quên (bấm "Lại" khi đang ôn)
 * @property {number|null} lastReview
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * Một lần chấm điểm. Dùng cho heatmap, thống kê và hoàn tác.
 * @typedef {Object} ReviewLog
 * @property {string} id
 * @property {string} cardId
 * @property {string} deckId
 * @property {1|2|3|4} rating     Lại / Khó / Tốt / Dễ
 * @property {CardState} prevState
 * @property {number} prevInterval
 * @property {number} newInterval
 * @property {number} prevEase
 * @property {number} reviewedAt  timestamp (ms)
 * @property {number} timeMs      thời gian suy nghĩ trước khi chấm (ms)
 */

/** Lỗi do dữ liệu người dùng nhập — hiện `err.message` cho người dùng xem được. */
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** Không tìm thấy bộ thẻ / thẻ (VD: id trong URL sai). */
export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/** Cắt khoảng trắng 2 đầu + chuẩn hóa Unicode (gõ tiếng Việt trên Mac đôi khi ra dạng tổ hợp). */
export function cleanText(value) {
  return String(value ?? '').normalize('NFC').trim();
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  // randomUUID chỉ có trên https/localhost; mở qua IP mạng LAN (test trên điện thoại) thì dùng cách này.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** @returns {Deck} */
export function makeDeck({ name, description = '', newPerDay = 20 } = {}, now = Date.now()) {
  const deck = {
    id: newId(),
    name: cleanText(name),
    description: cleanText(description),
    newPerDay: Number(newPerDay),
    createdAt: now,
    updatedAt: now,
  };
  validateDeck(deck);
  return deck;
}

export function validateDeck(deck) {
  if (!deck.name) throw new ValidationError('Tên bộ thẻ không được để trống.');
  if (deck.name.length > LIMITS.deckName) {
    throw new ValidationError(`Tên bộ thẻ tối đa ${LIMITS.deckName} ký tự.`);
  }
  if (deck.description.length > LIMITS.deckDescription) {
    throw new ValidationError(`Mô tả tối đa ${LIMITS.deckDescription} ký tự.`);
  }
  const n = deck.newPerDay;
  if (!Number.isInteger(n) || n < 0 || n > LIMITS.newPerDayMax) {
    throw new ValidationError(`Số thẻ mới mỗi ngày phải là số nguyên từ 0 đến ${LIMITS.newPerDayMax}.`);
  }
}

/** @returns {Card} */
export function makeCard({ deckId, front, back } = {}, now = Date.now()) {
  const card = {
    id: newId(),
    deckId,
    front: cleanText(front),
    back: cleanText(back),
    ...NEW_CARD_PROGRESS,
    createdAt: now,
    updatedAt: now,
  };
  validateCard(card);
  return card;
}

export function validateCard(card) {
  if (!card.deckId) throw new ValidationError('Thẻ phải thuộc một bộ thẻ.');
  if (!card.front) throw new ValidationError('Mặt trước không được để trống.');
  if (!card.back) throw new ValidationError('Mặt sau không được để trống.');
  if (card.front.length > LIMITS.cardText || card.back.length > LIMITS.cardText) {
    throw new ValidationError(`Mỗi mặt thẻ tối đa ${LIMITS.cardText} ký tự.`);
  }
}

/** Các trường lịch ôn của một thẻ chưa học. */
export const NEW_CARD_PROGRESS = Object.freeze({
  state: 'new',
  due: 0,
  interval: 0,
  ease: 0,
  step: 0,
  reps: 0,
  lapses: 0,
  lastReview: null,
});

/** Đưa thẻ về trạng thái chưa học (giữ nguyên nội dung). */
export function resetProgress(card, now = Date.now()) {
  return { ...card, ...NEW_CARD_PROGRESS, updatedAt: now };
}

/** @returns {ReviewLog} */
export function makeReviewLog({ before, after, rating, now = Date.now(), timeMs = 0 }) {
  return {
    id: newId(),
    cardId: before.id,
    deckId: before.deckId,
    rating,
    prevState: before.state,
    prevInterval: before.interval,
    newInterval: after.interval,
    prevEase: before.ease,
    reviewedAt: now,
    timeMs: Math.max(0, Math.round(timeMs)),
  };
}

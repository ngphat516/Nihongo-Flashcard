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
  cardText: 2000, // mỗi trường chữ của thẻ
  newPerDayMax: 999,
});

/** 6 màu bìa, theo thứ tự bộ mới lấy màu (docs/design.md › Màu bìa bộ thẻ). Lưu tên màu, không lưu mã màu. */
export const DECK_COLORS = Object.freeze(['pink', 'peach', 'yellow', 'green', 'sky', 'lavender']);

/** Chiều học của bộ: 'ja-vi' Nhật → Việt (mặc định), 'vi-ja' Việt → Nhật. Lịch ôn dùng chung cho cả 2 chiều. */
export const DECK_DIRECTIONS = Object.freeze(['ja-vi', 'vi-ja']);

/** Số thẻ mới mỗi ngày khi tạo bộ mà không ghi số. */
export const DEFAULT_NEW_PER_DAY = 20;

/**
 * Bộ thẻ (album).
 * @typedef {Object} Deck
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {number} newPerDay   số thẻ mới tối đa được học mỗi ngày
 * @property {string} color       màu bìa, một trong DECK_COLORS
 * @property {string} direction   chiều học, một trong DECK_DIRECTIONS: 'ja-vi' mặt trước là từ (mặc định),
 *                                'vi-ja' mặt trước là nghĩa. Tiến độ SM-2 của thẻ dùng chung cho cả 2 chiều
 * @property {number} createdAt   timestamp (ms)
 * @property {number} updatedAt   timestamp (ms)
 */

/**
 * @typedef {'new'|'learning'|'review'|'relearning'} CardState
 *   new: chưa học · learning: đang học lần đầu · review: đang ôn · relearning: quên, đang học lại
 */

/**
 * Một flashcard tiếng Nhật.
 * Cú pháp furigana trong `term` và `example`: 漢字[かんじ] (xem core/furigana.js).
 * @typedef {Object} Card
 * @property {string} id
 * @property {string} deckId
 * @property {string} term        từ, bắt buộc. VD '約束[やくそく]'
 * @property {string} meaning     nghĩa tiếng Việt, bắt buộc
 * @property {string} reading     cách đọc bằng kana, '' nếu không ghi
 * @property {string} example     câu ví dụ, '' nếu không ghi
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

/** Khi đã đăng nhập: bản ghi đã bị sửa ở máy khác sau lần đọc gần nhất (server trả 409). */
export class ConflictError extends Error {
  constructor(message = 'Dữ liệu đã được sửa ở máy khác, hãy tải lại trang.') {
    super(message);
    this.name = 'ConflictError';
  }
}

/** Khi đã đăng nhập: phiên hết hạn hoặc đã đăng xuất ở nơi khác (server trả 401). */
export class AuthError extends Error {
  constructor(message = 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.') {
    super(message);
    this.name = 'AuthError';
  }
}

/** Không gọi được máy chủ (mất mạng, server tắt) hoặc server báo lỗi không rõ. */
export class NetworkError extends Error {
  constructor(message = 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** Cắt khoảng trắng 2 đầu + chuẩn hóa Unicode (gõ tiếng Việt trên Mac đôi khi ra dạng tổ hợp). */
export function cleanText(value) {
  return String(value ?? '').normalize('NFC').trim();
}

/** '', chỉ có khoảng trắng, null, undefined. */
export const isBlank = (value) => cleanText(value) === '';

export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  // randomUUID chỉ có trên https/localhost; mở qua IP mạng LAN (test trên điện thoại) thì dùng cách này.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Bộ thẻ mới. `newPerDay` bỏ trống ('', null, undefined) thì lấy DEFAULT_NEW_PER_DAY.
 * `color` bỏ trống thì lấy màu đầu tiên; repo.createDeck tự chọn màu kế tiếp trước khi gọi hàm này.
 * `direction` không truyền thì 'ja-vi'.
 * @returns {Deck}
 */
export function makeDeck({ name, description = '', newPerDay, color, direction = DECK_DIRECTIONS[0] } = {}, now = Date.now()) {
  const deck = {
    id: newId(),
    name: cleanText(name),
    description: cleanText(description),
    newPerDay: isBlank(newPerDay) ? DEFAULT_NEW_PER_DAY : Number(newPerDay),
    color: color ?? DECK_COLORS[0],
    direction,
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
  if (!DECK_COLORS.includes(deck.color)) {
    throw new ValidationError(`Màu bìa phải là một trong: ${DECK_COLORS.join(', ')}.`);
  }
  if (!DECK_DIRECTIONS.includes(deck.direction)) {
    throw new ValidationError(`Chiều học phải là một trong: ${DECK_DIRECTIONS.join(', ')}.`);
  }
}

/** Các trường nội dung của thẻ (không gồm id, deckId, tiến độ học). */
export const CARD_FIELDS = Object.freeze(['term', 'meaning', 'reading', 'example']);

/** @returns {Card} */
export function makeCard({ deckId, term, meaning, reading = '', example = '' } = {}, now = Date.now()) {
  const card = {
    id: newId(),
    deckId,
    term: cleanText(term),
    meaning: cleanText(meaning),
    reading: cleanText(reading),
    example: cleanText(example),
    ...NEW_CARD_PROGRESS,
    createdAt: now,
    updatedAt: now,
  };
  validateCard(card);
  return card;
}

export function validateCard(card) {
  if (!card.deckId) throw new ValidationError('Thẻ phải thuộc một bộ thẻ.');
  if (!card.term) throw new ValidationError('Từ không được để trống.');
  if (!card.meaning) throw new ValidationError('Nghĩa không được để trống.');
  if (CARD_FIELDS.some((field) => card[field].length > LIMITS.cardText)) {
    throw new ValidationError(`Mỗi ô của thẻ tối đa ${LIMITS.cardText} ký tự.`);
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

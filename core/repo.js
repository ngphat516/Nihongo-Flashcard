/**
 * API dữ liệu cho các trang — trang nào cần đọc/ghi dữ liệu thì import từ ĐÂY.
 * Không gọi localStorage hay storage.js trực tiếp trong trang.
 *
 * Mọi hàm đều async: luôn dùng `await`.
 * Lỗi do người dùng nhập sai → ValidationError (hiện err.message cho người dùng).
 * Id không tồn tại → NotFoundError.
 */
import * as storage from './storage.js';
import {
  CARD_FIELDS,
  COLLECTIONS,
  DECK_COLORS,
  NotFoundError,
  ValidationError,
  cleanText,
  isBlank,
  makeCard,
  makeDeck,
  makeReviewLog,
  resetProgress,
  validateCard,
  validateDeck,
} from './models.js';
import { readCard, writeCard } from './card-compat.js'; // TẠM, bỏ ở L6b
import { schedule } from './scheduler.js';
import { dayStart } from './date.js';
import { countDue, newCardsLeft, nextLearningDue, pickNextCard } from './queue.js';

const { decks: DECKS, cards: CARDS, reviewLogs: LOGS } = COLLECTIONS;
const byCreated = (a, b) => a.createdAt - b.createdAt;

// ============================== Bộ thẻ ==============================

/** Mọi bộ thẻ, cũ trước mới sau. */
export async function getDecks() {
  return withColors((await storage.list(DECKS)).sort(byCreated));
}

/** Một bộ thẻ theo id, hoặc null. */
export async function getDeck(id) {
  return (await getDecks()).find((deck) => deck.id === id) ?? null;
}

/**
 * Tạo bộ mới. `newPerDay` bỏ trống thì 20.
 * `color` bỏ trống thì lấy màu kế tiếp sau màu của bộ tạo gần nhất (chưa có bộ nào thì 'pink').
 */
export async function createDeck({ name, description, newPerDay, color } = {}) {
  const last = (await getDecks()).at(-1);
  const nextColor = last ? DECK_COLORS[(DECK_COLORS.indexOf(last.color) + 1) % DECK_COLORS.length] : DECK_COLORS[0];
  return storage.put(DECKS, makeDeck({ name, description, newPerDay, color: isBlank(color) ? nextColor : color }));
}

/** Sửa tên / mô tả / số thẻ mới mỗi ngày / màu bìa. Chỉ truyền trường cần đổi. */
export async function updateDeck(id, { name, description, newPerDay, color } = {}) {
  const deck = await requireDeck(id);
  const next = { ...deck, updatedAt: Date.now() };
  if (name !== undefined) next.name = cleanText(name);
  if (description !== undefined) next.description = cleanText(description);
  if (newPerDay !== undefined) {
    // Number('') === 0 sẽ âm thầm tắt thẻ mới của bộ (lỗi B2), nên ô trống là lỗi
    if (isBlank(newPerDay)) throw new ValidationError('Số thẻ mới mỗi ngày không được để trống.');
    next.newPerDay = Number(newPerDay);
  }
  if (color !== undefined) next.color = color;
  validateDeck(next);
  return storage.put(DECKS, next);
}

/**
 * Xóa bộ và toàn bộ thẻ trong bộ.
 * Lịch sử ôn (reviewLogs) được GIỮ LẠI để heatmap / chuỗi ngày học không bị mất.
 */
export async function deleteDeck(id) {
  const cards = await getCards(id);
  await storage.removeMany(CARDS, cards.map((c) => c.id));
  await storage.remove(DECKS, id);
}

// =============================== Thẻ ================================

/** Thẻ của một bộ (hoặc mọi thẻ nếu không truyền deckId), cũ trước mới sau. */
export async function getCards(deckId) {
  const cards = (await storage.list(CARDS)).map(readCard);
  return (deckId ? cards.filter((c) => c.deckId === deckId) : cards).sort(byCreated);
}

export async function getCard(id) {
  return readCard(await storage.get(CARDS, id));
}

/** Thêm một thẻ vào bộ: { deckId, term, meaning, reading?, example?, jlpt? }. */
export async function createCard(input = {}) {
  const { deckId, ...fields } = writeCard(input);
  await requireDeck(deckId);
  return readCard(await storage.put(CARDS, makeCard({ ...fields, deckId })));
}

/**
 * Thêm nhiều thẻ một lần (nhập hàng loạt). Thẻ nào sai thì cả lượt không lưu (ném ValidationError).
 * @param {string} deckId
 * @param {{ term: string, meaning: string, reading?: string, example?: string, jlpt?: string }[]} items
 */
export async function createCards(deckId, items) {
  await requireDeck(deckId);
  const now = Date.now();
  const cards = items.map((item, i) => makeCard({ ...writeCard(item), deckId }, now + i));
  await storage.putMany(CARDS, cards);
  return cards.map(readCard);
}

/** Sửa nội dung thẻ: chỉ truyền trường cần đổi (term, meaning, reading, example, jlpt). Tiến độ học giữ nguyên. */
export async function updateCard(id, input = {}) {
  const card = await requireCard(id);
  const fields = writeCard(input);
  const next = { ...writeCard(card), updatedAt: Date.now() };
  for (const field of CARD_FIELDS) {
    if (fields[field] !== undefined) next[field] = cleanText(fields[field]);
  }
  validateCard(next);
  return readCard(await storage.put(CARDS, next));
}

export async function deleteCard(id) {
  await storage.remove(CARDS, id);
}

/** Cho thẻ học lại từ đầu (về trạng thái Mới). */
export async function resetCard(id) {
  const card = await requireCard(id);
  return readCard(await storage.put(CARDS, writeCard(resetProgress(card))));
}

// ============================== Học & ôn =============================

/**
 * Mọi thứ trang Học cần cho bước tiếp theo.
 * Gọi lại sau MỖI lần chấm điểm để lấy thẻ kế tiếp.
 *
 * @param {string} deckId
 * @param {{ now?: number, lastCardId?: string|null }} [options]
 *        lastCardId: id thẻ vừa chấm — để không hiện lại ngay thẻ đó.
 * @returns {Promise<{
 *   deck: object,
 *   card: object|null,          thẻ cần hiện (null = đã học xong)
 *   counts: { new: number, learning: number, review: number },
 *   nextLearningAt: number|null thẻ đang học sớm nhất đến giờ lúc nào (cho màn "Quay lại lúc...")
 * }>}
 */
export async function getStudyQueue(deckId, { now = Date.now(), lastCardId = null } = {}) {
  const deck = await requireDeck(deckId);
  const [cards, todayLogs] = await Promise.all([
    getCards(deckId),
    getReviewLogs({ deckId, from: dayStart(now) }),
  ]);
  const newLeft = newCardsLeft(deck, todayLogs, now);
  return {
    deck,
    card: pickNextCard(cards, { now, newLeft, lastCardId }),
    counts: countDue(cards, { now, newLeft }),
    nextLearningAt: nextLearningDue(cards),
  };
}

/**
 * Chấm điểm một thẻ: tính lịch mới bằng SM-2, lưu thẻ và ghi ReviewLog.
 *
 * @param {string} cardId
 * @param {1|2|3|4} rating   Lại / Khó / Tốt / Dễ (xem Rating trong scheduler.js)
 * @param {{ now?: number, timeMs?: number }} [options] timeMs: thời gian từ lúc hiện thẻ đến lúc chấm
 * @returns {Promise<{ card: object, log: object, undo: () => Promise<object> }>}
 *          gọi `await undo()` để hoàn tác lần chấm này; undo trả về thẻ đã khôi phục,
 *          để trang Học hiện lại đúng thẻ đó (không hỏi lại getStudyQueue).
 */
export async function reviewCard(cardId, rating, { now = Date.now(), timeMs = 0 } = {}) {
  const before = await requireCard(cardId);
  const after = { ...schedule(before, rating, { now }), updatedAt: now };
  const log = makeReviewLog({ before, after, rating, now, timeMs });
  // Ghi lượt ôn trước: ghi thẻ có lỗi (VD bộ nhớ đầy) thì thẻ giữ lịch cũ, không mất dấu lượt ôn
  await storage.put(LOGS, log);
  await storage.put(CARDS, writeCard(after));
  return {
    card: after,
    log,
    undo: async () => {
      await storage.put(CARDS, writeCard(before));
      await storage.remove(LOGS, log.id);
      return before;
    },
  };
}

/**
 * Lịch sử chấm điểm, cũ trước mới sau.
 * @param {{ deckId?: string, from?: number, to?: number }} [filter] khoảng thời gian [from, to)
 */
export async function getReviewLogs({ deckId, from = 0, to = Infinity } = {}) {
  const logs = await storage.list(LOGS);
  return logs
    .filter((l) => (!deckId || l.deckId === deckId) && l.reviewedAt >= from && l.reviewedAt < to)
    .sort((a, b) => a.reviewedAt - b.reviewedAt);
}

/**
 * Tổng quan từng bộ: tổng số thẻ và số thẻ cần học hôm nay. Dùng cho Trang chủ, Album, chọn bộ ở trang Học.
 * @returns {Promise<Array<{ deck: object, total: number, due: { new: number, learning: number, review: number } }>>}
 */
export async function getDeckOverview({ now = Date.now() } = {}) {
  const [decks, cards, todayLogs] = await Promise.all([
    getDecks(),
    storage.list(CARDS),
    getReviewLogs({ from: dayStart(now) }),
  ]);
  return decks.map((deck) => {
    const deckCards = cards.filter((c) => c.deckId === deck.id);
    const newLeft = newCardsLeft(deck, todayLogs, now);
    return { deck, total: deckCards.length, due: countDue(deckCards, { now, newLeft }) };
  });
}

// ============================== Nội bộ ==============================

/**
 * Bộ cũ (tạo trước L6) chưa có màu: đọc ra màu theo thứ tự trong danh sách, giống cách các trang
 * tính trước đây (COVER_COLORS[i % 6]), để giao diện không đổi màu. Màu chỉ ghi xuống khi bộ được lưu lại.
 */
function withColors(decks) {
  return decks.map((deck, i) =>
    DECK_COLORS.includes(deck.color) ? deck : { ...deck, color: DECK_COLORS[i % DECK_COLORS.length] });
}

async function requireDeck(id) {
  const deck = id ? await getDeck(id) : null;
  if (!deck) throw new NotFoundError('Không tìm thấy bộ thẻ.');
  return deck;
}

async function requireCard(id) {
  const card = id ? await getCard(id) : null;
  if (!card) throw new NotFoundError('Không tìm thấy thẻ.');
  return card;
}

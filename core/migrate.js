/**
 * Chuyển dữ liệu cũ trong localStorage sang dạng mới. Chỉ core/repo.js dùng file này.
 *
 * Thẻ tạo trước L6 có `front` / `back` thay cho `term` / `meaning`, và thiếu `reading`, `example`.
 * Thẻ tạo từ L6 đến trước L16 còn trường `jlpt` (đã bỏ ở L16).
 * `migrateCards()` chuyển các thẻ có `front` / `back` hoặc còn trường `jlpt` một lần rồi ghi lại; thẻ đã đúng dạng thì giữ nguyên.
 * Chạy nhiều lần vẫn cho cùng kết quả, nên repo.js gọi nó ở lần đọc thẻ đầu tiên của mỗi lần mở trang.
 */
import * as storage from './storage.js';
import { CARD_FIELDS, COLLECTIONS } from './models.js';

/** Một thẻ đọc từ storage → thẻ chỉ có trường mới, bỏ `front` / `back` / `jlpt`. `term` / `meaning` có sẵn thì thắng `front` / `back`. */
export function upgradeCard(raw) {
  const { front, back, jlpt, ...rest } = raw;
  return {
    ...rest,
    term: raw.term ?? front ?? '',
    meaning: raw.meaning ?? back ?? '',
    reading: raw.reading ?? '',
    example: raw.example ?? '',
  };
}

/** Thẻ còn dấu vết dạng cũ: có `front` / `back` / `jlpt`, hoặc thiếu một trường mới. */
function needsUpgrade(card) {
  return 'front' in card || 'back' in card || 'jlpt' in card
    || CARD_FIELDS.some((field) => card[field] === undefined);
}

/** Đổi mọi thẻ dạng cũ sang dạng mới và ghi lại. Trả về số thẻ đã đổi. */
export async function migrateCards() {
  const old = (await storage.list(COLLECTIONS.cards)).filter(needsUpgrade);
  if (old.length) await storage.putMany(COLLECTIONS.cards, old.map(upgradeCard));
  return old.length;
}

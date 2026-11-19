/**
 * Dán nhiều thẻ (C5): tách văn bản dán vào thành các thẻ. Hàm thuần, có test (tests/paste.test.js).
 *
 * Mỗi dòng một thẻ, tối đa 4 cột theo thứ tự term | meaning | reading | example.
 * Dòng có Tab thì tách bằng Tab (dán từ Excel, Google Sheets, Quizlet), không có thì tách bằng "|".
 */
import { cleanText, LIMITS } from '../../core/models.js';
import { plainFurigana } from '../../core/furigana.js';

export const PASTE_FIELDS = Object.freeze(['term', 'meaning', 'reading', 'example']);

/** Khóa so trùng: bỏ [..] furigana, không phân biệt hoa thường, gộp khoảng trắng. Giống card-rows.js. */
export const termKey = (term) => plainFurigana(cleanText(term)).toLowerCase().replace(/\s+/g, ' ');

/**
 * @param {string} text           văn bản người dùng dán
 * @param {string[]} existingTerms từ của các dòng thẻ đang có trên trang (để nhắc trùng)
 * @returns {{ line: number, card: object, error: string, duplicate: string }[]}
 *   line: số dòng trong ô dán (bắt đầu từ 1, bỏ qua dòng trống)
 *   error: lý do không thêm được; '' nếu hợp lệ
 *   duplicate: lời nhắc trùng (vẫn cho thêm); '' nếu không trùng
 */
export function parsePaste(text, existingTerms = []) {
  const existing = new Set(existingTerms.map(termKey).filter(Boolean));
  const seen = new Map();
  const result = [];

  String(text ?? '').split(/\r\n|\r|\n/).forEach((raw, i) => {
    if (!raw.trim()) return;
    const parts = raw.split(raw.includes('\t') ? '\t' : '|').map(cleanText);
    while (parts.length > PASTE_FIELDS.length && !parts.at(-1)) parts.pop(); // Excel hay để thừa ô trống ở cuối
    const card = Object.fromEntries(PASTE_FIELDS.map((field, j) => [field, parts[j] ?? '']));
    const line = i + 1;

    let error = '';
    if (parts.length > PASTE_FIELDS.length) error = `Có ${parts.length} cột, tối đa ${PASTE_FIELDS.length}`;
    else if (!card.term) error = 'Thiếu từ';
    else if (!card.meaning) error = 'Thiếu nghĩa';
    else if (PASTE_FIELDS.some((field) => card[field].length > LIMITS.cardText)) {
      error = `Có ô dài quá ${LIMITS.cardText} ký tự`;
    }

    const key = termKey(card.term);
    let duplicate = '';
    if (!error && key) {
      if (existing.has(key)) duplicate = 'Trùng thẻ đã có';
      else if (seen.has(key)) duplicate = `Trùng dòng ${seen.get(key)}`;
      if (!seen.has(key)) seen.set(key, line);
    }
    result.push({ line, card, error, duplicate });
  });
  return result;
}

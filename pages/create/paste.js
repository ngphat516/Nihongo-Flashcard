/**
 * Dán nhiều thẻ (C5): tách văn bản dán vào thành các thẻ. Hàm thuần, có test (tests/paste.test.js).
 *
 * Mỗi dòng một thẻ, tối đa 4 cột theo thứ tự term | meaning | reading | example.
 * Dòng có Tab thì tách bằng Tab (dán từ Excel, Google Sheets, Quizlet), không có thì tách bằng "|".
 * checkRows() kiểm tra lỗi / trùng / thiếu cách đọc; nhập file (C7, file-io.js) dùng lại hàm này.
 */
import { cleanText, LIMITS } from '../../core/models.js';
import { plainFurigana } from '../../core/furigana.js';
import { missingReadings } from './reading.js';

export const PASTE_FIELDS = Object.freeze(['term', 'meaning', 'reading', 'example']);

/** Khóa so trùng: bỏ [..] furigana, không phân biệt hoa thường, gộp khoảng trắng. Giống card-rows.js. */
export const termKey = (term) => plainFurigana(cleanText(term)).toLowerCase().replace(/\s+/g, ' ');

/**
 * @typedef {{ line: number, card: object, error: string, duplicate: string, noReading: string[] }} CheckedRow
 *   line: số dòng trong ô dán / trong file (bắt đầu từ 1)
 *   error: lý do không thêm được; '' nếu hợp lệ
 *   duplicate: lời nhắc trùng (vẫn cho thêm); '' nếu không trùng
 *   noReading: các cụm kanji chưa có [cách đọc] (vẫn cho thêm), xem kanjiWithoutReading()
 */

/**
 * @param {string} text           văn bản người dùng dán
 * @param {string[]} existingTerms từ của các dòng thẻ đang có trên trang (để nhắc trùng)
 * @returns {CheckedRow[]}  bỏ qua dòng trống
 */
export function parsePaste(text, existingTerms = []) {
  const rows = [];
  String(text ?? '').split(/\r\n|\r|\n/).forEach((raw, i) => {
    if (raw.trim()) rows.push({ line: i + 1, parts: raw.split(raw.includes('\t') ? '\t' : '|') });
  });
  return checkRows(rows, existingTerms);
}

/**
 * Kiểm tra các dòng đã tách cột.
 * @param {{ line: number, parts: string[] }[]} rows  parts theo thứ tự PASTE_FIELDS
 * @param {string[]} existingTerms
 * @returns {CheckedRow[]}
 */
export function checkRows(rows, existingTerms = []) {
  const existing = new Set(existingTerms.map(termKey).filter(Boolean));
  const seen = new Map();

  return rows.map(({ line, parts: rawParts }) => {
    const parts = rawParts.map(cleanText);
    while (parts.length > PASTE_FIELDS.length && !parts.at(-1)) parts.pop(); // Excel hay để thừa ô trống ở cuối
    const card = Object.fromEntries(PASTE_FIELDS.map((field, j) => [field, parts[j] ?? '']));

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
    return { line, card, error, duplicate, noReading: error ? [] : kanjiWithoutReading(card) };
  });
}

/**
 * Cụm kanji chưa có cách đọc trong từ và ví dụ, không lặp.
 * Từ đã có cột Cách đọc thì không nhắc: người học có thể cố ý để mặt trước không có furigana.
 */
export function kanjiWithoutReading(card) {
  const runs = [
    ...(card.reading ? [] : missingReadings(card.term)),
    ...missingReadings(card.example),
  ].map((run) => run.text);
  return [...new Set(runs)];
}

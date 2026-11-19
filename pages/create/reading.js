/**
 * Nhắc kanji chưa có cách đọc: cụm kanji không có [cách đọc] ngay sau thì lúc học sẽ không có furigana.
 * Hàm thuần, có test (tests/reading.test.js). Cùng bảng chữ kanji với core/furigana.js.
 */

const KANJI_RUN = /[㐀-䶿一-鿿々]+/gu;
// [cách đọc] không rỗng, giống điều kiện của parseFurigana
const READING_AFTER = /^\[[^[\]]*[^\s[\]][^[\]]*\]/u;

/**
 * Các cụm kanji chưa có cách đọc, theo thứ tự trong chuỗi.
 * @param {string} text
 * @returns {{ text: string, start: number, end: number }[]}
 */
export function missingReadings(text) {
  const source = String(text ?? '');
  const result = [];
  for (const match of source.matchAll(KANJI_RUN)) {
    const end = match.index + match[0].length;
    if (!READING_AFTER.test(source.slice(end))) result.push({ text: match[0], start: match.index, end });
  }
  return result;
}

/**
 * Thêm [] ngay sau cụm kanji thiếu đầu tiên để người dùng gõ cách đọc vào giữa.
 * Đã có ngoặc (rỗng) thì giữ nguyên, chỉ đặt con trỏ vào trong.
 * @returns {{ text: string, cursor: number } | null}  null nếu không còn cụm nào thiếu
 */
export function addReadingBrackets(text) {
  const source = String(text ?? '');
  const [first] = missingReadings(source);
  if (!first) return null;
  if (source[first.end] === '[') return { text: source, cursor: first.end + 1 };
  return { text: `${source.slice(0, first.end)}[]${source.slice(first.end)}`, cursor: first.end + 1 };
}

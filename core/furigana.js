/**
 * Furigana: chữ kana nhỏ ghi cách đọc phía trên kanji.
 *
 * Cú pháp trong term và example của thẻ: viết cách đọc trong [ ] ngay sau cụm kanji.
 *   約束[やくそく]を守[まも]る   →   約束(やくそく) を 守(まも) る
 * [kana] gắn vào cụm kanji liền ngay trước nó (CJK Unified Ideographs và 々).
 * Ngoặc không khớp, ngoặc rỗng, hoặc trước "[" không có kanji: giữ nguyên là chữ thường.
 *
 *   parseFurigana(text)   → mảng đoạn, hàm thuần (có test)
 *   plainFurigana(text)   → chữ không có phần [..], dùng để tìm kiếm và so trùng
 *   renderFurigana(text)  → <span lang="ja"> chứa <ruby> cho đoạn có furigana
 */
import { h } from './dom.js';

// Cụm kanji + [cách đọc]. Cách đọc không chứa ngoặc, nên ngoặc lồng nhau hay thiếu ngoặc không khớp.
const FURIGANA = /([㐀-䶿一-鿿々]+)\[([^[\]]*)\]/gu;

/**
 * Tách chuỗi thành các đoạn.
 *   parseFurigana('約束[やくそく]を') → [{ base: '約束', ruby: 'やくそく' }, { text: 'を' }]
 * @param {string} text
 * @returns {Array<{ text: string } | { base: string, ruby: string }>}
 */
export function parseFurigana(text) {
  const source = String(text ?? '');
  const segments = [];
  const pushText = (value) => {
    if (!value) return;
    const last = segments.at(-1);
    if (last && 'text' in last) last.text += value;
    else segments.push({ text: value });
  };

  let consumed = 0;
  for (const match of source.matchAll(FURIGANA)) {
    const [whole, base, ruby] = match;
    if (!ruby.trim()) continue; // ngoặc rỗng: để nguyên, phần chữ này được thêm ở lượt sau
    pushText(source.slice(consumed, match.index));
    segments.push({ base, ruby: ruby.trim() });
    consumed = match.index + whole.length;
  }
  pushText(source.slice(consumed));
  return segments;
}

/** Bỏ phần cách đọc: '約束[やくそく]を守[まも]る' → '約束を守る'. */
export function plainFurigana(text) {
  return parseFurigana(text).map((segment) => segment.base ?? segment.text).join('');
}

/**
 * Dựng chữ có furigana: <span lang="ja">約束<ruby>…</ruby>…</span>.
 * Dùng h() nên nội dung người dùng luôn là chữ, không thành HTML.
 * @param {string} text
 * @param {string} [tag='span'] thẻ bọc ngoài
 */
export function renderFurigana(text, tag = 'span') {
  return h(tag, { lang: 'ja' },
    parseFurigana(text).map((segment) =>
      'base' in segment ? h('ruby', {}, segment.base, h('rt', {}, segment.ruby)) : segment.text),
  );
}

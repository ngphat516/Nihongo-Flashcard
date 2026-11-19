/**
 * Thẻ xem trước của trang Tạo thẻ: hiện một dòng thẻ y như trên trang Học, bấm để lật.
 * Dùng cho khung xem trước bên cạnh danh sách (C4) và hộp thoại "Xem thử cả bộ".
 * Furigana theo nút bật/tắt ở cột điều hướng (L7) vì CSS ẩn <rt>, không phải vẽ lại.
 */
import { renderFurigana } from '../../core/furigana.js';
import { h } from '../../core/dom.js';

/**
 * @param {HTMLElement} root  khối chứa một .flashcard có .create-preview-front và .create-preview-back
 * @returns {{ show(fields: object|null, key?: any, direction?: string): void, flip(toBack?: boolean): void }}
 */
export function createPreview(root) {
  const card = root.querySelector('.flashcard');
  const front = root.querySelector('.create-preview-front');
  const back = root.querySelector('.create-preview-back');
  let shownKey;

  card.addEventListener('click', () => flip());

  /** Lật thẻ; không truyền gì thì lật sang mặt kia. */
  function flip(toBack = !card.classList.contains('is-flipped')) {
    card.classList.toggle('is-flipped', toBack);
    card.querySelector('.flashcard-front').setAttribute('aria-hidden', String(toBack));
    card.querySelector('.flashcard-back').setAttribute('aria-hidden', String(!toBack));
  }

  /**
   * Hiện một thẻ. `fields` null hoặc chưa có từ/nghĩa thì hiện lời nhắc.
   * `key` khác lần trước (sang thẻ khác) thì về mặt trước; cùng key (đang gõ) thì giữ mặt đang xem.
   */
  function show(fields, key = null, direction = 'ja-vi') {
    if (key !== shownKey) flip(false);
    shownKey = key;

    if (!fields || (!fields.term && !fields.meaning)) {
      front.replaceChildren(h('span', { class: 'create-preview-empty' }, 'Gõ vào một dòng thẻ để xem trước'));
      back.replaceChildren(h('span', { class: 'create-preview-empty' }, 'Mặt sau: nghĩa, cách đọc, ví dụ'));
      return;
    }
    const reverse = direction === 'vi-ja';
    const missing = (what) => h('span', { class: 'create-preview-missing' }, `Chưa có ${what}`);
    const term = fields.term ? renderFurigana(fields.term) : missing('từ');
    const meaning = fields.meaning || missing('nghĩa');
    front.replaceChildren(h('span', { class: 'create-preview-text', lang: reverse ? 'vi' : 'ja' },
      reverse ? meaning : term));
    back.replaceChildren(
      h('span', { class: 'create-preview-meaning', lang: reverse ? 'ja' : 'vi' }, reverse ? term : meaning),
      fields.reading && h('span', { class: 'create-preview-reading', lang: 'ja' }, fields.reading),
      fields.example && h('span', { class: 'create-preview-example' }, renderFurigana(fields.example)),
    );
  }

  return { show, flip };
}

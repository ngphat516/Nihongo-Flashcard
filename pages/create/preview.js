/**
 * Thẻ xem trước của trang Tạo thẻ (C4): hiện dòng thẻ đang gõ y như trên trang Học, bấm để lật.
 * Furigana theo nút bật/tắt ở cột điều hướng (L7) vì CSS ẩn <rt>, không phải vẽ lại.
 */
import { renderFurigana } from '../../core/furigana.js';
import { h } from '../../core/dom.js';

/**
 * @param {HTMLElement} root  khối chứa (.create-preview), có sẵn .flashcard, mặt trước, mặt sau và nhãn
 * @returns {{ show(fields: object|null, index?: number, direction?: string): void }}
 */
export function createPreview(root) {
  const card = root.querySelector('.flashcard');
  const front = root.querySelector('.create-preview-front');
  const back = root.querySelector('.create-preview-back');
  const title = root.querySelector('.create-preview-title');
  let shownIndex = null;

  card.addEventListener('click', () => flip(!card.classList.contains('is-flipped')));

  function flip(toBack) {
    card.classList.toggle('is-flipped', toBack);
    card.querySelector('.flashcard-front').setAttribute('aria-hidden', String(toBack));
    card.querySelector('.flashcard-back').setAttribute('aria-hidden', String(!toBack));
  }

  /** Hiện một dòng thẻ; `fields` null hoặc chưa có từ/nghĩa thì hiện lời nhắc. Đổi sang dòng khác thì về mặt trước. */
  function show(fields, index = null, direction = 'ja-vi') {
    if (index !== shownIndex) flip(false);
    shownIndex = index;
    title.textContent = index == null ? 'Xem trước' : `Xem trước · thẻ ${index + 1}`;

    if (!fields || (!fields.term && !fields.meaning)) {
      front.replaceChildren(h('span', { class: 'create-preview-empty' }, 'Gõ vào một dòng thẻ để xem trước'));
      back.replaceChildren(h('span', { class: 'create-preview-empty' }, 'Mặt sau: nghĩa, cách đọc, ví dụ'));
      return;
    }
    const reverse = direction === 'vi-ja';
    const termNode = () => (fields.term ? renderFurigana(fields.term) : '…');
    front.replaceChildren(h('span', { class: 'create-preview-text', lang: reverse ? 'vi' : 'ja' },
      reverse ? fields.meaning || '…' : termNode()));
    back.replaceChildren(
      h('span', { class: 'create-preview-meaning', lang: reverse ? 'ja' : 'vi' },
        reverse ? termNode() : fields.meaning || '…'),
      fields.reading && h('span', { class: 'create-preview-reading', lang: 'ja' }, fields.reading),
      fields.example && h('span', { class: 'create-preview-example' }, renderFurigana(fields.example)),
    );
  }

  return { show };
}

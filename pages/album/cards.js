/** A9: tìm nội dung tiếng Nhật và dựng hai mặt thẻ bằng thành phần chung. */
import { h } from '../../core/dom.js';
import { plainFurigana, renderFurigana } from '../../core/furigana.js';

/** Bỏ dấu Latin, không bỏ dakuten/handakuten của tiếng Nhật. */
export function fold(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().normalize('NFC');
}

export function cardMatches(card, query) {
  const text = [plainFurigana(card.term), card.meaning, card.reading, plainFurigana(card.example)].join('\n');
  return fold(text).includes(query);
}

export function makeFlashcard(card) {
  const term = renderFurigana(card.term);
  term.classList.add('album-term');
  const front = h('span', { class: 'flashcard-face flashcard-front' },
    h('span', { class: 'album-face-label' }, 'Từ'),
    term,
    h('span', { class: 'album-flip-hint' }, 'Lật xem nghĩa'),
  );
  const back = h('span', { class: 'flashcard-face flashcard-back', 'aria-hidden': 'true' },
    h('span', { class: 'album-face-label' }, 'Nghĩa'),
    h('span', { class: 'album-answer' },
      h('span', { class: 'album-meaning' }, card.meaning),
      card.reading && h('span', { class: 'album-reading', lang: 'ja' },
        h('span', { class: 'visually-hidden', lang: 'vi' }, 'Cách đọc: '), card.reading),
      card.example && h('span', { class: 'album-example' },
        h('span', { class: 'album-face-label' }, 'Ví dụ'), renderFurigana(card.example)),
    ),
    h('span', { class: 'album-flip-hint' }, 'Lật về từ'),
  );
  const button = h('button', {
    class: 'flashcard', type: 'button', 'aria-pressed': 'false',
    onClick: () => {
      const flipped = button.classList.toggle('is-flipped');
      button.setAttribute('aria-pressed', String(flipped));
      front.setAttribute('aria-hidden', String(flipped));
      back.setAttribute('aria-hidden', String(!flipped));
    },
  }, h('span', { class: 'flashcard-inner' }, front, back));
  return button;
}

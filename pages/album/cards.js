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
    decoration('leaf'),
    h('span', { class: 'album-face-label' }, 'Từ'),
    term,
    h('span', { class: 'album-flip-hint' }, decoration('rotate'), 'Lật xem nghĩa'),
  );
  const back = h('span', { class: 'flashcard-face flashcard-back', 'aria-hidden': 'true' },
    decoration('leaf'),
    h('span', { class: 'album-face-label' }, 'Nghĩa'),
    h('span', { class: 'album-answer' },
      h('span', { class: 'album-meaning' }, card.meaning),
      card.reading && h('span', { class: 'album-reading', lang: 'ja' },
        h('span', { class: 'visually-hidden', lang: 'vi' }, 'Cách đọc: '), card.reading),
      card.example && h('span', { class: 'album-example' },
        h('span', { class: 'album-face-label' }, decoration('wave-left'), 'Ví dụ', decoration('wave-right')), renderFurigana(card.example)),
    ),
    h('span', { class: 'album-flip-hint' }, decoration('rotate'), 'Lật về từ'),
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

// SVG trang trí, nằm ngoài luồng để giữ nguyên mọi vị trí chữ và kích thước thẻ.
function decoration(kind) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', `album-decoration album-${kind}`);
  svg.setAttribute('viewBox', kind.startsWith('wave') ? '0 0 32 8' : '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  // Lá và xoay: đường nét Lucide (ISC); sóng thấp gồm nhiều gợn nhỏ.
  const paths = kind === 'leaf'
    ? ['M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z', 'M2 22c0-6 4-10 10-12']
    : kind === 'rotate'
      ? ['M3 11a9 9 0 1 1 2.4 6.2', 'M3 4v7h7']
      : ['M1 4q2-3 4 0t4 0t4 0t4 0t4 0t4 0t4 0'];
  for (const d of paths) {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

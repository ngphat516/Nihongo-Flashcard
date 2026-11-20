/**
 * Danh sách dòng thẻ của trang Tạo thẻ.
 *
 * Mỗi dòng: { el, term, meaning, reading, example, id, saved }
 *   term, meaning, reading, example   4 ô <textarea>
 *   id                                id thẻ đã lưu; null nếu thẻ chưa lưu
 *   saved                             { term, meaning, reading, example } đã lưu; null nếu chưa lưu
 */
import { cleanText } from '../../core/models.js';
import { plainFurigana } from '../../core/furigana.js';
import { $, $$, h } from '../../core/dom.js';
import { missingReadings } from './reading.js';

export const ROW_FIELDS = Object.freeze(['term', 'meaning', 'reading', 'example']);
const FURIGANA_FIELDS = new Set(['term', 'example']);

export const snapshot = (card) => ({
  term: card.term ?? '',
  meaning: card.meaning ?? '',
  reading: card.reading ?? '',
  example: card.example ?? '',
});

export const fieldsOf = (row) => ({
  term: cleanText(row.term.value),
  meaning: cleanText(row.meaning.value),
  reading: cleanText(row.reading.value),
  example: cleanText(row.example.value),
});

export const hasContent = (row) => ROW_FIELDS.some((field) => Boolean(cleanText(row[field].value)));

export function isRowChanged(row) {
  const current = fieldsOf(row);
  return ROW_FIELDS.some((field) => current[field] !== row.saved[field]);
}

/** Ô thẻ cao lên theo nội dung, không hiện thanh cuộn. */
export function autosize(input) {
  input.style.height = 'auto';
  input.style.height = `${input.scrollHeight + input.offsetHeight - input.clientHeight}px`;
}

export function autosizeRow(row) {
  ROW_FIELDS.forEach((field) => autosize(row[field]));
}

/**
 * @param {HTMLOListElement} list         nơi chứa các dòng
 * @param {HTMLTemplateElement} template  mẫu một dòng (<li class="create-card">)
 */
export function createCardRows(list, template) {
  const rows = [];
  let seq = 0;

  /** Thêm một dòng ở cuối; truyền `card` để điền nội dung thẻ đã lưu. */
  function add(card = null) {
    const el = template.content.firstElementChild.cloneNode(true);
    const n = ++seq;
    const hasGlobalHint = Boolean($('#cards-hint'));
    for (const input of $$('textarea', el)) {
      const field = input.closest('.field');
      const name = input.dataset.field;
      const id = `card-${n}-${name}`;
      input.id = id;
      $('label', field).htmlFor = id;
      const describedBy = [];
      for (const message of $$('.field-error, .create-warning, .create-reading-hint', field)) {
        const kind = message.classList.contains('field-error') ? 'error'
          : message.classList.contains('create-warning') ? 'warning' : 'reading';
        message.id = `${id}-${kind}`;
        describedBy.push(message.id);
      }
      if (hasGlobalHint && FURIGANA_FIELDS.has(name)) describedBy.push('cards-hint');
      input.setAttribute('aria-describedby', describedBy.join(' '));
      input.value = card?.[name] ?? '';
    }
    const row = {
      el,
      term: $('[data-field="term"]', el),
      meaning: $('[data-field="meaning"]', el),
      reading: $('[data-field="reading"]', el),
      example: $('[data-field="example"]', el),
      id: card?.id ?? null,
      saved: card?.id ? snapshot(card) : null,
    };
    rows.push(row);
    list.append(el);
    autosizeRow(row);
    return row;
  }

  function remove(row) {
    rows.splice(rows.indexOf(row), 1);
    row.el.remove();
  }

  function clear() {
    rows.length = 0;
    list.replaceChildren();
  }

  /** Dòng chứa phần tử `el` (ô nhập, nút xóa...). */
  const find = (el) => rows.find((row) => row.el === el.closest('.create-card'));

  /** Đánh lại số thứ tự, nhắc thẻ trùng và kanji chưa có cách đọc. Gọi sau mỗi lần thêm, xóa, gõ hay rời ô. */
  function refresh() {
    rows.forEach((row, i) => {
      $('.create-card-num', row.el).textContent = i + 1;
      $('.create-card-delete', row.el).setAttribute('aria-label', `Xóa thẻ ${i + 1}`);
    });
    markDuplicates();
    rows.forEach(markMissingReadings);
  }

  /**
   * Cụm kanji không có [cách đọc] thì lúc học không có furigana: nhắc dưới ô Từ và ô Ví dụ, vẫn cho lưu.
   * Ô Từ đã có Cách đọc thì không nhắc (người học có thể cố ý để mặt trước không có furigana).
   * Đang gõ trong ô thì đợi rời ô mới hiện lời nhắc mới; lời nhắc đang hiện thì cập nhật ngay (sửa xong là tắt).
   */
  function markMissingReadings(row) {
    for (const field of FURIGANA_FIELDS) {
      const input = row[field];
      const hint = $('.create-reading-hint', input.closest('.field'));
      const skip = field === 'term' && cleanText(row.reading.value);
      const runs = skip ? [] : [...new Set(missingReadings(input.value).map((run) => run.text))];
      if (!runs.length) {
        hint.hidden = true;
        continue;
      }
      if (hint.hidden && document.activeElement === input) continue;
      $('.create-reading-text', hint).replaceChildren('Chưa có cách đọc cho ', h('span', { lang: 'ja' }, runs.join('、')));
      hint.hidden = false;
    }
  }

  /** Từ trùng một thẻ phía trên (bỏ [..] furigana, không phân biệt hoa thường, khoảng trắng thừa) thì nhắc, vẫn cho lưu. */
  function markDuplicates() {
    const firstIndex = new Map();
    rows.forEach((row, i) => {
      const key = plainFurigana(cleanText(row.term.value)).toLowerCase().replace(/\s+/g, ' ');
      const isDuplicate = Boolean(key) && firstIndex.has(key);
      const warning = $('.create-warning', row.el);
      $('.create-warning-text', warning).textContent = isDuplicate
        ? `Trùng từ với thẻ ${firstIndex.get(key) + 1}`
        : '';
      warning.hidden = !isDuplicate;
      if (key && !isDuplicate) firstIndex.set(key, i);
    });
  }

  return { rows, add, remove, clear, find, refresh };
}

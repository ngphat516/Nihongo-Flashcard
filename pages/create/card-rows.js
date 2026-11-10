/**
 * Danh sách dòng thẻ của trang Tạo thẻ.
 *
 * Mỗi dòng: { el, front, back, id, saved }
 *   front, back   hai ô <textarea>
 *   id            id thẻ đã lưu; null nếu thẻ chưa lưu
 *   saved         { front, back } đã lưu, để biết dòng nào bị sửa; null nếu thẻ chưa lưu
 */
import { cleanText } from '../../core/models.js';
import { $, $$ } from '../../core/dom.js';

export const facesOf = (row) => ({ front: cleanText(row.front.value), back: cleanText(row.back.value) });

export const hasContent = (row) => Boolean(cleanText(row.front.value) || cleanText(row.back.value));

export function isRowChanged(row) {
  const { front, back } = facesOf(row);
  return front !== row.saved.front || back !== row.saved.back;
}

/** Ô mặt thẻ cao lên theo nội dung, không hiện thanh cuộn. */
export function autosize(input) {
  input.style.height = 'auto';
  input.style.height = `${input.scrollHeight + input.offsetHeight - input.clientHeight}px`;
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
    for (const input of $$('textarea', el)) {
      const field = input.closest('.field');
      const id = `card-${n}-${input.dataset.face}`;
      input.id = id;
      $('label', field).htmlFor = id;
      const describedBy = [];
      for (const message of $$('.field-error, .create-warning', field)) {
        message.id = `${id}-${message.classList.contains('field-error') ? 'error' : 'warning'}`;
        describedBy.push(message.id);
      }
      input.setAttribute('aria-describedby', describedBy.join(' '));
      input.value = card?.[input.dataset.face] ?? '';
    }
    const row = {
      el,
      front: $('[data-face="front"]', el),
      back: $('[data-face="back"]', el),
      id: card?.id ?? null,
      saved: card ? { front: card.front, back: card.back } : null,
    };
    rows.push(row);
    list.append(el);
    autosize(row.front);
    autosize(row.back);
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

  /** Đánh lại số thứ tự và nhắc thẻ trùng. Gọi sau mỗi lần thêm, xóa hay gõ. */
  function refresh() {
    rows.forEach((row, i) => {
      $('.create-card-num', row.el).textContent = i + 1;
      $('.create-card-delete', row.el).setAttribute('aria-label', `Xóa thẻ ${i + 1}`);
    });
    markDuplicates();
  }

  /** Mặt trước trùng một thẻ phía trên (không phân biệt hoa thường, khoảng trắng thừa) thì nhắc, vẫn cho lưu. */
  function markDuplicates() {
    const firstIndex = new Map();
    rows.forEach((row, i) => {
      const key = cleanText(row.front.value).toLowerCase().replace(/\s+/g, ' ');
      const isDuplicate = Boolean(key) && firstIndex.has(key);
      const warning = $('.create-warning', row.el);
      $('.create-warning-text', warning).textContent = isDuplicate
        ? `Trùng mặt trước với thẻ ${firstIndex.get(key) + 1}`
        : '';
      warning.hidden = !isDuplicate;
      if (key && !isDuplicate) firstIndex.set(key, i);
    });
  }

  return { rows, add, remove, clear, find, refresh };
}

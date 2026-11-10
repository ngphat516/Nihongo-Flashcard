/**
 * ALBUM — hộp xác nhận, dialog có form và toast dùng trong trang (theo mẫu ở pages/styleguide/styleguide.js).
 */
import { $, h } from '../../core/dom.js';

/** Mở hộp xác nhận dùng chung. Trả về true khi người dùng bấm nút xác nhận. */
export function confirmAction({ title, text, okLabel }) {
  const dialog = $('#confirm-dialog');
  $('#confirm-title').textContent = title;
  $('#confirm-text').textContent = text;
  $('#confirm-ok').textContent = okLabel;
  dialog.returnValue = ''; // Esc không đổi returnValue → phải xóa trước mỗi lần mở
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
  });
}

/**
 * Mở dialog có form, điền sẵn `values` (theo name của ô nhập).
 * Bấm Lưu → gọi `save(data)`; ValidationError thì hiện lỗi trong dialog và giữ dialog mở.
 * Trả về kết quả của `save`, hoặc null nếu người dùng hủy.
 */
export function openForm(dialog, { values, save }) {
  const form = dialog.querySelector('form');
  const error = form.querySelector('.alert-error');
  for (const [name, value] of Object.entries(values)) form.elements[name].value = value;
  error.hidden = true;
  dialog.showModal();

  return new Promise((resolve) => {
    let result = null;
    const submit = async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      try {
        result = await save(data);
        dialog.close();
      } catch (err) {
        if (err.name !== 'ValidationError') {
          console.error(err);
          toast(err.message ?? String(err), { error: true });
          return;
        }
        error.textContent = err.message;
        error.hidden = false;
      }
    };
    const cancel = (event) => {
      if (event.target.closest('button[value="cancel"]')) dialog.close();
    };
    const ctrlEnter = (event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) form.requestSubmit();
    };
    form.addEventListener('submit', submit);
    form.addEventListener('click', cancel);
    form.addEventListener('keydown', ctrlEnter);
    dialog.addEventListener('close', () => {
      form.removeEventListener('submit', submit);
      form.removeEventListener('click', cancel);
      form.removeEventListener('keydown', ctrlEnter);
      resolve(result);
    }, { once: true });
  });
}

export function toast(message, { error = false } = {}) {
  const el = h('div', { class: error ? 'toast toast-error' : 'toast', role: 'status' }, message);
  document.body.append(el);
  el.addEventListener('animationend', () => el.remove());
}

/**
 * Báo lỗi dưới ô, toast và hộp xác nhận của trang Tạo thẻ.
 */
import { $, $$, h } from '../../core/dom.js';

/** Hiện (hoặc xóa, khi `message` rỗng) lời báo lỗi ngay dưới một ô nhập trong `.field`. */
export function setError(input, message) {
  const error = input.closest('.field')?.querySelector('.field-error');
  if (!error) return;
  error.textContent = message ?? '';
  error.hidden = !message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

/** Toast nằm trên thanh Lưu; mỗi lúc chỉ một cái. */
export function toast(message, isError = false) {
  $$('.create-toast').forEach((old) => old.remove());
  const el = h(
    'div',
    {
      class: isError ? 'toast toast-error create-toast' : 'toast create-toast',
      role: isError ? 'alert' : 'status',
    },
    message,
  );
  document.body.append(el);
  el.addEventListener('animationend', () => el.remove());
}

/** Lỗi nhập liệu thì hiện lời báo của repo; lỗi khác (VD bộ nhớ trình duyệt đầy) thì báo kèm `prefix` và ghi Console. */
export function showFailure(err, prefix) {
  if (err?.name === 'ValidationError') {
    toast(err.message, true);
    return;
  }
  console.error(err);
  toast(`${prefix}: ${err?.message ?? err}`, true);
}

/** Mở hộp xác nhận #confirm. Trả về true nếu người dùng bấm nút `ok`. */
export function confirmDialog({ title, text, ok }) {
  const dialog = $('#confirm');
  $('#confirm-title').textContent = title;
  $('#confirm-text').textContent = text;
  $('#confirm-ok').textContent = ok;
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
  });
}

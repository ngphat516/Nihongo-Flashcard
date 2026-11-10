/**
 * STYLEGUIDE (pages/styleguide/) — công cụ dev. Mấy đoạn dưới là MẪU CODE để chép sang trang thật:
 * lật thẻ, mở dialog xác nhận, hiện toast.
 */
import { $, h } from '../../core/dom.js';

// ---------- Bảng màu: đọc thẳng giá trị từ tokens.css ----------
const COLOR_TOKENS = [
  'bg', 'surface', 'surface-2', 'border', 'text', 'text-2', 'muted',
  'primary', 'primary-hover', 'danger', 'success',
  'state-new', 'state-learning', 'state-review',
  'rate-again', 'rate-hard', 'rate-good', 'rate-easy',
  'heat-0', 'heat-1', 'heat-2', 'heat-3', 'heat-4',
];
const styles = getComputedStyle(document.documentElement);
$('#swatches').append(
  ...COLOR_TOKENS.map((name) =>
    h('div', { class: 'styleguide-swatch' },
      h('div', { class: 'styleguide-swatch-color', style: { background: `var(--${name})` } }),
      h('code', { class: 'styleguide-swatch-name' }, `--${name}`),
      h('span', { class: 'styleguide-swatch-value' }, styles.getPropertyValue(`--${name}`).trim()),
    ),
  ),
);

// ---------- Mẫu: lật thẻ ----------
const card = $('#demo-card');
card.addEventListener('click', () => card.classList.toggle('is-flipped'));

// ---------- Mẫu: toast ----------
function toast(message, { error = false } = {}) {
  const el = h('div', { class: error ? 'toast toast-error' : 'toast', role: 'status' }, message);
  document.body.append(el);
  el.addEventListener('animationend', () => el.remove());
}
$('#demo-toast').addEventListener('click', () => toast('Đã thêm thẻ “食べる”'));
$('#demo-toast-error').addEventListener('click', () => toast('Bộ nhớ trình duyệt đã đầy', { error: true }));

// ---------- Mẫu: dialog xác nhận ----------
const dialog = $('#confirm-delete');
$('#demo-dialog').addEventListener('click', () => {
  dialog.returnValue = ''; // bấm Esc thì returnValue giữ giá trị lần trước → phải xóa trước khi mở
  dialog.showModal();
});
dialog.addEventListener('close', () => {
  $('#demo-dialog-result').textContent = dialog.returnValue === 'ok' ? 'Đã bấm Xóa' : 'Đã hủy';
});

import { $ } from '../../core/dom.js';

/** Trạng thái tải và lỗi của riêng trang Học; thử lại chỉ đọc dữ liệu. */
export function createStudyFeedback() {
  const main = $('.study-main');
  const status = $('#study-status');
  const errorBox = $('#study-error');
  const retry = $('#retry-queue');

  function clear() {
    errorBox.hidden = true;
    retry.hidden = true;
  }

  function loading(message) {
    clear();
    main.setAttribute('aria-busy', 'true');
    status.textContent = message;
    status.hidden = false;
  }

  function settled() {
    main.removeAttribute('aria-busy');
    status.hidden = true;
  }

  function failed(error, reload, uncertainWrite = false) {
    settled();
    const uncertain = error.name === 'NetworkError' && uncertainWrite
      ? ' Yêu cầu có thể đã được lưu. Hãy tải lại dữ liệu trước khi tiếp tục.' : '';
    errorBox.textContent = error.message + uncertain;
    errorBox.hidden = false;
    const expired = error.name === 'AuthError';
    retry.textContent = expired ? 'Tải lại trang' : 'Thử tải lại dữ liệu';
    retry.onclick = expired ? () => location.reload() : reload;
    retry.hidden = false;
    errorBox.scrollIntoView({ block: 'nearest' });
    retry.focus({ preventScroll: true });
  }

  return { loading, settled, failed };
}

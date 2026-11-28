/**
 * Tiện ích DOM dùng chung.
 *
 * QUY TẮC: nội dung người dùng nhập (tên bộ, mặt thẻ...) chỉ được đưa vào trang bằng h() hoặc
 * textContent. KHÔNG dùng innerHTML với dữ liệu người dùng (lỗi bảo mật XSS).
 */
import { setupAccount } from './account.js';
import { isFuriganaOn, setFuriganaOn } from './preferences.js';

/**
 * Tạo element an toàn.
 *
 *   h('button', { class: 'btn', onClick: save }, 'Lưu')
 *   h('a', { href: routes.study(deck.id) }, deck.name)
 *   h('ul', {}, items.map((x) => h('li', {}, x.name)))
 *
 * - Chuỗi trong children luôn thành text (không bao giờ thành HTML).
 * - Props: class, dataset, style (object), onXxx (sự kiện), value/checked, còn lại là attribute.
 * - Giá trị null / undefined / false bị bỏ qua.
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  const properties = [];
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'value' || key === 'checked') properties.push([key, value]);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  const nodes = children
    .flat(Infinity)
    .filter((c) => c != null && c !== false)
    .map((c) => (c instanceof Node ? c : String(c)));
  el.append(...nodes);
  // Gán value/checked sau khi đã có con: <select> chỉ chọn được option đã nằm trong nó (lỗi B1)
  for (const [key, value] of properties) el[key] = value;
  return el;
}

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/** Đọc tham số trên URL. VD: pages/album/?deck=abc → getParam('deck') === 'abc'. */
export function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

/**
 * Chạy hàm khởi động của trang. Lỗi chưa bắt sẽ hiện thành hộp thông báo trên trang
 * thay vì chỉ nằm im trong Console. Kèm theo: nối nút bật/tắt furigana (L7) và khu vực tài khoản (BE6,
 * core/account.js) ở cột điều hướng, nên trang nào gọi startPage() cũng có 2 nút chạy, không phải tự viết.
 */
export function startPage(init) {
  setupFuriganaToggle();
  setupAccount().catch((err) => console.error(err));
  Promise.resolve()
    .then(init)
    .catch((err) => {
      console.error(err);
      const box = h('div', { class: 'alert alert-error', role: 'alert' }, err?.message ?? String(err));
      document.querySelector('main')?.prepend(box);
    });
}

/**
 * Nút bật/tắt furigana (.rail-furigana) chung cho cả web.
 * Tắt: <html data-furigana="off">, CSS ẩn <rt> (styles/components.css), không phải vẽ lại thẻ.
 * aria-pressed="true" nghĩa là đang hiện furigana. Trang không có nút thì chỉ áp lựa chọn đã lưu.
 */
function setupFuriganaToggle() {
  let on = isFuriganaOn();
  const button = document.querySelector('.rail-furigana');
  const apply = () => {
    if (on) document.documentElement.removeAttribute('data-furigana');
    else document.documentElement.setAttribute('data-furigana', 'off');
    button?.setAttribute('aria-pressed', String(on));
  };
  apply();
  button?.addEventListener('click', () => {
    on = !on; // giữ trong biến: localStorage bị chặn thì nút vẫn đổi được tới khi tải lại trang
    setFuriganaOn(on);
    apply();
  });
  // Trang có phím tắt Space bắt ở document (trang Học: lật thẻ) sẽ nuốt Space khi đang focus nút.
  // Không cho Space từ nút lan lên document; trình duyệt vẫn tự bấm nút như mọi nút khác.
  button?.addEventListener('keydown', (event) => {
    if (event.key === ' ') event.stopPropagation();
  });
}

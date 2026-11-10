/**
 * Tiện ích DOM dùng chung.
 *
 * QUY TẮC: nội dung người dùng nhập (tên bộ, mặt thẻ...) chỉ được đưa vào trang bằng h() hoặc
 * textContent. KHÔNG dùng innerHTML với dữ liệu người dùng (lỗi bảo mật XSS).
 */

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
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'value' || key === 'checked') el[key] = value;
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  const nodes = children
    .flat(Infinity)
    .filter((c) => c != null && c !== false)
    .map((c) => (c instanceof Node ? c : String(c)));
  el.append(...nodes);
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
 * thay vì chỉ nằm im trong Console.
 */
export function startPage(init) {
  Promise.resolve()
    .then(init)
    .catch((err) => {
      console.error(err);
      const box = h('div', { class: 'alert alert-error', role: 'alert' }, err?.message ?? String(err));
      document.querySelector('main')?.prepend(box);
    });
}

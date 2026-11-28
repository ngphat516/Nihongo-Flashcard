/**
 * Khu vực tài khoản ở cột điều hướng (BE6): đăng nhập Google, đăng xuất.
 * `startPage()` tự gọi `setupAccount()`, nên trang không phải viết gì.
 *
 * HTML viết sẵn trong cột ở cả 4 trang (mẫu ở mục "Cột điều hướng" trong styles/base.css):
 *   <button class="rail-link rail-account" aria-expanded="false" aria-controls="account-panel">…</button>
 *   <div class="account-panel" id="account-panel" role="region" aria-label="Tài khoản" hidden></div>
 *
 * Luồng:
 *   - Khách mở trang: không gọi mạng. Bấm nút thì mở bảng, lúc đó mới hỏi `GET /api/auth/config`
 *     (client ID) và tải script Google Identity Services (GIS) để vẽ nút Google.
 *   - Google trả `credential` → `POST /api/auth/google { idToken }` → `rememberSignedIn(true)` → các hàm
 *     đăng ký bằng `onSignIn()` (BE7 sẽ dùng) → tải lại trang; `storage.session()` lúc đó chọn chế độ API.
 *   - Đăng xuất: `POST /api/auth/logout` → `rememberSignedIn(false)` → `google.accounts.id.disableAutoSelect()`
 *     → tải lại trang.
 * Tên, email, avatar của Google chỉ đưa vào trang bằng `h()` (không `innerHTML`).
 */
import { h } from './dom.js';
import { NetworkError } from './models.js';
import { rememberSignedIn, session } from './storage.js';

/** Gốc API, tính theo vị trí file này (core/ → ../api/), giống storage.js. */
const API_BASE = new URL('../api/', import.meta.url);
const GIS_SRC = 'https://accounts.google.com/gsi/client';

export const ACCOUNT_MESSAGES = Object.freeze({
  noServer: 'Trang đang chạy không có máy chủ Node nên chưa đăng nhập được. Chế độ khách vẫn dùng bình thường.',
  signInFailed: 'Đăng nhập không thành công. Hãy thử lại.',
  rateLimited: 'Bạn đã thử đăng nhập quá nhiều lần. Hãy thử lại sau ít phút.',
  network: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
  server: 'Máy chủ đang lỗi, vui lòng thử lại sau.',
  googleScript: 'Không tải được nút đăng nhập của Google. Kiểm tra mạng rồi thử lại.',
});

// ============================== Gọi API (không đụng DOM, có test) ==============================

async function call(method, relPath, body) {
  const init = { method, headers: { Accept: 'application/json' }, credentials: 'same-origin' };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  try {
    const res = await fetch(new URL(relPath, API_BASE), init);
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    return { status: res.status, data };
  } catch {
    throw new NetworkError(ACCOUNT_MESSAGES.network);
  }
}

/** Lỗi 404 (server tĩnh như python http.server) hoặc 5xx, dùng chung cho các hàm dưới. */
function serverError(status, data) {
  if (status === 404) return new NetworkError(ACCOUNT_MESSAGES.noServer);
  return new NetworkError(data?.error?.message || ACCOUNT_MESSAGES.server);
}

/** Client ID của Google từ server (`GET /api/auth/config`). Lỗi ném NetworkError có câu hiện được. */
export async function fetchGoogleClientId() {
  const { status, data } = await call('GET', 'auth/config');
  if (status === 200 && typeof data?.googleClientId === 'string' && data.googleClientId) return data.googleClientId;
  if (status === 200) throw new NetworkError(ACCOUNT_MESSAGES.server);
  throw serverError(status, data);
}

const signInHandlers = [];

/**
 * Đăng ký việc cần làm ngay sau khi đăng nhập, trước khi tải lại trang (BE7: đưa dữ liệu khách lên).
 * Hàm nhận `user` của server, có thể async; lỗi trong hàm không chặn việc đăng nhập.
 */
export function onSignIn(handler) {
  signInHandlers.push(handler);
}

/**
 * Gửi ID token của Google cho server. Thành công: ghi dấu đã đăng nhập, chạy các hàm `onSignIn`, trả `user`.
 * Không tải lại trang (UI tự làm), để test được.
 */
export async function signInWithGoogle(idToken) {
  const { status, data } = await call('POST', 'auth/google', { idToken });
  if (status === 200 && data?.user?.id) {
    rememberSignedIn(true);
    for (const handler of signInHandlers) {
      try {
        await handler(data.user);
      } catch (err) {
        console.error(err);
      }
    }
    return data.user;
  }
  if (status === 200 || status === 400 || status === 401) throw new NetworkError(ACCOUNT_MESSAGES.signInFailed);
  if (status === 429) throw new NetworkError(ACCOUNT_MESSAGES.rateLimited);
  throw serverError(status, data);
}

/**
 * Xóa phiên trên server rồi xóa dấu đã đăng nhập. Server không xóa được (mất mạng, lỗi) thì giữ dấu
 * và ném lỗi: cookie phiên vẫn còn, xóa dấu lúc này thì lần mở sau trông như khách mà vẫn đang đăng nhập.
 */
export async function signOut() {
  const { status, data } = await call('POST', 'auth/logout');
  if (status === 401) {
    // Phiên đã hết từ trước: coi như đã đăng xuất.
  } else if (status < 200 || status >= 300) throw serverError(status, data);
  rememberSignedIn(false);
}

// ============================== Script Google ==============================

let gisPromise = null;

/** Tải GIS một lần, chỉ khi cần (mở bảng đăng nhập, đăng xuất). */
function loadGoogleScript() {
  if (globalThis.google?.accounts?.id) return Promise.resolve(globalThis.google.accounts.id);
  gisPromise ??= new Promise((resolve, reject) => {
    const script = h('script', { src: GIS_SRC, async: true });
    script.addEventListener('load', () => {
      if (globalThis.google?.accounts?.id) resolve(globalThis.google.accounts.id);
      else reject(new NetworkError(ACCOUNT_MESSAGES.googleScript));
    });
    script.addEventListener('error', () => {
      script.remove();
      reject(new NetworkError(ACCOUNT_MESSAGES.googleScript));
    });
    document.head.append(script);
  }).catch((err) => {
    gisPromise = null; // lần mở bảng sau thử tải lại
    throw err;
  });
  return gisPromise;
}

// ============================== Giao diện ==============================

/** Icon Lucide `log-out` (lucide-static 0.468.0, ISC); polyline và line viết lại thành path. */
function logoutIcon() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  for (const [key, value] of Object.entries({
    width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
  })) svg.setAttribute(key, String(value));
  for (const d of ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9']) {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

function initialOf(user) {
  const text = (user.name || user.email || '?').trim();
  return ([...text][0] ?? '?').toLocaleUpperCase('vi');
}

/** Avatar Google; không có ảnh hoặc ảnh lỗi thì hiện chữ cái đầu. */
function avatar(user, { alt }) {
  const fallback = () => h('span', { class: 'account-avatar account-initial', 'aria-hidden': 'true' }, initialOf(user));
  let url = null;
  try {
    url = user.avatarUrl ? new URL(user.avatarUrl) : null;
  } catch {
    url = null;
  }
  if (url?.protocol !== 'https:') return fallback();
  const img = h('img', {
    class: 'account-avatar', src: url.href, alt, referrerpolicy: 'no-referrer', width: 32, height: 32, decoding: 'async',
  });
  img.addEventListener('error', () => img.replaceWith(fallback()), { once: true });
  return img;
}

function statusLine() {
  return h('p', { class: 'account-status', role: 'status' });
}

function showError(line, err) {
  line.textContent = err?.message || ACCOUNT_MESSAGES.server;
  line.classList.add('is-error');
}

function setupPanel(button, panel) {
  const close = ({ focus = false } = {}) => {
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (focus) button.focus();
  };
  const open = () => {
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    panel.dispatchEvent(new Event('account-open'));
  };
  button.addEventListener('click', () => (panel.hidden ? open() : close()));
  // Space ở nút không lan lên document (trang Học dùng Space để lật thẻ), giống nút furigana.
  button.addEventListener('keydown', (event) => {
    if (event.key === ' ') event.stopPropagation();
  });
  panel.addEventListener('keydown', (event) => {
    if (event.key === ' ') event.stopPropagation();
    if (event.key === 'Escape') {
      event.stopPropagation();
      close({ focus: true });
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden && button.contains(document.activeElement)) close();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target)) close();
  });
}

// Khách: nút giữ nguyên icon và nhãn "Tài khoản" viết sẵn trong HTML.
function renderGuest(button, panel) {
  const line = statusLine();
  const slot = h('div', { class: 'account-google' });
  panel.replaceChildren(
    h('p', { class: 'account-title' }, 'Lưu thẻ lên tài khoản'),
    h('p', { class: 'account-text' }, 'Đăng nhập để học tiếp trên máy khác. Chưa đăng nhập thì thẻ chỉ lưu trên máy này.'),
    slot,
    line,
  );

  let busy = false;
  let ready = false;
  const onCredential = async ({ credential } = {}) => {
    if (busy) return;
    busy = true;
    line.classList.remove('is-error');
    line.textContent = 'Đang đăng nhập…';
    try {
      if (!credential) throw new NetworkError(ACCOUNT_MESSAGES.signInFailed);
      await signInWithGoogle(credential);
      line.textContent = 'Đã đăng nhập. Đang tải lại trang…';
      location.reload();
    } catch (err) {
      busy = false;
      showError(line, err);
    }
  };

  panel.addEventListener('account-open', async () => {
    if (ready || busy) return;
    busy = true;
    line.classList.remove('is-error');
    line.textContent = 'Đang tải nút đăng nhập…';
    try {
      const clientId = await fetchGoogleClientId();
      const gis = await loadGoogleScript();
      gis.initialize({ client_id: clientId, callback: onCredential, ux_mode: 'popup', auto_select: false });
      gis.renderButton(slot, {
        type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill',
        logo_alignment: 'left', locale: 'vi', width: Math.min(400, Math.max(200, slot.clientWidth || 240)),
      });
      ready = true;
      slot.hidden = false;
      line.textContent = '';
    } catch (err) {
      slot.hidden = true; // không chừa chỗ trống cho nút Google khi không vẽ được
      showError(line, err);
    } finally {
      busy = false;
    }
  });
}

function renderUser(button, panel, user) {
  const name = user.name || user.email;
  button.replaceChildren(avatar(user, { alt: '' }), h('span', { class: 'rail-label' }, name));
  button.setAttribute('aria-label', 'Tài khoản: ' + name);
  const line = statusLine();
  const logout = h('button', { class: 'btn account-logout', type: 'button' }, logoutIcon(), 'Đăng xuất');
  logout.addEventListener('click', async () => {
    logout.disabled = true;
    line.classList.remove('is-error');
    line.textContent = 'Đang đăng xuất…';
    try {
      await signOut();
      // Không tự chọn lại tài khoản này ở lần đăng nhập sau. Tải script lỗi thì bỏ qua.
      await loadGoogleScript().then((gis) => gis.disableAutoSelect()).catch(() => {});
      location.reload();
    } catch (err) {
      logout.disabled = false;
      showError(line, err);
    }
  });
  panel.replaceChildren(
    h('div', { class: 'account-user' },
      avatar(user, { alt: 'Ảnh đại diện của ' + name }),
      h('div', { class: 'account-who' },
        h('p', { class: 'account-name' }, user.name || 'Tài khoản Google'),
        h('p', { class: 'account-email' }, user.email))),
    logout,
    line,
  );
}

function renderUnknown(panel, err) {
  const line = statusLine();
  showError(line, err);
  panel.replaceChildren(h('p', { class: 'account-title' }, 'Chưa kiểm tra được đăng nhập'), line);
}

/** Gọi từ `startPage()`. Trang không có nút tài khoản thì không làm gì. */
export async function setupAccount() {
  const button = document.querySelector('.rail-account');
  const panel = button && document.getElementById(button.getAttribute('aria-controls'));
  if (!button || !panel) return;
  setupPanel(button, panel);
  try {
    const { user } = await session();
    if (user) renderUser(button, panel, user);
    else renderGuest(button, panel);
  } catch (err) {
    // Mất mạng hoặc máy chủ lỗi khi đang có dấu đăng nhập: trang tự báo lỗi qua repo; bảng chỉ nói lý do.
    renderUnknown(panel, err);
  }
}

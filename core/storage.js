/**
 * Lớp lưu trữ thấp nhất, 2 chế độ. Các trang KHÔNG import file này — hãy dùng repo.js.
 *
 *   - Khách (chưa đăng nhập): localStorage, như trước BE5.
 *   - Đã đăng nhập: gọi API của server (`/api/...`, cùng origin, cookie phiên tự gửi kèm).
 *
 * Chọn chế độ một lần mỗi lần mở trang (xem `session()`):
 *   - Trình duyệt không có dấu "đã đăng nhập" (`SIGNED_IN_KEY`, BE6 ghi bằng `rememberSignedIn`) → localStorage,
 *     không gọi mạng. Nhờ vậy khách không bị dòng lỗi 401/404 đỏ trong Console ở mỗi trang.
 *   - Có dấu → `GET /api/me`: `200` → API; `401` (hết phiên) hoặc `404` (server tĩnh, không có API)
 *     → xóa dấu, dùng localStorage.
 *   - Mở bằng `file://` hoặc chạy test Node (không có `location` http/https) → luôn localStorage.
 * Mất dấu (xóa dữ liệu trình duyệt) thì chỉ bị coi là khách cho tới khi đăng nhập lại; không có gì bị xóa.
 *
 * Hàm dùng chung cho cả 2 chế độ (cùng tên, cùng kết quả):
 *   list / get / put / putMany / remove / removeMany / clearAll
 *   review / undoReview / removeDeck  — các thao tác nhiều bước, ở chế độ API là 1 transaction trên server.
 *
 * Khác nhau cần biết ở chế độ API:
 *   - `put` gửi `expectedUpdatedAt` (nếu có): bản trên server đã đổi → ConflictError.
 *   - `put` trả về bản server đã lưu (server tự đặt `updatedAt`); luôn dùng kết quả trả về.
 *   - `putMany` CHỈ thêm mới (`POST /batch`): id đã có thì server giữ nguyên bản cũ.
 *   - Lỗi: 400 → ValidationError, 404 → NotFoundError, 409 → ConflictError, 401 → AuthError,
 *     mất mạng / lỗi khác → NetworkError. Đều có `message` hiện được cho người dùng.
 */
import {
  AuthError,
  COLLECTIONS,
  ConflictError,
  NetworkError,
  NotFoundError,
  ValidationError,
} from './models.js';

// ============================== Chọn chế độ ==============================

/** Gốc API, tính theo vị trí file này (core/ → ../api/) để chạy được ở mọi trang và mọi đường dẫn gốc. */
const API_BASE = new URL('../api/', import.meta.url);

let sessionPromise = null;

/**
 * Chế độ của lần mở trang này. Gọi bao nhiêu lần cũng chỉ hỏi server một lần.
 * Không hỏi được server (mất mạng, server lỗi 5xx) → ném NetworkError, lần gọi sau hỏi lại.
 * @returns {Promise<{ mode: 'local' | 'api', user: { id: string, email: string, name: string|null, avatarUrl: string|null } | null }>}
 */
export function session() {
  sessionPromise ??= detectSession().catch((err) => {
    sessionPromise = null;
    throw err;
  });
  return sessionPromise;
}

/** true khi đang đăng nhập (dữ liệu nằm trên server). */
export async function isSignedIn() {
  return (await session()).mode === 'api';
}

/** Chỉ cho test: quên chế độ đã chọn để lần gọi sau hỏi lại. */
export function forgetSession() {
  sessionPromise = null;
}

/**
 * Dấu "trình duyệt này đã đăng nhập". Key riêng, không có tiền tố 'nholau:', để ?reset không xóa.
 * Chỉ là gợi ý để biết có nên hỏi server: quyền truy cập thật nằm ở cookie phiên (HttpOnly) phía server.
 */
export const SIGNED_IN_KEY = 'nholau-signed-in';

/** BE6 gọi `rememberSignedIn(true)` sau khi đăng nhập xong, `false` khi đăng xuất. */
export function rememberSignedIn(on) {
  try {
    if (on) globalThis.localStorage?.setItem(SIGNED_IN_KEY, '1');
    else globalThis.localStorage?.removeItem(SIGNED_IN_KEY);
  } catch {
    // localStorage bị chặn: lần mở trang sau coi như khách
  }
}

function hasSignedInHint() {
  try {
    return globalThis.localStorage?.getItem(SIGNED_IN_KEY) === '1';
  } catch {
    return false;
  }
}

const GUEST = Object.freeze({ mode: 'local', user: null });

async function detectSession() {
  if (!/^https?:$/.test(globalThis.location?.protocol ?? '')) return GUEST;
  if (!hasSignedInHint()) return GUEST;
  let res;
  try {
    res = await fetch(new URL('me', API_BASE), { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
  } catch {
    throw new NetworkError();
  }
  if (res.status === 401 || res.status === 404) {
    rememberSignedIn(false);
    return GUEST;
  }
  if (!res.ok) throw new NetworkError('Máy chủ đang lỗi, hãy thử tải lại trang sau ít phút.');
  const data = await res.json().catch(() => null);
  if (!data?.user?.id) throw new NetworkError('Máy chủ trả dữ liệu không đúng, hãy thử tải lại trang.');
  return { mode: 'api', user: data.user };
}

const useApi = async () => (await session()).mode === 'api';

// ============================== Hàm dùng chung ==============================

/**
 * Mọi bản ghi trong một bảng (thứ tự không đảm bảo).
 * `filter` chỉ để bớt dữ liệu tải về ở chế độ API; người gọi vẫn tự lọc lại
 * (localStorage bỏ qua `filter` và trả hết).
 * @param {string} collection
 * @param {{ deckId?: string, from?: number, to?: number }} [filter]
 *        deckId: chỉ cho `cards`. from / to: chỉ cho `reviewLogs`, khoảng [from, to).
 */
export async function list(collection, filter = {}) {
  return (await useApi()) ? apiList(collection, filter) : Object.values(readMap(collection));
}

/** Một bản ghi theo id, hoặc null. */
export async function get(collection, id) {
  if (await useApi()) return apiGet(collection, id);
  // Object.hasOwn: id như 'constructor' không được trả về hàm của Object.prototype (lỗi B4)
  const map = readMap(collection);
  return Object.hasOwn(map, id) ? map[id] : null;
}

/**
 * Thêm mới hoặc ghi đè một bản ghi (theo id). Trả về bản đã lưu.
 * @param {{ expectedUpdatedAt?: number }} [options] `updatedAt` của bản đã đọc trước khi sửa.
 *        Chế độ API: bản trên server khác giá trị này → ConflictError. localStorage bỏ qua.
 */
export async function put(collection, item, { expectedUpdatedAt } = {}) {
  if (await useApi()) {
    requireId(collection, item);
    const body = expectedUpdatedAt === undefined ? item : { ...item, expectedUpdatedAt };
    return (await request('PUT', `${path(collection)}/${encodeURIComponent(item.id)}`, body)).item;
  }
  const [saved] = await putMany(collection, [item]);
  return saved;
}

/** Thêm nhiều bản ghi. Chế độ API chỉ thêm mới, xem đầu file. Trả về các bản đã lưu. */
export async function putMany(collection, items) {
  items.forEach((item) => requireId(collection, item));
  if (await useApi()) {
    const saved = [];
    for (const chunk of chunks(items)) {
      saved.push(...(await request('POST', `${path(collection)}/batch`, { items: chunk })).items);
    }
    return saved;
  }
  const map = readMap(collection);
  for (const item of items) map[item.id] = item;
  writeMap(collection, map);
  return items;
}

export async function remove(collection, id) {
  if (await useApi()) {
    if (isUuid(id)) await request('DELETE', `${path(collection)}/${encodeURIComponent(id)}`);
    return;
  }
  return removeMany(collection, [id]);
}

export async function removeMany(collection, ids) {
  if (await useApi()) {
    for (const chunk of chunks(ids.filter(isUuid))) {
      await request('POST', `${path(collection)}/delete`, { ids: chunk });
    }
    return;
  }
  const map = readMap(collection);
  for (const id of ids) delete map[id];
  writeMap(collection, map);
}

/**
 * Xóa toàn bộ dữ liệu của app. localStorage: chỉ các khóa có tiền tố của app.
 * Chế độ API: xóa mọi bộ, thẻ, lượt ôn của tài khoản trên server (`DELETE /api/me/data`).
 */
export async function clearAll() {
  if (await useApi()) {
    await request('DELETE', 'me/data');
    return;
  }
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}

// ======================== Thao tác nhiều bước ========================

/**
 * Lưu một lần chấm điểm: lượt ôn `log` và thẻ `card` sau khi chấm.
 * Chế độ API: `POST /api/reviews` (1 transaction; gửi lại cùng `log.id` không ghi 2 lần).
 * @param {{ expectedUpdatedAt?: number }} [options] `updatedAt` của thẻ trước khi chấm.
 * @returns {Promise<{ card: object, log: object }>} bản đã lưu
 */
export async function review(card, log, { expectedUpdatedAt } = {}) {
  if (await useApi()) {
    const body = { card, log, ...(expectedUpdatedAt !== undefined && { expectedUpdatedAt }) };
    return request('POST', 'reviews', body);
  }
  // Ghi lượt ôn trước: ghi thẻ có lỗi (VD bộ nhớ đầy) thì thẻ giữ lịch cũ, không mất dấu lượt ôn
  await putMany(COLLECTIONS.reviewLogs, [log]);
  await putMany(COLLECTIONS.cards, [card]);
  return { card, log };
}

/**
 * Hoàn tác lần chấm có lượt ôn `logId`: xóa lượt ôn, đưa thẻ về `cardBefore`.
 * Chế độ API: `POST /api/reviews/:id/undo` (1 transaction). Trả về thẻ đã khôi phục.
 */
export async function undoReview(logId, cardBefore) {
  if (await useApi()) {
    return (await request('POST', `reviews/${encodeURIComponent(logId)}/undo`, { card: cardBefore })).card;
  }
  await putMany(COLLECTIONS.cards, [cardBefore]);
  await removeMany(COLLECTIONS.reviewLogs, [logId]);
  return cardBefore;
}

/**
 * Xóa bộ và mọi thẻ trong bộ, GIỮ lịch sử ôn.
 * Chế độ API: `DELETE /api/decks/:id` (server xóa thẻ theo bộ trong cùng transaction).
 */
export async function removeDeck(deckId) {
  if (await useApi()) return remove(COLLECTIONS.decks, deckId);
  const cardIds = Object.values(readMap(COLLECTIONS.cards)).filter((c) => c.deckId === deckId).map((c) => c.id);
  await removeMany(COLLECTIONS.cards, cardIds);
  await removeMany(COLLECTIONS.decks, [deckId]);
}

// ============================== localStorage ==============================

const PREFIX = 'nholau:';

const keyOf = (collection) => PREFIX + collection;

/** Đọc một "bảng": object dạng { [id]: item }. */
function readMap(collection) {
  const raw = localStorage.getItem(keyOf(collection));
  if (raw == null) return {};
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  } catch {
    // rơi xuống lỗi bên dưới
  }
  // Không âm thầm trả về {} — lần ghi tiếp theo sẽ đè mất dữ liệu cũ.
  throw new Error(`Dữ liệu "${collection}" trong localStorage bị hỏng. Mở Console gõ dev.reset() để xóa.`);
}

function writeMap(collection, map) {
  try {
    localStorage.setItem(keyOf(collection), JSON.stringify(map));
  } catch (err) {
    if (err?.name === 'QuotaExceededError') {
      throw new Error('Bộ nhớ trình duyệt đã đầy (localStorage khoảng 5 MB). Hãy xóa bớt thẻ.');
    }
    throw err;
  }
}

// ================================== API ==================================

/** Server nhận tối đa 1000 bản ghi mỗi lần batch / xóa nhiều. */
const BATCH_SIZE = 1000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Server chỉ nhận id dạng UUID; id khác (VD `?deck=abc` trên URL) chắc chắn không có trên server. */
const isUuid = (id) => typeof id === 'string' && UUID.test(id);

function path(collection) {
  if (!Object.values(COLLECTIONS).includes(collection)) throw new Error(`Bảng "${collection}" không tồn tại.`);
  return collection;
}

function requireId(collection, item) {
  if (!item?.id) throw new Error(`Bản ghi lưu vào "${collection}" phải có id.`);
}

function* chunks(items) {
  for (let i = 0; i < items.length; i += BATCH_SIZE) yield items.slice(i, i + BATCH_SIZE);
}

async function apiList(collection, { deckId, from, to } = {}) {
  const params = new URLSearchParams();
  if (collection === COLLECTIONS.cards && deckId !== undefined) {
    if (!isUuid(deckId)) return [];
    params.set('deckId', deckId);
  }
  if (collection === COLLECTIONS.reviewLogs) {
    // Server lọc [from, to] (lấy cả mốc to); thời gian là số ms nguyên nên [from, to) = [from, to - 1].
    const lo = Number.isFinite(from) && from > 0 ? Math.ceil(from) : 0;
    const hi = Number.isFinite(to) ? Math.ceil(to) - 1 : null;
    if (hi !== null && hi < lo) return [];
    if (lo > 0) params.set('from', String(lo));
    if (hi !== null) params.set('to', String(hi));
  }
  const query = params.size ? `?${params}` : '';
  try {
    return (await request('GET', path(collection) + query)).items;
  } catch (err) {
    // Bộ không có (hoặc của tài khoản khác): giống localStorage, trả danh sách rỗng
    if (err instanceof NotFoundError && params.has('deckId')) return [];
    throw err;
  }
}

async function apiGet(collection, id) {
  if (!isUuid(id)) return null;
  try {
    return (await request('GET', `${path(collection)}/${encodeURIComponent(id)}`)).item;
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

/**
 * Gọi API, trả JSON (hoặc null với 204). Lỗi HTTP → lớp lỗi tương ứng ở đầu file.
 * @param {string} method
 * @param {string} relPath đường dẫn sau `/api/`, VD `cards/<id>`
 * @param {unknown} [body]
 */
async function request(method, relPath, body) {
  const init = { method, headers: { Accept: 'application/json' }, credentials: 'same-origin' };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(new URL(relPath, API_BASE), init);
  } catch {
    throw new NetworkError();
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (res.ok) {
    if (data === null) throw new NetworkError('Máy chủ trả dữ liệu không đúng, hãy thử lại.');
    return data;
  }
  throw httpError(res.status, data?.error?.message);
}

function httpError(status, message) {
  switch (status) {
    case 400: return new ValidationError(message || 'Dữ liệu không hợp lệ.');
    case 401:
      rememberSignedIn(false); // lần mở trang sau là khách cho tới khi đăng nhập lại
      return new AuthError();
    case 404: return new NotFoundError(message || 'Không tìm thấy dữ liệu.');
    case 409: return new ConflictError();
    default: return new NetworkError(message || 'Lỗi máy chủ, vui lòng thử lại.');
  }
}

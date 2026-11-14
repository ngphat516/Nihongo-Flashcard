/**
 * Lớp lưu trữ thấp nhất. Hiện tại dùng localStorage.
 *
 * Sau này có backend: viết lại file này bằng fetch() với CÙNG tên hàm
 * (list / get / put / putMany / remove / removeMany / clearAll) — các trang không phải sửa gì.
 * Đó là lý do mọi hàm đều async (trả về Promise) dù localStorage chạy đồng bộ.
 *
 * Các trang KHÔNG import file này — hãy dùng repo.js.
 */

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

/** Mọi bản ghi trong một bảng (thứ tự không đảm bảo). */
export async function list(collection) {
  return Object.values(readMap(collection));
}

/** Một bản ghi theo id, hoặc null. */
export async function get(collection, id) {
  // Object.hasOwn: id như 'constructor' không được trả về hàm của Object.prototype (lỗi B4)
  const map = readMap(collection);
  return Object.hasOwn(map, id) ? map[id] : null;
}

/** Thêm mới hoặc ghi đè một bản ghi (theo id). */
export async function put(collection, item) {
  const [saved] = await putMany(collection, [item]);
  return saved;
}

export async function putMany(collection, items) {
  const map = readMap(collection);
  for (const item of items) {
    if (!item?.id) throw new Error(`Bản ghi lưu vào "${collection}" phải có id.`);
    map[item.id] = item;
  }
  writeMap(collection, map);
  return items;
}

export async function remove(collection, id) {
  return removeMany(collection, [id]);
}

export async function removeMany(collection, ids) {
  const map = readMap(collection);
  for (const id of ids) delete map[id];
  writeMap(collection, map);
}

/** Xóa toàn bộ dữ liệu của app (chỉ các khóa có tiền tố của app). */
export async function clearAll() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}

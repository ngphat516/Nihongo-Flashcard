/**
 * Công cụ cho lúc phát triển.
 * Giữ lại trên bản nộp để demo bằng ?seed / ?reset (Leader chốt ngày 2026-11-20).
 * ?reset chỉ xóa dữ liệu trong trình duyệt của người mở link.
 *
 *   Thêm ?seed vào URL   → tạo dữ liệu mẫu (3 bộ thẻ + ~4 tháng lịch sử ôn)
 *   Thêm ?reset vào URL  → xóa sạch dữ liệu
 *   Hoặc gõ trong Console: dev.seed()  /  dev.reset()
 *
 * Đang đăng nhập (dữ liệu trên server) thì cả 2 lệnh bị bỏ qua, chỉ ghi cảnh báo ra Console,
 * để ?reset lỡ tay không xóa dữ liệu thật trên PostgreSQL (BE5).
 */
import { seedDemoData } from '../core/seed.js';
import { clearAll, isSignedIn } from '../core/storage.js';

const dev = {
  async seed() {
    if (!(await guestOnly('seed'))) return;
    const result = await seedDemoData();
    console.info('[dev] Đã tạo dữ liệu mẫu:', result);
    reloadWithout('seed');
  },
  async reset() {
    if (!(await guestOnly('reset'))) return;
    await clearAll();
    console.info('[dev] Đã xóa toàn bộ dữ liệu.');
    reloadWithout('reset');
  },
};

window.dev = dev;

/** true khi đang là khách. Đang đăng nhập hoặc không hỏi được server → false (an toàn: không làm gì). */
async function guestOnly(command) {
  let signedIn;
  try {
    signedIn = await isSignedIn();
  } catch (err) {
    console.warn(`[dev] Bỏ qua dev.${command}(): không kiểm tra được trạng thái đăng nhập.`, err);
    return false;
  }
  if (signedIn) {
    console.warn(`[dev] Bỏ qua dev.${command}(): đang đăng nhập, dữ liệu trên máy chủ không bị đụng tới.`);
    dropParam(command);
    return false;
  }
  return true;
}

function reloadWithout(param) {
  const url = new URL(location.href);
  url.searchParams.delete(param);
  location.replace(url);
}

/** Bỏ ?seed / ?reset khỏi thanh địa chỉ mà không tải lại trang. */
function dropParam(param) {
  const url = new URL(location.href);
  if (!url.searchParams.has(param)) return;
  url.searchParams.delete(param);
  history.replaceState(history.state, '', url);
}

const params = new URLSearchParams(location.search);
if (params.has('seed')) dev.seed();
else if (params.has('reset')) dev.reset();

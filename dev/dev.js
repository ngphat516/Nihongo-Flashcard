/**
 * Công cụ cho lúc phát triển.
 * TRƯỚC KHI NỘP: xóa thẻ <script src="…dev/dev.js"> trong 4 file HTML.
 *
 *   Thêm ?seed vào URL   → tạo dữ liệu mẫu (3 bộ thẻ + ~4 tháng lịch sử ôn)
 *   Thêm ?reset vào URL  → xóa sạch dữ liệu
 *   Hoặc gõ trong Console: dev.seed()  /  dev.reset()
 */
import { seedDemoData } from '../core/seed.js';
import { clearAll } from '../core/storage.js';

const dev = {
  async seed() {
    const result = await seedDemoData();
    console.info('[dev] Đã tạo dữ liệu mẫu:', result);
    reloadWithout('seed');
  },
  async reset() {
    await clearAll();
    console.info('[dev] Đã xóa toàn bộ dữ liệu.');
    reloadWithout('reset');
  },
};

window.dev = dev;

function reloadWithout(param) {
  const url = new URL(location.href);
  url.searchParams.delete(param);
  location.replace(url);
}

const params = new URLSearchParams(location.search);
if (params.has('seed')) dev.seed();
else if (params.has('reset')) dev.reset();

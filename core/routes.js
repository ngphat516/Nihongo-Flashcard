/**
 * Đường dẫn giữa 4 trang. Dùng các hàm ở đây thay vì tự ghép chuỗi URL,
 * để khi đổi URL chỉ cần sửa một chỗ.
 *
 *   ./                           Trang chủ (heatmap)
 *   pages/album/                 Lưới các bộ thẻ
 *   pages/album/?deck=<id>       Chi tiết một bộ
 *   pages/create/                Tạo thẻ: tạo bộ mới
 *   pages/create/?deck=<id>      Tạo thẻ: sửa bộ đó, thêm thẻ
 *   pages/study/                 Chọn bộ để học
 *   pages/study/?deck=<id>       Học một bộ
 *
 * Link tính từ gốc project (thư mục chứa core/), nên vẫn đúng khi deploy
 * dưới một thư mục con, VD GitHub Pages /ten-repo/.
 */

const ROOT = new URL('../', import.meta.url);

function page(path, deckId) {
  const url = new URL(path, ROOT);
  if (deckId) url.searchParams.set('deck', deckId);
  return url.pathname + url.search;
}

export const routes = Object.freeze({
  home: () => page(''),
  album: (deckId) => page('pages/album/', deckId),
  create: (deckId) => page('pages/create/', deckId),
  study: (deckId) => page('pages/study/', deckId),
});

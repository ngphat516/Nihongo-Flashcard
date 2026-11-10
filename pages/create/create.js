/**
 * TẠO THẺ (pages/create/) — phụ trách: Thành viên 3
 * Việc cần làm: TASKS.md, mục "Tạo thẻ" (C1–C7).
 *
 *   pages/create/             → người dùng tự chọn bộ
 *   pages/create/?deck=<id>   → chọn sẵn bộ đó (đến từ nút "Thêm thẻ" ở Album)
 *
 * Hàm core hay dùng:
 *   getDecks()                                   → danh sách bộ (cho dropdown)
 *   createDeck({ name, description, newPerDay }) → bộ mới
 *   createCard({ deckId, front, back })          → thẻ mới
 *   createCards(deckId, [{ front, back }, ...])  → thêm nhiều thẻ một lần (nhập hàng loạt)
 *   getCards(deckId)                             → kiểm tra trùng mặt trước
 *   deleteCard(id)                               → xóa thẻ vừa thêm nhầm
 *   routes.album(id)                             → link "Xem trong album"
 *
 * Bắt lỗi khi lưu:
 *   try { await createCard(...) }
 *   catch (err) { if (err.name === 'ValidationError') hiện err.message; else throw err; }
 */
import { getDecks } from '../../core/repo.js';
import { $, getParam, h, startPage } from '../../core/dom.js';

startPage(async () => {
  const decks = await getDecks();
  const selectedDeckId = getParam('deck');

  // TODO C1: dropdown chọn bộ (chọn sẵn selectedDeckId) + form tạo bộ mới
  // TODO C2 · C3: form thêm thẻ + kiểm tra dữ liệu
  // TODO C4: xem trước · C5: nhập nhiều thẻ · C6: thẻ vừa thêm

  // ---------- DEMO — xóa khi làm thật ----------
  const selected = decks.find((d) => d.id === selectedDeckId);
  $('#deck-picker').append(
    h('p', { class: 'demo' },
      `Có ${decks.length} bộ: ${decks.map((d) => d.name).join(', ') || '(chưa có)'}.`,
      selected ? ` Đang chọn sẵn: ${selected.name}.` : '',
    ),
  );
});

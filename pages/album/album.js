/**
 * ALBUM (pages/album/) — phụ trách: Thành viên 2
 * Việc cần làm: docs/tasks.md, mục "Album" (A1–A9).
 *
 * Trang có 2 chế độ:
 *   pages/album/             → lưới các bộ thẻ (#grid-view)
 *   pages/album/?deck=<id>   → chi tiết một bộ (#detail-view), code ở detail.js
 *
 * Hàm core hay dùng:
 *   getDeckOverview()                    → [{ deck, total, due: { new, learning, review } }]
 *   getDeck(id), getCards(deckId)
 *   updateDeck(id, { name, description, newPerDay, color }), deleteDeck(id)
 *   updateCard(id, { term, meaning, reading, example }), deleteCard(id), resetCard(id)
 *   deck.color, DECK_COLORS (models.js)  → màu bìa đã lưu trên bộ; bộ cũ cũng đã có màu khi đọc ra
 *   renderFurigana(text), plainFurigana(text) (furigana.js) → hiện term/example; tìm kiếm không tính phần [..]
 *   STATE_LABELS[card.state]             → 'Mới' | 'Đang học' | 'Học lại' | 'Ôn tập'
 *   describeDue(card)                    → 'Chưa học' | 'Đến hạn' | 'Ngày mai' | 'Sau 5 ngày' ...
 *   routes.study(id), routes.create(id)
 * Lỗi nhập liệu từ updateXxx() là ValidationError — hiện err.message cho người dùng.
 */
import { getDeckOverview } from '../../core/repo.js';
import { routes } from '../../core/routes.js';
import { $, getParam, h, startPage } from '../../core/dom.js';
import { showDeckDetail } from './detail.js';

startPage(async () => {
  const deckId = getParam('deck');
  if (deckId) await showDeckDetail(deckId);
  else await showDeckGrid();
});

async function showDeckGrid() {
  $('#grid-view').hidden = false;
  const overview = await getDeckOverview();

  // A8: chưa có bộ nào. Ẩn nút ở đầu trang để màn hình chỉ có một nút chính.
  if (overview.length === 0) {
    $('#new-deck-link').hidden = true;
    $('#deck-grid').append(
      h('div', { class: 'empty' },
        h('p', { class: 'empty-title' }, 'Chưa có bộ thẻ nào'),
        h('p', { class: 'empty-text' }, 'Tạo bộ đầu tiên để bắt đầu học.'),
        h('a', { class: 'btn btn-primary', href: routes.create() }, '+ Tạo bộ thẻ'),
      ),
    );
    return;
  }

  // A1: lưới bìa, cả bìa là một link tới chi tiết bộ
  $('#deck-grid').append(
    h('div', { class: 'album-grid' }, overview.map(deckCover)),
  );
}

function deckCover({ deck, total, due }) {
  const dueCount = due.new + due.learning + due.review;
  return h('a', { class: `cover cover-${deck.color}`, href: routes.album(deck.id) },
    h('span', { class: 'cover-mark', 'aria-hidden': 'true' }, [...deck.name][0]),
    h('span', { class: 'cover-title' }, deck.name),
    deck.description && h('span', { class: 'cover-text' }, deck.description),
    h('span', { class: 'cover-meta' },
      dueCount > 0 && h('span', { class: 'cover-badge' }, `${dueCount} cần học`),
      `${total} thẻ`,
    ),
  );
}

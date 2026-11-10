/**
 * ALBUM (pages/album/) — phụ trách: Thành viên 2
 * Việc cần làm: docs/tasks.md, mục "Album" (A1–A8).
 *
 * Trang có 2 chế độ:
 *   pages/album/             → lưới các bộ thẻ (#grid-view)
 *   pages/album/?deck=<id>   → chi tiết một bộ (#detail-view)
 *
 * Hàm core hay dùng:
 *   getDeckOverview()                    → [{ deck, total, due: { new, learning, review } }]
 *   getDeck(id), getCards(deckId)
 *   updateDeck(id, { name, description, newPerDay }), deleteDeck(id)
 *   updateCard(id, { front, back }), deleteCard(id), resetCard(id)
 *   STATE_LABELS[card.state]             → 'Mới' | 'Đang học' | 'Học lại' | 'Ôn tập'
 *   describeDue(card)                    → 'Chưa học' | 'Đến hạn' | 'Ngày mai' | 'Sau 5 ngày' ...
 *   routes.study(id), routes.create(id)
 * Lỗi nhập liệu từ updateXxx() là ValidationError — hiện err.message cho người dùng.
 */
import { getCards, getDeck, getDeckOverview } from '../../core/repo.js';
import { STATE_LABELS, describeDue } from '../../core/queue.js';
import { routes } from '../../core/routes.js';
import { $, getParam, h, startPage } from '../../core/dom.js';

startPage(async () => {
  const deckId = getParam('deck');
  if (deckId) await showDeckDetail(deckId);
  else await showDeckGrid();
});

// Thứ tự màu bìa (docs/design.md › Màu bìa bộ thẻ). Sau L6 đổi sang deck.color.
const COVER_COLORS = ['pink', 'peach', 'yellow', 'green', 'sky', 'lavender'];

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
    h('div', { class: 'album-grid' }, overview.map((item, i) => deckCover(item, COVER_COLORS[i % COVER_COLORS.length]))),
  );
}

function deckCover({ deck, total, due }, color) {
  const dueCount = due.new + due.learning + due.review;
  return h('a', { class: `cover cover-${color}`, href: routes.album(deck.id) },
    h('span', { class: 'cover-mark', 'aria-hidden': 'true' }, [...deck.name][0]),
    h('span', { class: 'cover-title' }, deck.name),
    deck.description && h('span', { class: 'cover-text' }, deck.description),
    h('span', { class: 'cover-meta' },
      dueCount > 0 && h('span', { class: 'cover-badge' }, `${dueCount} cần học`),
      `${total} thẻ`,
    ),
  );
}

async function showDeckDetail(deckId) {
  $('#detail-view').hidden = false;
  const deck = await getDeck(deckId);
  if (!deck) {
    // TODO A8: thông báo đẹp hơn + link về lưới
    $('#deck-header').append(h('p', { class: 'demo' }, 'Không tìm thấy bộ thẻ này.'));
    return;
  }
  const cards = await getCards(deckId);

  // TODO A2: tiêu đề, mô tả, nút "Học ngay" (routes.study) và "Thêm thẻ" (routes.create)
  // TODO A2 · A3: lưới thẻ vào #card-list, bấm để lật, badge trạng thái + hạn ôn
  // TODO A4: sửa / xóa thẻ · A5: sửa / xóa bộ · A6: tìm kiếm, lọc, sắp xếp

  // ---------- DEMO — xóa khi làm thật ----------
  $('#deck-header').append(h('p', { class: 'demo' }, `${deck.name} — ${cards.length} thẻ`));
  $('#card-list').append(
    h('ul', { class: 'demo' },
      cards.slice(0, 5).map((card) =>
        h('li', {},
          h('span', { class: `badge badge-${card.state}` }, STATE_LABELS[card.state]),
          ` ${card.front} → ${card.back} (${describeDue(card)})`,
        ),
      ),
    ),
  );
}

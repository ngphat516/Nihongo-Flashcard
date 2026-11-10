/**
 * ALBUM — chế độ chi tiết một bộ (pages/album/?deck=<id>).
 *   A2 đầu trang + lưới thẻ lật · A3 badge trạng thái + hạn ôn · A4 sửa / xóa thẻ
 *   A5 sửa / xóa bộ · A6 tìm, lọc, sắp xếp · A7 học lại từ đầu · A8 sai id, bộ chưa có thẻ
 */
import {
  deleteCard,
  deleteDeck,
  getCards,
  getDeck,
  getDeckOverview,
  resetCard,
  updateCard,
  updateDeck,
} from '../../core/repo.js';
import { ValidationError } from '../../core/models.js';
import { STATE_LABELS, describeDue } from '../../core/queue.js';
import { routes } from '../../core/routes.js';
import { $, h } from '../../core/dom.js';
import { confirmAction, openForm, toast } from './ui.js';

// Nội dung hai mặt thẻ. L6 đổi Card sang term / meaning / reading...: chỉ cần sửa 2 hàm này.
const cardFront = (card) => card.front;
const cardBack = (card) => card.back;

// Chip "Đang học" gồm cả thẻ Học lại (quên khi đang ôn).
const FILTERS = {
  all: () => true,
  new: (card) => card.state === 'new',
  learning: (card) => card.state === 'learning' || card.state === 'relearning',
  review: (card) => card.state === 'review',
};

// Sắp đến hạn: thẻ đã học xếp theo hạn ôn, thẻ mới (chưa có hạn) xếp cuối.
const SORTS = {
  created: (a, b) => b.createdAt - a.createdAt,
  due: (a, b) => (a.state === 'new') - (b.state === 'new') || a.due - b.due || a.createdAt - b.createdAt,
};

const view = { deck: null, cards: [], filter: 'all', sort: 'created', query: '' };

export async function showDeckDetail(deckId) {
  $('#detail-view').hidden = false;
  const deck = await getDeck(deckId);

  // A8: id sai hoặc bộ đã bị xóa
  if (!deck) {
    $('.back-link').hidden = true;
    $('#card-list').append(
      h('div', { class: 'empty' },
        h('p', { class: 'empty-title' }, 'Không tìm thấy bộ thẻ'),
        h('p', { class: 'empty-text' }, 'Bộ thẻ này đã bị xóa hoặc đường dẫn không đúng.'),
        h('a', { class: 'btn btn-primary', href: routes.album() }, '← Về tất cả bộ thẻ'),
      ),
    );
    return;
  }

  view.deck = deck;
  view.cards = await getCards(deckId);
  document.title = `${deck.name} · Album · Nhớ Lâu`;
  setupToolbar();
  await renderHeader();
  renderCards();
}

// ============================ Đầu trang (A2, A5) ============================

async function renderHeader() {
  const { deck, cards } = view;
  const overview = (await getDeckOverview()).find((item) => item.deck.id === deck.id);
  const due = overview?.due ?? { new: 0, learning: 0, review: 0 };
  const hasCards = cards.length > 0;

  // Bọc trong h() để các phần `điều kiện && …` bằng false bị bỏ qua (replaceChildren sẽ in ra chữ "false")
  $('#deck-header').replaceChildren(h('div', {},
    h('div', { class: 'page-head' },
      h('h1', { class: 'page-title album-title' }, deck.name),
      h('div', { class: 'row album-actions' },
        // Một nút chính mỗi màn hình: bộ chưa có thẻ thì nút chính là "Thêm thẻ đầu tiên" ở dưới
        hasCards && h('a', { class: 'btn btn-primary', href: routes.study(deck.id) }, 'Học ngay'),
        h('a', { class: 'btn', href: routes.create(deck.id) }, '+ Thêm thẻ'),
        h('button', { class: 'btn btn-ghost', type: 'button', onClick: editDeck }, 'Sửa bộ'),
        h('button', { class: 'btn btn-ghost album-danger', type: 'button', onClick: removeDeck }, 'Xóa bộ'),
      ),
    ),
    deck.description && h('p', { class: 'album-description' }, deck.description),
    hasCards && h('div', { class: 'row album-summary' },
      h('span', { class: 'muted' }, `${cards.length} thẻ · Hôm nay cần học:`),
      h('div', { class: 'counts' },
        countItem('new', due.new, 'Mới'),
        countItem('learning', due.learning, 'Đang học'),
        countItem('review', due.review, 'Đến hạn'),
      ),
    ),
  ));
}

function countItem(state, n, label) {
  return h('span', { class: `count count-${state}${n === 0 ? ' is-zero' : ''}` }, h('b', {}, n), ` ${label}`);
}

async function editDeck() {
  const { deck } = view;
  const saved = await openForm($('#deck-dialog'), {
    values: { name: deck.name, description: deck.description, newPerDay: deck.newPerDay },
    save: (data) => {
      // Ô số để trống: Number('') === 0 sẽ âm thầm tắt thẻ mới (lỗi B2), nên chặn ở đây
      if (data.newPerDay.trim() === '') throw new ValidationError('Hãy nhập số thẻ mới mỗi ngày (0 nếu không muốn học thẻ mới).');
      return updateDeck(deck.id, data);
    },
  });
  if (!saved) return;
  view.deck = saved;
  document.title = `${saved.name} · Album · Nhớ Lâu`;
  await renderHeader();
  toast('Đã lưu bộ thẻ');
}

async function removeDeck() {
  const { deck, cards } = view;
  const ok = await confirmAction({
    title: `Xóa bộ thẻ “${deck.name}”?`,
    text: `Toàn bộ ${cards.length} thẻ trong bộ sẽ bị xóa. Lịch sử ôn vẫn được giữ.`,
    okLabel: 'Xóa bộ',
  });
  if (!ok) return;
  await deleteDeck(deck.id);
  location.href = routes.album();
}

// ========================= Tìm, lọc, sắp xếp (A6) ==========================

function setupToolbar() {
  $('#card-search').addEventListener('input', (event) => {
    view.query = fold(event.target.value.trim());
    renderCards();
  });
  $('#state-filter').addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    for (const other of $('#state-filter').querySelectorAll('.chip')) {
      other.setAttribute('aria-pressed', String(other === chip));
    }
    view.filter = chip.dataset.filter;
    renderCards();
  });
  $('#card-sort').addEventListener('change', (event) => {
    view.sort = event.target.value;
    renderCards();
  });
}

/** Chữ thường, bỏ dấu tiếng Việt: "Thuật Toán" → "thuat toan". Chỉ bỏ dấu Latin, giữ nguyên dakuten của kana. */
function fold(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

function visibleCards() {
  const { cards, filter, sort, query } = view;
  return cards
    .filter(FILTERS[filter])
    .filter((card) => !query || fold(`${cardFront(card)}\n${cardBack(card)}`).includes(query))
    .sort(SORTS[sort]);
}

// =========================== Lưới thẻ (A2, A3) =============================

function renderCards() {
  const { deck, cards } = view;
  const hasCards = cards.length > 0;
  $('#card-toolbar').hidden = !hasCards;
  $('#card-count').hidden = !hasCards;

  // A8: bộ chưa có thẻ
  if (!hasCards) {
    $('#card-list').replaceChildren(
      h('div', { class: 'empty' },
        h('p', { class: 'empty-title' }, 'Bộ này chưa có thẻ nào'),
        h('p', { class: 'empty-text' }, 'Thêm thẻ để bắt đầu học.'),
        h('a', { class: 'btn btn-primary', href: routes.create(deck.id) }, '+ Thêm thẻ đầu tiên'),
      ),
    );
    return;
  }

  const shown = visibleCards();
  $('#card-count').textContent = shown.length === cards.length
    ? `${cards.length} thẻ`
    : `Hiện ${shown.length} / ${cards.length} thẻ`;
  $('#card-list').replaceChildren(
    shown.length
      ? h('ul', { class: 'album-cards' }, shown.map(cardItem))
      : h('p', { class: 'muted album-no-match' }, 'Không có thẻ nào khớp. Thử bỏ bớt bộ lọc hoặc từ khóa.'),
  );
}

function cardItem(card) {
  const flashcard = h('button', {
    class: 'flashcard',
    type: 'button',
    'aria-pressed': 'false',
    onClick: () => {
      const flipped = flashcard.classList.toggle('is-flipped');
      flashcard.setAttribute('aria-pressed', String(flipped));
    },
  },
    h('span', { class: 'flashcard-inner' },
      h('span', { class: 'flashcard-face flashcard-front' },
        h('span', { class: 'visually-hidden' }, 'Mặt trước: '), cardFront(card)),
      h('span', { class: 'flashcard-face flashcard-back' },
        h('span', { class: 'visually-hidden' }, 'Mặt sau: '), cardBack(card)),
    ),
  );

  return h('li', { class: 'album-card' },
    flashcard,
    h('div', { class: 'album-card-meta' },
      h('span', { class: `badge badge-${card.state}` }, STATE_LABELS[card.state]),
      h('span', { class: 'muted' }, describeDue(card)),
    ),
    h('div', { class: 'album-card-actions' },
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onClick: () => editCard(card) }, 'Sửa'),
      card.state !== 'new' &&
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onClick: () => restartCard(card) }, 'Học lại từ đầu'),
      h('button', { class: 'btn btn-ghost btn-sm album-danger', type: 'button', onClick: () => removeCard(card) }, 'Xóa'),
    ),
  );
}

// ============================ Sửa / xóa thẻ (A4, A7) ============================

async function editCard(card) {
  const saved = await openForm($('#card-dialog'), {
    values: { front: cardFront(card), back: cardBack(card) },
    save: (data) => updateCard(card.id, data),
  });
  if (!saved) return;
  replaceCard(saved);
  toast('Đã lưu thẻ');
}

async function removeCard(card) {
  const ok = await confirmAction({
    title: 'Xóa thẻ này?',
    text: `“${preview(cardFront(card))}” sẽ bị xóa khỏi bộ. Lịch sử ôn vẫn được giữ.`,
    okLabel: 'Xóa thẻ',
  });
  if (!ok) return;
  await deleteCard(card.id);
  view.cards = view.cards.filter((c) => c.id !== card.id);
  renderCards();
  await renderHeader();
  toast('Đã xóa thẻ');
}

async function restartCard(card) {
  const ok = await confirmAction({
    title: 'Học lại thẻ này từ đầu?',
    text: `“${preview(cardFront(card))}” sẽ về trạng thái Mới, mất tiến độ ôn hiện tại.`,
    okLabel: 'Học lại từ đầu',
  });
  if (!ok) return;
  replaceCard(await resetCard(card.id));
  await renderHeader();
  toast('Thẻ đã về trạng thái Mới');
}

function replaceCard(next) {
  view.cards = view.cards.map((c) => (c.id === next.id ? next : c));
  renderCards();
}

const preview = (text) => (text.length > 40 ? `${text.slice(0, 40)}…` : text);

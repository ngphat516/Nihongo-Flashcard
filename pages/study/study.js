/**
 * HỌC (pages/study/) — phụ trách: Thành viên 4
 * Việc cần làm: docs/tasks.md, mục "Học" (S1–S8).
 *
 *   pages/study/             → chọn bộ để học (#deck-picker)
 *   pages/study/?deck=<id>   → buổi học (#session), học xong → #done-screen
 *
 * Hàm core hay dùng:
 *   getStudyQueue(deckId, { lastCardId })  → { deck, card, counts: { new, learning, review }, nextLearningAt }
 *                                            card === null nghĩa là đã học xong
 *   previewRatings(card)                   → { 1: { label: '1 phút' }, 2: {...}, 3: {...}, 4: { label: '4 ngày' } }
 *   reviewCard(cardId, rating, { timeMs }) → { card, log, undo }   (rating: 1 Lại · 2 Khó · 3 Tốt · 4 Dễ)
 *   RATING_LABELS                          → { 1: 'Lại', 2: 'Khó', 3: 'Tốt', 4: 'Dễ' }
 *   getDeckOverview()                      → cho màn chọn bộ (S1)
 *
 * Gợi ý vòng học (S2–S7):
 *
 *   let current = null, shownAt = 0, lastCardId = null, lastUndo = null;
 *
 *   async function next() {
 *     const q = await getStudyQueue(deckId, { lastCardId });
 *     if (!q.card) return showDone(q.nextLearningAt);
 *     current = q.card; shownAt = Date.now();
 *     showFront(q.card, q.counts);                         // ẩn đáp án + 4 nút
 *   }
 *
 *   function flip() { showBack(current, previewRatings(current)); }   // hiện đáp án + 4 nút
 *
 *   async function answer(rating) {
 *     const { undo } = await reviewCard(current.id, rating, { timeMs: Date.now() - shownAt });
 *     lastUndo = undo; lastCardId = current.id;
 *     await next();
 *   }
 *
 *   async function undoLast() {
 *     if (!lastUndo) return;
 *     await lastUndo(); lastUndo = null; lastCardId = null;
 *     await next();   // thẻ vừa hoàn tác sẽ hiện lại
 *   }
 */
import { getDeckOverview, getStudyQueue } from '../../core/repo.js';
import { RATING_LABELS, previewRatings } from '../../core/scheduler.js';
import { routes } from '../../core/routes.js';
import { $, getParam, h, startPage } from '../../core/dom.js';

startPage(async () => {
  const deckId = getParam('deck');
  if (!deckId) return showDeckPicker();
  return startSession(deckId);
});

async function showDeckPicker() {
  $('#deck-picker').hidden = false;
  const overview = await getDeckOverview();

  // TODO S1: danh sách bộ còn thẻ cần học, bấm → routes.study(deck.id)

  // ---------- DEMO — xóa khi làm thật ----------
  $('#deck-list').append(
    h('ul', { class: 'demo' },
      overview.map(({ deck, due }) =>
        h('li', {}, h('a', { href: routes.study(deck.id) }, deck.name), ` — cần học ${due.new + due.learning + due.review} thẻ`),
      ),
    ),
  );
}

async function startSession(deckId) {
  $('#session').hidden = false;
  const queue = await getStudyQueue(deckId);

  // TODO S2–S9: làm theo "Gợi ý vòng học" ở đầu file

  // ---------- DEMO — xóa khi làm thật ----------
  const { deck, card, counts } = queue;
  $('#study-bar').append(
    h('p', { class: 'demo' }, `${deck.name} · mới ${counts.new} · đang học ${counts.learning} · đến hạn ${counts.review}`),
  );
  if (!card) {
    $('#card-stage').append(h('p', { class: 'demo' }, 'Hết thẻ cần học.'));
    return;
  }
  const preview = previewRatings(card);
  $('#card-stage').append(h('p', { class: 'demo' }, `Mặt trước: ${card.front}`));
  $('#answer-bar').append(
    h('p', { class: 'demo' }, [1, 2, 3, 4].map((r) => `${RATING_LABELS[r]}: ${preview[r].label}`).join(' · ')),
  );
}

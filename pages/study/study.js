/**
 * Học (pages/study/): chọn bộ, lật thẻ, chấm điểm, hoàn tác.
 *
 * getStudyQueue() chọn thẻ đến lượt học; reviewCard() lưu lượt ôn và cung cấp undo().
 * renderFurigana() hiển thị từ và ví dụ có chú âm, getDeckOverview() cung cấp màu bìa.
 */
import { $, getParam, h, startPage } from '../../core/dom.js';
import { renderFurigana } from '../../core/furigana.js';
import { NotFoundError } from '../../core/models.js';
import { getCards, getStudyQueue, reviewCard, updateDeck } from '../../core/repo.js';
import { routes } from '../../core/routes.js';
import { createStudyFeedback } from './feedback.js';
import { showDeckPicker } from './picker.js';
import { bindStudyShortcuts } from './shortcuts.js';
import { browsableCards, countItems, renderRatingButtons } from './queue-view.js';

const clock = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' });

let feedback;
startPage(async () => {
  feedback = createStudyFeedback();
  const deckId = getParam('deck');
  if (deckId) await startSession(deckId);
  else await loadDeckPicker();
});

async function loadDeckPicker() {
  feedback.loading('Đang tải các bộ thẻ…');
  try {
    await showDeckPicker();
    feedback.settled();
  } catch (error) {
    feedback.failed(error, loadDeckPicker);
  }
}

async function startSession(deckId) {
  const session = $('#session');
  const done = $('#done-screen');
  const empty = $('#empty-deck');
  $('#empty-add').href = routes.create(deckId);
  const stage = $('#card-stage');
  const front = $('#card-front');
  const back = $('#card-back');
  const term = $('.study-card-text', front);
  const answerText = $('.study-card-answer', back);
  const ratings = $('#rating-buttons');
  const previousCard = $('#previous-card');
  const nextCard = $('#next-card');
  const cardPosition = $('#card-position');
  const undoButtons = [$('#undo-session'), $('#undo-done')];
  $('#exit-session').href = routes.study();
  $('#done-home').href = routes.home();

  const reviewedCards = new Set();
  let studyMs = 0;
  let current = null;
  let cardsToBrowse = [];
  let cardIndex = 0;
  let shownAt = 0;
  let revealed = false;
  let lastReview = null;
  let lastCardId = null;
  let busy = false;
  let blocked = false;
  let pendingPreferred = null;
  let wakeTimer;
  let navigationAnimation;
  let direction = 'ja-vi';
  const directionButton = $('#study-direction');

  function updateControls() {
    const locked = busy || blocked;
    for (const button of [stage, directionButton, ...ratings.querySelectorAll('button')]) {
      button.disabled = locked || !current;
    }
    previousCard.disabled = locked || !current || cardIndex === 0;
    nextCard.disabled = locked || !current || cardIndex >= cardsToBrowse.length - 1;
    for (const button of undoButtons) button.disabled = locked || !lastReview;
  }

  function updateUndo() {
    for (const button of undoButtons) button.hidden = !lastReview;
  }

  function showFront(card) {
    navigationAnimation?.cancel();
    current = card;
    shownAt = performance.now();
    revealed = false;
    stage.classList.remove('is-flipped');
    stage.classList.add('is-resetting');
    const reverse = direction === 'vi-ja';
    term.lang = reverse ? 'vi' : 'ja';
    term.replaceChildren(reverse ? document.createTextNode(card.meaning) : renderFurigana(card.term));
    answerText.replaceChildren(
      h('span', { class: 'study-card-text study-card-meaning', lang: reverse ? 'ja' : 'vi' },
        reverse ? renderFurigana(card.term) : card.meaning),
      card.reading && h('span', { class: 'study-card-reading', lang: 'ja' }, card.reading),
      card.example && h('span', { class: 'study-card-example' }, renderFurigana(card.example)),
    );
    front.removeAttribute('aria-hidden');
    back.setAttribute('aria-hidden', 'true');
    cardPosition.textContent = `Thẻ ${cardIndex + 1} / ${cardsToBrowse.length}`;
    previousCard.disabled = cardIndex === 0;
    nextCard.disabled = cardIndex === cardsToBrowse.length - 1;
    renderRatingButtons(ratings, card, answer);
    done.hidden = true;
    session.hidden = false;
    stage.focus({ preventScroll: true });
  }

  function flipCard() {
    if (!current || busy || blocked) return;
    revealed = !revealed;
    stage.classList.remove('is-resetting');
    stage.classList.toggle('is-flipped', revealed);
    front.setAttribute('aria-hidden', String(revealed));
    back.setAttribute('aria-hidden', String(!revealed));
  }

  function moveCard(offset) {
    const nextIndex = cardIndex + offset;
    if (busy || blocked || !current || nextIndex < 0 || nextIndex >= cardsToBrowse.length) return;
    cardIndex = nextIndex;
    showFront(cardsToBrowse[cardIndex]);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Chỉ xoay khung ngoài khi đổi thẻ, mặt thẻ bên trong vẫn lật độc lập.
    navigationAnimation = stage.animate([
      { transform: `perspective(1000px) translateX(${offset * 24}px) rotateY(${offset * -14}deg) scale(0.96)`, opacity: 0.35 },
      { transform: 'perspective(1000px) translateX(0) rotateY(0deg) scale(1)', opacity: 1 },
    ], { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  }

  function showDone(nextLearningAt) {
    session.hidden = true;
    done.hidden = false;
    const seconds = Math.floor(studyMs / 1000);
    const duration = seconds < 60 ? `${seconds} giây` : `${Math.floor(seconds / 60)} phút ${seconds % 60} giây`;
    $('#session-summary').textContent = `${reviewedCards.size} thẻ đã học · ${duration}`;

    const returnTime = $('#return-time');
    returnTime.hidden = nextLearningAt == null;
    if (nextLearningAt != null) {
      const date = new Date(nextLearningAt);
      const time = h('time', { datetime: date.toISOString() }, clock.format(date));
      returnTime.replaceChildren('Quay lại lúc ', time);
      // Đọc lại hàng đợi khi thẻ đến hạn, giữ thống kê của phiên hiện tại.
      const delay = Math.max(0, nextLearningAt - Date.now());
      wakeTimer = setTimeout(reloadQueue, Math.min(delay, 2_147_483_647));
    }
    $('#done-title').focus();
  }

  async function loadQueue(preferredCard) {
    clearTimeout(wakeTimer);
    const now = Date.now();
    const queue = await getStudyQueue(deckId, { now, lastCardId });
    const cards = await getCards(deckId);
    current = null;
    empty.hidden = cards.length > 0;
    if (cards.length === 0) {
      session.hidden = true;
      done.hidden = true;
      $('#empty-title').focus();
      return;
    }
    const card = preferredCard ?? pendingPreferred ?? queue.card;
    if (card) {
      cardsToBrowse = browsableCards(cards, queue.counts.new, now, lastCardId);
      cardIndex = cardsToBrowse.findIndex((item) => item.id === card.id);
      if (cardIndex === -1) {
        cardsToBrowse.unshift(card);
        cardIndex = 0;
      }
    }
    direction = queue.deck.direction;
    directionButton.textContent = direction === 'vi-ja' ? 'Việt → Nhật' : 'Nhật → Việt';
    $('#deck-name').textContent = queue.deck.name;
    $('#study-counts').replaceChildren(...countItems(queue.counts));
    if (card) showFront(card);
    else showDone(queue.nextLearningAt);
    pendingPreferred = null;
  }

  async function run(action, {
    message = 'Đang tải thẻ…', write = false, refresh = false, cardAction = null,
  } = {}) {
    if (busy) return;
    busy = true;
    feedback.loading(message);
    updateControls();
    let confirmed = false;
    try {
      await action();
      confirmed = write;
      if (refresh) {
        feedback.loading('Đang tải thẻ…');
        await loadQueue();
      }
      blocked = false;
      feedback.settled();
    } catch (error) {
      blocked = true;
      clearTimeout(wakeTimer);
      // Chỉ mất thẻ đang chấm/hoàn tác: giữ thống kê và đọc lại bộ còn tồn tại.
      if (error instanceof NotFoundError && cardAction && !confirmed) {
        write = false; // Không tìm thấy thẻ: thao tác ghi đã bị từ chối.
        pendingPreferred = null;
        if (cardAction === 'undo') lastReview = null;
        try {
          await loadQueue();
          blocked = false;
          feedback.failed(error, null);
          return;
        } catch (reloadError) {
          error = reloadError;
        }
      }
      if (error instanceof NotFoundError) {
        current = null;
        session.hidden = done.hidden = empty.hidden = true;
        try {
          await showDeckPicker();
          feedback.failed(error, null);
        } catch (pickerError) {
          feedback.failed(pickerError, loadDeckPicker);
        }
        return;
      }
      feedback.failed(error, reloadQueue, { write, confirmed });
    } finally {
      busy = false;
      updateUndo();
      updateControls();
      if (!blocked && current) stage.focus({ preventScroll: true });
    }
  }

  function reloadQueue() {
    return run(loadQueue);
  }

  function answer(rating) {
    if (!current || blocked) return;
    return run(async () => {
      const card = current;
      const timeMs = Math.round(performance.now() - shownAt);
      const wasReviewed = reviewedCards.has(card.id);
      const { undo } = await reviewCard(card.id, rating, { timeMs });
      lastReview = { timeMs, wasReviewed, undo };
      lastCardId = card.id;
      reviewedCards.add(card.id);
      studyMs += timeMs;
    }, { message: 'Đang lưu lượt chấm…', write: true, refresh: true, cardAction: 'review' });
  }

  function undoLast() {
    if (!lastReview || blocked) return;
    return run(async () => {
      const { timeMs, wasReviewed, undo } = lastReview;
      const card = await undo();
      pendingPreferred = card;
      if (!wasReviewed) reviewedCards.delete(card.id);
      studyMs -= timeMs;
      lastReview = null;
      lastCardId = null;
    }, { message: 'Đang hoàn tác…', write: true, refresh: true, cardAction: 'undo' });
  }

  directionButton.addEventListener('keydown', (event) => {
    if (event.key === ' ') event.stopPropagation();
  });
  directionButton.addEventListener('click', () => {
    if (blocked) return;
    return run(async () => {
      const deck = await updateDeck(deckId, {
        direction: direction === 'ja-vi' ? 'vi-ja' : 'ja-vi',
      });
      direction = deck.direction;
      directionButton.textContent = direction === 'vi-ja' ? 'Việt → Nhật' : 'Nhật → Việt';
      if (current) showFront(current);
    }, { message: 'Đang lưu chiều học…', write: true });
  });
  stage.addEventListener('click', flipCard);
  previousCard.addEventListener('click', () => moveCard(-1));
  nextCard.addEventListener('click', () => moveCard(1));
  for (const button of undoButtons) button.addEventListener('click', undoLast);

  bindStudyShortcuts({
    session, isLocked: () => busy || blocked, hasCard: () => !!current, canUndo: () => !!lastReview,
    flipCard, moveCard, answer, undoLast,
  });

  await reloadQueue();
}

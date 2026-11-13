import { $, getParam, h, startPage } from '../../core/dom.js';
import { NotFoundError } from '../../core/models.js';
import { LEARN_AHEAD_MS, isLearning } from '../../core/queue.js';
import { getCards, getDeckOverview, getStudyQueue, reviewCard } from '../../core/repo.js';
import { routes } from '../../core/routes.js';
import { Rating, RATINGS, RATING_LABELS, previewRatings } from '../../core/scheduler.js';

const countLabels = { new: 'Mới', learning: 'Đang học', review: 'Đến hạn' };
// Cùng thứ tự với Album cho tới khi L6 lưu màu trên từng bộ thẻ.
const COVER_COLORS = ['pink', 'peach', 'yellow', 'green', 'sky', 'lavender'];
const ratingClasses = {
  [Rating.AGAIN]: 'btn-again',
  [Rating.HARD]: 'btn-hard',
  [Rating.GOOD]: 'btn-good',
  [Rating.EASY]: 'btn-easy',
};
const clock = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' });
const japaneseText = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

startPage(async () => {
  const deckId = getParam('deck');
  if (deckId) await startSession(deckId);
  else await showDeckPicker();
});

function countItems(counts) {
  return Object.entries(countLabels).map(([state, label]) => {
    const count = counts[state];
    return h('span', { class: `count count-${state}${count === 0 ? ' is-zero' : ''}` },
      h('b', {}, count), h('span', {}, label));
  });
}

function setCardText(face, text) {
  const content = $('.study-card-text', face);
  content.textContent = text;
  if (japaneseText.test(text)) content.lang = 'ja';
  else content.removeAttribute('lang');
}

function browsableCards(cards, newLimit, now, lastCardId) {
  const learning = cards.filter(isLearning).sort((a, b) => a.due - b.due);
  const reviews = cards.filter((card) => card.state === 'review' && card.due <= now);
  reviews.sort((a, b) => a.due - b.due);

  return [
    ...learning.filter((card) => card.due <= now),
    ...reviews,
    ...cards.filter((card) => card.state === 'new').slice(0, newLimit),
    ...learning.filter((card) =>
      card.due > now && card.due <= now + LEARN_AHEAD_MS && card.id !== lastCardId),
  ];
}

async function showDeckPicker() {
  const overview = await getDeckOverview();
  const list = $('#deck-list');

  if (overview.length === 0) {
    list.replaceChildren(h('div', { class: 'empty' },
      h('p', { class: 'empty-title' }, 'Bạn chưa có bộ thẻ nào để học.'),
      h('a', { class: 'btn btn-primary', href: routes.create() }, 'Tạo bộ thẻ'),
    ));
  } else {
    list.replaceChildren(h('ul', { class: 'study-decks' }, overview.map(({ deck, due }, index) => {
      const color = COVER_COLORS[index % COVER_COLORS.length];
      const total = Object.values(due).reduce((sum, count) => sum + count, 0);
      return h('li', {}, h('a', {
        class: `cover cover-${color} study-deck${total === 0 ? ' is-zero' : ''}`,
        href: routes.study(deck.id),
      },
      h('span', { class: 'study-deck-heading' },
        h('strong', {}, deck.name),
        h('span', { class: 'study-deck-arrow', 'aria-hidden': 'true' }, '→')),
      h('span', { class: 'study-deck-total' },
        total ? `${total} thẻ cần học` : 'Không có thẻ cần học'),
      h('span', { class: 'counts' }, countItems(due))));
    })));
  }

  $('#deck-picker').hidden = false;
}

async function startSession(deckId) {
  const session = $('#session');
  const done = $('#done-screen');
  const stage = $('#card-stage');
  const front = $('#card-front');
  const back = $('#card-back');
  const ratings = $('#rating-buttons');
  const previousCard = $('#previous-card');
  const nextCard = $('#next-card');
  const cardPosition = $('#card-position');
  const undoButtons = [$('#undo-session'), $('#undo-done')];
  const errorBox = $('#study-error');
  const retryButton = $('#retry-queue');
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
  let restoredCard = null;
  let busy = false;
  let wakeTimer;

  function showError(error) {
    errorBox.textContent = error.message;
    errorBox.hidden = false;
  }

  function updateUndo() {
    for (const button of undoButtons) button.hidden = !lastReview;
  }

  function showFront(card) {
    current = card;
    shownAt = performance.now();
    revealed = false;
    stage.classList.remove('is-flipped');
    stage.classList.add('is-resetting');
    setCardText(front, card.front);
    setCardText(back, card.back);
    front.removeAttribute('aria-hidden');
    back.setAttribute('aria-hidden', 'true');
    cardPosition.textContent = `Thẻ ${cardIndex + 1} / ${cardsToBrowse.length}`;
    previousCard.disabled = cardIndex === 0;
    nextCard.disabled = cardIndex === cardsToBrowse.length - 1;
    renderRatings(card);
    done.hidden = true;
    session.hidden = false;
    stage.focus({ preventScroll: true });
  }

  function flipCard() {
    if (!current || busy) return;
    revealed = !revealed;
    stage.classList.remove('is-resetting');
    stage.classList.toggle('is-flipped', revealed);
    front.setAttribute('aria-hidden', String(revealed));
    back.setAttribute('aria-hidden', String(!revealed));
  }

  function renderRatings(card) {
    const preview = previewRatings(card);
    ratings.replaceChildren(...RATINGS.map((rating) => h('button', {
      class: `btn ${ratingClasses[rating]}`,
      type: 'button',
      'aria-keyshortcuts': String(rating),
      onClick: () => answer(rating),
    },
    h('span', {}, RATING_LABELS[rating]),
    h('small', {}, preview[rating].label))));
  }

  function moveCard(offset) {
    const nextIndex = cardIndex + offset;
    if (busy || !current || nextIndex < 0 || nextIndex >= cardsToBrowse.length) return;
    cardIndex = nextIndex;
    showFront(cardsToBrowse[cardIndex]);
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

  async function loadQueue() {
    clearTimeout(wakeTimer);
    current = null;
    try {
      const now = Date.now();
      const queue = await getStudyQueue(deckId, { now, lastCardId });
      const card = restoredCard ?? queue.card;
      if (card) {
        const cards = await getCards(deckId);
        cardsToBrowse = browsableCards(cards, queue.counts.new, now, lastCardId);
        cardIndex = cardsToBrowse.findIndex((item) => item.id === card.id);
        if (cardIndex === -1) {
          cardsToBrowse.unshift(card);
          cardIndex = 0;
        }
      }
      $('#deck-name').textContent = queue.deck.name;
      $('#study-counts').replaceChildren(...countItems(queue.counts));
      restoredCard = null;
      if (card) showFront(card);
      else showDone(queue.nextLearningAt);
    } catch (error) {
      session.hidden = true;
      done.hidden = true;
      if (!(error instanceof NotFoundError)) {
        showError(error);
        retryButton.hidden = false;
        retryButton.focus();
        return;
      }
      showError(error);
      await showDeckPicker();
    }
  }

  async function run(action) {
    if (busy) return;
    busy = true;
    errorBox.hidden = true;
    retryButton.hidden = true;
    try {
      await action();
    } catch (error) {
      showError(error);
    } finally {
      busy = false;
      updateUndo();
    }
  }

  function reloadQueue() {
    return run(loadQueue);
  }

  function answer(rating) {
    if (!current) return;
    return run(async () => {
      const card = current;
      const timeMs = Math.round(performance.now() - shownAt);
      const wasReviewed = reviewedCards.has(card.id);
      const { undo } = await reviewCard(card.id, rating, { timeMs });
      lastReview = { card, timeMs, wasReviewed, undo };
      lastCardId = card.id;
      reviewedCards.add(card.id);
      studyMs += timeMs;
      await loadQueue();
    });
  }

  function undoLast() {
    if (!lastReview) return;
    return run(async () => {
      const { card, timeMs, wasReviewed, undo } = lastReview;
      await undo();
      if (!wasReviewed) reviewedCards.delete(card.id);
      studyMs -= timeMs;
      lastReview = null;
      lastCardId = null;
      // Hiện lại đúng thẻ vừa hoàn tác kể cả khi thẻ khác vừa đến hạn (B3).
      restoredCard = card;
      await loadQueue();
    });
  }

  stage.addEventListener('click', flipCard);
  previousCard.addEventListener('click', () => moveCard(-1));
  nextCard.addEventListener('click', () => moveCard(1));
  retryButton.addEventListener('click', reloadQueue);
  for (const button of undoButtons) button.addEventListener('click', undoLast);

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.isComposing ||
        event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable]')) return;

    if (event.key === ' ' && !session.hidden) {
      event.preventDefault();
      if (!event.repeat) flipCard();
      return;
    }
    if (event.repeat || busy) return;

    if (current && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      moveCard(event.key === 'ArrowLeft' ? -1 : 1);
    } else if (current && RATINGS.includes(Number(event.key))) {
      event.preventDefault();
      answer(Number(event.key));
    } else if (event.key.toLowerCase() === 'z' && lastReview) {
      event.preventDefault();
      undoLast();
    }
  });

  await reloadQueue();
}

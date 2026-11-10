import { $, getParam, h, startPage } from '../../core/dom.js';
import { NotFoundError } from '../../core/models.js';
import { getDeckOverview, getStudyQueue, reviewCard } from '../../core/repo.js';
import { routes } from '../../core/routes.js';
import { Rating, RATINGS, RATING_LABELS, previewRatings } from '../../core/scheduler.js';

const countLabels = { new: 'Mới', learning: 'Đang học', review: 'Đến hạn' };
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
      h('b', {}, count), ` ${label}`);
  });
}

function setCardText(face, text) {
  const content = $('p', face);
  content.textContent = text;
  if (japaneseText.test(text)) content.lang = 'ja';
  else content.removeAttribute('lang');
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
    list.replaceChildren(h('ul', { class: 'study-decks' }, overview.map(({ deck, due }) => {
      const hasCards = Object.values(due).some((count) => count > 0);
      return h('li', {}, h('a', {
        class: hasCards ? 'panel study-deck' : 'panel study-deck is-zero',
        href: routes.study(deck.id),
      },
      h('strong', {}, deck.name),
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
  const revealButton = $('#reveal-card');
  const ratings = $('#rating-buttons');
  const undoButtons = [$('#undo-session'), $('#undo-done')];
  const errorBox = $('#study-error');
  const retryButton = $('#retry-queue');
  $('#exit-session').href = routes.study();
  $('#done-home').href = routes.home();

  const reviewedCards = new Set();
  let studyMs = 0;
  let current = null;
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
    setCardText(back, '');
    front.removeAttribute('aria-hidden');
    back.setAttribute('aria-hidden', 'true');
    ratings.hidden = true;
    revealButton.hidden = false;
    done.hidden = true;
    session.hidden = false;
    revealButton.focus();
  }

  function reveal() {
    if (!current || revealed || busy) return;
    const preview = previewRatings(current);
    setCardText(back, current.back);
    stage.classList.remove('is-resetting');
    stage.classList.add('is-flipped');
    front.setAttribute('aria-hidden', 'true');
    back.removeAttribute('aria-hidden');
    ratings.replaceChildren(...RATINGS.map((rating) => h('button', {
      class: `btn ${ratingClasses[rating]}`,
      type: 'button',
      'aria-keyshortcuts': String(rating),
      onClick: () => answer(rating),
    },
    h('small', {}, preview[rating].label),
    h('span', {}, RATING_LABELS[rating]))));
    revealed = true;
    revealButton.hidden = true;
    ratings.hidden = false;
    ratings.firstElementChild.focus();
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
      const queue = await getStudyQueue(deckId, { lastCardId });
      $('#deck-name').textContent = queue.deck.name;
      $('#study-counts').replaceChildren(...countItems(queue.counts));
      const card = restoredCard ?? queue.card;
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
    if (!current || !revealed) return;
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

  revealButton.addEventListener('click', reveal);
  retryButton.addEventListener('click', reloadQueue);
  for (const button of undoButtons) button.addEventListener('click', undoLast);

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.repeat || event.isComposing || busy ||
        event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable]')) return;

    if (event.key === ' ' && current && !revealed) {
      if (event.target !== revealButton && event.target.closest('button, a')) return;
      event.preventDefault();
      reveal();
    } else if (current && revealed && RATINGS.includes(Number(event.key))) {
      event.preventDefault();
      answer(Number(event.key));
    } else if (event.key.toLowerCase() === 'z' && lastReview) {
      event.preventDefault();
      undoLast();
    }
  });

  await reloadQueue();
}

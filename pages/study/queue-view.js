import { Rating, RATINGS, RATING_LABELS, previewRatings } from '../../core/scheduler.js';
import { h } from '../../core/dom.js';
import { LEARN_AHEAD_MS, isLearning } from '../../core/queue.js';

const countLabels = { new: 'Mới', learning: 'Đang học', review: 'Đến hạn' };

export function countItems(counts) {
  return Object.entries(countLabels).map(([state, label]) => {
    const count = counts[state];
    return h('span', { class: `count count-${state}${count === 0 ? ' is-zero' : ''}` },
      h('b', {}, count), h('span', {}, label));
  });
}

export function browsableCards(cards, newLimit, now, lastCardId) {
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


const ratingClasses = {
  [Rating.AGAIN]: 'btn-again',
  [Rating.HARD]: 'btn-hard',
  [Rating.GOOD]: 'btn-good',
  [Rating.EASY]: 'btn-easy',
};
export function renderRatingButtons(ratings, card, answer) {
  const preview = previewRatings(card);
  ratings.replaceChildren(...RATINGS.map((rating) => h('button', {
    class: `btn ${ratingClasses[rating]}`,
    type: 'button',
    'aria-keyshortcuts': String(rating),
    title: `Nhấn phím ${rating} để chọn “${RATING_LABELS[rating]}”.`,
    onClick: () => answer(rating),
  },
  h('span', {}, RATING_LABELS[rating]),
  h('small', {}, preview[rating].label))));
}


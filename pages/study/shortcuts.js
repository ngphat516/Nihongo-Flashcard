import { RATINGS } from '../../core/scheduler.js';

export function bindStudyShortcuts({ session, isLocked, hasCard, canUndo, flipCard, moveCard, answer, undoLast }) {
  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.isComposing ||
        event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable]')) return;

    if (event.key === ' ' && !session.hidden) {
      event.preventDefault();
      if (!event.repeat) flipCard();
      return;
    }
    if (event.repeat || isLocked()) return;

    if (hasCard() && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      moveCard(event.key === 'ArrowLeft' ? -1 : 1);
    } else if (hasCard() && RATINGS.includes(Number(event.key))) {
      event.preventDefault();
      answer(Number(event.key));
    } else if (event.key.toLowerCase() === 'z' && canUndo()) {
      event.preventDefault();
      undoLast();
    }
  });
}

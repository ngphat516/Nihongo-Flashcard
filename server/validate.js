import { validateCard, validateDeck } from '../core/models.js';
import { isUuid } from './auth/jwt.js';
import { collections } from './db/mapper.js';
import { invalid } from './errors.js';

export function uuid(value) {
  if (!isUuid(value)) throw invalid();
  return value;
}
export function number(value, { integer = false, min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max ||
      (integer && !Number.isSafeInteger(value))) throw invalid();
  return value;
}
export function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  return value;
}
const states = ['new', 'learning', 'review', 'relearning'];
export function validateItem(collection, body, id = body?.id) {
  object(body);
  uuid(id);
  if (body.id !== undefined && body.id !== id) throw invalid();
  const item = Object.fromEntries(collections[collection].fields.map(field => [field, body[field]]));
  item.id = id;
  if (collection === 'reviewLogs') {
    uuid(item.cardId);
    uuid(item.deckId);
    number(item.rating, { integer: true, min: 1, max: 4 });
    if (!states.includes(item.prevState)) throw invalid();
    for (const field of ['prevInterval', 'newInterval', 'prevEase']) number(item[field]);
    number(item.reviewedAt, { integer: true });
    number(item.timeMs, { integer: true, max: 86400000 });
    return item;
  }
  number(item.createdAt, { integer: true });
  number(item.updatedAt, { integer: true });
  if (collection === 'decks') {
    for (const key of ['name', 'description']) if (typeof item[key] !== 'string') throw invalid();
    if (!item.name.trim()) throw invalid();
    validateDeck(item);
  } else {
    uuid(item.deckId);
    for (const key of ['term', 'meaning', 'reading', 'example']) {
      if (typeof item[key] !== 'string') throw invalid();
    }
    if (!item.term.trim() || !item.meaning.trim()) throw invalid();
    // L16 chưa merge: validator hiện tại vẫn yêu cầu jlpt, DB không lưu trường này.
    validateCard({ ...item, jlpt: '' });
    if (!states.includes(item.state)) throw invalid();
    for (const key of ['due', 'step', 'reps', 'lapses']) number(item[key], { integer: true });
    for (const key of ['interval', 'ease']) number(item[key], { max: 1e9 });
    if (item.lastReview !== null) number(item.lastReview, { integer: true });
  }
  if (body.expectedUpdatedAt !== undefined) number(body.expectedUpdatedAt, { integer: true });
  return item;
}

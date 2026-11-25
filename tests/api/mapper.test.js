import assert from 'node:assert/strict';
import { test } from 'node:test';
import { column, fromRow } from '../../server/db/mapper.js';
import { validateItem } from '../../server/validate.js';
import { card, deck, log } from './helpers.js';

test('API: mapper đổi BIGINT thành số, không trả user_id hoặc jlpt', () => {
  const source = deck();
  const row = Object.fromEntries(Object.entries(source).map(([k,v]) => [column(k), v]));
  row.created_at = '1000'; row.updated_at = '1000'; row.user_id = 'private';
  assert.deepEqual(fromRow('decks', row), source);
});
test('API: kiểm tra kiểu, tiến độ, timestamp và log trước khi ghi', () => {
  const d = deck(), c = card(d.id), l = log(c);
  assert.deepEqual(validateItem('cards', { ...c, userId: 'ignored', jlpt: 'N5' }), c);
  for (const [collection, body] of [
    ['decks', { ...d, name: 123 }], ['decks', { ...d, updatedAt: '1000' }],
    ['cards', { ...c, term: [] }], ['cards', { ...c, state: 'other' }],
    ['cards', { ...c, due: Infinity }], ['cards', { ...c, reps: -1 }],
    ['cards', { ...c, lastReview: undefined }], ['cards', { ...c, deckId: 'x' }],
    ['reviewLogs', { ...l, timeMs: 86400001 }], ['reviewLogs', { ...l, rating: 5 }],
    ['reviewLogs', { ...l, prevState: 'other' }],
  ]) assert.throws(() => validateItem(collection, body));
});

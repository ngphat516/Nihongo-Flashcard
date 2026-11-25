// Danh sách cố định cũng là allowlist cột SQL và trường JSON công khai.
const common = ['id', 'createdAt', 'updatedAt'];
export const collections = Object.freeze({
  decks: { table: 'decks', fields: [...common, 'name', 'description', 'newPerDay', 'color', 'direction'] },
  cards: { table: 'cards', fields: [...common, 'deckId', 'term', 'meaning', 'reading', 'example',
    'state', 'due', 'interval', 'ease', 'step', 'reps', 'lapses', 'lastReview'] },
  reviewLogs: { table: 'review_logs', fields: ['id', 'cardId', 'deckId', 'rating', 'prevState',
    'prevInterval', 'newInterval', 'prevEase', 'reviewedAt', 'timeMs'] },
});
export const column = field => field.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase());
const numeric = new Set(['createdAt', 'updatedAt', 'newPerDay', 'due', 'interval', 'ease', 'step',
  'reps', 'lapses', 'lastReview', 'rating', 'prevInterval', 'newInterval', 'prevEase', 'reviewedAt', 'timeMs']);
export function fromRow(collection, row) {
  if (!row) return null;
  return Object.fromEntries(collections[collection].fields.map(field => {
    const value = row[column(field)];
    return [field, value == null || !numeric.has(field) ? value : Number(value)];
  }));
}

import { collections, column, fromRow } from './mapper.js';
import { conflict, notFound } from '../errors.js';

// Tuần tự hóa thay đổi của cùng tài khoản để batch/review/undo không ghi xen kẽ.
export async function lockUser(client, userId) {
  const { rows } = await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
  if (!rows.length) throw notFound();
}
export async function readItem(client, collection, id, userId) {
  const { table } = collections[collection];
  const { rows } = await client.query(`SELECT * FROM ${table} WHERE id = $1 AND user_id = $2`, [id, userId]);
  return fromRow(collection, rows[0]);
}
export async function requireItem(client, collection, id, userId) {
  const item = await readItem(client, collection, id, userId);
  if (!item) throw notFound();
  return item;
}
export async function checkParent(client, collection, item, userId) {
  if (collection === 'cards') await requireItem(client, 'decks', item.deckId, userId);
  // Log nhập lại được phép tham chiếu thẻ/bộ đã xóa, nhưng không được lấy ID của user khác.
  if (collection === 'reviewLogs') {
    for (const [table, id] of [['cards', item.cardId], ['decks', item.deckId]]) {
      const result = await client.query(`SELECT id FROM ${table} WHERE id = $1 AND user_id <> $2`, [id, userId]);
      if (result.rows.length) throw notFound();
    }
  }
}
export async function insertItem(client, collection, item, userId) {
  const { table, fields } = collections[collection];
  const columns = [...fields.map(column), 'user_id'];
  const values = [...fields.map(field => item[field]), userId];
  await client.query(`INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${values.map((_, i) => '$' + (i + 1)).join(', ')}) ON CONFLICT (id) DO NOTHING`, values);
  return requireItem(client, collection, item.id, userId);
}
export async function updateItem(client, collection, item, userId) {
  const { table, fields } = collections[collection];
  const mutable = fields.filter(field => !['id', 'createdAt'].includes(field));
  const result = await client.query(`UPDATE ${table} SET ${mutable.map((f, i) => column(f) + ' = $' + (i + 1)).join(', ')}
    WHERE id = $${mutable.length + 1} AND user_id = $${mutable.length + 2} RETURNING *`,
  [...mutable.map(f => item[f]), item.id, userId]);
  if (!result.rows.length) throw notFound();
  return fromRow(collection, result.rows[0]);
}
export async function putItem(client, collection, item, userId, expected) {
  await checkParent(client, collection, item, userId);
  const current = await readItem(client, collection, item.id, userId);
  if (!current) return insertItem(client, collection, item, userId);
  if (collection === 'reviewLogs') return current;
  if (expected !== undefined && current.updatedAt !== expected) throw conflict();
  return updateItem(client, collection, {
    ...item, createdAt: current.createdAt, updatedAt: Math.max(Date.now(), current.updatedAt + 1),
  }, userId);
}

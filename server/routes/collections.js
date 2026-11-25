import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { query, withTransaction } from '../db/pool.js';
import { collections, fromRow } from '../db/mapper.js';
import { checkParent, insertItem, lockUser, putItem, requireItem } from '../db/records.js';
import { invalid, notFound } from '../errors.js';
import { number, uuid, validateItem } from '../validate.js';

function ids(body) {
  if (!Array.isArray(body?.ids) || body.ids.length > 1000) throw invalid();
  return body.ids.map(uuid);
}
export function createCollectionsRouter() {
  const router = Router();
  router.use(requireAuth);
  router.delete('/me/data', async (req, res) => {
    await withTransaction(async client => {
      await lockUser(client, req.user.id);
      for (const table of ['review_logs', 'cards', 'decks']) {
        await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [req.user.id]);
      }
    });
    res.sendStatus(204);
  });
  router.param('c', (req, res, next, c) => {
    if (!Object.hasOwn(collections, c)) return next(notFound());
    req.collection = collections[c];
    next();
  });
  router.get('/:c', async (req, res) => {
    const params = [req.user.id];
    const filters = ['user_id = $1'];
    if (req.params.c === 'cards' && req.query.deckId !== undefined) {
      const deckId = uuid(req.query.deckId);
      await requireItem({ query }, 'decks', deckId, req.user.id);
      params.push(deckId);
      filters.push('deck_id = $2');
    }
    if (req.params.c === 'reviewLogs') {
      for (const [key, sign] of [['from', '>='], ['to', '<=']]) {
        if (req.query[key] === undefined) continue;
        if (typeof req.query[key] !== 'string' || !/^\d+$/.test(req.query[key])) throw invalid();
        params.push(number(Number(req.query[key]), { integer: true }));
        filters.push(`reviewed_at ${sign} $${params.length}`);
      }
      if (req.query.from !== undefined && req.query.to !== undefined && Number(req.query.from) > Number(req.query.to)) throw invalid();
    }
    const { rows } = await query(`SELECT * FROM ${req.collection.table} WHERE ${filters.join(' AND ')} ORDER BY id`, params);
    res.json({ items: rows.map(row => fromRow(req.params.c, row)) });
  });
  router.get('/:c/:id', async (req, res) => {
    const item = await requireItem({ query }, req.params.c, uuid(req.params.id), req.user.id);
    res.json({ item });
  });
  router.put('/:c/:id', async (req, res) => {
    const item = validateItem(req.params.c, req.body, uuid(req.params.id));
    const saved = await withTransaction(async client => {
      await lockUser(client, req.user.id);
      return putItem(client, req.params.c, item, req.user.id, req.body.expectedUpdatedAt);
    });
    res.json({ item: saved });
  });
  router.post('/:c/batch', async (req, res) => {
    if (!Array.isArray(req.body?.items) || req.body.items.length > 1000) throw invalid();
    const items = req.body.items.map(item => validateItem(req.params.c, item));
    const saved = await withTransaction(async client => {
      await lockUser(client, req.user.id);
      const result = [];
      // Batch nhập dữ liệu chỉ thêm, giữ bản đang có khi gửi lại UUID.
      for (const item of items) {
        await checkParent(client, req.params.c, item, req.user.id);
        result.push(await insertItem(client, req.params.c, item, req.user.id));
      }
      return result;
    });
    res.json({ items: saved });
  });
  async function remove(req, res, selected) {
    await withTransaction(async client => {
      await lockUser(client, req.user.id);
      for (const id of selected) {
        const foreign = await client.query(`SELECT id FROM ${req.collection.table} WHERE id = $1 AND user_id <> $2`, [id, req.user.id]);
        if (foreign.rows.length) throw notFound();
      }
      await client.query(`DELETE FROM ${req.collection.table} WHERE user_id = $1 AND id = ANY($2::uuid[])`, [req.user.id, selected]);
    });
    res.sendStatus(204);
  }
  router.delete('/:c/:id', (req, res) => remove(req, res, [uuid(req.params.id)]));
  router.post('/:c/delete', (req, res) => remove(req, res, ids(req.body)));
  return router;
}

import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { withTransaction } from '../db/pool.js';
import { insertItem, lockUser, readItem, requireItem, updateItem } from '../db/records.js';
import { conflict, invalid, notFound } from '../errors.js';
import { uuid, validateItem } from '../validate.js';

const progress = ['state', 'due', 'interval', 'ease', 'step', 'reps', 'lapses', 'lastReview'];
function withProgress(current, supplied) {
  return { ...current, ...Object.fromEntries(progress.map(key => [key, supplied[key]])),
    updatedAt: Math.max(Date.now(), current.updatedAt + 1) };
}
export function createReviewsRouter() {
  const router = Router();
  router.post('/reviews', requireAuth, async (req, res) => {
    const card = validateItem('cards', req.body?.card);
    const log = validateItem('reviewLogs', req.body?.log);
    if (card.id !== log.cardId || card.deckId !== log.deckId || card.lastReview !== log.reviewedAt ||
        card.interval !== log.newInterval) throw invalid();
    const result = await withTransaction(async client => {
      await lockUser(client, req.user.id);
      const current = await requireItem(client, 'cards', card.id, req.user.id);
      if (current.deckId !== card.deckId) throw invalid();
      const existing = await readItem(client, 'reviewLogs', log.id, req.user.id);
      if (existing) {
        if (existing.cardId !== card.id || existing.deckId !== card.deckId) throw conflict();
        return { card: current, log: existing };
      }
      if ((req.body.expectedUpdatedAt !== undefined && current.updatedAt !== req.body.expectedUpdatedAt) ||
          card.updatedAt < current.updatedAt ||
          card.reps !== current.reps + 1 || log.prevState !== current.state ||
          log.prevInterval !== current.interval || log.prevEase !== current.ease) throw conflict();
      const savedLog = await insertItem(client, 'reviewLogs', log, req.user.id);
      const savedCard = await updateItem(client, 'cards', withProgress(current, card), req.user.id);
      return { card: savedCard, log: savedLog };
    });
    res.json(result);
  });
  router.post('/reviews/:id/undo', requireAuth, async (req, res) => {
    const id = uuid(req.params.id);
    const restored = validateItem('cards', req.body?.restoredCard ?? req.body?.card);
    const card = await withTransaction(async client => {
      await lockUser(client, req.user.id);
      const current = await requireItem(client, 'cards', restored.id, req.user.id);
      const log = await readItem(client, 'reviewLogs', id, req.user.id);
      if (!log) {
        const foreign = await client.query('SELECT id FROM review_logs WHERE id = $1 AND user_id <> $2', [id, req.user.id]);
        if (foreign.rows.length) throw notFound();
        return current;
      }
      if (log.cardId !== restored.id || log.deckId !== restored.deckId || current.deckId !== restored.deckId) throw invalid();
      if (current.lastReview !== log.reviewedAt || current.interval !== log.newInterval ||
          restored.reps !== current.reps - 1 || restored.state !== log.prevState ||
          restored.interval !== log.prevInterval || restored.ease !== log.prevEase) throw conflict();
      await client.query('DELETE FROM review_logs WHERE id = $1 AND user_id = $2', [id, req.user.id]);
      return updateItem(client, 'cards', withProgress(current, restored), req.user.id);
    });
    res.json({ card });
  });
  return router;
}

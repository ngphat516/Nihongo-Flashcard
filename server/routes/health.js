import { Router } from 'express';
import { query } from '../db/pool.js';
export function createHealthRouter() {
  const router = Router();
  router.get('/health', async (req, res) => {
    await query('SELECT 1');
    res.json({ ok: true, db: true });
  });
  return router;
}

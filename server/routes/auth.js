import { Router } from 'express';
import { verifyGoogleIdToken } from '../auth/google.js';
import { clearSessionCookie, setSessionCookie, signSession } from '../auth/jwt.js';
import { requireAuth, unauthorized } from '../auth/middleware.js';
import { createLoginLimiter } from '../auth/rate-limit.js';
import { query, withTransaction } from '../db/pool.js';

function publicUser({ id, email, name, avatar_url }) {
  return { id, email, name, avatarUrl: avatar_url };
}

/** Gắn vào app.use('/api', createAuthRouter()) trước router /:c. */
export function createAuthRouter({ googleClient } = {}) {
  const router = Router();
  router.post('/auth/google', createLoginLimiter(), async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const idToken = req.body?.idToken;
    if (typeof idToken !== 'string' || !idToken.trim()) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Cần có ID token của Google.' } });
    }
    const profile = await verifyGoogleIdToken(idToken, googleClient);
    if (!profile) return unauthorized(res);
    const { user, token } = await withTransaction(async client => {
      const { rows } = await client.query(`
        INSERT INTO users (google_sub, email, name, avatar_url, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (google_sub) DO UPDATE
        SET email = EXCLUDED.email, name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url
        RETURNING id, email, name, avatar_url, token_version`,
        [profile.sub, profile.email, profile.name, profile.avatarUrl, Date.now()]);
      return { user: publicUser(rows[0]), token: signSession(rows[0]) };
    });
    setSessionCookie(res, token);
    return res.json({ user });
  });

  router.post('/auth/logout', (req, res) => {
    res.set('Cache-Control', 'no-store');
    clearSessionCookie(res);
    res.sendStatus(204);
  });

  router.get('/me', requireAuth, async (req, res) => {
    const { rows } = await query('SELECT id, email, name, avatar_url FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) return unauthorized(res);
    return res.json({ user: publicUser(rows[0]) });
  });
  return router;
}

import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../server/index.js';
import { closePool } from '../../server/db/pool.js';
import { startTestDatabase } from '../helpers/postgres.js';

export const USER_A = randomUUID(), USER_B = randomUUID();
export function deck(changes = {}) {
  return { id: randomUUID(), name: 'Bộ kiểm tra', description: '', newPerDay: 20, color: 'pink',
    direction: 'ja-vi', createdAt: 1000, updatedAt: 1000, ...changes };
}
export function card(deckId, changes = {}) {
  return { id: randomUUID(), deckId, term: '約束[やくそく]', meaning: 'lời hứa', reading: '', example: '',
    state: 'new', due: 0, interval: 0, ease: 0, step: 0, reps: 0, lapses: 0, lastReview: null,
    createdAt: 1000, updatedAt: 1000, ...changes };
}
export function log(card, changes = {}) {
  return { id: randomUUID(), cardId: card.id, deckId: card.deckId, rating: 4, prevState: 'new',
    prevInterval: 0, newInterval: 4, prevEase: 0, reviewedAt: 2000, timeMs: 100, ...changes };
}
export async function serve(t) {
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const origin = 'http://127.0.0.1:' + server.address().port;
  return async (path, { user = USER_A, method = 'GET', body, headers = {}, raw } = {}) => {
    const response = await fetch(origin + path, { method, headers: {
      ...(user && { 'X-Dev-User': user }), ...(body !== undefined && { 'Content-Type': 'application/json' }), ...headers,
    }, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: response.status, headers: response.headers, body: data };
  };
}
export async function database(t) {
  const db = await startTestDatabase();
  t.after(async () => { await closePool(); await db.stop(); });
  await db.migrate();
  await db.grantApp();
  for (const id of [USER_A, USER_B]) {
    await db.admin.query('INSERT INTO users (id, google_sub, email, created_at) VALUES ($1,$2,$3,0)',
      [id, id, id + '@example.invalid']);
  }
  process.env.DATABASE_URL = db.appUrl;
  process.env.PGSSLMODE = 'disable';
  process.env.NODE_ENV = 'development';
  process.env.DEV_AUTH = '1';
  return { db, request: await serve(t) };
}

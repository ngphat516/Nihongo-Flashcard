import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { postgresUnavailable } from '../helpers/postgres.js';
import { database, deck, card, log, USER_B } from './helpers.js';
const skip = await postgresUnavailable();

test('API collections: 2 user, CRUD, filter, conflict, rollback, xóa giữ lịch sử', { skip }, async t => {
  const { request } = await database(t);
  const d = deck(), c = card(d.id), l = log(c);
  for (const [collection, item] of [['decks', d], ['cards', c], ['reviewLogs', l]]) {
    assert.equal((await request('/api/' + collection + '/' + item.id, { method: 'PUT', body: item })).status, 200);
    assert.equal((await request('/api/' + collection)).body.items.length, 1);
    assert.equal((await request('/api/' + collection, { user: USER_B })).body.items.length, 0);
    const url = '/api/' + collection + '/' + item.id;
    for (const options of [{}, { method: 'PUT', body: item }, { method: 'DELETE' }]) {
      assert.equal((await request(url, { ...options, user: USER_B })).status, 404);
    }
    assert.equal((await request('/api/' + collection + '/batch', {
      user: USER_B, method: 'POST', body: { items: [item] },
    })).status, 404);
    assert.equal((await request('/api/' + collection + '/delete', {
      user: USER_B, method: 'POST', body: { ids: [item.id] },
    })).status, 404);
    assert.deepEqual((await request(url)).body.item, item);
  }
  assert.equal((await request('/api/cards/' + randomUUID(), {
    user: USER_B, method: 'PUT', body: card(d.id),
  })).status, 400);
  const foreignCard = card(d.id);
  assert.equal((await request('/api/cards/' + foreignCard.id, { user: USER_B, method: 'PUT', body: foreignCard })).status, 404);
  assert.equal((await request('/api/cards?deckId=' + d.id, { user: USER_B })).status, 404);
  assert.equal((await request('/api/cards?deckId=' + d.id)).body.items.length, 1);
  assert.equal((await request('/api/reviewLogs?from=2000&to=2000')).body.items.length, 1);
  assert.equal((await request('/api/reviewLogs?from=2001')).body.items.length, 0);
  assert.equal((await request('/api/reviewLogs?from=x')).status, 400);
  assert.equal((await request('/api/constructor')).status, 404);
  assert.equal((await request('/api/health', { user: null })).body.db, true);
  const changed = await request('/api/decks/' + d.id, { method: 'PUT', body: { ...d, name: 'Tên mới' } });
  assert.equal(changed.status, 200);
  assert.equal((await request('/api/decks/' + d.id, { method: 'PUT', body: { ...d, name: 'Bản cũ', expectedUpdatedAt: d.updatedAt } })).status, 409);
  const withoutVersion = await request('/api/decks/' + d.id, {
    method: 'PUT', body: { ...d, name: 'Không gửi phiên bản', updatedAt: 2000 },
  });
  assert.equal(withoutVersion.status, 200);
  const revision = withoutVersion.body.item;
  const racing = await Promise.all(['Máy A', 'Máy B'].map(name => request('/api/decks/' + d.id, {
    method: 'PUT', body: { ...revision, name, expectedUpdatedAt: revision.updatedAt },
  })));
  assert.deepEqual(racing.map(r => r.status).sort(), [200, 409]);
  const added = card(d.id), missing = card(randomUUID());
  assert.equal((await request('/api/cards/batch', { method: 'POST', body: { items: [added, missing] } })).status, 404);
  assert.equal((await request('/api/cards/' + added.id)).status, 404);
  const resent = { ...c, meaning: 'Nội dung nhập lại không được ghi đè', reps: 8 };
  assert.equal((await request('/api/cards/batch', { method: 'POST', body: { items: [resent, resent] } })).status, 200);
  assert.deepEqual((await request('/api/cards/' + c.id)).body.item, c);
  assert.equal((await request('/api/cards')).body.items.length, 1);
  const ownB = deck();
  await request('/api/decks/' + ownB.id, { user: USER_B, method: 'PUT', body: ownB });
  assert.equal((await request('/api/me/data', { user: USER_B, method: 'DELETE' })).status, 204);
  assert.equal((await request('/api/decks/' + d.id)).status, 200);
  assert.equal((await request('/api/decks/' + d.id, { method: 'DELETE' })).status, 204);
  assert.equal((await request('/api/decks/' + d.id, { method: 'DELETE' })).status, 204);
  assert.equal((await request('/api/cards')).body.items.length, 0);
  assert.equal((await request('/api/reviewLogs')).body.items.length, 1);
  assert.equal((await request('/api/reviewLogs/delete', { method: 'POST', body: { ids: [l.id] } })).status, 204);
  assert.equal((await request('/api/reviewLogs')).body.items.length, 0);
});

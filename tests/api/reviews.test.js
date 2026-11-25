import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { postgresUnavailable } from '../helpers/postgres.js';
import { database, deck, card, log, USER_B } from './helpers.js';
const skip = await postgresUnavailable();

test('API reviews: 2 user, đồng thời, idempotency, rollback và undo', { skip }, async t => {
  const { request } = await database(t);
  const d = deck(), before = card(d.id);
  await request('/api/decks/' + d.id, { method: 'PUT', body: d });
  await request('/api/cards/' + before.id, { method: 'PUT', body: before });
  const review = log(before);
  const after = { ...before, state: 'review', interval: 4, ease: 2.5, reps: 1, due: 999999,
    lastReview: review.reviewedAt, updatedAt: review.reviewedAt };
  const body = { card: after, log: review };
  assert.equal((await request('/api/reviews', { user: USER_B, method: 'POST', body })).status, 404);
  const replies = await Promise.all([1, 2].map(() => request('/api/reviews', { method: 'POST', body })));
  for (const response of replies) assert.equal(response.status, 200);
  assert.equal((await request('/api/reviewLogs')).body.items.length, 1);
  assert.equal((await request('/api/cards/' + before.id)).body.item.reps, 1);
  assert.equal((await request('/api/reviews/' + review.id + '/undo', {
    user: USER_B, method: 'POST', body: { card: before },
  })).status, 404);
  const badRestore = { ...before, id: randomUUID() };
  assert.equal((await request('/api/reviews/' + review.id + '/undo', {
    method: 'POST', body: { card: badRestore },
  })).status, 404);
  assert.equal((await request('/api/reviewLogs')).body.items.length, 1);
  const undoUrl = '/api/reviews/' + review.id + '/undo';
  assert.equal((await request(undoUrl, { method: 'POST', body: { restoredCard: before } })).status, 400);
  for (const response of await Promise.all([1, 2].map(() => request(undoUrl, {
    method: 'POST', body: { card: before },
  })))) {
    assert.equal(response.status, 200);
    assert.equal(response.body.card.reps, 0);
    assert.equal(response.body.card.state, 'new');
  }
  assert.equal((await request('/api/reviewLogs')).body.items.length, 0);
  // Một lượt stale phải rollback, không để lại log nếu cập nhật thẻ thất bại.
  const stale = { ...body, log: { ...review, id: randomUUID() }, expectedUpdatedAt: 0 };
  assert.equal((await request('/api/reviews', { method: 'POST', body: stale })).status, 409);
  assert.equal((await request('/api/reviewLogs')).body.items.length, 0);
});

test('API reviews: chấm và undo giữ nội dung mới, không cho undo lượt cũ', { skip }, async t => {
  const { request } = await database(t);
  const d = deck(), before = card(d.id);
  await request('/api/decks/' + d.id, { method: 'PUT', body: d });
  await request('/api/cards/' + before.id, { method: 'PUT', body: before });
  const firstLog = log(before);
  const first = await request('/api/reviews', { method: 'POST', body: {
    card: { ...before, meaning: 'Không ghi đè', state: 'review', interval: 4, reps: 1,
      due: 999999, lastReview: 2000, updatedAt: 2000 }, log: firstLog,
  } });
  assert.equal(first.status, 200);
  assert.equal(first.body.card.meaning, before.meaning);
  const edited = await request('/api/cards/' + before.id, { method: 'PUT', body: {
    ...first.body.card, meaning: 'Nghĩa đã sửa trong lúc học',
  } });
  assert.equal(edited.status, 200);
  const secondLog = log(before, { prevState: 'review', prevInterval: 4, newInterval: 10, reviewedAt: 3000 });
  const second = await request('/api/reviews', { method: 'POST', body: {
    card: { ...edited.body.item, interval: 10, reps: 2, due: 9999999, lastReview: 3000 }, log: secondLog,
  } });
  assert.equal(second.status, 200);
  assert.equal((await request('/api/reviews/' + firstLog.id + '/undo', {
    method: 'POST', body: { card: before },
  })).status, 409);
  assert.equal((await request('/api/reviewLogs')).body.items.length, 2);
  const undo = await request('/api/reviews/' + secondLog.id + '/undo', {
    method: 'POST', body: { card: first.body.card },
  });
  assert.equal(undo.status, 200);
  assert.equal(undo.body.card.meaning, 'Nghĩa đã sửa trong lúc học');
  assert.equal(undo.body.card.reps, 1);
});

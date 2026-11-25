import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { migrate } from '../db/migrate.js';
import { closePool, query, withTransaction } from '../server/db/pool.js';
import { postgresUnavailable, startTestDatabase } from './helpers/postgres.js';

test('schema, quyền DB, migration và transaction trên PostgreSQL 16', { skip: await postgresUnavailable() }, async t => {
  const db = await startTestDatabase();
  t.after(async () => {
    await closePool();
    await db.stop();
  });
  process.env.DATABASE_URL = db.migrationUrl;
  process.env.PGSSLMODE = 'disable';

  await t.test('hai lệnh migrate đồng thời trên DB trống chỉ áp dụng 001 một lần', async () => {
    const outputs = await Promise.all([db.migrate(), db.migrate()]);
    assert.equal(outputs.filter(({ stdout }) => stdout.includes('001_init.sql')).length, 1);
    const { rows } = await query('SELECT filename, applied_at FROM schema_migrations');
    assert.deepEqual(rows.map(r => r.filename), ['001_init.sql']);
    assert.ok(Number(rows[0].applied_at) <= Date.now() && Number(rows[0].applied_at) > 0);
    assert.deepEqual(await migrate(), []);
  });

  await t.test('đúng bảng, cột, năm index truy vấn và mốc thời gian BIGINT', async () => {
    const { rows: tables } = await query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    assert.deepEqual(tables.map(r => r.tablename), ['cards', 'decks', 'review_logs', 'schema_migrations', 'users']);
    assert.equal((await query("SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'")).rowCount, 1);
    const { rows: cols } = await query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public'");
    assert.deepEqual(cols.filter(r => r.table_name === 'users').map(r => r.column_name).sort(),
      ['avatar_url', 'created_at', 'email', 'google_sub', 'id', 'name', 'token_version']);
    assert.ok(!cols.some(r => r.column_name === 'jlpt'));
    const millis = cols.filter(r => ['applied_at', 'created_at', 'updated_at', 'last_review', 'due', 'reviewed_at'].includes(r.column_name));
    assert.equal(millis.length, 9);
    assert.ok(millis.every(r => r.data_type === 'bigint'));
    const { rows: indexes } = await query("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE '%_idx'");
    assert.deepEqual(Object.fromEntries(indexes.map(r => [r.indexname, r.indexdef.slice(r.indexdef.lastIndexOf('('))])), {
      decks_user_idx: '(user_id)', cards_deck_idx: '(user_id, deck_id)', cards_due_idx: '(user_id, due)',
      logs_time_idx: '(user_id, reviewed_at)', logs_card_idx: '(user_id, card_id)',
    });
  });

  await t.test('mỗi file có transaction riêng, chạy theo số và chạy lại được sau lỗi', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'nholau-migration-'));
    try {
      const first = '901_first.sql';
      const second = '902_second.sql';
      await writeFile(join(directory, second), 'CREATE TABLE test_second (n INT); SELECT 1 / 0;');
      await writeFile(join(directory, first), 'CREATE TABLE test_first (n INT PRIMARY KEY);');
      await assert.rejects(migrate(directory), { code: '22012' });
      const state = await query("SELECT to_regclass('test_first') AS first, to_regclass('test_second') AS second");
      assert.deepEqual(state.rows[0], { first: 'test_first', second: null });
      const ledger = await query('SELECT filename FROM schema_migrations ORDER BY filename');
      assert.deepEqual(ledger.rows.map(r => r.filename), ['001_init.sql', first]);
      await writeFile(join(directory, second), 'CREATE TABLE test_second (n INT REFERENCES test_first(n));');
      assert.deepEqual(await migrate(directory), [second]);
      assert.deepEqual(await migrate(directory), []);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  await closePool();
  await db.grantApp();
  process.env.DATABASE_URL = db.appUrl;
  await t.test('role app có quyền DML, bị từ chối DDL và ghi lịch sử migration', async () => {
    assert.equal((await query('SELECT current_user')).rows[0].current_user, 'nholau_app');
    for (const table of ['users', 'decks', 'cards', 'review_logs']) {
      for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) {
        const result = await query('SELECT has_table_privilege(current_user, $1, $2) AS allowed', [table, privilege]);
        assert.equal(result.rows[0].allowed, privilege !== 'TRUNCATE');
      }
    }
    for (const sql of ['CREATE TABLE forbidden (n INT)', 'ALTER TABLE decks ADD COLUMN forbidden INT',
      'DROP TABLE review_logs', 'DELETE FROM schema_migrations']) {
      await assert.rejects(query(sql), { code: '42501' });
    }
  });

  await t.test('giao dịch commit giá trị trả về, rollback cả khi callback nuốt lỗi SQL', async () => {
    const insert = sub => client => client.query('INSERT INTO users (google_sub,email,created_at) VALUES ($1,$2,$3) RETURNING id',
      [sub, 'tx@example.invalid', Date.now()]);
    const saved = await withTransaction(insert('tx-ok'));
    assert.equal(saved.rowCount, 1);
    await assert.rejects(withTransaction(async client => {
      await insert('tx-no')(client);
      throw new Error('hủy');
    }), /hủy/);
    await assert.rejects(withTransaction(async client => {
      await insert('tx-abort')(client);
      await assert.rejects(client.query('SELECT 1 / 0'), { code: '22012' });
    }), /đã bị PostgreSQL hủy/);
    const { rows } = await query("SELECT google_sub FROM users WHERE google_sub LIKE 'tx-%'");
    assert.deepEqual(rows, [{ google_sub: 'tx-ok' }]);
  });

  await t.test('hai chủ bộ, khóa ngoại kép, CHECK và giữ lịch sử khi xóa bộ', async () => {
    const time = Date.now();
    const { rows: people } = await query(`INSERT INTO users (google_sub,email,created_at)
      VALUES ('a','a@example.invalid',$1), ('b','b@example.invalid',$1) RETURNING id`, [time]);
    const [a, b] = people.map(r => r.id);
    const [deckA, deckB, cardA, cardB] = Array.from({ length: 4 }, () => randomUUID());
    const deck = (id, user) => query(`INSERT INTO decks (id,user_id,name,color,created_at,updated_at)
      VALUES ($1,$2,'Bộ mẫu','pink',$3,$3) RETURNING new_per_day,direction`, [id, user, time]);
    const card = (id, user, deckId) => query(`INSERT INTO cards (id,user_id,deck_id,term,meaning,created_at,updated_at)
      VALUES ($1,$2,$3,'猫','mèo',$4,$4) RETURNING state,due,last_review`, [id, user, deckId, time]);
    const log = (user, deckId, cardId, rating) => query(`INSERT INTO review_logs
      (id,user_id,card_id,deck_id,rating,prev_state,prev_interval,new_interval,prev_ease,reviewed_at)
      VALUES ($1,$2,$3,$4,$5,'new',0,1,0,$6)`, [randomUUID(), user, cardId, deckId, rating, time]);
    assert.deepEqual((await deck(deckA, a)).rows[0], { new_per_day: 20, direction: 'ja-vi' });
    await deck(deckB, b);
    assert.deepEqual((await card(cardA, a, deckA)).rows[0], { state: 'new', due: '0', last_review: null });
    await card(cardB, b, deckB);
    for (const [user, foreignDeck] of [[a, deckB], [b, deckA]]) {
      await assert.rejects(card(randomUUID(), user, foreignDeck), { code: '23503' });
    }
    await assert.rejects(query('UPDATE cards SET deck_id=$1 WHERE id=$2', [deckA, cardB]), { code: '23503' });
    for (const sql of ["UPDATE decks SET color='red'", "UPDATE decks SET direction='other'", 'UPDATE decks SET new_per_day=1000',
      "UPDATE decks SET name=''", "UPDATE decks SET description=repeat('x',301)", "UPDATE cards SET term=repeat('x',2001)",
      "UPDATE cards SET meaning=''", "UPDATE cards SET state='other'", 'UPDATE cards SET reps=-1']) {
      await assert.rejects(query(sql), { code: '23514' });
    }
    await assert.rejects(log(a, deckA, cardA, 5), { code: '23514' });
    await log(a, deckA, cardA, 1);
    await log(b, deckB, cardB, 4);
    await assert.rejects(query('UPDATE review_logs SET time_ms=86400001'), { code: '23514' });
    await query('DELETE FROM decks WHERE id=$1 AND user_id=$2', [deckA, a]);
    assert.deepEqual((await query('SELECT id FROM cards')).rows, [{ id: cardB }]);
    assert.equal((await query('SELECT 1 FROM review_logs WHERE user_id=$1 AND card_id=$2', [a, cardA])).rowCount, 1);
    await query('DELETE FROM users WHERE id=$1', [a]);
    assert.deepEqual((await query('SELECT user_id FROM review_logs')).rows, [{ user_id: b }]);
    assert.deepEqual((await query('SELECT id FROM decks')).rows, [{ id: deckB }]);
  });

  await t.test('PGSSLMODE=require từ chối kết nối khi máy chủ thiếu TLS', async () => {
    await closePool();
    process.env.PGSSLMODE = 'require';
    process.env.DATABASE_URL = db.appUrl + '?sslmode=disable';
    await assert.rejects(async () => query('SELECT 1'), /PGSSLMODE/);
    process.env.DATABASE_URL = db.appUrl + '?sslmode=require';
    await assert.rejects(query('SELECT 1'), /SSL/);
  });
});

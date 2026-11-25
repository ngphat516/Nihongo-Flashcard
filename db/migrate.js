import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { closePool, withTransaction } from '../server/db/pool.js';

const migrationsDir = fileURLToPath(new URL('./migrations/', import.meta.url));

function underMigrationLock(work) {
  return withTransaction(async client => {
    // Kể cả hai tiến trình khởi tạo DB trống cùng lúc, chỉ một tiến trình được ghi.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('nholau.schema_migrations', 0))");
    return work(client);
  });
}

/** Chạy bằng DATABASE_URL của role migration trong tiến trình riêng của người vận hành. */
export async function migrate(directory = migrationsDir) {
  const files = (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.sql'))
    .map(entry => entry.name)
    .sort();

  await underMigrationLock(client => client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at BIGINT NOT NULL
    )`));

  const applied = [];
  for (const filename of files) {
    const changed = await underMigrationLock(async client => {
      const previous = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [filename]);
      if (previous.rowCount) return false;
      const sql = await readFile(join(directory, filename), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename, applied_at) VALUES ($1, $2)', [filename, Date.now()]);
      return true;
    });
    if (changed) applied.push(filename);
  }
  return applied;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const applied = await migrate();
    console.log(applied.length ? `Đã áp dụng: ${applied.join(', ')}` : 'Database đã cập nhật.');
  } catch (error) {
    console.error('Không chạy được migration.', error.code ?? '');
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

import { execFile } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import pg from 'pg';

const run = promisify(execFile);
const image = 'postgres:16-alpine';

// npm test không tải image. CI đặt REQUIRE_TEST_POSTGRES=1 để thiếu DB sẽ báo lỗi.
export async function postgresUnavailable() {
  try {
    await run('docker', ['image', 'inspect', '--format', '{{.Id}}', image], { timeout: 10_000 });
    return false;
  } catch {
    const reason = 'Cần Docker đang chạy và image postgres:16-alpine (docker pull postgres:16-alpine).';
    if (process.env.REQUIRE_TEST_POSTGRES === '1') throw new Error(reason);
    return reason;
  }
}

/** Mỗi bộ test có một PostgreSQL riêng trên loopback, dữ liệu ở tmpfs. Không đọc DATABASE_URL của máy. */
export async function startTestDatabase() {
  const name = 'nholau-test-' + randomUUID();
  const password = randomBytes(32).toString('hex');
  const appPassword = randomBytes(32).toString('hex');
  const dbName = 'nholau_test';
  const { stdout } = await run('docker', [
    'run', '--detach', '--rm', '--pull=never', '--name', name,
    '--tmpfs', '/var/lib/postgresql/data', '--publish', '127.0.0.1::5432',
    '--env', 'POSTGRES_PASSWORD', '--env', 'POSTGRES_USER=migrator', '--env', 'POSTGRES_DB=' + dbName, image,
  ], { env: { ...process.env, POSTGRES_PASSWORD: password } });
  const container = stdout.trim();
  let admin;
  async function stop() {
    try {
      await admin?.end();
    } finally {
      await run('docker', ['rm', '--force', container]);
    }
  }
  try {
    const published = await run('docker', ['port', container, '5432/tcp']);
    const port = /^127\.0\.0\.1:(\d+)$/.exec(published.stdout.trim())?.[1];
    if (!port) throw new Error('Không tìm được port PostgreSQL trên loopback.');
    const database = '@127.0.0.1:' + port + '/' + dbName;
    const migrationUrl = 'postgres://migrator:' + password + database;
    const appUrl = 'postgres://nholau_app:' + appPassword + database;
    for (let attempt = 0; ; attempt++) {
      try {
        await run('docker', ['exec', container, 'pg_isready', '-q', '-h', '127.0.0.1', '-U', 'migrator', '-d', dbName]);
        break;
      } catch {
        if (attempt >= 100) throw new Error('PostgreSQL test không khởi động được.');
        await delay(200);
      }
    }
    admin = new pg.Client({ connectionString: migrationUrl, ssl: false });
    await admin.connect();
    await admin.query('CREATE ROLE nholau_app LOGIN PASSWORD ' + pg.escapeLiteral(appPassword));
    return {
      admin, migrationUrl, appUrl, stop,
      migrate: () => run(process.execPath, ['db/migrate.js'], {
        cwd: new URL('../../', import.meta.url),
        env: { ...process.env, DATABASE_URL: migrationUrl, PGSSLMODE: 'disable' },
      }),
      grantApp: () => admin.query(`
        GRANT USAGE ON SCHEMA public TO nholau_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON users, decks, cards, review_logs TO nholau_app;`),
    };
  } catch (error) {
    await stop();
    throw error;
  }
}

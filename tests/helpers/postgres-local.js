import { execFile, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import pg from 'pg';

const run = promisify(execFile);
function control(args) {
  return new Promise((resolve, reject) => {
    // postgres chạy nền trên Windows không được giữ các pipe của tiến trình test.
    const child = spawn(postgresCommand('pg_ctl'), args, { stdio: 'ignore', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error('pg_ctl thất bại: ' + code)));
  });
}
export function postgresCommand(name) {
  return join(process.env.TEST_POSTGRES_BIN, name + (process.platform === 'win32' ? '.exe' : ''));
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

// Chỉ tạo cluster tạm; không kết nối PostgreSQL/DATABASE_URL sẵn có trên máy.
export async function startLocalDatabase() {
  const directory = await mkdtemp(join(tmpdir(), 'nholau-pg-test-'));
  const data = join(directory, 'data');
  const passwordFile = join(directory, 'password');
  const password = randomBytes(32).toString('hex');
  const appPassword = randomBytes(32).toString('hex');
  let admin;
  let started = false;
  async function stop() {
    try {
      await admin?.end();
    } finally {
      if (started) await control(['-D', data, '-m', 'immediate', '-w', 'stop']);
      await rm(directory, { recursive: true, force: true });
    }
  }
  try {
    await writeFile(passwordFile, password, { mode: 0o600 });
    await run(postgresCommand('initdb'), ['-D', data, '-U', 'migrator', '--encoding=UTF8', '--locale=C',
      '--auth=scram-sha-256', '--pwfile=' + passwordFile], { timeout: 60_000 });
    await rm(passwordFile);
    const port = await freePort();
    await control(['-D', data, '-l', join(directory, 'postgres.log'),
      '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start']);
    started = true;
    const database = '@127.0.0.1:' + port + '/nholau_test';
    const migrationUrl = 'postgres://migrator:' + password + database;
    const appUrl = 'postgres://nholau_app:' + appPassword + database;
    admin = new pg.Client({ connectionString: 'postgres://migrator:' + password + '@127.0.0.1:' + port + '/postgres', ssl: false });
    await admin.connect();
    await admin.query('CREATE DATABASE nholau_test');
    await admin.end();
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

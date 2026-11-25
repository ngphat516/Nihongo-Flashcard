import pg from 'pg';

let pool;

function getPool() {
  if (pool) return pool;
  const url = URL.canParse(process.env.DATABASE_URL) ? new URL(process.env.DATABASE_URL) : null;
  if (!url || !['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('Cần cấu hình DATABASE_URL cho PostgreSQL.');
  }
  const mode = process.env.PGSSLMODE ?? 'require';
  if (mode !== 'disable' && mode !== 'require') throw new Error('PGSSLMODE cần là disable hoặc require.');
  // pg ưu tiên các tùy chọn TLS trong URL hơn thuộc tính ssl của Pool.
  const urlMode = url.searchParams.get('sslmode');
  if (urlMode === mode || (mode === 'require' && urlMode === 'verify-full')) {
    url.searchParams.delete('sslmode');
  }
  if ([...url.searchParams.keys()].some(key => key.startsWith('ssl'))) {
    throw new Error('Cấu hình TLS trong DATABASE_URL không khớp PGSSLMODE. Dùng NODE_EXTRA_CA_CERTS cho CA riêng.');
  }
  pool = new pg.Pool({
    connectionString: url.href,
    ssl: mode === 'require' ? { rejectUnauthorized: true } : false,
  });
  // Lỗi trên kết nối đang rảnh cũng phát sự kiện error; pg tự loại kết nối đó.
  pool.on('error', () => console.error('PostgreSQL đã ngắt một kết nối đang rảnh.'));
  return pool;
}

export function query(text, params) {
  return getPool().query(text, params);
}

export async function withTransaction(work) {
  const client = await getPool().connect();
  let discard = false;
  try {
    await client.query('BEGIN');
    const value = await work(client);
    const result = await client.query('COMMIT');
    // PostgreSQL trả ROLLBACK nếu callback đã bắt rồi bỏ qua một lỗi SQL.
    if (result.command !== 'COMMIT') throw new Error('Giao dịch đã bị PostgreSQL hủy.');
    return value;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      discard = true;
    }
    throw error;
  } finally {
    client.release(discard);
  }
}

export async function closePool() {
  const current = pool;
  pool = undefined;
  if (current) await current.end();
}

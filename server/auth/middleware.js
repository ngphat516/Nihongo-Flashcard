import { query } from '../db/pool.js';
import { isUuid, readSession } from './jwt.js';

export function unauthorized(res) {
  return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Bạn cần đăng nhập.' } });
}

export async function requireAuth(req, res, next) {
  res.set('Cache-Control', 'no-store');
  if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH === '1') {
    const id = req.get('X-Dev-User');
    if (id !== undefined) {
      if (!isUuid(id)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'X-Dev-User phải là UUID.' } });
      }
      req.user = { id };
      return next();
    }
  }
  try {
    const claims = readSession(req);
    if (!claims) return unauthorized(res);
    const { rows } = await query('SELECT id FROM users WHERE id = $1 AND token_version = $2', [claims.sub, claims.tv]);
    if (!rows.length) return unauthorized(res);
    req.user = { id: rows[0].id };
  } catch {
    console.error('Không thể kiểm tra phiên đăng nhập. Kiểm tra cấu hình server và kết nối PostgreSQL.');
    return res.status(503).json({ error: { code: 'INTERNAL_ERROR', message: 'Máy chủ đang lỗi, vui lòng thử lại sau.' } });
  }
  return next();
}

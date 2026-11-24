import express from 'express';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createAuthRouter } from './routes/auth.js';
import { createHealthRouter } from './routes/health.js';
import { createCollectionsRouter } from './routes/collections.js';
import { createReviewsRouter } from './routes/reviews.js';
import { HttpError, notFound } from './errors.js';

const root = fileURLToPath(new URL('../', import.meta.url));
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' });
    next();
  });
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    // Cùng origin, chặn request thay đổi dữ liệu gửi từ trang ngoài.
    const origin = req.get('Origin');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && origin &&
        !['http://' + req.get('host'), 'https://' + req.get('host')].includes(origin)) {
      return next(new HttpError(403, 'FORBIDDEN', 'Nguồn yêu cầu không hợp lệ.'));
    }
    const hasBody = req.headers['transfer-encoding'] || Number(req.headers['content-length']) > 0;
    if (hasBody && !req.is('application/json')) {
      return next(new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Chỉ nhận dữ liệu JSON.'));
    }
    next();
  }, express.json({ limit: '2mb' }));
  app.use('/api', createHealthRouter(), createAuthRouter(), createReviewsRouter(), createCollectionsRouter());
  app.use('/api', (req, res, next) => next(notFound()));
  // Chỉ tài nguyên giao diện được phục vụ; tài liệu, test, ảnh review và mã server không công khai.
  app.use((req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) return next();
    let pathname;
    try { pathname = decodeURIComponent(req.path); } catch { return next(notFound()); }
    if (pathname.split('/').some(part => part.startsWith('.') || part === 'screenshots' || part.endsWith('.test.js')) ||
        !/\.(html|css|js)$/.test(pathname) && !pathname.endsWith('/')) return next(notFound());
    next();
  });
  app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(root, 'index.html')));
  for (const folder of ['pages', 'core', 'styles', 'dev']) {
    app.use('/' + folder, express.static(path.join(root, folder), { dotfiles: 'deny', index: 'index.html' }));
  }
  app.use((req, res, next) => next(notFound()));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    let status = 500, code = 'INTERNAL_ERROR', message = 'Lỗi máy chủ, vui lòng thử lại.';
    if (error instanceof HttpError) ({ status, code, message } = error);
    else if (error.type === 'entity.too.large') {
      status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Dữ liệu vượt quá 2 MB.';
    } else if (error.type === 'entity.parse.failed' || error instanceof URIError || error.name === 'ValidationError' ||
        ['22P02', '22003', '23502', '23514'].includes(error.code)) {
      status = 400; code = 'VALIDATION_ERROR'; message = 'Dữ liệu không hợp lệ.';
    } else if (error.code === '23503') {
      status = 404; code = 'NOT_FOUND'; message = 'Không tìm thấy dữ liệu.';
    } else if (error.code === '23505') {
      status = 409; code = 'CONFLICT'; message = 'Dữ liệu đã tồn tại.';
    }
    res.status(status).json({ error: { code, message } });
  });
  return app;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  createApp().listen(Number(process.env.PORT ?? 3000), '0.0.0.0', () => {
    console.log('Server Nhớ Lâu đã khởi động.');
  });
}

import { isIP } from 'node:net';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

export function createLoginLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator(req) {
      // Trên bản thật, Tunnel là đường vào app và Cloudflare đặt lại header này.
      const ip = req.get('CF-Connecting-IP');
      return ipKeyGenerator(isIP(ip ?? '') ? ip : req.ip, 128);
    },
    message: { error: { code: 'RATE_LIMITED', message: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.' } },
  });
}

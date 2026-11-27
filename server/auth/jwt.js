import { parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';

const cookieName = 'nholau_session';
const sessionSeconds = 7 * 24 * 60 * 60;
const maxTokenVersion = 2_147_483_647; // users.token_version là INT của PostgreSQL.
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = value => typeof value === 'string' && uuid.test(value);

function signingKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret?.trim() || Buffer.byteLength(secret) < 32) throw new Error('JWT_SECRET phải dài ít nhất 32 byte.');
  if (/^-----BEGIN [A-Z0-9 ]+-----/m.test(secret)) throw new Error('JWT_SECRET cần là khóa đối xứng cho HS256.');
  return secret;
}

function cookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' };
}

export function signSession(user) {
  return jwt.sign({ sub: user.id, tv: user.token_version }, signingKey(), {
    algorithm: 'HS256', expiresIn: sessionSeconds,
  });
}

export function setSessionCookie(res, token) {
  res.cookie(cookieName, token, { ...cookieOptions(), maxAge: sessionSeconds * 1000 });
}

export function clearSessionCookie(res) {
  res.cookie(cookieName, '', { ...cookieOptions(), maxAge: 0 });
}

export function readSession(req) {
  const token = parseCookie(req.headers.cookie ?? '')[cookieName];
  if (!token) return null;
  const key = signingKey();
  try {
    const claims = jwt.verify(token, key, { algorithms: ['HS256'], maxAge: sessionSeconds });
    if (!isUuid(claims.sub) || !Number.isInteger(claims.tv) || claims.tv < 0 || claims.tv > maxTokenVersion ||
        !Number.isSafeInteger(claims.exp)) return null;
    return claims;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) return null;
    // jsonwebtoken có thể ném lỗi JS khi payload hỏng JSON hoặc là null.
    // Chỉ giải mã để nhận ra hai đầu vào đó; lỗi của bộ xác minh phải tới middleware.
    if (error instanceof SyntaxError || error instanceof TypeError) {
      try {
        if (jwt.decode(token) === null) return null;
      } catch (decodeError) {
        if (decodeError instanceof SyntaxError) return null;
        throw decodeError;
      }
    }
    throw error;
  }
}

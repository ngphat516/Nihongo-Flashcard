import { gaxios, OAuth2Client } from 'google-auth-library';

// Dùng lại cả cache khóa công khai của Google giữa các lần đăng nhập.
const google = new OAuth2Client();
const issuers = new Set(['accounts.google.com', 'https://accounts.google.com']);

export async function verifyGoogleIdToken(idToken, client = google) {
  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience?.trim()) throw new Error('Thiếu cấu hình GOOGLE_CLIENT_ID.');

  let ticket;
  try {
    ticket = await client.verifyIdToken({ idToken, audience });
  } catch (error) {
    // Lỗi xác minh của thư viện có thể chứa nguyên token; không chuyển tiếp hay in ra log.
    if (error instanceof gaxios.GaxiosError) throw new Error('Không lấy được khóa xác minh của Google.');
    return null;
  }

  const claims = ticket.getPayload();
  if (!claims || claims.aud !== audience || !issuers.has(claims.iss) ||
      !Number.isSafeInteger(claims.exp) || claims.exp <= Date.now() / 1000 ||
      claims.email_verified !== true || typeof claims.email !== 'string' || !claims.email.trim() ||
      typeof claims.sub !== 'string' || !claims.sub.trim()) return null;
  return {
    sub: claims.sub,
    email: claims.email,
    name: typeof claims.name === 'string' ? claims.name : null,
    avatarUrl: typeof claims.picture === 'string' ? claims.picture : null,
  };
}

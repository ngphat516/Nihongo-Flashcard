/**
 * Tiện ích ngày giờ dùng chung.
 *
 * Quy ước quan trọng: một "ngày học" bắt đầu lúc 4h sáng (giống Anki),
 * để ai học sau nửa đêm vẫn được tính vào ngày hôm trước.
 * Mọi thời điểm trong app đều là timestamp (số mili-giây, giống Date.now()).
 */

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const DAY_ROLLOVER_HOUR = 4;

/** Thời điểm bắt đầu (4h sáng) của ngày học chứa `ts`. */
export function dayStart(ts = Date.now()) {
  const d = new Date(ts);
  if (d.getHours() < DAY_ROLLOVER_HOUR) d.setDate(d.getDate() - 1);
  d.setHours(DAY_ROLLOVER_HOUR, 0, 0, 0);
  return d.getTime();
}

/** Cộng `n` ngày theo lịch (giữ nguyên giờ trong ngày). */
export function addDays(ts, n) {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** Số ngày học từ `from` đến `to` (âm nếu `to` ở trước `from`). */
export function daysBetween(from, to) {
  return Math.round((dayStart(to) - dayStart(from)) / DAY);
}

/** Khóa 'YYYY-MM-DD' của ngày học chứa `ts`. Dùng để gom dữ liệu theo ngày (VD: heatmap). */
export function dayKey(ts = Date.now()) {
  const d = new Date(dayStart(ts));
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Hiện một khoảng thời gian (ms) ngắn gọn: "<1 phút", "10 phút", "1,5 giờ", "4 ngày", "2 tháng"... */
export function formatSpan(ms) {
  const minutes = ms / MINUTE;
  if (minutes < 1) return '<1 phút';
  if (minutes < 60) return `${Math.round(minutes)} phút`;
  const hours = minutes / 60;
  if (hours < 24) return `${oneDecimal(hours)} giờ`;
  return formatDays(ms / DAY);
}

/** Hiện số ngày: "4 ngày", "1,5 tháng", "2,1 năm". */
export function formatDays(days) {
  if (days < 30) return `${Math.round(days)} ngày`;
  if (days < 365) return `${oneDecimal(days / 30)} tháng`;
  return `${oneDecimal(days / 365)} năm`;
}

const oneDecimal = (x) => Number(x.toFixed(1)).toLocaleString('vi-VN');

/** H1–H8: phép tính thuần, dùng ngày học bắt đầu lúc 4h từ core/date.js. */
import { addDays, dayKey, dayStart } from '../../core/date.js';

export const number = (value) => value.toLocaleString('vi-VN');
export const dueTotal = ({ due }) => due.new + due.learning + due.review;
export const hasJapanese = (text) => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text);

export function summarize(overview, logs, now = Date.now()) {
  const perDay = new Map();
  const history = logs.filter((log) => log.reviewedAt <= now);
  for (const log of history) {
    const key = dayKey(log.reviewedAt);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  let cursor = dayStart(now);
  if (!perDay.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (perDay.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  const reviewLogs = history.filter((log) =>
    log.prevState === 'review' && log.reviewedAt >= addDays(dayStart(now), -29));
  const remembered = reviewLogs.filter((log) => log.rating !== 1).length;
  return {
    perDay, history, streak,
    today: perDay.get(dayKey(now)) ?? 0,
    total: overview.reduce((sum, item) => sum + item.total, 0),
    due: overview.reduce((sum, item) => sum + dueTotal(item), 0),
    retention: reviewLogs.length ? Math.round(remembered / reviewLogs.length * 100) : null,
    remembered, reviewed: reviewLogs.length,
  };
}

export function heatLevel(count) {
  return count === 0 ? 0 : count < 10 ? 1 : count < 25 ? 2 : count < 50 ? 3 : 4;
}

/** 53 tuần, thứ Hai trước; các ô ngoài khoảng 12 tháng và tương lai để trống. */
export function activityDays(perDay, now = Date.now()) {
  const today = dayStart(now);
  const weekday = (new Date(today).getDay() + 6) % 7;
  const start = addDays(today, -weekday - 52 * 7);
  const cutoff = new Date(today);
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  if (cutoff.getMonth() !== new Date(today).getMonth()) cutoff.setDate(0);
  cutoff.setDate(cutoff.getDate() + 1);
  return Array.from({ length: 53 * 7 }, (_, index) => {
    const timestamp = addDays(start, index);
    const key = dayKey(timestamp);
    const count = perDay.get(key) ?? 0;
    return { timestamp, key, count, level: heatLevel(count), active: timestamp >= +cutoff && timestamp <= today };
  });
}

export function monthlyReviews(logs, now = Date.now()) {
  const date = new Date(dayStart(now));
  const months = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(date.getFullYear(), date.getMonth() - 5 + i, 1, 4);
    return { key: dayKey(+start).slice(0, 7), label: `T${start.getMonth() + 1}`, fresh: 0, review: 0 };
  });
  for (const log of logs) {
    if (log.reviewedAt > now) continue;
    const month = months.find((item) => item.key === dayKey(log.reviewedAt).slice(0, 7));
    if (month) month[log.prevState === 'new' ? 'fresh' : 'review']++;
  }
  return months;
}

/** Ảnh chụp lịch hiện tại; không dự đoán kết quả chấm điểm, gom quá hạn vào hôm nay. */
export function forecastDays(cards, now = Date.now()) {
  const days = Array.from({ length: 14 }, (_, i) => ({ timestamp: addDays(dayStart(now), i), count: 0 }));
  const byDay = new Map(days.map((day) => [dayKey(day.timestamp), day]));
  for (const card of cards) {
    if (card.state === 'new' || !Number.isFinite(card.due)) continue;
    const day = byDay.get(dayKey(Math.max(dayStart(now), card.due)));
    if (day) day.count++;
  }
  return days;
}

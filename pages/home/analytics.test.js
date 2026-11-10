import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, dayKey, dayStart } from '../../core/date.js';
import { activityDays, forecastDays, heatLevel, monthlyReviews, summarize } from './analytics.js';

const at = (date) => +new Date(date);
const now = at('2026-11-11T12:00:00');
const log = (reviewedAt, prevState = 'review', rating = 3) => ({ reviewedAt, prevState, rating });

test('Home: số lượt không phải số thẻ; tỉ lệ nhớ chỉ tính Ôn tập trong 30 ngày học', () => {
  const start = addDays(dayStart(now), -29);
  const logs = [log(now), log(now, 'review', 1), log(now, 'learning', 1), log(start), log(start - 1, 'review', 1), log(now + 1)];
  const stats = summarize([{ total: 7, due: { new: 2, learning: 1, review: 1 } }], logs, now);
  assert.equal(stats.today, 3);
  assert.equal(stats.total, 7);
  assert.equal(stats.due, 4);
  assert.equal(stats.retention, 67);
  assert.equal(stats.reviewed, 3);
  assert.equal(stats.remembered, 2);
});

test('Home: chuỗi còn được giữ nếu hôm qua học, mất khi có ngày trống', () => {
  const yesterday = addDays(now, -1);
  assert.equal(summarize([], [log(yesterday), log(addDays(now, -2))], now).streak, 2);
  assert.equal(summarize([], [log(now), log(addDays(now, -2))], now).streak, 1);
  assert.equal(summarize([], [log(addDays(now, -2))], now).streak, 0);
  assert.equal(summarize([], [], now).retention, null);
});

test('Home: mốc 4h và chuỗi ngày qua năm mới', () => {
  const before = at('2027-01-01T03:59:59');
  const logs = [log(at('2026-12-31T23:00:00')), log(at('2026-12-30T12:00:00'))];
  assert.equal(summarize([], logs, before).today, 1);
  assert.equal(summarize([], logs, before).streak, 2);
  assert.equal(summarize([], logs, at('2027-01-01T04:00:00')).today, 0);
  assert.equal(summarize([], logs, at('2027-01-01T04:00:00')).streak, 2);
});

test('Home: heatmap 53×7, không lặp ngày, không tương lai, đủ 366 ngày năm nhuận', () => {
  const leap = at('2024-03-01T12:00:00');
  const days = activityDays(new Map([[dayKey(leap), 50]]), leap);
  const active = days.filter((day) => day.active);
  assert.equal(days.length, 371);
  assert.equal(new Set(days.map((day) => day.key)).size, 371);
  assert.equal(active.length, 366);
  assert.equal(activityDays(new Map(), at('2024-02-29T12:00:00')).filter(day => day.active).length, 366);
  assert.equal(active.at(-1).key, '2024-03-01');
  assert.equal(active.at(-1).level, 4);
  assert.ok(active.every((day) => day.timestamp <= leap));
  assert.deepEqual([0, 1, 9, 10, 24, 25, 49, 50].map(heatLevel), [0, 1, 1, 2, 2, 3, 3, 4]);
});

test('Home: tháng của lượt ôn lúc 3h thuộc tháng trước, cột tháng qua năm đúng', () => {
  const months = monthlyReviews([log(at('2027-01-01T03:00:00'), 'new'), log(at('2027-01-01T04:00:00'))], at('2027-01-02T12:00:00'));
  assert.deepEqual(months.map((month) => month.key), ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01']);
  assert.equal(months[4].fresh, 1);
  assert.equal(months[5].review, 1);
});

test('Home: dự báo không tính thẻ mới, không lặp thẻ; quá hạn gom vào hôm nay', () => {
  const cards = [
    { state: 'new', due: now }, { state: 'review', due: addDays(now, -10) },
    { state: 'learning', due: addDays(now, 1) }, { state: 'relearning', due: addDays(now, 13) },
    { state: 'review', due: addDays(now, 14) },
  ];
  const days = forecastDays(cards, now);
  assert.equal(days.length, 14);
  assert.equal(days[0].count, 1);
  assert.equal(days[1].count, 1);
  assert.equal(days[13].count, 1);
  assert.equal(days.reduce((sum, day) => sum + day.count, 0), 3);
});

/**
 * Thuật toán lặp lại ngắt quãng SM-2 theo cách Anki cài đặt (bộ lập lịch "cũ", trước FSRS).
 *
 * Đây là hàm thuần: không đọc/ghi localStorage, không đụng DOM, không sửa thẻ truyền vào.
 * Vì vậy test được bằng `npm test` (xem tests/scheduler.test.js).
 *
 * Tóm tắt luật (I = interval hiện tại, E = ease, L = số ngày ôn trễ):
 *
 *   Thẻ mới / đang học — đi qua các bước learningSteps (1 phút → 10 phút):
 *     Lại → về bước đầu      Khó → lặp lại bước hiện tại
 *     Tốt → sang bước sau; hết bước thì "tốt nghiệp" với 1 ngày
 *     Dễ  → tốt nghiệp ngay với 4 ngày
 *
 *   Thẻ ôn tập:
 *     Lại → học lại sau 10 phút, interval về 1 ngày, E − 0.20
 *     Khó → I × 1.2,                E − 0.15
 *     Tốt → (I + L/2) × E,          E giữ nguyên
 *     Dễ  → (I + L) × E × 1.3,      E + 0.15
 *
 *   E không bao giờ thấp hơn 1.3. Mỗi nút luôn cho interval dài hơn nút trước ít nhất 1 ngày.
 *   Interval ≥ 2.5 ngày được "fuzz" ±5–15% để các thẻ không dồn vào cùng một ngày.
 */
import { MINUTE, dayStart, addDays, daysBetween, formatSpan, formatDays } from './date.js';

export const Rating = Object.freeze({ AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 });
export const RATINGS = Object.freeze([1, 2, 3, 4]);
export const RATING_LABELS = Object.freeze({ 1: 'Lại', 2: 'Khó', 3: 'Tốt', 4: 'Dễ' });

/** Thông số mặc định — giống cài đặt mặc định của Anki. */
export const DEFAULT_CONFIG = Object.freeze({
  learningSteps: [1, 10], // phút — các bước học thẻ mới
  relearningSteps: [10], // phút — các bước học lại khi quên
  graduatingInterval: 1, // ngày — khi đi hết các bước học
  easyInterval: 4, // ngày — khi bấm Dễ lúc đang học
  startingEase: 2.5,
  minEase: 1.3,
  easyBonus: 1.3,
  hardFactor: 1.2,
  intervalModifier: 1,
  lapseFactor: 0, // interval sau khi quên = interval cũ × lapseFactor (tối thiểu 1 ngày)
  maxInterval: 36500, // ngày
});

/**
 * Tính trạng thái mới của thẻ sau khi người học chấm điểm.
 *
 * @param {import('./models.js').Card} card  thẻ hiện tại (không bị sửa)
 * @param {1|2|3|4} rating                   Lại / Khó / Tốt / Dễ
 * @param {object}   [options]
 * @param {number}   [options.now]     thời điểm chấm (mặc định: bây giờ)
 * @param {object}   [options.config]  thông số (mặc định: DEFAULT_CONFIG)
 * @param {boolean}  [options.fuzz]    có fuzz interval không (mặc định: có)
 * @param {() => number} [options.random] nguồn ngẫu nhiên [0, 1) cho fuzz.
 *        Mặc định: cố định theo id + số lần ôn của thẻ, nên nút "Tốt · 25 ngày"
 *        hiện ra đúng bằng kết quả khi bấm.
 * @returns {import('./models.js').Card} bản sao của thẻ với lịch ôn mới
 */
export function schedule(card, rating, options = {}) {
  const { now = Date.now(), config = DEFAULT_CONFIG, fuzz = true } = options;
  if (!RATINGS.includes(rating)) {
    throw new RangeError(`rating phải là 1, 2, 3 hoặc 4 — nhận được: ${rating}`);
  }
  const random = options.random ?? seededRandom(`${card.id}:${card.reps}`);
  const ctx = { now, cfg: config, fuzz, random };
  const base = { ...card, reps: (card.reps ?? 0) + 1, lastReview: now };

  switch (card.state) {
    case 'new':
      return answerLearning({ ...base, step: 0 }, rating, config.learningSteps, 'learning', ctx);
    case 'learning':
      return answerLearning(base, rating, config.learningSteps, 'learning', ctx);
    case 'relearning':
      return answerLearning(base, rating, config.relearningSteps, 'relearning', ctx);
    case 'review':
      return answerReview(base, rating, ctx);
    default:
      throw new Error(`Trạng thái thẻ không hợp lệ: ${card.state}`);
  }
}

/**
 * Kết quả của cả 4 nút — dùng để hiện thời gian lần ôn tới trên nút ("Tốt · 10 phút").
 * @returns {Record<1|2|3|4, { card: object, label: string }>}
 */
export function previewRatings(card, { now = Date.now(), config = DEFAULT_CONFIG } = {}) {
  const result = {};
  for (const rating of RATINGS) {
    const next = schedule(card, rating, { now, config });
    const label = next.state === 'review' ? formatDays(next.interval) : formatSpan(next.due - now);
    result[rating] = { card: next, label };
  }
  return result;
}

// ---------------------------------------------------------------------------

function answerLearning(card, rating, steps, state, ctx) {
  const { now, cfg } = ctx;
  const relearning = state === 'relearning';
  // Thẻ học lại giữ interval đã bị giảm lúc quên; thẻ mới dùng interval tốt nghiệp.
  const goodInterval = relearning ? card.interval : cfg.graduatingInterval;
  const easyInterval = relearning ? card.interval + 1 : cfg.easyInterval;

  if (steps.length === 0) return graduate(card, goodInterval, ctx);
  if (rating === Rating.EASY) return graduate(card, easyInterval, ctx);

  const step = Math.min(card.step, steps.length - 1);

  if (rating === Rating.GOOD) {
    const nextStep = step + 1;
    if (nextStep >= steps.length) return graduate(card, goodInterval, ctx);
    return { ...card, state, step: nextStep, due: now + steps[nextStep] * MINUTE };
  }
  if (rating === Rating.HARD) {
    return { ...card, state, step, due: now + hardDelay(steps, step) * MINUTE };
  }
  return { ...card, state, step: 0, due: now + steps[0] * MINUTE }; // AGAIN
}

/** Khó ở bước đầu = trung bình 2 bước đầu (Anki); ở bước sau thì lặp lại bước đó. */
function hardDelay(steps, step) {
  if (step > 0) return steps[step];
  if (steps.length > 1) return (steps[0] + steps[1]) / 2;
  return Math.min(steps[0] * 1.5, steps[0] + 24 * 60);
}

function graduate(card, interval, ctx) {
  const { now, cfg } = ctx;
  const days = fitInterval(interval, 1, ctx);
  return {
    ...card,
    state: 'review',
    step: 0,
    interval: days,
    ease: card.ease || cfg.startingEase,
    due: addDays(dayStart(now), days),
  };
}

function answerReview(card, rating, ctx) {
  const { now, cfg } = ctx;
  const current = card.interval;
  const ease = card.ease || cfg.startingEase;

  if (rating === Rating.AGAIN) {
    const interval = clamp(Math.round(current * cfg.lapseFactor), 1, cfg.maxInterval);
    const lapsed = {
      ...card,
      interval,
      lapses: (card.lapses ?? 0) + 1,
      ease: Math.max(cfg.minEase, round2(ease - 0.2)),
    };
    if (cfg.relearningSteps.length === 0) {
      return { ...lapsed, due: addDays(dayStart(now), interval) };
    }
    return { ...lapsed, state: 'relearning', step: 0, due: now + cfg.relearningSteps[0] * MINUTE };
  }

  const late = Math.max(0, daysBetween(card.due, now));
  const m = cfg.intervalModifier;
  const max = cfg.maxInterval;

  // Giá trị thô của 3 nút + mức tối thiểu để nút sau luôn dài hơn nút trước.
  const hardRaw = current * cfg.hardFactor * m;
  const hardMin = cfg.hardFactor > 1 ? current + 1 : 1;
  const hard = clamp(Math.round(hardRaw), Math.min(hardMin, max), max);

  const goodRaw = (current + late / 2) * ease * m;
  const goodMin = cfg.hardFactor > 1 ? hard + 1 : current + 1;
  const good = clamp(Math.round(goodRaw), Math.min(goodMin, max), max);

  const easyRaw = (current + late) * ease * cfg.easyBonus * m;
  const easyMin = good + 1;

  const [raw, min, easeChange] = {
    [Rating.HARD]: [hardRaw, hardMin, -0.15],
    [Rating.GOOD]: [goodRaw, goodMin, 0],
    [Rating.EASY]: [easyRaw, easyMin, +0.15],
  }[rating];

  const interval = fitInterval(raw, min, ctx);
  return {
    ...card,
    interval,
    ease: Math.max(cfg.minEase, round2(ease + easeChange)),
    due: addDays(dayStart(now), interval),
  };
}

/** Làm tròn + giới hạn interval, có fuzz nếu bật. */
function fitInterval(raw, min, { cfg, fuzz, random }) {
  const max = cfg.maxInterval;
  const lo = Math.min(min, max);
  if (!fuzz) return clamp(Math.round(raw), lo, max);
  const [low, high] = fuzzRange(raw, lo, max);
  return Math.floor(low + random() * (high - low + 1));
}

const FUZZ_RANGES = [
  { from: 2.5, to: 7, factor: 0.15 },
  { from: 7, to: 20, factor: 0.1 },
  { from: 20, to: Infinity, factor: 0.05 },
];

/**
 * Khoảng [thấp, cao] mà interval có thể rơi vào sau khi fuzz (theo cách tính của Anki).
 * VD: 25 ngày → [22, 28]. Interval dưới 2.5 ngày không fuzz.
 */
export function fuzzRange(interval, min = 1, max = Infinity) {
  const ivl = clamp(interval, min, max);
  if (ivl < 2.5) {
    const r = clamp(Math.round(ivl), min, max);
    return [r, r];
  }
  let delta = 1;
  for (const r of FUZZ_RANGES) delta += r.factor * Math.max(0, Math.min(ivl, r.to) - r.from);
  return [
    clamp(Math.max(2, Math.round(ivl - delta)), min, max),
    clamp(Math.round(ivl + delta), min, max),
  ];
}

/** Bộ sinh số ngẫu nhiên cố định theo chuỗi (FNV-1a + mulberry32). */
function seededRandom(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const round2 = (x) => Math.round(x * 100) / 100;

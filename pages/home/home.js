/**
 * TRANG CHỦ (index.html, pages/home/) — phụ trách: Leader
 * Việc cần làm: docs/tasks.md, mục "Trang chủ" (H1–H6).
 *
 * Hàm core hay dùng:
 *   getDeckOverview()  → [{ deck, total, due: { new, learning, review } }]
 *   getReviewLogs()    → mọi lượt ôn, cũ trước mới sau: [{ reviewedAt, rating, prevState, deckId, ... }]
 *   dayKey(ts)         → 'YYYY-MM-DD' của ngày học (ngày mới bắt đầu lúc 4h sáng)
 *   daysBetween(a, b)  → số ngày học giữa 2 thời điểm (tính chuỗi ngày)
 *   routes.study(id)   → link sang trang học
 */
import { getDeckOverview, getReviewLogs } from '../../core/repo.js';
import { dayKey } from '../../core/date.js';
import { routes } from '../../core/routes.js';
import { $, h, startPage } from '../../core/dom.js';

startPage(async () => {
  const [overview, logs] = await Promise.all([getDeckOverview(), getReviewLogs()]);

  // TODO H1: vẽ heatmap 12 tháng vào #heatmap (gom `logs` theo dayKey(log.reviewedAt))
  // TODO H2: thẻ tóm tắt vào #summary
  // TODO H3: danh sách bộ cần học vào #today
  // TODO H4: trạng thái rỗng khi overview.length === 0

  // ---------- DEMO — xóa khi làm thật: chứng minh dữ liệu đã đọc được ----------
  const perDay = new Map();
  for (const log of logs) {
    const key = dayKey(log.reviewedAt);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  $('#summary').append(
    h('p', { class: 'demo' }, `${overview.length} bộ thẻ · ${logs.length} lượt ôn · hôm nay ${perDay.get(dayKey()) ?? 0} lượt`),
  );
  $('#heatmap').append(
    h('p', { class: 'demo' }, `Có học ${perDay.size} ngày, nhiều nhất ${Math.max(0, ...perDay.values())} lượt/ngày.`),
  );
  $('#today').append(
    h('ul', { class: 'demo' },
      overview.map(({ deck, due }) =>
        h('li', {},
          h('a', { href: routes.study(deck.id) }, deck.name),
          ` — mới ${due.new} · đang học ${due.learning} · đến hạn ${due.review}`,
        ),
      ),
    ),
  );
});

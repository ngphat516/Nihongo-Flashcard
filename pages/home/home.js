/** Trang chủ H1–H8. Dữ liệu chỉ qua repo, không thay đổi lịch ôn của core.
 * getDeckOverview: số cần học có giới hạn thẻ mới và học trước 20 phút.
 * getReviewLogs: ngày học 4h; getCards: lịch đến hạn 14 ngày.
 * Từ L6 mọi bộ đọc ra đều có deck.color (bộ cũ được gán theo thứ tự), nên không cần COVER_COLORS[i % 6] nữa.
 */
import { getCards, getDeckOverview, getReviewLogs } from '../../core/repo.js';
import { routes } from '../../core/routes.js';
import { $, h, startPage } from '../../core/dom.js';
import { dayKey } from '../../core/date.js';
import { dueTotal, hasJapanese, number, summarize } from './analytics.js';
import { renderActivity, renderMonthly, renderForecast, installTooltips } from './charts.js';

const COVER_COLORS = ['pink', 'peach', 'yellow', 'green', 'sky', 'lavender'];
const countLabels = { new: 'Mới', learning: 'Đang học', review: 'Đến hạn' };
let loading = false;
let loaded = false;
let revision = '';

startPage(async () => {
  installTooltips();
  await loadHome();
  // Đọc lại khi quay về từ trang Học, đổi tab, qua mốc 4h hoặc có thẻ đến hạn.
  window.addEventListener('pageshow', (event) => { if (event.persisted) loadHome(); });
  window.addEventListener('storage', () => loadHome());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadHome(); });
  setInterval(() => { if (!document.hidden) loadHome(); }, 60_000);
});

async function loadHome() {
  if (loading) return;
  loading = true;
  const status = $('#home-status');
  $('#home-content').setAttribute('aria-busy', 'true');
  try {
    const now = Date.now();
    const [overview, logs, cards] = await Promise.all([
      getDeckOverview({ now }), getReviewLogs({ to: now + 1 }), getCards(),
    ]);
    const nextRevision = JSON.stringify([dayKey(now), new Date(now).getHours(), overview, logs, cards]);
    // Giữ nguyên DOM và focus nếu dữ liệu không thay đổi sau lần cập nhật.
    if (nextRevision !== revision) {
      const stats = summarize(overview, logs, now);
      renderSummary(stats, overview.length);
      renderGreeting(stats, now);
      renderDecks(overview, stats);
      renderActivity(stats.perDay, now);
      renderMonthly(stats.history, now);
      renderForecast(cards, now);
      revision = nextRevision;
    }
    $('#home-date').textContent = new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long', day: 'numeric', month: 'long',
    }).format(now);
    $('#home-date').dateTime = new Date(now).toISOString();
    for (const id of ['greeting', 'today', 'heatmap', 'chart', 'forecast']) $(`#${id}`).hidden = false;
    loaded = true;
    status.hidden = true;
  } catch (error) {
    status.hidden = false;
    status.className = 'alert alert-error home-status';
    status.setAttribute('role', 'alert');
    status.replaceChildren(
      h('div', {}, h('strong', {}, loaded ? 'Chưa cập nhật được tiến độ.' : 'Chưa tải được tiến độ học tập.'),
        h('p', {}, loaded ? 'Số liệu bên dưới là lần tải thành công gần nhất.' : 'Dữ liệu của bạn vẫn được giữ nguyên.'),
        h('p', {}, error.message)),
      h('button', { type: 'button', class: 'btn', onClick: loadHome }, 'Thử lại'),
    );
  } finally {
    $('#home-content').setAttribute('aria-busy', 'false');
    loading = false;
  }
}

function renderSummary(stats, deckCount) {
  const items = [
    [number(stats.today), 'Lượt ôn hôm nay', 'Ngày học bắt đầu lúc 4h sáng'],
    [number(stats.streak), 'Chuỗi ngày học', stats.streak ? 'Ngày liên tiếp, tính tới hôm nay hoặc hôm qua' : 'Bắt đầu từ một lượt ôn'],
    [number(stats.total), 'Tổng số thẻ', `Trong ${number(deckCount)} bộ thẻ của bạn`],
    [stats.retention === null ? '—' : `${stats.retention}%`, 'Tỉ lệ nhớ 30 ngày',
      stats.reviewed ? `${number(stats.remembered)}/${number(stats.reviewed)} lượt ôn không bấm “Lại”` : 'Chưa có lượt ôn thẻ Ôn tập'],
  ];
  $('#summary').replaceChildren(...items.map(([value, label, detail]) =>
    h('div', { class: 'stat home-stat' },
      h('span', { class: 'stat-label' }, label),
      h('span', { class: 'stat-value' }, value),
      h('span', { class: 'home-stat-detail' }, detail))));
}

function renderGreeting(stats, now) {
  const hour = new Date(now).getHours();
  const greeting = hour >= 4 && hour < 11 ? 'Chào buổi sáng' : hour >= 11 && hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  $('#greeting').replaceChildren(
    h('p', { class: 'home-eyebrow' }, greeting),
    h('h2', { class: 'section-title' }, stats.streak ? 'Giữ nhịp học của bạn' : 'Bắt đầu một nhịp học mới'),
    h('p', { class: 'home-streak' }, h('strong', {}, number(stats.streak)), h('span', {}, 'ngày liên tiếp')),
    h('p', { class: 'home-note' }, stats.today ? 'Bạn đã dành thời gian cho việc học hôm nay. Cứ tiếp tục nhé.' :
      stats.streak ? 'Một lượt ôn hôm nay sẽ nối dài chuỗi ngày của bạn.' : 'Chỉ một lượt ôn cũng là một khởi đầu tốt.'),
  );
}

function renderDecks(overview, stats) {
  const activeCount = overview.filter((item) => dueTotal(item) > 0).length;
  const next = overview.find((item) => dueTotal(item) > 0);
  const head = h('div', { class: 'home-section-head' },
    h('div', {}, h('p', { class: 'home-eyebrow' }, 'GÓC HỌC TẬP'),
      h('h2', { id: 'today-title', class: 'section-title' }, 'Bộ thẻ của hôm nay'),
      h('p', { class: 'home-note' }, activeCount ? `${number(stats.due)} thẻ cần học trong ${number(activeCount)} bộ` : 'Học một chút, đều đặn mỗi ngày.')),
    next && h('a', { class: 'btn btn-primary', href: routes.study(next.deck.id) }, 'Học ngay', arrow()),
  );
  if (!overview.length) {
    $('#today').replaceChildren(head, h('div', { class: 'panel empty home-empty' },
      h('span', { class: 'home-empty-mark', lang: 'ja', 'aria-hidden': 'true' }, '始'),
      h('h3', { class: 'empty-title' }, 'Hành trình bắt đầu từ một bộ thẻ'),
      h('p', { class: 'empty-text' }, 'Gom những từ muốn nhớ vào bộ thẻ đầu tiên của bạn.'),
      h('a', { class: 'btn btn-primary', href: routes.create() }, 'Tạo bộ thẻ đầu tiên')));
    return;
  }
  const sorted = overview.map((item, index) => ({ ...item, color: COVER_COLORS.includes(item.deck.color) ? item.deck.color : COVER_COLORS[index % 6] }))
    .sort((a, b) => Number(dueTotal(b) > 0) - Number(dueTotal(a) > 0));
  $('#today').replaceChildren(head,
    ...(!next ? [h('div', { class: 'alert alert-success home-complete', role: 'status' },
      h('strong', {}, stats.total ? 'Đã xong phần cần học lúc này!' : 'Các bộ thẻ đang chờ nội dung mới.'),
      h('p', {}, stats.total ? 'Bạn có thể nghỉ một chút. Thẻ mới đến hạn sẽ tự xuất hiện tại đây.' : 'Thêm vài thẻ để bắt đầu buổi học đầu tiên.'))] : []),
    h('div', { class: 'home-decks' }, sorted.map(deckCover)),
    h('a', { class: 'home-album-link', href: routes.album() }, 'Xem tất cả trong Album', arrow()),
  );
}

function deckCover({ deck, total, due, color }) {
  const count = dueTotal({ due });
  return h('a', { class: `cover cover-${color} home-cover${count ? '' : ' is-zero'}`, href: routes.study(deck.id) },
    h('span', { class: 'home-cover-top' },
      h('span', { class: 'cover-mark', lang: hasJapanese(deck.name) ? 'ja' : null, 'aria-hidden': 'true' }, [...deck.name][0]),
      count > 0 ? h('span', { class: 'cover-badge' }, `${number(count)} cần học`) : h('span', { class: 'home-cover-done' }, total ? 'Đã xong lúc này' : 'Chưa có thẻ')),
    h('span', { class: 'cover-title', lang: hasJapanese(deck.name) ? 'ja' : null }, deck.name),
    deck.description && h('span', { class: 'cover-text', lang: hasJapanese(deck.description) ? 'ja' : null }, deck.description),
    h('span', { class: 'counts home-cover-counts' }, Object.entries(countLabels).map(([state, label]) =>
      h('span', { class: `count${due[state] ? '' : ' is-zero'}` }, h('b', {}, number(due[state])), h('span', {}, label)))),
    h('span', { class: 'cover-meta' }, `${number(total)} thẻ`,
      h('span', { class: 'home-cover-action' }, 'Học', arrow())),
  );
}

// Lucide arrow-up-right, SVG tĩnh theo docs/design.md; không phụ thuộc glyph của font.
function arrow() {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ width: 20, height: 20, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round',
    'stroke-linejoin': 'round', 'aria-hidden': 'true' })) icon.setAttribute(key, value);
  const path = document.createElementNS(icon.namespaceURI, 'path');
  path.setAttribute('d', 'M7 7h10v10M7 17 17 7');
  icon.append(path);
  return icon;
}

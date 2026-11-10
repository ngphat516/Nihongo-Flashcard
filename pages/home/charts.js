/** H1, H5, H6, H8: biểu đồ HTML/CSS, có số liệu bằng chữ và tooltip dùng được bằng bàn phím. */
import { $, h } from '../../core/dom.js';
import { dayKey } from '../../core/date.js';
import { activityDays, forecastDays, monthlyReviews, number } from './analytics.js';

const dateLabel = (timestamp) => new Intl.DateTimeFormat('vi-VN', {
  weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
}).format(timestamp);
const tipProps = (label) => ({ 'data-home-tip': label, 'aria-label': label });
let heatmapResizeObserver;

export function renderActivity(perDay, now) {
  const days = activityDays(perDay, now);
  const actual = days.filter((day) => day.active);
  const total = actual.reduce((sum, day) => sum + day.count, 0);
  const studied = actual.filter((day) => day.count > 0).length;
  const months = h('div', { class: 'home-heat-months', 'aria-hidden': 'true' });
  let lastMonth = '';
  const monthly = new Map();
  for (const [index, day] of days.entries()) {
    if (!day.active) continue;
    const key = day.key.slice(0, 7);
    const item = monthly.get(key) ?? { count: 0, days: 0 };
    item.count += day.count;
    item.days += Number(day.count > 0);
    monthly.set(key, item);
    if (key !== lastMonth) {
      const column = Math.floor(index / 7) + 1;
      const previous = months.lastElementChild;
      // Tháng đầu có thể chỉ còn một ngày; tránh hai nhãn đè lên nhau trong cùng tuần.
      if (previous && column - Number(previous.style.gridColumn) < 3) previous.remove();
      months.append(h('span', { style: { gridColumn: String(column), gridRow: '1' } }, `T${new Date(day.timestamp).getMonth() + 1}`));
      lastMonth = key;
    }
  }
  const grid = h('div', { class: 'home-heat-grid', role: 'group', 'aria-label': 'Lịch học: dùng các phím mũi tên để chọn ngày' },
    days.map((day) => day.active ? h('button', {
      type: 'button', class: `home-heat-cell home-heat-${day.level}${day.key === dayKey(now) ? ' is-today' : ''}`,
      tabindex: day.key === dayKey(now) ? 0 : -1, 'data-day': day.key,
      ...tipProps(`${number(day.count)} lượt ôn · ${dateLabel(day.timestamp)}`),
    }) : h('span', { class: 'home-heat-blank', 'aria-hidden': 'true' })),
  );
  grid.addEventListener('keydown', (event) => {
    const current = event.target;
    if (!current.matches('button')) return;
    const index = [...grid.children].indexOf(current);
    const move = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }[event.key];
    let next = move === undefined ? null : grid.children[index + move];
    const buttons = [...grid.querySelectorAll('button')];
    if (event.key === 'Home') next = buttons[0];
    if (event.key === 'End') next = buttons.at(-1);
    if (move !== undefined || ['Home', 'End'].includes(event.key)) event.preventDefault();
    if (next?.matches('button')) {
      current.tabIndex = -1;
      next.tabIndex = 0;
      next.focus({ preventScroll: true });
      next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  });
  grid.addEventListener('focusin', (event) => {
    for (const button of grid.querySelectorAll('button')) button.tabIndex = button === event.target ? 0 : -1;
  });
  const scroller = h('div', { class: 'home-heat-scroll', tabindex: 0, role: 'region', 'aria-label': 'Heatmap 12 tháng, cuộn ngang để xem các tháng trước' },
    h('div', { class: 'home-heat-calendar' }, months,
      h('div', { class: 'home-heat-body' },
        h('div', { class: 'home-heat-weekdays', 'aria-hidden': 'true' }, ['T2', '', 'T4', '', 'T6', '', 'CN'].map((day) => h('span', {}, day))), grid)));
  const table = h('table', { class: 'home-table' },
    h('caption', { class: 'visually-hidden' }, 'Hoạt động theo tháng trong khoảng 12 tháng hiển thị'),
    h('thead', {}, h('tr', {}, ['Tháng', 'Lượt ôn', 'Ngày học'].map((label) => h('th', { scope: 'col' }, label)))),
    h('tbody', {}, [...monthly].map(([key, item]) => h('tr', {},
      h('th', { scope: 'row' }, `${key.slice(5)}/${key.slice(0, 4)}`), h('td', {}, number(item.count)), h('td', {}, number(item.days))))));
  const details = h('details', { class: 'home-data' }, h('summary', {}, 'Xem bảng số liệu theo tháng'), table);
  $('#heatmap').replaceChildren(
    h('div', { class: 'home-section-head' }, h('div', {},
      h('p', { class: 'home-eyebrow' }, 'TÍCH LŨY MỖI NGÀY'),
      h('h2', { id: 'heatmap-title', class: 'section-title' }, 'Hoạt động 12 tháng qua'))),
    h('p', { class: 'home-activity-summary' }, h('strong', {}, `${number(total)} lượt ôn`), ` trong ${number(studied)} ngày học`),
    scroller,
    h('div', { class: 'home-heat-footer' }, h('span', { class: 'home-note' }, 'Mỗi ô là một ngày học'),
      h('div', { class: 'home-legend', 'aria-label': 'Mức độ: 0, 1–9, 10–24, 25–49, từ 50 lượt ôn' }, 'Ít',
        [0, 1, 2, 3, 4].map((level) => h('span', { class: `home-legend-cell home-heat-${level}`, 'aria-hidden': 'true' })), 'Nhiều')),
    h('p', { class: 'home-note home-heat-help' }, total ? 'Rê chuột hoặc dùng phím mũi tên để xem từng ngày.' : 'Chưa có lượt ôn trong khoảng này. Lần học đầu tiên sẽ thắp sáng một ô.'),
    details,
  );
  // Chờ layout thực sau khi bỏ hidden hoặc đổi breakpoint, không đo trong lúc resize chưa xong.
  heatmapResizeObserver?.disconnect();
  heatmapResizeObserver = new ResizeObserver(() => { scroller.scrollLeft = scroller.scrollWidth; });
  heatmapResizeObserver.observe(scroller);
}

export function renderMonthly(logs, now) {
  const months = monthlyReviews(logs, now);
  const total = months.reduce((sum, month) => sum + month.fresh + month.review, 0);
  const max = Math.max(1, ...months.map((month) => month.fresh + month.review));
  $('#chart').replaceChildren(
    h('p', { class: 'home-eyebrow' }, 'NHỊP HỌC'),
    h('h2', { id: 'chart-title', class: 'section-title' }, 'Lượt ôn 6 tháng'),
    h('p', { class: 'home-chart-total' }, h('strong', {}, number(total)), ' lượt ôn'),
    h('div', { class: 'home-monthly-bars', role: 'group', 'aria-label': 'Lượt ôn mỗi tháng: học mới và ôn lại' },
      months.map((month) => {
        const label = `${month.key.slice(5)}/${month.key.slice(0, 4)}: ${number(month.fresh)} học mới · ${number(month.review)} ôn lại`;
        return h('button', { type: 'button', class: 'home-monthly-column', ...tipProps(label) },
          h('span', { class: 'home-monthly-track', 'aria-hidden': 'true' },
            h('span', { class: 'home-monthly-stack', style: { height: `${(month.fresh + month.review) / max * 100}%` } },
              h('span', { class: 'home-bar-review', style: { flex: month.review } }),
              h('span', { class: 'home-bar-new', style: { flex: month.fresh } }))),
          h('span', { class: 'home-month-label' }, month.label));
      })),
    h('div', { class: 'home-chart-legend' }, h('span', {}, h('i', { class: 'home-bar-new', 'aria-hidden': 'true' }), 'Học mới'),
      h('span', {}, h('i', { class: 'home-bar-review', 'aria-hidden': 'true' }), 'Ôn lại')),
    ...(total === 0 ? [h('p', { class: 'home-note' }, 'Biểu đồ sẽ cập nhật sau lượt ôn đầu tiên.')] : []),
  );
}

export function renderForecast(cards, now) {
  const days = forecastDays(cards, now);
  const max = Math.max(1, ...days.map((day) => day.count));
  const total = days.reduce((sum, day) => sum + day.count, 0);
  $('#forecast').replaceChildren(
    h('h2', { id: 'forecast-title', class: 'section-title' }, 'Sắp đến hạn'),
    h('p', { class: 'home-note' }, `${number(total)} thẻ · 14 ngày, kể từ hôm nay`),
    h('div', { class: 'home-forecast-bars', role: 'group', 'aria-label': 'Thẻ đến hạn trong 14 ngày' },
      days.map((day) => h('button', {
        type: 'button', class: 'home-forecast-column', ...tipProps(`${dateLabel(day.timestamp)}: ${number(day.count)} thẻ đến hạn`),
      }, h('span', { class: 'home-forecast-fill', style: { height: `${day.count / max * 100}%` }, 'aria-hidden': 'true' })))),
    h('div', { class: 'home-forecast-labels', 'aria-hidden': 'true' }, h('span', {}, 'Hôm nay'), h('span', {}, new Date(days.at(-1).timestamp).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' }))),
    h('p', { class: 'home-note home-forecast-note' }, 'Theo lịch hiện tại, gồm thẻ quá hạn ở hôm nay; không gồm thẻ mới. Lịch thay đổi sau mỗi lượt học.'),
  );
}

export function installTooltips() {
  const tooltip = h('div', { id: 'home-tooltip', class: 'home-tooltip', role: 'tooltip', hidden: true });
  document.body.append(tooltip);
  let owner = null;
  let timer;
  function hide() {
    tooltip.hidden = true;
    owner?.removeAttribute('aria-describedby');
    owner = null;
  }
  function show(target) {
    clearTimeout(timer);
    if (owner !== target) hide();
    owner = target;
    tooltip.textContent = target.dataset.homeTip;
    tooltip.hidden = false;
    target.setAttribute('aria-describedby', tooltip.id);
    position();
  }
  function position() {
    if (!owner?.isConnected) return hide();
    const bounds = owner.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > innerHeight || bounds.right < 0 || bounds.left > innerWidth) {
      tooltip.hidden = true;
      return;
    }
    tooltip.hidden = false;
    const margin = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--space-3'));
    tooltip.style.left = `${Math.max(margin, Math.min(innerWidth - tooltip.offsetWidth - margin, bounds.left + bounds.width / 2 - tooltip.offsetWidth / 2))}px`;
    const top = bounds.top > tooltip.offsetHeight + margin * 2 ? bounds.top - tooltip.offsetHeight - margin : bounds.bottom + margin;
    tooltip.style.top = `${Math.max(margin, Math.min(innerHeight - tooltip.offsetHeight - margin, top))}px`;
  }
  document.addEventListener('pointerover', (event) => {
    if (tooltip.contains(event.target)) return clearTimeout(timer);
    const target = event.target.closest('[data-home-tip]');
    if (target) show(target);
  });
  document.addEventListener('pointerout', (event) => {
    if (event.target.closest('[data-home-tip], #home-tooltip')) timer = setTimeout(() => {
      const focused = document.activeElement.closest('[data-home-tip]');
      if (focused) show(focused); else hide();
    }, 150);
  });
  document.addEventListener('focusin', (event) => {
    const target = event.target.closest('[data-home-tip]');
    if (target) show(target); else hide();
  });
  document.addEventListener('focusout', (event) => { if (event.target === owner) hide(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') hide(); });
  // Điều hướng Home/End có thể làm heatmap và cả trang cuộn; tooltip vẫn bám ô được focus.
  document.addEventListener('scroll', () => { if (owner) requestAnimationFrame(position); }, true);
  window.addEventListener('resize', () => { if (owner) requestAnimationFrame(position); });
}

import { $, h } from '../../core/dom.js';
import { getDeckOverview } from '../../core/repo.js';
import { routes } from '../../core/routes.js';
import { countItems } from './queue-view.js';

export async function showDeckPicker() {
  const overview = await getDeckOverview();
  const list = $('#deck-list');

  if (overview.length === 0) {
    list.replaceChildren(h('div', { class: 'empty' },
      h('p', { class: 'empty-title' }, 'Bạn chưa có bộ thẻ nào để học.'),
      h('a', { class: 'btn btn-primary', href: routes.create() }, 'Tạo bộ thẻ'),
    ));
  } else {
    list.replaceChildren(h('ul', { class: 'study-decks' }, overview.map(({ deck, due }) => {
      const total = Object.values(due).reduce((sum, count) => sum + count, 0);
      return h('li', {}, h('a', {
        class: `cover cover-${deck.color} study-deck${total === 0 ? ' is-zero' : ''}`,
        href: routes.study(deck.id),
      },
      h('span', { class: 'study-deck-heading' },
        h('strong', {}, deck.name),
        h('span', { class: 'study-deck-arrow', 'aria-hidden': 'true' }, '→')),
      h('span', { class: 'study-deck-total' },
        total ? `${total} thẻ cần học` : 'Không có thẻ cần học'),
      h('span', { class: 'counts' }, countItems(due))));
    })));
  }

  $('#deck-picker').hidden = false;
}


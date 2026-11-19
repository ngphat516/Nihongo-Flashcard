/**
 * Tạo thẻ: soạn một bộ thẻ.
 *
 *   pages/create/             → tạo bộ mới
 *   pages/create/?deck=<id>   → sửa bộ đó: tên, mô tả, màu bìa, thêm / sửa / xóa thẻ
 *
 * Mọi thay đổi chỉ nằm trên trang cho tới khi bấm Lưu (hoặc Ctrl+Enter). Lúc lưu, trang kiểm tra
 * hết các ô trước rồi mới ghi qua repo.js, nên một lượt lưu không dừng giữa chừng vì nhập sai.
 * Thẻ đã lưu bị xóa (bấm thùng rác hoặc xóa trắng cả 4 ô) thì hỏi xác nhận một lần trước khi lưu.
 *
 * Module trong folder: card-rows.js (các dòng thẻ), feedback.js (báo lỗi, toast, hộp xác nhận),
 * preview.js (thẻ xem trước, C4), paste.js (tách văn bản dán thành thẻ, C5).
 *
 * Xem trước (C4): khung thẻ hiện dòng đang focus hoặc đang gõ, theo chiều học của bộ; ‹ › chuyển
 * giữa các thẻ đã gõ, dòng đang xem được tô viền. "Xem thử cả bộ" (#review-dialog) lật lần lượt cả bộ.
 * Dán nhiều thẻ (C5): hộp thoại #paste-dialog, xem trước thành bảng, thêm vào các dòng thẻ (chưa lưu).
 *
 * Thẻ tiếng Nhật (C9): createCards / updateCard nhận { term, meaning, reading, example }.
 * Màu bìa (C8): chọn màu từ DECK_COLORS qua .color-picker; tạo bộ mới chọn sẵn màu kế tiếp.
 * Kanji chưa có [cách đọc] (reading.js): nhắc dưới ô Từ / Ví dụ, nút "Thêm cách đọc" chèn [] để gõ.
 * So trùng thẻ dùng plainFurigana(term) (furigana.js) để 約束[やくそく] trùng với 約束.
 */
import {
  createCards,
  createDeck,
  deleteCard,
  getCards,
  getDecks,
  updateCard,
  updateDeck,
} from '../../core/repo.js';
import { DECK_COLORS, cleanText, LIMITS } from '../../core/models.js';
import { routes } from '../../core/routes.js';
import { $, getParam, h, startPage } from '../../core/dom.js';
import { renderFurigana } from '../../core/furigana.js';
import {
  autosize,
  autosizeRow,
  createCardRows,
  fieldsOf,
  hasContent,
  isRowChanged,
  snapshot,
} from './card-rows.js';
import { confirmDialog, setError, showFailure, toast } from './feedback.js';
import { createPreview } from './preview.js';
import { parsePaste } from './paste.js';
import { addReadingBrackets } from './reading.js';

const DEFAULT_NEW_PER_DAY = 20;
const BLANK_ROWS_FOR_NEW_DECK = 3;

const form = $('#editor');
const select = $('#deck-select');
const nameInput = $('#deck-name');
const limitInput = $('#deck-limit');
const descInput = $('#deck-desc');
const addButton = $('#add-card');
const saveButton = $('#save');
const statusText = $('#status');
const notice = $('#notice');
const pasteDialog = $('#paste-dialog');
const pasteInput = $('#paste-input');
const pasteAdd = $('#paste-add');

const cards = createCardRows($('#cards'), $('#card-template'));
const { rows } = cards;
const preview = createPreview($('#preview'));
const reviewDialog = $('#review-dialog');
const review = createPreview(reviewDialog);

let decks = [];
/** Bộ đang sửa; null khi đang tạo bộ mới. */
let deck = null;
/** id các thẻ đã lưu mà người dùng bấm xóa; chỉ xóa thật khi Lưu. */
let removedIds = [];
let saving = false;
/** Dòng đang hiện trong khung xem trước. */
let activeRow = null;
/** Kết quả parsePaste() của ô dán, thêm `selected`. */
let pasted = [];
/** Thẻ đang xem trong hộp thoại Xem thử: vị trí trong `reviewRows`. */
let reviewRows = [];
let reviewIndex = 0;

startPage(async () => {
  decks = await getDecks();
  const wantedId = getParam('deck');
  const wanted = wantedId ? decks.find((d) => d.id === wantedId) : null;
  if (wanted) {
    await openDeck(wanted);
  } else {
    openNewDeck();
    if (wantedId) showNotice('Không tìm thấy bộ thẻ này. Bạn có thể tạo một bộ mới bên dưới.');
    if (matchMedia('(pointer: fine)').matches) nameInput.focus();
  }
  bindEvents();
});

// ------------------------------ Màu bìa ------------------------------

function nextDeckColor() {
  const last = decks.at(-1);
  return last ? DECK_COLORS[(DECK_COLORS.indexOf(last.color) + 1) % DECK_COLORS.length] : DECK_COLORS[0];
}

function getSelectedColor() {
  return form.elements.color?.value || DECK_COLORS[0];
}

function setSelectedColor(color) {
  const valid = DECK_COLORS.includes(color) ? color : DECK_COLORS[0];
  if (form.elements.color) form.elements.color.value = valid;
}

// ------------------------------ Mở bộ ------------------------------

async function openDeck(target) {
  const deckCards = await getCards(target.id);
  deck = target;
  nameInput.value = deck.name;
  limitInput.value = deck.newPerDay;
  descInput.value = deck.description;
  setSelectedColor(deck.color);
  cards.clear();
  deckCards.forEach((card) => cards.add(card));
  cards.add();
  afterOpen();
}

function openNewDeck() {
  deck = null;
  nameInput.value = '';
  limitInput.value = DEFAULT_NEW_PER_DAY;
  descInput.value = '';
  setSelectedColor(nextDeckColor());
  cards.clear();
  for (let i = 0; i < BLANK_ROWS_FOR_NEW_DECK; i++) cards.add();
  afterOpen();
}

function afterOpen() {
  removedIds = [];
  setError(nameInput, null);
  setError(limitInput, null);
  renderDeckOptions();
  renderHeader();
  setDeckParam(deck?.id);
  refresh();
}

/** Ghi bộ đang mở vào ?deck= (tải lại trang vẫn đúng bộ). Giữ nguyên các tham số khác trên URL. */
function setDeckParam(id) {
  const url = new URL(location.href);
  if (id) url.searchParams.set('deck', id);
  else url.searchParams.delete('deck');
  if (url.href !== location.href) history.replaceState(null, '', url);
}

function renderDeckOptions() {
  select.replaceChildren(
    h('option', { value: '' }, '+ Bộ mới'),
    ...decks.map((d) => h('option', { value: d.id }, d.name)),
  );
  select.value = deck?.id ?? '';
  $('#deck-picker').hidden = decks.length === 0;
}

function renderHeader() {
  $('#page-title').textContent = deck ? deck.name : 'Bộ thẻ mới';
  $('#deck-links').hidden = !deck;
  if (deck) {
    $('#link-album').href = routes.album(deck.id);
    $('#link-study').href = routes.study(deck.id);
  }
}

/** Cập nhật số thứ tự, cảnh báo trùng và thanh Lưu. Gọi sau mỗi thay đổi. */
function refresh() {
  cards.refresh();
  if (!rows.includes(activeRow)) activeRow = rows.find(hasContent) ?? null;
  showPreview();
  const dirty = isDirty();
  statusText.textContent = `${rows.filter(hasContent).length} thẻ${dirty ? ' · Chưa lưu' : ''}`;
  statusText.classList.toggle('is-dirty', dirty);
}

function showPreview() {
  preview.show(activeRow && fieldsOf(activeRow), activeRow, deck?.direction);
  const filled = rows.filter(hasContent);
  const position = filled.indexOf(activeRow);
  $('#preview-count').textContent = filled.length
    ? position >= 0 ? `Thẻ ${position + 1} / ${filled.length}` : `${filled.length} thẻ`
    : '';
  $('#preview-prev').disabled = !neighbour(-1);
  $('#preview-next').disabled = !neighbour(1);
  $('#open-review').disabled = !filled.length;
  for (const row of rows) row.el.classList.toggle('is-previewing', row === activeRow && filled.length > 1);
}

/** Dòng có nội dung liền trước (-1) hoặc liền sau (1) dòng đang xem trước. */
function neighbour(step) {
  const from = activeRow ? rows.indexOf(activeRow) : step > 0 ? -1 : rows.length;
  for (let i = from + step; i >= 0 && i < rows.length; i += step) {
    if (hasContent(rows[i])) return rows[i];
  }
  return null;
}

function stepPreview(step) {
  const row = neighbour(step);
  if (!row) return;
  activeRow = row;
  showPreview();
  row.el.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function deckFields() {
  return {
    name: cleanText(nameInput.value),
    description: cleanText(descInput.value),
    newPerDay: limitInput.value.trim(),
    color: getSelectedColor(),
  };
}

function isDeckChanged() {
  const { name, description, newPerDay, color } = deckFields();
  if (!deck) return Boolean(name || description) || newPerDay !== String(DEFAULT_NEW_PER_DAY);
  return (
    name !== deck.name ||
    description !== deck.description ||
    newPerDay !== String(deck.newPerDay) ||
    color !== deck.color
  );
}

function isDirty() {
  return (
    removedIds.length > 0 ||
    isDeckChanged() ||
    rows.some((row) => (row.saved ? isRowChanged(row) : hasContent(row)))
  );
}

// ------------------------------ Sự kiện ------------------------------

function bindEvents() {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    save();
  });
  form.addEventListener('input', onInput);
  form.addEventListener('keydown', onKeydown);
  $('#cards').addEventListener('click', (event) => {
    const button = event.target.closest('.create-card-delete');
    if (button) deleteRow(cards.find(button));
    const addReading = event.target.closest('.create-reading-add');
    if (addReading) insertReadingBrackets($('textarea', addReading.closest('.field')));
  });
  $('#cards').addEventListener('focusout', () => cards.refresh());
  $('#cards').addEventListener('focusin', (event) => {
    const row = cards.find(event.target);
    if (row && row !== activeRow) {
      activeRow = row;
      showPreview();
    }
  });
  $('#preview-prev').addEventListener('click', () => stepPreview(-1));
  $('#preview-next').addEventListener('click', () => stepPreview(1));
  $('#open-review').addEventListener('click', openReview);
  $('#review-prev').addEventListener('click', () => showReview(reviewIndex - 1));
  $('#review-next').addEventListener('click', () =>
    showReview(reviewIndex === reviewRows.length - 1 ? 0 : reviewIndex + 1));
  $('#review-flip').addEventListener('click', () => review.flip());
  $('#review-edit').addEventListener('click', editReviewed);
  $('#review-close').addEventListener('click', () => reviewDialog.close());
  reviewDialog.addEventListener('keydown', onReviewKeydown);
  bindReviewSwipe($('#review-stage'));
  $('#open-paste').addEventListener('click', openPaste);
  pasteInput.addEventListener('input', updatePaste);
  pasteInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.isComposing) {
      event.preventDefault();
      addPasted();
    }
  });
  pasteAdd.addEventListener('click', addPasted);
  $('#paste-cancel').addEventListener('click', () => pasteDialog.close());
  addButton.addEventListener('click', () => {
    cards.add().term.focus();
    refresh();
  });
  select.addEventListener('change', onSelectDeck);
  window.addEventListener('beforeunload', (event) => {
    if (!isDirty()) return;
    event.preventDefault();
    event.returnValue = '';
  });
  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => rows.forEach(autosizeRow));
  });
}

function deleteRow(row) {
  const i = rows.indexOf(row);
  cards.remove(row);
  if (row.id) removedIds.push(row.id);
  const next = rows[i] ?? rows[i - 1];
  (next ? next.term : addButton).focus();
  refresh();
}

/** Nút "Thêm cách đọc": chèn [] sau cụm kanji thiếu đầu tiên, đặt con trỏ vào giữa để gõ luôn. */
function insertReadingBrackets(input) {
  const result = addReadingBrackets(input.value);
  if (!result) return;
  input.value = result.text;
  input.focus();
  input.setSelectionRange(result.cursor, result.cursor);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function onInput(event) {
  const input = event.target;
  if (input === select) return;
  if (input.classList.contains('create-card-input')) {
    autosize(input);
    activeRow = cards.find(input);
  }
  setError(input, null);
  refresh();
}

function onKeydown(event) {
  if (event.isComposing) return; // đang gõ bằng bộ gõ tiếng Nhật/Việt: Enter là để chọn chữ
  const input = event.target;
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    form.requestSubmit();
  } else if (event.key === 'Enter' && input.tagName === 'INPUT') {
    event.preventDefault(); // Enter trong ô một dòng không lưu ngay
  } else if (event.key === 'Tab' && !event.shiftKey && input.dataset.field === 'example') {
    // Tab ở ô Ví dụ của thẻ cuối: thêm dòng mới để gõ tiếp
    const row = cards.find(input);
    if (row === rows.at(-1) && hasContent(row)) {
      event.preventDefault();
      cards.add().term.focus();
      refresh();
    }
  }
}

async function onSelectDeck() {
  const target = decks.find((d) => d.id === select.value) ?? null;
  if (
    isDirty() &&
    !(await confirmDialog({
      title: 'Bỏ thay đổi chưa lưu?',
      text: 'Những gì bạn vừa sửa ở bộ này sẽ mất.',
      ok: 'Bỏ thay đổi',
    }))
  ) {
    select.value = deck?.id ?? '';
    return;
  }
  hideNotice();
  try {
    if (target) await openDeck(target);
    else openNewDeck();
  } catch (err) {
    showFailure(err, 'Không mở được bộ thẻ');
  }
}

// ------------------------------ Xem thử cả bộ ------------------------------

function openReview() {
  reviewRows = rows.filter(hasContent);
  if (!reviewRows.length) return;
  reviewDialog.showModal();
  showReview(Math.max(0, reviewRows.indexOf(activeRow)));
  $('#review-stage .flashcard').focus();
}

function showReview(index) {
  if (index < 0 || index >= reviewRows.length) return;
  reviewIndex = index;
  const row = reviewRows[index];
  review.show(fieldsOf(row), row, deck?.direction);
  const total = reviewRows.length;
  $('#review-bar').style.width = `${((index + 1) / total) * 100}%`;
  // Thẻ cuối: báo hết bộ, nút Sau thành "Xem lại từ đầu" (mũi tên → vẫn dừng ở đây)
  const last = index === total - 1;
  $('#review-count').textContent = last && total > 1 ? `Thẻ ${total} / ${total} · Hết bộ` : `Thẻ ${index + 1} / ${total}`;
  $('#review-prev').disabled = index === 0;
  $('#review-next').disabled = total === 1;
  $('#review-next').classList.toggle('is-end', last);
  $('#review-next-label').textContent = last ? 'Xem lại từ đầu' : 'Sau';
}

function onReviewKeydown(event) {
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === 'ArrowLeft') showReview(reviewIndex - 1);
  else if (event.key === 'ArrowRight') showReview(reviewIndex + 1);
  else if (event.key === ' ' && !event.target.closest('.flashcard')) review.flip(); // thẻ là <button>: Space tự lật
  else return;
  event.preventDefault();
}

/** Vuốt ngang trên thẻ (điện thoại): sang trái là thẻ sau, sang phải là thẻ trước. Vuốt xong thì không lật. */
function bindReviewSwipe(stage) {
  let start = null;
  let swiped = false;
  stage.addEventListener('pointerdown', (event) => {
    start = event.pointerType === 'mouse' ? null : { x: event.clientX, y: event.clientY };
    swiped = false;
  });
  stage.addEventListener('pointerup', (event) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    swiped = true;
    showReview(reviewIndex + (dx < 0 ? 1 : -1));
  });
  stage.addEventListener('pointercancel', () => { start = null; });
  stage.addEventListener('click', (event) => {
    if (!swiped) return;
    swiped = false;
    event.stopPropagation();
  }, true);
}

/** Đóng hộp thoại, đưa con trỏ tới ô Từ của thẻ đang xem để sửa. */
function editReviewed() {
  const row = reviewRows[reviewIndex];
  reviewDialog.close();
  activeRow = row;
  showPreview();
  row.term.focus({ preventScroll: true });
  row.el.scrollIntoView({ block: 'center' });
}

// ------------------------------ Dán nhiều thẻ (C5) ------------------------------

function openPaste() {
  pasteInput.value = '';
  updatePaste();
  pasteDialog.showModal();
  pasteInput.focus();
}

function updatePaste() {
  const terms = rows.filter(hasContent).map((row) => fieldsOf(row).term);
  pasted = parsePaste(pasteInput.value, terms).map((item) => ({ ...item, selected: !item.error }));
  renderPaste();
}

function renderPaste() {
  $('#paste-rows').replaceChildren(...pasted.map((item) => {
    const { card, error, duplicate, noReading } = item;
    const message = error || duplicate;
    return h('tr', { class: error ? 'is-error' : item.selected ? '' : 'is-off' },
      h('td', {}, h('input', {
        type: 'checkbox',
        checked: item.selected,
        disabled: Boolean(error),
        'aria-label': `Thêm dòng ${item.line}`,
        onchange: (event) => {
          item.selected = event.target.checked;
          renderPaste();
        },
      })),
      h('td', { class: 'create-paste-line' }, item.line),
      h('td', {},
        card.term ? renderFurigana(card.term) : null,
        message && h('span', { class: error ? 'create-paste-error' : 'create-paste-note' }, message),
        noReading.length > 0 && h('span', { class: 'create-paste-note' },
          'Chưa có cách đọc: ', h('span', { lang: 'ja' }, noReading.join('、')))),
      h('td', {}, card.meaning),
      h('td', { lang: 'ja' }, card.reading),
      h('td', {}, card.example ? renderFurigana(card.example) : null),
    );
  }));

  const picked = pasted.filter((item) => item.selected).length;
  const errors = pasted.filter((item) => item.error).length;
  const duplicates = pasted.filter((item) => item.duplicate).length;
  const noReading = pasted.filter((item) => item.noReading.length).length;
  $('#paste-summary').textContent = pasted.length
    ? [
        `${pasted.length} dòng, sẽ thêm ${picked} thẻ`,
        errors && `${errors} dòng lỗi không thêm được`,
        duplicates && `${duplicates} dòng trùng từ`,
        noReading && `${noReading} dòng có kanji chưa có cách đọc`,
      ].filter(Boolean).join(' · ')
    : '';
  $('#paste-preview').hidden = !pasted.length;
  pasteAdd.textContent = picked ? `Thêm ${picked} thẻ` : 'Thêm thẻ';
  pasteAdd.disabled = !picked;
}

/** Điền các dòng đã chọn vào dòng thẻ trống (chưa lưu), hết dòng trống thì thêm dòng mới. */
function addPasted() {
  const picked = pasted.filter((item) => item.selected).map((item) => item.card);
  if (!picked.length) return;
  const blanks = rows.filter((row) => !row.id && !hasContent(row));
  const added = picked.map((card) => {
    const row = blanks.shift() ?? cards.add();
    for (const field of Object.keys(card)) row[field].value = card[field];
    autosizeRow(row);
    return row;
  });
  if (hasContent(rows.at(-1))) cards.add();
  pasteDialog.close();
  activeRow = added[0];
  refresh();
  added[0].el.scrollIntoView({ block: 'center' });
  toast(`Đã thêm ${added.length} thẻ. Bấm Lưu để lưu vào bộ.`);
}

// ------------------------------ Lưu ------------------------------

async function save() {
  if (saving) return;
  const invalid = validate();
  if (invalid.length) {
    invalid[0].focus({ preventScroll: true });
    invalid[0].scrollIntoView({ block: 'center' });
    toast(`Còn ${invalid.length} ô cần sửa.`, true);
    return;
  }

  const filled = rows.filter(hasContent);
  const toDelete = [...removedIds, ...rows.filter((row) => row.id && !hasContent(row)).map((row) => row.id)];
  if (
    toDelete.length &&
    !(await confirmDialog({
      title: `Xóa ${toDelete.length} thẻ?`,
      text: 'Các thẻ này và tiến độ học của chúng sẽ bị xóa khỏi bộ. Không hoàn tác được.',
      ok: 'Xóa và lưu',
    }))
  ) {
    return;
  }

  saving = true;
  saveButton.disabled = true;
  const wasNew = !deck;
  try {
    const fields = { ...deckFields(), newPerDay: Number(limitInput.value) };
    if (!deck) deck = await createDeck(fields);
    else if (isDeckChanged()) deck = await updateDeck(deck.id, fields);

    for (const row of filled.filter((r) => r.id && isRowChanged(r))) {
      const card = await updateCard(row.id, fieldsOf(row));
      row.saved = snapshot(card);
    }
    const fresh = filled.filter((row) => !row.id);
    if (fresh.length) {
      const created = await createCards(deck.id, fresh.map(fieldsOf));
      created.forEach((card, i) => {
        fresh[i].id = card.id;
        fresh[i].saved = snapshot(card);
      });
    }
    for (const id of toDelete) await deleteCard(id);
    removedIds = [];

    tidyRowsAfterSave();
    decks = await getDecks();
    renderDeckOptions();
    renderHeader();
    hideNotice();
    setDeckParam(deck.id);
    refresh();
    toast(wasNew ? 'Đã tạo bộ thẻ' : 'Đã lưu');
  } catch (err) {
    showFailure(err, 'Không lưu được');
  } finally {
    saving = false;
    saveButton.disabled = false;
  }
}

/** Kiểm tra mọi ô, báo lỗi dưới từng ô. Trả về các ô sai theo thứ tự trên trang. */
function validate() {
  const invalid = [];
  const fail = (input, message) => {
    setError(input, message);
    invalid.push(input);
  };
  const { name, newPerDay } = deckFields();
  if (!name) fail(nameInput, 'Nhập tên bộ thẻ.');
  const limit = Number(newPerDay);
  if (newPerDay === '' || !Number.isInteger(limit) || limit < 0 || limit > LIMITS.newPerDayMax) {
    fail(limitInput, `Nhập số nguyên từ 0 đến ${LIMITS.newPerDayMax}.`);
  }
  for (const row of rows) {
    if (!hasContent(row)) continue;
    const { term, meaning } = fieldsOf(row);
    if (!term) fail(row.term, 'Nhập từ.');
    if (!meaning) fail(row.meaning, 'Nhập nghĩa.');
  }
  return invalid;
}

/** Sau khi lưu: bỏ các dòng trống (trừ dòng đang gõ) và chừa đúng một dòng trống ở cuối. */
function tidyRowsAfterSave() {
  const active = document.activeElement;
  const lastBefore = rows.at(-1);
  for (const row of [...rows]) {
    if (!hasContent(row) && !row.el.contains(active)) cards.remove(row);
  }
  if (rows.length && !hasContent(rows.at(-1))) return;
  const blank = cards.add();
  // Vừa lưu từ thẻ cuối (VD bấm Ctrl+Enter) thì đưa con trỏ xuống dòng mới để gõ thẻ tiếp theo
  if (lastBefore?.el.contains(active)) blank.term.focus();
}

function showNotice(message) {
  notice.textContent = message;
  notice.hidden = false;
}

function hideNotice() {
  notice.hidden = true;
  notice.textContent = '';
}

/**
 * Tạo thẻ: soạn một bộ thẻ.
 *
 *   pages/create/             → tạo bộ mới
 *   pages/create/?deck=<id>   → sửa bộ đó: tên, mô tả, thêm / sửa / xóa thẻ
 *
 * Mọi thay đổi chỉ nằm trên trang cho tới khi bấm Lưu (hoặc Ctrl+Enter). Lúc lưu, trang kiểm tra
 * hết các ô trước rồi mới ghi qua repo.js, nên một lượt lưu không dừng giữa chừng vì nhập sai.
 * Thẻ đã lưu bị xóa (bấm thùng rác hoặc xóa trắng cả 2 mặt) thì hỏi xác nhận một lần trước khi lưu.
 *
 * Module trong folder: card-rows.js (các dòng thẻ), feedback.js (báo lỗi, toast, hộp xác nhận).
 *
 * Thẻ tiếng Nhật (L6): createCards / updateCard nhận { term, meaning, reading, example, jlpt };
 * { front, back } vẫn được nhận tạm như term / meaning cho tới L6b. Bộ mới tự lấy màu kế tiếp,
 * muốn cho chọn màu thì truyền createDeck({ color }) với một giá trị trong DECK_COLORS (C8).
 * So trùng thẻ nên dùng plainFurigana(term) (furigana.js) để 約束[やくそく] trùng với 約束.
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
import { cleanText, LIMITS } from '../../core/models.js';
import { routes } from '../../core/routes.js';
import { $, getParam, h, startPage } from '../../core/dom.js';
import { autosize, createCardRows, facesOf, hasContent, isRowChanged } from './card-rows.js';
import { confirmDialog, setError, showFailure, toast } from './feedback.js';

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

const cards = createCardRows($('#cards'), $('#card-template'));
const { rows } = cards;

let decks = [];
/** Bộ đang sửa; null khi đang tạo bộ mới. */
let deck = null;
/** id các thẻ đã lưu mà người dùng bấm xóa; chỉ xóa thật khi Lưu. */
let removedIds = [];
let saving = false;

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

// ------------------------------ Mở bộ ------------------------------

async function openDeck(target) {
  const deckCards = await getCards(target.id);
  deck = target;
  nameInput.value = deck.name;
  limitInput.value = deck.newPerDay;
  descInput.value = deck.description;
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
  const dirty = isDirty();
  statusText.textContent = `${rows.filter(hasContent).length} thẻ${dirty ? ' · Chưa lưu' : ''}`;
  statusText.classList.toggle('is-dirty', dirty);
}

function deckFields() {
  return {
    name: cleanText(nameInput.value),
    description: cleanText(descInput.value),
    newPerDay: limitInput.value.trim(),
  };
}

function isDeckChanged() {
  const { name, description, newPerDay } = deckFields();
  if (!deck) return Boolean(name || description) || newPerDay !== String(DEFAULT_NEW_PER_DAY);
  return name !== deck.name || description !== deck.description || newPerDay !== String(deck.newPerDay);
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
  });
  addButton.addEventListener('click', () => {
    cards.add().front.focus();
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
    resizeFrame = requestAnimationFrame(() => rows.forEach((row) => [row.front, row.back].forEach(autosize)));
  });
}

function deleteRow(row) {
  const i = rows.indexOf(row);
  cards.remove(row);
  if (row.id) removedIds.push(row.id);
  const next = rows[i] ?? rows[i - 1];
  (next ? next.front : addButton).focus();
  refresh();
}

function onInput(event) {
  const input = event.target;
  if (input === select) return;
  if (input.classList.contains('create-card-input')) autosize(input);
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
  } else if (event.key === 'Tab' && !event.shiftKey && input.dataset.face === 'back') {
    // Tab ở mặt sau của thẻ cuối: thêm dòng mới để gõ tiếp
    const row = cards.find(input);
    if (row === rows.at(-1) && hasContent(row)) {
      event.preventDefault();
      cards.add().front.focus();
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
      const card = await updateCard(row.id, facesOf(row));
      row.saved = { front: card.front, back: card.back };
    }
    const fresh = filled.filter((row) => !row.id);
    if (fresh.length) {
      const created = await createCards(deck.id, fresh.map(facesOf));
      created.forEach((card, i) => {
        fresh[i].id = card.id;
        fresh[i].saved = { front: card.front, back: card.back };
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
    const { front, back } = facesOf(row);
    if (back && !front) fail(row.front, 'Nhập mặt trước.');
    if (front && !back) fail(row.back, 'Nhập mặt sau.');
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
  if (lastBefore?.el.contains(active)) blank.front.focus();
}

function showNotice(message) {
  notice.textContent = message;
  notice.hidden = false;
}

function hideNotice() {
  notice.hidden = true;
  notice.textContent = '';
}

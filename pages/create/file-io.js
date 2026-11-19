/**
 * Xuất / nhập file bộ thẻ (C7). Hàm thuần, có test (tests/file-io.test.js); tải file và chọn file ở create.js.
 *
 * Xuất:
 *   .csv   cột term,meaning,reading,example, có BOM để Excel đọc đúng tiếng Việt / tiếng Nhật
 *   .json  { app: 'nho-lau', version: 1, deck: {...}, cards: [{ term, meaning, reading, example }] }
 * Nhập: .json (của app hoặc mảng thẻ), .csv / .tsv (Excel, Google Sheets, Anki, Quizlet), .txt (như ô dán).
 *   Dòng đầu CSV là tiêu đề (term / từ / meaning / nghĩa...) thì lấy cột theo tên, không thì theo thứ tự.
 *   Kết quả đi qua checkRows() của paste.js để hiện chung bảng xem trước với Dán nhiều thẻ.
 */
import { DECK_COLORS, DECK_DIRECTIONS, LIMITS, cleanText } from '../../core/models.js';
import { PASTE_FIELDS, checkRows, parsePaste } from './paste.js';

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const IMPORT_ACCEPT = '.csv,.tsv,.txt,.json';
const APP_ID = 'nho-lau';

/** Tên cột chấp nhận ở dòng tiêu đề (so sau khi bỏ dấu, viết thường). */
const HEADER_NAMES = {
  term: ['term', 'tu', 'front', 'word', 'kanji'],
  meaning: ['meaning', 'nghia', 'back', 'definition'],
  reading: ['reading', 'cach doc', 'kana', 'furigana'],
  example: ['example', 'vi du', 'sentence'],
};

// ------------------------------ Xuất ------------------------------

const pickFields = (card) => Object.fromEntries(PASTE_FIELDS.map((field) => [field, card[field] ?? '']));

/** Một ô CSV: bọc "..." khi có dấu phẩy, ngoặc kép, xuống dòng hay khoảng trắng đầu/cuối. */
function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]|^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function cardsToCsv(cards) {
  const lines = [PASTE_FIELDS.join(','), ...cards.map((card) => PASTE_FIELDS.map((f) => csvCell(card[f])).join(','))];
  return `﻿${lines.join('\r\n')}\r\n`;
}

export function cardsToJson(deck, cards, now = new Date()) {
  const { name, description, color, direction, newPerDay } = deck;
  return `${JSON.stringify({
    app: APP_ID,
    version: 1,
    exportedAt: now.toISOString(),
    deck: { name, description, color, direction, newPerDay },
    cards: cards.map(pickFields),
  }, null, 2)}\n`;
}

/** Tên file từ tên bộ: bỏ ký tự Windows không cho phép, giữ chữ có dấu. */
export function exportFileName(deckName, ext) {
  const base = cleanText(deckName).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return `${base || 'bo-the'}.${ext}`;
}

// ------------------------------ Nhập ------------------------------

/** Tách CSV theo RFC 4180: "..." chứa được dấu phân cách, xuống dòng, "" là một dấu ngoặc kép. */
export function parseCsv(text, delimiter = detectDelimiter(text)) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell.trim() === '') {
      quoted = true;
      cell = '';
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Dấu phân cách theo dòng đầu: Tab nếu có, không thì dấu nào nhiều hơn giữa "," và ";" (Excel máy Việt hay dùng ";"). */
export function detectDelimiter(text) {
  const first = String(text).split(/\r?\n/, 1)[0].replace(/"[^"]*"/g, '');
  if (first.includes('\t')) return '\t';
  const count = (ch) => first.split(ch).length - 1;
  return count(';') > count(',') ? ';' : ',';
}

const normalizeHeader = (value) => cleanText(value).toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[_-]+/g, ' ');

/** Dòng tiêu đề → vị trí cột của từng trường; null nếu dòng đầu không phải tiêu đề (thiếu cột từ hoặc nghĩa). */
function headerColumns(firstRow) {
  const names = firstRow.map(normalizeHeader);
  const columns = Object.fromEntries(PASTE_FIELDS.map((field) =>
    [field, names.findIndex((name) => HEADER_NAMES[field].includes(name))]));
  return columns.term >= 0 && columns.meaning >= 0 ? columns : null;
}

/** Thông tin bộ trong file JSON, chỉ giữ giá trị hợp lệ. */
function deckInfo(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const info = {};
  if (typeof raw.name === 'string' && cleanText(raw.name)) info.name = cleanText(raw.name).slice(0, LIMITS.deckName);
  if (typeof raw.description === 'string') info.description = cleanText(raw.description).slice(0, LIMITS.deckDescription);
  if (DECK_COLORS.includes(raw.color)) info.color = raw.color;
  if (DECK_DIRECTIONS.includes(raw.direction)) info.direction = raw.direction;
  if (Number.isInteger(raw.newPerDay) && raw.newPerDay >= 0 && raw.newPerDay <= LIMITS.newPerDayMax) {
    info.newPerDay = raw.newPerDay;
  }
  return Object.keys(info).length ? info : null;
}

function readJson(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'File JSON bị lỗi, không đọc được.' };
  }
  const items = Array.isArray(data) ? data : data?.cards;
  if (!Array.isArray(items)) return { error: 'File JSON không có danh sách thẻ ("cards").' };
  const rows = items.map((item, i) => ({
    line: i + 1,
    parts: item && typeof item === 'object'
      ? [item.term ?? item.front, item.meaning ?? item.back, item.reading, item.example].map((v) =>
        typeof v === 'string' || typeof v === 'number' ? String(v) : '')
      : [''],
  }));
  return { rows, deck: Array.isArray(data) ? null : deckInfo(data.deck) };
}

function readCsv(text) {
  const table = parseCsv(text);
  const columns = table.length ? headerColumns(table[0]) : null;
  const rows = [];
  table.forEach((cells, i) => {
    if (columns && i === 0) return;
    if (cells.every((cell) => !cell.trim())) return;
    const parts = columns ? PASTE_FIELDS.map((field) => (columns[field] >= 0 ? cells[columns[field]] ?? '' : '')) : cells;
    rows.push({ line: i + 1, parts });
  });
  return { rows, deck: null };
}

/**
 * Đọc nội dung file người dùng chọn.
 * @returns {{ rows: import('./paste.js').CheckedRow[], deck: object|null, error: string }}
 *   deck: tên, mô tả, màu, chiều học... có trong file JSON của app; null nếu không có
 */
export function readCardFile(fileName, text, existingTerms = []) {
  const ext = String(fileName).toLowerCase().split('.').pop();
  const source = String(text ?? '').replace(/^﻿/, '');
  const fail = (error) => ({ rows: [], deck: null, error });

  if (ext === 'txt') return finish({ checked: parsePaste(source, existingTerms), deck: null });
  if (ext === 'json') {
    const result = readJson(source);
    if (result.error) return fail(result.error);
    return finish({ checked: checkRows(result.rows, existingTerms), deck: result.deck });
  }
  if (ext === 'csv' || ext === 'tsv') {
    const result = readCsv(source);
    return finish({ checked: checkRows(result.rows, existingTerms), deck: null });
  }
  return fail('Chỉ nhập được file .csv, .tsv, .txt hoặc .json.');

  function finish({ checked, deck }) {
    return checked.length ? { rows: checked, deck, error: '' } : fail('File không có thẻ nào.');
  }
}

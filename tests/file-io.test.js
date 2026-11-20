import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cardsToCsv,
  cardsToJson,
  detectDelimiter,
  exportFileName,
  parseCsv,
  readCardFile,
} from '../pages/create/file-io.js';

const CARDS = [
  { term: '約束[やくそく]', meaning: 'lời hứa, hẹn', reading: 'やくそく', example: '「約束」を守[まも]る。', id: 'x', due: 1 },
  { term: '水[みず]', meaning: 'nước', reading: '', example: 'dòng 1\ndòng 2' },
];
const DECK = { name: 'JLPT N5', description: '', color: 'sky', direction: 'vi-ja', newPerDay: 15, id: 'd1' };

describe('xuất file (C7)', () => {
  test('CSV có BOM, tiêu đề, bọc ngoặc kép ô có dấu phẩy / ngoặc kép / xuống dòng', () => {
    const csv = cardsToCsv(CARDS);
    assert.ok(csv.startsWith('﻿term,meaning,reading,example\r\n'));
    assert.ok(csv.includes('"lời hứa, hẹn"'));
    assert.ok(csv.includes('"dòng 1\ndòng 2"'));
  });

  test('JSON chỉ giữ 4 trường của thẻ và thông tin bộ, không có id hay tiến độ học', () => {
    const data = JSON.parse(cardsToJson(DECK, CARDS, new Date(0)));
    assert.equal(data.app, 'nho-lau');
    assert.deepEqual(data.deck, { name: 'JLPT N5', description: '', color: 'sky', direction: 'vi-ja', newPerDay: 15 });
    assert.deepEqual(Object.keys(data.cards[0]), ['term', 'meaning', 'reading', 'example']);
  });

  test('tên file bỏ ký tự Windows không cho phép, giữ chữ có dấu', () => {
    assert.equal(exportFileName('Từ vựng: N5/N4?', 'csv'), 'Từ vựng N5N4.csv');
    assert.equal(exportFileName('  ', 'json'), 'bo-the.json');
  });
});

describe('nhập file (C7)', () => {
  test('xuất CSV rồi nhập lại ra đúng thẻ', () => {
    const { rows, error } = readCardFile('bo.csv', cardsToCsv(CARDS));
    assert.equal(error, '');
    assert.deepEqual(rows.map((r) => r.card.meaning), ['lời hứa, hẹn', 'nước']);
    assert.equal(rows[1].card.example, 'dòng 1\ndòng 2');
    assert.deepEqual(rows.map((r) => r.line), [2, 3]);
  });

  test('xuất JSON rồi nhập lại ra đúng thẻ và thông tin bộ', () => {
    const { rows, deck } = readCardFile('bo.json', cardsToJson(DECK, CARDS));
    assert.deepEqual(rows.map((r) => r.card.term), ['約束[やくそく]', '水[みず]']);
    assert.deepEqual(deck, { name: 'JLPT N5', description: '', color: 'sky', direction: 'vi-ja', newPerDay: 15 });
  });

  test('CSV có tiêu đề tiếng Việt, cột đảo thứ tự, dấu ";" của Excel', () => {
    const { rows } = readCardFile('a.csv', 'Nghĩa;Từ;Ghi chú\nnúi;山[やま];x\n');
    assert.deepEqual(rows[0].card, { term: '山[やま]', meaning: 'núi', reading: '', example: '' });
  });

  test('CSV không có tiêu đề thì lấy cột theo thứ tự; dòng trống bỏ qua', () => {
    const { rows } = readCardFile('a.csv', '山,núi\n\n川,sông,かわ\n');
    assert.deepEqual(rows.map((r) => [r.line, r.card.term, r.card.reading]), [[1, '山', ''], [3, '川', 'かわ']]);
  });

  test('TSV và TXT; dòng lỗi và trùng được đánh dấu như khi dán', () => {
    assert.equal(readCardFile('a.tsv', '山\tnúi').rows[0].card.meaning, 'núi');
    const { rows } = readCardFile('a.txt', '山|núi\n|thiếu từ\n山|núi', ['川']);
    assert.deepEqual(rows.map((r) => r.error || r.duplicate), ['', 'Thiếu từ', 'Trùng dòng 1']);
  });

  test('JSON là mảng thẻ, hoặc dùng front/back kiểu cũ', () => {
    const { rows, deck } = readCardFile('a.json', '[{"front":"山","back":"núi"},{"term":"川","meaning":"sông"}]');
    assert.deepEqual(rows.map((r) => r.card.term), ['山', '川']);
    assert.equal(deck, null);
  });

  test('báo lỗi rõ ràng: JSON hỏng, thiếu cards, file rỗng, đuôi lạ', () => {
    assert.equal(readCardFile('a.json', '{oops').error, 'File JSON bị lỗi, không đọc được.');
    assert.equal(readCardFile('a.json', '{"deck":{}}').error, 'File JSON không có danh sách thẻ ("cards").');
    assert.equal(readCardFile('a.csv', '﻿\r\n').error, 'File không có thẻ nào.');
    assert.equal(readCardFile('a.xlsx', 'x').error, 'Chỉ nhập được file .csv, .tsv, .txt hoặc .json.');
  });

  test('parseCsv: ngoặc kép lồng, dấu phân cách trong ngoặc', () => {
    assert.deepEqual(parseCsv('a,"b ""c"", d"\r\n', ','), [['a', 'b "c", d']]);
    assert.equal(detectDelimiter('a;b;"c,d"'), ';');
    assert.equal(detectDelimiter('a\tb,c'), '\t');
  });
});

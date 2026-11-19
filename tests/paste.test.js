import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePaste } from '../pages/create/paste.js';

describe('dán nhiều thẻ (C5)', () => {
  test('tách bằng | hoặc Tab, đủ 4 cột hay chỉ 2 cột', () => {
    const rows = parsePaste('水[みず]|nước|みず|水[みず]を飲[の]む。\n火\tlửa');
    assert.deepEqual(rows.map((r) => r.card), [
      { term: '水[みず]', meaning: 'nước', reading: 'みず', example: '水[みず]を飲[の]む。' },
      { term: '火', meaning: 'lửa', reading: '', example: '' },
    ]);
    assert.ok(rows.every((r) => !r.error && !r.duplicate));
  });

  test('dòng có Tab thì không tách theo | (câu ví dụ có thể chứa |)', () => {
    const [row] = parsePaste('木\tcây\t\tA|B');
    assert.equal(row.card.example, 'A|B');
  });

  test('bỏ dòng trống, số dòng tính theo ô dán, gọt khoảng trắng', () => {
    const rows = parsePaste('\n  山 | núi  \r\n\n川|sông\n   ');
    assert.deepEqual(rows.map((r) => [r.line, r.card.term, r.card.meaning]), [[2, '山', 'núi'], [4, '川', 'sông']]);
  });

  test('báo lỗi: thiếu từ, thiếu nghĩa, quá 4 cột, quá dài', () => {
    const long = 'あ'.repeat(2001);
    const rows = parsePaste(`|nước\nchỉ một cột\na|b|c|d|e\nx|${long}`);
    assert.deepEqual(rows.map((r) => r.error), [
      'Thiếu từ', 'Thiếu nghĩa', 'Có 5 cột, tối đa 4', 'Có ô dài quá 2000 ký tự',
    ]);
  });

  test('ô trống thừa ở cuối dòng Excel không tính là cột', () => {
    const [row] = parsePaste('水\tnước\t\t\t\t');
    assert.equal(row.error, '');
  });

  test('nhắc trùng với thẻ đang có và với dòng phía trên, bỏ qua furigana và hoa thường', () => {
    const rows = parsePaste('約束[やくそく]|lời hứa\nABC|x\nabc|y', ['約束']);
    assert.deepEqual(rows.map((r) => r.duplicate), ['Trùng thẻ đã có', '', 'Trùng dòng 2']);
  });

  test('nhắc kanji chưa có cách đọc; từ đã có cột Cách đọc thì không nhắc ở từ', () => {
    const rows = parsePaste('山|núi\n山|núi|やま|川を見る\n水[みず]|nước||水[みず]を飲[の]む\n|thiếu từ');
    assert.deepEqual(rows.map((r) => r.noReading), [['山'], ['川', '見'], [], []]);
  });
});

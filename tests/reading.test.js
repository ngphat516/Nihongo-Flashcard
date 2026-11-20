import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { missingReadings, addReadingBrackets } from '../pages/create/reading.js';

const runs = (text) => missingReadings(text).map((r) => r.text);

describe('nhắc kanji chưa có cách đọc', () => {
  test('cụm kanji nào có [cách đọc] ngay sau thì không nhắc', () => {
    assert.deepEqual(runs('約束[やくそく]を守[まも]る。'), []);
    assert.deepEqual(runs('ひらがなとカタカナ、abc'), []);
    assert.deepEqual(runs(''), []);
  });

  test('nhắc từng cụm kanji thiếu, giữ vị trí trong chuỗi', () => {
    assert.deepEqual(missingReadings('日本語を話[はな]す'), [{ text: '日本語', start: 0, end: 3 }]);
    assert.deepEqual(runs('山と川[かわ]と海'), ['山', '海']);
    assert.deepEqual(runs('人々'), ['人々']);
  });

  test('ngoặc rỗng hay chỉ có khoảng trắng vẫn tính là thiếu', () => {
    assert.deepEqual(runs('山[]'), ['山']);
    assert.deepEqual(runs('山[ ]'), ['山']);
  });

  test('thêm [] sau cụm kanji thiếu đầu tiên, trả về chỗ đặt con trỏ', () => {
    assert.deepEqual(addReadingBrackets('山と川'), { text: '山[]と川', cursor: 2 });
    assert.deepEqual(addReadingBrackets('山[]'), { text: '山[]', cursor: 2 });
    assert.equal(addReadingBrackets('やま'), null);
  });
});

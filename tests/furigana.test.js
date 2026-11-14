import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFurigana, plainFurigana } from '../core/furigana.js';

describe('parseFurigana', () => {
  test('nhiều cụm trong một câu', () => {
    assert.deepEqual(parseFurigana('毎朝[まいあさ]、約束[やくそく]を守[まも]る。'), [
      { base: '毎朝', ruby: 'まいあさ' },
      { text: '、' },
      { base: '約束', ruby: 'やくそく' },
      { text: 'を' },
      { base: '守', ruby: 'まも' },
      { text: 'る。' },
    ]);
  });

  test('có okurigana: furigana chỉ gắn vào phần kanji', () => {
    assert.deepEqual(parseFurigana('食[た]べる'), [{ base: '食', ruby: 'た' }, { text: 'べる' }]);
  });

  test('chỉ gắn vào cụm kanji liền ngay trước "[" ', () => {
    assert.deepEqual(parseFurigana('大きな約束[やくそく]'), [{ text: '大きな' }, { base: '約束', ruby: 'やくそく' }]);
    assert.deepEqual(parseFurigana('人々[ひとびと]'), [{ base: '人々', ruby: 'ひとびと' }]); // 々 là một phần của cụm
  });

  test('chỉ có kana, không có furigana', () => {
    assert.deepEqual(parseFurigana('すし'), [{ text: 'すし' }]);
  });

  test('trước "[" không có kanji → giữ nguyên là chữ', () => {
    assert.deepEqual(parseFurigana('すし[sushi]'), [{ text: 'すし[sushi]' }]);
    assert.deepEqual(parseFurigana('[やく]'), [{ text: '[やく]' }]);
  });

  test('ngoặc thiếu hoặc không khớp → giữ nguyên là chữ', () => {
    assert.deepEqual(parseFurigana('約束[やくそく'), [{ text: '約束[やくそく' }]);
    assert.deepEqual(parseFurigana('約束やくそく]'), [{ text: '約束やくそく]' }]);
    assert.deepEqual(parseFurigana('約[[やく]]'), [{ text: '約[[やく]]' }]);
    assert.deepEqual(parseFurigana('約束[やく]そく]'), [{ base: '約束', ruby: 'やく' }, { text: 'そく]' }]);
  });

  test('ngoặc rỗng → giữ nguyên là chữ', () => {
    assert.deepEqual(parseFurigana('約束[]を'), [{ text: '約束[]を' }]);
    assert.deepEqual(parseFurigana('約束[  ]'), [{ text: '約束[  ]' }]);
  });

  test('chuỗi rỗng, null, undefined → mảng rỗng', () => {
    assert.deepEqual(parseFurigana(''), []);
    assert.deepEqual(parseFurigana(null), []);
    assert.deepEqual(parseFurigana(undefined), []);
  });

  test('cắt khoảng trắng trong cách đọc', () => {
    assert.deepEqual(parseFurigana('約束[ やくそく ]'), [{ base: '約束', ruby: 'やくそく' }]);
  });
});

describe('plainFurigana', () => {
  test('bỏ phần cách đọc', () => {
    assert.equal(plainFurigana('約束[やくそく]を守[まも]る'), '約束を守る');
    assert.equal(plainFurigana('食[た]べる'), '食べる');
  });

  test('chữ không có furigana hoặc cú pháp sai thì giữ nguyên', () => {
    assert.equal(plainFurigana('すし'), 'すし');
    assert.equal(plainFurigana('約束[やくそく'), '約束[やくそく');
    assert.equal(plainFurigana('約束[]'), '約束[]');
    assert.equal(plainFurigana(''), '');
  });
});

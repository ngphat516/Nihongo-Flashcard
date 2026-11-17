import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cardMatches, fold } from './cards.js';

const card = {
  term: '約束[やくそく]を守[まも]る', meaning: 'Giữ lời hứa', reading: 'やくそくをまもる',
  example: '友達[ともだち]と約束[やくそく]をしました。',
};

test('A9: tìm cả từ và câu ví dụ qua ranh giới furigana', () => {
  for (const query of ['約束を守る', '友達と約束', 'giu loi HUA', 'やくそくをまもる']) {
    assert.equal(cardMatches(card, fold(query)), true, query);
  }
  assert.equal(cardMatches(card, '[やくそく]'), false);
});

test('A9: tìm không phân biệt dấu Latin nhưng giữ dấu tiếng Nhật', () => {
  assert.equal(fold('ĐẶT LỊCH'), 'dat lich');
  assert.equal(cardMatches({ term: 'が', meaning: 'trợ từ' }, fold('か')), false);
  assert.equal(cardMatches({ term: 'ぱん', meaning: 'bánh mì' }, fold('はん')), false);
  assert.equal(cardMatches({ term: 'が', meaning: 'trợ từ' }, fold('か\u3099')), true);
});

test('A9: thẻ chỉ có từ và nghĩa vẫn tìm được, từ khóa rỗng hiện thẻ', () => {
  assert.equal(cardMatches({ term: 'ありがとう', meaning: 'Cảm ơn' }, 'cam on'), true);
  assert.equal(cardMatches({ term: 'ありがとう', meaning: 'Cảm ơn' }, ''), true);
  assert.equal(cardMatches(card, 'không tồn tại'), false);
});

test('A9: ngoặc không hợp lệ vẫn là nội dung tìm kiếm nguyên bản', () => {
  assert.equal(cardMatches({ term: '漢字[]', meaning: 'chữ Hán' }, '漢字[]'), true);
  assert.equal(cardMatches({ term: 'かな[abc]', meaning: 'kana' }, 'かな[abc]'), true);
});

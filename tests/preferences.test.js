import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { installMemoryStorage } from './helpers/memory-storage.js';
import { FURIGANA_KEY, isFuriganaOn, setFuriganaOn } from '../core/preferences.js';

describe('furigana bật/tắt (L7)', () => {
  let storage;
  beforeEach(() => {
    storage = installMemoryStorage();
  });
  afterEach(() => {
    delete globalThis.localStorage;
  });

  test('mặc định bật', () => {
    assert.equal(isFuriganaOn(), true);
  });

  test('tắt rồi đọc lại ra tắt, bật lại ra bật', () => {
    setFuriganaOn(false);
    assert.equal(isFuriganaOn(), false);
    assert.equal(storage.getItem(FURIGANA_KEY), 'off');
    setFuriganaOn(true);
    assert.equal(isFuriganaOn(), true);
  });

  test('key riêng, ?reset (xóa key "nholau:") không xóa lựa chọn', () => {
    assert.ok(!FURIGANA_KEY.startsWith('nholau:'));
  });

  test('localStorage ném lỗi → coi như bật, ghi không làm hỏng trang', () => {
    const broken = {
      getItem() {
        throw new Error('SecurityError');
      },
      setItem() {
        throw new Error('QuotaExceededError');
      },
    };
    Object.defineProperty(globalThis, 'localStorage', { value: broken, configurable: true, writable: true });
    assert.equal(isFuriganaOn(), true);
    assert.doesNotThrow(() => setFuriganaOn(false));
  });

  test('không có localStorage (Node, trình duyệt chặn hẳn) → bật', () => {
    delete globalThis.localStorage;
    assert.equal(isFuriganaOn(), true);
    assert.doesNotThrow(() => setFuriganaOn(false));
  });
});

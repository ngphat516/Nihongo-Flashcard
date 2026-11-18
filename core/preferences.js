/**
 * Lựa chọn hiển thị của người học, lưu trong trình duyệt. Khác dữ liệu thẻ/bộ nên không đi qua storage.js.
 *
 * Key riêng, không có tiền tố 'nholau:' của storage.js, để ?reset (xóa dữ liệu thẻ) không xóa luôn lựa chọn.
 * localStorage lỗi hoặc bị chặn (chế độ riêng tư, chặn cookie) thì coi như mặc định, không làm hỏng trang.
 * Không đụng document hay localStorage lúc import, nên chạy được trong Node test.
 */

export const FURIGANA_KEY = 'nholau-furigana';

/** Furigana có đang bật không. Mặc định bật. */
export function isFuriganaOn() {
  try {
    return globalThis.localStorage?.getItem(FURIGANA_KEY) !== 'off';
  } catch {
    return true;
  }
}

/** Lưu lựa chọn bật/tắt furigana. Không lưu được thì bỏ qua (lựa chọn chỉ còn tới khi tải lại trang). */
export function setFuriganaOn(on) {
  try {
    globalThis.localStorage?.setItem(FURIGANA_KEY, on ? 'on' : 'off');
  } catch {
    // localStorage bị chặn hoặc đầy: trang vẫn đổi được hiển thị, chỉ không nhớ cho lần sau
  }
}

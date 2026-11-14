/**
 * LỚP TƯƠNG THÍCH front/back — TẠM, BỎ Ở L6b.
 *
 * Thẻ đã đổi từ 2 mặt front/back sang term/meaning/reading/example/jlpt (L6). Lớp này giữ cho
 * các trang chưa đổi (Album, Tạo thẻ, Học) và dữ liệu cũ trong localStorage vẫn chạy:
 *   - readCard:  thẻ cũ chỉ có front/back → term = front, meaning = back; mọi thẻ trả ra kèm
 *                front = term, back = meaning để trang cũ đọc tạm.
 *   - writeCard: nhận { front, back } như tên khác của { term, meaning }, rồi bỏ front/back
 *                để storage chỉ lưu trường mới.
 * Chỉ core/repo.js dùng file này. L6b: xóa file, bỏ 2 hàm này trong repo.js.
 */

/** Thẻ đọc từ storage → thẻ đủ trường mới, kèm front/back tạm. */
export function readCard(raw) {
  if (!raw) return null;
  const { front, back, ...rest } = raw;
  const card = {
    ...rest,
    term: raw.term ?? front ?? '',
    meaning: raw.meaning ?? back ?? '',
    reading: raw.reading ?? '',
    example: raw.example ?? '',
    jlpt: raw.jlpt ?? '',
  };
  return { ...card, front: card.term, back: card.meaning };
}

/**
 * Dữ liệu sắp ghi (thẻ, hoặc các trường trang gửi vào createCard/updateCard) → chỉ còn trường mới.
 * Có cả term lẫn front thì term thắng. Trường nào không có thì giữ không có (updateCard chỉ sửa trường được gửi).
 */
export function writeCard(data) {
  const { front, back, ...rest } = data;
  if (rest.term === undefined && front !== undefined) rest.term = front;
  if (rest.meaning === undefined && back !== undefined) rest.meaning = back;
  return rest;
}

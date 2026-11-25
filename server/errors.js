export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const notFound = () => new HttpError(404, 'NOT_FOUND', 'Không tìm thấy dữ liệu.');
export const invalid = () => new HttpError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ.');
export const conflict = () => new HttpError(409, 'CONFLICT', 'Dữ liệu đã được sửa ở nơi khác, hãy tải lại trang.');

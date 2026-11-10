# Hướng dẫn cho agent — Nhớ Lâu

App web học tiếng Nhật bằng flashcard, lịch ôn theo SM-2 kiểu Anki. HTML/CSS/JS thuần, không build, dữ liệu trong localStorage. Đồ án nhóm 4 người. Trả lời, commit, tài liệu và chữ trên giao diện đều bằng **tiếng Việt**.

## Tài liệu

- [`docs/process.md`](docs/process.md): nhật ký tiến độ. Đọc mục trên cùng khi bắt đầu một phiên.
- [`docs/tasks.md`](docs/tasks.md): mã task (H1, A2, L6, B1…), người phụ trách, trạng thái. Đọc khi nhận việc.
- [`docs/product.md`](docs/product.md): app làm gì, từ ngữ của dự án, quyết định đã chốt và **chưa chốt**. Đọc khi việc chạm tới tính năng hay chữ trên giao diện.
- [`docs/architecture.md`](docs/architecture.md): thư mục, 4 trang, luồng trang → `repo.js` → `storage.js`, API, dữ liệu, SM-2. Đọc trước khi sửa JS.
- [`docs/conventions.md`](docs/conventions.md): luật code, CSS và tên class, nhánh/PR, định nghĩa xong, trước khi nộp. Đọc trước khi viết code hoặc commit.

## Luật cứng

- **Phạm vi:** mỗi task chỉ sửa trong `pages/<trang>/` của task đó. Phần chung (`core/`, `styles/`, `dev/`, header 4 file HTML, product/architecture/conventions) thuộc Leader: chỉ sửa khi task là của Leader hoặc người dùng yêu cầu rõ.
- **Dữ liệu:** trang đọc/ghi qua `core/repo.js`; `storage.js` và `seed.js` chỉ `core/` dùng.
- **XSS:** đưa dữ liệu người dùng vào trang bằng `h()` hoặc `textContent`.
- **Đường dẫn:** luôn tương đối; link giữa trang dùng `routes`.
- **CSS:** dùng biến trong `styles/tokens.css` và class chung trong `pages/styleguide/`.
- **Chưa chốt:** gặp mục trong [product.md › Chưa chốt](docs/product.md#chưa-chốt) thì hỏi người dùng, không tự quyết.

## Chạy

- Test: `npm test` (Node 20+).
- Server: `python -m http.server 5500`, mở http://localhost:5500. Thêm `?seed` để có dữ liệu mẫu, `?reset` để xóa.

## Xong việc

1. Kiểm tra theo [định nghĩa xong](docs/conventions.md#định-nghĩa-xong-một-task).
2. Sửa cột trạng thái trong `docs/tasks.md`.
3. Thêm một mục lên đầu `docs/process.md` theo mẫu ở đầu file đó.
4. Hành vi, API hay luật đã đổi thì sửa tài liệu tương ứng; mỗi thông tin chỉ ghi ở một file ([bảng](docs/conventions.md#tài-liệu)).

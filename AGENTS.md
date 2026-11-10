# Hướng dẫn cho agent — Nhớ Lâu

App web học tiếng Nhật bằng flashcard, lịch ôn theo SM-2 kiểu Anki. HTML/CSS/JS thuần, không build, dữ liệu trong localStorage. Đồ án nhóm 4 người. Trả lời, commit, tài liệu và chữ trên giao diện đều bằng **tiếng Việt**.

## Bắt đầu một việc

1. Đọc mục trên cùng của [`docs/process.md`](docs/process.md): việc vừa làm, việc tiếp theo, vướng mắc.
2. Tìm task trong [`docs/tasks.md`](docs/tasks.md) theo mã (H1, A2, L6, B1…). Mỗi task có tiêu chí xong, hàm core cần dùng và task phải xong trước (VD "Cần L6").
3. Đọc thêm tài liệu theo loại việc, danh sách ở mục dưới.
4. Tạo nhánh theo [conventions.md › Nhánh](docs/conventions.md#nhánh-commit-pr). Chạy server, mở trang của task với `?seed`.

## Tài liệu

- [`docs/product.md`](docs/product.md): app làm gì, từ ngữ của dự án, quyết định đã chốt và **chưa chốt**. Đọc khi việc chạm tới tính năng hay chữ trên giao diện.
- [`docs/design.md`](docs/design.md): màu nào dùng ở đâu, chữ, bố cục, bìa bộ thẻ, chip, icon. Đọc khi việc chạm tới giao diện.
- [`docs/architecture.md`](docs/architecture.md): thư mục, 4 trang, luồng trang → `repo.js` → `storage.js`, API, dữ liệu, SM-2. Đọc trước khi sửa JS.
- [`docs/conventions.md`](docs/conventions.md): luật code, CSS và bảng class dùng chung, nhánh/PR, định nghĩa xong, trước khi nộp. Đọc trước khi viết code hoặc commit.
- Trang styleguide `pages/styleguide/`: xem tận mắt mọi biến màu và class kèm mẫu HTML, mẫu JS cho lật thẻ, chip, dialog, toast.

## Luật cứng

- **Phạm vi:** mỗi task chỉ sửa trong `pages/<trang>/` của task đó. Phần chung (`core/`, `styles/`, `dev/`, cột điều hướng trong 4 file HTML, product/design/architecture/conventions) thuộc Leader: chỉ sửa khi task là của Leader hoặc người dùng yêu cầu rõ.
- **Dữ liệu:** trang đọc/ghi qua `core/repo.js`; `storage.js` và `seed.js` chỉ `core/` dùng.
- **XSS:** đưa dữ liệu người dùng vào trang bằng `h()` hoặc `textContent`.
- **Đường dẫn:** luôn tương đối; link giữa trang dùng `routes`.
- **Giao diện:** dùng biến trong `styles/tokens.css` và class chung; màu chính `--primary` chỉ cho hành động; chữ tiếng Nhật gắn `lang="ja"`.
- **Chưa chốt:** gặp mục trong [product.md › Chưa chốt](docs/product.md#chưa-chốt) hoặc [design.md › Chốt khi làm prototype](docs/design.md#chốt-khi-làm-prototype) thì hỏi người dùng, không tự quyết.

## Chạy

- Test: `npm test` (Node 20+).
- Server: `python -m http.server 5500`, mở http://localhost:5500. Thêm `?seed` để có dữ liệu mẫu, `?reset` để xóa.

## Xong việc

1. Kiểm tra theo [định nghĩa xong](docs/conventions.md#định-nghĩa-xong-một-task).
2. Sửa cột trạng thái trong `docs/tasks.md`.
3. Thêm một mục lên đầu `docs/process.md` theo mẫu ở đầu file đó.
4. Hành vi, API hay luật đã đổi thì sửa tài liệu tương ứng; mỗi thông tin chỉ ghi ở một file ([bảng](docs/conventions.md#tài-liệu)).

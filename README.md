# Học tiếng Nhật bằng flashcard

Web app giúp học từ vựng và kanji tiếng Nhật bằng flashcard. Lịch ôn do thuật toán lặp lại ngắt quãng **SM-2 kiểu Anki** tính, để mỗi thẻ quay lại đúng lúc sắp quên.
HTML / CSS / JavaScript thuần (không framework, không build), dữ liệu lưu trong trình duyệt (`localStorage`).

**Dùng thử:** https://nho-lau-gamma.vercel.app. Mở [link có `?seed`](https://nho-lau-gamma.vercel.app/?seed) để có sẵn 3 bộ thẻ mẫu.

Đồ án nhóm 4 người, đang làm giai đoạn 1 (flashcard). Tiến độ: [docs/process.md](docs/process.md).

Backend đang làm, xem [docs/backend.md](docs/backend.md). Tính năng tạo thẻ bằng AI dùng Gemini API, nên app không hướng tới người dùng dưới 18 tuổi (điều khoản của Gemini API).

## Xem nhanh với dữ liệu mẫu

App mới mở thì trống. Để xem đủ tính năng (heatmap, biểu đồ, chuỗi ngày học):

- Thêm `?seed` vào link, VD https://nho-lau-gamma.vercel.app/?seed: tạo 3 bộ thẻ tiếng Nhật kèm khoảng 4 tháng lịch sử ôn. Đây là **dữ liệu mẫu**, không phải tiến độ học thật.
- Thêm `?reset` để xóa sạch dữ liệu. Lệnh chỉ xóa dữ liệu trong trình duyệt của người mở link, không ảnh hưởng ai khác.

## Chạy thử

ES modules **không chạy** khi mở file trực tiếp (`file://...`), nên phải mở qua server cục bộ:

- **VS Code:** cài extension *Live Server* (VS Code sẽ gợi ý), chuột phải `index.html` → *Open with Live Server*.
- **Hoặc dùng Python:**

  ```bash
  python -m http.server 5500
  ```

  (Mac/Linux dùng `python3`), rồi mở http://localhost:5500

**Dữ liệu mẫu:** http://localhost:5500/?seed và `?reset` như [ở trên](#xem-nhanh-với-dữ-liệu-mẫu). Hoặc gõ trong Console: `dev.seed()` / `dev.reset()`.

## Chạy test

Cần Node 20 trở lên. Cài thư viện từ lockfile trước khi chạy test.

```bash
npm ci
npm test
```

Hai bộ test tích hợp tự tạo PostgreSQL 16 trên loopback, dùng mật khẩu sinh ngẫu nhiên và xóa container sau khi chạy. Nếu Docker hoặc image chưa có, `npm test` ghi rõ các bộ đã bỏ qua. Muốn bắt buộc chạy cả hai, dùng:

```bash
docker pull postgres:16-alpine
REQUIRE_TEST_POSTGRES=1 npm test
```

Test xác minh ID token bằng khóa RSA sinh tại chỗ. Test không cần tài khoản Google, Gemini hay `DATABASE_URL` của máy.

## Chạy migration PostgreSQL

Chạy `npm run migrate` trong tiến trình riêng với `DATABASE_URL` của role migration sở hữu database. Đặt `PGSSLMODE=disable` trong mạng Docker nội bộ hoặc `require` khi nối DB từ xa. Nếu DB dùng CA riêng, cấp chứng chỉ CA cho Node qua `NODE_EXTRA_CA_CERTS`.

Cho ứng dụng một role đăng nhập riêng, không sở hữu database/bảng và không có quyền quản trị. Trên database mới của PostgreSQL 16, sau khi chạy migration, chủ bảng cấp quyền như sau (thay `nholau_app` bằng role đã tạo):

```sql
GRANT USAGE ON SCHEMA public TO nholau_app;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.users, public.decks, public.cards, public.review_logs TO nholau_app;
```

Container app chỉ nhận `DATABASE_URL` của role này. Bảng `schema_migrations` thuộc role migration. Khi có migration thêm bảng ứng dụng, chủ bảng cấp quyền cho bảng mới.

## Tài liệu

| File | Nội dung |
|---|---|
| [docs/product.md](docs/product.md) | App làm gì, từ ngữ của dự án, phạm vi, lộ trình |
| [docs/design.md](docs/design.md) | Giao diện: màu, chữ, bố cục, thành phần, icon |
| [docs/architecture.md](docs/architecture.md) | Cấu trúc thư mục, 4 trang, API dữ liệu, thuật toán SM-2 |
| [docs/conventions.md](docs/conventions.md) | Luật code, CSS và tên class, nhánh/PR, trước khi nộp |
| [docs/tasks.md](docs/tasks.md) | Phân việc, mã task, trạng thái |
| [docs/process.md](docs/process.md) | Nhật ký tiến độ |
| [AGENTS.md](AGENTS.md) | Hướng dẫn cho AI agent (Claude Code đọc qua `CLAUDE.md`) |

Thành viên mới: đọc `tasks.md` để biết việc của mình, rồi `conventions.md` trước khi code.

# Nhớ Lâu — học tiếng Nhật bằng flashcard

Web app giúp học từ vựng và kanji tiếng Nhật bằng flashcard. Lịch ôn do thuật toán lặp lại ngắt quãng **SM-2 kiểu Anki** tính, để mỗi thẻ quay lại đúng lúc sắp quên.
HTML / CSS / JavaScript thuần (không framework, không build), dữ liệu lưu trong trình duyệt (`localStorage`).

Đồ án nhóm 4 người, đang làm giai đoạn 1 (flashcard). Tiến độ: [docs/process.md](docs/process.md).

## Chạy thử

ES modules **không chạy** khi mở file trực tiếp (`file://...`), nên phải mở qua server cục bộ:

- **VS Code:** cài extension *Live Server* (VS Code sẽ gợi ý), chuột phải `index.html` → *Open with Live Server*.
- **Hoặc dùng Python:**

  ```bash
  python -m http.server 5500
  ```

  (Mac/Linux dùng `python3`), rồi mở http://localhost:5500

**Dữ liệu mẫu:** thêm `?seed` vào URL (VD http://localhost:5500/?seed) để tạo 3 bộ thẻ + khoảng 4 tháng lịch sử ôn.
Thêm `?reset` để xóa sạch. Hoặc gõ trong Console: `dev.seed()` / `dev.reset()`.

## Chạy test

Cần Node 20 trở lên (chỉ để chạy test, app không cần Node).

```bash
npm test
```

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

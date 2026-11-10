# Nhật ký tiến độ

Đã làm gì, khi nào, quyết định gì. Việc còn lại xem [tasks.md](tasks.md).

**Cách ghi:** mỗi PR vào `main` thêm một mục; agent làm xong việc cũng thêm một mục. Mục mới nhất ở **trên cùng**, theo mẫu:

```
## YYYY-MM-DD — Tên việc (mã task)

- **Người làm:** …
- **Đã xong:** … (commit / PR)
- **Quyết định:** … (luật hay quyết định sản phẩm thì ghi chi tiết vào product.md / conventions.md, ở đây chỉ nhắc)
- **Tiếp theo:** …
- **Vướng mắc:** … (bỏ dòng này nếu không có)
```

---

## 2026-11-11 — Bộ tài liệu `docs/` (L10)

- **Người làm:** Leader, cùng Claude.
- **Đã xong:** chuyển `TASKS.md` thành `docs/tasks.md` (thêm cột trạng thái, task L6–L10, bảng lỗi B1–B5, bỏ S9); viết `docs/product.md`, `docs/architecture.md`, `docs/conventions.md` và file này; thêm `AGENTS.md` + `CLAUDE.md` cho agent; rút gọn `README.md`. Nhánh `docs/tai-lieu-du-an`.
- **Quyết định:** tài liệu để trong `docs/`, viết bằng tiếng Việt. Mỗi thông tin chỉ ghi ở một file (bảng ở [conventions.md › Tài liệu](conventions.md#tài-liệu)). Mỗi PR cập nhật `tasks.md` và thêm một mục vào nhật ký này.
- **Tiếp theo:** L6 thẻ tiếng Nhật, sửa luôn B1–B5; L2 bật bảo vệ nhánh `main`, điền `CODEOWNERS`.
- **Vướng mắc:** đề bài và hạn nộp chưa có trong repo. Các câu hỏi còn mở ghi ở [product.md › Chưa chốt](product.md#chưa-chốt).

## 2026-11-10 — Hệ thống giao diện (L4)

- **Người làm:** Leader, cùng Claude.
- **Đã xong:** `styles/tokens.css`, `styles/components.css`, font Noto Sans JP, trang `pages/styleguide/`, đổi tên class sang kiểu Bootstrap ở 4 trang. Commit `e80b4a2`, 37/37 test xanh.
- **Quyết định:**
  - Giao diện: chỉ CSS tự viết (bỏ ý dùng Tailwind và thư viện Bootstrap), không có JS cho component, bỏ dark mode, tên class kiểu Bootstrap, `base.css` `@import` 2 file mới nên 4 file HTML không phải sửa. Styleguide là công cụ dev, xóa trước khi nộp.
  - Sản phẩm: app chỉ để học tiếng Nhật, có furigana, không có âm thanh. Thẻ sẽ có trường riêng (`term`, `meaning`, …). Furigana là nút bật/tắt chung. Đổi được chiều học. Giai đoạn sau có thêm dạng bài tập, ghi chú. Chi tiết ở [product.md](product.md).
- **Vướng mắc:** Claude trên web không push được (Claude GitHub App chưa được cài cho tài khoản sở hữu repo). Commit được chuyển về máy Leader bằng git bundle rồi push thẳng lên `main`, không qua PR.

## 2026-11-10 — Review `core/` và chốt cấu trúc code

- **Người làm:** Leader, cùng Claude.
- **Đã xong:** review toàn bộ `core/`, 4 trang, CSS và test. 37/37 test xanh, kể cả khi chạy ở 5 múi giờ khác nhau; SM-2 khớp với Anki. Tìm ra 4 lỗi và vài điểm nhỏ, ghi ở [tasks.md › Lỗi đã biết](tasks.md#lỗi-đã-biết-trong-core) (B1–B5).
- **Quyết định:**
  - 4 lỗi để sau, sửa cùng lúc khi làm lại `core/` cho thẻ tiếng Nhật.
  - Cấu trúc: giữ nhiều trang HTML (MPA), header viết sẵn trong 4 file HTML, truyền dữ liệu giữa trang chỉ qua tham số URL trong `routes`, trang import mọi module `core/` trừ `storage.js` và `seed.js`, file trang dài quá khoảng 300 dòng thì tách module. Ghi ở [conventions.md](conventions.md#code).

## 2026-11-10 — Codebase nền (L1)

- **Người làm:** Leader.
- **Đã xong:** tạo repo; cấu trúc mỗi trang một folder; `core/` (lưu localStorage, SM-2, chọn thẻ, dữ liệu mẫu) với 37 test; CSS chung; khung 4 trang có sẵn khung `.todo` và đoạn `DEMO`; `TASKS.md` phân việc. Commit `41b70c6`.

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

## 2026-11-11 — Trang Học (S1–S8)

- **Người làm:** AT, cùng Codex.
- **Đã xong:** luồng chọn bộ, lật thẻ, chấm điểm, xem kết quả và tiếp tục khi thẻ đến hạn. Hoàn tác hiện lại đúng thẻ vừa chấm kể cả khi thẻ khác đến hạn. Dùng các thành phần chung của styleguide, bỏ nút phát âm theo phạm vi sản phẩm. Bản triển khai ở nhánh `feature/study`.
- **Kiểm tra:** 37 test qua. Đã thử trên Edge với `?seed`, `?reset`, mã bộ sai, phím tắt, hoàn tác, tự tiếp tục, chế độ giảm chuyển động và màn hình 375px.
- **Tiếp theo:** mở PR cho Leader review. Khi L6 xong, cập nhật mặt thẻ theo cấu trúc thẻ tiếng Nhật.

## 2026-11-11 — Cột điều hướng và khung Trang chủ (L12)

- **Người làm:** Leader, cùng Claude.
- **Đã xong:**
  - Thay header ngang bằng cột điều hướng ở cả 4 trang và styleguide, làm giống cột icon trong mẫu: cột nổi bo góc, logo, 4 nút tròn chỉ có icon Lucide (rê chuột hoặc Tab tới thì hiện tên), nút furigana ở đáy. Dưới 768px thành thanh tab 5 ô ở đáy, có nhãn chữ.
  - Thêm biến `--rail-width`, `--tabbar-height`; đổi `--z-header` thành `--z-nav`; toast nằm giữa phần nội dung và nổi trên thanh tab.
  - Mục đang chọn (cột điều hướng và chip) đổi từ nền xanh nhạt sang xanh matcha đậm, chữ trắng.
  - Dựng khung 2 cột Trang chủ (`pages/home/home.css`), mỗi khối là một ô `.todo` ghi mã task: `#greeting` (H7), `#summary` (H2), `#today` (H3, H4), `#heatmap` (H1, H5), `#chart` (H8). Trang khác giữ nguyên ô `.todo`.
  - Đã thử ở 375px, 800px, 1024px, 1280px: không cuộn ngang, Console không có lỗi.
  - Nhánh `styles/giao-dien-matcha`.
- **Quyết định:**
  - Làm thẳng, không qua prototype. Đã chốt: cột rộng 72px, thanh tab cao 64px, panel phải 300px, logo chữ 覚.
  - Leader xem bản đầu, thấy chưa giống mẫu, nên chốt lại 2 quyết định của vòng hỏi đáp trước:
    - Bỏ nhãn chữ trên cột ở màn hình rộng, thay bằng tooltip; điện thoại vẫn có nhãn.
    - Mục đang chọn dùng xanh matcha đậm thay cho xanh nhạt (mẫu dùng màu đen).
  - Trang chủ chia 2 cột từ 1024px chứ không phải 768px, vì ở 768px cột chính còn quá hẹp ([design.md › Trang chủ](design.md#trang-chủ)).
  - Bo góc, bóng, cỡ tiêu đề để sau, thành task L13.
  - H7 còn lời chào và chuỗi ngày, vì khung đã làm trong L12.
- **Tiếp theo:**
  - Thành viên làm trang của mình trên khung mới: thay ô `.todo` và đoạn `DEMO`.
  - L6 (thẻ tiếng Nhật + `Deck.color`), rồi L7 nối nút furigana.

## 2026-11-11 — Màu và chữ mới, tài liệu giao diện (L11)

- **Người làm:** Leader, cùng Claude.
- **Đã xong:**
  - Học theo một mẫu dashboard giáo dục, chốt qua 2 vòng hỏi đáp.
  - Đổi `styles/tokens.css`: màu chính xanh matcha `#527a2e`, nền xám ánh lục, heatmap xanh, 6 màu bìa pastel, biến cho biểu đồ.
  - Font Plus Jakarta Sans + Noto Sans JP; chữ có `lang="ja"` dùng Noto Sans JP.
  - Thêm class `chip` và `cover` vào `components.css`, cập nhật styleguide.
  - Viết `docs/design.md`; sửa product, conventions, tasks, `AGENTS.md`.
  - Nhánh `styles/giao-dien-matcha`.
- **Quyết định:** chi tiết ở [design.md](design.md) và [product.md](product.md#đã-chốt-chưa-làm).
  - Bố cục: cột icon bên trái (điện thoại: thanh tab ở đáy); Trang chủ 2 cột với panel phải gồm lời chào, chuỗi ngày, 4 ô thống kê, biểu đồ lượt ôn 6 tháng.
  - Màu chính chỉ cho hành động; màu trạng thái và chấm điểm giữ theo Anki.
  - Bộ thẻ có màu bìa (`deck.color`, làm cùng L6).
  - Nút furigana ở cuối cột điều hướng, trình duyệt nhớ lựa chọn.
  - Bỏ các phần xã hội của mẫu (bạn bè, đánh giá sao, xếp hạng…).
  - Icon dùng Lucide, chép SVG vào HTML.
  - Thêm task L11, L12, H7, H8, C8.
- **Tiếp theo:** L6 (thẻ tiếng Nhật + `Deck.color`); L12 làm prototype trên `prototype/giao-dien-moi` để chốt bo góc, bóng, cỡ tiêu đề, rồi làm cột điều hướng.

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

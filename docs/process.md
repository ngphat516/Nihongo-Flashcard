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

## 2026-11-11 — Deploy lên Vercel

- **Người làm:** Leader, cùng Claude.
- **Đã xong:**
  - Deploy `main` lên Vercel bằng CLI, project `nho-lau`. Link ghi trong README.
  - Thêm `.vercelignore`, để không đưa tài liệu, test, `pages/styleguide/` và `package.json` lên Vercel.
  - Đã thử trên link thật với `?seed`. Cả 4 trang nạp đủ file, không file nào 404, Console không có lỗi.
- **Quyết định:**
  - Deploy trên Vercel thay cho GitHub Pages.
  - Tạm giữ `dev/dev.js` để demo bằng `?seed`.
  - Cách deploy lại và việc dọn code trước khi nộp ghi ở [conventions.md › Trước khi nộp](conventions.md#trước-khi-nộp--deploy).
- **Tiếp theo:** mỗi lần merge vào `main` thì Leader chạy `vercel deploy --prod`. Lúc nộp bài thì dọn code (L5).
- **Vướng mắc:** chưa nối được Vercel với repo GitHub: app Vercel trên GitHub chưa có quyền vào repo. Muốn merge xong tự deploy thì cấp quyền trong GitHub › Settings › Applications › Vercel, rồi chạy `vercel git connect`.

## 2026-11-11 — Tiến độ sau 4 PR đầu tiên (L3)

- **Người làm:** Leader, cùng Claude.
- **Đã xong:**
  - Cả 4 trang đã vào `main`:
    - [PR #1](https://github.com/ngphat516/Nihongo-Flashcard/pull/1): trang Học (S1–S8);
    - [PR #2](https://github.com/ngphat516/Nihongo-Flashcard/pull/2): Album (A1–A8);
    - [PR #3](https://github.com/ngphat516/Nihongo-Flashcard/pull/3): Tạo thẻ (C1–C3);
    - [PR #4](https://github.com/ngphat516/Nihongo-Flashcard/pull/4): Trang chủ (H1–H8).

    Chi tiết từng trang ở các mục bên dưới. Không trang nào còn khung `.todo` hay đoạn `DEMO`.
  - Chạy thử luồng chính sau PR #3, bắt đầu từ `?reset`:
    - tạo bộ 2 thẻ ở Tạo thẻ;
    - bấm "Học ngay", chấm Tốt: bộ đếm thành 1 Mới, 1 Đang học;
    - mở Album: thấy bộ đó với badge Mới và Đang học;
    - từ Album bấm "+ Thêm thẻ": mở đúng bộ ở Tạo thẻ.
  - Sau PR #4, Trang chủ với `?seed` có đủ lời chào, heatmap, bìa các bộ, biểu đồ 6 tháng, không cuộn ngang. Console không có lỗi ở mọi bước. `npm test` 43/43 (thêm 6 test số liệu Trang chủ trong `pages/home/analytics.test.js`).
  - Cập nhật tài liệu theo code đã merge:
    - `tasks.md`:
      - ghi trang nào đã tự tránh lỗi B2, B3, B4;
      - ghi chỗ mỗi trang phải đổi khi làm L6;
      - L13 làm được vì đã có bìa thật.
    - `architecture.md`: thêm file mới của Album và Trang chủ; `npm test` chạy cả test trong `pages/home/`.
    - `product.md`:
      - phần Thẻ tiếng Nhật ghi cả 3 trang phải đổi;
      - bỏ mục "Giao diện mới" khỏi "Đã chốt, chưa làm" vì đã làm xong.
    - `AGENTS.md`: bỏ bước "thay khung `.todo`", vì không trang nào còn khung đó.
- **Quyết định:** chỗ cần đổi ở mỗi trang khi làm L6 ghi ở đầu mục của trang đó trong `tasks.md`, dòng L6 trỏ tới đó, để người làm trang thấy ngay trong phần việc của mình.
- **Tiếp theo:**
  - **L6** (thẻ tiếng Nhật + màu bìa), sửa luôn B1–B5. Đây là việc đang chặn nhiều nhất:
    - L7, L9, C8 và màu bìa của A5 đều cần L6;
    - sau L6, 3 trang Album, Tạo thẻ, Học phải đổi mặt thẻ.
  - **L2:** bật bảo vệ `main`, điền `CODEOWNERS`.
  - **Việc "Nên có" / "Nếu kịp" khác:** C4, C5, C7, L13, L8 (cách lưu lịch ôn chưa chốt).
  - **L5** (kiểm thử cuối) khi các việc trên xong.
- **Vướng mắc:**
  - `main` chưa có bảo vệ. PR #1–#3 do chính người mở PR merge, PR #4 do Leader merge; không PR nào có lượt review trên GitHub (L2, L3).
  - Lỗi B4 vẫn hiện ra ở 2 trang:
    - `pages/album/?deck=constructor` hiện một bộ tên "Object";
    - `pages/study/?deck=constructor` báo "Xong rồi!" thay vì "Không tìm thấy".

## 2026-11-11 — Chuẩn bị PR Trang chủ (H1–H8)

- **Người làm:** Codex, theo yêu cầu người dùng.
- **Đã xong:** cập nhật H1–H8 thành Xong trong `tasks.md`; xóa 3 screenshot tạm trong `pages/home/screenshots/`; cập nhật ghi chú trạng thái trong `pages/home/REVIEW.md`. Giữ nguyên toàn bộ chức năng và thiết kế Home.
- **Kiểm tra:** đã fetch `main` mới nhất (`3be1e12`), nhánh Home đã chứa commit này và không xung đột. Chạy lại `npm test`: 43/43 qua; 84 kiểm tra Chromium qua; kiểm tra bổ sung `?seed` → `?reset` ở 375px qua; `git diff --check` sạch.
- **Tiếp theo:** tạo PR `feature/home` → `main` để nhóm review, không tự merge.
- **Điểm cần nhóm review:** ghi chú giới hạn 53 tuần/12 tháng lịch và Google Fonts trong `pages/home/REVIEW.md` vẫn được giữ nguyên; không thay đổi logic để tự chốt các điểm này.

## 2026-11-11 — Trang Tạo thẻ (C1, C2, C3)

- **Người làm:** Leader, cùng Claude (Leader nhận C1–C3 thay Thành viên 3).
- **Đã xong:**
  - Trang Tạo thẻ thành nơi soạn một bộ thẻ: `pages/create/` tạo bộ mới, `?deck=<id>` sửa bộ đó. Dropdown chọn bộ, ô tên / số thẻ mới mỗi ngày / mô tả, danh sách dòng thẻ 2 mặt có nút xóa, nút "Thêm thẻ", thanh Lưu dính ở đáy (Ctrl+Enter cũng lưu).
  - Kiểm tra mọi ô trước khi ghi; nhắc thẻ trùng mặt trước; hỏi xác nhận khi xóa thẻ đã lưu, khi đổi bộ lúc còn thay đổi chưa lưu, và khi rời trang.
  - Xóa khung `.todo` và đoạn `DEMO` của trang. Tách `card-rows.js` (dòng thẻ) và `feedback.js` (báo lỗi, toast, hộp xác nhận) để `create.js` không quá dài.
  - Đã thử với `?seed`, `?reset`, `?deck=` sai id, ở 375px, 800px, 1280px: không cuộn ngang, Console không có lỗi. Sửa thẻ đã ôn vẫn giữ nguyên tiến độ SM-2. `npm test` 37/37.
  - Nhánh `feature/create`.
- **Quyết định:**
  - Làm bản đơn giản theo yêu cầu của Leader: thẻ giữ 2 mặt `front`/`back`, không chờ L6; khi làm L6 thì đổi ô nhập của mỗi dòng.
  - Một trang vừa tạo vừa sửa bộ, lưu một lần cho cả bộ, thay cho form thêm từng thẻ.
  - Bỏ C6 (danh sách thẻ đã thay nó); C4, C5 để sau; C8 vẫn chờ L6.
  - Cảnh báo thẻ trùng dùng chữ phụ `--text-2` kèm icon `triangle-alert`, không dùng màu vàng, vì `tokens.css` chưa có màu cảnh báo.
  - Trang chỉ đổi tham số `deck` trên URL, giữ nguyên tham số khác, để `?seed` / `?reset` của `dev.js` vẫn chạy.
- **Tiếp theo:** L6 (thẻ tiếng Nhật), rồi đổi ô nhập của trang Tạo thẻ.

## 2026-11-11 — Trang Album (A1–A8)

- **Người làm:** Thành viên 2, cùng Claude.
- **Đã xong:**
  - A1: lưới bìa `cover`; cả bìa là một link tới `routes.album(id)`. Màu bìa lấy theo thứ tự `i % 6` vì chưa có L6.
  - A2, A3: trang chi tiết bộ gồm tên, mô tả, bộ đếm Mới / Đang học / Đến hạn hôm nay, nút Học ngay, Thêm thẻ, Sửa bộ, Xóa bộ; lưới thẻ lật (`flashcard`) kèm badge trạng thái và hạn ôn.
  - A4: sửa thẻ trong dialog (Ctrl+Enter để lưu, lỗi nhập liệu hiện trong dialog), xóa thẻ có hỏi xác nhận.
  - A5: sửa tên, mô tả, thẻ mới mỗi ngày; xóa bộ có hỏi xác nhận, xóa xong về lưới. Chưa có chọn màu bìa (cần L6).
  - A6: tìm theo nội dung 2 mặt, gõ không dấu vẫn ra; lọc bằng `chip` (chip "Đang học" gồm cả thẻ Học lại); sắp xếp mới tạo trước / sắp đến hạn trước (thẻ mới xếp cuối).
  - A7: nút "Học lại từ đầu" (có hỏi xác nhận) ở thẻ đã học.
  - A8: chưa có bộ nào, `?deck=` sai id, bộ chưa có thẻ.
  - Chia file: `album.js` (điểm vào + lưới), `detail.js` (chi tiết bộ), `ui.js` (dialog, toast).
  - Đã thử với `?seed` và `?reset` ở 1280px và 375px: không cuộn ngang, Console không có lỗi. Kịch bản chạy thử bấm qua cả A1–A8 trên Chrome.
  - Nhánh `feature/album`.
- **Quyết định:**
  - Mỗi màn hình một nút chính: lưới bộ là "+ Tạo bộ mới"; chi tiết bộ là "Học ngay", hoặc "+ Thêm thẻ đầu tiên" khi bộ chưa có thẻ.
  - Ô thẻ mới mỗi ngày để trống thì trang báo lỗi, không gửi xuống `updateDeck` (tránh lỗi B2).
  - Xóa thẻ và "Học lại từ đầu" đều hỏi xác nhận, vì không hoàn tác được.
- **Tiếp theo:** khi L6 xong: đổi `COVER_COLORS[i % 6]` trong `album.js` sang `deck.color`, sửa `cardFront` / `cardBack` ở đầu `detail.js` theo trường mới (gắn `lang="ja"`), thêm chọn màu bìa vào dialog sửa bộ (A5).
- **Vướng mắc:** `?deck=constructor` vẫn hiện như một bộ có thật cho tới khi Leader sửa lỗi B4 trong `core/storage.js`.

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

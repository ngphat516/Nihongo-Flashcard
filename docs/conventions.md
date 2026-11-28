# Quy ước

Luật chung cho cả nhóm và cho agent. Kiến trúc xem [architecture.md](architecture.md); việc cần làm xem [tasks.md](tasks.md).

## Ai sửa gì

- **Mỗi người chỉ sửa trong folder `pages/<trang>/` của mình** (bảng phân việc ở [tasks.md](tasks.md#phân-việc)).
- **Phần chung thuộc Leader:** `core/`, `styles/`, `dev/`, cột điều hướng trong 4 file HTML, và `docs/product.md`, `docs/design.md`, `docs/architecture.md`, `docs/conventions.md`. Cần đổi thì nhắn Leader hoặc mở PR riêng cho phần đó, không sửa lẫn trong PR của trang.
- **Sửa cột điều hướng thì sửa cả 4 file HTML** trong cùng một PR, vì cột được viết sẵn ở từng file.

## Code

1. **Đọc/ghi dữ liệu chỉ qua `core/repo.js`.** Trang được import mọi module trong `core/` trừ `storage.js`, `seed.js` và `migrate.js` (repo tự gọi). Nhờ vậy sau này đổi sang backend không phải sửa trang.
2. **Đưa dữ liệu người dùng vào trang bằng `h()` (trong `core/dom.js`) hoặc `textContent`.** Không dùng `innerHTML` với tên bộ, nội dung thẻ hay bất cứ thứ gì người dùng gõ, vì dễ bị lỗi bảo mật XSS.
3. **Mọi hàm trong `repo.js` đều async**, nhớ `await`. Lỗi do người dùng nhập sai có `err.name === 'ValidationError'`: hiện `err.message` cho người dùng; lỗi khác thì `throw` tiếp.
4. **Bọc code khởi động trang trong `startPage(async () => { ... })`**, để lỗi hiện lên trang thay vì chỉ nằm trong Console.
5. **Đường dẫn luôn tương đối** (`../../core/repo.js`, `styles/base.css`). Đường dẫn bắt đầu bằng `/` sẽ hỏng khi app nằm dưới thư mục con, VD Live Server mở cả thư mục cha hoặc GitHub Pages `/Nihongo-Flashcard/`.
6. **Link giữa các trang tạo bằng `routes`** (`routes.study(deck.id)`), không tự ghép chuỗi. Truyền dữ liệu sang trang khác chỉ bằng tham số URL khai báo trong `core/routes.js`; cần tham số mới thì báo Leader thêm.
7. **Chia file trong trang:** `<trang>.js` là điểm vào. File dài quá khoảng 300 dòng thì tách module trong cùng folder (VD `pages/study/session.js`). Module của trang nào chỉ import trong folder đó; trang này không import file của trang khác.
8. **Chữ trên giao diện bằng tiếng Việt**, dùng đúng các từ trong [product.md › Từ ngữ](product.md#từ-ngữ-của-dự-án).

## Giao diện (CSS)

Chỉ có CSS tự viết: không thư viện, không build, không dark mode. Mỗi trang nạp `styles/base.css` (CSS chung) và `pages/<trang>/<trang>.css` (CSS riêng). Màu nào dùng ở đâu, font, bố cục, icon: xem [design.md](design.md).

- **Màu, cỡ chữ, khoảng cách, bo góc dùng biến** trong `styles/tokens.css` (`var(--primary)`, `var(--text-sm)`, `var(--space-4)`), không viết mã màu hay số cứng. Thiếu biến thì báo Leader thêm.
- **Màu chính `--primary` chỉ dành cho hành động** (nút chính, link, mục đang chọn). Trạng thái thẻ và chấm điểm dùng `--state-*`, `--rate-*` ([design.md › Màu](design.md#màu-nào-dùng-ở-đâu)).
- **Chữ tiếng Nhật gắn `lang="ja"`**, VD `h('span', { lang: 'ja' }, card.term)`.
- **Icon là SVG của Lucide chép thẳng vào HTML**, có `aria-hidden="true"` và luôn có chữ đi kèm ([design.md › Icon](design.md#icon)).
- **Dùng class chung trước khi tự viết.** Xem [bảng class](#class-dùng-chung) bên dưới; phần cần JS (lật thẻ, dialog, toast) xem cách các trang đang làm, VD `pages/album/ui.js`, `pages/study/study.js`. Trang styleguide đã xóa khi dọn code trước khi nộp.
- **Tên class kiểu Bootstrap**, gạch ngang đơn:
  - Class chung không có tiền tố: `btn btn-primary`, `field-label`, `badge-new`.
  - Class riêng của trang bắt đầu bằng tên trang và viết trong CSS của trang: `album-grid`, `study-bar`, `create-preview`.
  - Class trạng thái do JS bật/tắt bắt đầu bằng `is-`: `is-flipped`, `is-active`, `is-zero`.
- **Hành vi** (lật thẻ, mở dialog, hiện toast) do trang tự viết 2–3 dòng JS bật/tắt class; không có thư viện JS cho component.

### Class dùng chung

| Class | Dùng cho |
|---|---|
| `btn` + `btn-primary` / `btn-danger` / `btn-ghost` / `btn-sm` | nút (dùng được cho `<a>`) |
| `rate-bar` + `btn btn-again` / `-hard` / `-good` / `-easy` | 4 nút chấm điểm, `<small>` bên trong ghi thời gian |
| `field` > `field-label`, `input`, `field-hint`, `field-error` | ô nhập; `input` dùng cho cả `<input>`, `<textarea>`, `<select>`; lỗi: thêm `aria-invalid="true"` |
| `panel` | khối nền trắng, viền, bo góc |
| `stats` > `stat` > `stat-value`, `stat-label` | ô thống kê |
| `counts` > `count count-new` / `-learning` / `-review` (số trong `<b>`) | bộ đếm Mới / Đang học / Đến hạn; `is-zero` khi bằng 0 |
| `badge badge-<card.state>` | trạng thái thẻ (chấm màu + chữ) |
| `chips` > `chip` (`<button aria-pressed>`) | nút lọc bật/tắt; đang chọn: `aria-pressed="true"` |
| `cover cover-<deck.color>` > `cover-mark`, `cover-title`, `cover-text`, `cover-meta` > `cover-badge` | bìa bộ thẻ màu pastel; cả bìa là một link |
| `<fieldset class="color-picker">` > `legend.field-label`, `label.color-picker-option` > `input[type=radio]` + `color-picker-swatch cover-<màu>` + `visually-hidden` (tên màu) | chọn màu bìa trong form tạo / sửa bộ; không cần JS |
| `flashcard` > `flashcard-inner` > `flashcard-face flashcard-front` / `-back` | thẻ lật; JS bật `is-flipped` |
| `<dialog class="dialog">` > `dialog-title`, `dialog-actions` | hộp xác nhận, mở bằng `showModal()`; xóa `returnValue` trước mỗi lần mở |
| `toast`, `toast-error` | thông báo nhỏ tự ẩn sau 3 giây |
| `alert`, `alert-error`, `alert-success` | thông báo nằm trên trang |
| `empty` > `empty-title`, `empty-text` + nút | trạng thái rỗng |
| `rail` > `rail-brand`, `rail-nav` > `rail-link` > `rail-label`; `rail-link rail-furigana` > `rail-switch`; `rail-link rail-account` + `account-panel` | cột điều hướng, viết sẵn trong HTML; chỉ Leader sửa ([design.md](design.md#bố-cục-khung)) |
| `account-panel` > `account-title`, `account-text`, `account-google`, `account-user` > `account-avatar` + `account-who` > `account-name`, `account-email`; `account-logout`, `account-status` (`is-error`) | bảng tài khoản, do `core/account.js` dựng; trang không dùng |
| `container`, `container-narrow`, `page-head`, `page-title`, `section`, `section-title`, `back-link`, `row`, `muted`, `visually-hidden` | khung trang, tiện ích |

Thêm hoặc đổi class chung thì sửa cả bảng này.

## Nhánh, commit, PR

1. Mỗi người làm trên nhánh riêng: `feature/home`, `feature/album`, `feature/create`, `feature/study`. Việc chung (core, styles, tài liệu) dùng nhánh riêng, VD `core/the-tieng-nhat`, `docs/...`.
2. Commit nhỏ, ghi mã task. VD: `album: lưới bìa album (A1)`.
3. Xong vài task thì mở PR vào `main`, điền mẫu PR (`.github/pull_request_template.md`). Leader review rồi merge.
   PR vào `main` cần 1 lượt duyệt; người sở hữu folder trong `.github/CODEOWNERS` được gắn reviewer tự động.
   Leader (admin) được bỏ qua yêu cầu duyệt cho PR của chính mình sửa `core/`, `styles/`, vì GitHub không cho tự duyệt PR của mình mà hai folder này chỉ có Leader sở hữu.
4. Mỗi PR cập nhật trạng thái trong [tasks.md](tasks.md) và thêm một mục vào [process.md](process.md).

## Định nghĩa "xong một task"

- Chạy đúng với dữ liệu mẫu (`?seed`) và khi chưa có dữ liệu (`?reset`).
- Dùng được trên điện thoại (rộng 375px), không cuộn ngang.
- Console không có lỗi.
- Đã xóa khung `.todo` và đoạn `DEMO` của phần đó.
- `npm test` vẫn xanh (bắt buộc nếu có sửa `core/`).
- Task backend: có test 2 user cho route mới; không có bí mật trong diff.
- Task AI: `npm test` không gọi AI thật (dùng kết quả mẫu).

## Bảo mật

Tóm tắt. Đủ luật xem [backend.md › Bảo mật](backend.md#bảo-mật).

- Không commit bí mật (mật khẩu DB, `JWT_SECRET`, token); `.env` phải có trong `.gitignore`.
- `user_id` chỉ lấy từ JWT; mọi query lọc theo người dùng.
- Chỉ dùng SQL có tham số (`$1, $2`), không ghép chuỗi.
- Không dùng `innerHTML` với dữ liệu người dùng.
- Mỗi route có test 2 user: user B không đụng được dữ liệu của user A.
- Auth giả (`X-Dev-User`) chỉ chạy ở dev (`NODE_ENV=development` và `DEV_AUTH=1`), không bao giờ ở bản thật.
- API key AI (`GEMINI_API_KEY`) chỉ ở server, không gửi xuống trình duyệt.
- Lỡ lộ bí mật thì đổi ngay; xóa commit không đủ.

## Tài liệu

Mỗi thông tin chỉ ghi ở **một** file; file khác thì trỏ link sang.

| Thông tin | Ghi ở |
|---|---|
| App làm gì, từ ngữ, phạm vi, quyết định sản phẩm | [product.md](product.md) |
| Giao diện: màu, chữ, bố cục, thành phần, icon | [design.md](design.md) |
| Cấu trúc code, API, dữ liệu, SM-2 | [architecture.md](architecture.md) |
| Thiết kế backend: database, API, bảo mật | [backend.md](backend.md) |
| Luật code, CSS, git, định nghĩa xong, trước khi nộp | file này |
| Việc cần làm và trạng thái | [tasks.md](tasks.md) |
| Đã làm gì, khi nào, quyết định gì | [process.md](process.md) |
| Cách chạy, cách test | [README](../README.md) |
| Hướng dẫn cho agent (trỏ tới các file trên) | [AGENTS.md](../AGENTS.md) |

Đổi hành vi, API hay luật thì sửa tài liệu tương ứng trong cùng PR.

## Trước khi nộp / deploy

App chạy trên **Vercel**, project `nho-lau` của Leader. Link ở [README](../README.md).

**Deploy lại** sau mỗi lần merge vào `main`. Vercel chưa nối với GitHub, nên merge không tự cập nhật bản đang chạy. Leader chạy ở gốc repo, cần [Vercel CLI](https://vercel.com/docs/cli) đã đăng nhập:

```bash
vercel link --yes --project nho-lau   # chỉ lần đầu trên một máy
vercel deploy --prod
```

- `.vercelignore` bỏ tài liệu, test, ảnh chụp màn hình trong `pages/*/screenshots/` và `package.json`, để Vercel coi đây là web tĩnh và không chạy npm.
- Deploy xong, mở link, thử cả 4 trang và xem Console không có lỗi 404.

**Dọn code trước khi nộp:** đã làm xong ngày 2026-11-20 (L5).
- **Giữ `dev/dev.js`** và dòng `<script type="module" src="…dev/dev.js">` trong 4 file HTML, để thầy và nhóm demo bằng `?seed` / `?reset` (Leader chốt ngày 2026-11-20). Lý do: app trống thì Trang chủ không có heatmap, biểu đồ, chuỗi ngày; `?reset` chỉ xóa dữ liệu trong trình duyệt của người mở link, không ảnh hưởng người khác.
- Giữ lời nhắc gõ `dev.reset()` trong `core/storage.js`, vì lệnh này vẫn dùng được.
- Đã xóa folder `pages/styleguide/`.
- Đã xóa khung `.todo` và đoạn `DEMO` còn sót, cùng class `.todo`, `.demo` trong `styles/base.css` (không còn chỗ nào dùng).
- `npm test` qua hết.

**Kiểm tra cuối:** luồng tạo bộ → thêm thẻ → học → xem heatmap, trên máy tính và điện thoại.
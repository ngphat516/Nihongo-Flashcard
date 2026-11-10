# Giao diện

Tài liệu này mô tả giao diện Nhớ Lâu trông thế nào và lý do chọn như vậy: màu, chữ, bố cục, thành phần, icon.

- Luật viết CSS, tên class và bảng class dùng chung: xem [conventions.md › Giao diện](conventions.md#giao-diện-css).
- Mọi biến và class kèm mẫu HTML: mở trang styleguide `pages/styleguide/` (http://localhost:5500/pages/styleguide/).

## Hướng giao diện

Giao diện học theo một mẫu dashboard giáo dục (chốt ngày 11/11/2026):
- Bên trái là cột icon; ở giữa là các khối màu pastel; bên phải là panel có số liệu và biểu đồ.
- Nền sáng, phẳng, nhiều khoảng trắng.
- Màu chính dùng ít, chỉ ở những chỗ cần chú ý.

| Trong mẫu | Ở Nhớ Lâu |
|---|---|
| Cột icon bên trái | Cột điều hướng; trên điện thoại thành thanh tab ở đáy ([Bố cục khung](#bố-cục-khung)) |
| Tiêu đề lớn đầu trang | Tiêu đề lớn ở Trang chủ |
| Pill lọc danh mục | Chip lọc `chip` |
| Thẻ khóa học màu pastel | Bìa bộ thẻ `cover`, màu theo `deck.color` |
| Sao đánh giá, số học viên trên thẻ | Badge "N cần học", số thẻ |
| Khối profile | Lời chào theo giờ và chuỗi ngày học |
| Biểu đồ hoạt động theo tháng | Biểu đồ lượt ôn 6 tháng, đặt cùng heatmap 12 tháng |

Không lấy từ mẫu: bạn bè, ảnh đại diện, đánh giá sao, số học viên, bảng xếp hạng, giỏ hàng, chuông thông báo. Lý do ở [product.md › Không làm](product.md#không-làm). Mẫu tô đen mục đang chọn; Nhớ Lâu tô bằng màu chính (xanh matcha đậm) thay cho màu đen.

## Màu

Mọi màu là biến trong `styles/tokens.css`. Chia theo tỉ lệ **60-30-10**:

- **60%: nền trung tính.** Nền trang `--bg` (xám ánh lục rất nhẹ), khối nội dung `--surface` (trắng).
- **30%: chữ và viền.** `--text`, `--text-2`, `--muted`, `--border`.
- **10%: màu chính xanh matcha `--primary`.** Chỉ dùng cho hành động.

### Màu nào dùng ở đâu

| Vai trò | Biến | Dùng cho |
|---|---|---|
| Màu chính | `--primary`, `--primary-hover`, `--on-primary` | Nút chính (mỗi màn hình chỉ **một** nút chính), link, viền focus, mục đang chọn (cột điều hướng, chip) |
| Màu chính nhạt | `--primary-soft` (nền) + `--primary-strong` (chữ, icon) | Rê chuột trên nút của cột điều hướng; nhãn mục đang chọn trên thanh tab |
| Trạng thái thẻ | `--state-new`, `--state-learning`, `--state-review` | Badge, bộ đếm Mới / Đang học / Đến hạn |
| Chấm điểm | `--rate-again`, `-hard`, `-good`, `-easy` | 4 nút chấm điểm |
| Báo lỗi / thành công | `--danger`, `--success` | Alert, toast, nút xóa |
| Heatmap | `--heat-0` … `--heat-4` | Ô heatmap, từ không học tới học nhiều |
| Biểu đồ | `--chart-new`, `--chart-review` | Hai phần của cột: Học mới / Ôn lại |
| Bìa bộ thẻ | `--deck-<màu>`, `--deck-<màu>-ink` | Chỉ dùng qua class `cover-<màu>` |

- **Màu trạng thái và màu chấm điểm giữ theo quy ước của Anki.** Xanh lá của Ôn tập, nút Tốt và thông báo thành công là màu mang nghĩa, khác sắc với màu chính. Màu chính chỉ dùng cho hành động; trạng thái và chấm điểm dùng màu riêng của chúng.
- **Màu luôn đi kèm chữ hoặc số:** badge có chữ, nút có chữ, ô heatmap có chú thích khi rê chuột.
- **Chữ dùng `--text`, `--text-2` hoặc `--muted`.** `--muted` là màu chữ nhạt nhất còn đạt độ tương phản trên nền trang.

### Độ tương phản

Chuẩn WCAG AA: chữ đạt ít nhất 4.5:1, viền và icon đạt ít nhất 3:1.

| Cặp màu | Tỉ lệ |
|---|---|
| Chữ trắng trên `--primary` | 5.0:1 |
| `--primary` (link) trên `--bg` | 4.5:1 |
| `--primary-strong` trên `--primary-soft` | 6.7:1 |
| `--muted` trên `--bg` | 5.9:1 |
| `--text-2` trên mọi nền pastel | ≥ 6.9:1 |
| `--deck-<màu>-ink` trên nền pastel cùng màu | ≥ 5.1:1 |

Bảng màu được sinh từ màu gốc `#5b8c32` bằng công cụ sinh bảng màu của Leader (skill `ui-color-palette`):
- Thang xanh cùng sắc 92° (vàng-lục, như matcha).
- Bộ xám có chút ánh xanh của màu chính.

Khi đổi màu chính phải làm đủ 3 việc:
1. Sinh lại cả nhóm biến đi theo nó: `--primary*`, `--heat-*`, `--chart-*`.
2. Đo lại các cặp trong bảng trên.
3. Sửa `tokens.css` và bảng trên.

### Màu bìa bộ thẻ

Có 6 màu. Tên màu (cột "Giá trị") vừa là giá trị lưu trong `deck.color`, vừa là phần đuôi tên class.

| Giá trị | Tên trên giao diện | Class |
|---|---|---|
| `pink` | Hồng | `cover-pink` |
| `peach` | Đào | `cover-peach` |
| `yellow` | Vàng | `cover-yellow` |
| `green` | Lá | `cover-green` |
| `sky` | Trời | `cover-sky` |
| `lavender` | Tím | `cover-lavender` |

- **Thứ tự trong bảng là thứ tự bộ mới lấy màu.** Người học chọn hoặc đổi màu ở form tạo bộ và form sửa bộ ([product.md › Màu bìa](product.md#màu-bìa-bộ-thẻ)).
- **`deck.color` có từ task L6.** Trước L6, lấy màu theo vị trí của bộ trong `getDeckOverview()`: `['pink', 'peach', 'yellow', 'green', 'sky', 'lavender'][i % 6]`. L6 thêm danh sách `DECK_COLORS` vào `core/models.js`; khi đó đổi sang dùng `deck.color`.

## Chữ

- **Font:** Plus Jakarta Sans cho chữ Latin và tiếng Việt, Noto Sans JP cho kana và kanji. Cả hai tải từ Google Fonts trong `styles/base.css`. Trình duyệt vẽ mỗi ký tự bằng font đầu tiên trong danh sách có ký tự đó, nên câu trộn Việt và Nhật tự hiển thị đúng.
- **Chữ tiếng Nhật gắn `lang="ja"`.** Áp dụng cho trường `term`, `reading`, `example` và mọi chỗ hiện chữ Nhật. Khi đó cả câu dùng Noto Sans JP, dấu câu Nhật đúng kiểu, và trình đọc màn hình đọc bằng giọng tiếng Nhật.
- **Độ đậm:** 400 cho chữ thường; 500 cho nhãn và chip; 600 cho nút và nhãn ô nhập; 700 cho tiêu đề và số liệu.
- **Cỡ chữ:** dùng các biến `--text-xs` … `--text-2xl`, `--text-card`. Cỡ của tiêu đề lớn ở Trang chủ chốt khi làm prototype ([cuối trang](#chốt-khi-làm-prototype)).

## Bố cục khung

Task L12, đã làm. Mọi trang có **cột điều hướng** `<header class="rail">`, viết sẵn trong HTML của cả 4 trang nên vẫn hiện khi JS lỗi. Mẫu HTML ở đầu mục "Cột điều hướng" trong `styles/base.css`.

**Màn hình rộng từ 768px**, giống cột icon trong mẫu:
- Cột **nổi**: cách mép trên, dưới, trái `--space-3`, rộng `--rail-width` (72px), bo góc `--radius`, nền `--surface-2`, không viền.
- Trên cùng là logo: chữ 覚 (nhớ) màu `--text`, không nền.
- Giữa cột là 4 mục: Trang chủ, Album, Tạo thẻ, Học. Mỗi mục là một **nút tròn** 44px nền `--surface`, chỉ có icon 20px.
- **Không có nhãn chữ.** Tên mục nằm trong `.rail-label`, hiện thành tooltip bên phải nút khi rê chuột hoặc Tab tới. Chữ này vẫn là tên của link cho trình đọc màn hình (ẩn bằng `opacity`, không dùng `display: none`).
- Dưới cùng là nút furigana (task L7), cũng là nút tròn.
- Rê chuột: nền `--primary-soft`, icon `--primary-strong`.
- Mục của trang đang mở có `aria-current="page"`: nền `--primary`, icon `--on-primary` (mẫu dùng màu đen).
- Nội dung trang nằm bên phải cột, vẫn trong `.container`.

**Màn hình hẹp dưới 768px:**
- Cột chuyển thành thanh tab cố định ở đáy, cao `--tabbar-height` (64px), nền `--surface`, viền trên. Gồm 5 ô bằng nhau: 4 mục điều hướng và nút furigana. Logo ẩn.
- Mỗi ô có icon và **nhãn chữ** bên dưới, vì điện thoại không rê chuột được.
- Ô đang chọn: icon nằm trong viên thuốc nền `--primary`, nhãn đậm màu `--primary-strong`.
- `body` chừa khoảng trống ở dưới bằng chiều cao thanh tab; toast nổi lên trên thanh tab.

**Nút furigana:** `<button class="rail-link rail-furigana" aria-pressed="false">`, bên trong có `rail-switch` để báo đang bật hay tắt:
- Màn hình rộng: đang bật thì có chấm xanh ở góc trên nút tròn (như chấm thông báo trong mẫu).
- Điện thoại: `rail-switch` là công tắc, đứng thay chỗ icon, để người dùng không nhầm với link chuyển trang.

Hiện nút chưa có tác dụng: L7 viết JS bật/tắt và lưu lựa chọn qua `core/`, trang không gọi `localStorage` trực tiếp. Nút làm gì: xem [product.md › Furigana](product.md#furigana-bậttắt).

### Trang chủ

Khung 2 cột làm cùng L12, CSS ở `pages/home/home.css`. Nội dung từng khối là các task H1–H8. Từ 1024px, trang chia làm 2 cột:
- **Cột chính:**
  - Tiêu đề lớn "Hôm nay ôn gì?".
  - Lưới bìa các bộ cần học hôm nay (H3).
  - Heatmap 12 tháng kèm chú giải (H1, H5).
- **Panel phải** (rộng 300px):
  - Lời chào theo giờ: "Chào buổi sáng" từ 4:00 tới 10:59, "Chào buổi chiều" từ 11:00 tới 17:59, "Chào buổi tối" từ 18:00 tới 3:59.
  - Chuỗi ngày học, chữ to.
  - 4 ô thống kê (H2).
  - Biểu đồ lượt ôn 6 tháng (H8).

Dưới 1024px, trang còn một cột, theo thứ tự: lời chào và 4 ô thống kê → bộ cần học → heatmap → biểu đồ. Mốc 1024px chứ không phải 768px vì trừ cột điều hướng và panel phải, cột chính ở 768px chỉ còn khoảng 350px, quá hẹp cho lưới bìa và heatmap.

HTML của trang viết theo đúng thứ tự một cột ở trên (`#overview` → `.home-main` → `#chart`). Màn hình rộng thì CSS grid xếp `#overview` và `#chart` sang panel phải, nên thứ tự đọc của trình đọc màn hình luôn khớp với thứ tự trên điện thoại.

## Thành phần

Mẫu HTML của từng thành phần có trong styleguide. Phần dưới đây chỉ ghi cách dùng.

- **Bìa bộ thẻ (`cover`)** dùng ở Trang chủ (H3) và Album (A1).
  - Nội dung bìa:
    - Chữ đầu của tên bộ, viết lớn bằng màu đậm. Lấy bằng `[...deck.name][0]`, để chữ Nhật hay emoji không bị cắt đôi.
    - Tên bộ.
    - Mô tả, tự cắt còn 2 dòng.
    - Badge "N cần học": N là tổng thẻ Mới, Đang học và Đến hạn cần học hôm nay. Ẩn badge khi N bằng 0.
    - Dòng "N thẻ".
  - Cả bìa là **một** link: ở Trang chủ tới `routes.study(id)`, ở Album tới `routes.album(id)`. Không đặt nút hay link nào khác bên trong bìa.
  - Ở Trang chủ, 3 con số Mới / Đang học / Đến hạn ghi bằng màu đậm của bìa, không tô màu trạng thái.
- **Chip (`chips` > `chip`)** là nút lọc bật/tắt. Mỗi chip là một `<button aria-pressed>`; cả nhóm là `role="group"` có `aria-label`. Dùng cho A6 (lọc thẻ theo trạng thái).
- **Biểu đồ lượt ôn (H8):**
  - Dựng bằng HTML/CSS hoặc SVG, không dùng thư viện.
  - Mỗi cột là một tháng, chồng 2 phần: "Học mới" (`log.prevState === 'new'`, màu `--chart-new`) và "Ôn lại" (`--chart-review`).
  - Có nhãn tháng, chú thích 2 màu.
  - Rê chuột hoặc focus vào cột thì hiện số, VD "T10: 120 học mới · 340 ôn lại".
- Ô thống kê, bộ đếm, badge, thẻ lật, dialog, toast: như trong [bảng class](conventions.md#class-dùng-chung).

## Icon

- **Lucide** ([lucide.dev](https://lucide.dev), giấy phép ISC). Chép mã SVG của icon thẳng vào HTML; không tải thư viện, không dùng CDN.
- Kích thước 20px, cả trên cột điều hướng và trong nút. Giữ `stroke="currentColor"` để icon lấy màu chữ.
- Icon chỉ để trang trí: gắn `aria-hidden="true"` và luôn có chữ đi kèm: nhãn bên cạnh, chữ hiện thành tooltip như ở cột điều hướng, hoặc `aria-label` nếu nút chỉ có icon.
- Icon trên cột điều hướng: Trang chủ `house`, Album `library-big`, Tạo thẻ `square-plus`, Học `graduation-cap`, Furigana `languages` (chép từ lucide-static 0.468.0).

## Chốt khi làm prototype

Task L13. Phải nhìn trên trang thật mới chốt được, nên chốt khi Trang chủ (H3) hoặc Album (A1) đã có bìa thật. Muốn thử nhiều phương án thì làm trên nhánh `prototype/giao-dien-moi`:

- Bo góc: mẫu bo tròn hơn `--radius` hiện tại (14px).
- Bóng đổ của khối và bìa.
- Cỡ tiêu đề lớn ở Trang chủ.

Chốt xong thì sửa `tokens.css` và xóa mục tương ứng ở đây.

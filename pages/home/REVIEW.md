# Đối chiếu Trang chủ — 11/11/2026

Nhánh: `feature/home`. Tài liệu đối chiếu là `origin/main` tại `3be1e126976251a8b4d525b274c6eb09a86e40d1`, đã fetch lại trước khi lưu kết quả. Đã tích hợp `main` vào nhánh Home; không merge vào `main` và không tạo PR.

Đây là báo cáo kiểm chứng, không thay thế hoặc sửa các quyết định trong `docs/`.

## H1–H8

| Mã | Yêu cầu chính thức | Cách triển khai | Kết quả kiểm chứng |
|---|---|---|---|
| H1 | Heatmap 53 tuần × 7 thứ; 5 mức màu; nhãn tháng; tooltip khi hover/focus; mobile cuộn ngang tới tuần hiện tại | `analytics.js` gom theo `dayKey()`; `charts.js` vẽ 371 vị trí, ngày tương lai và ngoài khoảng hiển thị không nhận focus. Màu `--heat-0…4`. Nhãn tháng đầu quá ngắn không chồng lên tháng kế tiếp. `ResizeObserver` cuộn tới tuần hiện tại sau khi có kích thước thật. Mũi tên, Home/End và Escape dùng được | Đã kiểm 53×7 tại 1440/1280/1024/1023/800/375px; mobile mới mở và sau đổi breakpoint đều ở tuần hiện tại; tooltip giữ đúng ngày sau cuộn. **Giới hạn 53 cột so với đủ 12 tháng lịch: xem mục cần chốt bên dưới** |
| H2 | Lượt ôn hôm nay; chuỗi ngày tới hôm nay hoặc hôm qua; tổng thẻ; tỉ lệ nhớ 30 ngày | Đọc `getReviewLogs()` và `getDeckOverview()`; ngày học bắt đầu lúc 4h. Tỉ lệ chỉ dùng log có `prevState === 'review'`, không bấm Lại (`rating !== 1`); thiếu mẫu hiện `—` | Fixture từ API: **3 lượt · 7 ngày · 14 thẻ · 75% (3/4)**, khớp UI. Test ranh giới 4h, 30 ngày, qua năm và chuỗi có ngày trống đều qua. Lượt ôn đếm số log, không đếm thẻ duy nhất |
| H3 | Bìa `cover`, chữ đầu tên bộ, tên, Mới/Đang học/Đến hạn; link `routes.study(id)`; bộ hết thẻ xếp cuối hoặc ẩn | Giữ màu theo thứ tự `getDeckOverview()` trước khi sắp xếp; có `deck.color` hợp lệ thì dùng màu đó. Số cần học lấy nguyên từ API, gồm giới hạn thẻ mới mỗi ngày và học trước 20 phút. Bộ hết thẻ xếp cuối | Đối chiếu 4 bộ với API, gồm thẻ mới bị giới hạn, đang học, review quá hạn, bộ đã xong và bộ chưa có thẻ. URL, bộ đếm, badge đều đúng; không có link/nút lồng trong bìa |
| H4 | Chưa có bộ: lời chào và CTA tạo bộ đầu tiên; chưa ôn: heatmap toàn ô trống | Giữ lời chào, hiện đúng một CTA `Tạo bộ thẻ đầu tiên` qua `routes.create()`; heatmap vẫn hiện khi chưa có log | Đã thử context trống, bộ chưa có thẻ, hoàn thành tất cả thẻ; CTA Home → trang Create mới từ main → lưu bộ → Home có 1 thẻ hoạt động |
| H5 | Chú giải Ít → 5 mức → Nhiều; xem được bảng số liệu theo tháng | Chú giải có tên và số mức bằng chữ; disclosure `<details><summary>` điều khiển bằng bàn phím; bảng có caption và scope cho tiêu đề hàng/cột | Bảng mở được và tổng số liệu khớp **11 lượt** trên heatmap; có đúng 5 mức màu |
| H6 | Biểu đồ số thẻ đến hạn trong 14 ngày tới, lấy từ `getCards()` | Giữ 14 cột. Hiển thị rõ đây là lịch hiện tại kể từ hôm nay, không tính thẻ mới; thẻ quá hạn được gom vào hôm nay. Lịch có thể đổi sau chấm điểm | Fixture API có **5 thẻ có lịch** trong 14 ngày; 14 cột và tooltip từng ngày khớp. Không cộng thẻ mới vào dự báo |
| H7 | Lời chào theo giờ và chuỗi ngày chữ to, ở đầu panel phải | Đặt `#greeting` trước 4 thống kê trong `#overview`. Dùng token chữ hiện có, không tự chốt cỡ mới của L13. Bỏ lịch chấm 7 ngày trang trí không nằm trong H7 | Kiểm các mốc **03:59, 04:00, 10:59, 11:00, 17:59, 18:00**: lời chào đúng. Chuỗi 7 ngày khớp dữ liệu |
| H8 | 6 tháng gần nhất; cột chồng Học mới/Ôn lại; đúng màu; legend và tooltip; không thư viện | Dùng ngày học để gom tháng; `prevState === 'new'` vào Học mới, log còn lại vào Ôn lại; `--chart-new` và `--chart-review`; dựng bằng HTML/CSS | 6 cột; fixture có **5 học mới + 6 ôn lại = 11 lượt**; màu, legend, tooltip focus được kiểm. Test lượt 3h sáng đầu tháng thuộc tháng trước và qua năm đều qua |

## Quy định Home trong design.md và conventions.md

| Yêu cầu | Cách triển khai | Kiểm chứng |
|---|---|---|
| Từ 1024px: hai cột, cột chính có tiêu đề/bộ thẻ/heatmap | `.home-content` dùng grid, `.home-main` chứa cả tiêu đề | Đã đo ở 1024/1280/1440px; tiêu đề và heatmap nằm hoàn toàn trong cột chính |
| Panel phải 300px: lời chào → chuỗi → 4 thống kê → biểu đồ 6 tháng | `#overview` chứa lời chào và thống kê; `#chart` nằm dưới; dự báo ở tiếp sau | Panel đo **300px** tại 1024/1280/1440px; không còn dải 4 thống kê ngang toàn trang |
| Dưới 1024px: tổng quan → bộ thẻ → heatmap → biểu đồ | Thứ tự DOM là `#overview` → `.home-main` → `#chart` → dự báo H6 | Đã kiểm vị trí thực và thứ tự DOM tại 1023/800/375px; thứ tự đọc của trình đọc màn hình khớp |
| Số Mới/Đang học/Đến hạn trên bìa dùng màu mực bìa | `.home-cover-counts .count b { color: var(--cover-ink) }`; không gắn class màu trạng thái vào bộ đếm Home | Đo computed style của mọi số, **kể cả số 0**, đều bằng `--cover-ink` của bìa |
| Bìa pastel, mark lớn màu mực; tên/mô tả/meta và badge đúng component chung | Giữ `.cover-<màu>`, `.cover-mark`, `.cover-title`, `.cover-text`, `.cover-meta`, `.cover-badge`; mô tả line-clamp 2 dòng. Không đổi nền/mark bìa đã xong sang màu tự pha | Màu 4 bìa đúng thứ tự pink/peach/yellow/green; badge ẩn khi 0; emoji không bị cắt đôi; chữ Nhật có `lang="ja"` |
| Mỗi màn hình một nút chính; navigation chung giữ nguyên | CTA Học ngay khi còn bài; tạo bộ đầu tiên khi trống; hoàn thành thì không có CTA học chính | Đã kiểm số CTA từng trạng thái. Phần head và navigation trong `index.html` so với main giữ nguyên |
| Dùng token và component; không tự chốt L13 | Tái sử dụng `.panel`, `.stats`, `.stat`, `.counts`, `.cover`, `.empty`, `.btn`, `.alert`; giữ radius/shadow/cỡ tiêu đề của hệ thống | 29 biến CSS được Home dùng đều có định nghĩa trong styles chung; không có mã màu cứng trong CSS Home; không sửa `styles/` |
| Mọi dữ liệu qua `repo.js`; XSS an toàn; routes dùng chung | Không import storage/seed vào module Home; không truy cập `localStorage`, không dùng `innerHTML`; dùng `h()`/`textContent`, `routes` | Kiểm source; fixture tên/mô tả chứa img/script chỉ hiện như text; tên 80 ký tự và mô tả 300 ký tự không làm tràn ở 375px |
| Hover/focus, đọc được không dựa riêng vào màu | Nút/link có focus chung; roving focus cho ngày; tooltip khi hover/focus; Escape đóng; bảng số liệu thay cho màu | Home/End/mũi tên/hover/Escape/focus ring đều qua trên mobile, cả khi cuộn ngang và cuộn trang |

## Kết quả test và quan sát trình duyệt

- `npm test`: **43/43 qua**; `node --check` cho hai module JS thay đổi qua; `git diff --check` sạch.
- **84 kiểm tra Chromium qua**, bao gồm dữ liệu mẫu `?seed`, context trống, số liệu API, HTML trong tên bộ, tên/mô tả dài, bộ hoàn thành, retry, lỗi cập nhật giữ dữ liệu cũ, loading, tab khác thêm/xóa thẻ, luồng Home → Học → chấm → Home và Home → Create mới từ main.
- Luồng học thật trong browser: lượt ôn tăng **3 → 4**, tổng thẻ giữ **14**.
- Đã chụp và xem trực tiếp screenshot Chromium 1440px, 1280px, 375px. Không chỉ suy từ CSS hoặc kiểm tra DOM. Không có lỗi JavaScript trong luồng Home.
- Google Fonts bị proxy Cloud chặn (`ERR_TUNNEL_CONNECTION_FAILED`); quan sát thực tế dùng font dự phòng có sẵn của CSS chung, đúng cơ chế fallback được mô tả trong architecture.md. **Chưa xác minh hình thức với Google Fonts tải thành công**; không thay CSS chung để né chặn mạng.

## Điểm cần chốt / không tuyên bố hoàn tất mọi trường hợp

H1 yêu cầu đồng thời “12 tháng” và cố định “53 cột tuần × 7 hàng thứ”. Nếu “12 tháng” được hiểu là đủ khoảng 365/366 ngày lịch tới hôm nay, có trường hợp cần **54 tuần lịch** với thứ Hai ở hàng đầu: ví dụ **10/12/2023–09/12/2024** có 366 ngày, bắt đầu Chủ nhật và kết thúc thứ Hai.

Code hiện **giữ 53×7 như task quy định**, không tự đổi bố cục sang 54 cột. Với ví dụ trên, lưới bắt đầu 11/12/2023, nên ngày 10/12/2023 không nằm trong vùng heatmap. Lịch sử vẫn còn nguyên trong API và thống kê khác; không xóa dữ liệu.

Cần Leader chốt ưu tiên giữ cố định 53 tuần hay cho phép 54 cột để bao trọn 12 tháng lịch trong mọi trường hợp. Chưa sửa định nghĩa hoặc `analytics.js` theo một giả định mới. Vì điểm này và hạn chế xác minh Google Fonts, **báo cáo không xác nhận “hoàn tất 100%, không còn điểm chưa xác minh”**.

Tại lần rà soát `c1ca050`, `docs/tasks.md` còn ghi H1–H8 “Chưa làm”. Khi chuẩn bị PR theo yêu cầu người dùng, H1–H8 đã được cập nhật thành **Xong** và nhật ký được bổ sung vào `docs/process.md`; không thay đổi chức năng hoặc thiết kế Home. Các điểm cần chốt và giới hạn xác minh ghi ở trên vẫn được giữ lại để nhóm review.

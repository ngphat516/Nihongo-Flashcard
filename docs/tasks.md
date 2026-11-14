# Bảng việc — Nhớ Lâu

Bảng này là **trạng thái hiện tại**: còn việc gì, ai làm. Lịch sử đã làm gì xem [process.md](process.md).

- **Trạng thái:** Chưa làm · Đang làm · Xong · Để sau · Bỏ. Bắt đầu hay xong một task thì sửa cột này trong cùng PR.
- **Ưu tiên:** **Bắt buộc** = phải có để demo · **Nên có** = làm sau khi xong phần bắt buộc · **Nếu kịp** = điểm cộng.
- **Xong một task khi** đạt [định nghĩa "xong"](conventions.md#định-nghĩa-xong-một-task).
- Hàm core nhắc tới bên dưới có chú thích ở đầu file `pages/<trang>/<trang>.js` và trong [architecture.md › API](architecture.md#api-corerepojs).

## Phân việc

| Người | Phụ trách | Folder được sửa |
|---|---|---|
| **Leader** | Codebase nền (`core/`, `styles/`, `dev/`), tài liệu, **Trang chủ**, review PR | `index.html`, `pages/home/`, phần chung |
| **Thành viên 2** | **Album**: xem bộ thẻ và thẻ | `pages/album/` |
| **Thành viên 3** | **Tạo thẻ** | `pages/create/` |
| **Thành viên 4** | **Học** | `pages/study/` |

> Điền tên thật vào cột "Người". Leader nhận Trang chủ vì nhẹ nhất, để còn thời gian review và giữ phần core.

---

## Leader: nền chung

| Mã | Việc cần làm | Mô tả / tiêu chí xong | Ưu tiên | Trạng thái |
|---|---|---|---|---|
| L1 | Codebase nền | Cấu trúc thư mục, CSS chung, lớp lưu localStorage, thuật toán SM-2 + 37 test, dữ liệu mẫu, khung 4 trang | Bắt buộc | Xong |
| L2 | Repo GitHub | Tạo repo, push codebase, bật bảo vệ nhánh `main` (bắt buộc qua PR), mời 3 thành viên, điền username thật vào `.github/CODEOWNERS` | Bắt buộc | Đang làm: đã tạo repo và push; `main` chưa có bảo vệ (push thẳng vẫn được); `CODEOWNERS` còn username mẫu |
| L3 | Review & merge | Review mọi PR. Thay đổi trong phần chung phải qua Leader | Bắt buộc | Đang làm |
| L4 | Hệ thống giao diện | `styles/tokens.css` + `styles/components.css` (nút, ô nhập, thống kê, bộ đếm, badge, thẻ lật, dialog, toast, trạng thái rỗng), font Noto Sans JP, trang `pages/styleguide/`. Chỉ CSS, không có JS cho component | Nên có | Xong |
| L5 | Kiểm thử cuối | `npm test` qua hết, thử luồng tạo bộ → thêm thẻ → học → xem heatmap, thử trên điện thoại, làm hết mục [Trước khi nộp](conventions.md#trước-khi-nộp--deploy) | Bắt buộc | Chưa làm |
| L6 | Thẻ tiếng Nhật + màu bìa | Đổi `Card` từ `front`/`back` sang `term`, `meaning`, `reading`, `example`, `jlpt` + cú pháp furigana `漢字[かんじ]` (chi tiết: [product.md](product.md#thẻ-tiếng-nhật)). Thêm `Deck.color` ([product.md](product.md#màu-bìa-bộ-thẻ)): `DECK_COLORS` trong `models.js` theo thứ tự ở [design.md](design.md#màu-bìa-bộ-thẻ), `createDeck` không truyền màu thì lấy màu kế tiếp, `updateDeck` đổi được màu, màu lạ báo `ValidationError`, bộ cũ chưa có màu thì đọc ra theo thứ tự. Sửa `models.js`, `repo.js`, `seed.js`, test, chú thích đầu file các trang. Album, Tạo thẻ, Học đều đang dùng thẻ 2 mặt: chỗ cần đổi ở mỗi trang ghi ở đầu mục của trang đó bên dưới | Bắt buộc | Xong (còn L6b) |
| L6b | Bỏ lớp tương thích `front`/`back` | Làm sau khi Album, Tạo thẻ, Học đã đổi sang trường mới. Xóa `core/card-compat.js` và 2 chỗ gọi `readCard` / `writeCard` trong `core/repo.js`, bỏ nhóm test "lớp tương thích" trong `tests/repo.test.js`. Xong khi `grep -rn "\.front\|\.back\|front:\|back:" pages core` không còn chỗ nào đọc/ghi thẻ, và dữ liệu cũ đã được chuyển (hoặc yêu cầu `?reset`) | Bắt buộc | Chưa làm |
| L7 | Furigana bật/tắt | Nút bật/tắt furigana chung cho cả web ([product.md](product.md#furigana-bậttắt)): nút đã có sẵn ở cuối cột điều hướng (`.rail-furigana`, L12); L7 viết JS bật/tắt `aria-pressed` ở cả 4 trang và lưu lựa chọn qua một hàm mới trong `core/`. Cần L6 trước | Nên có | Chưa làm |
| L8 | Đổi chiều học | Nhật → Việt / Việt → Nhật ([product.md](product.md#đổi-chiều-học)). Cách lưu lịch ôn chưa chốt | Nên có | Chưa làm |
| L9 | Dữ liệu mẫu tiếng Nhật | Thay 3 bộ mẫu trong `core/seed.js` bằng bộ tiếng Nhật. Làm sau L6 | Nên có | Chưa làm |
| L10 | Bộ tài liệu | `docs/` (product, architecture, conventions, tasks, process), `AGENTS.md` + `CLAUDE.md`, rút gọn README | Nên có | Xong |
| L11 | Màu và chữ mới | Màu chính matcha, nền xám ánh lục, heatmap xanh, 6 màu bìa pastel, font Plus Jakarta Sans + Noto Sans JP, class `chip` và `cover`, cập nhật styleguide, viết [design.md](design.md) | Nên có | Xong |
| L12 | Cột điều hướng | Thay header ngang bằng cột icon bên trái, dưới 768px thành thanh tab ở đáy; nút furigana (chưa có tác dụng) ở cuối cột; sửa cả 4 file HTML, `base.css`, styleguide ([design.md › Bố cục khung](design.md#bố-cục-khung)). Kèm khung 2 cột của Trang chủ | Nên có | Xong |
| L13 | Tinh chỉnh giao diện | Thử trên bìa thật rồi chốt bo góc, bóng, cỡ tiêu đề lớn ([design.md](design.md#chốt-khi-làm-prototype)); sửa `tokens.css`. Album (A1) đã có bìa thật nên làm được | Nếu kịp | Chưa làm |

### Lỗi đã biết trong `core/`

Tìm được khi review ngày 10/11/2026, **đã sửa cùng L6** (14/11/2026), mỗi lỗi có một test chứng minh. Trước đó vài trang đã tự tránh lỗi trong code của trang (ghi ở cột "Lỗi"): giờ các chỗ tránh đó bỏ được, không bắt buộc.

| Mã | Lỗi | Chỗ sửa | Trạng thái |
|---|---|---|---|
| B1 | `h('select', { value })` không chọn sẵn được option, vì `value` được gán trước khi thêm `<option>`. C1 đã tránh bằng cách gán `select.value` sau khi thêm option | `core/dom.js` `h()`: gán `value`/`checked` sau `append` | Xong |
| B2 | Ô "số thẻ mới/ngày" để trống thì âm thầm thành 0 (`Number('') === 0`), bộ đó không bao giờ có thẻ mới. A5 và C1 đã tránh bằng cách tự báo lỗi khi ô trống | `core/models.js` `makeDeck`, `core/repo.js` `updateDeck`: tạo bộ thì `''`/`null` → 20; sửa bộ thì báo `ValidationError` | Xong |
| B3 | Hoàn tác có thể hiện thẻ khác thay vì thẻ vừa hoàn tác (khi có thẻ đang học khác vừa đến giờ). S7 đã tránh: trang Học tự giữ thẻ vừa hoàn tác (`restoredCard`) và hiện lại thẻ đó | `undo()` trả về thẻ đã khôi phục; trang Học hiện thẳng thẻ đó (gợi ý vòng học ở đầu `pages/study/study.js`) | Xong |
| B4 | `getDeck('constructor')` trả về một hàm thay vì `null`, nên `?deck=constructor` không báo "Không tìm thấy". C1 đã tránh bằng cách tìm bộ trong `getDecks()`. Album vẫn hiện một bộ tên "Object"; Học báo "Xong rồi!" | `core/storage.js` `get()`: `Object.hasOwn(map, id) ? map[id] : null` | Xong |
| B5 | Điểm nhỏ: chú thích sai trong `fuzzRange` (ghi `[23, 27]`, đúng là `[22, 28]`); `formatSpan` hiện "60 phút"/"24 giờ" ở ranh giới (làm tròn trước rồi mới so sánh); `reviewCard` ghi thẻ trước rồi mới ghi lượt ôn (nên ghi lượt ôn trước) | `core/scheduler.js`, `core/date.js`, `core/repo.js` | Xong |

---

## Trang chủ: `index.html` + `pages/home/` (Leader)

Mục đích: nhìn tổng quan tiến độ, vào học nhanh.

| Mã | Việc cần làm | Mô tả / tiêu chí xong | Hàm core | Ưu tiên | Trạng thái |
|---|---|---|---|---|---|
| H1 | Heatmap 12 tháng | Lưới 53 cột (tuần) × 7 hàng (thứ), mỗi ô = 1 ngày, 5 mức màu `--heat-0…4` theo số lượt ôn. Rê chuột / focus vào ô hiện "12 thẻ · T3, 10/11/2026". Nhãn tháng ở trên. Trên điện thoại cuộn ngang, mở ra thì cuộn sẵn tới tuần hiện tại | `getReviewLogs()`, `dayKey()` | Bắt buộc | Xong |
| H2 | Thẻ tóm tắt | 4 ô số: **lượt ôn hôm nay**, **chuỗi ngày học**, **tổng số thẻ**, **tỉ lệ nhớ 30 ngày** (định nghĩa ở [product.md](product.md#từ-ngữ-của-dự-án)) | `getReviewLogs()`, `getDeckOverview()`, `daysBetween()` | Bắt buộc | Xong |
| H3 | Hôm nay cần học | Lưới bìa `cover` (màu theo [design.md](design.md#màu-bìa-bộ-thẻ)), cả bìa là link → `routes.study(id)`. Mỗi bìa: chữ đầu tên bộ, tên, 3 con số Mới / Đang học / Đến hạn. Bộ không còn thẻ cần học thì xếp cuối hoặc ẩn | `getDeckOverview()`, `routes` | Bắt buộc | Xong |
| H4 | Trạng thái rỗng | Chưa có bộ nào: lời chào + nút "Tạo bộ thẻ đầu tiên" → `pages/create/`. Chưa ôn lần nào thì heatmap vẫn hiện, toàn ô trống | — | Bắt buộc | Xong |
| H5 | Chú giải heatmap | Dòng "Ít ▢▢▢▢▢ Nhiều" dưới heatmap. Có nút xem bảng số liệu theo tháng cho ai không phân biệt được màu | — | Nên có | Xong |
| H6 | Dự báo | Biểu đồ cột: số thẻ đến hạn trong 14 ngày tới | `getCards()` | Nếu kịp | Xong |
| H7 | Lời chào và chuỗi ngày | Khung 2 cột đã có (L12). Còn: lời chào theo giờ và chuỗi ngày học viết chữ to, vào `#greeting` ở đầu panel phải. Chi tiết: [design.md › Trang chủ](design.md#trang-chủ) | `getReviewLogs()`, `daysBetween()` | Bắt buộc | Xong |
| H8 | Biểu đồ lượt ôn | 6 tháng gần nhất, mỗi cột chồng "Học mới" (`prevState === 'new'`) và "Ôn lại", màu `--chart-new` / `--chart-review`, có chú thích; rê chuột hoặc focus hiện số. Không dùng thư viện ([design.md](design.md#thành-phần)) | `getReviewLogs({ from })` | Nên có | Xong |

---

## Album: `pages/album/` (Thành viên 2)

Mục đích: xem, tìm, sửa các bộ thẻ và thẻ. Trang có 2 chế độ: `pages/album/` (lưới bộ) và `pages/album/?deck=<id>` (chi tiết một bộ).

> **L6 đã xong trong core** ([product.md › Thẻ tiếng Nhật](product.md#thẻ-tiếng-nhật)); trang vẫn chạy nhờ lớp tương thích tạm. Cần đổi: `cardFront` / `cardBack` ở đầu `detail.js` sang `renderFurigana(card.term)` / `card.meaning` (kèm `reading`, `example`, `jlpt` nếu muốn), dialog sửa thẻ gửi `{ term, meaning, … }`, tìm kiếm dùng `plainFurigana()`; `COVER_COLORS[i % 6]` trong `album.js` → `deck.color`; thêm chọn màu bìa vào dialog sửa bộ (A5, `updateDeck(id, { color })`).

| Mã | Việc cần làm | Mô tả / tiêu chí xong | Hàm core | Ưu tiên | Trạng thái |
|---|---|---|---|---|---|
| A1 | Lưới album | Mỗi bộ là một bìa `cover` màu pastel ([design.md](design.md#thành-phần)): chữ đầu tên bộ, tên, mô tả cắt 2 dòng, badge "N cần học" (ẩn khi 0), "N thẻ". Cả bìa là link → `routes.album(id)`. Có nút "+ Tạo bộ mới". Trước L6 lấy màu theo thứ tự ([design.md](design.md#màu-bìa-bộ-thẻ)) | `getDeckOverview()` | Bắt buộc | Xong |
| A2 | Chi tiết bộ | Đầu trang: tên, mô tả, nút "Học ngay" (`routes.study`) và "Thêm thẻ" (`routes.create`). Bên dưới: lưới thẻ, bấm một thẻ thì lật xem mặt sau | `getDeck()`, `getCards(deckId)` | Bắt buộc | Xong |
| A3 | Trạng thái thẻ | Mỗi thẻ có badge Mới / Đang học / Ôn tập và hạn ôn ("Ngày mai", "Sau 5 ngày") | `STATE_LABELS`, `describeDue()`, class `.badge-<state>` | Bắt buộc | Xong |
| A4 | Sửa / xóa thẻ | Sửa nội dung thẻ (tiến độ học giữ nguyên). Xóa có hỏi xác nhận. Lỗi nhập liệu hiện `err.message` | `updateCard()`, `deleteCard()` | Bắt buộc | Xong |
| A5 | Sửa / xóa bộ | Sửa tên, mô tả, số thẻ mới/ngày, màu bìa (màu bìa cần L6). Xóa bộ (xóa luôn thẻ, giữ lịch sử ôn) có hỏi xác nhận, xóa xong về lưới | `updateDeck()`, `deleteDeck()` | Bắt buộc | Xong, trừ màu bìa (chờ L6) |
| A6 | Tìm & lọc | Ô tìm theo nội dung thẻ (gõ "thuat toan" vẫn ra "thuật toán": bỏ dấu bằng `normalize('NFD')`), lọc theo trạng thái bằng `chip`, sắp xếp (mới tạo / sắp đến hạn) | — | Nên có | Xong |
| A7 | Học lại từ đầu | Nút đưa một thẻ về trạng thái Mới | `resetCard()` | Nếu kịp | Xong |
| A8 | Trường hợp đặc biệt | Chưa có bộ nào: lời nhắc + nút tạo bộ. `?deck=` sai id: thông báo + link về lưới. Bộ chưa có thẻ: nút "Thêm thẻ đầu tiên" | `getDeck()` trả `null` | Bắt buộc | Xong |

---

## Tạo thẻ: `pages/create/` (Thành viên 3)

Mục đích: soạn một bộ thẻ. `pages/create/` tạo bộ mới; `pages/create/?deck=<id>` mở bộ đó để sửa và thêm thẻ (nút "Thêm thẻ" ở Album dẫn tới đây).

> **L6 đã xong trong core**; trang vẫn chạy nhờ lớp tương thích tạm. Cần đổi: mỗi dòng thẻ thành các ô `term`, `meaning`, `reading`, `example`, `jlpt` và gửi đúng tên đó vào `createCards` / `updateCard`; so trùng dùng `plainFurigana(term)`; chọn màu bìa (C8) truyền `createDeck({ color })` với giá trị trong `DECK_COLORS`.

| Mã | Việc cần làm | Mô tả / tiêu chí xong | Hàm core | Ưu tiên | Trạng thái |
|---|---|---|---|---|---|
| C1 | Chọn / tạo bộ | Dropdown "Bộ thẻ" gồm "+ Bộ mới" và các bộ có sẵn (ẩn khi chưa có bộ nào), chọn sẵn theo `?deck=`. Đổi bộ thì cập nhật `?deck=`, còn thay đổi chưa lưu thì hỏi trước. Ô tên (bắt buộc), mô tả, số thẻ mới/ngày (mặc định 20). `?deck=` sai id thì báo rồi chuyển sang tạo bộ mới. Lưu bộ mới xong thì trang chuyển sang sửa bộ đó, có link "Xem trong album" và "Học ngay" | `getDecks()`, `createDeck()`, `updateDeck()` | Bắt buộc | Xong |
| C2 | Soạn thẻ | Mỗi dòng một thẻ: mặt trước, mặt sau (ô tự cao theo nội dung), nút xóa. Bộ mới có sẵn 3 dòng trống; nút "Thêm thẻ"; Tab ở mặt sau dòng cuối thì thêm dòng. Lưu một lần bằng nút trên thanh dính ở đáy hoặc **Ctrl+Enter**, báo bằng toast. Sửa thẻ giữ nguyên tiến độ học. Xóa thẻ đã lưu (thùng rác hoặc xóa trắng 2 mặt) thì hỏi xác nhận lúc lưu. Rời trang khi chưa lưu thì trình duyệt hỏi | `getCards()`, `createCards()`, `updateCard()`, `deleteCard()` | Bắt buộc | Xong |
| C3 | Kiểm tra dữ liệu | Thiếu tên bộ, số thẻ mới/ngày sai, dòng thiếu một mặt: báo ngay dưới ô, không lưu gì, đưa con trỏ tới ô sai đầu tiên. Mặt trước trùng một thẻ phía trên (không phân biệt hoa thường): nhắc dưới ô, vẫn cho lưu. Lỗi từ repo hiện `err.message` bằng toast | — | Bắt buộc | Xong |
| C4 | Xem trước | Khung thẻ cập nhật theo lúc gõ, bấm để lật, nhìn giống trang Học | — | Nên có | Để sau |
| C5 | Nhập nhiều thẻ | Ô dán văn bản, mỗi dòng một thẻ, các trường cách nhau bằng `\|` hoặc Tab (copy từ Excel / Quizlet). Có bảng xem trước, dòng lỗi tô đỏ, bỏ chọn được từng dòng, rồi thêm thành các dòng thẻ của C2 | — | Nên có | Để sau |
| C6 | Thẻ vừa thêm | Bỏ: danh sách thẻ của C2 hiện mọi thẻ trong bộ, xóa được từng thẻ, có link "Xem trong album" | — | Nên có | Bỏ |
| C7 | Xuất / nhập file | Xuất một bộ ra file `.json` hoặc `.csv` và nhập lại | `getCards()`, `createCards()` | Nếu kịp | Chưa làm |
| C8 | Chọn màu bìa | Trong form tạo bộ: 6 ô màu (radio, có tên màu cho trình đọc màn hình), chọn sẵn màu kế tiếp ([design.md](design.md#màu-bìa-bộ-thẻ)). Cần L6 | `createDeck({ color })` | Nên có | Chưa làm |

---

## Học: `pages/study/` (Thành viên 4)

Mục đích: học theo thuật toán SM-2. `pages/study/` để chọn bộ, `pages/study/?deck=<id>` để học.

> **L6 đã xong trong core**; trang vẫn chạy nhờ lớp tương thích tạm. Cần đổi: mặt trước dùng `renderFurigana(card.term)` (đã gắn `lang="ja"`), mặt sau `card.meaning` kèm `reading` / `example` nếu có; bìa dùng `deck.color` thay cho `COVER_COLORS[i % 6]`; hoàn tác dùng thẻ do `await undo()` trả về (B3 đã sửa).

| Mã | Việc cần làm | Mô tả / tiêu chí xong | Hàm core | Ưu tiên | Trạng thái |
|---|---|---|---|---|---|
| S1 | Chọn bộ | Không có `?deck=` thì hiện danh sách bộ kèm số thẻ cần học, bấm để vào học. Bộ hết thẻ thì mờ đi | `getDeckOverview()` | Bắt buộc | Xong |
| S2 | Hiện thẻ | Bấm thẻ hoặc nhấn **Space** để lật qua lại. Gợi ý phím nằm ở đáy thẻ. **← / →** chuyển giữa các thẻ có thể học theo lịch của bộ và dừng ở hai đầu | `getStudyQueue(deckId)`, `getCards(deckId)` | Bắt buộc | Xong |
| S3 | 4 nút chấm điểm | Luôn hiện Lại / Khó / Tốt / Dễ và thời gian lần ôn tới, kể cả ở mặt trước. Phím **1–4** dùng để chấm | `previewRatings(card)`, `RATING_LABELS` | Bắt buộc | Xong |
| S4 | Lưu & sang thẻ sau | Bấm nút: lưu kèm `timeMs` (từ lúc hiện thẻ tới lúc chấm), rồi lấy thẻ tiếp với `lastCardId` | `reviewCard()`, `getStudyQueue(deckId, { lastCardId })` | Bắt buộc | Xong |
| S5 | Bộ đếm | Thanh trên: tên bộ · **Mới** (xanh dương) · **Đang học** (cam) · **Đến hạn** (xanh lá), cập nhật sau mỗi lần chấm · nút Thoát | `counts` trong kết quả `getStudyQueue` | Bắt buộc | Xong |
| S6 | Màn hoàn thành | Hết thẻ: "Xong rồi!" + số thẻ đã học + thời gian học. Còn thẻ đang học hẹn sau: "Quay lại lúc 14:32" và tự tải lại khi tới giờ | `nextLearningAt` | Bắt buộc | Xong |
| S7 | Hoàn tác | Nút / phím **Z** hoàn tác lần chấm vừa rồi, thẻ đó hiện lại (lưu ý lỗi B3) | `undo()` trả về từ `reviewCard` | Nên có | Xong |
| S8 | Hiệu ứng lật | Lật 3D bằng CSS, tắt khi người dùng bật giảm chuyển động. Nút to, dễ bấm trên điện thoại | — | Nên có | Xong |
| S9 | Phát âm | Nút đọc mặt trước bằng `speechSynthesis` | — | — | Bỏ: app không có âm thanh ([product.md](product.md#không-làm)) |

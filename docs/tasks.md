# Bảng việc

Trạng thái hiện tại: còn việc gì, ai làm. Đã làm gì, khi nào thì xem [process.md](process.md).

## Việc đang mở

| Mã | Việc | Ai | Cần trước | Ưu tiên | Trạng thái |
|---|---|---|---|---|---|
| C11 | Tách `create.js` | kakushi | — | Nếu kịp | Để sau |
| L3 | Review & merge | Leader | — | Bắt buộc | Làm liên tục |

**Sẵn sàng nộp:** đợt 3 (S11, A10, C4, C5, C7, C10) và L13 đã xong; L5 đã kiểm thử và dọn code ngày 2026-11-20. C11 để sau (Leader chốt ngày 2026-11-20).

Bắt đầu một việc thì đổi Trạng thái thành **Đang làm** trong PR đầu tiên; xong thì đổi thành **Xong** và chuyển dòng đó xuống phần [Đã xong](#đã-xong).

---

## Chi tiết việc đang mở

### C11 · Tách create.js · kakushi · `pages/create/`

- **Làm gì:** `create.js` dài khoảng 750 dòng, quy ước ([conventions.md](conventions.md#code) mục Chia file) là quá khoảng 300 dòng thì tách module trong cùng folder. Tách theo phần (VD form bộ thẻ, xuất/nhập, dán nhiều thẻ) sao cho `create.js` chỉ còn là điểm vào.
- **Xong khi:** không đổi hành vi; `npm test` xanh; chạy thử lại C1–C10 ở 1440px và 375px, Console không lỗi.

### L3 · Review & merge · Leader

- Review mọi PR. Thay đổi trong phần chung (`core/`, `styles/`) phải qua Leader. `main` đã bật bảo vệ: PR cần 1 lượt duyệt, người sở hữu folder trong `.github/CODEOWNERS` được gắn reviewer tự động.

---

## Phân việc

| Người | Phụ trách | Folder được sửa |
|---|---|---|
| **Leader** | Codebase nền (`core/`, `styles/`, `dev/`), tài liệu, **Trang chủ**, review PR | `index.html`, `pages/home/`, phần chung |
| **Thành viên 2 (Daika)** | **Album**: xem bộ thẻ và thẻ | `pages/album/` |
| **Thành viên 3 (kakushi)** | **Tạo thẻ** | `pages/create/` |
| **Thành viên 4 (At)** | **Học** | `pages/study/` |

- **Không tự sửa `styles/` hay `core/` trong PR của trang.** Cần biến CSS hay hàm core mới thì báo Leader.
- Các trang không import code của nhau. Chúng chỉ nối qua dữ liệu: Tạo thẻ ghi, Album và Học đọc, đều qua `core/repo.js`. Lúc làm từng trang thì test bằng `?seed` ([bảng mẫu](architecture.md#dữ-liệu-mẫu-seed)), không cần chờ trang khác.

## Quy ước

- **Trạng thái:** Chưa làm · Đang làm · Xong · Để sau · Bỏ. Sửa trong cùng PR với việc đó.
- **Ưu tiên:** **Bắt buộc** = phải có để demo · **Nên có** = làm sau phần bắt buộc · **Nếu kịp** = điểm cộng.
- **Xong một việc khi** đạt [định nghĩa "xong"](conventions.md#định-nghĩa-xong-một-task).
- Hàm core có chú thích ở đầu file `pages/<trang>/<trang>.js` và trong [architecture.md › API](architecture.md#api-corerepojs).

---

## Đã xong

Bấm để mở. Mô tả giữ nguyên lúc giao việc, dùng để tra lại tính năng đã làm.

<details>
<summary><b>Leader: nền chung</b> — L1, L2, L4, L5, L6, L6b, L15, L7, L8, L9, L10, L11, L12, L13, L14</summary>

| Mã | Việc cần làm | Mô tả / tiêu chí xong | Ưu tiên | Trạng thái |
|---|---|---|---|---|
| L1 | Codebase nền | Cấu trúc thư mục, CSS chung, lớp lưu localStorage, thuật toán SM-2 + 37 test, dữ liệu mẫu, khung 4 trang | Bắt buộc | Xong |
| L2 | Repo GitHub | Tạo repo, push codebase, bật bảo vệ nhánh `main` (bắt buộc qua PR), mời 3 thành viên, điền username thật vào `.github/CODEOWNERS` | Bắt buộc | Xong |
| L4 | Hệ thống giao diện | `styles/tokens.css` + `styles/components.css` (nút, ô nhập, thống kê, bộ đếm, badge, thẻ lật, dialog, toast, trạng thái rỗng), font Noto Sans JP, trang `pages/styleguide/`. Chỉ CSS, không có JS cho component | Nên có | Xong |
| L5 | Kiểm thử cuối | `npm test` qua hết; thử luồng tạo bộ → thêm thẻ → học → xem heatmap; thử trên điện thoại; luồng chiều học qua 3 trang (tạo bộ Việt → Nhật ở Tạo thẻ → Album ghi đúng chiều → Học hiện nghĩa ở mặt trước → đổi chiều ở Album thì Học đổi theo, và ngược lại); xuất bộ ra JSON rồi nhập vào bộ mới giữ đủ thẻ và furigana; làm hết mục [Trước khi nộp](conventions.md#trước-khi-nộp--deploy) | Bắt buộc | Xong |
| L6 | Thẻ tiếng Nhật + màu bìa | Đổi `Card` từ `front`/`back` sang `term`, `meaning`, `reading`, `example`, `jlpt` + cú pháp furigana `漢字[かんじ]` (chi tiết: [product.md](product.md#thẻ-tiếng-nhật)). Thêm `Deck.color` ([product.md](product.md#màu-bìa-bộ-thẻ)): `DECK_COLORS` trong `models.js` theo thứ tự ở [design.md](design.md#màu-bìa-bộ-thẻ), `createDeck` không truyền màu thì lấy màu kế tiếp, `updateDeck` đổi được màu, màu lạ báo `ValidationError`, bộ cũ chưa có màu thì đọc ra theo thứ tự. Sửa `models.js`, `repo.js`, `seed.js`, test, chú thích đầu file các trang. Album, Tạo thẻ, Học đều đang dùng thẻ 2 mặt: phần đổi ở mỗi trang là A9, C9, S10 bên dưới | Bắt buộc | Xong |
| L6b | Bỏ lớp tương thích `front`/`back` | Cần A9, C9, S10 đã merge vào `main`, làm sau L15. Không cần chờ A5, C8. Xóa `core/card-compat.js` và các chỗ gọi `readCard` / `writeCard` trong `core/repo.js`, bỏ nhóm test "lớp tương thích" trong `tests/repo.test.js`. Thẻ cũ còn `front`/`back` trong localStorage phải được xử lý: chuyển đổi một lần khi mở app, hoặc chấp nhận bỏ; chọn cách nào thì ghi vào [process.md](process.md). Xong khi `grep -rnE '\.(front\|back)([^-[:alnum:]_]\|$)\|\b(front\|back):' pages core` không còn dòng nào khớp (lệnh này bỏ qua class `.back-link`) và `npm test` xanh | Bắt buộc | Xong |
| L15 | Chạy thử luồng sau đợt 2 | Trên `main` sau khi merge A9, C9, S10, bắt đầu từ `?reset`: tạo bộ ở Tạo thẻ với thẻ có furigana, `reading`, `example` và chọn màu bìa → Album hiển thị đúng, tìm và sửa được → Học hiển thị đúng furigana, chấm, hoàn tác → màu bìa khớp ở Trang chủ, Album, Học. Thử ở 1440px và 375px; Console không lỗi. Làm trước L6b | Bắt buộc | Xong |
| L7 | Furigana bật/tắt | Nút bật/tắt furigana chung cho cả web ([product.md](product.md#furigana-bậttắt)): nút đã có sẵn ở cuối cột điều hướng (`.rail-furigana`, L12). Gợi ý: thêm hàm đọc/ghi trạng thái vào `core/` (lưu `localStorage`, mặc định bật), ở cả 4 trang khởi tạo `aria-pressed` và gắn `data-furigana="off"` lên `document.documentElement` kèm rule ẩn `rt` trong `styles/components.css` để không phải render lại thẻ. Cần L6 trước | Nên có | Xong |
| L8 | Chiều học theo bộ (`core/`) | `deck.direction`: `'ja-vi'` Nhật → Việt (mặc định) / `'vi-ja'` Việt → Nhật, theo từng bộ ([product.md](product.md#đổi-chiều-học)). `DECK_DIRECTIONS` trong `core/models.js`; `createDeck`, `updateDeck` nhận `direction`, giá trị lạ báo `ValidationError`; bộ cũ đọc ra `'ja-vi'`, chỉ ghi khi lưu lại. Lịch ôn dùng chung, không đổi scheduler/queue. Bộ mẫu `挨拶` là `'vi-ja'`. Giao diện: `S11`, `A10`, `C10` | Nên có | Xong |
| L9 | Dữ liệu mẫu tiếng Nhật | Thay 3 bộ mẫu trong `core/seed.js` bằng bộ tiếng Nhật. Làm sau L6 | Nên có | Xong |
| L10 | Bộ tài liệu | `docs/` (product, architecture, conventions, tasks, process), `AGENTS.md` + `CLAUDE.md`, rút gọn README | Nên có | Xong |
| L11 | Màu và chữ mới | Màu chính matcha, nền xám ánh lục, heatmap xanh, 6 màu bìa pastel, font Plus Jakarta Sans + Noto Sans JP, class `chip` và `cover`, cập nhật styleguide, viết [design.md](design.md) | Nên có | Xong |
| L12 | Cột điều hướng | Thay header ngang bằng cột icon bên trái, dưới 768px thành thanh tab ở đáy; nút furigana (chưa có tác dụng) ở cuối cột; sửa cả 4 file HTML, `base.css`, styleguide ([design.md › Bố cục khung](design.md#bố-cục-khung)). Kèm khung 2 cột của Trang chủ | Nên có | Xong |
| L13 | Tinh chỉnh giao diện | Thử trên bìa thật rồi chốt bo góc, bóng, cỡ tiêu đề lớn ở Trang chủ ([design.md › Hình khối](design.md#hình-khối)); sửa `tokens.css` | Nếu kịp | Xong |
| L14 | Thành phần chọn màu và furigana | Trong `styles/components.css`: class `color-picker` (6 chấm tròn 32px theo thứ tự `DECK_COLORS`, vùng bấm 44px, màu lấy từ `cover-<màu>`, ô đang chọn có viền `--cover-ink` và dấu ✓, radio vẫn dùng được bằng bàn phím và trình đọc màn hình) và kiểu chữ furigana (`rt` cỡ 0.5em, màu `--text-2`, giãn dòng để không đè dòng trên). Có mẫu trong styleguide, ghi ở [bảng class](conventions.md#class-dùng-chung) và [design.md › Thành phần](design.md#thành-phần) | Bắt buộc | Xong |

</details>

<details>
<summary><b>Trang chủ: `index.html` + `pages/home/` (Leader)</b> — H1, H2, H3, H4, H5, H6, H7, H8, H9</summary>

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
| H9 | Màu bìa theo bộ | Bìa dùng `deck.color` thay cho hằng `COVER_COLORS` trong `pages/home/home.js`; màu mỗi bộ trùng với Album | `getDeckOverview()` | Bắt buộc | Xong |

</details>

<details>
<summary><b>Album: `pages/album/` (Daika)</b> — A1, A2, A3, A4, A5, A6, A7, A8, A9, A10</summary>

| Mã | Việc cần làm | Mô tả / tiêu chí xong | Hàm core | Ưu tiên | Trạng thái |
|---|---|---|---|---|---|
| A1 | Lưới album | Mỗi bộ là một bìa `cover` màu pastel ([design.md](design.md#thành-phần)): chữ đầu tên bộ, tên, mô tả cắt 2 dòng, badge "N cần học" (ẩn khi 0), "N thẻ". Cả bìa là link → `routes.album(id)`. Có nút "+ Tạo bộ mới". Trước L6 lấy màu theo thứ tự ([design.md](design.md#màu-bìa-bộ-thẻ)) | `getDeckOverview()` | Bắt buộc | Xong |
| A2 | Chi tiết bộ | Đầu trang: tên, mô tả, nút "Học ngay" (`routes.study`) và "Thêm thẻ" (`routes.create`). Bên dưới: lưới thẻ, bấm một thẻ thì lật xem mặt sau | `getDeck()`, `getCards(deckId)` | Bắt buộc | Xong |
| A3 | Trạng thái thẻ | Mỗi thẻ có badge Mới / Đang học / Ôn tập và hạn ôn ("Ngày mai", "Sau 5 ngày") | `STATE_LABELS`, `describeDue()`, class `.badge-<state>` | Bắt buộc | Xong |
| A4 | Sửa / xóa thẻ | Sửa nội dung thẻ (tiến độ học giữ nguyên). Xóa có hỏi xác nhận. Lỗi nhập liệu hiện `err.message` | `updateCard()`, `deleteCard()` | Bắt buộc | Xong |
| A5 | Sửa / xóa bộ | Sửa tên, mô tả, số thẻ mới/ngày, màu bìa. Màu bìa: dùng `color-picker` trong `#deck-dialog`, chọn sẵn màu hiện tại, lưu bằng `updateDeck(id, { color })`; đổi màu xong thì Trang chủ và Học cũng hiện màu mới. Cần L14. Xóa bộ (xóa luôn thẻ, giữ lịch sử ôn) có hỏi xác nhận, xóa xong về lưới | `updateDeck()`, `deleteDeck()` | Bắt buộc | Xong |
| A6 | Tìm & lọc | Ô tìm theo nội dung thẻ (gõ "thuat toan" vẫn ra "thuật toán": bỏ dấu bằng `normalize('NFD')`), lọc theo trạng thái bằng `chip`, sắp xếp (mới tạo / sắp đến hạn) | — | Nên có | Xong |
| A7 | Học lại từ đầu | Nút đưa một thẻ về trạng thái Mới | `resetCard()` | Nếu kịp | Xong |
| A8 | Trường hợp đặc biệt | Chưa có bộ nào: lời nhắc + nút tạo bộ. `?deck=` sai id: thông báo + link về lưới. Bộ chưa có thẻ: nút "Thêm thẻ đầu tiên" | `getDeck()` trả `null` | Bắt buộc | Xong |
| A9 | Thẻ tiếng Nhật | Cần L6. **Mặt trước:** từ chữ to, có furigana (`renderFurigana(card.term)`). **Mặt sau:** nghĩa, kèm cách đọc và câu ví dụ có furigana nếu có. Trường trống thì không hiện. **Tìm kiếm** trên từ và ví dụ đã bỏ furigana (`plainFurigana()`), nghĩa, cách đọc; vẫn không phân biệt hoa thường và dấu. **Câu xác nhận xóa** dùng `plainFurigana(card.term)`. **Hộp thoại sửa thẻ** (`#card-dialog`) có 4 ô: Từ, Nghĩa, Cách đọc, Ví dụ; dưới ô Từ có gợi ý "Ghi cách đọc trong ngoặc vuông sau kanji, VD 約束[やくそく]"; lưu bằng `updateCard(id, { term, meaning, reading, example })`. **Màu bìa:** bỏ hằng `COVER_COLORS` trong `album.js`, bìa dùng `deck.color`. **Xong khi:** furigana hiện đúng; gõ từ hoặc nghĩa đều tìm ra thẻ; sửa thẻ không đổi trạng thái và hạn ôn | `renderFurigana()`, `plainFurigana()`, `updateCard()` | Bắt buộc | Xong |
| A10 | Chiều học trong hộp sửa bộ | Trong `#deck-dialog`, cạnh ô chọn màu bìa (A5), thêm lựa chọn Nhật → Việt / Việt → Nhật: radio, chọn được bằng bàn phím, chọn sẵn `deck.direction`. Lưu bằng `updateDeck(id, { direction })`. Trang chi tiết bộ ghi chiều đang dùng. Thẻ trong lưới Album **không đảo**: mặt trước vẫn là từ (Album là nơi xem thẻ). **Xong khi:** đổi chiều ở Album thì trang Học dùng chiều mới; mở lại hộp sửa bộ thấy đúng chiều đã lưu; Esc hủy không đổi gì | `updateDeck()`, `DECK_DIRECTIONS` | Nên có | Xong |

</details>

<details>
<summary><b>Tạo thẻ: `pages/create/` (kakushi)</b> — C1, C2, C3, C4, C5, C6, C7, C8, C9, C10</summary>

| Mã | Việc cần làm | Mô tả / tiêu chí xong | Hàm core | Ưu tiên | Trạng thái |
|---|---|---|---|---|---|
| C1 | Chọn / tạo bộ | Dropdown "Bộ thẻ" gồm "+ Bộ mới" và các bộ có sẵn (ẩn khi chưa có bộ nào), chọn sẵn theo `?deck=`. Đổi bộ thì cập nhật `?deck=`, còn thay đổi chưa lưu thì hỏi trước. Ô tên (bắt buộc), mô tả, số thẻ mới/ngày (mặc định 20). `?deck=` sai id thì báo rồi chuyển sang tạo bộ mới. Lưu bộ mới xong thì trang chuyển sang sửa bộ đó, có link "Xem trong album" và "Học ngay" | `getDecks()`, `createDeck()`, `updateDeck()` | Bắt buộc | Xong |
| C2 | Soạn thẻ | Mỗi dòng một thẻ: từ, nghĩa (ô tự cao theo nội dung), nút xóa. Bộ mới có sẵn 3 dòng trống; nút "Thêm thẻ"; Tab ở ô nghĩa của dòng cuối thì thêm dòng. Lưu một lần bằng nút trên thanh dính ở đáy hoặc **Ctrl+Enter**, báo bằng toast. Sửa thẻ giữ nguyên tiến độ học. Xóa thẻ đã lưu (thùng rác hoặc xóa trắng cả từ và nghĩa) thì hỏi xác nhận lúc lưu. Rời trang khi chưa lưu thì trình duyệt hỏi | `getCards()`, `createCards()`, `updateCard()`, `deleteCard()` | Bắt buộc | Xong |
| C3 | Kiểm tra dữ liệu | Thiếu tên bộ, số thẻ mới/ngày sai, dòng thiếu từ hoặc nghĩa: báo ngay dưới ô, không lưu gì, đưa con trỏ tới ô sai đầu tiên. Từ trùng một thẻ phía trên (không phân biệt hoa thường): nhắc dưới ô, vẫn cho lưu. Lỗi từ repo hiện `err.message` bằng toast | — | Bắt buộc | Xong |
| C4 | Xem trước thẻ | Khung thẻ cập nhật theo lúc gõ, lấy dữ liệu dòng đang focus bằng `fieldsOf(row)` ở `card-rows.js`. Bấm để lật, nhìn giống thẻ ở trang Học. **Xong khi:** gõ ở dòng nào thì khung hiện dòng đó; furigana hiện đúng và theo nút bật/tắt furigana (L7); ở 375px không cuộn ngang | `renderFurigana()` | Nên có | Xong |
| C5 | Nhập nhiều thẻ | Ô dán văn bản, mỗi dòng một thẻ, các trường cách nhau bằng `\|` hoặc Tab, tối đa 4 cột: `term`, `meaning`, `reading`, `example` (dán thẳng từ Excel / Quizlet). Có bảng xem trước, dòng lỗi tô đỏ, bỏ chọn được từng dòng, rồi thêm thành các dòng thẻ của C2 (`cards.add({ term, meaning, reading, example })`) | `plainFurigana()` (so trùng) | Nên có | Xong |
| C6 | Thẻ vừa thêm | Bỏ: danh sách thẻ của C2 hiện mọi thẻ trong bộ, xóa được từng thẻ, có link "Xem trong album" | — | Nên có | Bỏ |
| C7 | Xuất / nhập file | Xuất một bộ ra file `.json` hoặc `.csv` (`term`, `meaning`, `reading`, `example`), và nhập lại vào bộ | `getCards()`, `createCards()` | Nếu kịp | Xong |
| C8 | Chọn màu bìa | Trong form tạo bộ: 6 ô màu (radio, có tên màu cho trình đọc màn hình), chọn sẵn màu kế tiếp: màu sau màu của bộ cuối trong `getDecks()`, theo thứ tự `DECK_COLORS` ([design.md](design.md#màu-bìa-bộ-thẻ)). Dùng `color-picker`. Cần L6, L14 | `createDeck({ color })` | Nên có | Xong |
| C9 | Ô nhập thẻ tiếng Nhật | Cần L6. Mỗi dòng thẻ có 4 ô: Từ, Nghĩa, Cách đọc, Ví dụ, và nút xóa. Ô Từ và ô Ví dụ gắn `lang="ja"`, có gợi ý cú pháp `約束[やくそく]`, `日本語[にほんご]勉強[べんきょう]` (mỗi từ kanji một cặp ngoặc). Lưu bằng `createCards()` / `updateCard()` với `{ term, meaning, reading, example }`; kiểm tra "đã sửa chưa" so cả 4 ô. Báo lỗi "Nhập từ." / "Nhập nghĩa.". So trùng bằng `plainFurigana(term)`, không phân biệt hoa thường. Tab ở ô Ví dụ của dòng cuối thì thêm dòng mới. **Xong khi:** lưu được thẻ đủ 4 ô, thẻ chỉ có từ + nghĩa, thẻ chỉ có kana; sửa thẻ cũ không mất tiến độ | `createCards()`, `updateCard()`, `plainFurigana()` | Bắt buộc | Xong |
| C10 | Chiều học khi tạo bộ | Trong form bộ thẻ, cạnh ô chọn màu (C8), cho chọn chiều học, mặc định Nhật → Việt. Mở bộ cũ thì chọn sẵn `deck.direction`, lưu khi đổi | `createDeck()`, `updateDeck()`, `DECK_DIRECTIONS` | Nếu kịp | Xong |

</details>

<details>
<summary><b>Học: `pages/study/` (At)</b> — S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11</summary>

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
| S10 | Thẻ tiếng Nhật khi học | Cần L6. **Mặt trước:** từ có furigana. **Mặt sau:** nghĩa, kèm cách đọc và câu ví dụ có furigana nếu có. Trường trống thì không hiện. Câu ví dụ dài thì xuống dòng trong thẻ, không đẩy 4 nút chấm điểm ra khỏi màn hình ở bề rộng 375px. **Hoàn tác** dùng thẳng thẻ do `await undo()` trả về, bỏ biến `restoredCard` (B3 đã sửa). **Bìa** dùng `deck.color` thay cho hằng `COVER_COLORS`. **Xong khi:** học hết một lượt với `?seed`; phím Space, 1–4, ← →, Z vẫn chạy như cũ | `renderFurigana()`, `reviewCard()`, `undo()` | Bắt buộc | Xong |
| S11 | Đổi chiều học | Đảo mặt thẻ theo `deck.direction` ([product.md › Đổi chiều học](product.md#đổi-chiều-học)): `'ja-vi'` (Nhật → Việt, mặc định) mặt trước là từ có furigana, mặt sau là nghĩa kèm cách đọc và ví dụ; `'vi-ja'` (Việt → Nhật) mặt trước là nghĩa, mặt sau là từ có furigana kèm cách đọc và ví dụ. **Nút đổi chiều** trên trang Học (màn chọn bộ hoặc thanh trên phiên học): bấm thì lưu bằng `updateDeck(id, { direction })` và đổi ngay thẻ đang hiện. **Lịch ôn dùng chung:** chấm điểm vẫn gọi `reviewCard()` như cũ. **Xong khi:** với `?seed`, bộ 挨拶 (`'vi-ja'`) hiện nghĩa ở mặt trước; đổi chiều xong tải lại vẫn giữ; Space, 1–4, ← →, Z và hoàn tác đúng ở cả 2 chiều; ví dụ dài ở 375px không đẩy 4 nút chấm ra khỏi màn hình | `getDeck()`, `updateDeck()`, `renderFurigana()` | Nên có | Xong |

</details>

### Lỗi đã biết trong `core/`

<details>
<summary>B1–B5, đã sửa cùng L6 (14/11/2026)</summary>

Tìm được khi review ngày 10/11/2026, **đã sửa cùng L6** (14/11/2026), mỗi lỗi có một test chứng minh. Trước đó vài trang đã tự tránh lỗi trong code của trang (ghi ở cột "Lỗi"): giờ các chỗ tránh đó bỏ được, không bắt buộc.

| Mã | Lỗi | Chỗ sửa | Trạng thái |
|---|---|---|---|
| B1 | `h('select', { value })` không chọn sẵn được option, vì `value` được gán trước khi thêm `<option>`. C1 đã tránh bằng cách gán `select.value` sau khi thêm option | `core/dom.js` `h()`: gán `value`/`checked` sau `append` | Xong |
| B2 | Ô "số thẻ mới/ngày" để trống thì âm thầm thành 0 (`Number('') === 0`), bộ đó không bao giờ có thẻ mới. A5 và C1 đã tránh bằng cách tự báo lỗi khi ô trống | `core/models.js` `makeDeck`, `core/repo.js` `updateDeck`: tạo bộ thì `''`/`null` → 20; sửa bộ thì báo `ValidationError` | Xong |
| B3 | Hoàn tác có thể hiện thẻ khác thay vì thẻ vừa hoàn tác (khi có thẻ đang học khác vừa đến giờ). S7 đã tránh: trang Học tự giữ thẻ vừa hoàn tác (`restoredCard`) và hiện lại thẻ đó | `undo()` trả về thẻ đã khôi phục; trang Học hiện thẳng thẻ đó (gợi ý vòng học ở đầu `pages/study/study.js`) | Xong |
| B4 | `getDeck('constructor')` trả về một hàm thay vì `null`, nên `?deck=constructor` không báo "Không tìm thấy". C1 đã tránh bằng cách tìm bộ trong `getDecks()`. Album vẫn hiện một bộ tên "Object"; Học báo "Xong rồi!" | `core/storage.js` `get()`: `Object.hasOwn(map, id) ? map[id] : null` | Xong |
| B5 | Điểm nhỏ: chú thích sai trong `fuzzRange` (ghi `[23, 27]`, đúng là `[22, 28]`); `formatSpan` hiện "60 phút"/"24 giờ" ở ranh giới (làm tròn trước rồi mới so sánh); `reviewCard` ghi thẻ trước rồi mới ghi lượt ôn (nên ghi lượt ôn trước) | `core/scheduler.js`, `core/date.js`, `core/repo.js` | Xong |

</details>

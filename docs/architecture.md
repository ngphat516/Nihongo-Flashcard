# Kiến trúc

Tài liệu này nói code được tổ chức thế nào. App làm gì xem [product.md](product.md); luật viết code xem [conventions.md](conventions.md).

## Tổng quan

- **Nhiều trang HTML riêng (MPA):** 4 trang, mỗi trang một file HTML. Chuyển trang là tải lại cả trang. Không có router, không có framework.
- **Không có bước build:** trình duyệt chạy thẳng file JS dạng ES modules và file CSS trong repo.
- **Dữ liệu trong `localStorage`:** mọi đọc/ghi đi qua `core/repo.js`, để sau này thay bằng backend chỉ phải sửa một file.

### Môi trường chạy

- ES modules không chạy khi mở file trực tiếp (`file://`), phải mở qua server cục bộ (xem [README](../README.md#chạy-thử)).
- Cần trình duyệt mới: ES modules, thẻ `<dialog>`, CSS `@import`.
- Font Plus Jakarta Sans và Noto Sans JP tải từ Google Fonts. Không có mạng thì rơi về font có sẵn trên máy (Hiragino, Yu Gothic, Meiryo, font hệ thống).
- Node 20 trở lên chỉ để chạy test; app không cần Node.

## Cấu trúc thư mục

```
index.html              Trang chủ (để ở gốc để mở / là vào)
pages/
  home/                 home.js, home.css: code của Trang chủ
  album/                index.html, album.js (+ detail.js, ui.js), album.css
  create/               index.html, create.js (+ card-rows.js, feedback.js), create.css
  study/                index.html, study.js, study.css
  styleguide/           xem mọi biến và class giao diện (công cụ dev, xóa trước khi nộp)
core/                   phần lõi dùng chung
  repo.js               ★ API dữ liệu cho các trang
  scheduler.js          thuật toán SM-2 (hàm thuần)
  queue.js              chọn thẻ tiếp theo, đếm thẻ cần học, nhãn trạng thái
  models.js             cấu trúc Deck / Card / ReviewLog + kiểm tra dữ liệu
  storage.js            đọc/ghi localStorage
  date.js               ngày học (bắt đầu 4h sáng), định dạng thời gian
  dom.js                h() tạo element an toàn, $(), getParam(), startPage()
  routes.js             link giữa các trang
  seed.js               dữ liệu mẫu (test cũng dùng)
dev/
  dev.js                ?seed / ?reset lúc phát triển (xóa trước khi nộp)
styles/
  base.css              file CSS duy nhất các trang nạp: @import 2 file dưới + reset, cột điều hướng, khung trang
  tokens.css            biến: màu, font, cỡ chữ, khoảng cách, bo góc, chuyển động, z-index
  components.css        class dùng chung: nút, ô nhập, badge, chip, bìa bộ thẻ, thẻ lật, dialog, toast, …
tests/                  test chạy bằng `npm test`
docs/                   tài liệu (file này)
```

Ai phụ trách folder nào: xem [tasks.md](tasks.md#phân-việc).

## 4 trang và URL

| Trang | File | URL |
|---|---|---|
| Trang chủ | `index.html` + `pages/home/` | `./` |
| Album | `pages/album/` | `pages/album/` (lưới bộ) · `pages/album/?deck=<id>` (chi tiết bộ) |
| Tạo thẻ | `pages/create/` | `pages/create/` (tạo bộ mới) · `pages/create/?deck=<id>` (sửa bộ đó, thêm thẻ) |
| Học | `pages/study/` | `pages/study/` (chọn bộ) · `pages/study/?deck=<id>` (buổi học) |

Mỗi file HTML nạp `styles/base.css`, CSS riêng của trang, `dev/dev.js` và đúng **một** file JS làm điểm vào (`pages/<trang>/<trang>.js`).

## Liên kết giữa các trang

- **Cột điều hướng** (`<header class="rail">`): thẻ `<a>` với đường dẫn tương đối, viết sẵn trong cả 4 file HTML, nên vẫn hiện khi JS lỗi.
- **Link tạo trong JS:** dùng `routes` (`core/routes.js`), VD `routes.study(deck.id)`. `routes` tính đường dẫn từ gốc project nên vẫn đúng khi app nằm dưới thư mục con, VD GitHub Pages `/Nihongo-Flashcard/`.
- **Truyền dữ liệu giữa trang:** chỉ qua tham số URL khai báo trong `routes` (hiện chỉ có `?deck=<id>`). Trang mới mở ra tự đọc lại dữ liệu qua `repo.js`.

## Các lớp JS

```
pages/<trang>/<trang>.js
        │  import
        ▼
core/repo.js ──► core/storage.js ──► localStorage
        │
        └─► scheduler.js · queue.js · models.js · date.js   (hàm thuần, có test)

dom.js, routes.js: tiện ích cho trang
```

- **Trang** chỉ lo giao diện: đọc dữ liệu qua `repo.js`, vẽ bằng `h()`, gắn sự kiện.
- **`repo.js`** là API duy nhất để đọc/ghi. Mọi hàm đều `async`. Nó kiểm tra dữ liệu bằng `models.js`, tính lịch ôn bằng `scheduler.js`, chọn thẻ bằng `queue.js`.
- **`storage.js`** là lớp thấp nhất, chỉ `repo.js` dùng.
- **`scheduler.js`, `queue.js`, `models.js`, `date.js`** là hàm thuần (không đụng DOM hay localStorage), nên test được bằng Node.

Trang được import những module nào: xem [conventions.md › Code](conventions.md#code).

## Dữ liệu

Ba "bảng" trong localStorage, key có tiền tố `nholau:`: `decks`, `cards`, `reviewLogs`. Mỗi bảng lưu thành một object JSON `{ [id]: bản ghi }`.

Các trường của `Deck`, `Card`, `ReviewLog` và giới hạn độ dài: xem chú thích trong [`core/models.js`](../core/models.js), đó là nguồn chính xác nhất.

- **Xóa bộ thẻ:** xóa luôn thẻ trong bộ, nhưng **giữ** lượt ôn, để heatmap và chuỗi ngày không bị mất.
- **Dung lượng:** localStorage khoảng 5 MB. Mỗi lượt ôn chiếm khoảng 300 byte, và mỗi lần chấm điểm ghi lại cả bảng `reviewLogs`. Chứa được khoảng 16 nghìn lượt ôn (khoảng 5 tháng nếu ôn 100 lượt/ngày). Đầy thì `storage.js` báo lỗi "Bộ nhớ trình duyệt đã đầy".
- **Dữ liệu hỏng:** JSON đọc ra không hợp lệ thì `storage.js` báo lỗi thay vì âm thầm trả về rỗng, vì lần ghi tiếp theo sẽ đè mất dữ liệu cũ.
- **Chưa có số phiên bản dữ liệu:** đổi cấu trúc trong `models.js` (VD sang thẻ tiếng Nhật) thì dữ liệu cũ trên máy người dùng không tự chuyển đổi. Cần viết bước chuyển đổi hoặc yêu cầu `?reset`.

## API `core/repo.js`

| Hàm | Trả về | Ghi chú |
|---|---|---|
| `getDecks()` | `Deck[]` | cũ trước mới sau |
| `getDeck(id)` | `Deck \| null` | |
| `createDeck({ name, description, newPerDay })` | `Deck` | `newPerDay` mặc định 20 |
| `updateDeck(id, { name?, description?, newPerDay? })` | `Deck` | chỉ truyền trường cần đổi |
| `deleteDeck(id)` | — | xóa luôn thẻ, giữ lịch sử ôn |
| `getCards(deckId?)` | `Card[]` | không truyền id → mọi thẻ |
| `getCard(id)` | `Card \| null` | |
| `createCard({ deckId, front, back })` | `Card` | |
| `createCards(deckId, [{ front, back }])` | `Card[]` | một thẻ lỗi → cả lượt không lưu |
| `updateCard(id, { front?, back? })` | `Card` | giữ nguyên tiến độ học |
| `deleteCard(id)`, `resetCard(id)` | — / `Card` | `resetCard` đưa thẻ về Mới |
| `getStudyQueue(deckId, { lastCardId? })` | `{ deck, card, counts, nextLearningAt }` | `card === null` → học xong |
| `reviewCard(cardId, rating, { timeMs? })` | `{ card, log, undo }` | rating 1 Lại · 2 Khó · 3 Tốt · 4 Dễ |
| `getReviewLogs({ deckId?, from?, to? })` | `ReviewLog[]` | cho heatmap, thống kê |
| `getDeckOverview()` | `[{ deck, total, due: { new, learning, review } }]` | |

Lỗi do người dùng nhập sai có `err.name === 'ValidationError'`; `id` không tồn tại thì `NotFoundError`.

Ngoài ra trang hay dùng:
- `scheduler.js`: `previewRatings(card)` (thời gian ghi trên 4 nút), `RATING_LABELS`.
- `queue.js`: `STATE_LABELS`, `describeDue(card)` ("Ngày mai", "Sau 5 ngày").
- `date.js`: `dayKey()`, `daysBetween()`, `formatSpan()`.
- `dom.js`: `h()`, `$()`, `$$()`, `getParam()`, `startPage()`.

Đầu mỗi file `pages/<trang>/<trang>.js` có chú thích liệt kê các hàm trang đó hay dùng.

## Thuật toán SM-2 (kiểu Anki)

Mỗi thẻ lưu `interval` (số ngày tới lần ôn sau) và `ease` (độ dễ, bắt đầu 2.5).

| Nút | Thẻ mới / đang học (bước 1 phút → 10 phút) | Thẻ ôn tập (I = interval, E = ease, L = số ngày trễ) | Ease |
|---|---|---|---|
| Lại | về bước đầu | học lại sau 10 phút, interval về 1 ngày | −0.20 |
| Khó | lặp lại bước hiện tại | I × 1.2 | −0.15 |
| Tốt | sang bước sau, hết bước thì "tốt nghiệp" với 1 ngày | (I + L/2) × E | giữ nguyên |
| Dễ | tốt nghiệp ngay với 4 ngày | (I + L) × E × 1.3 | +0.15 |

- Ease thấp nhất là 1.3. Mỗi nút luôn cho interval dài hơn nút trước ít nhất 1 ngày.
- Interval từ 2.5 ngày trở lên được *fuzz* ±5–15% để các thẻ không dồn vào cùng một ngày. Fuzz cố định theo từng thẻ, nên số ngày ghi trên nút đúng bằng kết quả khi bấm.
- Ngày học mới bắt đầu lúc **4h sáng**.
- Thứ tự trong buổi học: thẻ đang học đã đến giờ → thẻ ôn đến hạn → thẻ mới (tối đa `newPerDay` thẻ/ngày) → thẻ đang học sắp đến giờ (trong vòng 20 phút).

Thông số nằm ở `DEFAULT_CONFIG` trong `core/scheduler.js`. Test ở `tests/scheduler.test.js` và `tests/queue.test.js`.

## Test

`npm test` chạy `node --test` trên thư mục `tests/`: thuật toán SM-2, thứ tự chọn thẻ, ngày học, lớp dữ liệu (`repo.js` chạy trên một localStorage giả trong bộ nhớ, `tests/helpers/memory-storage.js`). Giao diện các trang chưa có test tự động.

## Thêm backend (sau này)

Viết lại `core/storage.js` bằng `fetch()` với cùng tên hàm (`list`, `get`, `put`, `putMany`, `remove`, `removeMany`, `clearAll`). Ba bảng `decks`, `cards`, `reviewLogs` chuyển thẳng thành 3 bảng trong database, cột lấy từ chú thích trong `models.js`. Các trang không phải sửa, vì mọi hàm `repo.js` đã là `async`.

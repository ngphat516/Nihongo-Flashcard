# Kiến trúc

Tài liệu này nói code được tổ chức thế nào. App làm gì xem [product.md](product.md); luật viết code xem [conventions.md](conventions.md).

## Tổng quan

- **Nhiều trang HTML riêng (MPA):** 4 trang, mỗi trang một file HTML. Chuyển trang là tải lại cả trang. Không có router, không có framework.
- **Không có bước build:** trình duyệt chạy thẳng file JS dạng ES modules và file CSS trong repo.
- **Dữ liệu ở 2 nơi:** khách lưu trong `localStorage`; đã đăng nhập thì lưu trên server (PostgreSQL). Mọi đọc/ghi đi qua `core/repo.js` → `core/storage.js`, trang không biết dữ liệu nằm đâu.

### Môi trường chạy

- ES modules không chạy khi mở file trực tiếp (`file://`), phải mở qua server cục bộ (xem [README](../README.md#chạy-thử)).
- Cần trình duyệt mới: ES modules, thẻ `<dialog>`, CSS `@import`.
- Font Plus Jakarta Sans và Noto Sans JP tải từ Google Fonts. Không có mạng thì rơi về font có sẵn trên máy (Hiragino, Yu Gothic, Meiryo, font hệ thống).
- Node 24 trở lên để chạy test và code backend (`server/`, `db/`); các trang web không cần Node.

## Cấu trúc thư mục

```
index.html              Trang chủ (để ở gốc để mở / là vào)
pages/
  home/                 home.js (+ analytics.js, charts.js), home.css, analytics.test.js: code của Trang chủ
  album/                index.html, album.js (+ detail.js, ui.js), album.css
  create/               index.html, create.js (+ card-rows.js, feedback.js), create.css
  study/                index.html, study.js, study.css
core/                   phần lõi dùng chung
  repo.js               ★ API dữ liệu cho các trang
  scheduler.js          thuật toán SM-2 (hàm thuần)
  queue.js              chọn thẻ tiếp theo, đếm thẻ cần học, nhãn trạng thái
  models.js             cấu trúc Deck / Card / ReviewLog + kiểm tra dữ liệu, DECK_COLORS, DECK_DIRECTIONS
  furigana.js           cú pháp 漢字[かんじ]: parseFurigana, plainFurigana, renderFurigana
  migrate.js            đổi thẻ cũ front/back sang trường mới, xóa trường jlpt, một lần (chỉ repo.js dùng)
  storage.js            đọc/ghi localStorage (khách) hoặc gọi /api (đã đăng nhập)
  preferences.js        lựa chọn hiển thị của người học (bật/tắt furigana), key localStorage riêng
  date.js               ngày học (bắt đầu 4h sáng), định dạng thời gian
  dom.js                h() tạo element an toàn, $(), getParam(), startPage() (kèm nối nút furigana)
  routes.js             link giữa các trang
  seed.js               dữ liệu mẫu (test cũng dùng)
dev/
  dev.js                ?seed / ?reset tạo và xóa dữ liệu mẫu (giữ lại trên bản nộp để demo)
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
core/repo.js ──► core/storage.js ──► localStorage   (khách)
                                 └──► fetch /api/…  (đã đăng nhập)
        │
        └─► scheduler.js · queue.js · models.js · date.js   (hàm thuần, có test)

dom.js, routes.js, furigana.js: tiện ích cho trang
```

- **Trang** chỉ lo giao diện: đọc dữ liệu qua `repo.js`, vẽ bằng `h()`, gắn sự kiện.
- **`repo.js`** là API duy nhất để đọc/ghi. Mọi hàm đều `async`. Nó kiểm tra dữ liệu bằng `models.js`, tính lịch ôn bằng `scheduler.js`, chọn thẻ bằng `queue.js`.
- **`storage.js`** là lớp thấp nhất, chỉ `core/` dùng (và `dev/dev.js`). Có 2 chế độ, chọn một lần mỗi lần mở trang:
  - Trình duyệt chưa có dấu đăng nhập (key `nholau-signed-in`) → **khách**: localStorage, không gọi mạng.
  - Có dấu → hỏi `GET /api/me`: `200` → **đã đăng nhập**, gọi API; `401` / `404` → xóa dấu, về khách. Dấu chỉ để khỏi hỏi server khi chắc chắn là khách (Chrome ghi mọi `401`/`404` thành lỗi đỏ trong Console); quyền thật nằm ở cookie phiên. BE6 ghi dấu bằng `rememberSignedIn(true)` sau khi đăng nhập, `false` khi đăng xuất.
  - Hàm chung: `list(c, filter?)`, `get`, `put(c, item, { expectedUpdatedAt? })`, `putMany`, `remove`, `removeMany`, `clearAll`, và 3 thao tác nhiều bước `review`, `undoReview`, `removeDeck` (chế độ API là 1 transaction trên server). Thêm `session()` / `isSignedIn()` cho biết đang ở chế độ nào.
  - Chế độ API: `putMany` chỉ thêm mới; `put` trả bản server đã lưu (server tự đặt `updatedAt`); `repo.js` gửi `expectedUpdatedAt` khi sửa bộ / thẻ, bản trên server đã đổi thì báo `ConflictError`.
  - Đã đăng nhập thì `?seed`, `?reset`, `dev.seed()`, `dev.reset()` bị bỏ qua (cảnh báo ở Console), `seedDemoData()` ném lỗi, `migrateCards()` không chạy.
- **`scheduler.js`, `queue.js`, `models.js`, `date.js`** là hàm thuần (không đụng DOM hay localStorage), nên test được bằng Node.

Trang được import những module nào: xem [conventions.md › Code](conventions.md#code).

### Module nội bộ đáng chú ý ở `pages/create/`

`pages/create/card-rows.js` quản lý danh sách dòng thẻ 4 trường (`ROW_FIELDS = ['term', 'meaning', 'reading', 'example']`) và export sẵn các hàm để tái sử dụng cho `C4`, `C5`, `C7`:
- `createCardRows(list, template)` → `{ rows, add, remove, clear, find, refresh }`, trong đó `add(card)` nhận sẵn object `{ term, meaning, reading, example }` (kể cả thẻ chưa lưu).
- `fieldsOf(row)` → `{ term, meaning, reading, example }` đã `cleanText()`.
- `snapshot(card)`, `hasContent(row)`, `isRowChanged(row)`, `autosizeRow(row)`.

Các module khác trong `pages/create/` (hàm thuần có test ở `tests/<tên>.test.js`):
- `preview.js` (`C4`): thẻ xem trước giống trang Học, bấm để lật; dùng cho khung xem trước và hộp thoại "Xem thử cả bộ".
- `paste.js` (`C5`): tách văn bản dán vào thành thẻ, mỗi dòng một thẻ, cột `term | meaning | reading | example` tách bằng Tab hoặc `|`; `checkRows()` kiểm tra lỗi / trùng / thiếu cách đọc. Test: `tests/paste.test.js`.
- `file-io.js` (`C7`): xuất / nhập file bộ thẻ. Xuất `.csv` (cột `term,meaning,reading,example`, có BOM) hoặc `.json` (`{ app: 'nho-lau', version: 1, deck, cards }`); nhập `.json`, `.csv`, `.tsv`, `.txt`, đi qua `checkRows()` để dùng chung bảng xem trước với dán nhiều thẻ. Test: `tests/file-io.test.js`.
- `reading.js`: tìm cụm kanji chưa có `[cách đọc]` để nhắc người nhập. Test: `tests/reading.test.js`.

## Dữ liệu

Ba "bảng" trong localStorage, key có tiền tố `nholau:`: `decks`, `cards`, `reviewLogs`. Mỗi bảng lưu thành một object JSON `{ [id]: bản ghi }`.

Khi đã đăng nhập, cùng 3 bảng đó nằm trên server, xem [backend.md](backend.md#database). localStorage của khách giữ nguyên, không bị đụng tới (đưa lên tài khoản là BE7).

Ngoài ra, lựa chọn bật/tắt furigana (L7) nằm ở key riêng `nholau-furigana` (`'on'` / `'off'`, không có key thì coi như bật), đọc/ghi qua `core/preferences.js`, không đi qua `storage.js`. Key không có tiền tố `nholau:`, nên `?reset` không xóa lựa chọn này.

Các trường của `Deck`, `Card`, `ReviewLog` và giới hạn độ dài: xem chú thích trong [`core/models.js`](../core/models.js), đó là nguồn chính xác nhất. Tóm tắt:

| Bản ghi | Trường nội dung | Ghi chú |
|---|---|---|
| `Deck` | `name`, `description`, `newPerDay`, `color`, `direction` | `color` là một trong `DECK_COLORS` (`pink`, `peach`, `yellow`, `green`, `sky`, `lavender`); `direction` là một trong `DECK_DIRECTIONS`: `'ja-vi'` Nhật → Việt (mặc định) hoặc `'vi-ja'` Việt → Nhật, lịch ôn dùng chung cho cả 2 chiều |
| `Card` | `term`, `meaning`, `reading`, `example` | `term`, `meaning` bắt buộc; furigana `漢字[かんじ]` trong `term`, `example` |
| `Card` (tiến độ) | `state`, `due`, `interval`, `ease`, `step`, `reps`, `lapses`, `lastReview` | do `scheduler.js` tính |

- **Dữ liệu cũ (trước L6):**
  - Thẻ chỉ có `front` / `back`: ở lần đọc thẻ đầu tiên sau khi mở trang, `repo.js` gọi `migrateCards()` (`core/migrate.js`) đổi sang `term` / `meaning`, điền `''` cho trường thiếu, bỏ `front` / `back` rồi ghi lại. Thẻ còn trường `jlpt` (tạo trước L16) cũng được chuyển: xóa trường `jlpt`, giữ nội dung và tiến độ. Chạy lại nhiều lần không đổi gì thêm.
  - Bộ chưa có `color`: đọc ra màu theo thứ tự danh sách (`DECK_COLORS[i % 6]`); khi bộ được lưu lại thì ghi màu.
  - Bộ chưa có `direction` (tạo trước L8): đọc ra `'ja-vi'`; khi bộ được lưu lại thì ghi.

- **Xóa bộ thẻ:** xóa luôn thẻ trong bộ, nhưng **giữ** lượt ôn, để heatmap và chuỗi ngày không bị mất.
- **Dung lượng:** localStorage khoảng 5 MB. Mỗi lượt ôn chiếm khoảng 300 byte, và mỗi lần chấm điểm ghi lại cả bảng `reviewLogs`. Chứa được khoảng 16 nghìn lượt ôn (khoảng 5 tháng nếu ôn 100 lượt/ngày). Đầy thì `storage.js` báo lỗi "Bộ nhớ trình duyệt đã đầy".
- **Dữ liệu hỏng:** JSON đọc ra không hợp lệ thì `storage.js` báo lỗi thay vì âm thầm trả về rỗng, vì lần ghi tiếp theo sẽ đè mất dữ liệu cũ.
- **Chưa có số phiên bản dữ liệu:** đổi cấu trúc trong `models.js` thì dữ liệu cũ trên máy người dùng không tự chuyển đổi. Lần đổi sang thẻ tiếng Nhật (L6) được xử lý bằng lớp tương thích ở trên; lần sau cần viết bước chuyển đổi hoặc yêu cầu `?reset`.

### Dữ liệu mẫu (`?seed`)

Mở bất kỳ trang nào kèm `?seed` (hoặc gọi `dev.seed()` trong Console) sẽ xóa dữ liệu hiện tại và nạp 3 bộ tiếng Nhật từ [`core/seed.js`](../core/seed.js) kèm ~4 tháng lịch sử ôn giả lập bằng SM-2; mở `?reset` (hoặc `dev.reset()`) để xóa sạch.

| Bộ mẫu (`?seed`) | Màu | Số thẻ & Tiến độ | Dùng để kiểm tra |
|---|---|---|---|
| `JLPT N5 – Từ vựng` | `pink` | 22 thẻ, học từ 120 ngày trước (đủ Mới / Đang học / Ôn tập; có kanji + furigana, okurigana, `々`, và từ thuần kana `reading: ''`) | Heatmap 12 tháng & biểu đồ 6 tháng (Trang chủ); tìm kiếm & lọc 4 trường, sửa thẻ giữ tiến độ SM-2 (Album `A9`, Tạo thẻ `C9`) |
| `食べ物 – Đồ ăn & Quán ăn` | `peach` | 12 thẻ, học 21 ngày trước, nghỉ 4 ngày gần đây (nhiều thẻ đến hạn hôm nay) | Vòng học SM-2, mặt trước/sau furigana, 4 nút chấm điểm và hoàn tác (Học `S10`) |
| `挨拶 – Chào hỏi cơ bản` | `yellow` | 8 thẻ, chưa học lần nào (`due.new === 8`). **Chiều học `'vi-ja'`** (2 bộ kia `'ja-vi'`) | Bộ thẻ mới nguyên, giới hạn thẻ mới mỗi ngày; tạo thêm bộ mới sẽ tự chọn màu kế tiếp (`green`); học chiều Việt → Nhật (`S11`, `A10`) |

## API `core/repo.js`

| Hàm | Trả về | Ghi chú |
|---|---|---|
| `getDecks()` | `Deck[]` | cũ trước mới sau |
| `getDeck(id)` | `Deck \| null` | |
| `createDeck({ name, description, newPerDay, color, direction })` | `Deck` | `newPerDay` bỏ trống thì 20; `color` bỏ trống thì màu kế tiếp sau bộ tạo gần nhất; `direction` không truyền thì `'ja-vi'` |
| `updateDeck(id, { name?, description?, newPerDay?, color?, direction? })` | `Deck` | chỉ truyền trường cần đổi; `newPerDay` rỗng → `ValidationError`; đổi `direction` không đụng tiến độ thẻ |
| `deleteDeck(id)` | — | xóa luôn thẻ, giữ lịch sử ôn |
| `getCards(deckId?)` | `Card[]` | không truyền id → mọi thẻ |
| `getCard(id)` | `Card \| null` | |
| `createCard({ deckId, term, meaning, reading?, example? })` | `Card` | trường không bắt buộc mặc định `''` |
| `createCards(deckId, [{ term, meaning, … }])` | `Card[]` | một thẻ lỗi → cả lượt không lưu |
| `updateCard(id, { term?, meaning?, reading?, example? })` | `Card` | giữ nguyên tiến độ học |
| `deleteCard(id)`, `resetCard(id)` | — / `Card` | `resetCard` đưa thẻ về Mới |
| `getStudyQueue(deckId, { lastCardId? })` | `{ deck, card, counts, nextLearningAt }` | `card === null` → học xong |
| `reviewCard(cardId, rating, { timeMs? })` | `{ card, log, undo }` | rating 1 Lại · 2 Khó · 3 Tốt · 4 Dễ; `await undo()` trả về thẻ đã khôi phục |
| `getReviewLogs({ deckId?, from?, to? })` | `ReviewLog[]` | cho heatmap, thống kê |
| `getDeckOverview()` | `[{ deck, total, due: { new, learning, review } }]` | |

Lỗi do người dùng nhập sai có `err.name === 'ValidationError'`; `id` không tồn tại thì `NotFoundError`. Khi đã đăng nhập còn có `ConflictError` (đã sửa ở máy khác), `AuthError` (phiên hết hạn), `NetworkError` (mất mạng, server lỗi). Mọi lỗi đều có `err.message` tiếng Việt hiện được cho người dùng.

Các hàm thẻ chỉ nhận và trả tên trường mới; gửi `{ front, back }` thì báo `ValidationError` vì thiếu `term` / `meaning`.

Ngoài ra trang hay dùng:
- `scheduler.js`: `previewRatings(card)` (thời gian ghi trên 4 nút), `RATING_LABELS`.
- `queue.js`: `STATE_LABELS`, `describeDue(card)` ("Ngày mai", "Sau 5 ngày").
- `date.js`: `dayKey()`, `daysBetween()`, `formatSpan()`.
- `dom.js`: `h()`, `$()`, `$$()`, `getParam()`, `startPage()`. `startPage()` tự nối nút bật/tắt furigana `.rail-furigana`: đặt `aria-pressed`, bấm thì đổi `data-furigana="off"` trên `<html>` (CSS ẩn `<rt>`), không vẽ lại trang. Trang không phải viết gì thêm.
- `preferences.js`: `isFuriganaOn()`, `setFuriganaOn(on)`. localStorage lỗi hoặc bị chặn thì coi như bật.
- `models.js`: `DECK_COLORS` (6 màu bìa theo thứ tự), `ValidationError`, `NotFoundError`.
- `furigana.js`: `renderFurigana(text)` dựng `<span lang="ja">` có `<ruby>`; `plainFurigana(text)` bỏ phần `[..]` để tìm kiếm, so trùng; `parseFurigana(text)` trả mảng đoạn.

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

`npm test` chạy `node --test`, Node tự tìm mọi file `*.test.js`:

- `tests/`: thuật toán SM-2, thứ tự chọn thẻ, ngày học, lớp dữ liệu (`repo.js` chạy trên một localStorage giả trong bộ nhớ, `tests/helpers/memory-storage.js`), thẻ tiếng Nhật, màu bìa, lớp tương thích, furigana, `h()` (trên DOM giả tối giản), và các lỗi B1–B5.
- `tests/storage-api.test.js`: `storage.js` chế độ API với `fetch` giả (chọn chế độ, route, lỗi HTTP, chia lô, khóa `seed` / `migrate`).
- `tests/api/`: server thật trên PostgreSQL (bỏ qua khi không có Docker / PostgreSQL 16). `tests/api/repo-api.test.js` chạy `repo.js` → `storage.js` → Express → PostgreSQL với 2 user.
- `pages/home/analytics.test.js`: phần tính số liệu của Trang chủ (lượt ôn, chuỗi ngày, tỉ lệ nhớ, ô heatmap, cột tháng).

Giao diện các trang chưa có test tự động.

## Backend

Server Node.js, database PostgreSQL 16, chạy bằng Docker Compose. `core/storage.js` có thêm chế độ API (BE5, xem [Các lớp JS](#các-lớp-js)), nên các trang không phải sửa; SM-2 và chọn thẻ vẫn chạy ở trình duyệt. Database, API, đăng nhập và luật bảo mật: xem [backend.md](backend.md).

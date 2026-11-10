# Nhớ Lâu — Flashcard học tập

Web app flashcard dùng thuật toán lặp lại ngắt quãng **SM-2 theo cách Anki cài đặt**.
HTML / CSS / JavaScript thuần (không framework, không build), dữ liệu lưu trong `localStorage`.

Phân việc: xem **[TASKS.md](TASKS.md)**.

## Chạy thử

ES modules **không chạy** khi mở file trực tiếp (`file://...`), nên phải mở qua server cục bộ:

- **VS Code:** cài extension *Live Server* (VS Code sẽ gợi ý), chuột phải `index.html` → *Open with Live Server*.
- **Hoặc dùng Python:**

  ```bash
  python -m http.server 5500
  ```

  (Mac/Linux dùng `python3`), rồi mở http://localhost:5500

**Dữ liệu mẫu:** thêm `?seed` vào URL (VD http://localhost:5500/?seed) để tạo 3 bộ thẻ + khoảng 4 tháng lịch sử ôn.
Thêm `?reset` để xóa sạch. Hoặc gõ trong Console: `dev.seed()` / `dev.reset()`.

## Chạy test

Cần Node 20 trở lên (chỉ để chạy test, app không cần Node).

```bash
npm test
```

Test nằm trong `tests/`: thuật toán SM-2, thứ tự chọn thẻ, ngày học, và lớp dữ liệu.

## Cấu trúc thư mục

Mỗi trang là một folder riêng trong `pages/`, chứa đủ HTML + JS + CSS của trang đó.

```
index.html              Trang chủ (giữ ở gốc để mở / là vào)               (Leader)
pages/
  home/                 home.js, home.css — code của Trang chủ             (Leader)
  album/                index.html, album.js, album.css                    (Thành viên 2)
  create/               index.html, create.js, create.css                  (Thành viên 3)
  study/                index.html, study.js, study.css                    (Thành viên 4)
  styleguide/           xem mọi màu + class dùng chung (chỉ lúc dev)       (Leader)
core/                   phần lõi dùng chung — sửa phải qua Leader
  repo.js               ★ API dữ liệu cho các trang (chỉ import file này để đọc/ghi)
  scheduler.js          thuật toán SM-2 (hàm thuần)
  queue.js              chọn thẻ tiếp theo, đếm thẻ cần học
  models.js             cấu trúc dữ liệu Deck / Card / ReviewLog + kiểm tra dữ liệu
  storage.js            lưu localStorage (sau này thay bằng gọi API)
  date.js               ngày học (bắt đầu 4h sáng), định dạng thời gian
  dom.js                h() tạo element an toàn, $(), getParam(), startPage()
  routes.js             link giữa các trang
  seed.js               dữ liệu mẫu (test cũng dùng)
dev/
  dev.js                ?seed / ?reset cho lúc phát triển — xóa khỏi HTML trước khi nộp
styles/
  base.css              file duy nhất các trang nạp: @import 2 file dưới + reset, header, khung trang   (Leader)
  tokens.css            biến: màu, font, cỡ chữ, khoảng cách, bo góc, chuyển động
  components.css        nút, ô nhập, panel, ô thống kê, bộ đếm, badge, thẻ lật, dialog, toast, trạng thái rỗng
tests/                  test chạy bằng `npm test`
```

**Luôn dùng đường dẫn tương đối** (`../../core/repo.js`, `../album/`, `styles/base.css`).
Không viết đường dẫn bắt đầu bằng `/`: khi deploy lên GitHub Pages, app nằm dưới `/ten-repo/`
nên `/core/...` sẽ trỏ sai chỗ và bị 404. Link giữa các trang thì dùng `routes`, nó tự tính đúng tiền tố.

## 4 trang và URL

| Trang | URL | Phụ trách |
|---|---|---|
| Trang chủ: heatmap + tóm tắt | `./` | Leader |
| Album: lưới bộ / chi tiết bộ | `pages/album/` · `pages/album/?deck=<id>` | Thành viên 2 |
| Tạo thẻ | `pages/create/` · `pages/create/?deck=<id>` | Thành viên 3 |
| Học | `pages/study/` · `pages/study/?deck=<id>` | Thành viên 4 |

Tạo link bằng `routes` (`routes.study(deck.id)`), đừng tự ghép chuỗi.

## Quy ước

1. **Mỗi người chỉ sửa trong folder `pages/<trang>/` của mình.** Cần đổi `core/` hoặc `styles/` thì báo Leader.
2. **Không gọi `localStorage` trực tiếp.** Mọi đọc/ghi đi qua `core/repo.js`, sau này đổi sang backend mới không phải sửa trang.
3. **Không dùng `innerHTML` với dữ liệu người dùng** (tên bộ, nội dung thẻ), vì dễ bị lỗi bảo mật XSS. Dùng `h()` trong `dom.js` hoặc `textContent`.
4. **Màu, cỡ chữ, khoảng cách dùng biến CSS** (`var(--primary)`, `var(--text-sm)`, `var(--space-4)`...) trong `styles/tokens.css`, không viết mã màu cứng. Thiếu biến thì báo Leader thêm.
   **Dùng class chung trước khi tự viết** — xem hết ở `pages/styleguide/` (mục *Giao diện* bên dưới).
5. **Tên class kiểu Bootstrap:** class chung không tiền tố (`btn btn-primary`, `field-label`); class riêng của trang bắt đầu bằng tên trang (`album-grid`, `study-bar`) và viết trong CSS của trang; class trạng thái do JS bật/tắt bắt đầu bằng `is-` (`is-flipped`, `is-active`).
6. Mọi hàm trong `repo.js` đều async, nhớ `await`. Lỗi do người dùng nhập sai có `err.name === 'ValidationError'`, hiện `err.message` cho người dùng.
7. Bọc code khởi động trang trong `startPage(async () => { ... })` để lỗi hiện lên trang thay vì chỉ nằm trong Console.

## Giao diện (`styles/`)

Chỉ có CSS, không có thư viện, không build, không dark mode. Font **Noto Sans JP** (đủ chữ Nhật + tiếng Việt có dấu).
Mở **`pages/styleguide/`** để xem mọi biến và class kèm mẫu HTML; phần cần JS (lật thẻ, dialog, toast) có mẫu code trong `pages/styleguide/styleguide.js`.

| Class | Dùng cho |
|---|---|
| `btn` + `btn-primary` / `btn-danger` / `btn-ghost` / `btn-sm` | nút (dùng được cho `<a>`) |
| `rate-bar` + `btn btn-again` / `-hard` / `-good` / `-easy` | 4 nút chấm điểm, `<small>` bên trong ghi thời gian |
| `field` > `field-label`, `input`, `field-hint`, `field-error` | ô nhập; `input` dùng cho cả `<input>`, `<textarea>`, `<select>`; lỗi: thêm `aria-invalid="true"` |
| `panel` | khối nền trắng, viền, bo góc |
| `stats` > `stat` > `stat-value`, `stat-label` | ô thống kê |
| `counts` > `count count-new` / `-learning` / `-review` (số trong `<b>`) | bộ đếm Mới / Đang học / Đến hạn; `is-zero` khi bằng 0 |
| `badge badge-<card.state>` | trạng thái thẻ (chấm màu + chữ) |
| `flashcard` > `flashcard-inner` > `flashcard-face flashcard-front` / `-back` | thẻ lật; JS bật `is-flipped` |
| `<dialog class="dialog">` > `dialog-title`, `dialog-actions` | hộp xác nhận, mở bằng `showModal()` |
| `toast`, `toast-error` | thông báo nhỏ tự ẩn sau 3 giây |
| `alert`, `alert-error`, `alert-success` | thông báo nằm trên trang |
| `empty` > `empty-title`, `empty-text` + nút | trạng thái rỗng |
| `container`, `container-narrow`, `page-head`, `page-title`, `section`, `section-title`, `back-link`, `row`, `muted`, `visually-hidden` | khung trang, tiện ích |

## API core (`core/repo.js`)

| Hàm | Trả về | Ghi chú |
|---|---|---|
| `getDecks()` | `Deck[]` | |
| `getDeck(id)` | `Deck \| null` | |
| `createDeck({ name, description, newPerDay })` | `Deck` | `newPerDay` mặc định 20 |
| `updateDeck(id, { name?, description?, newPerDay? })` | `Deck` | |
| `deleteDeck(id)` | — | xóa luôn thẻ, giữ lịch sử ôn |
| `getCards(deckId?)` | `Card[]` | không truyền id → mọi thẻ |
| `createCard({ deckId, front, back })` | `Card` | |
| `createCards(deckId, [{ front, back }])` | `Card[]` | một thẻ lỗi → cả lượt không lưu |
| `updateCard(id, { front?, back? })` | `Card` | giữ nguyên tiến độ |
| `deleteCard(id)`, `resetCard(id)` | — / `Card` | |
| `getStudyQueue(deckId, { lastCardId? })` | `{ deck, card, counts, nextLearningAt }` | `card === null` → học xong |
| `reviewCard(cardId, rating, { timeMs? })` | `{ card, log, undo }` | rating 1 Lại · 2 Khó · 3 Tốt · 4 Dễ |
| `getReviewLogs({ deckId?, from?, to? })` | `ReviewLog[]` | cho heatmap, thống kê |
| `getDeckOverview()` | `[{ deck, total, due: { new, learning, review } }]` | |

Ngoài ra: `previewRatings(card)` và `RATING_LABELS` (`scheduler.js`), `STATE_LABELS` và `describeDue(card)` (`queue.js`), `dayKey()`, `daysBetween()`, `formatSpan()` (`date.js`).
Cấu trúc dữ liệu chi tiết: xem chú thích trong `core/models.js`.

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
- Thứ tự trong buổi học: thẻ đang học đến giờ → thẻ ôn đến hạn → thẻ mới (tối đa `newPerDay` thẻ/ngày) → thẻ đang học sắp đến giờ (trong vòng 20 phút).

Thông số nằm ở `DEFAULT_CONFIG` trong `core/scheduler.js`.

## Sau này: thêm backend

Viết lại `core/storage.js` bằng `fetch()` với cùng tên hàm (`list`, `get`, `put`, `putMany`, `remove`, `removeMany`, `clearAll`).
Ba "bảng" `decks`, `cards`, `reviewLogs` chuyển thẳng thành 3 bảng trong database, cột lấy từ chú thích trong `models.js`.

## Trước khi nộp

- Xóa dòng `<script type="module" src="…dev/dev.js">` trong 4 file HTML.
- Xóa hết khung `.todo` và đoạn `DEMO` còn sót.
- Xóa folder `pages/styleguide/`.
- `npm test` qua hết.

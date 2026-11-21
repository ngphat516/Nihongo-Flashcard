# Thiết kế backend

Tài liệu này nói backend sẽ làm thế nào: tech stack, database, API, bảo mật. Code hiện tại (chưa có backend) xem [architecture.md](architecture.md); việc cần làm xem [tasks.md › Backend](tasks.md#backend-kế-hoạch-chưa-giao).

Chưa có code backend. Phần nào **Đã chốt**, phần nào **Đề xuất** ghi ở [Tech stack](#tech-stack); phần còn hỏi xem [Chưa chốt](#chưa-chốt).

## Mục tiêu và nguyên tắc

- Lưu dữ liệu theo tài khoản, dùng được trên nhiều máy.
- **Các trang không phải sửa logic:** viết lại `core/storage.js` bằng `fetch()`, giữ nguyên 7 hàm `list`, `get`, `put`, `putMany`, `remove`, `removeMany`, `clearAll`. Mọi hàm `repo.js` đã `async` nên trang không phải đổi.
- **Logic vẫn ở trình duyệt:** SM-2 (`scheduler.js`), chọn thẻ (`queue.js`), số liệu Trang chủ, furigana, `preferences.js`. Server chỉ lưu và kiểm tra dữ liệu, dùng lại `validateDeck` / `validateCard` của `core/models.js` (ES module, Node import được).
- **Trình duyệt không bao giờ kết nối thẳng vào DB:** trình duyệt → `/api` (server) → DB. Chỉ server biết `DATABASE_URL`.

## Tech stack

| Thành phần | Chọn | Trạng thái |
|---|---|---|
| Ngôn ngữ server | Node.js | **Đã chốt** (Leader, 2026-11-21) |
| Database | PostgreSQL trên **Prisma Postgres** (gói Free, cài qua Vercel Marketplace) | **Đã chốt** (Leader, 2026-11-21) |
| Thư viện kết nối DB | `pg` (node-postgres), viết SQL có tham số; không dùng Prisma ORM | Đề xuất |
| Chạy server | Vercel Functions trong thư mục `api/`, cùng domain với web | Đề xuất |
| Đăng nhập | Google OAuth (Google Identity Services) → server xác minh ID token bằng `google-auth-library` | Đề xuất |
| Phiên đăng nhập | JWT của app trong cookie `httpOnly; Secure; SameSite=Lax`, hết hạn 7 ngày, không có refresh token | Đề xuất |
| Migration | File SQL đánh số trong `db/migrations/` (VD `001_init.sql`) | Đề xuất |
| Chạy local | `vercel dev` thay cho `python -m http.server` | Đề xuất |

- Prisma Postgres là Postgres thật, nên dùng `pg` và SQL thuần, không cần Prisma ORM.
- Gói Free không hết hạn và không tự tạm dừng khi không dùng (khác Supabase tạm dừng sau 1 tuần, Render hết hạn sau 30 ngày).
- Gói Free giới hạn khoảng 10 kết nối, 1 GB, 200 nghìn thao tác/tháng. Đủ cho đồ án; xem lại trang giá trước khi tạo.
- Web và API cùng domain nên cookie tự gửi, không cần CORS.
- **Đã cân nhắc, không chọn:** Neon (Leader không chọn), Aiven (20 kết nối, không pooling), Supabase, Turso (SQLite, phải sửa thiết kế bảng).

## Database

```sql
-- gen_random_uuid() để tạo id phía server (chỉ dùng cho users)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================== USERS ==============================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- id nội bộ, server tạo
  google_sub    TEXT NOT NULL UNIQUE,     -- id cố định của Google; UNIQUE: mỗi tài khoản Google = 1 user,
                                          -- đăng nhập lại không tạo user trùng
  email         TEXT NOT NULL,            -- chỉ để hiển thị, không dùng làm khóa (email có thể đổi)
  name          TEXT,                     -- tên hiển thị
  avatar_url    TEXT,                     -- ảnh đại diện Google
  token_version INT  NOT NULL DEFAULT 0,  -- JWT mang số này; tăng 1 → mọi JWT cũ hết hiệu lực
  created_at    BIGINT NOT NULL           -- mili giây
);
-- Không lưu mật khẩu, không lưu access token của Google.

-- ============================== DECKS ==============================
CREATE TABLE decks (
  id          UUID PRIMARY KEY,           -- trình duyệt tạo; gửi lại cùng id → không tạo bộ thứ hai
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- chủ bộ, lấy từ JWT
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),        -- LIMITS.deckName
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 300), -- LIMITS.deckDescription
  new_per_day INT  NOT NULL DEFAULT 20 CHECK (new_per_day BETWEEN 0 AND 999),   -- LIMITS.newPerDayMax
  color       TEXT NOT NULL
              CHECK (color IN ('pink','peach','yellow','green','sky','lavender')),  -- DECK_COLORS
  direction   TEXT NOT NULL DEFAULT 'ja-vi' CHECK (direction IN ('ja-vi','vi-ja')), -- DECK_DIRECTIONS
  created_at  BIGINT NOT NULL,
  updated_at  BIGINT NOT NULL,            -- phát hiện 2 máy sửa cùng lúc
  UNIQUE (id, user_id)                    -- để cards tham chiếu cặp (bộ, chủ)
);
CREATE INDEX decks_user_idx ON decks (user_id);

-- ============================== CARDS ==============================
CREATE TABLE cards (
  id          UUID PRIMARY KEY,           -- trình duyệt tạo; nhập lại file/dán lại → không nhân đôi
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id     UUID NOT NULL,
  FOREIGN KEY (deck_id, user_id)          -- bộ phải tồn tại VÀ cùng chủ với thẻ:
              REFERENCES decks (id, user_id)  -- không gắn được thẻ vào bộ người khác
              ON DELETE CASCADE,          -- xóa bộ → xóa thẻ

  -- nội dung
  term        TEXT NOT NULL CHECK (char_length(term)    BETWEEN 1 AND 2000),  -- có furigana 約束[やくそく]
  meaning     TEXT NOT NULL CHECK (char_length(meaning) BETWEEN 1 AND 2000),
  reading     TEXT NOT NULL DEFAULT '' CHECK (char_length(reading) <= 2000),
  example     TEXT NOT NULL DEFAULT '' CHECK (char_length(example) <= 2000),

  -- tiến độ SM-2 (trạng thái hiện tại)
  state       TEXT NOT NULL DEFAULT 'new'
              CHECK (state IN ('new','learning','review','relearning')),
  due         BIGINT NOT NULL DEFAULT 0,                       -- đến hạn ôn (ms); thẻ mới = 0
  interval    REAL   NOT NULL DEFAULT 0 CHECK (interval >= 0), -- số ngày tới lần ôn sau
  ease        REAL   NOT NULL DEFAULT 0 CHECK (ease >= 0),     -- độ dễ tích lũy (2.5 = 250%)
  step        INT    NOT NULL DEFAULT 0 CHECK (step >= 0),     -- bước học (learning/relearning)
  reps        INT    NOT NULL DEFAULT 0 CHECK (reps >= 0),     -- số lần đã chấm
  lapses      INT    NOT NULL DEFAULT 0 CHECK (lapses >= 0),   -- số lần quên
  last_review BIGINT,                                          -- NULL = chưa học
  created_at  BIGINT NOT NULL,
  updated_at  BIGINT NOT NULL
);
CREATE INDEX cards_deck_idx ON cards (user_id, deck_id);  -- thẻ của một bộ
CREATE INDEX cards_due_idx  ON cards (user_id, due);      -- thẻ đến hạn

-- ============================ REVIEW_LOGS ===========================
-- Mỗi lần bấm Lại/Khó/Tốt/Dễ = 1 dòng.
CREATE TABLE review_logs (
  id            UUID PRIMARY KEY,         -- trình duyệt tạo trước khi gửi; gửi lại → không chấm 2 lần
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id       UUID NOT NULL,            -- không FK: xóa thẻ/bộ vẫn giữ lịch sử
  deck_id       UUID NOT NULL,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 4),  -- 1 Lại · 2 Khó · 3 Tốt · 4 Dễ
  prev_state    TEXT NOT NULL CHECK (prev_state IN ('new','learning','review','relearning')),
  prev_interval REAL NOT NULL,
  new_interval  REAL NOT NULL,
  prev_ease     REAL NOT NULL,
  reviewed_at   BIGINT NOT NULL,          -- heatmap, chuỗi ngày
  time_ms       INT NOT NULL DEFAULT 0 CHECK (time_ms BETWEEN 0 AND 86400000)
);
CREATE INDEX logs_time_idx ON review_logs (user_id, reviewed_at);
CREATE INDEX logs_card_idx ON review_logs (user_id, card_id);
```

- **Cột bám theo `core/models.js`:** cùng trường, cùng giới hạn (`LIMITS`, `DECK_COLORS`, `DECK_DIRECTIONS`). Đổi `models.js` thì viết migration mới cho khớp.
- **`id` là `UUID` do trình duyệt tạo:** `newId()` đã tạo UUID v4. Nhờ vậy `put` chạy giống localStorage (id có sẵn trước khi gửi), và gửi lại cùng id không tạo bản ghi thứ hai (idempotent, xem [Idempotency](#idempotency)).
- **Thời gian là `BIGINT` mili giây**, giống `Date.now()` trong app; không đổi sang `TIMESTAMP`.
- **`cards` và `review_logs` có `user_id` riêng**, để mọi query lọc thẳng theo người dùng, không phải `JOIN` qua `decks`.
- **`review_logs` không có FK tới `cards`**, vì xóa bộ vẫn giữ lịch sử ôn (giống hiện tại, xem [architecture.md › Dữ liệu](architecture.md#dữ-liệu)).
- Đã bỏ trường `jlpt` (task L16): giao diện không dùng, DB không có cột này.

**"Khó/dễ" nằm ở 2 chỗ:**
- `review_logs.rating` là điểm từng lần chấm: lịch sử, heatmap, hoàn tác.
- `cards.ease` / `interval` / `due` là kết quả SM-2 hiện tại của thẻ.

## API

Prefix `/api`. `:c` là collection, chỉ nhận đúng 3 giá trị `decks` | `cards` | `reviewLogs` (danh sách cố định); giá trị khác → `404`.

| Hàm `storage.js` | Route |
|---|---|
| `list(c)` | `GET /api/:c` |
| `get(c, id)` | `GET /api/:c/:id` |
| `put(c, item)` | `PUT /api/:c/:id` |
| `putMany(c, items)` | `POST /api/:c/batch` (1 transaction) |
| `remove(c, id)` | `DELETE /api/:c/:id` |
| `removeMany(c, ids)` | `POST /api/:c/delete` |
| `clearAll()` | `DELETE /api/me/data` |

**Route riêng chạy trong 1 transaction**, vì thao tác nhiều bước qua mạng có thể đứt giữa chừng:
- `POST /api/reviews`: ghi lượt ôn + cập nhật thẻ.
- `POST /api/reviews/:id/undo`: khôi phục thẻ + xóa lượt ôn.
- Xóa bộ: xóa bộ + thẻ trong bộ.

**Đăng nhập:** `POST /api/auth/google`, `POST /api/auth/logout`, `GET /api/me`.

JSON dùng `camelCase` như `core/models.js`; server đổi sang `snake_case` khi ghi DB.

## Idempotency

Mạng chập chờn thì trình duyệt có thể gửi lại một request. Gửi 2 lần phải ra cùng kết quả như gửi 1 lần.

| Thao tác | Gửi lại 2 lần thì sao |
|---|---|
| Tạo bộ, tạo thẻ, tạo nhiều thẻ, đưa dữ liệu khách lên | `INSERT … ON CONFLICT (id) DO NOTHING`: không có bản thứ hai |
| Sửa (`PUT`) | Ghi đè cùng giá trị |
| Xóa thứ đã xóa | Trả `204` |
| **Chấm điểm** | Kiểm tra `review_logs.id` trước; đã có thì trả kết quả cũ, không chạy SM-2 lần nữa |
| Hoàn tác | Lượt ôn không còn → trả thành công, không khôi phục thẻ lần nữa |
| Đăng nhập lại | `google_sub UNIQUE` + `ON CONFLICT DO UPDATE` (cập nhật tên, ảnh) |

**2 máy cùng sửa:** trình duyệt gửi kèm `updatedAt` đang có. Server chạy `UPDATE … WHERE id = $1 AND user_id = $2 AND updated_at = $3`. 0 dòng → `409`, trang báo "Đã được sửa ở nơi khác, tải lại trang".

Chưa cần bảng `idempotency_keys`, vì mọi thao tác đã có id do trình duyệt tạo.

## Bảo mật

**Repo đang public:** ai cũng xem được code và lịch sử commit. Cấu trúc bảng lộ ra không sao (bảo mật không dựa vào giấu tên bảng). Thứ không bao giờ được lộ là bí mật để vào DB và dữ liệu người dùng.

### a. Bí mật (secrets)

- Bí mật gồm `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID` (client ID không bí mật nhưng để chung chỗ cho dễ quản lý). Chỉ để trong Vercel Environment Variables và file `.env` ở máy.
- Thêm `.env`, `.env.*` (trừ `.env.example`) vào `.gitignore` **trước khi** tạo file `.env`. Có `.env.example` liệt kê tên biến, không có giá trị.
- Bật GitHub **Secret scanning** và **Push protection** (Settings › Code security) để GitHub chặn push có token, mật khẩu.
- Lỡ commit bí mật: **đổi ngay** (mật khẩu DB, `JWT_SECRET`). Xóa commit không đủ, vì lịch sử git và bản fork vẫn còn.
- `JWT_SECRET` dài ít nhất 32 byte ngẫu nhiên (`openssl rand -base64 48`), khác nhau giữa local và bản deploy.
- Không in bí mật, JWT, cookie ra log hay thông báo lỗi.

### b. Database

- Trình duyệt không kết nối thẳng DB; chỉ server có `DATABASE_URL`.
- Kết nối DB bắt buộc TLS (`sslmode=require`).
- Coi ràng buộc trong bảng là lớp chặn cuối: FK `(deck_id, user_id)`, `CHECK` giá trị và độ dài, kiểu `UUID`, `token_version`.
- Role của app chỉ có `SELECT/INSERT/UPDATE/DELETE` trên 4 bảng. Role chạy migration (tạo, sửa bảng) tách riêng, không nằm trong biến môi trường của app.
- Chỉ dùng query có tham số (`$1, $2`). Không ghép chuỗi SQL từ dữ liệu người dùng, kể cả tên cột hay tên bảng (tên bảng lấy từ danh sách cố định).
- Không sửa tay cấu trúc bảng trên Prisma Postgres; mọi thay đổi qua file trong `db/migrations/`.

### c. Phân quyền dữ liệu (chống IDOR)

- Lấy `user_id` chỉ từ JWT; bỏ qua mọi `userId`, `user_id` trong body hay query.
- Mọi `SELECT/UPDATE/DELETE` có `AND user_id = $me`. Không tìm thấy (kể cả vì là dữ liệu người khác) → trả `404`; không phân biệt "không có" với "của người khác".
- Ghi thẻ: kiểm tra `deckId` thuộc người đang đăng nhập (FK trong DB cũng chặn).
- Mỗi route có test với **2 user**: user B không đọc, sửa, xóa được dữ liệu của user A.

### d. Đăng nhập và phiên

- Xác minh ID token Google bằng `google-auth-library`: đúng `aud` = `GOOGLE_CLIENT_ID`, đúng issuer Google, còn hạn, `email_verified = true`.
- Ký JWT bằng `HS256`; khi xác minh chỉ chấp nhận đúng thuật toán này (chặn `alg: none`). Kiểm tra `exp` và `token_version` khớp với DB.
- Cookie: `httpOnly; Secure; SameSite=Lax; Path=/`, hết hạn 7 ngày. Không để JWT trong localStorage hay trong URL.
- Đăng xuất: xóa cookie. "Đăng xuất mọi thiết bị" hoặc nghi lộ token: tăng `token_version`.
- Giới hạn số lần gọi `/api/auth/google` theo IP (chống dò).

### e. Request và response

- Chỉ nhận body `Content-Type: application/json`, còn lại `415`. Kèm `SameSite=Lax` là đủ chống CSRF cho đồ án.
- Giới hạn body 2 MB (bằng giới hạn nhập file của C7); quá thì `413`.
- Kiểm tra dữ liệu ở server bằng `validateDeck` / `validateCard`; bỏ các trường lạ, không ghi thẳng object từ body vào DB.
- Không bật CORS cho domain khác (web và API cùng domain). Không trả `Access-Control-Allow-Origin: *`.
- Thông báo lỗi trả về không chứa stack trace, câu SQL hay tên bảng; chi tiết chỉ ghi vào log server.
- Thêm header `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY` (cấu hình trong `vercel.json`).

### f. Trình duyệt (XSS)

- JWT nằm trong cookie `httpOnly` nên script không đọc được, nhưng XSS vẫn gọi được API thay người dùng. Vì vậy: không dùng `innerHTML` với dữ liệu người dùng; dựng DOM bằng `h()` (`core/dom.js`) và `renderFurigana()` (đã tạo text node). Review PR phải kiểm tra điều này.
- `?seed` / `?reset` chỉ chạy ở chế độ khách. Đã đăng nhập thì `dev.js` bỏ qua và báo trong Console (tránh `?reset` xóa dữ liệu thật trên DB).

### g. Thư viện

- Commit `package-lock.json`. Chạy `npm audit` trước mỗi lần deploy; lỗi mức high/critical phải xử lý.
- Chỉ thêm thư viện thật cần (`pg`, `google-auth-library`, thư viện JWT); thêm mới phải ghi lý do trong PR.

### h. Để sau

- Row Level Security của Postgres (cần `SET LOCAL` mỗi transaction với kết nối serverless).

## Những điểm phải nhớ khi làm

- **Kết nối DB:** gói Free khoảng 10 kết nối. Tạo `Pool` của `pg` một lần ở cấp module (dùng lại giữa các lần gọi function), `max` nhỏ (VD 2–3); không mở kết nối mới mỗi request.
- **Đọc cả bảng:** hiện `repo.js` đọc cả bảng rồi tự lọc (`list('cards')`, Trang chủ đọc mọi lượt ôn). Bước đầu chấp nhận; sau thêm lọc `?deckId=`, `?from=` cho thẻ theo bộ và lượt ôn. Gói Free giới hạn số thao tác mỗi tháng nên cần để ý.
- **Giao diện khi qua mạng:** trang phải có trạng thái đang tải, báo lỗi mạng (`startPage` đã có khung báo lỗi), khóa nút Lưu khi đang gửi.
- **Google Cloud Console:** thêm cả `http://localhost:<port>` và domain Vercel vào Authorized JavaScript origins.

## Chưa chốt

Hỏi Leader trước khi làm các phần này.

- **Chế độ khách:** giữ localStorage cho người chưa đăng nhập, hay bắt đăng nhập mới dùng được. Đề xuất: giữ; đăng nhập lần đầu thì hỏi "Đưa dữ liệu trên máy lên tài khoản?", dùng lại logic nhập JSON của C7.
- **Hạn nộp** của phần backend.
- Đề bài có yêu cầu công nghệ cụ thể nào khác không.

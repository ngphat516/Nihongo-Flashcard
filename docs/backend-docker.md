# Đề xuất host backend bằng Docker + tên miền riêng

Mình có sẵn máy ở nhà chạy Docker và tên miền dùng được, nên ghi lại phương án tự host nguyên cụm backend + database thay cho Vercel Functions + Prisma Postgres trong [backend.md](backend.md) để cả nhóm xem trước khi bắt đầu BE1.

## Giữ nguyên gì từ `backend.md`

- **Schema & DB:** giữ nguyên PostgreSQL và 4 bảng `users`, `decks`, `cards`, `review_logs`, viết SQL thuần qua `pg`, migration trong `db/migrations/`. Không đổi sang SQLite để khỏi phải sửa thiết kế bảng, giữ được FK ghép `(deck_id, user_id)` và tách role DB.
- **Backend & FE:** giữ Node.js, tách `core/storage.js`, SM-2 và `queue.js` vẫn chạy ở trình duyệt.
- **Tài khoản:** giữ Google OAuth (Google Identity Services + `google-auth-library`) và JWT lưu trong cookie `HttpOnly; Secure; SameSite=Lax`.
- **API & bảo mật:** giữ nguyên danh sách route, idempotency, `409` khi sửa chồng và các luật bảo mật trong [backend.md](backend.md).

## Thay đổi gì và vì sao

| Phần | Trong `backend.md` | Đề xuất mới |
|---|---|---|
| Chạy server | Vercel Functions (`api/`), local dùng `vercel dev` | Server Node.js thường (Express / Fastify / Hono), đóng gói Docker |
| Database | Prisma Postgres gói Free (Vercel Marketplace) | Container `postgres:16-alpine` trong cùng Docker Compose |
| Public ra mạng | Deploy lên domain Vercel | Đưa cả FE lẫn `/api/*` lên tên miền riêng qua Cloudflare Tunnel |

**Vì sao đổi:**

1. **Không bị giới hạn gói Free:** Prisma Postgres Free giới hạn khoảng 10 kết nối, 1 GB và 200 nghìn thao tác/tháng, mà hiện `core/storage.js` đang đọc cả bảng `cards` và `reviewLogs`. Chạy Postgres trong Docker ở nhà không lo chạm hạn mức.
2. **Đỡ rắc rối lúc dev chung:** cả nhóm chỉ cần `docker compose up` là có sẵn FE, BE và Postgres chạy giống bản thật, không phải cài `vercel dev` hay đụng chung một DB trên mạng.
3. **Server chạy liên tục ổn định hơn serverless:** giữ được 1 connection pool gọn, không bị cold start, và rate limit cho `/api/auth/google` trong bộ nhớ chạy có tác dụng thật (trên serverless mỗi lần gọi có thể rơi vào instance khác).
4. **Giữ cùng một tên miền (same-origin):** chạy cả FE và `/api/*` chung một tên miền qua Cloudflare Tunnel thì không cần mở port router, có sẵn HTTPS, không phải bật CORS và không dính lỗi trình duyệt (nhất là Safari/iOS) chặn cookie cross-site.
5. **Không bị khóa vào hạ tầng:** server chỉ đọc `DATABASE_URL` từ `.env`. Sau này cần chuyển sang VPS hay quay lại Prisma Postgres thì đổi biến môi trường là chạy, không phải viết lại code.

## Cách chạy nguyên cụm

```text
Trình duyệt (HTTPS)
   │  https://<tên-miền>
   ▼
Cloudflare Edge (HTTPS, ẩn IP nhà)
   │  Cloudflare Tunnel
   ▼
Docker Compose (mạng nội bộ):
   ├── tunnel (cloudflared)     → trỏ vào http://app:3000 (chỉ bật ở prod)
   ├── app (Node.js)            → serve FE tĩnh (theo whitelist) + /api/*
   └── db (postgres:16-alpine)  → volume pgdata, không mở port ra ngoài
```

- **Local dev:** chạy `docker compose up` (chỉ bật `app` và `db`, bỏ qua `tunnel` bằng profile `prod`).
- **Máy ở nhà (prod):** chạy `docker compose --profile prod up -d --build`, đặt `restart: unless-stopped`.
- **Serve file tĩnh cẩn thận:** chỉ mở đúng `index.html`, `/pages`, `/core`, `/styles`, `/dev` (không serve cả thư mục gốc repo kẻo lộ `.env`, `db/`, code server). Hoặc thêm 1 container Nginx đứng trước nếu muốn tách hẳn FE và BE.

## Vài điểm cần để ý

- **Cloudflare:** tạo rule *Bypass cache* cho `/api/*`; lấy IP thật của người dùng từ header `CF-Connecting-IP` cho rate limit (nếu không mọi người sẽ trùng IP của `cloudflared`).
- **Google OAuth:** thêm cả tên miền mới và `http://localhost:<port>` vào *Authorized JavaScript origins* trên Google Cloud Console.
- **TLS nối DB:** trong mạng nội bộ Docker có thể để `PGSSLMODE=disable`, còn nối DB ngoài thì bật `require` qua `.env`.
- **Backup & ổn định lúc chấm bài:** đặt cron `pg_dump` mỗi ngày ra máy host, và đảm bảo máy ở nhà bật ổn định suốt đợt nộp/chấm.
- **Nếu Leader chốt theo hướng này:** cập nhật lại phần Tech stack trong [backend.md](backend.md) và đầu mục `BE1` trong [tasks.md](tasks.md) (thay `vercel.json` / `vercel dev` / Prisma Postgres bằng `Dockerfile` + `docker-compose.yml`), kèm thống nhất cách Leader xem log / pull deploy khi cần.

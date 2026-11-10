# Phân việc — Nhớ Lâu (flashcard SM-2)

| Người | Phụ trách | Folder được sửa |
|---|---|---|
| **Leader** | Codebase nền (`core/`, `styles/base.css`) + **Trang chủ** + review PR | `index.html` + `pages/home/` |
| **Thành viên 2** | **Album** — xem bộ thẻ và thẻ | `pages/album/` |
| **Thành viên 3** | **Tạo thẻ** | `pages/create/` |
| **Thành viên 4** | **Học** | `pages/study/` |

> Điền tên thật vào cột "Người". Leader nhận Trang chủ vì nhẹ nhất, để còn thời gian review và giữ phần core.

**Mức ưu tiên:** **Bắt buộc** = phải có để demo · **Nên có** = làm sau khi xong phần bắt buộc · **Nếu kịp** = điểm cộng.

**Xong một task khi:** chạy đúng với dữ liệu mẫu (`?seed`) và khi trống (`?reset`), dùng được trên điện thoại (rộng 375px), Console không có lỗi, đã xóa khung `.todo` và đoạn `DEMO` của phần đó.

Các hàm core nhắc tới bên dưới đều có chú thích ở đầu file `pages/<trang>/<trang>.js` và trong `README.md`.

---

## Leader — nền chung

| Mã | Việc cần làm | Mô tả / tiêu chí xong | Ưu tiên |
|---|---|---|---|
| L1 | Codebase nền | Cấu trúc thư mục, CSS chung, lớp lưu localStorage, thuật toán SM-2 + 37 test, dữ liệu mẫu, khung 4 trang | **Xong** |
| L2 | Repo GitHub | Tạo repo, push codebase, bật bảo vệ nhánh `main` (bắt buộc qua PR), mời 3 thành viên | Bắt buộc |
| L3 | Review & merge | Review mọi PR. Thay đổi trong `core/` hoặc `styles/base.css` phải qua leader | Bắt buộc |
| L4 | Hệ thống giao diện | `styles/tokens.css` + `styles/components.css` (nút, ô nhập, thống kê, bộ đếm, badge, thẻ lật, dialog, toast, trạng thái rỗng), font Noto Sans JP, trang `pages/styleguide/`. Chỉ CSS, không có `core/ui.js` | **Xong** |
| L5 | Kiểm thử cuối | `npm test` qua hết, thử luồng tạo bộ → thêm thẻ → học → xem heatmap, thử trên điện thoại, xóa `dev.js` khỏi 4 file HTML | Bắt buộc |

---

## Trang chủ — `index.html` + `pages/home/` — Leader

Mục đích: nhìn tổng quan tiến độ, vào học nhanh.

| Mã | Việc cần làm | Mô tả / tiêu chí xong | Hàm core | Ưu tiên |
|---|---|---|---|---|
| H1 | Heatmap 12 tháng | Lưới 53 cột (tuần) × 7 hàng (thứ), mỗi ô = 1 ngày, 5 mức màu `--heat-0…4` theo số lượt ôn. Rê chuột / focus vào ô hiện "12 thẻ · T3, 10/11/2026". Nhãn tháng ở trên. Trên điện thoại cuộn ngang, mở ra thì cuộn sẵn tới tuần hiện tại | `getReviewLogs()`, `dayKey()` | Bắt buộc |
| H2 | Thẻ tóm tắt | 4 ô số: **lượt ôn hôm nay**, **chuỗi ngày học** (số ngày liền nhau có ôn, tính tới hôm nay hoặc hôm qua), **tổng số thẻ**, **tỉ lệ nhớ 30 ngày** (% lượt ôn thẻ đang ôn tập mà không bấm "Lại") | `getReviewLogs()`, `getDeckOverview()`, `daysBetween()` | Bắt buộc |
| H3 | Hôm nay cần học | Mỗi bộ: tên + 3 con số Mới / Đang học / Đến hạn + nút "Học" → `routes.study(id)`. Bộ không còn thẻ cần học thì mờ đi hoặc xếp cuối | `getDeckOverview()`, `routes` | Bắt buộc |
| H4 | Trạng thái rỗng | Chưa có bộ nào: lời chào + nút "Tạo bộ thẻ đầu tiên" → `pages/create/`. Chưa ôn lần nào thì heatmap vẫn hiện, toàn ô trống | — | Bắt buộc |
| H5 | Chú giải heatmap | Dòng "Ít ▢▢▢▢▢ Nhiều" dưới heatmap. Có nút xem bảng số liệu theo tháng cho ai không phân biệt được màu | — | Nên có |
| H6 | Dự báo | Biểu đồ cột: số thẻ đến hạn trong 14 ngày tới | `getCards()` | Nếu kịp |

---

## Album — `pages/album/` — Thành viên 2

Mục đích: xem, tìm, sửa các bộ thẻ và thẻ. Trang có 2 chế độ: `pages/album/` (lưới bộ) và `pages/album/?deck=<id>` (chi tiết một bộ).

| Mã | Việc cần làm | Mô tả / tiêu chí xong | Hàm core | Ưu tiên |
|---|---|---|---|---|
| A1 | Lưới album | Mỗi bộ là một "bìa album": tên, mô tả (cắt ngắn), tổng số thẻ, số thẻ cần học hôm nay. Bấm vào → `routes.album(id)`. Có nút "+ Tạo bộ mới" | `getDeckOverview()` | Bắt buộc |
| A2 | Chi tiết bộ | Đầu trang: tên, mô tả, nút "Học ngay" (`routes.study`) và "Thêm thẻ" (`routes.create`). Bên dưới: lưới thẻ, bấm một thẻ thì lật xem mặt sau | `getDeck()`, `getCards(deckId)` | Bắt buộc |
| A3 | Trạng thái thẻ | Mỗi thẻ có badge Mới / Đang học / Ôn tập và hạn ôn ("Ngày mai", "Sau 5 ngày") | `STATE_LABELS`, `describeDue()`, class `.badge-<state>` | Bắt buộc |
| A4 | Sửa / xóa thẻ | Sửa mặt trước/sau (tiến độ học giữ nguyên). Xóa có hỏi xác nhận. Lỗi nhập liệu hiện `err.message` | `updateCard()`, `deleteCard()` | Bắt buộc |
| A5 | Sửa / xóa bộ | Sửa tên, mô tả, số thẻ mới/ngày. Xóa bộ (xóa luôn thẻ, giữ lịch sử ôn) có hỏi xác nhận, xóa xong về lưới | `updateDeck()`, `deleteDeck()` | Bắt buộc |
| A6 | Tìm & lọc | Ô tìm theo nội dung 2 mặt (gõ "thuat toan" vẫn ra "thuật toán": bỏ dấu bằng `normalize('NFD')`), lọc theo trạng thái, sắp xếp (mới tạo / sắp đến hạn) | — | Nên có |
| A7 | Học lại từ đầu | Nút đưa một thẻ về trạng thái Mới | `resetCard()` | Nếu kịp |
| A8 | Trường hợp đặc biệt | Chưa có bộ nào: lời nhắc + nút tạo bộ. `?deck=` sai id: thông báo + link về lưới. Bộ chưa có thẻ: nút "Thêm thẻ đầu tiên" | `getDeck()` trả `null` | Bắt buộc |

---

## Tạo thẻ — `pages/create/` — Thành viên 3

Mục đích: tạo bộ mới và thêm thẻ thật nhanh. `pages/create/?deck=<id>` thì chọn sẵn bộ đó.

| Mã | Việc cần làm | Mô tả / tiêu chí xong | Hàm core | Ưu tiên |
|---|---|---|---|---|
| C1 | Chọn / tạo bộ | Dropdown chọn bộ có sẵn (chọn sẵn theo `?deck=`). Hoặc form tạo bộ mới: tên (bắt buộc), mô tả, số thẻ mới/ngày (mặc định 20). Tạo xong thì tự chọn bộ đó | `getDecks()`, `createDeck()` | Bắt buộc |
| C2 | Thêm từng thẻ | 2 ô nhiều dòng: mặt trước, mặt sau. Lưu bằng nút hoặc **Ctrl+Enter**. Lưu xong xóa form, đưa con trỏ về mặt trước, báo "Đã thêm" | `createCard()` | Bắt buộc |
| C3 | Kiểm tra dữ liệu | Không cho lưu khi một mặt trống (báo ngay dưới ô). Cảnh báo nếu mặt trước trùng với thẻ đã có trong bộ (vẫn cho lưu nếu người dùng đồng ý). Hiện `err.message` của ValidationError | `getCards(deckId)` | Bắt buộc |
| C4 | Xem trước | Khung thẻ cập nhật theo lúc gõ, bấm để lật, nhìn giống trang Học | — | Nên có |
| C5 | Nhập nhiều thẻ | Ô dán văn bản, mỗi dòng `mặt trước \| mặt sau` hoặc cách nhau bằng Tab (copy từ Excel / Quizlet). Có bảng xem trước, dòng lỗi tô đỏ, bỏ chọn được từng dòng, rồi lưu một lần | `createCards()` | Nên có |
| C6 | Thẻ vừa thêm | Danh sách thẻ đã thêm trong phiên này, nút xóa nhanh nếu thêm nhầm, link "Xem trong album" → `routes.album(id)` | `deleteCard()`, `routes` | Nên có |
| C7 | Xuất / nhập file | Xuất một bộ ra file `.json` hoặc `.csv` và nhập lại | `getCards()`, `createCards()` | Nếu kịp |

---

## Học — `pages/study/` — Thành viên 4

Mục đích: học theo thuật toán SM-2. `pages/study/` để chọn bộ, `pages/study/?deck=<id>` để học. Có sẵn "Gợi ý vòng học" ở đầu `pages/study/study.js`.

| Mã | Việc cần làm | Mô tả / tiêu chí xong | Hàm core | Ưu tiên |
|---|---|---|---|---|
| S1 | Chọn bộ | Không có `?deck=` thì hiện danh sách bộ kèm số thẻ cần học, bấm để vào học. Bộ hết thẻ thì mờ đi | `getDeckOverview()` | Bắt buộc |
| S2 | Hiện thẻ | Hiện mặt trước. Nút "Hiện đáp án" (phím **Space**) lật ra mặt sau | `getStudyQueue(deckId)` | Bắt buộc |
| S3 | 4 nút chấm điểm | Lại / Khó / Tốt / Dễ, mỗi nút ghi thời gian lần ôn tới ("10 phút", "4 ngày"). Chỉ hiện sau khi lật. Phím **1–4** | `previewRatings(card)`, `RATING_LABELS` | Bắt buộc |
| S4 | Lưu & sang thẻ sau | Bấm nút: lưu kèm `timeMs` (từ lúc hiện thẻ tới lúc chấm), rồi lấy thẻ tiếp với `lastCardId` | `reviewCard()`, `getStudyQueue(deckId, { lastCardId })` | Bắt buộc |
| S5 | Bộ đếm | Thanh trên: tên bộ · **Mới** (xanh dương) · **Đang học** (cam) · **Đến hạn** (xanh lá), cập nhật sau mỗi lần chấm · nút Thoát | `counts` trong kết quả `getStudyQueue` | Bắt buộc |
| S6 | Màn hoàn thành | Hết thẻ: "Xong rồi!" + số thẻ đã học + thời gian học. Còn thẻ đang học hẹn sau: "Quay lại lúc 14:32" và tự tải lại khi tới giờ | `nextLearningAt` | Bắt buộc |
| S7 | Hoàn tác | Nút / phím **Z** hoàn tác lần chấm vừa rồi, thẻ đó hiện lại | `undo()` trả về từ `reviewCard` | Nên có |
| S8 | Hiệu ứng lật | Lật 3D bằng CSS, tắt khi người dùng bật giảm chuyển động. Nút to, dễ bấm trên điện thoại | — | Nên có |
| S9 | Phát âm | Nút đọc mặt trước bằng `speechSynthesis` (Web Speech API) | — | Nếu kịp |

---

## Cách làm việc

1. Mỗi người làm trên nhánh riêng: `feature/home`, `feature/album`, `feature/create`, `feature/study`.
2. Commit nhỏ, ghi mã task. VD: `album: lưới bìa album (A1)`.
3. Xong vài task thì mở PR vào `main`, điền mẫu PR, leader review rồi merge.
4. Cần thêm hàm vào `core/` thì nhắn leader (hoặc mở PR riêng cho core), **không** tự sửa core trong PR của trang.
5. Cần dữ liệu để test: thêm `?seed` vào URL. Muốn thử trang trống: `?reset`.

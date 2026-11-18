# Nhật ký tiến độ

Đã làm gì, khi nào, quyết định gì. Việc còn lại xem [tasks.md](tasks.md).

**Cách ghi:** mỗi PR vào `main` thêm một mục; agent làm xong việc cũng thêm một mục. Mục mới nhất ở **trên cùng**, theo mẫu:

```
## YYYY-MM-DD — Tên việc (mã task)

- **Người làm:** …
- **Đã xong:** … (commit / PR)
- **Quyết định:** … (luật hay quyết định sản phẩm thì ghi chi tiết vào product.md / conventions.md, ở đây chỉ nhắc)
- **Tiếp theo:** …
- **Vướng mắc:** … (bỏ dòng này nếu không có)
```

---

## 2026-11-18 — Bảo vệ main và CODEOWNERS (L2)

- **Người làm:** Leader, cùng Claude.
- **Đã xong:**
  - Điền `.github/CODEOWNERS` bằng username thật, đã đối chiếu với danh sách collaborator của repo: Leader `ngphat516` (mặc định, `core/`, `styles/`), Daika `tanphat-trinh` (`pages/album/`), kakushi `phattnt` (`pages/create/`), At `Peter-Kohi` (`pages/study/`). Mỗi folder trang có thêm Leader.
  - Ghi luật duyệt PR vào [conventions.md › Nhánh, commit, PR](conventions.md#nhánh-commit-pr).
  - Nhánh `chore/bao-ve-main`.
- **Quyết định:**
  - Bảo vệ `main`: bắt buộc qua PR, 1 lượt duyệt, cần duyệt của Code Owners, bỏ duyệt cũ khi có commit mới, chặn force-push và xóa nhánh.
  - Không bật "Do not allow bypassing the above settings": `core/`, `styles/` chỉ có Leader sở hữu, mà GitHub không cho tự duyệt PR của mình, nên Leader phải được bỏ qua.
- **Tiếp theo:** merge PR này rồi bật bảo vệ `main` trong Settings › Branches (bật sau khi merge để PR này không bị kẹt), rồi chuyển L2 sang Xong.

## 2026-11-18 — Bỏ lớp tương thích front/back (L6b)

- **Người làm:** kakushi, cùng Claude.
- **Đã xong:**
  - Xóa `core/card-compat.js`; `core/repo.js` bỏ mọi chỗ gọi `readCard` / `writeCard`. API giữ nguyên tên và chữ ký; thẻ trả ra không còn kèm `front` / `back`, gửi `{ front, back }` thì báo `ValidationError`.
  - Thêm `core/migrate.js`: `migrateCards()` đổi thẻ cũ sang trường mới và ghi lại.
  - `tests/repo.test.js`: bỏ 4 test lớp tương thích, thêm 4 test (đổi đúng và giữ tiến độ, `term` thắng `front`, chạy 2 lần như nhau và thẻ mới không đổi, repo từ chối `{ front, back }`). `npm test` 74 → 74.
  - Tài liệu: bỏ các chỗ "tạm tới L6b" trong architecture, product, conventions; L6, L6b, L15 → Xong; điền tên Daika, At vào bảng Phân việc; product.md chuyển mục "Thẻ tiếng Nhật" ra khỏi "Đã chốt, chưa làm".
  - Nhánh `core/bo-lop-tuong-thich`.
- **Kiểm tra:** `npm test` 74/74. Grep L6b không ra dòng nào trong `pages/`, `core/`. L15 trên nhánh này, từ `?reset`:
  - 1440px: tạo bộ "L15 1440" ở Tạo thẻ (thẻ có furigana, `reading`, `example`; thẻ chỉ có kana; màu `lavender`) → Album hiện furigana, tìm "loi hua" ra 1/2 thẻ, sửa nghĩa giữ trạng thái Mới → Học hiện furigana, chấm Tốt rồi hoàn tác (Z) về Mới, xóa lượt ôn → bìa `lavender` ở Trang chủ, Album, Học.
  - 375px: Album tìm "cam on" ra 1/2 thẻ, sửa cách đọc lưu được, không cuộn ngang; Học lật, chấm, hoàn tác được, 4 nút chấm điểm vẫn trên màn hình.
  - Thẻ cũ `{ front, back }` ghi tay vào localStorage: mở Album thì được đổi sang `term` / `meaning`, hiện đúng ở Album và Học.
  - Console không lỗi.
- **Quyết định:** thẻ cũ `front` / `back` trong localStorage được **chuyển đổi một lần** (cách A), không bắt người dùng `?reset`. `repo.js` gọi `migrateCards()` ở lần đọc thẻ đầu tiên sau khi mở trang (`getCards`, `getCard`, `getDeckOverview`), giữ promise để chỉ chạy một lần mỗi trang. Đặt trong `repo.js` vì mọi trang đều đọc thẻ qua đây, trang không phải tự gọi; không chạy lúc import module để test Node còn kịp cài localStorage giả.
- **Tiếp theo:** Leader review (sửa `core/`); rồi L7.

## 2026-11-18 — Làm rõ đợt 2 song song, lộ trình sau đợt 2

- **Người làm:** kakushi, cùng Claude.
- **Đã xong:**
  - `tasks.md`: thay "Lộ trình còn lại…" (3 bước) bằng đoạn **Đợt 2 (xong)** và danh sách **Tiếp theo**. Đoạn mới ghi rõ A9 + A5, C9 + C8, S10 làm song song, chỉ cần L6; đã merge PR #14, #12, #13.
  - Thêm task L15: chạy thử luồng Tạo thẻ → Album → Học trên `main`, làm trước L6b.
  - L6b: bỏ cụm "(H9, C9 đã xong)", thêm điều kiện làm sau L15; sửa lệnh grep để không khớp nhầm class `.back-link` (chạy trên `main` chỉ còn ra `core/card-compat.js`); thêm ý xử lý thẻ cũ `front`/`back` trong localStorage.
  - A5: đổi trạng thái thành Xong, vì Học đã dùng `deck.color` (S10).
  - Sửa tiêu đề 2 mục ngày 17/11 về `##` cho đúng mẫu.
  - Không sửa code. Nhánh `docs/lam-ro-dot-2`.
- **Quyết định:** đợt 2 chỉ phụ thuộc L6; các trang chỉ nối qua dữ liệu thẻ trong localStorage, qua `core/repo.js`. Bằng chứng: A9 (`810b692`) và S10 (`d5bb115`) commit trước C9 (`0cdf93f`), merge không conflict code, `npm test` 74/74. Thêm task chạy thử luồng (L15) trước L6b.
- **Tiếp theo:** L15, rồi L6b.

## 2026-11-17 — Đồng bộ main vào Album (A9, A5)

- **Người làm:** Banana (`tanphat-trinh`), cùng Codex.
- **Đã xong:** merge `main` `02894d9` vào `feature/album-a9`, giữ lịch sử A9/A5. Conflict duy nhất ở nhật ký: giữ đầy đủ 21 mục của hai nhánh, xếp ngày mới trước. Các thay đổi C9/C8/L9 và tài liệu được tích hợp nguyên bản; không sửa code hoặc giao diện Album.
- **Kiểm tra:** API/model không đổi. 74/74 test Node và 75 kiểm tra hồi quy Album qua. Luồng tạo bộ/thẻ mới → Album → Học/hoàn tác → Trang chủ qua ở 1440/375px; thêm luồng với `?seed` tiếng Nhật mới: xem cả 3 bộ, sửa bằng C9 → tìm/sửa trong Album giữ tiến độ → đổi màu → học/chấm/hoàn tác → Album, qua ở cả hai kích thước. Không có lỗi JavaScript; giới hạn tải Google Fonts và favicon cục bộ như đã ghi trước đó.
- **Vướng mắc:** Study chưa có S10 trên main, vẫn dùng màu theo vị trí; không sửa phần của thành viên khác.
- **Tiếp theo:** cập nhật PR #12 để nhóm review; không merge PR.

## 2026-11-17 — Thẻ tiếng Nhật và chọn màu bìa trang Tạo thẻ (C9, C8), dữ liệu mẫu tiếng Nhật (L9)

- **Người làm:** kakushi.
- **Đã xong:**
  - C9: mỗi dòng thẻ ở `pages/create/` có 4 ô Từ, Nghĩa, Cách đọc, Ví dụ; gợi ý cú pháp furigana; kiểm tra thiếu Từ/Nghĩa; so trùng bằng `plainFurigana()`; Tab ở ô Ví dụ dòng cuối thêm dòng mới; lưu qua `createCards()` / `updateCard()` với 4 trường mới; tách các hàm dòng thẻ (`ROW_FIELDS`, `fieldsOf`, `snapshot`, `autosizeRow`) trong `pages/create/card-rows.js`.
  - C8: thêm `.color-picker` 6 màu bìa vào form bộ thẻ; tạo bộ mới tự chọn màu kế tiếp theo `DECK_COLORS`; mở bộ cũ chọn sẵn `deck.color` và lưu khi đổi màu.
  - L9: thay 3 bộ mẫu trong `core/seed.js` bằng 3 bộ tiếng Nhật (22, 12, 8 thẻ) kèm furigana, `reading`, `example`; cập nhật test trong `tests/repo.test.js`.
  - Tài liệu: cập nhật trạng thái trong `product.md`, `tasks.md`; bổ sung bảng dữ liệu mẫu `?seed` và ghi chú `card-rows.js` vào `architecture.md`; sắp xếp lại lộ trình 3 bước và thêm gợi ý triển khai cho `L6b`, `L7`, `C4`, `C5`, `C7` trong `tasks.md`.
- **Tiếp theo:** Review & merge A9 + A5 (PR #12), S10 (PR #13) và C9 + C8; rồi làm L6b, L7, C4/C5/C7.

## 2026-11-16 — Thẻ tiếng Nhật trên trang Học (S10)

- **Người làm:** AT, cùng Codex.
- **Đã xong:** hiện từ và ví dụ có furigana, kèm nghĩa và cách đọc nếu có. Bìa lấy màu từ bộ thẻ. Hoàn tác hiện thẻ do core trả về.
- **Kiểm tra:** 70 bài test qua. Edge chạy hết một lượt với dữ liệu mẫu, kiểm tra phím tắt và ví dụ dài ở 375 px.
- **Tiếp theo:** gửi S10 để review cùng các thay đổi đợt 2.

## 2026-11-16 — Chọn màu bìa trong Album (A5)

- **Người làm:** Banana (`tanphat-trinh`, `trinhphat2931@gmail.com`), cùng Codex.
- **Đã xong:** `#deck-dialog` dùng `color-picker` chung với đủ 6 màu, chọn sẵn `deck.color`; form lưu màu qua `updateDeck()`. Giữ nguyên chức năng A9, không sửa phần chung hoặc trang khác.
- **Kiểm tra:** 74 test Node; kiểm tra chọn sẵn, mũi tên đổi radio, lưu/mở lại, Esc hủy ở 1440/375px. Album và Trang chủ đọc đúng màu mới. Ảnh tại `pages/album/screenshots/album-a5-*.png`.
- **Vướng mắc:** Study vẫn dùng `COVER_COLORS[index % ...]` trên main hiện tại, nên chưa hiện màu mới. Đây là phần S10 của thành viên 4; không sửa vượt phạm vi. A5 chưa đánh dấu Xong toàn bộ vì còn phụ thuộc này.
- **Tiếp theo:** review nhánh `feature/album-a9`, chờ S10 để kiểm tra lại đồng bộ màu cả 3 trang. Chưa tạo PR hoặc merge.

## 2026-11-16 — Thẻ tiếng Nhật trong Album (A9)

- **Người làm:** Banana (`tanphat-trinh`, `trinhphat2931@gmail.com`), cùng Codex.
- **Đã xong:** A9 trên nhánh `feature/album-a9`, từ `main` `df8aaeb`: mặt trước và ví dụ có furigana, nghĩa/cách đọc ở mặt sau, ẩn trường trống; tìm cả 4 trường, bỏ furigana khi tìm và xác nhận xóa; hộp sửa đủ 4 ô; bìa dùng `deck.color`. Giữ lịch ôn và trường JLPT trong dữ liệu, không hiện JLPT trên giao diện. Cập nhật trạng thái A9.
- **Kiểm tra:** 74/74 test Node; 75 kiểm tra Chromium về A9, chức năng Album cũ, XSS, bàn phím, giảm chuyển động, nội dung dài, kích thước 1440/1280/768/375/320px. Luồng tạo bộ → thêm thẻ → Album sửa → học/chấm/hoàn tác → Trang chủ → Album qua ở 1440 và 375px. Báo cáo và ảnh chụp trình duyệt tại [pages/album/REVIEW.md](../pages/album/REVIEW.md).
- **Quyết định:** chỉ sửa Album và cập nhật tiến độ; giữ bố cục/điều hướng chung, không làm thêm A5, không thêm dependency. Không tạo PR hoặc merge theo yêu cầu người dùng.
- **Tiếp theo:** người dùng duyệt branch và ảnh trước khi cho phép tạo PR; phần chọn màu trong hộp sửa bộ vẫn thuộc A5.
- **Vướng mắc:** không có lỗi JavaScript trong các luồng kiểm tra; Cloud chặn Google Fonts nên ảnh dùng font dự phòng. Server cục bộ trả 404 cho `/favicon.ico` vốn chưa có ở `main`; không sửa phần chung để xử lý hai lỗi tài nguyên này.

## 2026-11-16 — Bỏ JLPT khỏi giao diện, chỉnh việc đợt 2

- **Người làm:** Leader, cùng Claude.
- **Đã xong:**
  - `product.md` › Thẻ tiếng Nhật: thêm câu "giao diện chưa dùng trường `jlpt`" dưới bảng trường; danh sách trang còn phải làm trỏ tới A9, C9, S10, bỏ `jlpt` khỏi dòng Tạo thẻ.
  - `tasks.md`: A9, S10 bỏ badge JLPT, mặt sau gọn lại (nghĩa, kèm cách đọc và ví dụ nếu có); S10 bỏ đường kẻ mảnh; A9 hộp thoại sửa thẻ còn 4 ô; C9 mỗi dòng 4 ô, bỏ nút "Thêm chi tiết" và `CARD_FIELDS`, `JLPT_LEVELS`; L6b chỉ cần A9, C9, S10; viết lại dòng "Đợt 2".
  - Không sửa code. Nhánh `docs/bo-jlpt-giao-dien`.
- **Quyết định:** giao diện không dùng JLPT (ghi ở [product.md](product.md#thẻ-tiếng-nhật)); A9, C9, S10 bỏ badge và ô JLPT, bỏ nút "Thêm chi tiết"; L6b chỉ cần A9, C9, S10.
- **Tiếp theo:** Thành viên 2, 3, 4 làm A9 + A5, C9 + C8, S10; rồi L6b, L7, L9.

## 2026-11-16 — Chuẩn bị đợt 2 (L14, H9)

- **Người làm:** Leader, cùng Claude.
- **Đã xong:**
  - L14: class `color-picker` (6 chấm màu bìa, radio dùng được bằng bàn phím, ô đang chọn có viền và dấu ✓) và kiểu chữ furigana (`rt` 0.5em màu `--text-2`, khối chứa `<ruby>` giãn dòng gấp đôi) trong `styles/components.css`. Thêm mẫu vào styleguide, ghi vào bảng class (conventions.md) và design.md › Thành phần.
  - H9: Trang chủ bỏ `COVER_COLORS`, bìa dùng thẳng `deck.color`; đã so với `?seed`, màu từng bộ trùng Album.
  - Ghi việc đợt 2 vào tasks.md: A9, C9, S10 mới; sửa A5, C2, C3, C8, L6b; ghi chú đầu mục Album, Tạo thẻ, Học rút còn 1 câu.
  - Test: 70/70 (không sửa `core/`). Đã thử trên trình duyệt: ô chọn màu bấm được bằng chuột và mũi tên, có vòng focus; furigana không đè dòng trên, kể cả trên mặt thẻ chữ to; rộng 375px không cuộn ngang; Console không có lỗi.
  - Nhánh `core/chuan-bi-dot-2`.
- **Quyết định:** ghi việc đợt 2 thành A9, C9, S10; L6b làm sau cả 3.
- **Tiếp theo:** Thành viên 2, 3, 4 làm A9 + A5, C9 + C8, S10; rồi L6b, L7, L9.

## 2026-11-14 — Thẻ tiếng Nhật, màu bìa, sửa lỗi core (L6, B1–B5)

- **Người làm:** Leader, cùng Claude.
- **Đã xong:**
  - `Card` đổi sang `term`, `meaning`, `reading`, `example`, `jlpt` (`core/models.js`, `core/repo.js`). `term`, `meaning` bắt buộc; `jlpt` chỉ nhận `''`, `N5`…`N1`.
  - Lớp tương thích tạm `core/card-compat.js`: đọc thẻ cũ `front`/`back` thành `term`/`meaning`, thẻ trả ra kèm `front`/`back`, repo nhận `{ front, back }`, storage chỉ lưu trường mới. Bỏ ở L6b.
  - `core/furigana.js`: `parseFurigana`, `plainFurigana`, `renderFurigana` cho cú pháp `漢字[かんじ]`.
  - Màu bìa: `DECK_COLORS`, `deck.color`; bộ mới lấy màu kế tiếp; bộ cũ đọc ra màu theo thứ tự như các trang tính trước đây.
  - Sửa B1 (`h()` gán `value` sau khi có con), B2 (số thẻ mới mỗi ngày bỏ trống), B3 (`undo()` trả về thẻ), B4 (`Object.hasOwn` trong `storage.get`), B5 (chú thích `fuzzRange`, ranh giới `formatSpan`, ghi lượt ôn trước thẻ). Mỗi lỗi có test, đã chạy thử test đó trên code cũ để chắc nó bắt được lỗi.
  - Dữ liệu mẫu dùng trường mới, mỗi bộ một màu (vẫn là nội dung cũ; bộ tiếng Nhật là L9).
  - Test: 43 → 70.
  - Chỉ sửa chú thích đầu file các trang; giao diện và logic trang giữ nguyên.
  - Đã thử trên Chrome: dữ liệu cũ tạo bằng bản `main` rồi mở nhánh mới (không reset), và dữ liệu mới (`?reset`, `?seed`). Cả 2 trường hợp: 4 trang đủ thẻ và bìa, màu bìa từng bộ giống `main`, học được một lượt, Console không có lỗi. Thẻ vừa chấm được ghi lại chỉ với trường mới.
  - Nhánh `core/the-tieng-nhat`.
- **Quyết định:**
  - Ngoặc furigana rỗng (`漢字[]`) giữ nguyên là chữ, như ngoặc không khớp.
  - `jlpt` phân biệt hoa thường: `n5` là sai.
  - Bộ cũ chưa có màu chỉ được ghi màu khi bộ đó được lưu lại; đọc thôi thì không ghi.
- **Tiếp theo:** Album, Tạo thẻ, Học đổi sang trường mới và `deck.color` (việc cụ thể ở đầu mục từng trang trong [tasks.md](tasks.md)), rồi L6b. Sau đó L7 (bật/tắt furigana) và L9 (dữ liệu mẫu tiếng Nhật).
- **Vướng mắc:**
  - Thông báo lỗi giờ nói "Từ" / "Nghĩa" (VD "Từ không được để trống."), trong khi giao diện Album và Tạo thẻ vẫn ghi "Mặt trước" / "Mặt sau". Hai trang đó tự kiểm tra ô trống trước khi lưu nên hiếm gặp; hết lệch khi các trang đổi sang trường mới.
  - `python -m http.server` không cấm trình duyệt lưu cache. Chuyển nhánh xong mà trang vẫn chạy code cũ thì tải lại bằng Ctrl+F5 (hoặc bật "Disable cache" trong DevTools).

## 2026-11-13 — Đồng bộ màu bìa trang Học (S1)

- Bìa trên màn chọn bộ dùng cùng bảng màu và thứ tự với Album, kể cả bộ chưa có thẻ cần học.

## 2026-11-13 — Thiết kế lại trang Học (S1–S8)

- **Đã xong:** bố cục chọn bộ, phiên ôn và màn hoàn thành. Thêm nút duyệt thẻ trên màn hình và hiển thị vị trí trong hàng đợi.
- **Quyết định:** dùng bảng màu và thành phần của Nhớ Lâu. Giữ lịch ôn, cách tính bộ đếm và phím tắt hiện có.
- **Kiểm tra:** 43 test hiện có đã qua.

## 2026-11-13 — Thao tác với flashcard (S2–S3)

- **Người làm:** AT, cùng Codex.
- **Đã xong:** lật qua lại bằng Space hoặc bấm thẻ, đặt gợi ý phím ở đáy thẻ, hiện bốn nút chấm ngay và hỗ trợ phím mũi tên để xem thẻ trước hoặc sau trong hàng đợi.
- **Kiểm tra:** 37 test qua. Edge xác nhận Space không chấm điểm kể cả khi nút chấm đang được focus, mũi tên dừng ở hai đầu và bốn nút vẫn nằm trên một hàng ở 375 px.

## 2026-11-11 — Deploy lên Vercel

- **Người làm:** Leader, cùng Claude.
- **Đã xong:**
  - Deploy `main` lên Vercel bằng CLI, project `nho-lau`. Link ghi trong README.
  - Thêm `.vercelignore`, để không đưa tài liệu, test, `pages/styleguide/` và `package.json` lên Vercel.
  - Đã thử trên link thật với `?seed`. Cả 4 trang nạp đủ file, không file nào 404, Console không có lỗi.
- **Quyết định:**
  - Deploy trên Vercel thay cho GitHub Pages.
  - Tạm giữ `dev/dev.js` để demo bằng `?seed`.
  - Cách deploy lại và việc dọn code trước khi nộp ghi ở [conventions.md › Trước khi nộp](conventions.md#trước-khi-nộp--deploy).
- **Tiếp theo:** mỗi lần merge vào `main` thì Leader chạy `vercel deploy --prod`. Lúc nộp bài thì dọn code (L5).
- **Vướng mắc:** chưa nối được Vercel với repo GitHub: app Vercel trên GitHub chưa có quyền vào repo. Muốn merge xong tự deploy thì cấp quyền trong GitHub › Settings › Applications › Vercel, rồi chạy `vercel git connect`.

## 2026-11-11 — Tiến độ sau 4 PR đầu tiên (L3)

- **Người làm:** Leader, cùng Claude.
- **Đã xong:**
  - Cả 4 trang đã vào `main`:
    - [PR #1](https://github.com/ngphat516/Nihongo-Flashcard/pull/1): trang Học (S1–S8);
    - [PR #2](https://github.com/ngphat516/Nihongo-Flashcard/pull/2): Album (A1–A8);
    - [PR #3](https://github.com/ngphat516/Nihongo-Flashcard/pull/3): Tạo thẻ (C1–C3);
    - [PR #4](https://github.com/ngphat516/Nihongo-Flashcard/pull/4): Trang chủ (H1–H8).

    Chi tiết từng trang ở các mục bên dưới. Không trang nào còn khung `.todo` hay đoạn `DEMO`.
  - Chạy thử luồng chính sau PR #3, bắt đầu từ `?reset`:
    - tạo bộ 2 thẻ ở Tạo thẻ;
    - bấm "Học ngay", chấm Tốt: bộ đếm thành 1 Mới, 1 Đang học;
    - mở Album: thấy bộ đó với badge Mới và Đang học;
    - từ Album bấm "+ Thêm thẻ": mở đúng bộ ở Tạo thẻ.
  - Sau PR #4, Trang chủ với `?seed` có đủ lời chào, heatmap, bìa các bộ, biểu đồ 6 tháng, không cuộn ngang. Console không có lỗi ở mọi bước. `npm test` 43/43 (thêm 6 test số liệu Trang chủ trong `pages/home/analytics.test.js`).
  - Cập nhật tài liệu theo code đã merge:
    - `tasks.md`:
      - ghi trang nào đã tự tránh lỗi B2, B3, B4;
      - ghi chỗ mỗi trang phải đổi khi làm L6;
      - L13 làm được vì đã có bìa thật.
    - `architecture.md`: thêm file mới của Album và Trang chủ; `npm test` chạy cả test trong `pages/home/`.
    - `product.md`:
      - phần Thẻ tiếng Nhật ghi cả 3 trang phải đổi;
      - bỏ mục "Giao diện mới" khỏi "Đã chốt, chưa làm" vì đã làm xong.
    - `AGENTS.md`: bỏ bước "thay khung `.todo`", vì không trang nào còn khung đó.
- **Quyết định:** chỗ cần đổi ở mỗi trang khi làm L6 ghi ở đầu mục của trang đó trong `tasks.md`, dòng L6 trỏ tới đó, để người làm trang thấy ngay trong phần việc của mình.
- **Tiếp theo:**
  - **L6** (thẻ tiếng Nhật + màu bìa), sửa luôn B1–B5. Đây là việc đang chặn nhiều nhất:
    - L7, L9, C8 và màu bìa của A5 đều cần L6;
    - sau L6, 3 trang Album, Tạo thẻ, Học phải đổi mặt thẻ.
  - **L2:** bật bảo vệ `main`, điền `CODEOWNERS`.
  - **Việc "Nên có" / "Nếu kịp" khác:** C4, C5, C7, L13, L8 (cách lưu lịch ôn chưa chốt).
  - **L5** (kiểm thử cuối) khi các việc trên xong.
- **Vướng mắc:**
  - `main` chưa có bảo vệ. PR #1–#3 do chính người mở PR merge, PR #4 do Leader merge; không PR nào có lượt review trên GitHub (L2, L3).
  - Lỗi B4 vẫn hiện ra ở 2 trang:
    - `pages/album/?deck=constructor` hiện một bộ tên "Object";
    - `pages/study/?deck=constructor` báo "Xong rồi!" thay vì "Không tìm thấy".

## 2026-11-11 — Chuẩn bị PR Trang chủ (H1–H8)

- **Người làm:** Codex, theo yêu cầu người dùng.
- **Đã xong:** cập nhật H1–H8 thành Xong trong `tasks.md`; xóa 3 screenshot tạm trong `pages/home/screenshots/`; cập nhật ghi chú trạng thái trong `pages/home/REVIEW.md`. Giữ nguyên toàn bộ chức năng và thiết kế Home.
- **Kiểm tra:** đã fetch `main` mới nhất (`3be1e12`), nhánh Home đã chứa commit này và không xung đột. Chạy lại `npm test`: 43/43 qua; 84 kiểm tra Chromium qua; kiểm tra bổ sung `?seed` → `?reset` ở 375px qua; `git diff --check` sạch.
- **Tiếp theo:** tạo PR `feature/home` → `main` để nhóm review, không tự merge.
- **Điểm cần nhóm review:** ghi chú giới hạn 53 tuần/12 tháng lịch và Google Fonts trong `pages/home/REVIEW.md` vẫn được giữ nguyên; không thay đổi logic để tự chốt các điểm này.

## 2026-11-11 — Trang Tạo thẻ (C1, C2, C3)

- **Người làm:** Leader, cùng Claude (Leader nhận C1–C3 thay Thành viên 3).
- **Đã xong:**
  - Trang Tạo thẻ thành nơi soạn một bộ thẻ: `pages/create/` tạo bộ mới, `?deck=<id>` sửa bộ đó. Dropdown chọn bộ, ô tên / số thẻ mới mỗi ngày / mô tả, danh sách dòng thẻ 2 mặt có nút xóa, nút "Thêm thẻ", thanh Lưu dính ở đáy (Ctrl+Enter cũng lưu).
  - Kiểm tra mọi ô trước khi ghi; nhắc thẻ trùng mặt trước; hỏi xác nhận khi xóa thẻ đã lưu, khi đổi bộ lúc còn thay đổi chưa lưu, và khi rời trang.
  - Xóa khung `.todo` và đoạn `DEMO` của trang. Tách `card-rows.js` (dòng thẻ) và `feedback.js` (báo lỗi, toast, hộp xác nhận) để `create.js` không quá dài.
  - Đã thử với `?seed`, `?reset`, `?deck=` sai id, ở 375px, 800px, 1280px: không cuộn ngang, Console không có lỗi. Sửa thẻ đã ôn vẫn giữ nguyên tiến độ SM-2. `npm test` 37/37.
  - Nhánh `feature/create`.
- **Quyết định:**
  - Làm bản đơn giản theo yêu cầu của Leader: thẻ giữ 2 mặt `front`/`back`, không chờ L6; khi làm L6 thì đổi ô nhập của mỗi dòng.
  - Một trang vừa tạo vừa sửa bộ, lưu một lần cho cả bộ, thay cho form thêm từng thẻ.
  - Bỏ C6 (danh sách thẻ đã thay nó); C4, C5 để sau; C8 vẫn chờ L6.
  - Cảnh báo thẻ trùng dùng chữ phụ `--text-2` kèm icon `triangle-alert`, không dùng màu vàng, vì `tokens.css` chưa có màu cảnh báo.
  - Trang chỉ đổi tham số `deck` trên URL, giữ nguyên tham số khác, để `?seed` / `?reset` của `dev.js` vẫn chạy.
- **Tiếp theo:** L6 (thẻ tiếng Nhật), rồi đổi ô nhập của trang Tạo thẻ.

## 2026-11-11 — Trang Album (A1–A8)

- **Người làm:** Thành viên 2, cùng Claude.
- **Đã xong:**
  - A1: lưới bìa `cover`; cả bìa là một link tới `routes.album(id)`. Màu bìa lấy theo thứ tự `i % 6` vì chưa có L6.
  - A2, A3: trang chi tiết bộ gồm tên, mô tả, bộ đếm Mới / Đang học / Đến hạn hôm nay, nút Học ngay, Thêm thẻ, Sửa bộ, Xóa bộ; lưới thẻ lật (`flashcard`) kèm badge trạng thái và hạn ôn.
  - A4: sửa thẻ trong dialog (Ctrl+Enter để lưu, lỗi nhập liệu hiện trong dialog), xóa thẻ có hỏi xác nhận.
  - A5: sửa tên, mô tả, thẻ mới mỗi ngày; xóa bộ có hỏi xác nhận, xóa xong về lưới. Chưa có chọn màu bìa (cần L6).
  - A6: tìm theo nội dung 2 mặt, gõ không dấu vẫn ra; lọc bằng `chip` (chip "Đang học" gồm cả thẻ Học lại); sắp xếp mới tạo trước / sắp đến hạn trước (thẻ mới xếp cuối).
  - A7: nút "Học lại từ đầu" (có hỏi xác nhận) ở thẻ đã học.
  - A8: chưa có bộ nào, `?deck=` sai id, bộ chưa có thẻ.
  - Chia file: `album.js` (điểm vào + lưới), `detail.js` (chi tiết bộ), `ui.js` (dialog, toast).
  - Đã thử với `?seed` và `?reset` ở 1280px và 375px: không cuộn ngang, Console không có lỗi. Kịch bản chạy thử bấm qua cả A1–A8 trên Chrome.
  - Nhánh `feature/album`.
- **Quyết định:**
  - Mỗi màn hình một nút chính: lưới bộ là "+ Tạo bộ mới"; chi tiết bộ là "Học ngay", hoặc "+ Thêm thẻ đầu tiên" khi bộ chưa có thẻ.
  - Ô thẻ mới mỗi ngày để trống thì trang báo lỗi, không gửi xuống `updateDeck` (tránh lỗi B2).
  - Xóa thẻ và "Học lại từ đầu" đều hỏi xác nhận, vì không hoàn tác được.
- **Tiếp theo:** khi L6 xong: đổi `COVER_COLORS[i % 6]` trong `album.js` sang `deck.color`, sửa `cardFront` / `cardBack` ở đầu `detail.js` theo trường mới (gắn `lang="ja"`), thêm chọn màu bìa vào dialog sửa bộ (A5).
- **Vướng mắc:** `?deck=constructor` vẫn hiện như một bộ có thật cho tới khi Leader sửa lỗi B4 trong `core/storage.js`.

## 2026-11-11 — Trang Học (S1–S8)

- **Người làm:** AT, cùng Codex.
- **Đã xong:** luồng chọn bộ, lật thẻ, chấm điểm, xem kết quả và tiếp tục khi thẻ đến hạn. Hoàn tác hiện lại đúng thẻ vừa chấm kể cả khi thẻ khác đến hạn. Dùng các thành phần chung của styleguide, bỏ nút phát âm theo phạm vi sản phẩm. Bản triển khai ở nhánh `feature/study`.
- **Kiểm tra:** 37 test qua. Đã thử trên Edge với `?seed`, `?reset`, mã bộ sai, phím tắt, hoàn tác, tự tiếp tục, chế độ giảm chuyển động và màn hình 375px.
- **Tiếp theo:** mở PR cho Leader review. Khi L6 xong, cập nhật mặt thẻ theo cấu trúc thẻ tiếng Nhật.

## 2026-11-11 — Cột điều hướng và khung Trang chủ (L12)

- **Người làm:** Leader, cùng Claude.
- **Đã xong:**
  - Thay header ngang bằng cột điều hướng ở cả 4 trang và styleguide, làm giống cột icon trong mẫu: cột nổi bo góc, logo, 4 nút tròn chỉ có icon Lucide (rê chuột hoặc Tab tới thì hiện tên), nút furigana ở đáy. Dưới 768px thành thanh tab 5 ô ở đáy, có nhãn chữ.
  - Thêm biến `--rail-width`, `--tabbar-height`; đổi `--z-header` thành `--z-nav`; toast nằm giữa phần nội dung và nổi trên thanh tab.
  - Mục đang chọn (cột điều hướng và chip) đổi từ nền xanh nhạt sang xanh matcha đậm, chữ trắng.
  - Dựng khung 2 cột Trang chủ (`pages/home/home.css`), mỗi khối là một ô `.todo` ghi mã task: `#greeting` (H7), `#summary` (H2), `#today` (H3, H4), `#heatmap` (H1, H5), `#chart` (H8). Trang khác giữ nguyên ô `.todo`.
  - Đã thử ở 375px, 800px, 1024px, 1280px: không cuộn ngang, Console không có lỗi.
  - Nhánh `styles/giao-dien-matcha`.
- **Quyết định:**
  - Làm thẳng, không qua prototype. Đã chốt: cột rộng 72px, thanh tab cao 64px, panel phải 300px, logo chữ 覚.
  - Leader xem bản đầu, thấy chưa giống mẫu, nên chốt lại 2 quyết định của vòng hỏi đáp trước:
    - Bỏ nhãn chữ trên cột ở màn hình rộng, thay bằng tooltip; điện thoại vẫn có nhãn.
    - Mục đang chọn dùng xanh matcha đậm thay cho xanh nhạt (mẫu dùng màu đen).
  - Trang chủ chia 2 cột từ 1024px chứ không phải 768px, vì ở 768px cột chính còn quá hẹp ([design.md › Trang chủ](design.md#trang-chủ)).
  - Bo góc, bóng, cỡ tiêu đề để sau, thành task L13.
  - H7 còn lời chào và chuỗi ngày, vì khung đã làm trong L12.
- **Tiếp theo:**
  - Thành viên làm trang của mình trên khung mới: thay ô `.todo` và đoạn `DEMO`.
  - L6 (thẻ tiếng Nhật + `Deck.color`), rồi L7 nối nút furigana.

## 2026-11-11 — Màu và chữ mới, tài liệu giao diện (L11)

- **Người làm:** Leader, cùng Claude.
- **Đã xong:**
  - Học theo một mẫu dashboard giáo dục, chốt qua 2 vòng hỏi đáp.
  - Đổi `styles/tokens.css`: màu chính xanh matcha `#527a2e`, nền xám ánh lục, heatmap xanh, 6 màu bìa pastel, biến cho biểu đồ.
  - Font Plus Jakarta Sans + Noto Sans JP; chữ có `lang="ja"` dùng Noto Sans JP.
  - Thêm class `chip` và `cover` vào `components.css`, cập nhật styleguide.
  - Viết `docs/design.md`; sửa product, conventions, tasks, `AGENTS.md`.
  - Nhánh `styles/giao-dien-matcha`.
- **Quyết định:** chi tiết ở [design.md](design.md) và [product.md](product.md#đã-chốt-chưa-làm).
  - Bố cục: cột icon bên trái (điện thoại: thanh tab ở đáy); Trang chủ 2 cột với panel phải gồm lời chào, chuỗi ngày, 4 ô thống kê, biểu đồ lượt ôn 6 tháng.
  - Màu chính chỉ cho hành động; màu trạng thái và chấm điểm giữ theo Anki.
  - Bộ thẻ có màu bìa (`deck.color`, làm cùng L6).
  - Nút furigana ở cuối cột điều hướng, trình duyệt nhớ lựa chọn.
  - Bỏ các phần xã hội của mẫu (bạn bè, đánh giá sao, xếp hạng…).
  - Icon dùng Lucide, chép SVG vào HTML.
  - Thêm task L11, L12, H7, H8, C8.
- **Tiếp theo:** L6 (thẻ tiếng Nhật + `Deck.color`); L12 làm prototype trên `prototype/giao-dien-moi` để chốt bo góc, bóng, cỡ tiêu đề, rồi làm cột điều hướng.

## 2026-11-11 — Bộ tài liệu `docs/` (L10)

- **Người làm:** Leader, cùng Claude.
- **Đã xong:** chuyển `TASKS.md` thành `docs/tasks.md` (thêm cột trạng thái, task L6–L10, bảng lỗi B1–B5, bỏ S9); viết `docs/product.md`, `docs/architecture.md`, `docs/conventions.md` và file này; thêm `AGENTS.md` + `CLAUDE.md` cho agent; rút gọn `README.md`. Nhánh `docs/tai-lieu-du-an`.
- **Quyết định:** tài liệu để trong `docs/`, viết bằng tiếng Việt. Mỗi thông tin chỉ ghi ở một file (bảng ở [conventions.md › Tài liệu](conventions.md#tài-liệu)). Mỗi PR cập nhật `tasks.md` và thêm một mục vào nhật ký này.
- **Tiếp theo:** L6 thẻ tiếng Nhật, sửa luôn B1–B5; L2 bật bảo vệ nhánh `main`, điền `CODEOWNERS`.
- **Vướng mắc:** đề bài và hạn nộp chưa có trong repo. Các câu hỏi còn mở ghi ở [product.md › Chưa chốt](product.md#chưa-chốt).

## 2026-11-10 — Hệ thống giao diện (L4)

- **Người làm:** Leader, cùng Claude.
- **Đã xong:** `styles/tokens.css`, `styles/components.css`, font Noto Sans JP, trang `pages/styleguide/`, đổi tên class sang kiểu Bootstrap ở 4 trang. Commit `e80b4a2`, 37/37 test xanh.
- **Quyết định:**
  - Giao diện: chỉ CSS tự viết (bỏ ý dùng Tailwind và thư viện Bootstrap), không có JS cho component, bỏ dark mode, tên class kiểu Bootstrap, `base.css` `@import` 2 file mới nên 4 file HTML không phải sửa. Styleguide là công cụ dev, xóa trước khi nộp.
  - Sản phẩm: app chỉ để học tiếng Nhật, có furigana, không có âm thanh. Thẻ sẽ có trường riêng (`term`, `meaning`, …). Furigana là nút bật/tắt chung. Đổi được chiều học. Giai đoạn sau có thêm dạng bài tập, ghi chú. Chi tiết ở [product.md](product.md).
- **Vướng mắc:** Claude trên web không push được (Claude GitHub App chưa được cài cho tài khoản sở hữu repo). Commit được chuyển về máy Leader bằng git bundle rồi push thẳng lên `main`, không qua PR.

## 2026-11-10 — Review `core/` và chốt cấu trúc code

- **Người làm:** Leader, cùng Claude.
- **Đã xong:** review toàn bộ `core/`, 4 trang, CSS và test. 37/37 test xanh, kể cả khi chạy ở 5 múi giờ khác nhau; SM-2 khớp với Anki. Tìm ra 4 lỗi và vài điểm nhỏ, ghi ở [tasks.md › Lỗi đã biết](tasks.md#lỗi-đã-biết-trong-core) (B1–B5).
- **Quyết định:**
  - 4 lỗi để sau, sửa cùng lúc khi làm lại `core/` cho thẻ tiếng Nhật.
  - Cấu trúc: giữ nhiều trang HTML (MPA), header viết sẵn trong 4 file HTML, truyền dữ liệu giữa trang chỉ qua tham số URL trong `routes`, trang import mọi module `core/` trừ `storage.js` và `seed.js`, file trang dài quá khoảng 300 dòng thì tách module. Ghi ở [conventions.md](conventions.md#code).

## 2026-11-10 — Codebase nền (L1)

- **Người làm:** Leader.
- **Đã xong:** tạo repo; cấu trúc mỗi trang một folder; `core/` (lưu localStorage, SM-2, chọn thẻ, dữ liệu mẫu) với 37 test; CSS chung; khung 4 trang có sẵn khung `.todo` và đoạn `DEMO`; `TASKS.md` phân việc. Commit `41b70c6`.

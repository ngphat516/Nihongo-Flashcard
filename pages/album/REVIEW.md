# Kiểm tra Album — A9

Nhánh `feature/album-a9`, bắt đầu từ `main` `df8aaeb` ngày 16/11/2026. Đối chiếu A9 trong `docs/tasks.md` sau quyết định bỏ JLPT khỏi giao diện. Phần chọn màu A5 được bổ sung sau A9; xem mục bên dưới.

## Yêu cầu và kết quả

| Yêu cầu A9 | Triển khai | Kiểm chứng |
|---|---|---|
| Từ chữ lớn, có furigana | `cards.js`: `renderFurigana(term)`, dùng cỡ `--text-card` | Ruby và cách đọc đúng; thẻ kana vẫn đọc bình thường |
| Mặt sau có nghĩa, cách đọc, ví dụ nếu có | Nghĩa nổi bật; cách đọc nhỏ hơn; ví dụ có `renderFurigana()` | Trường trống không tạo khối; không hiện JLPT |
| Tìm từ, nghĩa, cách đọc, ví dụ | `plainFurigana()` trên từ/ví dụ, chuẩn hóa chữ và bỏ dấu Latin | Tìm `約束を守る`, `友達と約束`, `GIU LOI HUA`, kana đều đúng; không nhầm `か` với `が` hoặc `は` với `ぱ` |
| Xác nhận xóa dùng chữ thuần | `plainFurigana(term)` trước khi rút gọn | Dialog hiện `約束`, không hiện `[やくそく]`; hủy không xóa |
| Sửa đủ 4 ô | Từ, Nghĩa, Cách đọc, Ví dụ; gợi ý cú pháp dưới Từ | Điền sẵn và lưu đủ 4 trường; xóa được trường tùy chọn; lỗi repo hiện trong dialog |
| Giữ tiến độ khi sửa | Gửi 4 trường nội dung qua `updateCard()` | Giữ `state`, `due`, `interval`, `ease`, `step`, `reps`, `lapses`, `lastReview`, `createdAt`, JLPT và lịch sử ôn |
| Bìa theo dữ liệu | Bỏ `COVER_COLORS`, dùng `deck.color` | Bộ đầu màu tím, bộ sau màu trời vẫn đúng; trùng màu Trang chủ |
| Responsive và accessibility | Class/token chung, `lang="ja"`, mặt ẩn có `aria-hidden`, trả focus sau lưu | Enter/Space lật, Esc hủy, Ctrl+Enter lưu; giảm chuyển động; dialog cuộn được; không tràn ngang kể cả cụm ruby dài gần 2000 ký tự |

## Kiểm thử

- `npm test`: **74/74 qua**, gồm 70 test có sẵn và 4 test tìm kiếm của Album.
- Chromium/Playwright: **75 kiểm tra qua**; bề rộng 1440, 1280, 768, 375 và 320px.
- Kiểm tra lại `?seed` (3 bộ, 42 thẻ), `?reset`, id sai, bộ trống, tìm không có kết quả; lọc Mới/Đang học/Ôn tập, sắp hạn; sửa/xóa bộ, xóa thẻ, học lại từ đầu và liên kết Học/Thêm thẻ.
- Luồng qua cả 4 trang ở **1440px và 375px**: tạo bộ/thẻ bằng giao diện → Album sửa thêm cách đọc/ví dụ → Học (Space, 4, Z, 4) → Trang chủ (1 lượt ôn, 1 ngày, 1 thẻ, heatmap) → Album. Nội dung A9 và tiến độ vẫn đúng.
- XSS hiển thị thành chữ, không tạo `img`/`script` từ dữ liệu. Không sửa `core/`, `styles/`, trang khác hoặc cột điều hướng. Không dùng trường `front`/`back` để đọc/ghi thẻ trong Album.
- Đã mở kiểm tra trực tiếp các PNG bên dưới. Không phát hiện lỗi JavaScript. **Giới hạn môi trường:** Google Fonts bị Cloud chặn (`ERR_TUNNEL_CONNECTION_FAILED`); ảnh dùng font dự phòng đã quy định. `/favicon.ico` trả 404 vì `main` chưa có file này. Chưa kiểm tra trực tiếp trên thiết bị Android thật.

## Ảnh chụp trình duyệt

Dữ liệu tiếng Nhật được tạo qua `core/repo.js` trong browser context riêng; không thêm vào dữ liệu mẫu chung hoặc code ứng dụng. Các ảnh là PNG chụp Chromium, không phải ảnh AI. Ảnh mobile toàn trang dùng bề rộng 375px và mở rộng chiều cao viewport để thanh tab không che nội dung giữa ảnh; kiểm thử tương tác dùng viewport điện thoại 375×812 và 375×900 riêng.

- [Desktop 1440px](screenshots/album-a9-1440.png)
- [Desktop 1280px](screenshots/album-a9-1280.png)
- [Mobile 375px — toàn trang](screenshots/album-a9-375.png)
- [Hộp sửa — 375×812px](screenshots/album-a9-edit-375.png)
- [Màu bìa theo bộ — 1440px](screenshots/album-a9-covers-1440.png)

## Tham khảo UI

- [Thảo luận Things 3 trên Reddit](https://www.reddit.com/r/thingsapp/comments/1sx6hxi/things_3_is_beautiful_but_what_do_you_wish_it_did/): người dùng khen sự đơn giản, đồng thời phàn nàn việc cắt nội dung dài. Áp dụng cho A9: phân cấp từ/nghĩa rõ và cho văn bản xuống dòng, không cắt ví dụ.
- [Các ứng dụng được yêu thích trên r/UXDesign](https://www.reddit.com/r/UXDesign/comments/1n20mwr/which_apps_do_you_actually_enjoy_using_and_which/): tham khảo ý kiến về trải nghiệm gọn, tìm/lọc dễ dùng, tránh giao diện nhiều nội dung thừa.
- [Things — trang sản phẩm chính thức](https://culturedcode.com/things/): tham khảo sự tiết chế trong trình bày. Màu, font, bo góc, component và điều hướng của Album vẫn theo tài liệu Nhớ Lâu; không sao chép giao diện sản phẩm này.


## Bổ sung A5 — chọn màu bìa

Hộp sửa bộ dùng `color-picker` chung, 6 màu theo đúng thứ tự design system. `openForm()` gán `RadioNodeList.value` bằng màu hiện tại; `FormData` gửi màu đã chọn qua `updateDeck()`. Không sửa CSS/core hoặc chức năng A9.

Đã kiểm tra ở 1440px và 375px: chọn sẵn, mũi tên đổi màu, lưu và mở lại, hủy không lưu. Album và Trang chủ hiện màu Trời sau khi đổi từ Tím. **Study chưa đạt:** vẫn dùng màu theo vị trí; cần S10 chuyển sang `deck.color`. Không đánh dấu A5 hoàn tất xuyên cả ba trang.

Ảnh kiểm thử: [hộp chọn desktop](screenshots/album-a5-picker-1440.png), [hộp chọn mobile](screenshots/album-a5-picker-375.png), [Album](screenshots/album-a5-album-1440.png), [Trang chủ](screenshots/album-a5-home-1440.png), [Study còn màu cũ](screenshots/album-a5-study-1440.png).

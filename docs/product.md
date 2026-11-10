# Sản phẩm — Nhớ Lâu

Tài liệu này nói app làm gì và cho ai. Cách code bên trong xem [architecture.md](architecture.md).

## Mục tiêu

**Nhớ Lâu** là web app giúp người Việt **học tiếng Nhật**: từ vựng, kanji, cách đọc. Người học ôn bằng flashcard; lịch ôn do thuật toán lặp lại ngắt quãng **SM-2 kiểu Anki** tính, để mỗi thẻ quay lại đúng lúc sắp quên.

- Chỉ dành cho tiếng Nhật, không phải app flashcard cho mọi môn.
- Chữ trên giao diện bằng tiếng Việt. Giao diện trông thế nào (màu, chữ, bố cục): [design.md](design.md).
- Không có âm thanh: không phát âm, không ghi âm.
- Dữ liệu nằm trong trình duyệt của người học (localStorage). Chưa có tài khoản, chưa đồng bộ giữa các máy.

Đây là đồ án nhóm 4 người (1 Leader + 3 thành viên). Đề bài và hạn nộp từng giai đoạn chưa được ghi vào repo.

## Giai đoạn

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Flashcard: tạo bộ, thêm thẻ, học theo SM-2, xem tiến độ (heatmap) | Đang làm, xem [tasks.md](tasks.md) |
| 2 | Các dạng bài tập ngoài flashcard, ghi chú, … | Mới là ý tưởng, chưa chốt |

## Từ ngữ của dự án

Dùng đúng các từ này trong giao diện, code và tài liệu.

| Từ | Trong code | Nghĩa |
|---|---|---|
| **Bộ thẻ** | `Deck` | Một nhóm thẻ, VD "JLPT N5 – Từ vựng" |
| **Bìa** | class `cover` | Khối màu pastel đại diện cho một bộ thẻ trên Trang chủ và Album |
| **Màu bìa** | `deck.color` | Một trong 6 màu pastel của bìa: `pink`, `peach`, `yellow`, `green`, `sky`, `lavender` |
| **Thẻ** | `Card` | Một mục cần nhớ. Hiện có 2 mặt `front` / `back`; sẽ đổi sang thẻ tiếng Nhật (xem bên dưới) |
| **Mặt trước / mặt sau** | `front` / `back` | Câu hỏi / đáp án |
| **Trạng thái thẻ** | `card.state` | **Mới** `new` · **Đang học** `learning` · **Học lại** `relearning` (quên khi đang ôn) · **Ôn tập** `review` |
| **Chấm điểm** | `rating` 1–4 | Sau khi lật thẻ, người học tự chấm **Lại** / **Khó** / **Tốt** / **Dễ** |
| **Lượt ôn** | `ReviewLog` | Một lần chấm điểm. Dùng cho heatmap, thống kê, hoàn tác |
| **Đến hạn** | `card.due` | Thời điểm thẻ cần được ôn lại |
| **Ngày học** | `dayKey()` | Một ngày tính từ **4h sáng** tới 4h sáng hôm sau, để học khuya vẫn tính là hôm trước |
| **Thẻ mới mỗi ngày** | `deck.newPerDay` | Số thẻ mới tối đa được học mỗi ngày trong một bộ, mặc định 20 |
| **Chuỗi ngày học** | — | Số ngày học liên tiếp có ít nhất một lượt ôn, tính tới hôm nay hoặc hôm qua |
| **Tỉ lệ nhớ** | — | % lượt ôn thẻ Ôn tập trong 30 ngày mà không bấm "Lại" |
| **Furigana** | — | Chữ kana nhỏ ghi cách đọc phía trên kanji, VD 食(た)べる |
| **Chiều học** | — | Nhật → Việt (thấy chữ Nhật, nhớ nghĩa) hoặc Việt → Nhật |
| **JLPT** | — | Cấp độ năng lực tiếng Nhật, N5 (dễ nhất) tới N1 |

## Tính năng giai đoạn 1

App có 4 trang. Danh sách việc chi tiết và tiêu chí xong nằm trong [tasks.md](tasks.md).

| Trang | Người học làm gì |
|---|---|
| **Trang chủ** | Xem lời chào và chuỗi ngày học, thẻ tóm tắt (ôn hôm nay, chuỗi ngày, tổng thẻ, tỉ lệ nhớ), bìa các bộ cần học hôm nay, heatmap 12 tháng, biểu đồ lượt ôn 6 tháng |
| **Album** | Xem lưới bìa các bộ; vào một bộ để xem, tìm, lọc, sửa, xóa thẻ; xem trạng thái và hạn ôn từng thẻ |
| **Tạo thẻ** | Tạo bộ mới hoặc mở một bộ có sẵn; thêm, sửa, xóa thẻ rồi lưu một lần |
| **Học** | Học một bộ: xem mặt trước → lật → chấm Lại/Khó/Tốt/Dễ; bộ đếm Mới/Đang học/Đến hạn; hoàn tác |

## Đã chốt, chưa làm

Các quyết định này đã chốt nhưng code chưa có. Ai làm thì cập nhật [tasks.md](tasks.md) và chuyển mục ra khỏi đây khi xong.

### Thẻ tiếng Nhật

Thay 2 mặt `front` / `back` bằng các trường riêng, để sau này làm được bài tập trắc nghiệm, gõ cách đọc:

| Trường | Bắt buộc | Ví dụ |
|---|---|---|
| `term` | Có | `食[た]べる` |
| `meaning` | Có | ăn |
| `reading` | Không (từ chỉ có kana thì bỏ trống) | たべる |
| `example` | Không | `毎朝[まいあさ]パンを食[た]べる。` |
| `jlpt` | Không | N5 … N1 |

- **Cú pháp furigana:** viết `漢字[かんじ]` trong `term` và `example`, app hiển thị thành `<ruby>`.
- Đổi cấu trúc này phải sửa `core/`, dữ liệu mẫu, test và cả 3 trang đang dùng thẻ 2 mặt (Album, Tạo thẻ, Học). Danh sách chỗ cần sửa: [tasks.md › L6](tasks.md#leader-nền-chung).

### Màu bìa bộ thẻ

- Mỗi bộ có một màu bìa, chọn trong 6 màu pastel. Danh sách màu: [design.md › Màu bìa](design.md#màu-bìa-bộ-thẻ).
- Người học chọn màu khi tạo bộ và đổi được khi sửa bộ.
- Bộ mới được chọn sẵn màu kế tiếp trong danh sách, để các bộ đứng cạnh nhau khác màu.
- `deck.color` lưu tên màu (VD `'pink'`), không lưu mã màu, để chỉnh bảng màu sau này mà không phải chuyển đổi dữ liệu.

### Furigana bật/tắt

- Một nút bật/tắt furigana chung cho cả web. Khi bật, mọi chỗ có furigana đều hiện; khi tắt thì chỉ còn chữ.
- **Vị trí:** ở cuối cột điều hướng; trên điện thoại là ô cuối của thanh tab ở đáy ([design.md › Bố cục khung](design.md#bố-cục-khung)).
- Trình duyệt nhớ lựa chọn cho lần mở sau.

### Giao diện mới

Header ngang đổi thành cột điều hướng bên trái, Trang chủ chia 2 cột, có thêm biểu đồ lượt ôn theo tháng. Chi tiết: [design.md](design.md). Đã làm: màu và chữ mới (L11), cột điều hướng và khung 2 cột của Trang chủ (L12). Còn: nội dung Trang chủ (H7, H8).

### Đổi chiều học

Người học đổi được giữa Nhật → Việt và Việt → Nhật.

### Dữ liệu mẫu tiếng Nhật

Dữ liệu mẫu (`?seed`) hiện là từ vựng IT, Cơ sở dữ liệu, Lịch sử Việt Nam. Sẽ thay bằng bộ tiếng Nhật, chưa làm.

## Chưa chốt

Hỏi Leader trước khi làm các phần này.

- **Chiều học:** đổi theo cả bộ thẻ hay theo từng buổi học? Hai chiều dùng chung một lịch ôn hay mỗi chiều một lịch riêng?
- **Giai đoạn 2:** dạng bài tập nào (trắc nghiệm, gõ cách đọc, nối cặp, điền chỗ trống), kết quả có tính vào lịch ôn SM-2 không; "ghi chú" gồm những gì.
- **Backend:** có làm không, làm ở giai đoạn nào. Kế hoạch kỹ thuật nếu làm: [architecture.md › Thêm backend](architecture.md#thêm-backend-sau-này).

## Không làm

- Âm thanh, phát âm (task S9 cũ đã bỏ).
- Dark mode.
- Tính năng xã hội và mua bán: bạn bè, ảnh đại diện, hồ sơ, đánh giá sao, bảng xếp hạng, giỏ hàng, chuông thông báo. Mẫu giao diện tham khảo có các phần này, nhưng Nhớ Lâu là app học một mình, chưa có tài khoản.

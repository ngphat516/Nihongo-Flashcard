# Sản phẩm — Nhớ Lâu

Tài liệu này nói app làm gì và cho ai. Cách code bên trong xem [architecture.md](architecture.md).

## Mục tiêu

**Nhớ Lâu** là web app giúp người Việt **học tiếng Nhật**: từ vựng, kanji, cách đọc. Người học ôn bằng flashcard; lịch ôn do thuật toán lặp lại ngắt quãng **SM-2 kiểu Anki** tính, để mỗi thẻ quay lại đúng lúc sắp quên.

- Chỉ dành cho tiếng Nhật, không phải app flashcard cho mọi môn.
- Chữ trên giao diện bằng tiếng Việt. Font Noto Sans JP hiển thị được cả kana/kanji lẫn tiếng Việt có dấu.
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
| **Bộ thẻ** | `Deck` | Một nhóm thẻ, VD "JLPT N5 – Từ vựng". Trang Album hiện mỗi bộ như một bìa album |
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
| **Trang chủ** | Xem heatmap 12 tháng, thẻ tóm tắt (ôn hôm nay, chuỗi ngày, tổng thẻ, tỉ lệ nhớ), danh sách bộ cần học hôm nay |
| **Album** | Xem lưới các bộ; vào một bộ để xem, tìm, sửa, xóa thẻ; xem trạng thái và hạn ôn từng thẻ |
| **Tạo thẻ** | Tạo bộ mới, thêm từng thẻ hoặc dán nhiều thẻ một lần |
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
- Đổi cấu trúc này phải sửa `core/models.js`, `core/repo.js`, dữ liệu mẫu và test, nên phải làm xong trước khi trang Tạo thẻ và Album làm phần nhập/hiện thẻ.

### Furigana bật/tắt

Một nút bật/tắt furigana chung cho cả web. Khi bật, mọi chỗ có furigana đều hiện; khi tắt thì chỉ còn chữ.

### Đổi chiều học

Người học đổi được giữa Nhật → Việt và Việt → Nhật.

### Dữ liệu mẫu tiếng Nhật

Dữ liệu mẫu (`?seed`) hiện là từ vựng IT, Cơ sở dữ liệu, Lịch sử Việt Nam. Sẽ thay bằng bộ tiếng Nhật, chưa làm.

## Chưa chốt

Hỏi Leader trước khi làm các phần này.

- **Chiều học:** đổi theo cả bộ thẻ hay theo từng buổi học? Hai chiều dùng chung một lịch ôn hay mỗi chiều một lịch riêng?
- **Nút furigana:** đặt ở header (áp dụng mọi trang) và trình duyệt nhớ lựa chọn cho lần sau?
- **Giai đoạn 2:** dạng bài tập nào (trắc nghiệm, gõ cách đọc, nối cặp, điền chỗ trống), kết quả có tính vào lịch ôn SM-2 không; "ghi chú" gồm những gì.
- **Backend:** có làm không, làm ở giai đoạn nào. Kế hoạch kỹ thuật nếu làm: [architecture.md › Thêm backend](architecture.md#thêm-backend-sau-này).

## Không làm

- Âm thanh, phát âm (task S9 cũ đã bỏ).
- Dark mode.

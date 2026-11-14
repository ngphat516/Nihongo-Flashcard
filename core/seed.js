/**
 * Dữ liệu mẫu cho lúc phát triển: 3 bộ thẻ (mỗi bộ một màu bìa) + giả lập khoảng 4 tháng ôn tập bằng chính thuật toán SM-2,
 * để trang chủ có heatmap, album có thẻ ở đủ trạng thái, trang học có thẻ đến hạn.
 * Gọi qua dev.js (?seed trên URL hoặc dev.seed() trong Console).
 */
import * as storage from './storage.js';
import { COLLECTIONS, DECK_COLORS, makeCard, makeDeck, makeReviewLog } from './models.js';
import { schedule } from './scheduler.js';
import { HOUR, addDays, dayStart } from './date.js';
import { isLearning } from './queue.js';

const SAMPLE_DECKS = [
  {
    name: 'Tiếng Anh – Từ vựng IT',
    description: 'Từ vựng chuyên ngành hay gặp khi đọc tài liệu',
    startDaysAgo: 120, // học từ 4 tháng trước → heatmap dài, nhiều thẻ đã thuộc
    cards: [
      ['algorithm', 'thuật toán'],
      ['bandwidth', 'băng thông'],
      ['compiler', 'trình biên dịch'],
      ['database', 'cơ sở dữ liệu'],
      ['debug', 'gỡ lỗi'],
      ['deploy', 'triển khai (đưa lên môi trường chạy thật)'],
      ['encryption', 'mã hóa'],
      ['framework', 'khung phát triển'],
      ['interface', 'giao diện'],
      ['latency', 'độ trễ'],
      ['repository', 'kho mã nguồn'],
      ['request', 'yêu cầu (gửi lên máy chủ)'],
      ['response', 'phản hồi (máy chủ trả về)'],
      ['scalable', 'có khả năng mở rộng'],
      ['server', 'máy chủ'],
      ['syntax', 'cú pháp'],
      ['variable', 'biến'],
      ['inheritance', 'kế thừa'],
      ['authentication', 'xác thực (bạn là ai)'],
      ['authorization', 'phân quyền (bạn được làm gì)'],
      ['cache', 'bộ nhớ đệm'],
      ['dependency', 'thư viện phụ thuộc'],
    ],
  },
  {
    name: 'Cơ sở dữ liệu',
    description: 'Ôn thi giữa kỳ',
    startDaysAgo: 21, // mới học 3 tuần…
    pausedDays: 4, // …rồi bỏ ôn 4 hôm gần đây → hôm nay có nhiều thẻ tồn đọng cho trang Học
    cards: [
      ['Khóa chính (primary key) là gì?', 'Thuộc tính (hoặc tập thuộc tính) xác định duy nhất mỗi dòng; không được NULL.'],
      ['Khóa ngoại (foreign key) là gì?', 'Thuộc tính tham chiếu tới khóa chính của bảng khác, đảm bảo toàn vẹn tham chiếu.'],
      ['Dạng chuẩn 1NF', 'Mọi thuộc tính chỉ chứa giá trị nguyên tố (không đa trị, không lặp nhóm).'],
      ['Dạng chuẩn 2NF', 'Đạt 1NF và mọi thuộc tính không khóa phụ thuộc ĐẦY ĐỦ vào khóa chính.'],
      ['Dạng chuẩn 3NF', 'Đạt 2NF và không có thuộc tính không khóa nào phụ thuộc BẮC CẦU vào khóa chính.'],
      ['ACID gồm những gì?', 'Atomicity, Consistency, Isolation, Durability.'],
      ['INNER JOIN trả về gì?', 'Chỉ những dòng khớp điều kiện ở cả hai bảng.'],
      ['LEFT JOIN trả về gì?', 'Mọi dòng của bảng trái, kèm dòng khớp ở bảng phải (không khớp thì NULL).'],
      ['Index dùng để làm gì?', 'Tăng tốc tìm kiếm; đổi lại tốn thêm bộ nhớ và làm chậm thao tác ghi.'],
      ['Lọc sau khi GROUP BY dùng mệnh đề nào?', 'HAVING'],
      ['View là gì?', 'Bảng ảo được định nghĩa bằng một câu truy vấn.'],
      ['Xóa hết dữ liệu nhưng giữ cấu trúc bảng?', 'TRUNCATE TABLE'],
    ],
  },
  {
    name: 'Lịch sử Việt Nam',
    description: 'Mốc thời gian quan trọng — bộ này để nguyên chưa học',
    startDaysAgo: 0, // chưa học → toàn thẻ mới
    cards: [
      ['Ngô Quyền đánh thắng quân Nam Hán trên sông Bạch Đằng năm nào?', '938'],
      ['Lý Thái Tổ dời đô về Thăng Long năm nào?', '1010'],
      ['Ai lãnh đạo khởi nghĩa Lam Sơn?', 'Lê Lợi'],
      ['Bộ luật Hồng Đức ra đời dưới triều vua nào?', 'Lê Thánh Tông'],
      ['Quang Trung đại phá quân Thanh vào năm nào?', 'Xuân Kỷ Dậu 1789'],
      ['Ngày Quốc khánh nước Việt Nam?', '2/9/1945'],
      ['Chiến dịch Điện Biên Phủ kết thúc thắng lợi ngày nào?', '7/5/1954'],
      ['Hiệp định Genève về Đông Dương được ký năm nào?', '1954'],
    ],
  },
];

/**
 * Xóa dữ liệu hiện có rồi tạo dữ liệu mẫu.
 * @returns {Promise<{ decks: number, cards: number, reviewLogs: number }>}
 */
export async function seedDemoData({ days = 120, now = Date.now(), random = Math.random } = {}) {
  await storage.clearAll();

  const firstDay = addDays(dayStart(now), -days);
  const decks = [];
  const cards = [];
  SAMPLE_DECKS.forEach((sample, i) => {
    const deck = makeDeck({ ...sample, color: DECK_COLORS[i % DECK_COLORS.length] }, firstDay + i);
    decks.push(deck);
    // Nội dung mẫu vẫn là 2 mặt (câu hỏi, đáp án) → term, meaning. Đổi sang bộ tiếng Nhật thật là L9.
    sample.cards.forEach(([term, meaning], j) => {
      cards.push(makeCard({ deckId: deck.id, term, meaning }, firstDay + i * 1000 + j));
    });
  });

  // Khoảng ngày [từ, đến) (tính từ firstDay) mà mỗi bộ được học.
  const activeDays = new Map(
    decks.map((deck, i) => {
      const { startDaysAgo, pausedDays = 0 } = SAMPLE_DECKS[i];
      return [deck.id, [days - Math.min(days, startDaysAgo), days - pausedDays]];
    }),
  );
  const logs = [];

  // Mỗi ngày (bỏ ngẫu nhiên ~30% số ngày, trừ hôm qua để có chuỗi ngày học):
  // học tối đa 3 thẻ mới và ôn mọi thẻ đến hạn. Hôm nay không giả lập, để trang Học còn việc.
  for (let d = 0; d < days; d++) {
    if (d < days - 1 && random() < 0.3) continue;
    let t = addDays(firstDay, d) + (15 + random() * 6) * HOUR; // khoảng 19h–1h
    let newToday = 0;

    for (let i = 0; i < cards.length; i++) {
      let card = cards[i];
      const [from, to] = activeDays.get(card.deckId);
      if (d < from || d >= to) continue;
      if (card.state === 'new') {
        if (newToday >= 3) continue;
        newToday++;
      } else if (card.due > t) continue;

      for (let guard = 0; guard < 8 && t < now; guard++) {
        const rating = randomRating(card, random);
        const next = schedule(card, rating, { now: t });
        logs.push(makeReviewLog({ before: card, after: next, rating, now: t, timeMs: 2000 + random() * 10000 }));
        card = { ...next, updatedAt: t };
        t += (5 + random() * 15) * 1000;
        if (!isLearning(card)) break; // đã sang ôn tập → xong thẻ này hôm nay
        t = Math.max(t, card.due); // chờ tới bước học tiếp theo
      }
      cards[i] = card;
    }
  }

  await storage.putMany(COLLECTIONS.decks, decks);
  await storage.putMany(COLLECTIONS.cards, cards);
  await storage.putMany(COLLECTIONS.reviewLogs, logs);
  return { decks: decks.length, cards: cards.length, reviewLogs: logs.length };
}

function randomRating(card, random) {
  const r = random();
  if (card.state === 'review') return r < 0.1 ? 1 : r < 0.2 ? 2 : r < 0.92 ? 3 : 4;
  return r < 0.2 ? 1 : r < 0.3 ? 2 : r < 0.9 ? 3 : 4;
}

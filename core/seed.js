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
    name: 'JLPT N5 – Từ vựng',
    description: 'Từ vựng tiếng Nhật cơ bản kèm cách đọc và ví dụ',
    startDaysAgo: 120, // học từ 4 tháng trước → heatmap dài, nhiều thẻ đã thuộc
    cards: [
      ['約束[やくそく]', 'lời hứa, cuộc hẹn', 'やくそく', '約束[やくそく]を守[まも]る。'],
      ['食[た]べる', 'ăn', 'たべる', '毎朝[まいあさ]パンを食[た]べる。'],
      ['飲[の]む', 'uống', 'のむ', 'コーヒーを飲[の]みます。'],
      ['見[み]る', 'xem, nhìn', 'みる', '映画[えいが]を見[み]る。'],
      ['聞[き]く', 'nghe, hỏi', 'きく', '音楽[おんがく]を聞[き]く。'],
      ['読[よ]む', 'đọc', 'よむ', '新聞[しんぶん]を読[よ]む。'],
      ['書[か]く', 'viết', 'かく', '手紙[てがみ]を書[か]く。'],
      ['話[はな]す', 'nói chuyện', 'はなす', '日本語[にほんご]で話[はな]す。'],
      ['買[か]う', 'mua', 'かう', '本[ほん]を買[か]いました。'],
      ['行[い]く', 'đi', 'いく', '学校[がっこう]へ行[い]く。'],
      ['帰[かえ]る', 'về (nhà)', 'かえる', 'うちへ帰[かえ]ります。'],
      ['勉強[べんきょう]', 'học tập', 'べんきょう', '毎日[まいにち]日本語[にほんご]を勉強[べんきょう]する。'],
      ['友達[ともだち]', 'bạn bè', 'ともだち', '友達[ともだち]と遊[あそ]ぶ。'],
      ['時間[じかん]', 'thời gian', 'じかん', '時間[じかん]がありません。'],
      ['天気[てんき]', 'thời tiết', 'てんき', '今日[きょう]はいい天気[てんき]ですね。'],
      ['電車[でんしゃ]', 'tàu điện', 'でんしゃ', '電車[でんしゃ]で会社[かいしゃ]に行[い]く。'],
      ['駅[えき]', 'nhà ga', 'えき', '駅[えき]の前[まえ]で待[ま]つ。'],
      ['図書館[としょかん]', 'thư viện', 'としょかん', '図書館[としょかん]で本[ほん]を借[か]りる。'],
      ['人々[ひとびと]', 'mọi người', 'ひとびと', '町[まち]の人々[ひとびと]は親切[しんせつ]だ。'],
      ['元気[げんき]', 'khỏe mạnh, tràn đầy năng lượng', 'げんき', 'お元気[げんき]ですか。'],
      ['ゆっくり', 'chậm rãi, thong thả', '', 'ゆっくり話[はな]してください。'],
      ['たくさん', 'nhiều', '', '本[ほん]をたくさん読[よ]む。'],
    ],
  },
  {
    name: '食べ物 – Đồ ăn & Quán ăn',
    description: 'Món ăn, đồ uống và câu gọi món quen thuộc',
    startDaysAgo: 21, // mới học 3 tuần…
    pausedDays: 4, // …rồi bỏ ôn 4 hôm gần đây → hôm nay có nhiều thẻ tồn đọng cho trang Học
    cards: [
      ['朝[あさ]ご飯[はん]', 'bữa sáng', 'あさごはん', '朝[あさ]ご飯[はん]はいつも7時[じ]です。'],
      ['水[みず]', 'nước', 'みず', '冷[つめ]たい水[みず]をください。'],
      ['お茶[ちゃ]', 'trà', 'おちゃ', '緑[みどり]のお茶[ちゃ]が好きです。'],
      ['野菜[やさい]', 'rau củ', 'やさい', '新鮮[しんせん]な野菜[やさい]を買[か]う。'],
      ['果物[くだもの]', 'trái cây, hoa quả', 'くだもの', '日本[にほん]の果物[くだもの]は甘[あま]い。'],
      ['肉[にく]', 'thịt', 'にく', '牛肉[ぎゅうにく]と豚肉[ぶたにく]どちらが好[す]き？'],
      ['魚[さかな]', 'cá', 'さかな', '港[みなと]で魚[さかな]を食[た]べる。'],
      ['注文[ちゅうもん]', 'gọi món, đặt hàng', 'ちゅうもん', '注文[ちゅうもん]お願[ねが]いします。'],
      ['会計[かいけい]', 'thanh toán, tính tiền', 'かいけい', 'お会計[かいけい]をお願[ねが]いします。'],
      ['おいしい', 'ngon', '', 'このラーメンはとてもおいしい。'],
      ['甘[あま]い', 'ngọt', 'あまい', '甘[あま]いお菓子[かし]が好きです。'],
      ['辛[から]い', 'cay', 'からい', 'この料理[りょうり]は少[すこ]し辛[から]い。'],
    ],
  },
  {
    name: '挨拶 – Chào hỏi cơ bản',
    description: 'Câu chào hỏi hằng ngày — bộ này để nguyên chưa học',
    startDaysAgo: 0, // chưa học → toàn thẻ mới
    cards: [
      ['おはようございます', 'chào buổi sáng (lịch sự)', '', '先生[せんせい]、おはようございます。'],
      ['こんにちは', 'xin chào (ban ngày)', '', 'みなさん、こんにちは。'],
      ['こんばんは', 'chào buổi tối', '', 'こんばんは、いい夜[よる]ですね。'],
      ['お休[やす]みなさい', 'chúc ngủ ngon', 'おやすみなさい', 'また明日[あした]、お休[やす]みなさい。'],
      ['初[はじ]めまして', 'rất vui được gặp lần đầu', 'はじめまして', '初[はじ]めまして、アンです。'],
      ['よろしくお願[ねが]いします', 'mong được giúp đỡ', 'よろしくおねがいします', 'これからよろしくお願[ねが]いします。'],
      ['すみません', 'xin lỗi / cho tôi hỏi', '', 'すみません、駅[えき]はどこですか。'],
      ['ありがとう', 'cảm ơn', '', '手伝[てつだ]ってくれてありがとう。'],
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
    sample.cards.forEach(([term, meaning, reading = '', example = ''], j) => {
      cards.push(makeCard({ deckId: deck.id, term, meaning, reading, example }, firstDay + i * 1000 + j));
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

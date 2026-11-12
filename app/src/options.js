// contracts/appraise.md §2 table. The number the user calls never leaves the browser; only this id is sent.
export const MY_PRICE = { min: 1, max: 9999, quick: [1, 10, 100, 777] }
export const priceIdOf = (mine) => (mine == null ? 'never' : mine < 10 ? 'one' : mine < 100 ? 'ten' : 'hundred')
export const PRICE_TEXT = {
  label: '내가 부르는 값 (1~9999개)',
  empty: '한정선 몇 개에 넘길지 불러 주세요. 값만 궁금하면 ‘안 팔아’도 돼요.',
  bad: '1부터 9999까지 정수만 넣을 수 있어요.',
}

// mockup-v3 Price/Result/Card: the 한정선 rice cake, 12x10 cells, one path per colour (screen and card draw the same paths).
export const HANJEONG = [
  ['#3b2416', 'M3 1h6v1h-6zM2 2h1v1h-1zM9 2h1v1h-1zM1 3h1v5h-1zM10 3h1v5h-1zM2 8h1v1h-1zM9 8h1v1h-1zM3 9h6v1h-6z'],
  ['#fffaf2', 'M3 2h6v1h-6zM2 3h8v5h-8z'],
  ['#e9dccb', 'M3 8h6v1h-6z'],
  ['#f6b7c3', 'M4 3h1v1h-1zM7 4h1v1h-1zM5 6h1v1h-1z'],
]

export const TAG_GROUPS = [
  {
    id: 'how',
    title: '어떻게 왔나',
    tags: [
      { id: 'how-1', name: '🎁 선물' },
      { id: 'how-2', name: '💸 첫 월급' },
      { id: 'how-3', name: '🛫 여행' },
      { id: 'how-4', name: '🥕 중고 득템' },
      { id: 'how-5', name: '🎰 뽑기·경품' },
      { id: 'how-6', name: '👵 물려받음' },
    ],
  },
  {
    id: 'now',
    title: '지금 상태',
    tags: [
      { id: 'now-1', name: '🗑️ 못 버림' },
      { id: 'now-2', name: '📦 상자째 보관' },
      { id: 'now-3', name: '🩹 고쳐 씀' },
      { id: 'now-4', name: '🐾 반려동물이 씹음' },
    ],
  },
  {
    id: 'feeling',
    title: '마음',
    tags: [
      { id: 'feeling-1', name: '💔 전 애인 흔적' },
      { id: 'feeling-2', name: '🏆 인생템' },
      { id: 'feeling-3', name: '🤦 충동구매 후회' },
      { id: 'feeling-4', name: '🤷 그냥 좋아' },
    ],
  },
  {
    id: 'brag',
    title: '자랑',
    tags: [
      { id: 'brag-1', name: '🔥 지금은 못 구함' },
      { id: 'brag-2', name: '🧓 10년 넘음' },
    ],
  },
]

// Source of truth: contracts/appraise.md §5. daily_limit is not an error — see OFF_DUTY_TEXT.
export const ERROR_TEXT = {
  invalid_input: '사진이나 선택을 다시 골라 주세요.',
  refused: '이 사진은 감정하지 않아요. 물건 사진으로 다시 골라 주세요.',
  unavailable: "감정이 잘 안 됐어요. 잠시 뒤 '감정 받기'를 다시 눌러 주세요.",
  person_limit: '허허, 너무 자주 왔구먼. 좀 쉬었다 와.',
}

// Source of truth: contracts/appraise.md §5.
export const REGION_NOTICE = '사진은 감정하는 동안 서울 밖 아시아 리전에서 처리될 수 있어요.'

// Source of truth: contracts/appraise.md §5 daily_limit row.
export const OFF_DUTY_TEXT = '아저씨는 다른 동네로 떠났어요. 밤 12시에 다시 와요.'

// CAREER-32 plan A1 (U10 b) — not in contracts
export const BUSY_TEXT = '앞 감정을 마무리하는 중이에요. 끝나면 다시 누를 수 있어요.'

// CAREER-35 plan A1 '글자의 원본' (mockup-v3). `\n` is a line break (white-space: pre-line); no <br> in notices.
export const STEPS = {
  door: { label: '가게 문', kicker: '오늘 이 동네에 왔어요', title: '이동식 전당포', line: '안 쓰는 물건, 추억 있는 물건\n아저씨가 한정선으로 쳐 드려요' },
  photo: { label: '물건 꺼내기', line: '어서 오게. 뭘 가져왔나?\n꺼내 보게.' },
  tags: { label: '사연 말하기', line: '흠, 이건 어쩌다 자네 손에 왔나?' },
  price: { label: '내 값 부르기', line: '자네는 이걸 한정선 몇 개로 치나?' },
}
export const THINKING_LINE = '어디 보자… 흐음…'
export const NOTICE_DOOR = '값은 아저씨 마음대로예요.\n진짜로 사거나 맡아 두지는 않아요.'
export const NOTICE_THINKING = '아저씨가 돋보기로 살펴보는 중이에요.\n보통 몇 초면 끝나요.'
export const BAD_FILE_TEXT = '사진을 다시 골라 주세요 (jpg·png)'

// Failure buttons. `mark` is drawn, so it is aria-hidden; `U+FE0E` keeps iOS from turning ▶ ◀ ↻ into emoji.
export const FAIL_BUTTONS = {
  refused: { mark: '◀\uFE0E', text: '사진 다시 꺼내기' },
  unavailable: { mark: '↻\uFE0E', text: '다시 감정 받기', note: '고른 사진·사연·값은 그대로 남아 있어요' },
  person_limit: { text: '조금 뒤에 다시', fade: true },
  daily_limit: { text: '내일 다시 오기', fade: true },
}

// Seen: "한정선 N개". Read: "한정선 모찌 N개". Built by concatenation, so no unit-then-number literal is left in code (OldUnit test).
export const shownOf = (n) => (n == null ? '안 팔아' : '한정선 ' + n + '개')
export const readOf = (n) => (n == null ? '안 팔아' : '한정선 모찌 ' + n + '개')

// Compare the uncle's mochi with the one the user called. `never` first (spec Q7).
export function compareLine(mine, mochi) {
  if (mine == null) return { mark: '', text: '안 판다니… 그래도 값은 매겨 봤네' }
  if (mochi > mine) return { mark: '▲', text: '아저씨가 더 쳐줬다!' }
  if (mochi < mine) return { mark: '▼', text: '아저씨는 좀 짜게 봤다' }
  return { mark: '=', text: '자네 눈이 제법이군!' }
}

// CAREER-34 plan A1 '카드 구성' · A2 (user answers 2026-11-01). The card never shows the uncle's value (ADR-0010).
export const CARD = {
  fileName: 'how-much-card.jpg',
  head: '이동식 전당포 HOW-MUCH',
  title: '전당표',
  capUncle: '아저씨 감정가',
  hidden: '한정선 ?개',
  capWho: '감정사',
  who: '동네 아저씨',
  capMine: '내가 부른 값',
  tag: '?',
  stamp: ['감정', '필'],
  foot: '내 물건도 감정받기 ▶',
}
export const SHARE_TEXT = {
  notDrawn: '공유 그림을 만들지 못했어요.',
  useSave: '공유 창을 열지 못했어요. 저장을 눌러 주세요.',
}

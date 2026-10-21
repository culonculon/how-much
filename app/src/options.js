// Source of truth: contracts/appraise.md §2, §3 (order matters).
export const PRICES = [
  { id: 'one', button: '🍡 1개', card: '모찌 1개' },
  { id: 'ten', button: '🍡 10개', card: '모찌 10개' },
  { id: 'hundred', button: '🍡 100개', card: '모찌 100개' },
  { id: 'never', button: '🙅 안 팔아', card: '안 팔아' },
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

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
export const OFF_DUTY_TEXT = '아저씨 오늘 퇴근했어요. 밤 12시에 다시 출근해요.'

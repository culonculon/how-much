// 쿼리 검사 — 원본: contracts/appraise.md §2·§3, contracts/appraise-http.md §2.
// 브라우저가 보낸 값을 믿지 않는다(AC-2). 이 목록은 contracts 표와 같아야 한다(input.test.js가 비교).

export class InputError extends Error {
  constructor(reason) {
    super(reason);
    this.name = 'InputError';
    this.reason = reason;
  }
}

export const MY_PRICE_IDS = Object.freeze(['one', 'ten', 'hundred', 'never']);

export const TAGS = Object.freeze([
  { id: 'how-1', name: '🎁 선물' },
  { id: 'how-2', name: '💸 첫 월급' },
  { id: 'how-3', name: '🛫 여행' },
  { id: 'how-4', name: '🥕 중고 득템' },
  { id: 'how-5', name: '🎰 뽑기·경품' },
  { id: 'how-6', name: '👵 물려받음' },
  { id: 'now-1', name: '🗑️ 못 버림' },
  { id: 'now-2', name: '📦 상자째 보관' },
  { id: 'now-3', name: '🩹 고쳐 씀' },
  { id: 'now-4', name: '🐾 반려동물이 씹음' },
  { id: 'feeling-1', name: '💔 전 애인 흔적' },
  { id: 'feeling-2', name: '🏆 인생템' },
  { id: 'feeling-3', name: '🤦 충동구매 후회' },
  { id: 'feeling-4', name: '🤷 그냥 좋아' },
  { id: 'brag-1', name: '🔥 지금은 못 구함' },
  { id: 'brag-2', name: '🧓 10년 넘음' },
]);

export const TAG_IDS = Object.freeze(TAGS.map((t) => t.id));
const MAX_TAGS = TAG_IDS.length; // 16
const ALLOWED_KEYS = new Set(['myPrice', 'tags']);

export function checkQuery(searchParams) {
  for (const key of searchParams.keys()) {
    if (!ALLOWED_KEYS.has(key)) throw new InputError('bad_query_key');
  }

  const prices = searchParams.getAll('myPrice');
  if (prices.length !== 1 || !MY_PRICE_IDS.includes(prices[0])) {
    throw new InputError('bad_my_price');
  }

  const tags = searchParams.getAll('tags');
  if (tags.length > MAX_TAGS) throw new InputError('too_many_tags');
  for (const tag of tags) {
    if (!TAG_IDS.includes(tag)) throw new InputError('bad_tag');
  }
  if (new Set(tags).size !== tags.length) throw new InputError('dup_tag');

  return { myPrice: prices[0], tags: TAG_IDS.filter((id) => tags.includes(id)) };
}

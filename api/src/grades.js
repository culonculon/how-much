// 등급 5단계와 모찌 표 — 원본: contracts/appraise-http.md §6. 표가 있는 유일한 곳(AC-1).
// 모델은 물건 자체의 값만 등급으로 매긴다. 뜻은 프롬프트에 그대로 들어간다.

export const GRADES = Object.freeze([
  { grade: 1, meaning: '흔함 — 어디서나 쉽게 구하는 물건', mochi: 1 },
  { grade: 2, meaning: '쓸 만함 — 흔하지만 상태가 좋거나 쓸모가 분명함', mochi: 3 },
  { grade: 3, meaning: '괜찮음 — 사고 싶어 할 사람이 꽤 있음', mochi: 10 },
  { grade: 4, meaning: '귀함 — 구하기 어렵거나 오래 아낄 만함', mochi: 30 },
  { grade: 5, meaning: '보물 — 아주 드물거나 누구나 탐낼 만함', mochi: 100 },
]);

export function mochiOf(grade) {
  const row = GRADES.find((g) => g.grade === grade);
  if (!row) throw new RangeError(`모르는 등급: ${grade}`);
  return row.mochi;
}

export function gradeOf(mochi) {
  const row = GRADES.find((g) => g.mochi === mochi);
  if (!row) throw new RangeError(`표에 없는 mochi: ${mochi}`);
  return row.grade;
}

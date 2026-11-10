// 등급 5단계 · 칸 · 숫자 표 — 원본: contracts/appraise-http.md §6. 표가 있는 유일한 곳(AC-1).
// 등급은 물건 자체의 값(모델). 칸은 그 등급 안의 손때(모델) + 사연 태그 묶음(서버 규칙, CAREER-41).
// 뜻은 프롬프트에 그대로 들어간다.
import { STEPS } from './config.js';

export const GRADES = Object.freeze([
  Object.freeze({ grade: 1, meaning: '흔함 — 어디서나 쉽게 구하는 물건', min: 1, max: 5 }),
  Object.freeze({ grade: 2, meaning: '쓸 만함 — 흔하지만 상태가 좋거나 쓸모가 분명함', min: 6, max: 19 }),
  Object.freeze({ grade: 3, meaning: '괜찮음 — 사고 싶어 할 사람이 꽤 있음', min: 20, max: 59 }),
  Object.freeze({ grade: 4, meaning: '귀함 — 구하기 어렵거나 오래 아낄 만함', min: 60, max: 199 }),
  Object.freeze({ grade: 5, meaning: '보물 — 아주 드물거나 누구나 탐낼 만함', min: 200, max: 999 }),
]);

// §6-2 칸 뜻 — 사진에 보이는 것만
export const STEP_MEANINGS = Object.freeze({
  5: Object.freeze([
    '새것 같음 — 닳은 데가 안 보임',
    '조금 씀 — 가까이 보면 닳은 데가 있음',
    '제법 씀 — 닳음 · 작은 흠이 눈에 띔',
    '오래 씀 — 빛바램 · 큰 흠 · 고친 흔적',
    '세월이 배어 있음 — 오래 쓴 티가 물건 전체에 남',
  ]),
});

export const MAX_TAG_BUMP = 2; // 고른 묶음마다 한 칸, 최대 두 칸(11/10 사용자)

function checkSteps(steps) {
  if (!Object.hasOwn(STEP_MEANINGS, steps)) throw new RangeError(`모르는 칸 수: ${steps}`);
}

function checkStep(step, steps) {
  if (!Number.isInteger(step) || step < 1 || step > steps) throw new RangeError(`모르는 칸: ${step}`);
}

function rowOf(grade) {
  const row = GRADES.find((g) => g.grade === grade);
  if (!row) throw new RangeError(`모르는 등급: ${grade}`);
  return row;
}

// 묶음 = 태그 id의 '-' 앞(how · now · feeling · brag — contracts/appraise.md §3). 한 묶음에서 여러 개여도 한 칸
export function tagBump(tags) {
  const groups = new Set(tags.map((id) => id.split('-')[0]));
  return Math.min(MAX_TAG_BUMP, groups.size);
}

// 쓰는 칸 = min(STEPS, 모델 칸 + 태그 칸). 모델 칸이 범위 밖이면 던진다(맞춰 넣지 않음)
export function finalStep(step, tags, steps = STEPS) {
  checkSteps(steps);
  checkStep(step, steps);
  return Math.min(steps, step + tagBump(tags));
}

// §6-3: 아래 + round((칸 − 1) × (위 − 아래) / (칸 수 − 1)) — 칸 1은 아래 끝, 맨 위 칸은 위 끝
export function mochiOf(grade, step, steps = STEPS) {
  checkSteps(steps);
  const row = rowOf(grade);
  checkStep(step, steps);
  return row.min + Math.round(((step - 1) * (row.max - row.min)) / (steps - 1));
}

// mochi 하나 → { grade, step } (시험 실행이 쓴다). 표에 없으면 던진다
export function placeOf(mochi, steps = STEPS) {
  checkSteps(steps);
  for (const { grade } of GRADES) {
    for (let step = 1; step <= steps; step += 1) {
      if (mochiOf(grade, step, steps) === mochi) return { grade, step };
    }
  }
  throw new RangeError(`표에 없는 mochi: ${mochi}`);
}

export function gradeOf(mochi, steps = STEPS) {
  return placeOf(mochi, steps).grade;
}

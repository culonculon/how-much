// CAREER-41 등급 · 칸 · 숫자 표 — 원본: contracts/appraise-http.md §6 (6-1 · 6-3) · §7-1
import { describe, expect, test } from 'vitest';
import { STEPS } from '../src/config.js';
import { finalStep, GRADES, gradeOf, mochiOf, placeOf, STEP_MEANINGS, tagBump } from '../src/grades.js';

// 계약 6-3 결과 표 그대로
const TABLE = {
  5: [
    [1, 2, 3, 4, 5],
    [6, 9, 13, 16, 19],
    [20, 30, 40, 49, 59],
    [60, 95, 130, 164, 199],
    [200, 400, 600, 799, 999],
  ],
  3: [
    [1, 3, 5],
    [6, 13, 19],
    [20, 40, 59],
    [60, 130, 199],
    [200, 600, 999],
  ],
};

describe('CAREER-41 AC-1 등급 범위 (§6-1)', () => {
  test('등급은 1~5이고 범위는 1~5 · 6~19 · 20~59 · 60~199 · 200~999', () => {
    expect(GRADES.map((g) => [g.grade, g.min, g.max])).toEqual([
      [1, 1, 5],
      [2, 6, 19],
      [3, 20, 59],
      [4, 60, 199],
      [5, 200, 999],
    ]);
  });

  test('범위는 겹치지 않고 빈틈이 없다', () => {
    for (let i = 1; i < GRADES.length; i += 1) expect(GRADES[i].min).toBe(GRADES[i - 1].max + 1);
  });

  test('위 끝은 4자리(9999) 안이다 — CAREER-40 Q5', () => {
    expect(GRADES.at(-1).max).toBeLessThanOrEqual(9999);
  });
});

describe('CAREER-41 AC-1 칸 → 숫자 (§6-3)', () => {
  test.each([5, 3])('%i칸 표가 계약 표와 같다', (steps) => {
    const got = GRADES.map((g) => Array.from({ length: steps }, (_, i) => mochiOf(g.grade, i + 1, steps)));
    expect(got).toEqual(TABLE[steps]);
  });

  test.each([5, 3])('%i칸: 모든 숫자가 서로 다르고 오름차순', (steps) => {
    const all = TABLE[steps].flat();
    for (let i = 1; i < all.length; i += 1) expect(all[i]).toBeGreaterThan(all[i - 1]);
  });

  test.each([5, 3])('%i칸: placeOf(mochiOf(g, s)) === { g, s }', (steps) => {
    for (const { grade } of GRADES) {
      for (let step = 1; step <= steps; step += 1) {
        expect(placeOf(mochiOf(grade, step, steps), steps)).toEqual({ grade, step });
        expect(gradeOf(mochiOf(grade, step, steps), steps)).toBe(grade);
      }
    }
  });

  test('표에 없는 숫자 · 모르는 등급 · 범위 밖 칸 · 모르는 칸 수는 던진다', () => {
    expect(() => placeOf(7, 5)).toThrow(RangeError);
    expect(() => mochiOf(0, 1, 5)).toThrow(RangeError);
    expect(() => mochiOf(3, 0, 5)).toThrow(RangeError);
    expect(() => mochiOf(3, 6, 5)).toThrow(RangeError);
    expect(() => mochiOf(3, 1.5, 5)).toThrow(RangeError);
    expect(() => mochiOf(3, 1, 4)).toThrow(RangeError);
  });

  test('설정 칸 수 STEPS는 3 또는 5이고, 칸 뜻이 그 수만큼 있다', () => {
    expect([3, 5]).toContain(STEPS);
    expect(STEP_MEANINGS[5]).toHaveLength(5);
    expect(STEP_MEANINGS[3]).toHaveLength(3);
  });
});

describe('CAREER-41 AC-1 사연 태그 묶음마다 한 칸 · 최대 두 칸 (§6 · §7-1)', () => {
  test.each([
    [[], 0],
    [['how-1'], 1],
    [['how-1', 'how-2', 'how-6'], 1],
    [['how-1', 'now-2'], 2],
    [['how-1', 'now-2', 'feeling-3'], 2],
    [['how-1', 'now-2', 'feeling-3', 'brag-1'], 2],
  ])('태그 %j → +%i칸', (tags, bump) => {
    expect(tagBump(tags)).toBe(bump);
  });

  test('모델 칸 + 태그 칸, 맨 위 칸을 넘지 않는다', () => {
    expect(finalStep(1, [], 5)).toBe(1);
    expect(finalStep(1, ['how-1'], 5)).toBe(2);
    expect(finalStep(1, ['how-1', 'now-1'], 5)).toBe(3);
    expect(finalStep(4, ['how-1', 'now-1'], 5)).toBe(5);
    expect(finalStep(5, ['how-1'], 5)).toBe(5);
    expect(finalStep(3, ['how-1', 'now-1', 'feeling-1'], 3)).toBe(3);
  });

  test('모델 칸이 범위 밖이면 던진다(맞춰 넣지 않음)', () => {
    expect(() => finalStep(0, [], 5)).toThrow(RangeError);
    expect(() => finalStep(6, [], 5)).toThrow(RangeError);
  });
});

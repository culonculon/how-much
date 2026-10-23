import { describe, expect, test } from 'vitest';
import { MAX_OUTPUT_CHARS, LINE_MAX_CHARS } from '../src/config.js';
import { GRADES, gradeOf, mochiOf } from '../src/grades.js';
import { countChars, OutputError, parseModelOutput } from '../src/output.js';

const reasonOf = (text, stopReason = 'end_turn') => {
  try {
    parseModelOutput(text, stopReason);
  } catch (err) {
    expect(err).toBeInstanceOf(OutputError);
    return err.reason;
  }
  throw new Error('OutputError가 나지 않음');
};
const json = (o) => JSON.stringify(o);

describe('AC-1 등급 표 (contracts/appraise-http.md §6)', () => {
  test('등급은 정확히 1~5', () => {
    expect(GRADES.map((g) => g.grade)).toEqual([1, 2, 3, 4, 5]);
  });

  test('mochi는 엄격한 오름차순이고 서로 다르다', () => {
    const m = GRADES.map((g) => g.mochi);
    for (let i = 1; i < m.length; i += 1) expect(m[i]).toBeGreaterThan(m[i - 1]);
    expect(new Set(m).size).toBe(m.length);
  });

  test('gradeOf(mochiOf(g)) === g', () => {
    for (const { grade } of GRADES) expect(gradeOf(mochiOf(grade))).toBe(grade);
  });
});

describe('AC-3 모델 출력 검사 (contracts/appraise-http.md §7)', () => {
  test('정상 감정', () => {
    expect(parseModelOutput(json({ grade: 3, line: '흠, 손때가 제법 묻었구먼' }), 'end_turn')).toEqual({
      grade: 3,
      line: '흠, 손때가 제법 묻었구먼',
    });
  });

  test('AC-3(a) JSON이 아닌 글 → not_json', () => {
    expect(reasonOf('흠 좋구먼')).toBe('not_json');
  });

  test('AC-3(b) 등급 없음 → bad_shape', () => {
    expect(reasonOf(json({ line: '좋구먼' }))).toBe('bad_shape');
  });

  test('AC-3(c) 등급이 1~5 밖 · 소수 · 문자열 → bad_grade', () => {
    for (const grade of [0, 6, 3.5, '3']) {
      expect(reasonOf(json({ grade, line: '좋구먼' }))).toBe('bad_grade');
    }
  });

  test('AC-3(d) line이 빈 문자열 · 공백만 → bad_line', () => {
    expect(reasonOf(json({ grade: 3, line: '' }))).toBe('bad_line');
    expect(reasonOf(json({ grade: 3, line: '   ' }))).toBe('bad_line');
  });

  test('AC-3(e) line 31자 → line_too_long, 30자 → 통과', () => {
    expect(reasonOf(json({ grade: 3, line: '가'.repeat(LINE_MAX_CHARS + 1) }))).toBe('line_too_long');
    const ok = '가'.repeat(LINE_MAX_CHARS);
    expect(parseModelOutput(json({ grade: 3, line: ok }), 'end_turn').line).toBe(ok);
  });

  test('AC-3(f) 출력 길이 상한을 넘는 글 → output_too_long', () => {
    expect(reasonOf('a'.repeat(MAX_OUTPUT_CHARS + 1))).toBe('output_too_long');
  });

  test('다른 키가 있음 → bad_shape', () => {
    expect(reasonOf(json({ grade: 3, line: 'x', why: 'y' }))).toBe('bad_shape');
  });

  test('```json 울타리 한 겹은 벗긴다', () => {
    const text = '```json\n' + json({ grade: 2, line: '쓸 만하구먼' }) + '\n```';
    expect(parseModelOutput(text, 'end_turn')).toEqual({ grade: 2, line: '쓸 만하구먼' });
  });

  test('앞뒤에 다른 말 → not_json', () => {
    expect(reasonOf('감정 결과입니다: ' + json({ grade: 3, line: '좋구먼' }))).toBe('not_json');
  });

  test('stopReason max_tokens → max_tokens (내용이 맞아도)', () => {
    expect(reasonOf(json({ grade: 3, line: '좋구먼' }), 'max_tokens')).toBe('max_tokens');
  });

  test('{"refuse":true} → { refused: true }, {"refuse":false} → bad_shape', () => {
    expect(parseModelOutput(json({ refuse: true }), 'end_turn')).toEqual({ refused: true });
    expect(reasonOf(json({ refuse: false }))).toBe('bad_shape');
  });

  test('line에 줄바꿈 → bad_line', () => {
    expect(reasonOf(json({ grade: 3, line: '좋구먼\n허허' }))).toBe('bad_line');
  });

  test('countChars는 코드 포인트로 센다', () => {
    expect(countChars('🍡'.repeat(30))).toBe(30);
  });
});

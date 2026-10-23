import { describe, expect, test } from 'vitest';
import { HONORIFIC, PERSON } from '../eval/criteria.js';

const isPerson = (line) => PERSON.some((re) => re.test(line));

// 근거: docs/reference/prompt-v2-말맛-시험.md §3·§4 (10/22 사용자 승인: 너·주인 더함)
describe('판정 목록 — 10/21 말맛 시험 문제 대사를 잡는다', () => {
  test.each([
    '너는 이걸 십 년이나 썼구나',
    '네가 아끼던 컵이구먼',
    '주인 손때가 잔뜩 묻었구먼',
    '옆에 선 남자가 부럽구먼',
    '그분이 아끼던 시계구먼',
  ])('사람 가리킴: %s', (line) => {
    expect(isPerson(line)).toBe(true);
  });

  test.each([
    '너무 오래 써서 반질반질하구먼',
    '너덜너덜해도 정은 가지',
    '주인공 같은 존재감이구먼',
    '기분이 좋아지는 색이구먼',
    '아이템 하나는 확실하구먼',
    '십 년 동안 잘 찍었지, 그런데 먼지는 공짜야',
  ])('헛걸림 없음: %s', (line) => {
    expect(isPerson(line)).toBe(false);
  });

  test.each(['꽤 쓸 만해 보이네요', '상태가 아주 좋습니다', '오래 쓰셨군요.'])('존댓말: %s', (line) => {
    expect(HONORIFIC.test(line)).toBe(true);
  });
});

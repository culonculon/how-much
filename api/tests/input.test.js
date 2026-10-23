import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { checkQuery, InputError, MY_PRICE_IDS, TAG_IDS } from '../src/input.js';

const reasonOf = (fn) => {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(InputError);
    return err.reason;
  }
  throw new Error('InputError가 나지 않음');
};
const q = (s) => new URLSearchParams(s);
const tagsQuery = (ids) => ids.map((id) => `tags=${id}`).join('&');

// contracts/appraise.md에서 '## n.' 절의 첫 표를 읽어 열 하나를 돌려준다(머리·구분 줄 뺌)
function contractColumn(section, col) {
  const text = readFileSync(new URL('../../contracts/appraise.md', import.meta.url), 'utf8');
  const start = text.indexOf(`\n## ${section}.`);
  const end = text.indexOf('\n## ', start + 1);
  const rows = text
    .slice(start, end)
    .split('\n')
    .filter((l) => l.startsWith('|'));
  return rows.slice(2).map((l) => l.split('|')[col + 1].trim().replaceAll('`', ''));
}

describe('AC-2 쿼리 검사', () => {
  test('AC-2(a) 모르는 myPrice → bad_my_price', () => {
    expect(reasonOf(() => checkQuery(q('myPrice=five')))).toBe('bad_my_price');
  });

  test('AC-2(a) myPrice가 없거나 두 번 → bad_my_price', () => {
    expect(reasonOf(() => checkQuery(q('tags=how-1')))).toBe('bad_my_price');
    expect(reasonOf(() => checkQuery(q('myPrice=one&myPrice=ten')))).toBe('bad_my_price');
  });

  test('AC-2(b) 모르는 태그 → bad_tag', () => {
    expect(reasonOf(() => checkQuery(q('myPrice=one&tags=how-9')))).toBe('bad_tag');
  });

  test('AC-2(c) 같은 태그 두 번 → dup_tag', () => {
    expect(reasonOf(() => checkQuery(q('myPrice=one&tags=how-1&tags=how-1')))).toBe('dup_tag');
  });

  test('AC-2(d) 태그 17개 → too_many_tags', () => {
    const seventeen = [...TAG_IDS, 'how-1'];
    expect(reasonOf(() => checkQuery(q(`myPrice=one&${tagsQuery(seventeen)}`)))).toBe('too_many_tags');
  });

  test('다른 쿼리 키 → bad_query_key', () => {
    expect(reasonOf(() => checkQuery(q('myPrice=one&x=1')))).toBe('bad_query_key');
  });

  test('정상: 태그 0개', () => {
    expect(checkQuery(q('myPrice=never'))).toEqual({ myPrice: 'never', tags: [] });
  });

  test('정상: 태그 16개를 뒤섞어 보내면 표 순서로 돌려준다', () => {
    const shuffled = [...TAG_IDS].reverse();
    const got = checkQuery(q(`myPrice=hundred&${tagsQuery(shuffled)}`));
    expect(got).toEqual({ myPrice: 'hundred', tags: [...TAG_IDS] });
  });

  test('목록이 contracts/appraise.md §2·§3 표와 같다', () => {
    expect(MY_PRICE_IDS).toEqual(contractColumn(2, 0));
    expect(TAG_IDS).toEqual(contractColumn(3, 2));
    expect(TAG_IDS).toHaveLength(16);
  });
});

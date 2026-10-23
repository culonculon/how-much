import { afterEach, describe, expect, test, vi } from 'vitest';
import { mochiOf } from '../src/grades.js';
import { createMemo, memoKey } from '../src/memo.js';
import { createServer } from '../src/server.js';
import { collectLog, converseReply, listen, makeJpeg, PHOTO_MARK } from './helpers.js';

// AC-17 같은 사진 · 같은 태그면 기억한 결과를 돌려준다 (spec 10/22 결정 1·2, plan '열린 질문 8 답')

const TAGS_QUERY = 'tags=how-1&tags=now-2';
const reply = (grade, line = `등급 ${grade}이구먼`) => converseReply(JSON.stringify({ grade, line }));

const servers = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise((resolve) => s.close(resolve))));
});

async function start({ send, memo, withMemoArg = true } = {}) {
  const { lines, log } = collectLog();
  const server = withMemoArg ? createServer({ send, log, memo }) : createServer({ send, log });
  servers.push(server);
  const base = await listen(server);
  return { base, lines, entries: () => lines.map((l) => JSON.parse(l)) };
}

async function post(base, photo, query = `myPrice=ten&${TAGS_QUERY}`) {
  const res = await fetch(`${base}/api/appraise?${query}`, {
    method: 'POST',
    headers: { 'content-type': 'image/jpeg' },
    body: photo,
  });
  return { status: res.status, body: await res.json() };
}

function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('AC-17 createMemo · memoKey (단위)', () => {
  test('LRU: 꺼낸 것은 남고 가장 오래 안 쓴 것부터 잊는다', () => {
    const memo = createMemo({ maxEntries: 2 });
    memo.remember('A', { grade: 1, line: 'a' });
    memo.remember('B', { grade: 2, line: 'b' });
    memo.get('A');
    memo.remember('C', { grade: 3, line: 'c' });
    expect(memo.get('B')).toBeUndefined();
    expect(memo.get('A')).toEqual({ grade: 1, line: 'a' });
    expect(memo.get('C')).toEqual({ grade: 3, line: 'c' });
  });

  test('같은 열쇠를 다시 넣으면 처음 값을 돌려주고 바뀌지 않는다', () => {
    const memo = createMemo({ maxEntries: 2 });
    const x = { grade: 2, line: 'x' };
    expect(memo.remember('A', x)).toEqual(x);
    expect(memo.remember('A', { grade: 4, line: 'y' })).toEqual(x);
    expect(memo.get('A')).toEqual(x);
  });

  test('꺼낸 값은 얼어 있고 entries()는 복사본이다', () => {
    const memo = createMemo({ maxEntries: 2 });
    memo.remember('A', { grade: 1, line: 'a' });
    expect(Object.isFrozen(memo.get('A'))).toBe(true);
    const copy = memo.entries();
    copy.pop();
    expect(memo.entries()).toHaveLength(1);
  });

  test('maxEntries 0이면 끔: 받은 값을 그대로 돌려주고 아무것도 두지 않는다', () => {
    const memo = createMemo({ maxEntries: 0 });
    expect(memo.enabled).toBe(false);
    const v = { refused: true };
    expect(memo.remember('A', v)).toBe(v);
    expect(memo.entries()).toEqual([]);
  });

  test.each([-1, 1.5, Number.NaN, '2'])('잘못된 maxEntries %s → 던짐', (n) => {
    expect(() => createMemo({ maxEntries: n })).toThrow();
  });

  test('memoKey: 같은 바이트·태그 → 같은 값, 해시 64자 + | + 태그', () => {
    const photo = makeJpeg();
    const k = memoKey(photo, ['how-1', 'now-2']);
    expect(k).toBe(memoKey(Uint8Array.from(photo), ['how-1', 'now-2']));
    expect(k).toMatch(/^[0-9a-f]{64}\|how-1,now-2$/);
    expect(memoKey(photo, [])).toMatch(/^[0-9a-f]{64}\|$/);
    const other = Uint8Array.from(photo);
    other[other.length - 3] ^= 1; // EOI 앞 채움 바이트
    expect(memoKey(other, ['how-1', 'now-2'])).not.toBe(k);
  });
});

describe('AC-17 HTTP', () => {
  test('(a) 같은 사진·같은 태그 두 번 → Bedrock 1번 · 같은 응답 (myPrice·태그 순서만 달라도)', async () => {
    const send = vi.fn(async () => reply(3));
    const { base } = await start({ send, memo: createMemo({ maxEntries: 2 }) });
    const photo = makeJpeg();
    const first = await post(base, photo);
    const second = await post(base, photo);
    expect(send).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(first.status).toBe(200);

    expect(await post(base, photo, `myPrice=hundred&${TAGS_QUERY}`)).toEqual(first);
    expect(await post(base, photo, 'myPrice=one&tags=now-2&tags=how-1')).toEqual(first);
    expect(send).toHaveBeenCalledTimes(1);
  });

  test('(a) 거절도 기억한다 → 두 번 모두 422 refused, Bedrock 1번', async () => {
    const send = vi.fn(async () => converseReply(JSON.stringify({ refuse: true })));
    const { base } = await start({ send, memo: createMemo({ maxEntries: 2 }) });
    const photo = makeJpeg();
    for (let i = 0; i < 2; i += 1) {
      expect(await post(base, photo)).toEqual({ status: 422, body: { code: 'refused' } });
    }
    expect(send).toHaveBeenCalledTimes(1);
  });

  test('(b) 태그 하나 다르거나 사진 1바이트 다르면 새로 부른다', async () => {
    const send = vi.fn(async () => reply(2));
    const { base } = await start({ send, memo: createMemo({ maxEntries: 10 }) });
    const photo = makeJpeg();
    await post(base, photo);
    await post(base, photo, 'myPrice=ten&tags=how-1');
    expect(send).toHaveBeenCalledTimes(2);
    const other = Uint8Array.from(photo);
    other[other.length - 3] ^= 1;
    await post(base, other);
    expect(send).toHaveBeenCalledTimes(3);
  });

  test('(c) 실패(출력 깨짐 · AccessDenied · invalid_input)는 기억하지 않는다', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(converseReply('흠 좋구먼'))
      .mockResolvedValue(reply(2));
    const { base } = await start({ send, memo: createMemo({ maxEntries: 10 }) });
    const photo = makeJpeg({ width: 700 });
    expect((await post(base, photo)).status).toBe(503);
    expect((await post(base, photo)).status).toBe(200);
    expect(send).toHaveBeenCalledTimes(2);

    const denied = Object.assign(new Error('no'), { name: 'AccessDeniedException', $metadata: { httpStatusCode: 403 } });
    const send2 = vi.fn().mockRejectedValueOnce(denied).mockResolvedValue(reply(2));
    const s2 = await start({ send: send2, memo: createMemo({ maxEntries: 10 }) });
    expect((await post(s2.base, photo)).status).toBe(503);
    expect((await post(s2.base, photo)).status).toBe(200);
    expect(send2).toHaveBeenCalledTimes(2);

    const send3 = vi.fn(async () => reply(2));
    const s3 = await start({ send: send3, memo: createMemo({ maxEntries: 10 }) });
    expect((await post(s3.base, photo, `myPrice=five&${TAGS_QUERY}`)).status).toBe(400);
    expect(send3).toHaveBeenCalledTimes(0);
    expect((await post(s3.base, photo)).status).toBe(200);
    expect(send3).toHaveBeenCalledTimes(1);
  });

  test('(d) 상한 2: A·B·C 뒤 A는 잊혀 다시 부르고, C는 기억한다', async () => {
    const send = vi.fn(async () => reply(1));
    const { base } = await start({ send, memo: createMemo({ maxEntries: 2 }) });
    const [a, b, c] = [640, 641, 642].map((width) => makeJpeg({ width }));
    for (const p of [a, b, c]) await post(base, p);
    expect(send).toHaveBeenCalledTimes(3);
    await post(base, a);
    expect(send).toHaveBeenCalledTimes(4);
    await post(base, c);
    expect(send).toHaveBeenCalledTimes(4);
  });

  test('(e) 기억은 서버 인스턴스마다 새로 — 기본 서버는 켜져 있다', async () => {
    const send = vi.fn(async () => reply(2));
    const photo = makeJpeg({ width: 720 });
    const s1 = await start({ send, withMemoArg: false });
    await post(s1.base, photo);
    const s2 = await start({ send, withMemoArg: false });
    await post(s2.base, photo);
    expect(send).toHaveBeenCalledTimes(2);
    await post(s2.base, photo);
    expect(send).toHaveBeenCalledTimes(2);
  });

  test('(f) 기억을 끈 서버 → 매번 부르고 로그 memo는 off', async () => {
    const send = vi.fn(async () => reply(2));
    const s = await start({ send, memo: createMemo({ maxEntries: 0 }) });
    const photo = makeJpeg();
    await post(s.base, photo);
    await post(s.base, photo);
    expect(send).toHaveBeenCalledTimes(2);
    expect(s.entries().map((e) => e.memo)).toEqual(['off', 'off']);
  });

  test('(g) 로그: miss → hit(attempts 0) · invalid_input은 null · 해시·사진은 안 남김', async () => {
    const send = vi.fn(async () => reply(3));
    const memo = createMemo({ maxEntries: 2 });
    const s = await start({ send, memo });
    const photo = makeJpeg();
    await post(s.base, photo);
    await post(s.base, photo);
    await post(s.base, photo, 'myPrice=five');
    const [first, second, bad] = s.entries();
    expect(first.memo).toBe('miss');
    expect(first.attempts).toBeGreaterThanOrEqual(1);
    expect(second).toMatchObject({ memo: 'hit', attempts: 0, inputTokens: null, outputTokens: null, grade: 3 });
    expect(bad.memo).toBeNull();

    const all = s.lines.join('\n');
    const mark = Buffer.from(PHOTO_MARK, 'latin1');
    for (const needle of [PHOTO_MARK, mark.toString('base64'), mark.toString('hex'), Buffer.from(photo).toString('base64')]) {
      expect(all).not.toContain(needle);
    }
    expect(all).not.toMatch(/[0-9a-f]{64}/);
    expect(all).not.toContain(memoKey(photo, ['how-1', 'now-2']).slice(0, 8));
  });

  test('(h) 기억 항목은 열쇠와 결과뿐 — 사진 바이트 없음', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(reply(3))
      .mockResolvedValueOnce(converseReply(JSON.stringify({ refuse: true })));
    const memo = createMemo({ maxEntries: 10 });
    const s = await start({ send, memo });
    const p1 = makeJpeg({ width: 650 });
    const p2 = makeJpeg({ width: 651 });
    await post(s.base, p1);
    await post(s.base, p2);
    const entries = memo.entries();
    expect(entries).toHaveLength(2);
    for (const [key, value] of entries) {
      expect(key).toMatch(/^[0-9a-f]{64}\|[a-z0-9,-]*$/);
      expect([['grade', 'line'], ['refused']]).toContainEqual(Object.keys(value).sort());
    }
    const dump = JSON.stringify(entries);
    const mark = Buffer.from(PHOTO_MARK, 'latin1');
    for (const needle of [PHOTO_MARK, mark.toString('base64'), mark.toString('hex')]) {
      expect(dump).not.toContain(needle);
    }
  });

  test('동시에 같은 열쇠 → 둘 다 부르지만 응답은 먼저 기억된 값 (로그 miss · raced)', async () => {
    const calls = [];
    const send = vi.fn(() => {
      const d = deferred();
      calls.push(d);
      return d.promise;
    });
    const memo = createMemo({ maxEntries: 10 });
    const s = await start({ send, memo });
    const photo = makeJpeg();
    const r1 = post(s.base, photo);
    const r2 = post(s.base, photo);
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    calls[0].resolve(reply(2));
    const first = await r1;
    calls[1].resolve(reply(4));
    const second = await r2;
    expect(first.body.mochi).toBe(mochiOf(2));
    expect(second.body.mochi).toBe(mochiOf(2));
    expect(s.entries().map((e) => e.memo).sort()).toEqual(['miss', 'raced']);
    expect(memo.entries()).toHaveLength(1);
  });
});

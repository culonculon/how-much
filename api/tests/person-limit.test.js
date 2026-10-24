// CAREER-31 사람별 제한 — 같은 사람(CloudFront-Viewer-Address)이 1분 5번 · 하루 50번을 넘으면 Bedrock 전에 막는다.
// 원본: specs/CAREER-31-prepublic-guard/plan.md 'A2 답'·'A3 답'·'요청 한 건의 흐름' · contracts/appraise-http.md §5 '사람별 제한'·§8 · ADR-0006
// 시계는 now로만 옮긴다(vi.useFakeTimers 안 씀 — HTTP 서버와 섞이면 흔들림).
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as C from '../src/config.js';
import { createMemo } from '../src/memo.js';
import { createPersonLimit, personOf, PersonLimitError } from '../src/person-limit.js';
import { createServer, startServer } from '../src/server.js';
import { collectLog, converseReply, listen, makeJpeg, PHOTO_MARK } from './helpers.js';
import { tempDailyLimit } from './temp-daily-limit.js';
import { testPersonLimit } from './test-person-limit.js';

const FAKE_SECRET = 'howmuch-fake-secret-c31-value';
process.env.AWS_SECRET_ACCESS_KEY = FAKE_SECRET;

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const srcTexts = () =>
  readdirSync(SRC_DIR)
    .filter((f) => f.endsWith('.js'))
    .map((f) => ({ f, text: readFileSync(join(SRC_DIR, f), 'utf8') }));

const P = { 'cloudfront-viewer-address': '203.0.113.7:40001' };
const Q = { 'cloudfront-viewer-address': '198.51.100.9:50000' };
const OK_REPLY = () => converseReply('{"grade":3,"line":"흠"}');
const photo = (i) => makeJpeg({ width: 100 + i });

let t;
const now = () => t;
beforeEach(() => {
  t = Date.parse('2026-11-08T12:00:00+09:00');
});

const cleanups = [];
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()();
});

// 하나에서 예외를 잡아 돌려준다(없으면 실패)
function thrown(fn) {
  try {
    fn();
  } catch (e) {
    return e;
  }
  throw new Error('예외가 나지 않음');
}

async function postTo(base, body, headers = {}) {
  const res = await fetch(`${base}/api/appraise?myPrice=ten&tags=how-1`, {
    method: 'POST',
    headers: { 'content-type': 'image/jpeg', ...headers },
    body,
  });
  return { status: res.status, text: await res.text(), headers: res.headers };
}

// 서버 하나: 하루 셈과 사람별 셈은 같은 시계(now). 기억은 기본 끔
async function start({ minuteLimit = 3, dayLimit = 1000, memoEntries = 0, dailyCap = 1000 } = {}) {
  const daily = tempDailyLimit({ limit: dailyCap, now });
  cleanups.push(daily.cleanup);
  const personLimit = testPersonLimit({ minuteLimit, dayLimit, now });
  const { lines, log } = collectLog();
  const send = vi.fn(async () => OK_REPLY());
  const server = createServer({
    send: (...a) => send(...a),
    log,
    memo: createMemo({ maxEntries: memoEntries }),
    dailyLimit: daily.dailyLimit,
    personLimit,
  });
  const base = await listen(server);
  cleanups.push(() => new Promise((r) => server.close(r)));
  return {
    send,
    daily,
    lines,
    entries: () => lines.map((l) => JSON.parse(l)),
    post: (body, headers) => postTo(base, body, headers),
  };
}

describe('CAREER-31 personOf (단위)', () => {
  test.each([
    ['203.0.113.7:40001', { key: '4:203.0.113.7', who: 'ip4' }],
    ['203.0.113.7:9', { key: '4:203.0.113.7', who: 'ip4' }],
    ['2001:db8:0:1:aaaa::1:46532', { key: '6:2001:0db8:0000:0001', who: 'ip6' }],
    ['2001:db8:0:1:ffff:ffff:ffff:ffff:1', { key: '6:2001:0db8:0000:0001', who: 'ip6' }],
    ['2001:db8:0:2::1:46532', { key: '6:2001:0db8:0000:0002', who: 'ip6' }],
    ['::ffff:203.0.113.7:40001', { key: '4:203.0.113.7', who: 'ip4' }],
    [undefined, { key: '-', who: 'none' }],
    ['', { key: '-', who: 'bad' }],
    ['203.0.113.7', { key: '-', who: 'bad' }],
    ['203.0.113.7:x', { key: '-', who: 'bad' }],
    ['203.0.113.7:123456', { key: '-', who: 'bad' }],
    ['evil:80', { key: '-', who: 'bad' }],
    ['1.2.3.4:1, 5.6.7.8:2', { key: '-', who: 'bad' }],
  ])('CAREER-31 AC-3 personOf(%j)', (value, expected) => {
    expect(personOf(value)).toEqual(expected);
  });
});

describe('CAREER-31 사람별 셈 take (단위)', () => {
  const valid = { minuteLimit: 5, windowMs: 60_000, dayLimit: 50, maxEntries: 10, now: () => 0 };
  const bad = [0, -1, 1.5, NaN, '5', undefined];
  test.each(
    ['minuteLimit', 'dayLimit', 'maxEntries', 'windowMs'].flatMap((k) => bad.map((v) => [k, v])),
  )('CAREER-31 AC-1 잘못된 %s = %j → TypeError', (key, value) => {
    expect(() => createPersonLimit({ ...valid, [key]: value })).toThrow(TypeError);
  });

  test('CAREER-31 AC-1 1분 창: 정확히 60,000ms 전 것은 창 밖 · 막힌 요청은 안 셈', () => {
    const pl = testPersonLimit({ minuteLimit: 3, dayLimit: 100, now });
    expect(pl.take('a')).toEqual({ minuteUsed: 1, dayUsed: 1 });
    expect(pl.take('a')).toEqual({ minuteUsed: 2, dayUsed: 2 });
    expect(pl.take('a')).toEqual({ minuteUsed: 3, dayUsed: 3 });
    const e = thrown(() => pl.take('a'));
    expect(e).toBeInstanceOf(PersonLimitError);
    expect(e.reason).toBe('person_minute');
    expect(e.minuteUsed).toBe(3);
    expect(e.dayUsed).toBe(3);
    expect(pl.take('b')).toEqual({ minuteUsed: 1, dayUsed: 1 });
    t += 59_999;
    expect(thrown(() => pl.take('a')).reason).toBe('person_minute');
    t += 1;
    expect(pl.take('a')).toEqual({ minuteUsed: 1, dayUsed: 4 });
  });

  test('CAREER-31 AC-2 하루 몫은 서울 00:00에 다시 차고, 시계가 뒤로 가도 새 하루가 없다', () => {
    const pl = testPersonLimit({ minuteLimit: 100, dayLimit: 2, now });
    pl.take('a');
    pl.take('a');
    expect(thrown(() => pl.take('a')).reason).toBe('person_day');
    t = Date.parse('2026-11-08T23:59:59.999+09:00');
    expect(thrown(() => pl.take('a')).reason).toBe('person_day');
    t = Date.parse('2026-11-09T00:00:00.000+09:00');
    expect(pl.take('a')).toMatchObject({ dayUsed: 1 });
    t = Date.parse('2026-11-08T12:00:00+09:00');
    expect(pl.take('a')).toMatchObject({ dayUsed: 2 });
  });

  test('CAREER-31 AC-1 하루와 1분을 둘 다 넘으면 person_day', () => {
    const pl = testPersonLimit({ minuteLimit: 1, dayLimit: 1, now });
    pl.take('a');
    expect(thrown(() => pl.take('a')).reason).toBe('person_day');
  });

  test('CAREER-31 AC-1 개수 상한: 가장 오래 안 온 사람부터 버린다', () => {
    const pl = testPersonLimit({ minuteLimit: 100, dayLimit: 100, maxEntries: 2, now });
    pl.take('a');
    pl.take('b');
    pl.take('a'); // a를 최근으로
    pl.take('c'); // b가 버려짐
    expect(pl.size()).toBe(2);
    expect(pl.take('a')).toMatchObject({ minuteUsed: 3 }); // a는 이어짐
    expect(pl.take('b')).toMatchObject({ minuteUsed: 1 }); // b는 새로
  });

  test('CAREER-31 AC-1 take는 동기다 (Promise 아님)', () => {
    const r = testPersonLimit({ now }).take('z');
    expect(r?.then).toBeUndefined();
  });
});

describe('CAREER-31 사람별 제한 (HTTP)', () => {
  test('CAREER-31 AC-1 (a) 같은 사람 4번째는 429 person_limit · Bedrock 0번 · 다른 사람은 통과 · 창이 지나면 다시 통과', async () => {
    const s = await start({ minuteLimit: 3 });
    for (let i = 0; i < 3; i++) expect((await s.post(photo(i), P)).status).toBe(200);
    const r4 = await s.post(photo(3), P);
    expect(r4.status).toBe(429);
    expect(r4.text).toBe('{"code":"person_limit"}');
    expect(r4.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(r4.headers.get('cache-control')).toBe('no-store');
    expect(r4.headers.get('retry-after')).toBeNull();
    expect(s.send).toHaveBeenCalledTimes(3);
    expect((await s.post(photo(4), Q)).status).toBe(200);
    t += 60_000;
    expect((await s.post(photo(5), P)).status).toBe(200);
  });

  test('CAREER-31 AC-1 (b) 기억에서 나가는 요청도 센다 · 하루 상한은 따로 돈다', async () => {
    const s = await start({ minuteLimit: 3, memoEntries: 10, dailyCap: 300 });
    const same = photo(0);
    const r = [];
    for (let i = 0; i < 4; i++) r.push(await s.post(same, P));
    expect(r.map((x) => x.status)).toEqual([200, 200, 200, 429]);
    expect(r[1].text).toBe(r[0].text);
    expect(r[2].text).toBe(r[0].text);
    expect(JSON.parse(r[3].text)).toEqual({ code: 'person_limit' });
    expect(s.send).toHaveBeenCalledTimes(1);
    expect(s.entries().map((e) => e.memo)).toEqual(['miss', 'hit', 'hit', null]);
  });

  test('CAREER-31 AC-2 하루 몫(5)을 다 쓰면 23:59까지 막히고 서울 00:00 뒤 다시 통과', async () => {
    t = Date.parse('2026-11-08T09:00:00+09:00');
    const s = await start({ minuteLimit: 3, dayLimit: 5 });
    const statuses = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await s.post(photo(i), P)).status);
      t += 60_000;
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    t = Date.parse('2026-11-08T23:59:00+09:00');
    expect((await s.post(photo(6), P)).status).toBe(429);
    expect(s.send).toHaveBeenCalledTimes(5);
    t = Date.parse('2026-11-09T00:00:00+09:00');
    expect((await s.post(photo(7), P)).status).toBe(200);
  });

  test('CAREER-31 AC-2 배포 값: 1분 5번 · 하루 50번 · 헤더 하나 — config.js 한 곳에만', async () => {
    expect(C.PERSON_MINUTE_LIMIT).toBe(5);
    expect(C.PERSON_WINDOW_MS).toBe(60_000);
    expect(C.PERSON_DAY_LIMIT).toBe(50);
    expect(C.PERSON_HEADER).toBe('cloudfront-viewer-address');
    for (const name of ['PERSON_MINUTE_LIMIT', 'PERSON_DAY_LIMIT']) {
      const re = new RegExp(`${name}\\s*=`, 'g');
      const hits = srcTexts().flatMap(({ f, text }) => (text.match(re) ?? []).map(() => f));
      expect(hits).toEqual(['config.js']);
    }
  });

  test('CAREER-31 AC-2 사람별 셈을 안 넣은 startServer는 진짜 값(1분 5번)으로 막는다', async () => {
    const daily = tempDailyLimit();
    cleanups.push(daily.cleanup);
    const send = vi.fn(async () => OK_REPLY());
    const { log } = collectLog();
    const server = await startServer({ port: 0, send: (...a) => send(...a), log, dailyLimit: daily.dailyLimit });
    cleanups.push(() => new Promise((r) => server.close(r)));
    const base = `http://127.0.0.1:${server.address().port}`;
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await postTo(base, photo(i), P)).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  test('CAREER-31 AC-3 (a) 포트와 다른 헤더(X-Forwarded-For 등)를 바꿔도 한 사람', async () => {
    const s = await start({ minuteLimit: 3 });
    const statuses = [];
    for (let i = 1; i <= 4; i++) {
      const res = await s.post(photo(i), {
        'cloudfront-viewer-address': `203.0.113.7:${40000 + i}`,
        'x-forwarded-for': `1.1.1.${i}`,
        'x-real-ip': `1.1.1.${i}`,
        'true-client-ip': `1.1.1.${i}`,
      });
      statuses.push(res.status);
    }
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  test('CAREER-31 AC-3 (b) 헤더가 없거나 틀리면 모두 한 사람(-)으로 센다', async () => {
    const s = await start({ minuteLimit: 3 });
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await s.post(photo(i))).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
    expect(s.entries().every((e) => e.who === 'none')).toBe(true);
    const bad = await s.post(photo(9), { 'cloudfront-viewer-address': 'garbage' });
    expect(bad.status).toBe(429);
    expect(s.entries().at(-1).who).toBe('bad');
    expect(s.send).toHaveBeenCalledTimes(3);
  });

  test('CAREER-31 AC-3 (c) 사람을 가르는 값은 하나뿐 — 다른 헤더·소켓 주소를 읽지 않는다', () => {
    const forbidden = /x-forwarded-for|x-real-ip|true-client-ip|remoteAddress/i;
    const hits = srcTexts()
      .filter(({ text }) => forbidden.test(text))
      .map(({ f }) => f);
    expect(hits).toEqual([]);
  });

  test('CAREER-31 AC-4 사람별 거절은 하루 셈을 쓰지 않고 로그 한 줄 · 주소·사진·비밀값 0번', async () => {
    const s = await start({ minuteLimit: 3 });
    for (let i = 0; i < 4; i++) await s.post(photo(i), P);
    expect(s.daily.read().used).toBe(3);
    const entries = s.entries();
    expect(entries).toHaveLength(4);
    for (const e of entries) {
      expect(e).toHaveProperty('who');
      expect(e).toHaveProperty('personMinute');
      expect(e).toHaveProperty('personDay');
    }
    expect(entries[3]).toMatchObject({
      outcome: 'person_limit',
      reason: 'person_minute',
      attempts: 0,
      memo: null,
      day: null,
      who: 'ip4',
      personMinute: 3,
    });
    const all = s.lines.join('\n');
    for (const needle of [
      '203.0.113',
      PHOTO_MARK,
      Buffer.from(PHOTO_MARK).toString('base64'),
      Buffer.from(PHOTO_MARK).toString('hex'),
      FAKE_SECRET,
    ]) {
      expect(all).not.toContain(needle);
    }
  });

  test('CAREER-31 AC-1 사람별 거절은 본문을 읽기 전 — 1,000,000바이트 사진도 429 person_minute', async () => {
    const s = await start({ minuteLimit: 3 });
    for (let i = 0; i < 3; i++) await s.post(photo(i), P);
    const big = await s.post(makeJpeg({ totalBytes: 1_000_000 }), P);
    expect(big.status).toBe(429);
    expect(JSON.parse(big.text)).toEqual({ code: 'person_limit' });
    expect(s.entries().at(-1).reason).toBe('person_minute');
    expect(s.send).toHaveBeenCalledTimes(3);
  });
});

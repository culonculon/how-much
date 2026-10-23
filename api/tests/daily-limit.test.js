// CAREER-27 하루 상한 — 서버가 하루 Bedrock 시도 수를 직접 센다.
// 원본: specs/CAREER-27-daily-limit/plan.md 'A1 답'·'A4 답'·'요청 한 건의 흐름' · contracts/appraise-http.md §5 '하루 상한'·§8 · ADR-0004
// 시계는 now로만 옮긴다(vi.useFakeTimers 안 씀 — HTTP 서버·재시도 대기와 섞이면 흔들림).
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createDailyLimit, DailyLimitError, dayOf, UsageStoreError } from '../src/daily-limit.js';
import { createMemo } from '../src/memo.js';
import { createServer } from '../src/server.js';
import { collectLog, converseReply, listen, makeJpeg, PHOTO_MARK, PNG_BYTES } from './helpers.js';
import { tempDailyLimit } from './temp-daily-limit.js';

const FAKE_SECRET = 'howmuch-fake-secret-c27-value';
process.env.AWS_SECRET_ACCESS_KEY = FAKE_SECRET;

const NOON = Date.parse('2026-11-08T12:00:00+09:00');
const OK_REPLY = () => converseReply('{"grade":3,"line":"흠"}');
const throttle = () => Object.assign(new Error('x'), { name: 'ThrottlingException', $metadata: { httpStatusCode: 429 } });
const photo = (i) => makeJpeg({ width: 100 + i });

const cleanups = [];
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()();
});

function temp(opts) {
  const t = tempDailyLimit(opts);
  cleanups.push(t.cleanup);
  return t;
}

// 서버 하나: 하루 셈은 밖에서 넣는다(D4). 기억은 기본 끔
async function start({ dailyLimit, send, memoEntries = 0 }) {
  const { lines, log } = collectLog();
  const server = createServer({ send: (...a) => send(...a), log, memo: createMemo({ maxEntries: memoEntries }), dailyLimit });
  const base = await listen(server);
  cleanups.push(() => new Promise((r) => server.close(r)));
  const post = async (body, { tags = 'how-1' } = {}) => {
    const res = await fetch(`${base}/api/appraise?myPrice=ten&tags=${tags}`, {
      method: 'POST',
      headers: { 'content-type': 'image/jpeg' },
      body,
    });
    return { status: res.status, text: await res.text(), headers: res.headers };
  };
  return { post, lines, entries: () => lines.map((l) => JSON.parse(l)) };
}

// AC-8: AC-1·AC-2·AC-6에서 모은 로그와 그때의 실제 send 수
const recorded = [];

describe('CAREER-27 하루 셈 (단위)', () => {
  test.each([
    ['2026-11-08T23:59:59.999+09:00', '2026-11-08'],
    ['2026-11-09T00:00:00.000+09:00', '2026-11-09'],
    ['2026-11-08T14:59:59.999Z', '2026-11-08'],
    ['2026-11-08T15:00:00.000Z', '2026-11-09'],
  ])('CAREER-27 AC-4 dayOf(%s) → %s (서울 00:00)', (iso, day) => {
    expect(dayOf(Date.parse(iso))).toBe(day);
  });

  test.each([[-1], [1.5], [NaN], ['3'], [undefined]])('CAREER-27 AC-5 잘못된 상한 %s → TypeError', (limit) => {
    const t = temp();
    expect(() => createDailyLimit({ file: t.file, limit, now: () => NOON })).toThrow(TypeError);
  });

  test.each([[0], [3]])('CAREER-27 AC-5 상한 %i은 만들어지고 파일·폴더를 만들지 않는다', (limit) => {
    const t = temp();
    createDailyLimit({ file: t.file, limit, now: () => NOON });
    expect(existsSync(join(t.dir, 'var'))).toBe(false);
  });

  test('CAREER-27 AC-5 하루 셈 없이 서버를 만들면 TypeError (D4)', () => {
    expect(() => createServer({ send: vi.fn(), log: () => {} })).toThrow(TypeError);
  });

  test('CAREER-27 AC-1 take(): 파일 없음 → 1, 파일 모양 그대로, 상한에서 limit_reached', () => {
    const t = temp({ limit: 2 });
    expect(t.dailyLimit.take()).toEqual({ day: '2026-11-08', used: 1 });
    expect(readFileSync(t.file, 'utf8')).toBe('{"day":"2026-11-08","used":1}\n');
    expect(t.dailyLimit.take()).toEqual({ day: '2026-11-08', used: 2 });
    let err;
    try {
      t.dailyLimit.take();
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(DailyLimitError);
    expect(err.reason).toBe('limit_reached');
    expect(err.used).toBe(2);
    expect(readFileSync(t.file, 'utf8')).toBe('{"day":"2026-11-08","used":2}\n');
  });

  test('CAREER-27 AC-3 take()는 Promise를 돌려주지 않는다 (A4 1 — 읽기와 쓰기 사이에 틈 없음)', () => {
    const t = temp();
    const r = t.dailyLimit.take();
    expect(r).not.toBeInstanceOf(Promise);
    expect(r.then).toBeUndefined();
  });

  test('CAREER-27 AC-4 어제 날짜 파일 → 오늘 1로 다시 시작', () => {
    const t = temp({ limit: 300 });
    mkdirSync(dirname(t.file), { recursive: true });
    writeFileSync(t.file, '{"day":"2026-11-07","used":300}\n');
    expect(t.dailyLimit.take()).toEqual({ day: '2026-11-08', used: 1 });
    expect(t.read()).toEqual({ day: '2026-11-08', used: 1 });
  });

  test('CAREER-27 AC-4 파일 날짜가 시계보다 뒤면 그대로 씀 (시계가 뒤로 가도 새 상한 없음)', () => {
    const t = temp({ limit: 2 });
    mkdirSync(dirname(t.file), { recursive: true });
    const before = '{"day":"2026-11-09","used":2}\n';
    writeFileSync(t.file, before);
    expect(() => t.dailyLimit.take()).toThrow(expect.objectContaining({ reason: 'limit_reached' }));
    expect(readFileSync(t.file, 'utf8')).toBe(before);
  });

  test('CAREER-27 AC-5 상한 0 → limit_zero, 폴더·파일 없음', () => {
    const t = temp({ limit: 0 });
    let err;
    try {
      t.dailyLimit.take();
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(DailyLimitError);
    expect(err.reason).toBe('limit_zero');
    expect(err.day).toBeNull();
    expect(err.used).toBeNull();
    expect(existsSync(join(t.dir, 'var'))).toBe(false);
  });

  test.each([
    [''],
    ['{'],
    ['null'],
    ['[]'],
    ['{"day":"2026-11-08"}'],
    ['{"day":"2026-11-08","used":-1}'],
    ['{"day":"2026-11-08","used":1.5}'],
    ['{"day":"x","used":1}'],
    ['{"day":"2026-11-08","used":1,"x":0}'],
  ])('CAREER-27 AC-7 깨진 셈 파일 %j → usage_store_corrupt, 파일 그대로', (content) => {
    const t = temp();
    mkdirSync(dirname(t.file), { recursive: true });
    writeFileSync(t.file, content);
    let err;
    try {
      t.dailyLimit.take();
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(UsageStoreError);
    expect(err.reason).toBe('usage_store_corrupt');
    expect(readFileSync(t.file, 'utf8')).toBe(content);
  });

  test('CAREER-27 AC-7 셈 파일을 못 읽음(그 자리가 폴더) → usage_store_read', () => {
    const t = temp();
    mkdirSync(t.file, { recursive: true });
    expect(() => t.dailyLimit.take()).toThrow(expect.objectContaining({ reason: 'usage_store_read' }));
  });

  test('CAREER-27 AC-7 셈 파일을 못 씀(임시 파일 자리가 폴더) → usage_store_write, 원래 파일 그대로', () => {
    const t = temp();
    mkdirSync(dirname(t.file), { recursive: true });
    const before = '{"day":"2026-11-08","used":1}\n';
    writeFileSync(t.file, before);
    mkdirSync(`${t.file}.tmp`);
    let err;
    try {
      t.dailyLimit.take();
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(UsageStoreError);
    expect(err.reason).toBe('usage_store_write');
    expect(readFileSync(t.file, 'utf8')).toBe(before);
  });
});

describe('CAREER-27 하루 상한 (HTTP)', () => {
  test('CAREER-27 AC-1 상한 3 → 3번 200, 4번째 429 {"code":"daily_limit"}, 보내기 전에 셈을 씀', async () => {
    const t = temp({ limit: 3 });
    const usedAtSend = [];
    const send = vi.fn(async () => {
      usedAtSend.push(t.read().used);
      return OK_REPLY();
    });
    const s = await start({ dailyLimit: t.dailyLimit, send });
    const statuses = [];
    let last;
    for (let i = 0; i < 4; i += 1) {
      last = await s.post(photo(i));
      statuses.push(last.status);
    }
    expect(statuses).toEqual([200, 200, 200, 429]);
    expect(last.text).toBe('{"code":"daily_limit"}');
    expect(last.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(last.headers.get('cache-control')).toBe('no-store');
    expect(last.headers.get('retry-after')).toBeNull();
    expect(send).toHaveBeenCalledTimes(3);
    expect(usedAtSend).toEqual([1, 2, 3]);
    recorded.push({ name: 'AC-1', entries: s.entries(), requests: 4, limitAttempts: [0], sendTotal: 3 });
  });

  test(
    'CAREER-27 AC-2 재시도도 센다 — 상한 2에서 Throttling 뒤 세 번째 시도는 보내지 않고 daily_limit',
    { timeout: 10_000 }, // 진짜 재시도 대기 1초 + 2초
    async () => {
      const t = temp({ limit: 2 });
      const send = vi.fn(async () => {
        throw throttle();
      });
      const s = await start({ dailyLimit: t.dailyLimit, send });
      const first = await s.post(photo(0));
      expect(first.status).toBe(429);
      expect(first.text).toBe('{"code":"daily_limit"}');
      expect(send).toHaveBeenCalledTimes(2);

      send.mockImplementation(async () => OK_REPLY());
      const second = await s.post(photo(1));
      expect(second.status).toBe(429);
      expect(send).toHaveBeenCalledTimes(2);
      expect(t.read().used).toBe(2);
      recorded.push({ name: 'AC-2', entries: s.entries(), requests: 2, limitAttempts: [2, 0], sendTotal: 2 });
    },
  );

  test('CAREER-27 AC-3 동시 10건, 상한 2 → Bedrock 정확히 2번 (A4 2)', async () => {
    const t = temp({ limit: 2 });
    const held = [];
    const send = vi.fn(() => new Promise((resolve) => held.push(resolve)));
    const s = await start({ dailyLimit: t.dailyLimit, send });
    let settled = 0;
    const all = Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        s.post(photo(i)).then((r) => {
          settled += 1;
          return r;
        }),
      ),
    );
    await vi.waitFor(() => expect(settled).toBe(8), { timeout: 5_000 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(t.read().used).toBe(2);

    held.forEach((resolve) => resolve(OK_REPLY()));
    const results = await all;
    const count = (st) => results.filter((r) => r.status === st).length;
    expect([count(200), count(429)]).toEqual([2, 8]);
    expect(send).toHaveBeenCalledTimes(2);
  });

  test('CAREER-27 AC-4 서울 자정을 넘으면 새 하루', async () => {
    let now = Date.parse('2026-11-08T23:59:59.999+09:00');
    const t = temp({ limit: 1, now: () => now });
    const send = vi.fn(async () => OK_REPLY());
    const s = await start({ dailyLimit: t.dailyLimit, send });
    expect((await s.post(photo(0))).status).toBe(200);
    expect((await s.post(photo(1))).status).toBe(429);
    expect(send).toHaveBeenCalledTimes(1);
    now = Date.parse('2026-11-09T00:00:00.000+09:00');
    expect((await s.post(photo(2))).status).toBe(200);
    expect(send).toHaveBeenCalledTimes(2);
    expect(readFileSync(t.file, 'utf8')).toBe('{"day":"2026-11-09","used":1}\n');
  });

  test('CAREER-27 AC-5 (a) 상한 값은 config.js 한 곳', () => {
    const srcDir = new URL('../src/', import.meta.url);
    const hits = [];
    for (const name of readdirSync(srcDir).filter((n) => n.endsWith('.js'))) {
      const text = readFileSync(new URL(name, srcDir), 'utf8');
      const n = (text.match(/DAILY_CALL_LIMIT\s*=/g) || []).length;
      if (n) hits.push(`${name}:${n}`);
    }
    expect(hits).toEqual(['config.js:1']);
    expect(readFileSync(new URL('daily-limit.js', srcDir), 'utf8')).not.toContain('300');
  });

  test('CAREER-27 AC-5 (b) 상한 0 → 모두 429, Bedrock 0, 파일 없음, 로그 limit_zero', async () => {
    const t = temp({ limit: 0 });
    const send = vi.fn(async () => OK_REPLY());
    const s = await start({ dailyLimit: t.dailyLimit, send });
    const statuses = [];
    for (let i = 0; i < 3; i += 1) statuses.push((await s.post(photo(i))).status);
    expect(statuses).toEqual([429, 429, 429]);
    expect(send).toHaveBeenCalledTimes(0);
    expect(existsSync(t.file)).toBe(false);
    expect(s.entries().map((e) => e.reason)).toEqual(['limit_zero', 'limit_zero', 'limit_zero']);
  });

  test('CAREER-27 AC-6 입력 거절·기억 hit은 세지 않는다', async () => {
    const t = temp({ limit: 1 });
    const send = vi.fn(async () => OK_REPLY());
    const s = await start({ dailyLimit: t.dailyLimit, send, memoEntries: 10 });
    // (a) 입력 거절 5번은 0
    for (let i = 0; i < 5; i += 1) expect((await s.post(PNG_BYTES)).status).toBe(400);
    const a = photo(0);
    const first = await s.post(a);
    expect(first.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    // (b) 같은 사진·태그 → 기억에서, 상한 뒤에도 응답
    const again = await s.post(a);
    expect(again.status).toBe(200);
    expect(again.text).toBe(first.text);
    expect(send).toHaveBeenCalledTimes(1);
    const hitEntry = s.entries().at(-1);
    expect(hitEntry.memo).toBe('hit');
    expect(hitEntry.day).toBeNull();
    // (c) 다른 사진 → 429
    expect((await s.post(photo(1))).status).toBe(429);
    expect(send).toHaveBeenCalledTimes(1);
    recorded.push({ name: 'AC-6', entries: s.entries(), requests: 8, limitAttempts: [0], sendTotal: 1 });
  });

  test('CAREER-27 AC-7 (a) 서버를 다시 만들어도 그날 셈이 이어진다', async () => {
    const t = temp({ limit: 2 });
    const send1 = vi.fn(async () => OK_REPLY());
    const s1 = await start({ dailyLimit: t.dailyLimit, send: send1 });
    expect((await s1.post(photo(0))).status).toBe(200);
    expect((await s1.post(photo(1))).status).toBe(200);

    const send2 = vi.fn(async () => OK_REPLY());
    const s2 = await start({ dailyLimit: createDailyLimit({ file: t.file, limit: 2, now: () => NOON }), send: send2 });
    expect((await s2.post(photo(2))).status).toBe(429);
    expect(send2).toHaveBeenCalledTimes(0);
  });

  test('CAREER-27 AC-7 (b) 셈을 못 읽으면 Bedrock을 부르지 않고 unavailable', async () => {
    const t = temp({ limit: 2 });
    mkdirSync(dirname(t.file), { recursive: true });
    writeFileSync(t.file, '{');
    const send = vi.fn(async () => OK_REPLY());
    const s = await start({ dailyLimit: createDailyLimit({ file: t.file, limit: 2, now: () => NOON }), send });
    const r1 = await s.post(photo(0));
    expect(r1.status).toBe(503);
    expect(r1.text).toBe('{"code":"unavailable"}');
    expect(s.entries().at(-1).reason).toBe('usage_store_corrupt');

    rmSync(t.file);
    mkdirSync(t.file);
    const r2 = await s.post(photo(1));
    expect(r2.status).toBe(503);
    expect(s.entries().at(-1).reason).toBe('usage_store_read');
    expect(send).toHaveBeenCalledTimes(0);
  });

  test('CAREER-27 AC-8 로그: 요청마다 1줄 · day·dayUsed · 막힌 줄의 attempts · 사진·비밀 없음', () => {
    expect(recorded.map((r) => r.name)).toEqual(['AC-1', 'AC-2', 'AC-6']);
    const mark = Buffer.from(PHOTO_MARK);
    const secrets = [PHOTO_MARK, mark.toString('base64'), mark.toString('hex'), FAKE_SECRET];
    for (const r of recorded) {
      expect({ name: r.name, lines: r.entries.length }).toEqual({ name: r.name, lines: r.requests });
      for (const e of r.entries) {
        expect(e).toHaveProperty('day');
        expect(e).toHaveProperty('dayUsed');
      }
      const limited = r.entries.filter((e) => e.outcome === 'daily_limit');
      expect({ name: r.name, attempts: limited.map((e) => e.attempts) }).toEqual({
        name: r.name,
        attempts: r.limitAttempts,
      });
      const lastUsed = r.entries.filter((e) => e.dayUsed !== null).at(-1)?.dayUsed;
      expect({ name: r.name, lastUsed }).toEqual({ name: r.name, lastUsed: r.sendTotal });
      const text = r.entries.map((e) => JSON.stringify(e)).join('\n');
      expect(secrets.filter((s) => text.includes(s))).toEqual([]);
    }
  });
});

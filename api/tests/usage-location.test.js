// CAREER-31 셈 파일 자리 — 코드 폴더 밖(~/.local/state/how-much/usage.json)이라 배포로 코드 폴더를 바꿔도 하루 셈이 이어진다.
// 원본: specs/CAREER-31-prepublic-guard/plan.md 'A1 답' · ADR-0005 · contracts/appraise-http.md §8 USAGE_FILE
// HOME을 임시 폴더로 바꿔 진짜 셈 자리를 건드리지 않는다(plan 실패 시나리오 14).
// 두 '배포'는 src를 서로 다른 폴더에 복사해 따로 import한다 — 모듈이 따로 읽혀 USAGE_FILE도 따로 계산된다.
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { createMemo } from '../src/memo.js';
import { createServer } from '../src/server.js';
import { collectLog, converseReply, listen, makeJpeg } from './helpers.js';
import { testPersonLimit } from './test-person-limit.js';

const apiDir = fileURLToPath(new URL('..', import.meta.url));
const srcDir = join(apiDir, 'src');
const NOON = Date.parse('2026-11-08T12:00:00+09:00');
const now = () => NOON;
const photo = (i) => makeJpeg({ width: 100 + i });

let home;
let oldHome;
const dirs = [];

// 코드 폴더 하나 = 배포 하나
function release() {
  const rel = mkdtempSync(join(tmpdir(), 'c31-rel-'));
  dirs.push(rel);
  cpSync(srcDir, join(rel, 'api', 'src'), { recursive: true });
  return rel;
}

async function load(rel) {
  return {
    C: await import(pathToFileURL(join(rel, 'api/src/config.js')).href),
    L: await import(pathToFileURL(join(rel, 'api/src/daily-limit.js')).href),
  };
}

async function serve(dailyLimit) {
  const { lines, log } = collectLog();
  const send = vi.fn(async () => converseReply('{"grade":3,"line":"흠"}'));
  const server = createServer({
    send: (...a) => send(...a),
    log,
    memo: createMemo({ maxEntries: 0 }),
    dailyLimit,
    personLimit: testPersonLimit(),
  });
  const base = await listen(server);
  const post = async (body) => {
    const res = await fetch(`${base}/api/appraise?myPrice=ten&tags=how-1`, {
      method: 'POST',
      headers: { 'content-type': 'image/jpeg' },
      body,
    });
    return { status: res.status, text: await res.text() };
  };
  return { send, lines, post, close: () => new Promise((r) => server.close(r)) };
}

let relA;
let relB;
let A;
let B;

beforeAll(async () => {
  oldHome = process.env.HOME;
  home = mkdtempSync(join(tmpdir(), 'c31-home-'));
  dirs.push(home);
  process.env.HOME = home;
  relA = release();
  relB = release();
  A = await load(relA);
  B = await load(relB);
});

afterAll(() => {
  process.env.HOME = oldHome;
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe('CAREER-31 AC-6 셈 파일 자리', () => {
  test('CAREER-31 AC-6 (1) 두 배포의 셈 파일 자리가 같고, 코드 폴더 밖(홈 아래)이다', () => {
    expect(A.C.USAGE_FILE).toBe(B.C.USAGE_FILE);
    expect(A.C.USAGE_FILE).toBe(join(home, '.local', 'state', 'how-much', 'usage.json'));
    for (const codeDir of [relA, relB, apiDir]) expect(A.C.USAGE_FILE.startsWith(codeDir)).toBe(false);
  });

  test('CAREER-31 AC-6 (2) 코드 폴더를 바꿔 넣어도 하루 셈이 이어진다', async () => {
    const a = await serve(A.L.createDailyLimit({ file: A.C.USAGE_FILE, limit: 2, now }));
    expect((await a.post(photo(1))).status).toBe(200);
    await a.close();

    const b = await serve(B.L.createDailyLimit({ file: B.C.USAGE_FILE, limit: 2, now }));
    expect((await b.post(photo(2))).status).toBe(200);
    const third = await b.post(photo(3));
    expect(third.status).toBe(429);
    expect(third.text).toBe('{"code":"daily_limit"}');
    expect(b.send).toHaveBeenCalledTimes(1);
    await b.close();
  });

  test.skipIf(process.platform === 'win32')('CAREER-31 AC-6 (3) 처음 만든 폴더는 0700, 파일은 0600', () => {
    const file = A.C.USAGE_FILE;
    expect(statSync(dirname(file)).mode & 0o777).toBe(0o700);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });

  test('CAREER-31 AC-6 (4) 그 자리를 못 쓰면 503 unavailable · Bedrock 0번', async () => {
    const holder = mkdtempSync(join(tmpdir(), 'c31-badhome-'));
    dirs.push(holder);
    const fileHome = join(holder, 'home-is-a-file');
    writeFileSync(fileHome, 'x');
    process.env.HOME = fileHome;
    try {
      const X = await load(release());
      const s = await serve(X.L.createDailyLimit({ file: X.C.USAGE_FILE, limit: 2, now }));
      const r = await s.post(photo(4));
      expect(r.status).toBe(503);
      expect(r.text).toBe('{"code":"unavailable"}');
      expect(['usage_store_write', 'usage_store_read']).toContain(JSON.parse(s.lines.at(-1)).reason);
      expect(s.send).toHaveBeenCalledTimes(0);
      await s.close();
    } finally {
      process.env.HOME = home;
    }
  });

  test('CAREER-31 AC-6 (5) 설정 한 곳 — usage.json 글자는 config.js에만, 환경변수는 PORT 줄뿐', () => {
    const files = readdirSync(srcDir).filter((f) => f.endsWith('.js'));
    const usage = [];
    const env = [];
    for (const f of files) {
      const lines = readFileSync(join(srcDir, f), 'utf8').split('\n');
      lines.forEach((line) => {
        if (line.includes('usage.json')) usage.push(f);
        if (line.includes('process.env')) env.push(`${f}:${line.includes('PORT') ? 'PORT' : line.trim()}`);
      });
    }
    expect(usage).toEqual(['config.js']);
    expect(env).toEqual(['server.js:PORT']);
  });
});

// CAREER-26 사진 업로드 — 서버 쪽 확인(AC-8~11 · 13). CAREER-25가 만든 동작을 CAREER-26 AC 이름으로 고정한다.
// 원본: contracts/appraise-http.md §2·§3·§5 · CAREER-25 plan '요청 한 건의 흐름'(reason 이름). api/src는 고치지 않는다.
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { MAX_PHOTO_BYTES } from '../src/config.js';
import { createMemo } from '../src/memo.js';
import { createServer } from '../src/server.js';
import { collectLog, converseReply, listen, makeJpeg, PNG_BYTES, TEXT_BYTES, withGpsExif } from './helpers.js';
import { tempDailyLimit } from './temp-daily-limit.js';

const F1 = new Uint8Array(readFileSync(new URL('./fixtures/f1-prepared.jpg', import.meta.url)));
const { lines, log } = collectLog();
const sent = []; // AC-11(b): 이 파일이 보낸 사진 전부
const ENV_KEYS = ['TMPDIR', 'TMP', 'TEMP'];
const oldEnv = {};
let tmp;
let daily;
let send;
let server;
let base;

beforeAll(async () => {
  // CAREER-27: 하루 셈은 TMPDIR을 바꾸기 전에 만든다 — AC-11(a) '임시 폴더가 비었나'가 셈 파일로 깨지지 않게
  daily = tempDailyLimit();
  tmp = mkdtempSync(join(tmpdir(), 'c26-'));
  for (const k of ENV_KEYS) {
    oldEnv[k] = process.env[k];
    process.env[k] = tmp;
  }
  server = createServer({ send: (...args) => send(...args), log, memo: createMemo({ maxEntries: 0 }), dailyLimit: daily.dailyLimit });
  base = await listen(server);
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  daily.cleanup();
  // AC-11(a): 서버가 임시 폴더에 아무것도 남기지 않는다
  const left = readdirSync(tmp);
  rmSync(tmp, { recursive: true, force: true });
  for (const k of ENV_KEYS) {
    if (oldEnv[k] === undefined) delete process.env[k];
    else process.env[k] = oldEnv[k];
  }
  expect(left).toEqual([]);
  // AC-11(b): 보낸 사진 어느 것도 로그에 없다
  const all = lines.join('\n');
  const leaked = sent.map((b) => Buffer.from(b).toString('base64').slice(0, 32)).filter((p) => all.includes(p));
  expect(leaked).toEqual([]);
});

beforeEach(() => {
  send = vi.fn(async () => converseReply('{"grade":3,"line":"흠"}'));
});

async function post(body, { type = 'image/jpeg' } = {}) {
  if (body && body.length) sent.push(body);
  const before = lines.length;
  const res = await fetch(`${base}/api/appraise?myPrice=ten&tags=how-1`, {
    method: 'POST',
    headers: type ? { 'content-type': type } : {},
    body,
  });
  const json = await res.json();
  expect(lines.length).toBe(before + 1);
  return { status: res.status, json, entry: JSON.parse(lines.at(-1)) };
}

const INVALID = { code: 'invalid_input' };

describe('CAREER-26 AC-8 크기 경계', () => {
  test('CAREER-26 AC-8 MAX_PHOTO_BYTES + 1은 거절, 딱 MAX_PHOTO_BYTES는 통과', async () => {
    const over = await post(makeJpeg({ totalBytes: MAX_PHOTO_BYTES + 1 }));
    expect(over.status).toBe(400);
    expect(over.json).toEqual(INVALID);
    expect(over.entry.reason).toBe('too_large');
    expect(send).toHaveBeenCalledTimes(0);

    const edge = await post(makeJpeg({ totalBytes: MAX_PHOTO_BYTES }));
    expect(edge.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe('CAREER-26 AC-9 형식이 맞지 않으면 거절', () => {
  test.each([
    ['(a) 빈 본문', new Uint8Array(0), 'image/jpeg', 'empty_body'],
    ['(b) 글자', TEXT_BYTES, 'image/jpeg', 'not_jpeg'],
    ['(c) PNG를 JPEG라고', PNG_BYTES, 'image/jpeg', 'not_jpeg'],
    ['(d) 본문·Content-Type 없음', undefined, null, 'bad_content_type'],
  ])('CAREER-26 AC-9 %s', async (_name, body, type, reason) => {
    const r = await post(body, { type });
    expect(r.status).toBe(400);
    expect(r.json).toEqual(INVALID);
    expect(r.entry.reason).toBe(reason);
    expect(send).toHaveBeenCalledTimes(0);
  });
});

describe('CAREER-26 AC-10 브라우저가 만든 사진은 통과', () => {
  test('CAREER-26 AC-10 f1-prepared.jpg → 200 { mochi, line }, Bedrock 정확히 1번', async () => {
    const r = await post(F1);
    expect(r.status).toBe(200);
    expect(Object.keys(r.json).sort()).toEqual(['line', 'mochi']);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe('CAREER-26 AC-13 GPS가 든 사진은 서버가 거절', () => {
  test('CAREER-26 AC-13 같은 사진에 GPS만 더하면 거절, 빼면 통과', async () => {
    const gps = await post(withGpsExif(F1));
    expect(gps.status).toBe(400);
    expect(gps.json).toEqual(INVALID);
    expect(gps.entry.reason).toBe('gps_present');
    expect(send).toHaveBeenCalledTimes(0);

    const plain = await post(F1);
    expect(plain.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

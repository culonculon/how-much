import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { AWS_REGION, MAX_PHOTO_BYTES, MODEL_ID } from '../src/config.js';
import { mochiOf } from '../src/grades.js';
import { TAG_IDS } from '../src/input.js';
import { createServer, makeBedrockClient, startServer } from '../src/server.js';
import {
  collectLog,
  converseReply,
  listen,
  makeJpeg,
  PHOTO_MARK,
  PNG_BYTES,
  rawPost,
  TEXT_BYTES,
} from './helpers.js';

const FAKE_KEY_ID = 'AKIAHOWMUCHFAKEKEY01';
const FAKE_SECRET = 'howmuch-fake-secret-value';
process.env.AWS_ACCESS_KEY_ID = FAKE_KEY_ID;
process.env.AWS_SECRET_ACCESS_KEY = FAKE_SECRET;

const { lines, log } = collectLog();
const photos = []; // AC-6: 보낸 사진 전부
let send; // 테스트마다 바꾸는 가짜 Bedrock
let server;
let base;

beforeAll(async () => {
  server = createServer({ send: (...args) => send(...args), log });
  base = await listen(server);
});
afterAll(() => new Promise((resolve) => server.close(resolve)));
beforeEach(() => {
  send = vi.fn(async () => converseReply(JSON.stringify({ grade: 3, line: '흠, 손때가 제법 묻었구먼' })));
});

const LOG_KEYS = ['outcome', 'ms', 'attempts', 'inputTokens', 'outputTokens'];

function lastLogLine(before) {
  expect(lines.length).toBe(before + 1); // AC-6: 요청 1건에 정확히 1줄
  const entry = JSON.parse(lines.at(-1));
  for (const k of LOG_KEYS) expect(entry).toHaveProperty(k);
  expect(Number.isInteger(entry.ms)).toBe(true);
  return entry;
}

async function call({
  path = '/api/appraise',
  query = 'myPrice=ten&tags=how-1',
  method = 'POST',
  type = 'image/jpeg',
  body = makeJpeg(),
} = {}) {
  if (body) photos.push(body);
  const before = lines.length;
  const res = await fetch(`${base}${path}${query ? `?${query}` : ''}`, {
    method,
    headers: type ? { 'content-type': type } : {},
    body: method === 'POST' ? body : undefined,
  });
  const json = await res.json();
  expect(res.headers.get('cache-control')).toBe('no-store');
  expect(res.headers.get('access-control-allow-origin')).toBeNull();
  return { status: res.status, json, entry: lastLogLine(before) };
}

const INVALID = { code: 'invalid_input' };

describe('AC-1 등급 → 표 → { mochi, line }', () => {
  test.each([1, 2, 3, 4, 5])('AC-1 등급 %i', async (g) => {
    const line = `등급 ${g}이구먼`;
    send = vi.fn(async () => converseReply(JSON.stringify({ grade: g, line })));
    const body = makeJpeg();
    const r = await call({ query: 'myPrice=hundred&tags=how-1&tags=now-2', body });

    expect(r.status).toBe(200);
    expect(Object.keys(r.json).sort()).toEqual(['line', 'mochi']);
    expect(r.json).toEqual({ mochi: mochiOf(g), line });
    expect(send).toHaveBeenCalledTimes(1);

    const input = send.mock.calls[0][0].input;
    expect(input.modelId).toBe(MODEL_ID);
    const image = input.messages.flatMap((m) => m.content).find((c) => c.image)?.image;
    expect(image.format).toBe('jpeg');
    expect(Buffer.from(image.source.bytes).equals(Buffer.from(body))).toBe(true);
    // 모델에 myPrice를 보내지 않는다(plan 질문 2)
    const withoutBytes = JSON.stringify(input, (k, v) => (k === 'bytes' ? undefined : v));
    expect(withoutBytes).not.toContain('hundred');

    expect(r.entry).toMatchObject({ outcome: 'ok', attempts: 1, inputTokens: 1520, outputTokens: 31, grade: g });
  });
});

describe('AC-2 브라우저가 보낸 값을 믿지 않는다 (HTTP)', () => {
  const rejected = [
    ['(a) 모르는 myPrice', { query: 'myPrice=five' }],
    ['(b) 모르는 태그', { query: 'myPrice=ten&tags=how-9' }],
    ['(c) 같은 태그 두 번', { query: 'myPrice=ten&tags=how-1&tags=how-1' }],
    ['(d) 태그 17개', { query: `myPrice=ten&${[...TAG_IDS, 'how-1'].map((t) => `tags=${t}`).join('&')}` }],
    ['(e) PNG 바이트', { body: PNG_BYTES }],
    ['(e) 이미지가 아닌 것', { body: TEXT_BYTES }],
    ['(f) 상한 + 1바이트', { body: makeJpeg({ totalBytes: MAX_PHOTO_BYTES + 1 }) }],
    ['(g) EXIF GPS', { body: makeJpeg({ gps: true }) }],
    ['(g) XMP GPS', { body: makeJpeg({ xmpGps: true }) }],
    ['(h) 긴 변 1025px', { body: makeJpeg({ width: 1025, height: 700 }) }],
    ['빈 본문', { body: new Uint8Array(0) }],
    ['Content-Type 없음', { type: null }],
    ['Content-Type image/png + JPEG 바이트', { type: 'image/png' }],
  ];

  test.each(rejected)('AC-2%s → 400 invalid_input, Bedrock 0번', async (_, opts) => {
    const r = await call(opts);
    expect(r.status).toBe(400);
    expect(r.json).toEqual(INVALID);
    expect(send).not.toHaveBeenCalled();
    expect(r.entry.outcome).toBe('invalid_input');
  });

  test('AC-2(f) 상한과 정확히 같은 크기 → 200, Bedrock 1번', async () => {
    const r = await call({ body: makeJpeg({ totalBytes: MAX_PHOTO_BYTES }) });
    expect(r.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
  });

  test('AC-2 GPS 없이 다른 EXIF만 → 200, Bedrock 1번', async () => {
    const r = await call({ body: makeJpeg({ otherExif: true }) });
    expect(r.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
  });

  test('Content-Length가 상한보다 크면 본문을 읽기 전에 400', async () => {
    const before = lines.length;
    const r = await rawPost(`${base}/api/appraise?myPrice=ten`, {
      headers: { 'content-type': 'image/jpeg', 'content-length': String(MAX_PHOTO_BYTES + 1) },
    });
    expect(r.status).toBe(400);
    expect(JSON.parse(r.text)).toEqual(INVALID);
    expect(send).not.toHaveBeenCalled();
    expect(lastLogLine(before).reason).toBe('too_large');
  });

  test('GET → 405, 다른 경로 → 404, 본문은 둘 다 invalid_input', async () => {
    const get = await call({ method: 'GET', body: null });
    expect(get.status).toBe(405);
    expect(get.json).toEqual(INVALID);
    const other = await call({ path: '/api/other' });
    expect(other.status).toBe(404);
    expect(other.json).toEqual(INVALID);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('실패 모양 (contracts/appraise-http.md §5)', () => {
  test('모델 출력이 깨짐 → 503 unavailable', async () => {
    send = vi.fn(async () => converseReply('흠 좋구먼'));
    const r = await call();
    expect(r.status).toBe(503);
    expect(r.json).toEqual({ code: 'unavailable' });
    expect(r.entry.reason).toBe('not_json');
  });

  test('{"refuse":true} → 422 refused', async () => {
    send = vi.fn(async () => converseReply(JSON.stringify({ refuse: true })));
    const r = await call();
    expect(r.status).toBe(422);
    expect(r.json).toEqual({ code: 'refused' });
    expect(r.entry.reason).toBe('model_refused');
  });

  test('Bedrock 오류(AccessDenied) → 503 unavailable', async () => {
    send = vi.fn(async () => {
      throw Object.assign(new Error('no'), { name: 'AccessDeniedException', $metadata: { httpStatusCode: 403 } });
    });
    const r = await call();
    expect(r.status).toBe(503);
    expect(r.json).toEqual({ code: 'unavailable' });
    expect(r.entry.reason).toBe('bedrock_AccessDeniedException');
  });

  test('send가 예상 못 한 값 → 500 unavailable, 서버는 다음 요청을 받는다', async () => {
    send = vi.fn(async () => undefined);
    const r = await call();
    expect(r.status).toBe(500);
    expect(r.json).toEqual({ code: 'unavailable' });
    expect(r.entry.reason).toBe('internal');

    send = vi.fn(async () => converseReply(JSON.stringify({ grade: 2, line: '쓸 만하구먼' })));
    const next = await call();
    expect(next.status).toBe(200);
  });

  test('브라우저가 끊으면 Bedrock 호출을 멈추고 client_closed로 1줄', async () => {
    send = vi.fn(() => new Promise(() => {}));
    const before = lines.length;
    const ac = new AbortController();
    const body = makeJpeg();
    photos.push(body);
    const pending = fetch(`${base}/api/appraise?myPrice=ten`, {
      method: 'POST',
      headers: { 'content-type': 'image/jpeg' },
      body,
      signal: ac.signal,
    }).catch(() => {});
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    ac.abort();
    await pending;
    await vi.waitFor(() => expect(lines.length).toBe(before + 1));
    expect(JSON.parse(lines.at(-1)).reason).toBe('client_closed');
    expect(send.mock.calls[0][1].abortSignal.aborted).toBe(true);
  });
});

describe('진짜 클라이언트 설정 · 묶임', () => {
  test('makeBedrockClient: SDK 자체 재시도 끔(maxAttempts 1) · 리전은 config', async () => {
    const client = makeBedrockClient();
    expect(await client.config.maxAttempts()).toBe(1);
    expect(await client.config.region()).toBe(AWS_REGION);
  });

  test('startServer는 127.0.0.1에만 묶인다', async () => {
    const s = await startServer({ port: 0, send, log: () => {} });
    try {
      expect(s.address().address).toBe('127.0.0.1');
    } finally {
      await new Promise((resolve) => s.close(resolve));
    }
  });
});

describe('AC-6 로그에 사진·비밀값이 없다', () => {
  test('모은 로그 전체에 표식·사진 base64·hex·가짜 자격 증명 0번', () => {
    expect(lines.length).toBeGreaterThan(20);
    const all = lines.join('\n');
    const mark = Buffer.from(PHOTO_MARK, 'latin1');
    for (const needle of [PHOTO_MARK, mark.toString('base64'), mark.toString('hex'), FAKE_KEY_ID, FAKE_SECRET]) {
      expect(all).not.toContain(needle);
    }
    for (const p of photos) {
      if (p.length > 0) expect(all).not.toContain(Buffer.from(p).toString('base64'));
    }
  });
});

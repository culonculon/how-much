import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  AWS_REGION,
  MAX_OUTPUT_TOKENS,
  MAX_PHOTO_BYTES,
  MODEL_ID,
  REJECT_DRAIN_BYTES,
  TEMPERATURE,
  TOP_K,
} from '../src/config.js';
import { mochiOf } from '../src/grades.js';
import { TAG_IDS } from '../src/input.js';
import { createMemo } from '../src/memo.js';
import { createServer, makeBedrockClient, startServer } from '../src/server.js';
import {
  collectLog,
  converseReply,
  listen,
  makeJpeg,
  PHOTO_MARK,
  PNG_BYTES,
  TEXT_BYTES,
  streamChunked,
  uploadAfterResponse,
} from './helpers.js';
import { tempDailyLimit } from './temp-daily-limit.js';
import { testPersonLimit } from './test-person-limit.js';

// CAREER-31 AC-9: 이 파일 프로세스의 경고를 모은다 — 맨 아래 afterAll이 MaxListenersExceededWarning 0개를 본다
// (10/24 G7 재현: 경고는 이 파일에서 helpers.js uploadAfterResponse의 req.once('drain').once('close')로 났다)
const warnings = [];
process.on('warning', (w) => warnings.push(w.name));

const FAKE_KEY_ID = 'AKIAHOWMUCHFAKEKEY01';
const FAKE_SECRET = 'howmuch-fake-secret-value';
process.env.AWS_ACCESS_KEY_ID = FAKE_KEY_ID;
process.env.AWS_SECRET_ACCESS_KEY = FAKE_SECRET;

const { lines, log } = collectLog();
const daily = tempDailyLimit(); // CAREER-27: 진짜 셈 파일을 건드리지 않는다
afterAll(() => daily.cleanup());
const photos = []; // AC-6: 보낸 사진 전부
let send; // 테스트마다 바꾸는 가짜 Bedrock
let server;
let base;

beforeAll(async () => {
  // AC-1~6은 기억과 따로 본다(같은 사진을 여러 번 보냄) — 기억은 memo.test.js(AC-17)
  server = createServer({ send: (...args) => send(...args), log, memo: createMemo({ maxEntries: 0 }), dailyLimit: daily.dailyLimit, personLimit: testPersonLimit() });
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
    // 같은 사진 같은 등급(결정 K): 온도 0 + topK 1(10/22 사용자 승인 — E3에서 온도 0만으로 흔들림)
    expect(input.inferenceConfig).toEqual({ maxTokens: MAX_OUTPUT_TOKENS, temperature: TEMPERATURE });
    expect(input.additionalModelRequestFields).toEqual({ inferenceConfig: { topK: TOP_K } });
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
    const s = await startServer({ port: 0, send, log: () => {}, dailyLimit: daily.dailyLimit });
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

describe('AC-2(f) 거절 뒤 남은 업로드 (plan 거절 뒤 남은 업로드 · A6)', () => {
  const SLACK = 100_000; // 한 번 읽는 덩어리 64KiB + 헤더·chunk 틀 여유

  async function own() {
    const lines = [];
    let send = vi.fn(async () => converseReply(JSON.stringify({ grade: 2, line: '쓸 만하구먼' })));
    const sockets = [];
    const s = createServer({ send: (...a) => send(...a), log: (l) => lines.push(l), memo: createMemo({ maxEntries: 0 }), dailyLimit: daily.dailyLimit, personLimit: testPersonLimit() });
    s.on('connection', (sock) => sockets.push(sock));
    const base = await listen(s);
    return {
      base,
      lines,
      sockets,
      get send() {
        return send;
      },
      close: () => new Promise((r) => s.close(r)),
      bytesRead: async () => {
        await Promise.all(sockets.map((k) => (k.closed ? null : new Promise((r) => k.once('close', r)))));
        return sockets.reduce((n, k) => n + k.bytesRead, 0);
      },
    };
  }

  test.each([
    ['Connection: close', false],
    ['keep-alive', true],
  ])('(1) 상한 + 1바이트를 끝까지 올려도 400 invalid_input을 받는다 — %s', async (_, keepAlive) => {
    const o = await own();
    try {
      const body = makeJpeg({ totalBytes: MAX_PHOTO_BYTES + 1 });
      photos.push(body);
      const r = await uploadAfterResponse(`${o.base}/api/appraise?myPrice=ten`, {
        headers: { 'content-type': 'image/jpeg', 'content-length': String(body.length) },
        body,
        keepAlive,
      });
      expect(r.status).toBe(400);
      expect(JSON.parse(r.text)).toEqual(INVALID);
      expect(r.errors).toEqual([]);
      expect(r.finished).toBe(true); // 본문을 끝까지 올렸다(서버가 먼저 끊지 않음)
      expect(o.send).not.toHaveBeenCalled();
      expect(o.lines).toHaveLength(1);
      expect(JSON.parse(o.lines[0]).reason).toBe('too_large');
    } finally {
      await o.close();
    }
  });

  test('(2) 다른 거절(쿼리)도 남은 본문은 한도까지만 읽는다 — chunked 3,000,000바이트', async () => {
    const o = await own();
    try {
      const body = Buffer.alloc(3_000_000, 0x5a);
      const r = await uploadAfterResponse(`${o.base}/api/appraise?myPrice=five`, {
        headers: { 'content-type': 'image/jpeg' },
        body,
        keepAlive: true,
      });
      expect(r.status).toBe(400);
      expect(await o.bytesRead()).toBeLessThan(REJECT_DRAIN_BYTES + SLACK);
      expect(o.lines).toHaveLength(1);
      expect(JSON.parse(o.lines[0]).reason).toBe('bad_my_price');
    } finally {
      await o.close();
    }
  });

  test('(3) Content-Length가 한도보다 크면 400을 주고 끊는다', async () => {
    const o = await own();
    try {
      const body = Buffer.alloc(3_000_000, 0x5a);
      const r = await uploadAfterResponse(`${o.base}/api/appraise?myPrice=ten`, {
        headers: { 'content-type': 'image/jpeg', 'content-length': String(body.length) },
        body,
      });
      expect(r.status).toBe(400);
      expect(JSON.parse(r.text)).toEqual(INVALID);
      expect(await o.bytesRead()).toBeLessThan(REJECT_DRAIN_BYTES + SLACK);
      expect(o.lines).toHaveLength(1);
      expect(JSON.parse(o.lines[0]).reason).toBe('too_large');
    } finally {
      await o.close();
    }
  });

  test('(4) 버리며 읽는 중에 끊겨도 서버는 다음 요청을 받고 로그는 1줄', async () => {
    const o = await own();
    try {
      const body = makeJpeg({ totalBytes: MAX_PHOTO_BYTES + 1 });
      await uploadAfterResponse(`${o.base}/api/appraise?myPrice=ten`, {
        headers: { 'content-type': 'image/jpeg', 'content-length': String(body.length) },
        body,
        destroyAfter: 500_000,
      });
      const res = await fetch(`${o.base}/api/appraise?myPrice=ten`, {
        method: 'POST',
        headers: { 'content-type': 'image/jpeg' },
        body: makeJpeg(),
      });
      expect(res.status).toBe(200);
      expect(o.send).toHaveBeenCalledTimes(1);
      expect(o.lines.map((l) => JSON.parse(l).reason)).toEqual(['too_large', null]);
    } finally {
      await o.close();
    }
  });
  test('CAREER-31 AC-8 Content-Length 없이 큰 사진을 올려도 400 응답을 끝까지 받는다 (30번)', { timeout: 60_000 }, async () => {
    const o = await own();
    try {
      const bad = [];
      for (let i = 0; i < 30; i++) {
        const r = await streamChunked(`${o.base}/api/appraise?myPrice=ten`, {
          headers: { 'content-type': 'image/jpeg' },
          total: 3_000_000,
        });
        if (!(r.status === 400 && r.text === '{"code":"invalid_input"}' && r.complete)) {
          bad.push({ i, status: r.status, text: r.text, complete: r.complete });
        }
      }
      expect(bad).toEqual([]);
      expect(o.send).not.toHaveBeenCalled();
      expect(o.lines).toHaveLength(30);
      expect(o.lines.every((l) => JSON.parse(l).reason === 'too_large')).toBe(true);
    } finally {
      await o.close();
    }
  });
});

describe('CAREER-31 AC-10 로그를 못 써도 조용히 사라지지 않는다', () => {
  test('CAREER-31 AC-10 로그 실패는 응답을 바꾸지 않고 표준 오류에 log_failed 한 줄 · 내용 0번', async () => {
    const okLines = [];
    const servers = [
      createServer({ send: (...a) => send(...a), log: (l) => okLines.push(l), memo: createMemo({ maxEntries: 0 }), dailyLimit: daily.dailyLimit, personLimit: testPersonLimit() }),
      createServer({
        send: (...a) => send(...a),
        log: () => {
          throw new TypeError('HOWMUCH-LOG-SECRET');
        },
        memo: createMemo({ maxEntries: 0 }),
        dailyLimit: daily.dailyLimit,
        personLimit: testPersonLimit(),
      }),
    ];
    const bases = [];
    for (const s of servers) bases.push(await listen(s));
    const spy = vi.spyOn(process.stderr, 'write');
    try {
      const body = makeJpeg({ width: 777 });
      const results = [];
      for (const b of bases) {
        const res = await fetch(`${b}/api/appraise?myPrice=ten`, { method: 'POST', headers: { 'content-type': 'image/jpeg' }, body });
        results.push({ status: res.status, text: await res.text() });
      }
      expect(results[1]).toEqual(results[0]);
      const written = spy.mock.calls.map((c) => String(c[0]));
      const failed = written.flatMap((w) => w.split('\n')).filter((l) => l.includes('log_failed'));
      expect(failed).toHaveLength(1);
      expect(JSON.parse(failed[0])).toEqual({ evt: 'log_failed', error: 'TypeError' });
      const all = written.join('');
      const mark = Buffer.from(PHOTO_MARK, 'latin1');
      for (const needle of ['HOWMUCH-LOG-SECRET', PHOTO_MARK, mark.toString('base64'), mark.toString('hex'), FAKE_SECRET]) {
        expect(all).not.toContain(needle);
      }
    } finally {
      spy.mockRestore();
      await Promise.all(servers.map((s) => new Promise((r) => s.close(r))));
    }
  });
});

// CAREER-31 AC-9: 이 파일에서 MaxListenersExceededWarning이 나지 않는다(경고 끄기 금지 — plan 실패 시나리오 19)
afterAll(async () => {
  await new Promise((r) => setImmediate(r));
  expect(warnings.filter((n) => n === 'MaxListenersExceededWarning')).toEqual([]);
});

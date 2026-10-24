// 감정 서버 — 원본: contracts/appraise-http.md, plan '요청 한 건의 흐름'.
// 쿼리 → 헤더·크기 → JPEG → Bedrock(재시도·시간 제한) → 모델 출력 → 등급 표 → { mochi, line }.
// 어디서 끝나든 요청 1건에 로그 1줄(사진·쿼리 원문·모델 원문·오류 통째·환경변수는 넣지 않음).
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { callWithRetry, UpstreamError } from './bedrock.js';
import {
  AWS_REGION,
  DAILY_CALL_LIMIT,
  DEFAULT_PORT,
  HOST,
  MAX_PHOTO_BYTES,
  MEMO_MAX_ENTRIES,
  PERSON_DAY_LIMIT,
  PERSON_HEADER,
  PERSON_MAX_ENTRIES,
  PERSON_MINUTE_LIMIT,
  PERSON_WINDOW_MS,
  REJECT_DRAIN_BYTES,
  USAGE_FILE,
} from './config.js';
import { createDailyLimit, DailyLimitError, UsageStoreError } from './daily-limit.js';
import { mochiOf } from './grades.js';
import { checkQuery, InputError } from './input.js';
import { checkJpeg } from './jpeg.js';
import { createMemo, memoKey } from './memo.js';
import { OutputError, parseModelOutput } from './output.js';
import { createPersonLimit, PersonLimitError, personOf } from './person-limit.js';
import { buildConverseInput } from './prompt.js';

const PATH = '/api/appraise';

// 진짜 클라이언트는 여기서만 만든다. SDK 자체 재시도를 끈다(안 끄면 호출이 (1+2)×3번)
export function makeBedrockClient() {
  return new BedrockRuntimeClient({ region: AWS_REGION, maxAttempts: 1 });
}

class Reply {
  constructor(status, code, reason) {
    Object.assign(this, { status, code, reason });
  }
}
const invalid = (reason, status = 400) => new Reply(status, 'invalid_input', reason);

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let done = false;
    const finish = (fn, value) => {
      if (done) return;
      done = true;
      fn(value);
    };
    req.on('data', (chunk) => {
      if (done) return;
      size += chunk.length;
      if (size > MAX_PHOTO_BYTES) {
        // 상한을 넘는 순간 그만 모은다(메모리에 다 올리지 않음)
        finish(reject, invalid('too_large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => finish(resolve, Buffer.concat(chunks, size)));
    req.on('error', () => finish(reject, new UpstreamError('client_closed', 0)));
  });
}

async function appraise(req, res, entry, send, memo, dailyLimit, personLimit) {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname !== PATH) throw invalid('bad_path', 404);
  if (req.method !== 'POST') throw invalid('bad_method', 405);

  // 사람별 문(CAREER-31): 본문을 읽기 전, 경로·메서드를 지난 요청마다 1번 센다(기억 hit·입력 거절 포함)
  const person = personOf(req.headers[PERSON_HEADER]);
  entry.who = person.who;
  const used = personLimit.take(person.key);
  entry.personMinute = used.minuteUsed;
  entry.personDay = used.dayUsed;

  const { tags } = checkQuery(url.searchParams);

  if (req.headers['content-type'] !== 'image/jpeg') throw invalid('bad_content_type');
  const declared = req.headers['content-length'];
  if (declared !== undefined && Number(declared) > MAX_PHOTO_BYTES) {
    throw invalid('too_large'); // 읽기 전에 거절(남은 본문은 writeJson이 한도까지 버림)
  }
  const photo = await readBody(req);
  if (photo.length === 0) throw invalid('empty_body');
  checkJpeg(photo);

  // 같은 사진·같은 태그면 기억한 결과(AC-17) — JPEG 검사 뒤, Bedrock 앞
  let key = null;
  let parsed;
  if (memo.enabled) {
    key = memoKey(photo, tags);
    parsed = memo.get(key);
    entry.memo = parsed ? 'hit' : 'miss';
  } else {
    entry.memo = 'off';
  }

  if (!parsed) parsed = await askModel(req, res, entry, send, photo, tags, memo, key, dailyLimit);

  if (parsed.refused) throw new Reply(422, 'refused', 'model_refused');
  entry.grade = parsed.grade;
  return { status: 200, body: { mochi: mochiOf(parsed.grade), line: parsed.line } };
}

async function askModel(req, res, entry, send, photo, tags, memo, key, dailyLimit) {
  // 브라우저가 끊으면 Bedrock 호출도 멈춘다
  const clientGone = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) clientGone.abort();
  });

  const command = new ConverseCommand(buildConverseInput({ photo, tags }));
  // 하루 셈 문: 시도마다 셈을 1 올려 파일에 다 쓴 뒤에만 보낸다(CAREER-27, ADR-0004)
  const beforeAttempt = () => {
    const r = dailyLimit.take();
    entry.day = r.day;
    entry.dayUsed = r.used;
  };
  const { response, attempts } = await callWithRetry(send, command, { signal: clientGone.signal, beforeAttempt });
  entry.attempts = attempts;

  const { output, stopReason, usage } = response; // 모양이 아예 다르면 여기서 internal
  entry.inputTokens = usage?.inputTokens ?? null;
  entry.outputTokens = usage?.outputTokens ?? null;
  const text = output?.message?.content?.find((c) => typeof c.text === 'string')?.text;

  const parsed = parseModelOutput(text, stopReason);
  if (!memo.enabled) return parsed;
  // 기억에 넣는 곳은 여기 하나뿐 — 감정·거절만(실패는 위에서 던져 여기 오지 않음)
  const earlier = memo.get(key);
  if (earlier) {
    entry.memo = 'raced'; // 같은 열쇠 동시 요청이 먼저 기억됨 → 그 값으로 응답(두 응답이 같게)
    return earlier;
  }
  return memo.remember(key, parsed);
}

function toReply(err) {
  if (err instanceof Reply) return err;
  if (err instanceof InputError) return invalid(err.reason);
  if (err instanceof OutputError) return new Reply(503, 'unavailable', err.reason);
  if (err instanceof UpstreamError) return new Reply(503, 'unavailable', err.reason);
  if (err instanceof PersonLimitError) return new Reply(429, 'person_limit', err.reason);
  if (err instanceof DailyLimitError) return new Reply(429, 'daily_limit', err.reason);
  if (err instanceof UsageStoreError) return new Reply(503, 'unavailable', err.reason);
  return new Reply(500, 'unavailable', 'internal');
}

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

// 본문을 다 읽기 전에 응답하면(거절) — plan '거절 뒤 남은 업로드' (10/22 PR #11 뒤):
// 응답 헤더·본문을 먼저 쓰고, 남은 본문을 REJECT_DRAIN_BYTES까지 읽어 버린 뒤 응답을 끝낸다.
// 바로 닫으면 보내는 쪽(브라우저)이 아직 올리는 중이라 400 대신 네트워크 오류를 본다(EPIPE).
function writeJson(req, res, status, body, readBytes) {
  if (res.headersSent || res.destroyed) return;
  const text = JSON.stringify(body);
  if (req.complete) {
    res.writeHead(status, JSON_HEADERS);
    res.end(text);
    return;
  }
  const declared = Number(req.headers['content-length']);
  if (declared > REJECT_DRAIN_BYTES) {
    // 처음부터 한도보다 큼: 읽지 않고 끝내고 닫는다(보내는 쪽은 쓰기 오류를 볼 수 있음)
    res.writeHead(status, { ...JSON_HEADERS, Connection: 'close' });
    res.end(text);
    return;
  }
  let drained = readBytes();
  const stop = () => {
    req.off('data', onData);
    req.off('end', onEnd);
  };
  const onData = (chunk) => {
    drained += chunk.length;
    if (drained > REJECT_DRAIN_BYTES) {
      stop();
      res.end();
      req.socket.destroy(); // 한도를 넘음: 응답은 이미 보냈다
    }
  };
  const onEnd = () => {
    stop();
    res.end();
  };
  req.on('data', onData);
  req.on('end', onEnd);
  req.once('aborted', stop);
  req.once('close', stop);
  res.writeHead(status, { ...JSON_HEADERS, Connection: 'close' });
  res.write(text);
  req.resume();
}

export function createServer({
  send,
  log = (line) => console.log(line),
  memo = createMemo({ maxEntries: MEMO_MAX_ENTRIES }), // 서버 인스턴스마다 새로(전역 상태 없음)
  dailyLimit, // 하루 셈 — 기본값 없음: 상한을 거치지 않는 호출 길을 만들지 않는다(CAREER-27 D4)
  personLimit, // 사람별 셈 — 기본값 없음(같은 이유, CAREER-31 D6)
} = {}) {
  if (typeof dailyLimit?.take !== 'function') throw new TypeError('dailyLimit이 필요하다');
  if (typeof personLimit?.take !== 'function') throw new TypeError('personLimit이 필요하다');
  return http.createServer(async (req, res) => {
    const started = performance.now();
    let readBytes = 0; // 이 요청에서 읽은 본문 바이트(거절 뒤 버림 한도에 함께 셈)
    req.on('data', (chunk) => {
      readBytes += chunk.length;
    });
    const entry = {
      evt: 'appraise',
      outcome: 'ok',
      reason: null,
      ms: 0,
      attempts: 0,
      inputTokens: null,
      outputTokens: null,
      grade: null,
      memo: null, // null · off · hit · miss · raced (열쇠 해시는 남기지 않음)
      day: null, // 하루 셈 날짜(셈을 거친 요청만)
      dayUsed: null, // 그 시점 그날 셈
      who: null, // 사람 열쇠를 만든 방법(ip4 · ip6 · none · bad) — 주소·해시는 남기지 않는다(plan A2 답)
      personMinute: null, // 그 사람 최근 1분 요청 수
      personDay: null, // 그 사람 그날 요청 수
    };
    let status;
    let body;
    try {
      ({ status, body } = await appraise(req, res, entry, send, memo, dailyLimit, personLimit));
    } catch (err) {
      const reply = toReply(err);
      if (typeof err?.attempts === 'number') entry.attempts = err.attempts;
      if (err instanceof PersonLimitError) {
        entry.personMinute = err.minuteUsed;
        entry.personDay = err.dayUsed;
      }
      if (err instanceof DailyLimitError) {
        entry.day = err.day;
        entry.dayUsed = err.used;
      }
      ({ status } = reply);
      body = { code: reply.code };
      entry.outcome = reply.code;
      entry.reason = reply.reason;
    }
    entry.ms = Math.round(performance.now() - started);
    try {
      log(JSON.stringify(entry));
    } catch {
      // 로그가 실패해도 응답은 보낸다
    }
    writeJson(req, res, status, body, () => readBytes);
  });
}

// 시작 점검 실패(CAREER-31 AC-7). 메시지·경로·프로필 이름은 담지 않는다 — 원래 오류의 이름만(plan A4 답)
export class StartupError extends Error {
  constructor(reason, causeName) {
    super(reason);
    this.name = 'StartupError';
    this.reason = reason; // no_credentials
    this.causeName = causeName;
  }
}

// 직접 실행 경로: 127.0.0.1에만 묶는다(환경변수로 바꾸지 않음)
export async function startServer({
  port = Number(process.env.PORT ?? DEFAULT_PORT),
  send,
  log,
  dailyLimit = createDailyLimit({ file: USAGE_FILE, limit: DAILY_CALL_LIMIT }),
  personLimit = createPersonLimit({
    minuteLimit: PERSON_MINUTE_LIMIT,
    windowMs: PERSON_WINDOW_MS,
    dayLimit: PERSON_DAY_LIMIT,
    maxEntries: PERSON_MAX_ENTRIES,
  }),
} = {}) {
  let realSend = send;
  if (!realSend) {
    const client = makeBedrockClient();
    // listen 전에 SDK가 쓰는 바로 그 사슬을 한 번 푼다 — Bedrock·STS는 부르지 않는다(CAREER-31 AC-7)
    try {
      await client.config.credentials();
    } catch (err) {
      throw new StartupError('no_credentials', typeof err?.name === 'string' ? err.name : 'Unknown');
    }
    realSend = (command, options) => client.send(command, options);
  }
  const server = createServer({ send: realSend, log, dailyLimit, personLimit });
  return new Promise((resolve) => server.listen(port, HOST, () => resolve(server)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const server = await startServer();
    const { address, port } = server.address();
    console.log(JSON.stringify({ evt: 'listening', address, port }));
  } catch (err) {
    if (!(err instanceof StartupError)) throw err;
    console.log(JSON.stringify({ evt: 'startup_failed', reason: err.reason, error: err.causeName }));
    process.exitCode = 1; // process.exit은 파이프로 나가는 stdout을 덜 쓰고 끝낼 수 있어 쓰지 않는다
  }
}

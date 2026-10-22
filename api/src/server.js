// 감정 서버 — 원본: contracts/appraise-http.md, plan '요청 한 건의 흐름'.
// 쿼리 → 헤더·크기 → JPEG → Bedrock(재시도·시간 제한) → 모델 출력 → 등급 표 → { mochi, line }.
// 어디서 끝나든 요청 1건에 로그 1줄(사진·쿼리 원문·모델 원문·오류 통째·환경변수는 넣지 않음).
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { callWithRetry, UpstreamError } from './bedrock.js';
import { AWS_REGION, DEFAULT_PORT, HOST, MAX_PHOTO_BYTES } from './config.js';
import { mochiOf } from './grades.js';
import { checkQuery, InputError } from './input.js';
import { checkJpeg } from './jpeg.js';
import { OutputError, parseModelOutput } from './output.js';
import { buildConverseInput } from './prompt.js';

const PATH = '/api/appraise';

// 진짜 클라이언트는 여기서만 만든다. SDK 자체 재시도를 끈다(안 끄면 호출이 (1+2)×3번)
export function makeBedrockClient() {
  return new BedrockRuntimeClient({ region: AWS_REGION, maxAttempts: 1 });
}

class Reply {
  constructor(status, code, reason, { close = false } = {}) {
    Object.assign(this, { status, code, reason, close });
  }
}
const invalid = (reason, status = 400, opts) => new Reply(status, 'invalid_input', reason, opts);

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
        finish(reject, invalid('too_large', 400, { close: true }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => finish(resolve, Buffer.concat(chunks, size)));
    req.on('error', () => finish(reject, new UpstreamError('client_closed', 0)));
  });
}

async function appraise(req, res, entry, send) {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname !== PATH) throw invalid('bad_path', 404);
  if (req.method !== 'POST') throw invalid('bad_method', 405);

  const { tags } = checkQuery(url.searchParams);

  if (req.headers['content-type'] !== 'image/jpeg') throw invalid('bad_content_type');
  const declared = req.headers['content-length'];
  if (declared !== undefined && Number(declared) > MAX_PHOTO_BYTES) {
    throw invalid('too_large', 400, { close: true }); // 읽기 전에 거절
  }
  const photo = await readBody(req);
  if (photo.length === 0) throw invalid('empty_body');
  checkJpeg(photo);

  // 브라우저가 끊으면 Bedrock 호출도 멈춘다
  const clientGone = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) clientGone.abort();
  });

  const command = new ConverseCommand(buildConverseInput({ photo, tags }));
  const { response, attempts } = await callWithRetry(send, command, { signal: clientGone.signal });
  entry.attempts = attempts;

  const { output, stopReason, usage } = response; // 모양이 아예 다르면 여기서 internal
  entry.inputTokens = usage?.inputTokens ?? null;
  entry.outputTokens = usage?.outputTokens ?? null;
  const text = output?.message?.content?.find((c) => typeof c.text === 'string')?.text;

  const parsed = parseModelOutput(text, stopReason);
  if (parsed.refused) throw new Reply(422, 'refused', 'model_refused');
  entry.grade = parsed.grade;
  return { status: 200, body: { mochi: mochiOf(parsed.grade), line: parsed.line } };
}

function toReply(err) {
  if (err instanceof Reply) return err;
  if (err instanceof InputError) return invalid(err.reason);
  if (err instanceof OutputError) return new Reply(503, 'unavailable', err.reason);
  if (err instanceof UpstreamError) return new Reply(503, 'unavailable', err.reason);
  return new Reply(500, 'unavailable', 'internal');
}

function writeJson(res, status, body, close) {
  if (res.headersSent || res.destroyed) return;
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(close ? { Connection: 'close' } : {}),
  });
  res.end(JSON.stringify(body));
}

export function createServer({ send, log = (line) => console.log(line) } = {}) {
  return http.createServer(async (req, res) => {
    const started = performance.now();
    const entry = {
      evt: 'appraise',
      outcome: 'ok',
      reason: null,
      ms: 0,
      attempts: 0,
      inputTokens: null,
      outputTokens: null,
      grade: null,
    };
    let status;
    let body;
    let close = false;
    try {
      ({ status, body } = await appraise(req, res, entry, send));
    } catch (err) {
      const reply = toReply(err);
      if (err instanceof UpstreamError) entry.attempts = err.attempts;
      ({ status, close } = reply);
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
    writeJson(res, status, body, close);
    if (close) req.resume(); // 남은 업로드는 버리며 흘려보낸다(연결은 응답 뒤 닫힘)
  });
}

// 직접 실행 경로: 127.0.0.1에만 묶는다(환경변수로 바꾸지 않음)
export function startServer({ port = Number(process.env.PORT ?? DEFAULT_PORT), send, log } = {}) {
  let realSend = send;
  if (!realSend) {
    const client = makeBedrockClient();
    realSend = (command, options) => client.send(command, options);
  }
  const server = createServer({ send: realSend, log });
  return new Promise((resolve) => server.listen(port, HOST, () => resolve(server)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await startServer();
  const { address, port } = server.address();
  console.log(JSON.stringify({ evt: 'listening', address, port }));
}

// Bedrock 호출 — 좁은 재시도와 요청 1건 전체 시간 제한. 원본: plan '열린 질문 6 답'·실패 시나리오 2.
// send는 밖에서 넣는다(진짜는 BedrockRuntimeClient.send, maxAttempts: 1). 테스트는 가짜 send.
import { MAX_RETRIES, RETRY_BACKOFF_MS, TIMEOUT_MS } from './config.js';

export class UpstreamError extends Error {
  constructor(reason, attempts) {
    super(reason);
    this.name = 'UpstreamError';
    this.reason = reason;
    this.attempts = attempts;
  }
}

const RETRY_NAMES = new Set([
  'ThrottlingException',
  'ServiceUnavailableException',
  'InternalServerException',
  'ModelNotReadyException',
  'TimeoutError', // SDK 연결 시간 초과
]);
const RETRY_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT', 'EAI_AGAIN']);

function isRetryable(err) {
  if (RETRY_NAMES.has(err?.name)) return true;
  if (RETRY_CODES.has(err?.code)) return true;
  const status = err?.$metadata?.httpStatusCode;
  return typeof status === 'number' && status >= 500;
}

// 로그 이유: 오류 이름. 이름이 그냥 Error면 연결 오류 코드를 쓴다. 메시지·스택은 넣지 않는다(AC-6)
function reasonOf(err) {
  const name = err?.name && err.name !== 'Error' ? err.name : err?.code || err?.name || 'Unknown';
  return `bedrock_${name}`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function callWithRetry(
  send,
  command,
  { timeoutMs = TIMEOUT_MS, maxRetries = MAX_RETRIES, backoffMs = RETRY_BACKOFF_MS, signal, beforeAttempt } = {},
) {
  const controller = new AbortController();
  let attempts = 0;
  // 시간 제한이나 브라우저 끊김이 오면 이 약속이 먼저 끝난다 — send가 abort를 무시해도
  let stopWith;
  const deadline = new Promise((_, reject) => {
    stopWith = (reason) => {
      controller.abort();
      reject(new UpstreamError(reason, attempts));
    };
  });
  deadline.catch(() => {}); // 경주 밖에서 터져도 처리되지 않은 거절이 되지 않게
  const timer = setTimeout(() => stopWith('timeout'), timeoutMs);
  const onClientGone = () => stopWith('client_closed');
  if (signal?.aborted) onClientGone();
  else signal?.addEventListener('abort', onClientGone, { once: true });

  try {
    for (;;) {
      // 하루 셈 문(CAREER-27): 시도마다 send 바로 앞. 던지면 그 오류 그대로 + 지금까지 보낸 수
      if (beforeAttempt) {
        try {
          beforeAttempt();
        } catch (err) {
          throw Object.assign(err, { attempts });
        }
      }
      attempts += 1;
      try {
        const response = await Promise.race([send(command, { abortSignal: controller.signal }), deadline]);
        return { response, attempts };
      } catch (err) {
        if (err instanceof UpstreamError) throw err; // 시간 제한 · 브라우저 끊김
        if (!isRetryable(err) || attempts > maxRetries) {
          throw new UpstreamError(reasonOf(err), attempts);
        }
      }
      const wait = backoffMs[Math.min(attempts - 1, backoffMs.length - 1)];
      await Promise.race([sleep(wait), deadline]);
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onClientGone);
  }
}

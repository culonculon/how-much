import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { callWithRetry, UpstreamError } from '../src/bedrock.js';
import { MAX_RETRIES, RETRY_BACKOFF_MS, TIMEOUT_MS } from '../src/config.js';

const COMMAND = { fake: 'command' };
const awsError = (name, status) =>
  Object.assign(new Error('x'), { name, $metadata: { httpStatusCode: status } });

// 끝났는지 · 값 · 오류를 들여다보는 꼬리표
function track(promise) {
  const t = { settled: false, value: undefined, error: undefined };
  promise.then(
    (v) => Object.assign(t, { settled: true, value: v }),
    (e) => Object.assign(t, { settled: true, error: e }),
  );
  return t;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('AC-4 일시 오류만 다시 시도한다', () => {
  const retried = [
    ['(a) ThrottlingException 429', () => awsError('ThrottlingException', 429), 'bedrock_ThrottlingException'],
    ['(b) InternalServerException 500', () => awsError('InternalServerException', 500), 'bedrock_InternalServerException'],
    ['(b) 이름 모름 + 503', () => awsError('SomethingNew', 503), 'bedrock_SomethingNew'],
    ['(c) 연결 끊김 ECONNRESET', () => Object.assign(new Error('x'), { code: 'ECONNRESET' }), 'bedrock_ECONNRESET'],
  ];

  test.each(retried)('AC-4%s → 호출 1 + MAX_RETRIES번 뒤 실패', async (_, makeErr, reason) => {
    const send = vi.fn().mockImplementation(() => Promise.reject(makeErr()));
    const t = track(callWithRetry(send, COMMAND));
    await vi.runAllTimersAsync();
    expect(t.settled).toBe(true);
    expect(send).toHaveBeenCalledTimes(1 + MAX_RETRIES);
    expect(t.error).toBeInstanceOf(UpstreamError);
    expect(t.error.reason).toBe(reason);
    expect(t.error.attempts).toBe(1 + MAX_RETRIES);
  });

  const immediate = [
    ['(d) AccessDeniedException 403', awsError('AccessDeniedException', 403)],
    ['(e) ValidationException 400', awsError('ValidationException', 400)],
  ];

  test.each(immediate)('AC-4%s → 호출 1번, 대기 없이 바로 실패', async (_, err) => {
    const send = vi.fn().mockRejectedValue(err);
    const t = track(callWithRetry(send, COMMAND));
    await vi.advanceTimersByTimeAsync(0);
    expect(t.settled).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(t.error.reason).toBe(`bedrock_${err.name}`);
    expect(t.error.attempts).toBe(1);
  });

  test('첫 실패 뒤 RETRY_BACKOFF_MS[0] 전에는 두 번째 호출이 없다', async () => {
    const send = vi.fn().mockImplementation(() => Promise.reject(awsError('ThrottlingException', 429)));
    track(callWithRetry(send, COMMAND));
    await vi.advanceTimersByTimeAsync(RETRY_BACKOFF_MS[0] - 1);
    expect(send).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(send).toHaveBeenCalledTimes(2);
  });

  test('첫 호출 Throttling, 둘째 성공 → 성공 값과 attempts 2', async () => {
    const response = { output: 'ok' };
    const send = vi
      .fn()
      .mockRejectedValueOnce(awsError('ThrottlingException', 429))
      .mockResolvedValueOnce(response);
    const t = track(callWithRetry(send, COMMAND));
    await vi.runAllTimersAsync();
    expect(t.error).toBeUndefined();
    expect(t.value).toEqual({ response, attempts: 2 });
    expect(send).toHaveBeenCalledWith(COMMAND, expect.objectContaining({ abortSignal: expect.any(AbortSignal) }));
  });
});

describe('AC-5 서버가 무한정 기다리지 않는다', () => {
  test('send가 abort를 무시하고 영원히 기다려도 TIMEOUT_MS에 timeout으로 끝난다', async () => {
    const send = vi.fn().mockImplementation(() => new Promise(() => {}));
    const t = track(callWithRetry(send, COMMAND));
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS - 1);
    expect(t.settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(t.settled).toBe(true);
    expect(t.error).toBeInstanceOf(UpstreamError);
    expect(t.error.reason).toBe('timeout');
    expect(send.mock.calls[0][1].abortSignal.aborted).toBe(true);
  });

  test('재시도 대기 중에 시간이 다 되면 다음 시도를 하지 않는다', async () => {
    const send = vi.fn().mockImplementation(() => Promise.reject(awsError('ThrottlingException', 429)));
    const t = track(callWithRetry(send, COMMAND, { timeoutMs: RETRY_BACKOFF_MS[0] / 2 }));
    await vi.runAllTimersAsync();
    expect(t.error.reason).toBe('timeout');
    expect(send).toHaveBeenCalledTimes(1);
  });
});

// 하루 셈 — 서버가 하루 Bedrock 시도 수를 직접 센다. 원본: ADR-0004 · CAREER-27 plan 'A1 답' · contracts/appraise-http.md §5 '하루 상한'·§8.
// 읽기 → 비교 → 임시 파일에 쓰고 fsync → 이름 바꾸기를 모두 동기로, 사이에 await 없이 한다.
// Node는 한 스레드라 이 구간에 다른 요청이 끼지 못한다 → 잠금이 필요 없다(동시 요청에도 상한을 넘지 않음).
// 파일에는 날짜와 숫자만 들어간다(사진·요청 값은 들어가지 않음).
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DAY_UTC_OFFSET_HOURS } from './config.js';

// 상한에 걸림 → 429 daily_limit. limit_zero면 day·used는 null
export class DailyLimitError extends Error {
  constructor(reason, day, used) {
    super(reason);
    this.name = 'DailyLimitError';
    this.reason = reason; // limit_reached · limit_zero
    this.day = day;
    this.used = used;
  }
}

// 셈 저장소를 못 읽음 · 깨짐 · 못 씀 → 503 unavailable(그 시도는 보내지 않음). 경로·내용·원래 오류는 담지 않는다
export class UsageStoreError extends Error {
  constructor(reason) {
    super(reason);
    this.name = 'UsageStoreError';
    this.reason = reason; // usage_store_read · usage_store_corrupt · usage_store_write
  }
}

const HOUR_MS = 3_600_000;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// '오늘' = 서울(UTC+9) 날짜. 서머타임 없음
export function dayOf(ms) {
  return new Date(ms + DAY_UTC_OFFSET_HOURS * HOUR_MS).toISOString().slice(0, 10);
}

// 키 정확히 둘 · day 모양 · used 0 이상 안전 정수. 아니면 null(= 깨짐, 고쳐 읽지 않는다)
function parseUsage(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== 2 || !keys.includes('day') || !keys.includes('used')) return null;
  if (typeof value.day !== 'string' || !DAY_PATTERN.test(value.day)) return null;
  if (!Number.isSafeInteger(value.used) || value.used < 0) return null;
  return value;
}

export function createDailyLimit({ file, limit, now = Date.now }) {
  // 만들 때는 값만 검사하고 파일은 건드리지 않는다(AC-5 · AC-7 (b))
  if (!Number.isSafeInteger(limit) || limit < 0) throw new TypeError('limit은 0 이상 정수여야 한다');
  if (typeof file !== 'string' || file === '') throw new TypeError('file이 필요하다');

  // send 바로 앞마다 부른다. 셈을 1 올려 파일에 다 쓴 뒤 { day, used }를 돌려준다(Promise 아님)
  function take() {
    if (limit === 0) throw new DailyLimitError('limit_zero', null, null); // 급히 막기 — 디스크와 상관없이
    const today = dayOf(now());

    let text = null;
    try {
      text = readFileSync(file, 'utf8');
    } catch (err) {
      if (err?.code !== 'ENOENT') throw new UsageStoreError('usage_store_read'); // 파일 없음만 '처음'
    }

    let day = today;
    let used = 0;
    if (text !== null) {
      const stored = parseUsage(text);
      if (!stored) throw new UsageStoreError('usage_store_corrupt');
      // 오늘보다 앞이면 새 하루. 같거나 뒤(시계가 뒤로 감)면 그대로 — 새 상한이 생기지 않게
      if (stored.day >= today) ({ day, used } = stored);
    }
    if (used >= limit) throw new DailyLimitError('limit_reached', day, used);

    const next = { day, used: used + 1 };
    const tmp = `${file}.tmp`;
    try {
      mkdirSync(dirname(file), { recursive: true, mode: 0o700 }); // 새로 만들 때만 — 다른 사용자가 고쳐 상한을 새로 만들 수 없게(ADR-0005)
      writeFileSync(tmp, `${JSON.stringify(next)}\n`, { flush: true, mode: 0o600 });
      renameSync(tmp, file); // 같은 폴더 안 이름 바꾸기 — 읽는 쪽은 옛 파일이나 새 파일만 본다
    } catch {
      throw new UsageStoreError('usage_store_write');
    }
    return next;
  }

  return { take };
}

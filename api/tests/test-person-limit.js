// CAREER-31: 테스트용 사람별 셈 — 기본값은 넉넉히(plan D6·D7). 진짜 값(1분 5번 · 하루 50번)은 config.js
import { createPersonLimit } from '../src/person-limit.js';

export function testPersonLimit({ minuteLimit = 1000, dayLimit = 1000, windowMs = 60_000, maxEntries = 1000, now } = {}) {
  return createPersonLimit({ minuteLimit, windowMs, dayLimit, maxEntries, now });
}

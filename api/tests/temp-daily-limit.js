// CAREER-27: 테스트마다 따로 쓰는 하루 셈 — 진짜 셈 파일(api/var/usage.json)을 건드리지 않는다(plan 실패 시나리오 1)
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDailyLimit } from '../src/daily-limit.js';

export function tempDailyLimit({ limit = 1000, now = () => Date.parse('2026-11-08T12:00:00+09:00') } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'c27-'));
  const file = join(dir, 'var', 'usage.json');
  return {
    dailyLimit: createDailyLimit({ file, limit, now }),
    file,
    dir,
    read: () => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

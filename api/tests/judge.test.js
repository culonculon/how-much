import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const API_DIR = fileURLToPath(new URL('..', import.meta.url));

// Bedrock·네트워크 없이 판정 모드만 돌린다
function judgeFile(file) {
  const r = spawnSync(
    process.execPath,
    ['eval/run.js', '--judge', file, '--cases', 'eval/fixtures/cases.json'],
    { cwd: API_DIR, encoding: 'utf8' },
  );
  return { code: r.status, out: r.stdout + r.stderr };
}

describe('AC-13 시험 실행이 실패를 잡는다 (판정 모드)', () => {
  test('통과 파일 → 종료 코드 0', () => {
    const r = judgeFile('eval/fixtures/pass.json');
    expect(r.out).not.toContain('FAIL');
    expect(r.code).toBe(0);
  });

  const failing = [
    ['(a) 존댓말', 'fail-honorific', '01-mug.jpg', 2, 'honorific'],
    ['(b) 사람 가리키는 말', 'fail-person', '01-mug.jpg', 1, 'person'],
    ['(c) 31자 대사', 'fail-long-line', '03-note.jpg', 2, 'length'],
    ['(d) 감정해야 할 사진 거절', 'fail-false-refusal', '01-mug.jpg', 2, 'false_refusal'],
    ['(e) 등급 흔들림', 'fail-grade-drift', '01-mug.jpg', 2, 'grade_drift'],
    ['(f) 사진 속 지시대로 등급', 'fail-injection', '03-note.jpg', 1, 'injection'],
    ['거절해야 할 사진 감정', 'fail-missed-refusal', '02-screenshot.jpg', 1, 'missed_refusal'],
  ];

  test.each(failing)('AC-13%s → 0이 아님, 사진·회차·기준 출력', (_, name, photo, round, rule) => {
    const r = judgeFile(`eval/fixtures/${name}.json`);
    expect(r.code).not.toBe(0);
    const hit = r.out.split('\n').find((l) => l.includes(`rule=${rule}`));
    expect(hit, r.out).toBeDefined();
    expect(hit).toContain(`photo=${photo}`);
    expect(hit).toContain(`round=${round}`);
  });

  test('행이 모자라면(빈 결과 포함) incomplete로 실패', () => {
    const dir = mkdtempSync(join(tmpdir(), 'howmuch-judge-'));
    const pass = JSON.parse(readFileSync(join(API_DIR, 'eval/fixtures/pass.json'), 'utf8'));
    const short = join(dir, 'short.json');
    writeFileSync(short, JSON.stringify({ rounds: pass.rounds, rows: pass.rows.slice(1) }));
    const empty = join(dir, 'empty.json');
    writeFileSync(empty, JSON.stringify({ rounds: pass.rounds, rows: [] }));
    for (const f of [short, empty]) {
      const r = judgeFile(f);
      expect(r.code).not.toBe(0);
      expect(r.out).toContain('rule=incomplete');
    }
  });
});

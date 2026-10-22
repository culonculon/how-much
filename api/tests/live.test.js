import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test, vi } from 'vitest';
import { runLive } from '../eval/live.js';
import { mochiOf } from '../src/grades.js';
import { converseReply, makeJpeg } from './helpers.js';

const API_DIR = fileURLToPath(new URL('..', import.meta.url));
const ROW_KEYS = ['code', 'grade', 'line', 'mochi', 'ms', 'photo', 'refused', 'round'];

function photosDir(files) {
  const dir = mkdtempSync(join(tmpdir(), 'howmuch-live-'));
  for (const f of files) writeFileSync(join(dir, f), makeJpeg());
  return dir;
}

const CASES = [
  { file: '01-mug.jpg', expect: 'appraise', kinds: ['plain'] },
  { file: '02-sky.jpg', expect: 'refuse', kinds: ['plain'] },
];

// 사진마다 다른 답: 머그는 등급 3, 하늘은 거절
const replyFor = (bytesSeen) =>
  vi.fn(async (command) => {
    bytesSeen.push(command.input);
    const n = bytesSeen.length;
    return n <= 2
      ? converseReply(JSON.stringify({ grade: 3, line: '흠, 손때가 제법 묻었구먼' }))
      : converseReply(JSON.stringify({ refuse: true }));
  });

describe('E3 진짜 실행 모드 — 서버를 같은 프로세스·빈 포트로 띄워 HTTP로 부른다', () => {
  test('사진마다 K번 차례로 부르고, 결과 행은 정해진 필드뿐', async () => {
    const seen = [];
    const send = replyFor(seen);
    const result = await runLive({ send, cases: CASES, photosDir: photosDir(['01-mug.jpg', '02-sky.jpg']), rounds: 2 });

    expect(send).toHaveBeenCalledTimes(4);
    expect(result.stopped).toBeNull();
    expect(result.rounds).toBe(2);
    expect(result.rows.map((r) => [r.photo, r.round])).toEqual([
      ['01-mug.jpg', 1],
      ['01-mug.jpg', 2],
      ['02-sky.jpg', 1],
      ['02-sky.jpg', 2],
    ]);
    for (const r of result.rows) expect(Object.keys(r).sort()).toEqual(ROW_KEYS);
    expect(result.rows[0]).toMatchObject({ grade: 3, mochi: mochiOf(3), refused: false, code: null });
    expect(result.rows[2]).toMatchObject({ grade: null, mochi: null, line: null, refused: true, code: 'refused' });
    expect(Number.isInteger(result.rows[0].ms)).toBe(true);
  });

  test('모든 사진을 같은 입력으로 부른다 — myPrice=ten, 태그 없음', async () => {
    const seen = [];
    await runLive({ send: replyFor(seen), cases: CASES, photosDir: photosDir(['01-mug.jpg', '02-sky.jpg']), rounds: 2 });
    for (const input of seen) {
      const texts = input.messages.flatMap((m) => m.content).filter((c) => c.text).map((c) => c.text);
      expect(texts).toEqual(['사연 태그: 없음']);
    }
  });

  test('unavailable이 한 번 나오면 그 자리에서 멈춘다(남은 호출 0)', async () => {
    const send = vi.fn(async () => converseReply('흠 좋구먼'));
    const result = await runLive({ send, cases: CASES, photosDir: photosDir(['01-mug.jpg', '02-sky.jpg']), rounds: 2 });
    expect(send).toHaveBeenCalledTimes(1);
    expect(result.rows).toHaveLength(1);
    expect(result.stopped).toMatchObject({ photo: '01-mug.jpg', round: 1, code: 'unavailable' });
  });

  test('--yes 없이는 계획(호출 수·비용)만 보여 주고 부르지 않는다', () => {
    const r = spawnSync(
      process.execPath,
      ['eval/run.js', '--cases', 'eval/fixtures/cases.json', '--rounds', '2'],
      { cwd: API_DIR, encoding: 'utf8', env: { ...process.env, AWS_PROFILE: 'howmuch-should-not-be-used' } },
    );
    expect(r.status).toBe(2);
    expect(r.stdout).toContain('6번 호출');
    expect(r.stdout).toContain('--yes');
  });
});

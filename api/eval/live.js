// 진짜 실행 — 서버를 같은 프로세스·빈 포트(127.0.0.1)에 띄워 HTTP로 부른다(plan 실패 시나리오 11).
// 프롬프트·출력 검사·등급 표를 복사하지 않는다. AWS는 서버 안의 send만 부른다.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gradeOf } from '../src/grades.js';
import { createServer } from '../src/server.js';

// 모든 사진을 같은 입력으로: 내 값 10개, 태그 없음
const QUERY = 'myPrice=ten';

const emptyRow = (photo, round, ms) => ({
  photo, round, grade: null, mochi: null, line: null, refused: false, code: null, ms, memo: null,
});

export async function runLive({ send, cases, photosDir, rounds, memo, log = () => {}, onRow = () => {} }) {
  // 서버는 응답을 쓰기 전에 로그 1줄을 찍는다 → fetch가 끝났을 때 그 요청의 memo를 이미 쥐고 있다(차례 호출이라 1:1)
  let lastMemo = null;
  const tap = (line) => {
    try {
      lastMemo = JSON.parse(line).memo ?? null;
    } catch {
      lastMemo = null;
    }
    log(line);
  };
  const server = createServer({ send, log: tap, memo });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/appraise?${QUERY}`;
  const rows = [];
  let stopped = null;
  try {
    outer: for (const c of cases) {
      const photo = readFileSync(join(photosDir, c.file));
      for (let round = 1; round <= rounds; round += 1) {
        const started = performance.now();
        const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'image/jpeg' }, body: photo });
        const body = await res.json().catch(() => ({}));
        const row = emptyRow(c.file, round, Math.round(performance.now() - started));
        row.memo = lastMemo; // 줄이 없었으면 null — 판정기가 실패로 본다
        lastMemo = null;

        if (res.status === 200) {
          try {
            Object.assign(row, { grade: gradeOf(body.mochi), mochi: body.mochi, line: body.line });
          } catch {
            row.code = 'bad_mochi';
          }
        } else if (body.code === 'refused') {
          Object.assign(row, { refused: true, code: 'refused' });
        } else {
          row.code = typeof body.code === 'string' ? body.code : `http_${res.status}`;
        }

        rows.push(row);
        onRow(row);
        // unavailable·invalid_input 등이 나오면 그 자리에서 멈춘다(자격 증명·리전이 틀렸을 때 다 쓰지 않음)
        if (row.code && row.code !== 'refused') {
          stopped = row;
          break outer;
        }
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  return { rounds, rows, stopped };
}

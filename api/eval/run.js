// 시험 실행 — `--judge <결과 파일>`: 부르지 않고 판정만(AC-13). 진짜 실행은 tasks E3에서 더한다.
// 판정 경로는 server.js·SDK를 import하지 않는다(동적 import로 나눔).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const readJson = (p) => JSON.parse(readFileSync(resolve(p), 'utf8'));

async function judgeMode(resultsPath) {
  const { judge } = await import('./judge.js');
  // 목록 파일은 배열(tasks E2 검사 명령이 `.[]`로 읽음)
  const cases = readJson(option('--cases') ?? 'eval/cases.json');
  if (!Array.isArray(cases)) throw new Error('목록 파일은 배열이어야 해요');
  const results = readJson(resultsPath);
  const hits = judge(results, cases);
  for (const h of hits) {
    console.log(`FAIL rule=${h.rule} photo=${h.photo} round=${h.round} value=${JSON.stringify(h.value)}`);
  }
  const rows = Array.isArray(results.rows) ? results.rows.length : 0;
  console.log(`${hits.length === 0 ? 'PASS' : 'FAIL'} photos=${cases.length} rounds=${results.rounds} rows=${rows} hits=${hits.length}`);
  if (hits.length > 0) process.exitCode = 1;
}

const resultsPath = option('--judge');
if (resultsPath) {
  await judgeMode(resultsPath);
} else {
  console.error('진짜 실행(Bedrock 호출)은 아직 없어요 — tasks E3. 판정만: node eval/run.js --judge <결과 파일>');
  process.exitCode = 1;
}

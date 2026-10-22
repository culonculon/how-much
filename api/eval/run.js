// 시험 실행
//   node eval/run.js --judge <결과 파일>   부르지 않고 판정만(AC-13)
//   node eval/run.js [--yes]                진짜 Nova Pro로 사진마다 K번(AC-12). --yes 없으면 계획만 보여 준다
// 옵션: --cases <목록>(기본 eval/cases.json) · --photos <폴더>(기본 eval/photos) · --rounds <K>(기본 criteria.ROUNDS)
// 판정 경로는 server.js·SDK를 import하지 않는다(동적 import로 나눔).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const COST_PER_CALL_WON = 3; // Nova Pro 1건 약 3원(설계 메모 10/21, 바뀔 수 있음)

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const readJson = (p) => JSON.parse(readFileSync(resolve(p), 'utf8'));

function readCases() {
  // 목록 파일은 배열(tasks E2 검사 명령이 `.[]`로 읽음)
  const cases = readJson(option('--cases') ?? 'eval/cases.json');
  if (!Array.isArray(cases)) throw new Error('목록 파일은 배열이어야 해요');
  return cases;
}

async function report(results, cases) {
  const { judge, driftCounts } = await import('./judge.js');
  const hits = judge(results, cases);
  if (results.memo === 'off') {
    const drifts = driftCounts(results, cases);
    for (const d of drifts) console.log(`DRIFT photo=${d.photo} count=${d.count}`);
    console.log(`drift_total=${drifts.reduce((n, d) => n + d.count, 0)}`);
  }
  for (const h of hits) {
    console.log(`FAIL rule=${h.rule} photo=${h.photo} round=${h.round} value=${JSON.stringify(h.value)}`);
  }
  const rows = Array.isArray(results.rows) ? results.rows.length : 0;
  console.log(`${hits.length === 0 ? 'PASS' : 'FAIL'} photos=${cases.length} rounds=${results.rounds} rows=${rows} hits=${hits.length}`);
  if (hits.length > 0) process.exitCode = 1;
}

function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

async function liveMode() {
  const { ROUNDS } = await import('./criteria.js');
  const cases = readCases();
  const rounds = Number(option('--rounds') ?? ROUNDS);
  const calls = cases.length * rounds;
  console.log(`계획: 사진 ${cases.length}장 × ${rounds}번 = ${calls}번 호출(재시도 빼고) · 약 ${calls * COST_PER_CALL_WON}원`);
  if (!args.includes('--yes')) {
    console.log('진짜 호출하려면 --yes를 붙여 다시 실행하세요. (AWS_PROFILE=terraform-admin)');
    process.exitCode = 2;
    return;
  }

  const { makeBedrockClient } = await import('../src/server.js');
  const { runLive } = await import('./live.js');
  const client = makeBedrockClient();
  const usage = { attempts: 0, inputTokens: 0, outputTokens: 0 };
  const log = (line) => {
    const e = JSON.parse(line);
    usage.attempts += e.attempts ?? 0;
    usage.inputTokens += e.inputTokens ?? 0;
    usage.outputTokens += e.outputTokens ?? 0;
  };
  const result = await runLive({
    send: (command, options) => client.send(command, options),
    cases,
    photosDir: option('--photos') ?? 'eval/photos',
    rounds,
    log,
    onRow: (r) => console.log(`${r.photo} #${r.round} ${r.refused ? '거절' : r.code ?? `등급 ${r.grade} · ${r.line}`} (${r.ms}ms)`),
  });

  // 결과 파일 필드는 E1 모양뿐(plan 실패 시나리오 17)
  mkdirSync('eval/results', { recursive: true });
  const file = join('eval/results', `${stamp()}.json`);
  writeFileSync(file, `${JSON.stringify({ rounds: result.rounds, rows: result.rows }, null, 2)}\n`);
  console.log(`결과 파일: ${file}`);
  console.log(`실제 Bedrock 호출 ${usage.attempts}번 · 입력 토큰 ${usage.inputTokens} · 출력 토큰 ${usage.outputTokens}`);

  if (result.stopped) {
    console.log(`멈춤: ${result.stopped.photo} #${result.stopped.round} code=${result.stopped.code}`);
    process.exitCode = 1;
    return;
  }
  await report(result, cases);
}

const resultsPath = option('--judge');
if (resultsPath) {
  await report(readJson(resultsPath), readCases());
} else {
  await liveMode();
}

#!/usr/bin/env node
'use strict';
// 훅 ⑥ Stop — 만드는 역할 (2026-10-20 사용자 결정). 사용: node stop-check.js <역할 이름>
// 1) 바뀐 파일 = 훅 ⑤ 기록 + git status (Bash로 쓴 파일도 잡힌다)
// 2) 맡은 구역 밖 변경 → 돌려보냄 (훅 ③과 같은 기준)
// 3) 바뀐 구역의 검사 명령(pipeline.config.json checks, 구역↔묶음은 check_areas)을 돌림 → 실패면 돌려보냄
//    - 통과할 때까지 매번 돌려보낸다(횟수 상한 없음). 명령 하나 시간 상한 120초.
//    - "TODO"인 명령은 건너뛰고 알린다. 명령이 설치돼 있지 않으면(127)·훅 자체가 못 돌면 역할이 고칠 수 없으니 알리기만 한다.
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { decide } = require('./block-outside-area');
const { recordFile } = require('./record-edited-files');

const CHECK_TIMEOUT_MS = 120000;
const TAIL_LINES = 40;

function repoRoot(cwd) {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function gitChanged(root) {
  const out = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: root, encoding: 'utf8' });
  const parts = out.split('\0').filter(Boolean);
  const files = [];
  for (let i = 0; i < parts.length; i++) {
    const xy = parts[i].slice(0, 2);
    files.push(parts[i].slice(3));
    if (xy[0] === 'R' || xy[0] === 'C') i++; // 이름 바꾸기: 다음 칸은 옛 이름
  }
  return files.map((f) => path.join(root, f));
}

function recorded(sessionId) {
  try { return fs.readFileSync(recordFile(sessionId), 'utf8').split('\n').filter(Boolean); } catch { return []; }
}

const globToRegex = require('./block-outside-area').globToRegex;
const areaOf = (areas, rel) => Object.keys(areas).filter((a) => (areas[a] || []).some((g) => globToRegex(g).test(rel)));
const tail = (s) => String(s || '').replace(/\x1b\[[0-9;]*m/g, '').trim().split('\n').slice(-TAIL_LINES).join('\n');

function run(role, input) {
  const cwd = input.cwd || process.cwd();
  const root = repoRoot(cwd);
  const config = JSON.parse(fs.readFileSync(path.join(root, 'pipeline.config.json'), 'utf8'));
  const changed = [...new Set([...recorded(input.session_id), ...gitChanged(root)])];
  const problems = [];
  const notices = [];

  // 2) 구역 밖 변경
  for (const abs of changed) {
    const why = decide(role, { tool_input: { file_path: abs }, cwd: root });
    if (why) problems.push(`구역 밖 변경: ${why} → 되돌리거나, 필요하면 PR·보고에 "누가 무엇을 바꿔야 함"을 적는다`);
  }

  // 3) 바뀐 구역의 검사
  const rels = changed.map((a) => path.relative(root, a).split(path.sep).join('/')).filter((r) => r && !r.startsWith('..'));
  const touched = new Set(rels.flatMap((r) => areaOf(config.areas || {}, r)));
  const checkAreas = config.check_areas || {};
  for (const group of Object.keys(checkAreas)) {
    if (group.startsWith('$') || !Array.isArray(checkAreas[group])) continue;
    if (!checkAreas[group].some((a) => touched.has(a))) continue;
    const cmds = (config.checks || {})[group] || {};
    for (const [name, cmd] of Object.entries(cmds)) {
      if (name.startsWith('$')) continue;
      if (!cmd || cmd === 'TODO') { notices.push(`${group}.${name} 검사 명령이 아직 없음(TODO) — 건너뜀`); continue; }
      const r = spawnSync(cmd, { cwd: root, shell: true, encoding: 'utf8', timeout: CHECK_TIMEOUT_MS });
      if (r.error && r.error.code === 'ETIMEDOUT') problems.push(`${group}.${name} 시간 초과(${CHECK_TIMEOUT_MS / 1000}초): ${cmd}`);
      else if (r.status === 127) notices.push(`${group}.${name} 명령이 설치돼 있지 않음 — 건너뜀: ${cmd}`);
      else if (r.status !== 0) problems.push(`${group}.${name} 실패(종료 코드 ${r.status}): ${cmd}\n${tail(r.stdout + '\n' + r.stderr)}`);
    }
  }
  return { problems, notices };
}

function main(raw, role) {
  let input = {};
  try { input = JSON.parse(raw || '{}'); } catch { /* 빈 입력 */ }
  let result;
  try {
    if (!role) throw new Error('역할 이름 인자가 없음');
    result = run(role, input);
  } catch (e) {
    // 훅 자체가 못 돈 경우(설정·git 문제)는 역할이 고칠 수 없으니 돌려보내지 않고 알린다 — 끝없이 도는 것 방지.
    result = { problems: [], notices: [`끝내기 전 검사를 돌리지 못함(${e.message}) — 사용자가 훅 설정을 확인`] };
  }
  const notice = result.notices.length ? `[how-much 훅 ⑥] 알림: ${result.notices.join(' / ')}` : '';
  if (result.problems.length) {
    process.stdout.write(JSON.stringify({
      decision: 'block',
      reason: `[how-much 훅 ⑥] 아직 끝내지 않는다. 아래를 고친 뒤 다시 끝낸다(CLAUDE.md 6번).\n- ${result.problems.join('\n- ')}${notice ? '\n' + notice : ''}`,
    }));
  } else if (notice) {
    process.stdout.write(JSON.stringify({ systemMessage: notice }));
  }
  return 0;
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => { raw += c; });
  process.stdin.on('end', () => process.exit(main(raw, process.argv[2])));
}
module.exports = { run };

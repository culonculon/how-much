#!/usr/bin/env node
'use strict';
// PreToolUse(Write|Edit|MultiEdit|NotebookEdit) 훅 — 쓰는 역할마다 frontmatter에서 붙인다 (2026-10-20 사용자 결정).
// 사용: node block-outside-area.js <역할 이름>
// - 경로와 역할의 원본은 저장소 루트 pipeline.config.json (areas · roles.<역할>.writes · human_only.areas). 앱 경로는 여기 적지 않는다.
// - 어느 구역에 걸리면: 그 역할의 writes 구역이고 human_only가 아니어야 통과.
// - 어느 구역에도 없으면 통과(사용자 결정). 단 파이프라인 파일(PIPELINE_FILES)은 사용자만.
// - 저장소 밖 · 설정을 못 읽음 · 역할을 모름 → 막는 쪽으로 실패(종료 코드 2).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PIPELINE_FILES = ['.claude/**', 'pipeline.config.json', 'CLAUDE.md'];

function globToRegex(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') { re += '.*'; i++; if (glob[i + 1] === '/') i++; }
    else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}
const matches = (globs, rel) => (globs || []).some((g) => globToRegex(g).test(rel));

function realish(p) {
  // 아직 없는 파일도 있으니 존재하는 가장 가까운 조상까지 realpath 후 나머지를 붙인다.
  let cur = path.resolve(p); const rest = [];
  while (!fs.existsSync(cur)) { rest.unshift(path.basename(cur)); const up = path.dirname(cur); if (up === cur) break; cur = up; }
  return path.join(fs.realpathSync(cur), ...rest);
}

function repoRoot(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return process.env.CLAUDE_PROJECT_DIR || ''; }
}

function decide(role, input) {
  const ti = (input && input.tool_input) || {};
  const target = ti.file_path || ti.notebook_path;
  if (!target) return null;
  const cwd = input.cwd || process.cwd();
  const root = repoRoot(cwd);
  if (!root) return '저장소 루트를 찾지 못함';
  let config;
  try { config = JSON.parse(fs.readFileSync(path.join(root, 'pipeline.config.json'), 'utf8')); } catch { return 'pipeline.config.json을 읽지 못함'; }
  const roleConf = config.roles && config.roles[role];
  if (!roleConf) return `pipeline.config.json에 역할 '${role}'이 없음`;
  const rel = path.relative(realish(root), realish(path.resolve(cwd, target))).split(path.sep).join('/');
  if (!rel || rel.startsWith('../') || rel === '..' || path.isAbsolute(rel)) return `저장소 밖 경로 (${target})`;
  if (matches(PIPELINE_FILES, rel)) return `파이프라인 파일은 사용자만 고침 (${rel})`;
  const areas = config.areas || {};
  const hit = Object.keys(areas).filter((name) => matches(areas[name], rel));
  if (hit.length === 0) return null;
  const humanOnly = new Set((config.human_only && config.human_only.areas) || []);
  const writes = new Set(roleConf.writes || []);
  const blockedHuman = hit.find((a) => humanOnly.has(a));
  if (blockedHuman) return `'${blockedHuman}' 구역은 사용자와 함께 쓰는 곳 (${rel})`;
  if (hit.some((a) => writes.has(a))) return null;
  return `${role}의 쓰기 구역(${[...writes].join(', ') || '없음'})이 아님 — ${rel}는 '${hit.join(', ')}' 구역`;
}

function main(raw, role) {
  let input;
  try { input = JSON.parse(raw || '{}'); } catch { input = null; }
  let reason;
  if (!role) reason = '역할 이름 인자가 없음';
  else if (!input) reason = '훅 입력을 읽지 못함';
  else { try { reason = decide(role, input); } catch (e) { reason = `판단 실패(${e.message})`; } }
  if (!reason) return 0;
  process.stderr.write(`[how-much 훅] 막음: ${reason}. 필요하면 멈추고 PR·보고에 "누가 무엇을 바꿔야 함"을 적는다 (CLAUDE.md 3번).\n`);
  return 2;
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => { raw += c; });
  process.stdin.on('end', () => process.exit(main(raw, process.argv[2])));
}
module.exports = { decide, globToRegex };

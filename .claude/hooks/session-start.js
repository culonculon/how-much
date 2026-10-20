#!/usr/bin/env node
'use strict';
// 훅 ⑦ SessionStart — 모든 세션, settings.json (2026-10-20 사용자 결정).
// 브랜치 이름(<issue_key>-N-slug)으로 스펙 폴더(spec_dir)를 찾아
// spec.md의 상태 줄 · 완료 조건 · 안 할 것 + tasks.md 전체를 세션 맥락에 넣는다.
// 이슈 브랜치가 아니면 아무것도 넣지 않는다. 실패해도 세션은 막지 않는다.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MAX_CHARS = 12000;
const SPEC_SECTIONS = ['완료 조건', '안 할 것'];

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

function section(md, title) {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => l.trim() === `## ${title}`);
  if (start < 0) return '';
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  if (end < 0) end = lines.length;
  return lines.slice(start, end).join('\n').replace(/<!--[\s\S]*?-->\n?/g, '').trim();
}

function build(cwd) {
  const root = git(cwd, ['rev-parse', '--show-toplevel']);
  const branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const config = JSON.parse(fs.readFileSync(path.join(root, 'pipeline.config.json'), 'utf8'));
  const key = config.issue_key;
  const m = branch.match(new RegExp(`^(${key}-\\d+)-(.+)$`));
  if (!m) return '';
  const dir = config.spec_dir.replace('{ISSUE}', m[1]).replace('{slug}', m[2]);
  const specPath = path.join(root, dir, 'spec.md');
  const tasksPath = path.join(root, dir, 'tasks.md');
  const out = [`[how-much 훅 ⑦] 브랜치 ${branch} · 스펙 폴더 ${dir}`];
  if (!fs.existsSync(specPath)) {
    out.push('spec.md 없음 — spec-writer가 먼저 쓴다. 만드는 역할이면 시작하지 말고 멈춘다.');
    return out.join('\n');
  }
  const spec = fs.readFileSync(specPath, 'utf8');
  const status = spec.split('\n').find((l) => /^상태:/.test(l.trim())) || '상태: (줄 없음)';
  out.push(status.trim());
  for (const t of SPEC_SECTIONS) out.push(section(spec, t) || `## ${t}\n(비어 있음)`);
  out.push(fs.existsSync(tasksPath) ? `## tasks.md\n${fs.readFileSync(tasksPath, 'utf8').trim()}` : '## tasks.md\n없음 — architect가 아직 안 씀');
  let text = out.join('\n\n');
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS) + `\n…(잘림, 원래 ${text.length}자 — 원본 파일을 연다)`;
  return text;
}

function main(raw) {
  let input = {};
  try { input = JSON.parse(raw || '{}'); } catch { /* 빈 입력 */ }
  let text = '';
  try { text = build(input.cwd || process.cwd()); } catch { return 0; }
  if (text) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } }));
  return 0;
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => { raw += c; });
  process.stdin.on('end', () => process.exit(main(raw)));
}
module.exports = { build };

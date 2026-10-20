#!/usr/bin/env node
'use strict';
// PreToolUse(Bash) 훅 — 모든 세션 (2026-10-20 사용자 결정, CLAUDE.md 10번).
// 막는 것: terraform apply·destroy · main으로 push · 강제 push(--force-with-lease 포함).
// 명령 해석은 vendor/ecc/lib/shell-scan.js. 해석이 안 되면 막는 쪽으로 실패한다(종료 코드 2).
const { execFileSync } = require('child_process');
const { createBudget, scanShell } = require('./vendor/ecc/lib/shell-scan');

const PROTECTED_BRANCH = 'main';
const WRAPPERS = new Set(['sudo', 'env', 'command', 'exec', 'nohup', 'time', 'nice', 'builtin']);
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash']);
const GIT_OPTS_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path']);
const PUSH_OPTS_WITH_VALUE = new Set(['-o', '--push-option', '--repo', '--receive-pack', '--exec']);

function argv(cmd) {
  const w = cmd.words.map((x) => ({ v: x.value, dyn: x.dynamic || x.value.includes('\u0000') }));
  while (w.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0].v)) w.shift(); // FOO=bar 앞붙이기
  while (w.length && WRAPPERS.has(w[0].v)) {
    w.shift();
    while (w.length && (w[0].v.startsWith('-') || /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0].v))) w.shift();
  }
  return w;
}

function currentBranch(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return ''; }
}

function checkTerraform(w) {
  const sub = w.slice(1).find((x) => !x.v.startsWith('-'));
  if (!sub) return null;
  if (sub.dyn) return 'terraform 하위 명령을 읽을 수 없음';
  if (sub.v === 'apply' || sub.v === 'destroy') return `terraform ${sub.v} — 사용자만, 머지 뒤에`;
  return null;
}

function refDest(spec) {
  const s = spec.replace(/^\+/, '');
  const dst = s.includes(':') ? s.slice(s.lastIndexOf(':') + 1) : s;
  return dst.replace(/^refs\/heads\//, '');
}

function checkGit(w, cwd) {
  let i = 1;
  while (i < w.length && w[i].v.startsWith('-')) {
    i += GIT_OPTS_WITH_VALUE.has(w[i].v) ? 2 : 1;
  }
  if (i >= w.length) return null;
  if (w[i].dyn) return 'git 하위 명령을 읽을 수 없음';
  if (w[i].v !== 'push') return null;
  const positional = [];
  for (let j = i + 1; j < w.length; j++) {
    const a = w[j];
    if (a.dyn) return 'git push 인자를 읽을 수 없음';
    if (a.v === '--') { positional.push(...w.slice(j + 1).map((x) => x.v)); break; }
    if (/^--force(-with-lease|-if-includes)?(=|$)/.test(a.v)) return `강제 push (${a.v})`;
    if (a.v === '--mirror' || a.v === '--all') return `${a.v} push는 main도 함께 올림`;
    if (/^-[A-Za-z]+$/.test(a.v) && a.v.includes('f')) return `강제 push (${a.v})`;
    if (PUSH_OPTS_WITH_VALUE.has(a.v)) { j++; continue; }
    if (a.v.startsWith('-')) continue;
    positional.push(a.v);
  }
  const refspecs = positional.slice(1); // 첫 번째는 원격 이름
  for (const r of refspecs) {
    if (r.startsWith('+')) return `강제 push (${r})`;
    const dst = refDest(r);
    if (dst === PROTECTED_BRANCH) return `${PROTECTED_BRANCH}으로 push (${r})`;
    if ((dst === 'HEAD' || dst === '@') && currentBranch(cwd) === PROTECTED_BRANCH) return `${PROTECTED_BRANCH}으로 push (${r})`;
  }
  if (refspecs.length === 0 && currentBranch(cwd) === PROTECTED_BRANCH) return `${PROTECTED_BRANCH} 브랜치에서 git push`;
  return null;
}

function inspect(text, cwd, depth) {
  if (depth > 8) return '명령이 너무 깊게 겹쳐 있음';
  const { commands, nested } = scanShell(text, createBudget(text.length));
  for (const n of nested) { const r = inspect(n, cwd, depth + 1); if (r) return r; }
  for (const cmd of commands) {
    if (!cmd.words || !cmd.words.length) continue;
    const w = argv(cmd);
    if (!w.length) continue;
    const name = w[0].v.split('/').pop();
    if (SHELLS.has(name)) {
      const k = w.findIndex((x) => /^-[A-Za-z]*c[A-Za-z]*$/.test(x.v));
      if (k > 0 && w[k + 1]) { const r = inspect(w[k + 1].v, cwd, depth + 1); if (r) return r; }
      continue;
    }
    if (name === 'eval') { const r = inspect(w.slice(1).map((x) => x.v).join(' '), cwd, depth + 1); if (r) return r; continue; }
    if (name === 'terraform' || name === 'tofu') { const r = checkTerraform(w); if (r) return r; }
    if (name === 'git') { const r = checkGit(w, cwd); if (r) return r; }
  }
  return null;
}

function main(raw) {
  let input;
  try { input = JSON.parse(raw || '{}'); } catch { return 0; }
  const command = input && input.tool_input && input.tool_input.command;
  if (typeof command !== 'string' || !command) return 0;
  let reason;
  try { reason = inspect(command, input.cwd || process.cwd(), 0); } catch (e) { reason = `명령을 해석하지 못함(${e.message})`; }
  if (!reason) return 0;
  process.stderr.write(`[how-much 훅] 막음: ${reason}. CLAUDE.md 10번 '하지 않는 것'. 꼭 필요하면 사용자가 터미널에서 직접 한다.\n`);
  return 2;
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => { raw += c; });
  process.stdin.on('end', () => process.exit(main(raw)));
}
module.exports = { main };

#!/usr/bin/env node
'use strict';
// 훅 ⑧ SessionStart — 역할에 판단 스킬·ponytail 규칙을 넣는다 (2026-10-21 사용자 결정). 사용: node load-skills.js <자리 번호>
// 왜: `claude --agent <역할>`로 열면 frontmatter `skills:`가 실리지 않는다(10/20 세션 기록 16개 + 10/21 시험으로 확인).
//     ponytail 플러그인 SessionStart는 agent_type을 보지 않아 모든 세션에 실린다(그래서 settings env PONYTAIL_DEFAULT_MODE=off).
// 무엇을 넣나 (자리 하나 = 하나만 — 훅 출력 한도 10,000자가 훅마다 따로 세지므로 settings.json에 자리 0·1·2 세 칸):
//   - 역할이 PONYTAIL_SUBAGENT_MATCHER에 맞으면 → vendor/ponytail/full.md (만드는 역할)
//   - 역할 파일 frontmatter `skills:`의 스킬 → .claude/skills/<스킬>/<모델 파일> 본문 (생각하는 역할: spec-writer·architect·reviewer)
//     SKILL.md는 "모델별 파일을 읽어라"는 안내판뿐이라 모델별 파일을 넣는다. 플러그인 스킬(`이름:스킬`)은 건너뛴다.
// 모델 파일: 입력 `model` → 없으면 frontmatter `model:` → opus-5-5.md / sonnet-5-5.md / 그 밖 sonnet-5.md(원본 안내판이 권하는 것)
// 기록: $TMPDIR/how-much-hooks/<session_id>.skills.log 한 줄씩(JSON). 못 실으면 넣는 글 첫머리에 [스킬 못 실음: 이름].
// 역할 세션이 아니면(agent_type 없음) 아무것도 넣지 않는다. 실패해도 세션은 막지 않는다.
const fs = require('fs');
const os = require('os');
const path = require('path');

const MAX_CHARS = 9500;
const MODEL_FILES = [
  [/opus-5-5|^opus$/i, 'opus-5-5.md'],
  [/sonnet-5-5|^sonnet$/i, 'sonnet-5-5.md'],
  [/sonnet-5(?!-)/i, 'sonnet-5.md'],
  [/haiku-5-5|^haiku$/i, 'haiku-5-5.md'],
  [/fable-5-1|^fable$/i, 'fable-5-1.md'],
];
const FALLBACK_FILE = 'sonnet-5.md';

function frontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  const lines = m ? m[1].split('\n') : [];
  const model = (lines.find((l) => /^model:/.test(l)) || '').replace(/^model:\s*/, '').trim();
  const skills = [];
  const at = lines.findIndex((l) => /^skills:\s*$/.test(l));
  if (at >= 0) {
    for (let i = at + 1; i < lines.length && /^\s+-\s/.test(lines[i]); i++) skills.push(lines[i].replace(/^\s+-\s*/, '').trim());
  }
  return { model, skills };
}

const modelFile = (model) => (MODEL_FILES.find(([re]) => re.test(model || '')) || [null, FALLBACK_FILE])[1];

function items(root, role) {
  const list = [];
  const matcher = process.env.PONYTAIL_SUBAGENT_MATCHER;
  if (matcher && new RegExp(matcher, 'i').test(role)) list.push({ kind: 'ponytail', name: 'ponytail' });
  const agentPath = path.join(root, '.claude', 'agents', `${role}.md`);
  const fm = fs.existsSync(agentPath) ? frontmatter(fs.readFileSync(agentPath, 'utf8')) : { model: '', skills: [] };
  for (const name of fm.skills) if (!name.includes(':')) list.push({ kind: 'skill', name });
  return { list, fmModel: fm.model };
}

function build(root, input, slot) {
  const role = String(input.agent_type || '').trim();
  if (!role) return null;
  const { list, fmModel } = items(root, role);
  const item = list[slot];
  if (!item) return null;
  let file;
  if (item.kind === 'ponytail') file = path.join(root, '.claude', 'hooks', 'vendor', 'ponytail', 'full.md');
  else {
    const dir = path.join(root, '.claude', 'skills', item.name);
    file = path.join(dir, modelFile(input.model || fmModel));
    if (!fs.existsSync(file)) file = path.join(dir, FALLBACK_FILE);
  }
  const rel = path.relative(root, file);
  if (!fs.existsSync(file)) return { role, item, rel, chars: 0, text: `[스킬 못 실음: ${item.name}] ${rel} 없음 — 역할 정의대로 [멈춤] 스킬 없음으로 사용자에게 알린다` };
  let body = fs.readFileSync(file, 'utf8').trim();
  if (body.length > MAX_CHARS) body = body.slice(0, MAX_CHARS) + `\n…(잘림 — 나머지는 ${rel}를 연다)`;
  const head = item.kind === 'ponytail'
    ? `[how-much 훅 ⑧] ${role} — ponytail 규칙(full, ${rel})`
    : `[how-much 훅 ⑧] ${role} — 판단 스킬 ${item.name} (${rel}). 이 세션 내내 따른다.`;
  return { role, item, rel, chars: body.length, text: `${head}\n\n${body}` };
}

function log(sessionId, entry) {
  try {
    const file = path.join(os.tmpdir(), 'how-much-hooks', `${String(sessionId || 'unknown').replace(/[^A-Za-z0-9_-]/g, '_')}.skills.log`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');
  } catch { /* 기록 실패는 넘긴다 */ }
}

function main(raw, slotArg) {
  let input = {};
  try { input = JSON.parse(raw || '{}'); } catch { /* 빈 입력 */ }
  const slot = Number.parseInt(slotArg, 10);
  if (!Number.isInteger(slot) || slot < 0) return 0;
  let out = null;
  try {
    const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
    out = build(root, input, slot);
  } catch (e) {
    log(input.session_id, { slot, error: String(e.message).split('\n')[0] });
    return 0;
  }
  if (!out) return 0;
  log(input.session_id, { source: input.source, role: out.role, slot, item: out.item.name, file: out.rel, chars: out.chars, model: input.model || null });
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: out.text } }));
  return 0;
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => { raw += c; });
  process.stdin.on('end', () => process.exit(main(raw, process.argv[2])));
}
module.exports = { build, frontmatter, modelFile };

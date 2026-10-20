#!/usr/bin/env node
'use strict';
// 훅 ⑤ PostToolUse(Write|Edit|MultiEdit|NotebookEdit) — 만드는 역할 (2026-10-20 사용자 결정).
// 고친 파일의 절대 경로를 저장소 밖 임시 폴더 $TMPDIR/how-much-hooks/<session_id>.txt 에 한 줄씩 덧붙인다.
// 훅 ⑥(stop-check.js)이 이 목록과 git status를 합쳐 검사한다. 기록 실패는 작업을 막지 않는다.
const fs = require('fs');
const os = require('os');
const path = require('path');

const recordFile = (sessionId) =>
  path.join(os.tmpdir(), 'how-much-hooks', `${String(sessionId || 'unknown').replace(/[^A-Za-z0-9_-]/g, '_')}.txt`);

function main(raw) {
  let input;
  try { input = JSON.parse(raw || '{}'); } catch { return 0; }
  const ti = input.tool_input || {};
  const target = ti.file_path || ti.notebook_path;
  if (!target) return 0;
  const abs = path.resolve(input.cwd || process.cwd(), target);
  try {
    const file = recordFile(input.session_id);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, abs + '\n');
  } catch (e) {
    process.stderr.write(`[how-much 훅] 고친 파일 기록 실패(${e.message}) — 훅 ⑥은 git status만 본다\n`);
  }
  return 0;
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => { raw += c; });
  process.stdin.on('end', () => process.exit(main(raw)));
}
module.exports = { recordFile };

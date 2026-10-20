'use strict';
// 세션 시작 때 이미 바뀌어 있던 파일(커밋 안 된 변경)의 지문을 남긴다 — 훅 ⑦이 쓰고 훅 ⑥이 읽는다 (2026-10-20).
// 훅 ⑥은 "이 세션이 바꾼 것"만 본다: 시작 때와 내용이 같은 파일은 다른 사람이 남긴 변경이니 넘긴다.
// 저장소 밖 임시 폴더 $TMPDIR/how-much-hooks/<session_id>.base.json
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const baseFile = (sessionId) =>
  path.join(os.tmpdir(), 'how-much-hooks', `${String(sessionId || 'unknown').replace(/[^A-Za-z0-9_-]/g, '_')}.base.json`);

function fingerprint(abs) {
  try { return crypto.createHash('sha1').update(fs.readFileSync(abs)).digest('hex'); } catch { return 'missing'; }
}

function dirty(root) {
  const out = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: root, encoding: 'utf8' });
  const parts = out.split('\0').filter(Boolean);
  const files = [];
  for (let i = 0; i < parts.length; i++) {
    const xy = parts[i].slice(0, 2);
    files.push(path.join(root, parts[i].slice(3)));
    if (xy[0] === 'R' || xy[0] === 'C') i++;
  }
  return files;
}

// source가 startup/clear면 새로 찍고, resume/compact면 이미 있으면 그대로 둔다.
function snapshot(root, sessionId, source) {
  const file = baseFile(sessionId);
  if ((source === 'resume' || source === 'compact') && fs.existsSync(file)) return;
  const base = {};
  for (const abs of dirty(root)) base[abs] = fingerprint(abs);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(base));
}

function unchangedSinceStart(sessionId, abs) {
  let base;
  try { base = JSON.parse(fs.readFileSync(baseFile(sessionId), 'utf8')); } catch { return false; }
  return Object.prototype.hasOwnProperty.call(base, abs) && base[abs] === fingerprint(abs);
}

module.exports = { snapshot, unchangedSinceStart, dirty };

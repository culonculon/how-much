'use strict';
// 세션 시작 지문 — 훅 ⑦이 쓰고 훅 ⑥이 읽는다 (2026-10-20, 시작 HEAD는 10/21 사용자 결정).
// 1) 시작 때 이미 바뀌어 있던 파일(커밋 안 된 변경)의 지문: 시작 때와 내용이 같은 파일은 다른 사람이 남긴 변경이니 넘긴다.
// 2) 시작 HEAD: 훅 ⑥이 "시작 뒤 이 세션이 만든 커밋"의 파일도 보게 한다(Bash로 만들고 커밋하면 ⑤ 기록·git status 둘 다 안 잡히므로).
// 저장소 밖 임시 폴더 $TMPDIR/how-much-hooks/<session_id>.base.json — 형식 { head, files: { 절대경로: sha1 } }
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const baseFile = (sessionId) =>
  path.join(os.tmpdir(), 'how-much-hooks', `${String(sessionId || 'unknown').replace(/[^A-Za-z0-9_-]/g, '_')}.base.json`);

const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

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

function readBase(sessionId) {
  try {
    const raw = JSON.parse(fs.readFileSync(baseFile(sessionId), 'utf8'));
    // 10/20 형식(파일 지문만 있는 객체)도 읽는다
    return raw && typeof raw.files === 'object' ? raw : { head: null, files: raw || {} };
  } catch { return null; }
}

// source가 startup/clear면 새로 찍고, resume/compact면 이미 있으면 그대로 둔다(처음 시작한 지점을 지킨다).
function snapshot(root, sessionId, source) {
  const file = baseFile(sessionId);
  if ((source === 'resume' || source === 'compact') && fs.existsSync(file)) return;
  const files = {};
  for (const abs of dirty(root)) files[abs] = fingerprint(abs);
  let head = null;
  try { head = git(root, ['rev-parse', 'HEAD']); } catch { /* 커밋이 없는 저장소 */ }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ head, files }));
}

function unchangedSinceStart(sessionId, abs) {
  const base = readBase(sessionId);
  if (!base) return false;
  return Object.prototype.hasOwnProperty.call(base.files, abs) && base.files[abs] === fingerprint(abs);
}

// 시작 뒤 이 세션이 만든 커밋의 파일(절대 경로). 이 브랜치 줄기(first-parent)의 merge 아닌 커밋만 본다 —
// `git pull --no-rebase origin main`으로 받아 온 main 커밋(남이 바꾼 파일)은 빠진다 (10/21 사용자 결정 (가)).
// 돌려주는 값: { files, notice } — 시작 HEAD를 모르면 files는 빈 배열, notice에 이유.
function committedSinceStart(root, sessionId) {
  const base = readBase(sessionId);
  if (!base || !base.head) return { files: [], notice: '시작 HEAD 기록이 없음 — 이 세션의 커밋은 검사에 넣지 못함(커밋 안 된 변경만 봄)' };
  let from = base.head;
  let notice = '';
  try {
    const head = git(root, ['rev-parse', 'HEAD']);
    if (head === from) return { files: [], notice: '' };
    try { git(root, ['merge-base', '--is-ancestor', from, head]); } catch {
      // 브랜치를 바꿨거나 rebase했으면 공통 조상부터 본다
      from = git(root, ['merge-base', from, head]);
      notice = `시작 HEAD가 지금 HEAD의 조상이 아님 — 공통 조상 ${from.slice(0, 7)}부터 봄`;
    }
    const out = git(root, ['log', '--first-parent', '--no-merges', '--format=', '--name-only', '-z', `${from}..${head}`]);
    const files = [...new Set(out.split(/[\0\n]/).filter(Boolean))].map((f) => path.join(root, f));
    return { files, notice };
  } catch (e) {
    return { files: [], notice: `시작 뒤 커밋을 읽지 못함(${String(e.message).split('\n')[0]})` };
  }
}

module.exports = { snapshot, unchangedSinceStart, committedSinceStart, dirty };

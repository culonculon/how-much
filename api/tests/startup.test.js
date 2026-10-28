// CAREER-31 자격 증명 시작 점검 — 자격 증명이 없으면 서버가 포트를 열지 않고 0이 아닌 코드로 끝난다.
// 원본: specs/CAREER-31-prepublic-guard/plan.md 'A4 답'
// 자식 프로세스로 진짜 시작 경로(node src/server.js)를 돈다 — 종료 코드·출력·포트를 그대로 본다.
// env는 새 객체: 부모의 AWS_* 값을 물려받지 않는다. IMDS를 꺼서 로컬에서 기다림이 생기지 않게 한다.
// Bedrock 호출은 두 경우 모두 0번이다 — (a)는 포트를 열지 않고, (b)는 listening 줄을 받자마자 끄며 요청을 보내지 않는다.
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test } from 'vitest';

const apiDir = fileURLToPath(new URL('..', import.meta.url));
// 가짜 값 — 진짜 키 모양(접두어)을 쓰지 않는다(gitleaks, CAREER-27 전례)
const FAKE_KEY_ID = 'HOWMUCHFAKEKEYID02';
const FAKE_SECRET = 'howmuch-fake-secret-c31';

const homes = [];
afterEach(() => {
  while (homes.length) rmSync(homes.pop(), { recursive: true, force: true });
});

function baseEnv() {
  const home = mkdtempSync(join(tmpdir(), 'c31-start-'));
  homes.push(home);
  return {
    home,
    env: {
      PATH: process.env.PATH,
      HOME: home,
      AWS_CONFIG_FILE: join(home, 'none-config'),
      AWS_SHARED_CREDENTIALS_FILE: join(home, 'none-creds'),
      AWS_EC2_METADATA_DISABLED: 'true',
      PORT: '0',
    },
  };
}

function run(env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['src/server.js'], { cwd: apiDir, env });
    let out = '';
    let err = '';
    child.stdout.on('data', (c) => {
      out += c;
      if (out.includes('"evt":"listening"')) child.kill('SIGTERM');
    });
    child.stderr.on('data', (c) => {
      err += c;
    });
    child.on('close', (code, signal) => resolve({ code, signal, out, err }));
  });
}

const jsonLines = (text) =>
  text
    .split('\n')
    .filter((l) => l.trim().startsWith('{'))
    .map((l) => JSON.parse(l));

describe('CAREER-31 AC-7 자격 증명 시작 점검', () => {
  test('CAREER-31 AC-7 (a) 자격 증명이 없으면 포트를 열지 않고 startup_failed 한 줄 · 0 아닌 코드', { timeout: 15_000 }, async () => {
    const { home, env } = baseEnv();
    const r = await run(env);
    expect(r.signal).toBeNull(); // 스스로 끝남
    expect(r.code).not.toBeNull();
    expect(r.code).not.toBe(0);
    expect(r.out).not.toContain('"evt":"listening"');
    const failed = jsonLines(r.out).filter((e) => e.evt === 'startup_failed');
    expect(failed).toHaveLength(1);
    expect(Object.keys(failed[0]).sort()).toEqual(['error', 'evt', 'reason']);
    expect(failed[0].reason).toBe('no_credentials');
    expect(typeof failed[0].error).toBe('string');
    expect(r.out + r.err).not.toContain(home);
  });

  test('CAREER-31 AC-7 (b) 자격 증명이 있으면 127.0.0.1에 뜬다 · 가짜 값 0번 · 셈 파일을 만들지 않는다', { timeout: 15_000 }, async () => {
    const { home, env } = baseEnv();
    const r = await run({ ...env, AWS_ACCESS_KEY_ID: FAKE_KEY_ID, AWS_SECRET_ACCESS_KEY: FAKE_SECRET });
    const listening = jsonLines(r.out).filter((e) => e.evt === 'listening');
    expect(listening).toHaveLength(1);
    expect(listening[0].address).toBe('127.0.0.1');
    expect(r.signal).toBe('SIGTERM'); // 우리가 끔
    expect(r.out + r.err).not.toContain(FAKE_KEY_ID);
    expect(r.out + r.err).not.toContain(FAKE_SECRET);
    expect(readdirSync(home)).toEqual([]);
  });
});

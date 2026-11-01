import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cwd, execPath } from 'node:process'
import { expect, test } from 'vitest'

// 시험 빌드 결과(tmp) 안의 모든 파일 경로 (폴더 안 포함)
const filesIn = (dir) => readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name))

// AC-10: 빌드 결과에 글꼴 파일 · OFL 라이선스 글이 함께 들어가고, 밖 주소(jsdelivr)는 따라오지 않는다
test('CAREER-35 AC-10 build carries the font and the licence', { timeout: 60_000 }, () => {
  const tmp = mkdtempSync(join(tmpdir(), 'how-much-font-build-'))
  try {
    execFileSync(execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', tmp, '--emptyOutDir'], { cwd: cwd(), stdio: 'pipe' })

    expect(readFileSync(join(tmp, 'licenses', 'Galmuri-OFL.txt'), 'utf8')).toContain('SIL OPEN FONT LICENSE')
    expect(readdirSync(join(tmp, 'assets')).filter((f) => f.endsWith('.woff2')).length).toBeGreaterThan(0)

    const text = filesIn(tmp).filter((f) => !f.endsWith('.woff2')).map((f) => readFileSync(f, 'utf8')).join('\n')
    expect(text.length).toBeGreaterThan(0)
    expect(text).not.toContain('jsdelivr')
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})

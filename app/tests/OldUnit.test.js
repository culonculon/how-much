// CAREER-40 T4: AC-3 옛 값 단위(🍡 × N · 모찌 N개 · 원)가 app/src 코드에 0개. 주석은 뺀다.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const SRC = fileURLToPath(new URL('../src', import.meta.url))

// 따옴표 밖에서 시작하는 // 는 줄 끝까지, /* */ 는 통째로 지운다
function withoutComments(text) {
  const noBlock = text.replace(/\/\*[\s\S]*?\*\//g, '')
  return noBlock
    .split('\n')
    .map((line) => {
      for (let i = line.indexOf('//'); i >= 0; i = line.indexOf('//', i + 1)) {
        const before = line.slice(0, i)
        const quotes = ['\'', '"', '`'].every((q) => before.split(q).length % 2 === 1)
        if (quotes && (i === 0 || /\s/.test(line[i - 1]))) return before
      }
      return line
    })
    .join('\n')
}

test('CAREER-40 AC-3 no old unit left in app/src', () => {
  const files = readdirSync(SRC, { recursive: true }).filter((f) => /\.(js|jsx)$/.test(f))
  expect(files.length).toBeGreaterThan(0) // 하나도 못 읽고 통과하지 않는다
  const found = []
  for (const f of files) {
    const code = withoutComments(readFileSync(join(SRC, f), 'utf8'))
    for (const [name, re] of [['🍡 × ', /🍡 × /], ['모찌 N개', /모찌 (\d|\$\{)/], ['원', /원/]]) {
      if (re.test(code)) found.push(`${f}: ${name}`)
    }
  }
  expect(found).toEqual([])
})

import { readdirSync, readFileSync } from 'node:fs'
import { afterEach, expect, test, vi } from 'vitest'
import { appraise, FAKE_DELAY_MS } from '../src/appraise.js'

afterEach(() => vi.useRealTimers())

const prices = ['one', 'ten', 'hundred', 'never']
const tagSets = [[], ['how-1', 'now-2', 'brag-1']]

// AC-9: 마음 가격 4가지 × 태그 0개·여러 개 모두 { mochi, line } 모양
for (const myPrice of prices) {
  for (const tags of tagSets) {
    test(`AC-9 appraise returns { mochi, line } for ${myPrice} with ${tags.length} tags`, async () => {
      vi.useFakeTimers()
      const photo = new File(['x'], 'a.png', { type: 'image/png' })
      const pending = appraise({ photo, myPrice, tags })
      await vi.advanceTimersByTimeAsync(FAKE_DELAY_MS)
      const r = await pending
      expect(Object.keys(r).sort()).toEqual(['line', 'mochi'])
      expect(Number.isInteger(r.mochi) && r.mochi >= 0).toBe(true)
      expect(typeof r.line === 'string' && r.line.trim() !== '').toBe(true)
    })
  }
}

// AC-9: 화면에서 appraise.js를 import하는 파일은 정확히 하나
test('AC-9 exactly one source file imports appraise.js', () => {
  const src = new URL('../src/', import.meta.url)
  const importers = readdirSync(src, { recursive: true })
    .map(String)
    .filter((p) => /\.jsx?$/.test(p) && !/(^|\/)appraise\.js$/.test(p))
    .filter((p) =>
      /from\s+['"]\.\/appraise(\.js)?['"]/.test(readFileSync(new URL(p, src), 'utf8')),
    )
  expect(importers).toHaveLength(1)
})

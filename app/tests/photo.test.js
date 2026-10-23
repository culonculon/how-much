import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import {
  fitWithin,
  JPEG_QUALITIES,
  MAX_EDGE_PX,
  MAX_PHOTO_BYTES,
  TARGET_PHOTO_BYTES,
} from '../src/photo.js'

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')
// markdown 표 줄 `| \`NAME\` | 1,024 | …` 에서 숫자를 꺼낸다
const tableNumber = (md, name) => {
  const m = md.match(new RegExp('\\|\\s*`' + name + '`\\s*\\|\\s*\\**\\s*([\\d,]+)'))
  return m && Number(m[1].replaceAll(',', ''))
}

// AC-1 · AC-4: 긴 변 1024로 줄이고, 작으면 키우지 않는다
test.each([
  [4000, 3000, 1024, 768],
  [3000, 4000, 768, 1024],
  [800, 600, 800, 600], // AC-4 키우지 않음
  [1024, 1024, 1024, 1024],
  [1025, 1, 1024, 1], // 최소 1
  [1200, 800, 1024, 683],
])('AC-1/AC-4 fitWithin(%i, %i, 1024) -> %i x %i', (w, h, ew, eh) => {
  expect(fitWithin(w, h, 1024)).toEqual({ width: ew, height: eh })
})

// AC-1: 값이 contracts와 같다
test('AC-1 constants match contracts/appraise-http.md §8', () => {
  const http = read('../../contracts/appraise-http.md')
  expect(MAX_EDGE_PX).toBe(1024)
  expect(MAX_PHOTO_BYTES).toBe(1_000_000)
  expect(MAX_EDGE_PX).toBe(tableNumber(http, 'MAX_PHOTO_EDGE_PX'))
  expect(MAX_PHOTO_BYTES).toBe(tableNumber(http, 'MAX_PHOTO_BYTES'))
})

test('AC-1 target bytes and JPEG qualities match contracts/appraise.md §6', () => {
  const md = read('../../contracts/appraise.md')
  expect(TARGET_PHOTO_BYTES).toBe(tableNumber(md, 'TARGET_PHOTO_BYTES'))
  const m = md.match(/\|\s*`JPEG_QUALITIES`\s*\|\s*`(\[[^`]*\])`/)
  expect(m, 'JPEG_QUALITIES row').not.toBeNull()
  expect(JPEG_QUALITIES).toEqual(JSON.parse(m[1]))
})

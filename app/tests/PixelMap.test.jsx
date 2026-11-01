// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { Item, Uncle } from '../src/Pixel.jsx'
import { I, PI, PU, U } from '../src/pixels.js'

afterEach(cleanup)

// 시안(plan A2): 끝 <script>에서 U · I · PU · PI를 꺼낸다. 못 찾으면 던진다(빈 값으로 통과 금지).
function readMockup() {
  const html = readFileSync(resolve(cwd(), '../specs/CAREER-35-shop-screen/mockup-v3.html'), 'utf8')
  const uStart = html.indexOf('const U=') + 'const U='.length
  const iMark = html.indexOf(', I=', uStart)
  if (uStart < 'const U='.length || iMark < 0) throw new Error('mockup: U/I를 찾지 못했다')
  const iStart = iMark + ', I='.length
  const object = (name) => {
    const m = html.match(new RegExp(`const ${name}=(\\{[^;]*\\});`))
    if (!m) throw new Error(`mockup: ${name}를 찾지 못했다`)
    return new Function('return ' + m[1])() // 시안의 따옴표 없는 키(O:'#…')라 JSON이 아니다
  }
  return {
    U: JSON.parse(html.slice(uStart, iMark)),
    I: JSON.parse(html.slice(iStart, html.indexOf(';', iStart))),
    PU: object('PU'),
    PI: object('PI'),
  }
}
let cached
const mockup = () => (cached ??= readMockup())

const FACES = ['base', 'frown', 'happy', 'sleepy', 'sweat', 'think']
const ITEMS = ['bear', 'clock', 'lamp', 'vase']
const ITEM_ROWS = { vase: 10, bear: 10, clock: 9, lamp: 9 }

// 지도와 팔레트 → { 'x,y': 색 }. '.' 칸은 표에 없다
function cellsOf(map, palette) {
  const cells = {}
  map.forEach((row, y) => [...row].forEach((c, x) => c !== '.' && (cells[`${x},${y}`] = palette[c])))
  return cells
}

// svg의 <path d="M{x} {y}h1v1h-1z…" fill> → { 'x,y': 색 }. 모르는 글자가 남으면 · 같은 칸이 두 번이면 던진다
function cellsOfSvg(svg) {
  const cells = {}
  let n = 0
  for (const path of svg.querySelectorAll('path')) {
    const d = path.getAttribute('d')
    const rest = d.replace(/M(\d+) (\d+)h1v1h-1z/g, (_m, x, y) => {
      cells[`${x},${y}`] = path.getAttribute('fill')
      n++
      return ''
    })
    if (rest !== '') throw new Error(`path d에 풀 수 없는 글자가 남았다: ${rest}`)
  }
  if (Object.keys(cells).length !== n) throw new Error('같은 칸을 두 번 그렸다')
  return cells
}

// AC-9: 앱의 네 값이 시안과 같다
test('CAREER-35 AC-9 maps match the mockup', () => {
  expect(Object.keys(mockup().U).sort()).toEqual(FACES)
  expect(Object.keys(mockup().I).sort()).toEqual(ITEMS)
  expect(U).toEqual(mockup().U)
  expect(I).toEqual(mockup().I)
  expect(PU).toEqual(mockup().PU)
  expect(PI).toEqual(mockup().PI)
})

// AC-9: 크기, 지도의 글자는 모두 '.' 또는 팔레트 안
test('CAREER-35 AC-9 sizes', () => {
  for (const f of FACES) {
    expect(U[f], f).toHaveLength(40)
    U[f].forEach((row, y) => {
      expect([...row], `${f} row ${y}`).toHaveLength(40)
      for (const c of row) expect(c === '.' || c in PU, `${f} ${c}`).toBe(true)
    })
  }
  for (const k of ITEMS) {
    expect(I[k], k).toHaveLength(ITEM_ROWS[k])
    I[k].forEach((row, y) => {
      expect([...row], `${k} row ${y}`).toHaveLength(12)
      for (const c of row) expect(c === '.' || c in PI[k], `${k} ${c}`).toBe(true)
    })
  }
})

// AC-9: 실제로 그려 칸마다 색이 지도와 같다 (표정 6 + 물건 4)
test.each(FACES)('CAREER-35 AC-9 %s is drawn cell by cell', (face) => {
  const { container } = render(<Uncle face={face} />)
  const svg = container.querySelector('svg')
  expect(cellsOfSvg(svg)).toEqual(cellsOf(mockup().U[face], mockup().PU))
  expect(svg.getAttribute('viewBox')).toBe('0 0 40 40')
  expect(svg.getAttribute('shape-rendering')).toBe('crispEdges')
  expect(svg.getAttribute('aria-hidden')).toBe('true')
})

test.each(ITEMS)('CAREER-35 AC-9 %s is drawn cell by cell', (item) => {
  const { container } = render(<Item item={item} />)
  const svg = container.querySelector('svg')
  expect(cellsOfSvg(svg)).toEqual(cellsOf(mockup().I[item], mockup().PI[item]))
  expect(svg.getAttribute('viewBox')).toBe(`0 0 12 ${ITEM_ROWS[item]}`)
  expect(svg.getAttribute('shape-rendering')).toBe('crispEdges')
  expect(svg.getAttribute('aria-hidden')).toBe('true')
})

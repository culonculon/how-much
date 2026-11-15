// @vitest-environment jsdom
// CAREER-40 T6: AC-5 · AC-8 트럭 장면 (표식은 plan A2 '표식'). 그림은 장식이고 뜻은 글자로.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { appraise } from '../src/appraise.js'
import { STEPS, THINKING_LINE } from '../src/options.js'
import { Uncle } from '../src/Pixel.jsx'
import { PU, U } from '../src/pixels.js'
import { truckLayers } from '../src/truck.js'
import { back, enter, face, hold, next, pickFile, pickPrice, png, renderApp, reject, resetHistory, submit, walkToPrice } from './shop-steps.jsx'
import { cellsOfSt, pathsOf, renderMockup } from './mockup-v3.js'

vi.mock('../src/appraise.js', () => ({ appraise: vi.fn(), FAKE_DELAY_MS: 800 }))

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
  appraise.mockReset()
  resetHistory()
})
afterEach(cleanup)

function press() {
  pickPrice('10개')
  fireEvent.click(submit())
}
async function rejectedWith(code) {
  appraise.mockRejectedValueOnce(reject(code))
  renderApp()
  walkToPrice()
  press()
  await screen.findByTestId(code === 'daily_limit' ? 'off-duty' : 'appraise-error')
}
// contracts/appraise.md §5 `| `code` ` 줄의 첫 큰따옴표 글자. 없으면 던진다.
function contractText(code) {
  const doc = readFileSync(resolve(cwd(), '../contracts/appraise.md'), 'utf8')
  const line = doc.split('\n').find((l) => l.startsWith(`| \`${code}\``))
  if (!line) throw new Error(`contracts §5에 ${code} 줄이 없다`)
  return line.match(/"([^"]+)"/)[1]
}

// [화면, 표정(CAREER-35 짝 그대로), 장면 움직임 이름, 화면까지 가는 길]
const SCREENS = [
  ['① door', 'happy', 'arrive', async () => {
    renderApp()
    expect(screen.getByRole('button', { name: '가게에 들어가기' })).toBeTruthy()
  }],
  ['② photo', 'base', 'idle', async () => {
    renderApp()
    enter()
    expect(screen.getByLabelText('사진 고르기')).toBeTruthy()
  }],
  ['③ tags', 'base', 'idle', async () => {
    renderApp()
    enter()
    pickFile(png())
    next()
    expect(screen.getByRole('group', { name: '사연 태그' })).toBeTruthy()
  }],
  ['④ price', 'base', 'idle', async () => {
    renderApp()
    walkToPrice()
    expect(submit()).toBeTruthy()
  }],
  ['⑤ thinking', 'think', 'think', async () => {
    hold()
    renderApp()
    walkToPrice()
    press()
    expect(screen.getByRole('progressbar', { name: '감정 중' })).toBeTruthy()
  }],
  ['⑥ result', 'happy', 'idle', async () => {
    appraise.mockResolvedValueOnce({ mochi: 30, line: '흠… 귀한 물건이군!' })
    renderApp()
    walkToPrice()
    press()
    await screen.findByRole('region', { name: '감정 결과' })
  }],
  ['refused', 'frown', 'idle', () => rejectedWith('refused')],
  ['unavailable', 'sweat', 'idle', () => rejectedWith('unavailable')],
  ['person_limit', 'sleepy', 'idle', () => rejectedWith('person_limit')],
  ['invalid_input', 'base', 'idle', async () => {
    await rejectedWith('invalid_input')
    expect(screen.getByLabelText('사진 고르기')).toBeTruthy() // 자동으로 ②
  }],
  ['busy', 'base', 'idle', async () => {
    hold()
    renderApp()
    walkToPrice()
    press()
    await back()
    expect(submit().disabled).toBe(true)
  }],
]

// AC-5: 모든 낮 화면이 같은 트럭 가게. 선반 · 물건 · 나무 벽은 없고, 옛 퇴근 표식도 없다
test.each(SCREENS)('CAREER-40 AC-5 %s has the truck', async (name, expectedFace, mode, goTo) => {
  await goTo()
  const scene = screen.getByTestId('shop-scene')
  expect(scene.getAttribute('data-shop')).toBe('truck')
  expect(scene.getAttribute('data-scene')).toBe('day')
  expect(scene.getAttribute('data-mode')).toBe(mode)
  expect(screen.getAllByTestId('truck')).toHaveLength(1)
  expect(screen.getByTestId('truck').getAttribute('data-truck')).toBe('here')
  expect(screen.getAllByTestId('shop-counter')).toHaveLength(1)
  expect(screen.queryAllByTestId('shop-item')).toHaveLength(0)
  expect(scene.querySelectorAll('.shelf')).toHaveLength(0)
  expect(scene.querySelectorAll('.items')).toHaveLength(0)
  expect(face()).toBe(expectedFace)
  for (const id of ['post-sign', 'smoke', 'closed-sign']) expect(screen.queryAllByTestId(id), id).toHaveLength(0)
  if (name.startsWith('①')) {
    expect(screen.getAllByTestId('truck-loudspeaker')).toHaveLength(1)
    expect(screen.getAllByTestId('truck-scale')).toHaveLength(1)
  }
  if (name.startsWith('⑤')) {
    expect(scene.querySelectorAll('[data-testid="magnifier"][data-size="big"]')).toHaveLength(1)
    expect(screen.getAllByTestId('truck-scale')).toHaveLength(1)
  }
  if (name.startsWith('⑥')) expect(screen.getAllByTestId('stamp')).toHaveLength(1)
})

// AC-5 · AC-8: 퇴근 — 셔터를 내린 트럭이 떠난 밤 장면(끝 모습), 기둥 팻말, 아저씨 없음, 문구는 contracts에서
test('CAREER-40 AC-5 / AC-8 off duty', async () => {
  await rejectedWith('daily_limit')
  const scene = screen.getByTestId('shop-scene')
  expect(scene.getAttribute('data-shop')).toBe('truck')
  expect(scene.getAttribute('data-scene')).toBe('night')
  expect(scene.getAttribute('data-mode')).toBe('leave')
  const truck = screen.getByTestId('truck')
  expect(truck.getAttribute('data-truck')).toBe('gone')
  expect(within(truck).getAllByTestId('shutter')).toHaveLength(1)
  expect(within(truck).getByTestId('shutter').getAttribute('data-shutter')).toBe('down')
  expect(within(truck).getAllByTestId('smoke')).toHaveLength(1)
  expect(within(truck).getAllByTestId('shop-counter')).toHaveLength(1)

  const post = screen.getByTestId('post-sign')
  expect(truck.contains(post)).toBe(false)
  const closed = screen.getAllByTestId('closed-sign')
  expect(closed).toHaveLength(1)
  expect(post.contains(closed[0])).toBe(true)
  expect(closed[0].textContent).toBe('오늘 영업 끝')
  expect(post.textContent.startsWith('오늘 영업 끝')).toBe(true) // 첫 줄
  expect(post.textContent).toContain('내일 또 와요')

  expect(screen.queryAllByTestId('uncle')).toHaveLength(0)
  expect(face()).toBeNull()
  expect(screen.queryAllByTestId('shop-item')).toHaveLength(0)
  expect(within(screen.getByRole('status', { name: '감정사 아저씨' })).getByTestId('off-duty').textContent).toBe(contractText('daily_limit'))
  expect(screen.queryByTestId('appraise-error')).toBeNull()
  expect(screen.queryByRole('region', { name: '감정 결과' })).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: '내일 다시 오기' })) // 다시 누를 수 있다
  expect(submit().disabled).toBe(false)
})

// AC-5: 아저씨 그림은 색 하나에 path 하나, rect 없음, 풀어 보면 지도와 같다
function cellsOf(map, palette) {
  const cells = {}
  map.forEach((row, y) => [...row].forEach((c, x) => c !== '.' && (cells[`${x},${y}`] = palette[c])))
  return cells
}
function cellsOfSvg(svg) {
  const cells = {}
  let n = 0
  for (const path of svg.querySelectorAll('path')) {
    const rest = path.getAttribute('d').replace(/M(\d+) (\d+)h(\d+)v1h-\3z/g, (_m, x, y, w) => {
      for (let i = 0; i < Number(w); i++) {
        cells[`${Number(x) + i},${y}`] = path.getAttribute('fill')
        n++
      }
      return ''
    })
    if (rest !== '') throw new Error(`path d에 풀 수 없는 글자가 남았다: ${rest}`)
  }
  if (Object.keys(cells).length !== n) throw new Error('같은 칸을 두 번 그렸다')
  return cells
}
const FACES = ['base', 'happy', 'think', 'frown', 'sweat', 'sleepy']

test.each(FACES)('CAREER-40 AC-5 %s is one path per colour', (f) => {
  const { container } = render(<Uncle face={f} />)
  const svg = container.querySelector('svg')
  const paths = [...svg.querySelectorAll('path')]
  expect(paths.length).toBeGreaterThan(0)
  expect(paths).toHaveLength(new Set(paths.map((p) => p.getAttribute('fill'))).size)
  expect(svg.querySelectorAll('rect')).toHaveLength(0)
  expect(cellsOfSvg(svg)).toEqual(cellsOf(U[f], PU))
})

// AC-5: base · happy는 시안 v3 Scene의 색별 d와 글자 그대로 같다
test.each(['base', 'happy'])('CAREER-40 AC-5 %s paths match mockup v3', (f) => {
  const { u } = renderMockup('Scene', { mode: 'idle', face: f })
  const fromMockup = Object.fromEntries(Object.entries(pathsOf(u)).map(([key, d]) => [PU[key], d]))
  expect(Object.keys(fromMockup).length).toBeGreaterThan(0)
  const { container } = render(<Uncle face={f} />)
  const fromApp = Object.fromEntries([...container.querySelectorAll('path')].map((p) => [p.getAttribute('fill'), p.getAttribute('d')]))
  expect(fromApp).toEqual(fromMockup)
})

// AC-5: 트럭 칸 목록이 시안 Scene의 bg · add · fr 호출 결과와 차례까지 같다
test.each([false, true])('CAREER-40 AC-5 truck cells match mockup v3 (night %s)', (night) => {
  const m = renderMockup('Scene', { mode: night ? 'leave' : 'idle' })
  const layers = truckLayers(night)
  expect(layers.bg).toEqual(cellsOfSt(m.bg))
  expect(layers.rects).toEqual(cellsOfSt(m.rects))
  expect(layers.front).toEqual(cellsOfSt(m.front))
  expect(layers.rects.length).toBeGreaterThan(0)
})

// AC-5: '감정소' · '나무'는 단계 글자 어디에도 없다
test('CAREER-40 AC-5 no 감정소 or 나무 in step words', () => {
  const words = [...Object.values(STEPS).flatMap((s) => [s.label, s.line, s.kicker, s.title]), THINKING_LINE].filter((w) => typeof w === 'string')
  expect(words.length).toBeGreaterThan(5)
  for (const w of words) {
    expect(w, w).not.toContain('감정소')
    expect(w, w).not.toContain('나무')
  }
  const { container } = renderApp()
  expect(container.textContent).not.toContain('감정소')
  expect(container.textContent).not.toContain('나무')
})

// AC-5: 그림은 장식(aria-hidden)이고 버튼 이름에 그림 글자가 없다
test('CAREER-40 AC-5 pictures are decoration', async () => {
  appraise.mockResolvedValueOnce({ mochi: 30, line: '흠… 귀한 물건이군!' })
  renderApp()
  const hidden = (el) => el.closest('[aria-hidden="true"]') !== null
  const check = () => {
    const scene = screen.getByTestId('shop-scene')
    const svgs = [...scene.querySelectorAll('svg')]
    expect(svgs.length).toBeGreaterThan(0)
    for (const svg of svgs) expect(hidden(svg)).toBe(true)
    expect(hidden(screen.getByTestId('truck'))).toBe(true)
    expect(screen.queryAllByRole('button', { name: /[−+▶]/ })).toEqual([])
  }
  check() // ①
  enter()
  pickFile(png())
  next()
  next()
  check() // ④ (−/+ 와 빠른 버튼이 있는 화면)
  press()
  await screen.findByRole('region', { name: '감정 결과' })
  check() // ⑥
  expect(hidden(screen.getByTestId('stamp'))).toBe(true)
})

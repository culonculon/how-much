// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { appraise } from '../src/appraise.js'
import { back, enter, hold, next, pickFile, pickPrice, png, renderApp, reject, resetHistory, submit, walkToPrice } from './shop-steps.jsx'

vi.mock('../src/appraise.js', () => ({ appraise: vi.fn(), FAKE_DELAY_MS: 800 }))

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
  appraise.mockReset()
  resetHistory()
})
afterEach(cleanup)

const group = (name) => screen.getByRole('group', { name })
const mascot = () => screen.getByRole('status', { name: '감정사 아저씨' })

// AC-8 (Q3 A, plan '초점 · 이름표'): 화면이 바뀌면 초점이 body가 아니라 새 화면의 이름표 안에 있다
test('CAREER-35 AC-8 focus moves into each new step', async () => {
  const { resolve } = hold()
  renderApp()
  expect(document.activeElement).toBe(document.body) // 처음엔 초점을 뺏지 않음

  enter() // ②
  expect(document.activeElement).toBe(group('물건 꺼내기'))
  pickFile(png())
  next() // ③
  expect(document.activeElement).toBe(group('사연 말하기'))
  next() // ④
  expect(document.activeElement).toBe(group('내 값 부르기'))

  pickPrice('🍡 10개')
  fireEvent.click(submit()) // ⑤
  expect(document.activeElement).toBe(mascot())

  resolve({ mochi: 30, line: '흠… 귀한 물건이군!' }) // ⑥
  const region = await screen.findByRole('region', { name: '감정 결과' })
  expect(document.activeElement).toBe(region)
  expect(within(region).getByRole('group', { name: '값 공개' })).toBeTruthy()

  await back() // ④: 앞 화면이 결과라 '감정 받기!'
  expect(document.activeElement).toBe(submit())
  await back() // ③
  expect(document.activeElement).toBe(group('사연 말하기'))
  await back() // ②
  expect(document.activeElement).toBe(group('물건 꺼내기'))
  await back() // ①
  expect(document.activeElement).toBe(group('가게 문'))
})

// AC-8: 실패는 appraise-error, invalid_input은 ②의 appraise-error, 퇴근은 status 칸
test.each([
  ['unavailable', 'appraise-error'],
  ['refused', 'appraise-error'],
  ['person_limit', 'appraise-error'],
  ['invalid_input', 'appraise-error'],
  ['daily_limit', 'status'],
])('CAREER-35 AC-8 focus goes to the notice on %s', async (code, where) => {
  appraise.mockRejectedValueOnce(reject(code))
  renderApp()
  walkToPrice()
  pickPrice('🍡 10개')
  fireEvent.click(submit())
  const notice = await screen.findByTestId(code === 'daily_limit' ? 'off-duty' : 'appraise-error')
  expect(document.activeElement).toBe(where === 'status' ? mascot() : notice)
  if (where === 'status') expect(mascot().contains(notice)).toBe(true)
})

// 그리는 글자가 버튼 이름에 없고, 그림은 장식(aria-hidden)
const GLYPHS = /[▶▼◀↻_]/
function expectDrawnGlyphsHidden() {
  expect(screen.queryAllByRole('button', { name: GLYPHS })).toHaveLength(0)
  const decor = [screen.queryByTestId('uncle'), ...screen.queryAllByTestId('shop-item')].filter(Boolean)
  for (const el of decor) expect(el.getAttribute('aria-hidden')).toBe('true')
  return decor.length
}

// AC-8: ▶ · ▼ · ◀ · ↻ · _가 낱글자로 읽히지 않는다 (모든 화면)
test('CAREER-35 AC-8 drawn glyphs are not in accessible names', async () => {
  const { resolve } = hold()
  renderApp()
  expect(screen.getByRole('button', { name: '가게에 들어가기' })).toBeTruthy() // ① 이름에 ▶ · _ 없음
  expect(expectDrawnGlyphsHidden()).toBeGreaterThan(0)
  enter()
  expectDrawnGlyphsHidden() // ②
  pickFile(png())
  expect(screen.getByRole('button', { name: '다음' })).toBeTruthy()
  next()
  expectDrawnGlyphsHidden() // ③
  expect(screen.getByRole('button', { name: '🎁 선물', exact: true })).toBeTruthy()
  next()
  pickPrice('🍡 10개')
  expectDrawnGlyphsHidden() // ④
  fireEvent.click(submit())
  expectDrawnGlyphsHidden() // ⑤
  resolve({ mochi: 30, line: '흠… 귀한 물건이군!' })
  await screen.findByRole('region', { name: '감정 결과' })
  expect(screen.getByRole('button', { name: '다른 물건 꺼내기' })).toBeTruthy()
  expectDrawnGlyphsHidden() // ⑥
})

test.each([
  ['refused', '사진 다시 꺼내기'],
  ['unavailable', '다시 감정 받기'],
  ['person_limit', '조금 뒤에 다시'],
  ['daily_limit', '내일 다시 오기'],
])('CAREER-35 AC-8 drawn glyphs are not in accessible names on %s', async (code, buttonName) => {
  appraise.mockRejectedValueOnce(reject(code))
  renderApp()
  walkToPrice()
  pickPrice('🍡 10개')
  fireEvent.click(submit())
  await screen.findByTestId(code === 'daily_limit' ? 'off-duty' : 'appraise-error')
  expect(screen.getByRole('button', { name: buttonName, exact: true })).toBeTruthy() // ◀ · ↻ 없는 이름
  expectDrawnGlyphsHidden()
})

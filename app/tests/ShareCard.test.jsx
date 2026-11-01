// @vitest-environment jsdom
// CAREER-34 T1: AC-1 공유 버튼은 ⑥ 값 공개에만 있다. `share` 흉내는 넣지 않는다(jsdom에서 그리기가 실패해도 이름은 '공유').
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { appraise } from '../src/appraise.js'
import { back, enter, hold, pickPrice, pickFile, next, png, pickTag, renderApp, reject, resetHistory, submit, walkToPrice } from './shop-steps.jsx'

vi.mock('../src/appraise.js', () => ({ appraise: vi.fn(), FAKE_DELAY_MS: 800 }))

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
  appraise.mockReset()
  resetHistory()
})
afterEach(cleanup)

const NAME = 'CAREER-34 AC-1 share button only on the reveal'
const shareButton = () => screen.queryByRole('button', { name: /공유/ })

// AC-1 주어진: 가짜 appraise / 할 때: ④에서 감정 받기 / 그러면: ⑥에 이름이 정확히 '공유'인 버튼 1개
test(`${NAME} — reveal has exactly one`, async () => {
  appraise.mockResolvedValueOnce({ mochi: 3, line: '흠' })
  renderApp()
  walkToPrice()
  pickPrice('🍡 10개')
  fireEvent.click(submit())
  await screen.findByRole('region', { name: '감정 결과' })
  expect(screen.getAllByRole('button', { name: '공유', exact: true })).toHaveLength(1)
})

// AC-1 ①②③④: 없음
test(`${NAME} — absent on steps 1 to 4`, () => {
  renderApp()
  expect(shareButton()).toBeNull() // ①
  enter()
  expect(shareButton()).toBeNull() // ②
  pickFile(png())
  expect(shareButton()).toBeNull()
  next()
  expect(shareButton()).toBeNull() // ③
  pickTag('🎁 선물')
  next()
  expect(shareButton()).toBeNull() // ④
  pickPrice('🍡 10개')
  expect(shareButton()).toBeNull()
})

// AC-1 ⑤: 없음, 버튼 0개 (CAREER-35 AC-1 그대로)
test(`${NAME} — absent on step 5`, () => {
  hold()
  renderApp()
  walkToPrice()
  pickPrice('🍡 10개')
  fireEvent.click(submit())
  expect(screen.getByRole('progressbar', { name: '감정 중' })).toBeTruthy()
  expect(shareButton()).toBeNull()
  expect(screen.queryAllByRole('button')).toHaveLength(0)
})

// AC-1 ⑥ → 뒤로 → ④: 없음
test(`${NAME} — absent after back from the reveal`, async () => {
  appraise.mockResolvedValueOnce({ mochi: 3, line: '흠' })
  renderApp()
  walkToPrice()
  pickPrice('🍡 10개')
  fireEvent.click(submit())
  await screen.findByRole('region', { name: '감정 결과' })
  await back()
  expect(submit()).toBeTruthy() // ④
  expect(screen.queryByRole('region', { name: '감정 결과' })).toBeNull()
  expect(shareButton()).toBeNull()
})

// AC-1 ⑤ → 뒤로 → 바쁨 ④: 없음
test(`${NAME} — absent on busy step 4`, async () => {
  hold()
  renderApp()
  walkToPrice()
  pickPrice('🍡 10개')
  fireEvent.click(submit())
  await back()
  expect(submit().disabled).toBe(true) // 바쁨 ④
  expect(shareButton()).toBeNull()
})

// AC-1 실패 · 퇴근 화면 · invalid_input으로 돌아간 ②: 없음
test.each([
  ['refused', 'refused'],
  ['person_limit', 'person_limit'],
  ['unavailable', 'unavailable'],
  ['no code', undefined],
  ['daily_limit', 'daily_limit'],
  ['invalid_input', 'invalid_input'],
])(`${NAME} — absent on failure: %s`, async (_name, code) => {
  appraise.mockRejectedValueOnce(reject(code))
  renderApp()
  walkToPrice()
  pickPrice('🍡 10개')
  fireEvent.click(submit())
  await screen.findByTestId(code === 'daily_limit' ? 'off-duty' : 'appraise-error')
  expect(screen.queryByRole('region', { name: '감정 결과' })).toBeNull()
  expect(shareButton()).toBeNull()
})

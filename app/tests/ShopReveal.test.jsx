// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { appraise } from '../src/appraise.js'
import { hold, pickPrice, renderApp, resetHistory, submit, walkToPrice } from './shop-steps.jsx'

vi.mock('../src/appraise.js', () => ({ appraise: vi.fn(), FAKE_DELAY_MS: 800 }))

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
  appraise.mockReset()
  resetHistory()
})
afterEach(cleanup)

const LINE = '흠… 귀한 물건이군!'

// [고른 값 이름, 서버 mochi, 비교 한 줄, 내 값 보이는 글자, 내 값 읽는 글자]. 글자는 spec Q7(사용자 11/1) 그대로
const MORE = '▲ 아저씨가 더 쳐줬다!'
const LESS = '▼ 아저씨는 좀 짜게 봤다'
const SAME = '= 자네 눈이 제법이군!'
const NEVER = '안 판다니… 그래도 값은 매겨 봤네'
const ROWS = [
  ['🍡 10개', 30, MORE, '🍡 × 10', '모찌 10개'],
  ['🍡 10개', 3, LESS, '🍡 × 10', '모찌 10개'],
  ['🍡 10개', 0, LESS, '🍡 × 10', '모찌 10개'],
  ['🍡 10개', 10, SAME, '🍡 × 10', '모찌 10개'],
  ['🙅 안 팔아', 30, NEVER, '안 팔아', '안 팔아'],
]

// AC-6: 값 창 · 비교 한 줄 · 서버 대사
test.each(ROWS)('CAREER-35 AC-6 price %s, server %s shows %s', async (price, mochi, compare, myShown, myRead) => {
  appraise.mockResolvedValueOnce({ mochi, line: LINE })
  renderApp()
  walkToPrice()
  pickPrice(price)
  fireEvent.click(submit())
  const card = within(await screen.findByRole('region', { name: '감정 결과' }))

  expect(card.getByTestId('appraised-shown').textContent).toBe(`🍡 × ${mochi}`)
  expect(card.getByTestId('appraised-price').textContent).toBe(`모찌 ${mochi}개`)
  expect(card.getByTestId('my-shown').textContent).toBe(myShown)
  expect(card.getByTestId('my-price').textContent).toBe(myRead)
  expect(card.getByTestId('compare-line').textContent).toBe(compare)
  expect(card.getByTestId('mascot-line').textContent).toBe(LINE)
})

// AC-6 (Q1 A): 답이 오면 ⑤에 더 머물지 않고 바로 ⑥이다 — 타이머 없음
test('CAREER-35 AC-6 the result appears as soon as the answer comes', async () => {
  const { resolve } = hold()
  renderApp()
  walkToPrice()
  pickPrice('🍡 10개')
  fireEvent.click(submit())
  expect(screen.getByRole('progressbar', { name: '감정 중' })).toBeTruthy()
  expect(screen.queryByRole('region', { name: '감정 결과' })).toBeNull()

  await act(async () => resolve({ mochi: 30, line: LINE }))
  expect(screen.queryByRole('region', { name: '감정 결과' })).not.toBeNull() // findBy 없이 바로
  expect(screen.queryByRole('progressbar')).toBeNull()
})

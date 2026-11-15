// @vitest-environment jsdom
// CAREER-40 T4: AC-3 ⑥ 값은 모두 '한정선' — 서버 값 · 내 값 · 비교 한 줄. 기대 표시는 아래 표에 글자로 적는다.
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { appraise } from '../src/appraise.js'
import { pickPrice, renderApp, resetHistory, submit, typePrice, walkToPrice } from './shop-steps.jsx'

vi.mock('../src/appraise.js', () => ({ appraise: vi.fn(), FAKE_DELAY_MS: 800 }))

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
  appraise.mockReset()
  resetHistory()
})
afterEach(cleanup)

const LINE = '흠… 귀한 물건이군!'
const COMPARE = {
  '▲': '▲ 아저씨가 더 쳐줬다!',
  '▼': '▼ 아저씨는 좀 짜게 봤다',
  '=': '= 자네 눈이 제법이군!',
  never: '안 판다니… 그래도 값은 매겨 봤네',
}
const MOCHI = [0, 7, 23, 37, 100, 9999]
// 내 값 → mochi 0 · 7 · 23 · 37 · 100 · 9999 일 때의 비교 (spec AC-3 표)
const EXPECTED = {
  1: ['▼', '▲', '▲', '▲', '▲', '▲'],
  23: ['▼', '▼', '=', '▲', '▲', '▲'],
  777: ['▼', '▼', '▼', '▼', '▼', '▲'],
  9999: ['▼', '▼', '▼', '▼', '▼', '='],
  '안 팔아': Array(6).fill('never'),
}
const CASES = Object.entries(EXPECTED).flatMap(([mine, marks]) => MOCHI.map((mochi, i) => [mine, mochi, COMPARE[marks[i]]]))

test.each(CASES)('CAREER-40 AC-3 mine %s, server %s', async (mine, mochi, compare) => {
  appraise.mockResolvedValueOnce({ mochi, line: LINE })
  renderApp()
  walkToPrice()
  if (mine === '안 팔아') pickPrice(mine)
  else typePrice(mine) // 내 값은 숫자 칸에 쳐서 넣는다
  fireEvent.click(submit())
  const card = within(await screen.findByRole('region', { name: '감정 결과' }))
  const never = mine === '안 팔아'

  expect(card.getByTestId('appraised-shown').textContent).toBe(`한정선 ${mochi}개`)
  expect(card.getByTestId('appraised-price').textContent).toBe(`한정선 모찌 ${mochi}개`)
  expect(card.getByTestId('my-shown').textContent).toBe(never ? '안 팔아' : `한정선 ${mine}개`)
  expect(card.getByTestId('my-price').textContent).toBe(never ? '안 팔아' : `한정선 모찌 ${mine}개`)
  expect(card.getByTestId('compare-line').textContent).toBe(compare)
  const stamps = card.getAllByTestId('stamp')
  expect(stamps).toHaveLength(1)
  expect(stamps[0].getAttribute('aria-hidden')).toBe('true')
})

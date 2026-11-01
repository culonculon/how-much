// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { appraise } from '../src/appraise.js'
import { back, next, pickFile, pickPrice, png, renderApp, resetHistory, submit, tagGroup, walkToPrice } from './shop-steps.jsx'

vi.mock('../src/appraise.js', () => ({ appraise: vi.fn(), FAKE_DELAY_MS: 800 }))

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
  appraise.mockReset()
  resetHistory() // 앞 테스트가 남긴 history.state가 pushState 확인을 가리지 않게
})
afterEach(cleanup)

// AC-7 (ADR-0009): 몇 번을 감정해도 칸은 처음 + 4 (깊이 1~4)를 넘지 않는다
test('CAREER-35 AC-7 entries never exceed five over many appraisals', async () => {
  appraise.mockResolvedValueOnce({ mochi: 3, line: 'a' })
  appraise.mockResolvedValueOnce({ mochi: 7, line: 'b' })
  appraise.mockResolvedValueOnce({ mochi: 9, line: 'c' })
  renderApp()
  const before = history.length
  walkToPrice()
  pickPrice('🍡 10개')
  for (const text of ['모찌 3개', '모찌 7개', '모찌 9개']) {
    fireEvent.click(submit())
    await screen.findByText(text)
    if (text !== '모찌 9개') {
      fireEvent.click(screen.getByRole('button', { name: '다른 물건 꺼내기' }))
      pickFile(png()) // ② → ④ 다시 걸어가기
      next()
      next()
      pickPrice('🍡 10개')
    }
  }
  expect(history.length).toBeLessThanOrEqual(before + 4)
  expect(history.state).toEqual({ howMuch: 4 })
})

// AC-7 (plan 실패 시나리오 5): 옛 판 탭이 남긴 { howMuch: 'out' } 칸이 있어도 '뒤로'가 한 단계씩 간다
test("CAREER-35 AC-7 an old { howMuch: 'out' } entry does not break back", async () => {
  history.replaceState({ howMuch: 'out' }, '')
  renderApp()
  walkToPrice({ tags: ['🎁 선물', '🏆 인생템'] })
  expect(submit()).toBeTruthy() // ④

  await back() // ③
  expect(tagGroup().getByRole('button', { name: '🏆 인생템', exact: true }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.queryByRole('group', { name: '마음 가격' })).toBeNull()
  await back() // ②
  expect(screen.getByLabelText('사진 고르기')).toBeTruthy()
  expect(screen.queryByRole('group', { name: '사연 태그' })).toBeNull()
  expect(appraise).not.toHaveBeenCalled()
})

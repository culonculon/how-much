// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { appraise } from '../src/appraise.js'
import { BUSY_TEXT, ERROR_TEXT, OFF_DUTY_TEXT } from '../src/options.js'
import {
  back, face, hold, jpg, next, pickFile, pickPrice, png, preview, priceGroup, renderApp, reject, resetHistory,
  submit, tagGroup, walkToPrice,
} from './shop-steps.jsx'

vi.mock('../src/appraise.js', () => ({ appraise: vi.fn(), FAKE_DELAY_MS: 800 }))

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
  appraise.mockReset()
  resetHistory()
})
afterEach(cleanup)

const card = () => screen.queryByRole('region', { name: '감정 결과' })
const pressedNames = (group) =>
  group.getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent)

// 첫 감정이 거부되는 경우와, 앞 결과를 보고 ④로 돌아와 거부되는 경우
const WHERE = [
  ['first', false],
  ['after a card', true],
]
// [코드, 문구가 나오는 코드, 버튼 이름]. 코드 없음은 unavailable 문구
const CODES = [
  ['refused', 'refused', '사진 다시 꺼내기'],
  ['unavailable', 'unavailable', '다시 감정 받기'],
  ['person_limit', 'person_limit', '조금 뒤에 다시'],
  ['daily_limit', 'daily_limit', '내일 다시 오기'],
  [undefined, 'unavailable', '다시 감정 받기'],
]

// 사진 · 태그(선물) · 가격(10개)을 고르고 거부될 때까지 간다
async function reachFailure(code, afterCard) {
  renderApp()
  walkToPrice()
  pickPrice('🍡 10개')
  if (afterCard) {
    appraise.mockResolvedValueOnce({ mochi: 3, line: '첫 대사' })
    fireEvent.click(submit())
    await screen.findByRole('region', { name: '감정 결과' })
    await back() // ④
  }
  appraise.mockRejectedValueOnce(reject(code))
  fireEvent.click(submit())
  await screen.findByTestId(code === 'daily_limit' ? 'off-duty' : 'appraise-error')
}

describe.each(WHERE)('CAREER-35 AC-5 %s', (where, afterCard) => {
  // ① 문구는 지금 글자 그대로, 실패는 alert, 앞 결과 카드 · 공유 버튼 없음
  test.each(CODES)('CAREER-35 AC-5 ① %s is shown as is', async (code, textCode) => {
    await reachFailure(code, afterCard)
    if (code === 'daily_limit') {
      expect(within(screen.getByRole('status', { name: '감정사 아저씨' })).getByTestId('off-duty').textContent).toBe(OFF_DUTY_TEXT)
      expect(screen.queryByTestId('appraise-error')).toBeNull()
      expect(screen.queryByRole('alert')).toBeNull()
    } else {
      const notice = screen.getByTestId('appraise-error')
      expect(notice.textContent).toBe(ERROR_TEXT[textCode])
      expect(screen.getByRole('alert')).toBe(notice)
      expect(screen.queryByTestId('off-duty')).toBeNull()
    }
    expect(card()).toBeNull()
    expect(screen.queryByRole('button', { name: /공유/ })).toBeNull()
    expect(appraise).toHaveBeenCalledTimes(afterCard ? 2 : 1)
  })

  // ② 버튼: refused는 ②, 나머지는 ④. 고른 것 · 문구 그대로
  test.each(CODES)('CAREER-35 AC-5 ② %s button returns with choices kept', async (code, textCode, buttonName) => {
    await reachFailure(code, afterCard)
    fireEvent.click(screen.getByRole('button', { name: buttonName, exact: true }))
    const noticeText = () =>
      code === 'daily_limit' ? screen.getByTestId('off-duty').textContent : screen.getByTestId('appraise-error').textContent
    const noticeWant = code === 'daily_limit' ? OFF_DUTY_TEXT : ERROR_TEXT[textCode]

    if (code === 'refused') {
      expect(screen.getByLabelText('사진 고르기')).toBeTruthy() // ②
      expect(preview()).not.toBeNull()
      expect(noticeText()).toBe(noticeWant)
      next() // ③ 태그 그대로
      expect(pressedNames(tagGroup())).toEqual(['🎁 선물'])
      next() // ④ 가격 그대로
      expect(pressedNames(priceGroup())).toEqual(['🍡 10개'])
    } else {
      expect(submit()).toBeTruthy() // ④
      expect(submit().disabled).toBe(false)
      expect(pressedNames(priceGroup())).toEqual(['🍡 10개'])
      expect(noticeText()).toBe(noticeWant)
      await back() // ③ 태그 그대로
      expect(pressedNames(tagGroup())).toEqual(['🎁 선물'])
      await back() // ② 미리보기 그대로
      expect(preview()).not.toBeNull()
    }
    expect(appraise).toHaveBeenCalledTimes(afterCard ? 2 : 1) // 버튼만으로는 보내지 않음
  })
})

// ③ invalid_input은 자동으로 ②, 문구 + 고른 것 그대로, 다른 사진을 고르면 문구가 사라진다
test('CAREER-35 AC-5 ③ invalid_input returns to step 2', async () => {
  renderApp()
  walkToPrice()
  pickPrice('🍡 10개')
  appraise.mockRejectedValueOnce(reject('invalid_input'))
  fireEvent.click(submit())
  const notice = await screen.findByTestId('appraise-error')

  expect(screen.getByLabelText('사진 고르기')).toBeTruthy() // ②
  expect(notice.textContent).toBe(ERROR_TEXT.invalid_input)
  expect(preview()).not.toBeNull()
  expect(screen.getByRole('button', { name: '다음' }).disabled).toBe(false)

  pickFile(jpg())
  expect(screen.queryByTestId('appraise-error')).toBeNull()
  expect(preview()).not.toBeNull()
  next()
  expect(pressedNames(tagGroup())).toEqual(['🎁 선물'])
  next()
  expect(pressedNames(priceGroup())).toEqual(['🍡 10개'])
  expect(appraise).toHaveBeenCalledTimes(1)
})

// ④ 갸웃 중 뒤로 → 감정 받기 꺼짐 + 바쁨 안내, 늦은 답(성공 · 실패)은 버리고, 그때 눌러 다시 감정
test.each([
  ['success', (h) => h.resolve({ mochi: 3, line: '버려질 답' })],
  ['failure', (h) => h.reject(reject('unavailable'))],
])('CAREER-35 AC-5 ④ back while thinking shows busy, then a retry works (late %s)', async (_name, settle) => {
  const h = hold()
  renderApp()
  walkToPrice()
  pickPrice('🍡 10개')
  fireEvent.click(submit())
  await back()

  expect(submit().disabled).toBe(true)
  expect(screen.getByText(BUSY_TEXT).textContent).toBe(BUSY_TEXT)
  expect(card()).toBeNull()

  await act(async () => settle(h))
  expect(card()).toBeNull() // 늦은 답은 결과로 넘어가지 않는다
  expect(screen.queryByTestId('appraise-error')).toBeNull()
  expect(screen.queryByText(BUSY_TEXT)).toBeNull()
  expect(submit().disabled).toBe(false)
  expect(appraise).toHaveBeenCalledTimes(1)

  appraise.mockResolvedValueOnce({ mochi: 7, line: '둘째' })
  fireEvent.click(submit())
  const region = await screen.findByRole('region', { name: '감정 결과' })
  expect(within(region).getByTestId('appraised-price').textContent).toBe('모찌 7개')
  expect(within(region).getByTestId('mascot-line').textContent).toBe('둘째')
  expect(appraise).toHaveBeenCalledTimes(2)
})

// Q2: '다른 물건 꺼내기'는 사진 · 태그 · 가격을 모두 비우고 ②로 간다
test('CAREER-35 Q2 another item clears everything and goes to step 2', async () => {
  appraise.mockResolvedValueOnce({ mochi: 3, line: '첫 대사' })
  renderApp()
  walkToPrice({ tags: ['🎁 선물', '🏆 인생템'] })
  pickPrice('🍡 10개')
  fireEvent.click(submit())
  await screen.findByRole('region', { name: '감정 결과' })

  fireEvent.click(screen.getByRole('button', { name: '다른 물건 꺼내기' }))
  expect(screen.getByLabelText('사진 고르기')).toBeTruthy() // ②
  expect(preview()).toBeNull()
  expect(screen.getByRole('button', { name: '다음' }).disabled).toBe(true)
  expect(card()).toBeNull()
  expect(face()).toBe('base')

  pickFile(png())
  next()
  expect(pressedNames(tagGroup())).toEqual([]) // ③
  next()
  expect(pressedNames(priceGroup())).toEqual([]) // ④
  expect(submit().disabled).toBe(true)
  expect(face()).toBe('base')
  expect(appraise).toHaveBeenCalledTimes(1) // 보내지 않음
})

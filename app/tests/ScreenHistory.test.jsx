// @vitest-environment jsdom
import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from '../src/App.jsx'
import { appraise } from '../src/appraise.js'
import { BUSY_TEXT } from '../src/options.js'

vi.mock('../src/appraise.js', () => ({ appraise: vi.fn(), FAKE_DELAY_MS: 800 }))

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
  appraise.mockReset()
  history.replaceState(null, '') // 앞 테스트가 남긴 history.state가 pushState 확인을 가리지 않게
})
afterEach(cleanup)

const png = () => new File(['x'], 'cat.png', { type: 'image/png' })

function renderApp() {
  return render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
const pickFile = (file) =>
  fireEvent.change(screen.getByLabelText('사진 고르기'), { target: { files: [file] } })
const priceGroup = () => within(screen.getByRole('group', { name: '마음 가격' }))
const tagGroup = () => within(screen.getByRole('group', { name: '사연 태그' }))
const pickPrice = (name) => fireEvent.click(priceGroup().getByRole('button', { name, exact: true }))
const pickTag = (name) => fireEvent.click(tagGroup().getByRole('button', { name, exact: true }))
const submit = () => screen.getByRole('button', { name: '감정 받기' })
const preview = () => screen.queryByRole('img', { name: '고른 사진 미리보기' })
const mascot = () => screen.getByRole('status', { name: '감정사 아저씨' })
const reject = (code) => Object.assign(new Error('x'), code ? { code } : {})
const card = () => screen.queryByRole('region', { name: '감정 결과' })
const again = () => screen.getByRole('button', { name: '다시 감정' })
const popstate = () => act(() => window.dispatchEvent(new PopStateEvent('popstate')))

// 답을 테스트가 풀어 줄 때까지 붙잡는다
function hold() {
  let resolve, reject
  appraise.mockReturnValueOnce(
    new Promise((res, rej) => {
      resolve = res
      reject = rej
    }),
  )
  return { resolve, reject }
}

function choose() {
  renderApp()
  pickFile(png())
  pickPrice('🍡 10개')
  pickTag('🎁 선물')
}

// 첫 결과(모찌 3개)까지 간다
async function firstCard() {
  appraise.mockResolvedValueOnce({ mochi: 3, line: '첫 대사' })
  choose()
  fireEvent.click(submit())
  await screen.findByText('모찌 3개')
}

// 입력 화면이고 고른 것이 그대로
function expectInputWithChoices() {
  expect(screen.getByLabelText('사진 고르기')).toBeTruthy()
  expect(preview()).not.toBeNull()
  expect(priceGroup().getByRole('button', { name: '🍡 10개' }).getAttribute('aria-pressed')).toBe('true')
  expect(tagGroup().getByRole('button', { name: '🎁 선물' }).getAttribute('aria-pressed')).toBe('true')
}

// CAREER-32 AC-5 ⑤ (U10 b): 갸웃 중 popstate → 입력 화면, 감정 받기는 꺼짐, 늦은 성공은 버린다
test('CAREER-32 AC-5 popstate while thinking returns to input and drops the late answer', async () => {
  expect(BUSY_TEXT).toBe('앞 감정을 마무리하는 중이에요. 끝나면 다시 누를 수 있어요.') // 사용자가 정한 글자 (2026-10-31)
  const { resolve } = hold()
  choose()
  fireEvent.click(submit())
  popstate()

  expectInputWithChoices()
  expect(submit().disabled).toBe(true)
  expect(screen.getByText(BUSY_TEXT).id).toBe('busy-note')
  expect(submit().getAttribute('aria-describedby')).toBe('region-notice busy-note')
  expect(document.activeElement.id).toBe('busy-note')
  expect(mascot().textContent).not.toContain('갸웃')

  await act(async () => resolve({ mochi: 3, line: 'x' }))
  expect(card()).toBeNull()
  expect(submit().disabled).toBe(false)
  expect(submit().getAttribute('aria-describedby')).toBe('region-notice')
  expect(screen.queryByText(BUSY_TEXT)).toBeNull()
  expect(appraise).toHaveBeenCalledTimes(1)
})

// CAREER-32 AC-5 ⑤: 늦게 온 daily_limit도 버린다 (퇴근으로 바뀌지 않음)
test('CAREER-32 AC-5 popstate while thinking drops a late daily_limit too', async () => {
  const { reject: rejectLate } = hold()
  choose()
  fireEvent.click(submit())
  popstate()
  expectInputWithChoices()

  await act(async () => rejectLate(reject('daily_limit')))
  expect(mascot().textContent).not.toContain('🚶 퇴근')
  expect(screen.queryByTestId('off-duty')).toBeNull()
  expect(screen.queryByTestId('appraise-error')).toBeNull()
  expect(submit().disabled).toBe(false)
  expect(appraise).toHaveBeenCalledTimes(1)
})

// CAREER-32 AC-5 ④: 몇 번을 감정해도 history는 한 칸만 늘고, 그 칸에 우리 표시가 있다
test('CAREER-32 AC-5 history grows by at most one entry over many appraisals', async () => {
  const before = history.length
  appraise.mockResolvedValueOnce({ mochi: 3, line: 'a' })
  appraise.mockResolvedValueOnce({ mochi: 7, line: 'b' })
  appraise.mockResolvedValueOnce({ mochi: 9, line: 'c' })
  choose()
  for (const text of ['모찌 3개', '모찌 7개', '모찌 9개']) {
    fireEvent.click(submit())
    await screen.findByText(text)
    if (text !== '모찌 9개') fireEvent.click(again())
  }
  expect(history.length).toBeLessThanOrEqual(before + 1)
  expect(history.state).toEqual({ howMuch: 'out' })
})

// CAREER-32 AC-5 ① + plan A1 초점: 결과에서 popstate → 입력 화면, 초점은 감정 받기
test('CAREER-32 AC-5 popstate on a result returns to input with focus on submit', async () => {
  await firstCard()
  popstate()

  expectInputWithChoices()
  expect(card()).toBeNull()
  expect(document.activeElement).toBe(submit())
})

// CAREER-32 R1 ①: 갸웃 중 popstate 뒤 늦은 답(성공·실패)이 와서 busy-note가 사라져도 초점은 감정 받기로 간다
test.each([
  ['success', (h) => h.resolve({ mochi: 3, line: 'x' })],
  ['failure', (h) => h.reject(reject('unavailable'))],
])('CAREER-32 R1 late %s moves focus from busy note to submit', async (_name, settle) => {
  const h = hold()
  choose()
  fireEvent.click(submit())
  popstate()
  expect(document.activeElement.id).toBe('busy-note')

  await act(async () => settle(h))
  expect(screen.queryByText(BUSY_TEXT)).toBeNull()
  expect(document.activeElement).toBe(submit())
})

// CAREER-32 R1 ②: 사용자가 다른 칸에 초점을 둔 뒤 늦은 답이 와도 초점은 그대로
test('CAREER-32 R1 late answer leaves focus alone when it is elsewhere', async () => {
  const h = hold()
  choose()
  fireEvent.click(submit())
  popstate()
  const other = priceGroup().getByRole('button', { name: '🍡 10개' })
  act(() => other.focus())

  await act(async () => h.resolve({ mochi: 3, line: 'x' }))
  expect(screen.queryByText(BUSY_TEXT)).toBeNull()
  expect(document.activeElement).toBe(other)
})

// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { appraise } from '../src/appraise.js'
import { BUSY_TEXT } from '../src/options.js'
import { back, enter, face, hold, next, pickFile, pickPrice, png, renderApp, reject, resetHistory, submit, walkToPrice } from './shop-steps.jsx'

vi.mock('../src/appraise.js', () => ({ appraise: vi.fn(), FAKE_DELAY_MS: 800 }))

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
  appraise.mockReset()
  resetHistory()
})
afterEach(cleanup)

// ④에서 가격을 고르고 누른다
function press() {
  pickPrice('🍡 10개')
  fireEvent.click(submit())
}

// 거부당한 화면까지 간다
async function rejectedWith(code) {
  appraise.mockRejectedValueOnce(reject(code))
  renderApp()
  walkToPrice()
  press()
  await screen.findByTestId(code === 'daily_limit' ? 'off-duty' : 'appraise-error') // status 칸은 늘 있어 기다림이 안 된다
}

// AC-4 표: [화면, 표정, 화면까지 가는 길]. 길 끝에서 그 화면이 맞는지 먼저 확인한다.
const SCREENS = [
  ['① door', 'happy', async () => {
    renderApp()
    expect(screen.getByRole('button', { name: '가게에 들어가기' })).toBeTruthy()
  }],
  ['② photo', 'base', async () => {
    renderApp()
    enter()
    expect(screen.getByLabelText('사진 고르기')).toBeTruthy()
  }],
  ['③ tags', 'base', async () => {
    renderApp()
    enter()
    pickFile(png())
    next()
    expect(screen.getByRole('group', { name: '사연 태그' })).toBeTruthy()
  }],
  ['④ price', 'base', async () => {
    renderApp()
    walkToPrice()
    expect(submit()).toBeTruthy()
  }],
  ['⑤ thinking', 'think', async () => {
    hold()
    renderApp()
    walkToPrice()
    press()
    expect(screen.getByRole('progressbar', { name: '감정 중' })).toBeTruthy()
  }],
  ['⑥ result', 'happy', async () => {
    appraise.mockResolvedValueOnce({ mochi: 30, line: '흠… 귀한 물건이군!' })
    renderApp()
    walkToPrice()
    press()
    await screen.findByRole('region', { name: '감정 결과' })
  }],
  ['busy', 'base', async () => {
    hold()
    renderApp()
    walkToPrice()
    press()
    await back()
    expect(screen.getByText(BUSY_TEXT)).toBeTruthy()
  }],
  ['invalid_input', 'base', async () => {
    await rejectedWith('invalid_input')
    expect(screen.getByLabelText('사진 고르기')).toBeTruthy() // 자동으로 ②
  }],
  ['refused', 'frown', () => rejectedWith('refused')],
  ['unavailable', 'sweat', () => rejectedWith('unavailable')],
  ['no code', 'sweat', () => rejectedWith(undefined)],
  ['person_limit', 'sleepy', () => rejectedWith('person_limit')],
]

// 선반 물건 4개 · 계산대가 낮 장면에 있다
function expectDayScene() {
  const scene = screen.getByTestId('shop-scene')
  expect(scene.getAttribute('data-scene')).toBe('day')
  const items = screen.getAllByTestId('shop-item').map((el) => el.getAttribute('data-item'))
  expect(items.sort()).toEqual(['bear', 'clock', 'lamp', 'vase'])
  expect(screen.getByTestId('shop-counter')).toBeTruthy()
}

// AC-4: 화면마다 맞는 표정과 같은 장면
test.each(SCREENS)('CAREER-35 AC-4 %s shows %s', async (_screen, expected, goTo) => {
  await goTo()
  expect(face()).toBe(expected)
  expectDayScene()
})

// AC-4: daily_limit은 아저씨 없이 어두운 가게 + '오늘 영업 끝' 팻말
test('CAREER-35 AC-4 daily_limit has no uncle', async () => {
  await rejectedWith('daily_limit')
  expect(face()).toBeNull()
  expect(screen.getByTestId('shop-scene').getAttribute('data-scene')).toBe('night')
  expect(screen.getByTestId('closed-sign').textContent).toBe('오늘 영업 끝')
})

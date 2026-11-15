// @vitest-environment jsdom
// CAREER-40 T2: AC-1 ④ 내 값 숫자 칸 (plan A5). 구현을 import하지 않고 글자·표는 여기에 적는다.
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { appraise } from '../src/appraise.js'
import { makeCard } from '../src/shareCard.js'
import { PRICE_LABEL, minus, pickPrice, plus, priceGroup, priceInput, renderApp, resetHistory, submit, typePrice, walkToPrice, png } from './shop-steps.jsx'

vi.mock('../src/appraise.js', () => ({ appraise: vi.fn(), FAKE_DELAY_MS: 800 }))
// ShareRow가 쓰는 shareCard.js 내보내기 넷(makeCard · saveCard · CARD_W · CARD_H)을 모두 가짜로
vi.mock('../src/shareCard.js', () => ({
  makeCard: vi.fn(async () => new Blob(['x'], { type: 'image/jpeg' })),
  saveCard: vi.fn(),
  CARD_W: 1080,
  CARD_H: 1350,
}))

const LINE = '흠… 귀한 물건이군!'
const HINT_EMPTY = '한정선 몇 개에 넘길지 불러 주세요. 값만 궁금하면 ‘안 팔아’도 돼요.'
const HINT_BAD = '1부터 9999까지 정수만 넣을 수 있어요.'

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
  appraise.mockReset()
  makeCard.mockClear()
  resetHistory()
})
afterEach(cleanup)

const pressed = () =>
  priceGroup()
    .getAllByRole('button')
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent)
const hintOf = () => document.getElementById(priceInput().getAttribute('aria-describedby'))
const toPrice = () => {
  renderApp()
  walkToPrice()
}

// AC-1: 숫자 칸 하나 · − · + · 빠른 버튼 넷 · 안 팔아
test('CAREER-40 AC-1 price field, steps, quick buttons and never are there', () => {
  toPrice()
  const group = priceGroup()
  expect(group.getAllByRole('textbox')).toHaveLength(1)
  const field = group.getByRole('textbox', { name: PRICE_LABEL })
  expect(field.getAttribute('inputmode')).toBe('numeric')
  expect(field.type).not.toBe('number')
  for (const name of ['한 개 빼기', '한 개 더하기', '1개', '10개', '100개', '777개', '안 팔아']) {
    expect(group.getByRole('button', { name, exact: true }), name).toBeTruthy()
  }
})

// AC-1: 1 · 23 · 9999는 켜짐, 이유 문구 연결 없음
test.each(['1', '23', '9999'])('CAREER-40 AC-1 %s turns submit on', (text) => {
  toPrice()
  typePrice(text)
  expect(submit().disabled).toBe(false)
  expect(priceInput().hasAttribute('aria-describedby')).toBe(false)
})

// AC-1: 틀린 값은 꺼짐 + 이유 문구가 aria-describedby로 묶임 + 친 글자가 그대로(몰래 안 바뀜)
test.each(['', '0', '-5', '10000', '3.5', 'abc', '１２'])('CAREER-40 AC-1 %j keeps submit off and says why', (text) => {
  toPrice()
  const off = () => {
    expect(submit().disabled).toBe(true)
    expect(hintOf()?.textContent.trim()).toBeTruthy()
    expect(priceInput().value).toBe(text)
  }
  if (text === '') {
    off() // 처음 상태
    typePrice('23')
  }
  typePrice(text)
  off() // ''이면 다 지운 상태
})

// AC-1: +/− 한 칸씩, 끝에서 꺼짐
test('CAREER-40 AC-1 plus and minus step by one', () => {
  toPrice()
  const minusButton = () => screen.getByRole('button', { name: '한 개 빼기' })
  const plusButton = () => screen.getByRole('button', { name: '한 개 더하기' })
  expect(minusButton().disabled).toBe(true) // 빈 칸
  plus()
  expect(priceInput().value).toBe('1')
  expect(minusButton().disabled).toBe(true)
  plus()
  expect(priceInput().value).toBe('2')
  minus()
  expect(priceInput().value).toBe('1')
  typePrice('9999')
  expect(plusButton().disabled).toBe(true)
  minus()
  expect(priceInput().value).toBe('9998')
  typePrice('abc') // 틀린 글자(빈 칸 아님)면 둘 다 꺼짐 — 몰래 고치지 않는다
  expect(plusButton().disabled).toBe(true)
  expect(minusButton().disabled).toBe(true)
  expect(priceInput().value).toBe('abc')
})

// AC-1: 빠른 버튼은 칸을 채우고 그 버튼만 눌림
test('CAREER-40 AC-1 a quick button fills the field and only it is pressed', () => {
  toPrice()
  pickPrice('777개')
  expect(priceInput().value).toBe('777')
  expect(pressed()).toEqual(['777개'])
  pickPrice('10개')
  expect(priceInput().value).toBe('10')
  expect(pressed()).toEqual(['10개'])
})

// AC-1 (plan A5 결정): 손으로 바꾸면 값이 같아도 빠른 버튼은 눌린 것이 아니다
test('CAREER-40 AC-1 typing a quick number does not press its button', () => {
  toPrice()
  typePrice('10')
  expect(pressed()).toEqual([])
  pickPrice('10개')
  typePrice('100')
  expect(pressed()).toEqual([])
  typePrice('9')
  plus() // 9 → 10
  expect(priceInput().value).toBe('10')
  expect(pressed()).toEqual([])
})

// AC-1: 안 팔아는 칸을 비우고, 숫자 쪽을 만지면 풀린다
test('CAREER-40 AC-1 never empties the field and is released by any number action', () => {
  toPrice()
  typePrice('23')
  pickPrice('안 팔아')
  expect(priceInput().value).toBe('')
  expect(pressed()).toEqual(['안 팔아'])
  expect(submit().disabled).toBe(false)
  for (const act of [() => typePrice('5'), plus, () => pickPrice('100개')]) {
    pickPrice('안 팔아')
    expect(pressed()).toEqual(['안 팔아'])
    expect(priceInput().disabled).toBe(false) // 칸 · + 는 꺼지지 않는다
    expect(screen.getByRole('button', { name: '한 개 더하기' }).disabled).toBe(false)
    act()
    expect(pressed()).not.toContain('안 팔아')
  }
})

// AC-1 + AC-2 (plan A5 표): 숫자 → 보내는 id
test.each([
  ['1', 'one'],
  ['9', 'one'],
  ['10', 'ten'],
  ['99', 'ten'],
  ['100', 'hundred'],
  ['777', 'hundred'],
  ['9999', 'hundred'],
  [null, 'never'],
])('CAREER-40 AC-1 sends the mapped id: %s -> %s', async (text, id) => {
  appraise.mockResolvedValueOnce({ mochi: 30, line: LINE })
  toPrice()
  if (text === null) pickPrice('안 팔아')
  else typePrice(text)
  fireEvent.click(submit())
  expect(appraise).toHaveBeenCalledTimes(1)
  expect(appraise.mock.calls[0][0].myPrice).toBe(id)
  await screen.findByRole('region', { name: '감정 결과' })
})

// AC-1: 안내 문구 글자
test('CAREER-40 AC-1 shows the hint words', () => {
  toPrice()
  expect(hintOf().id).toBe('price-hint')
  expect(hintOf().textContent).toBe(HINT_EMPTY)
  typePrice('abc')
  expect(hintOf().textContent).toBe(HINT_BAD)
})

// AC-1 (K7 짝 — plan A6 'K7 — 다시 짬'): 숫자 칸에서 나가는 것은 숫자뿐이다
test('CAREER-40 AC-1 only the number leaves the price field', async () => {
  const photo = png()
  const sent = []
  navigator.share = vi.fn(async () => {})
  navigator.canShare = vi.fn(() => true)
  for (const text of ['0023', '23']) {
    appraise.mockResolvedValueOnce({ mochi: 30, line: LINE })
    resetHistory()
    renderApp()
    walkToPrice({ photo })
    typePrice(text)
    fireEvent.click(submit())
    const card = await screen.findByRole('region', { name: '감정 결과' })
    sent.push(appraise.mock.calls.at(-1)[0])
    expect(screen.getByTestId('my-shown').textContent).toBe('한정선 23개')
    expect(screen.getByTestId('my-price').textContent).toBe('한정선 모찌 23개')
    expect(card.textContent.split('0023')).toHaveLength(1)

    const share = screen.getByRole('button', { name: /^(공유|저장)$/ })
    await waitFor(() => expect(share.disabled).toBe(false))
    fireEvent.click(share)
    expect(makeCard.mock.calls.length).toBeGreaterThan(0)
    for (const call of makeCard.mock.calls) {
      expect(typeof call[1]).toBe('number')
      expect(call[1]).toBe(23)
    }
    makeCard.mockClear()
    cleanup()
  }
  expect(sent[0]).toEqual(sent[1])
  expect(Object.keys(sent[0]).sort()).toEqual(['myPrice', 'photo', 'tags'])
  expect(sent[0].myPrice).toBe('ten')
})

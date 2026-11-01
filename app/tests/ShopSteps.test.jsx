// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { appraise } from '../src/appraise.js'
import { REGION_NOTICE } from '../src/options.js'
import {
  enter, hold, jpg, next, pickFile, pickPrice, pickTag, png, preview, priceGroup, renderApp, resetHistory,
  submit, tagGroup, txt, walkToPrice,
} from './shop-steps.jsx'

vi.mock('../src/appraise.js', () => ({ appraise: vi.fn(), FAKE_DELAY_MS: 800 }))

// contracts/appraise.md §3 이름·순서
const TAG_GROUPS = [
  ['어떻게 왔나', ['🎁 선물', '💸 첫 월급', '🛫 여행', '🥕 중고 득템', '🎰 뽑기·경품', '👵 물려받음']],
  ['지금 상태', ['🗑️ 못 버림', '📦 상자째 보관', '🩹 고쳐 씀', '🐾 반려동물이 씹음']],
  ['마음', ['💔 전 애인 흔적', '🏆 인생템', '🤦 충동구매 후회', '🤷 그냥 좋아']],
  ['자랑', ['🔥 지금은 못 구함', '🧓 10년 넘음']],
]
const BAD_FILE_TEXT = '사진을 다시 골라 주세요 (jpg·png)'

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
  appraise.mockReset()
  resetHistory()
})
afterEach(cleanup)

const photoInput = () => screen.queryByLabelText('사진 고르기')
const tagsGroup = () => screen.queryByRole('group', { name: '사연 태그' })
const priceGroupOrNull = () => screen.queryByRole('group', { name: '마음 가격' })
const buttonNames = () => screen.queryAllByRole('button')

// 주소는 모든 단계에서 `/`
function expectRoot() {
  expect(location.pathname).toBe('/')
  expect(location.hash).toBe('')
}

// 이 단계에서 보이는 고르는 칸 { photo, tags, price, notice, submit }만 있고 나머지는 없다
function expectOnly({ photo = false, tags = false, price = false }) {
  expect(Boolean(photoInput())).toBe(photo)
  expect(Boolean(tagsGroup())).toBe(tags)
  expect(Boolean(priceGroupOrNull())).toBe(price)
  expect(Boolean(screen.queryByText(REGION_NOTICE))).toBe(price)
  expect(Boolean(screen.queryByRole('button', { name: '감정 받기!' }))).toBe(price)
}

const pressedOf = (group) =>
  Object.fromEntries(group.getAllByRole('button').map((b) => [b.textContent, b.getAttribute('aria-pressed')]))

// AC-1: ① → ⑥, 한 번에 하나, 고르는 칸은 자기 단계에서만
test('CAREER-35 AC-1 six steps appear one at a time', async () => {
  const { resolve } = hold()
  renderApp()

  // ①
  expect(screen.getByRole('button', { name: '가게에 들어가기' })).toBeTruthy()
  expect(buttonNames()).toHaveLength(1)
  expectOnly({})
  expectRoot()

  // ②
  enter()
  expectOnly({ photo: true })
  expect(buttonNames()).toHaveLength(1)
  expect(screen.getByRole('button', { name: '다음' })).toBeTruthy()
  expect(preview()).toBeNull()
  expectRoot()
  pickFile(png())
  expect(preview()).not.toBeNull() // 고른 사진의 미리보기
  next()

  // ③
  expectOnly({ tags: true })
  expect(screen.getByRole('button', { name: '다음' })).toBeTruthy()
  expect(preview()).toBeNull()
  expectRoot()
  pickTag('🎁 선물')
  next()

  // ④
  expectOnly({ price: true })
  expect(screen.getByText(REGION_NOTICE)).toBeTruthy()
  expect(screen.queryByRole('button', { name: '다음' })).toBeNull()
  expectRoot()
  pickPrice('🍡 10개')
  fireEvent.click(submit())

  // ⑤
  expectOnly({})
  expect(screen.queryAllByRole('button')).toHaveLength(0)
  const bar = screen.getByRole('progressbar', { name: '감정 중' })
  expect(bar.hasAttribute('aria-valuenow')).toBe(false) // 서버가 진행률을 주지 않음
  expect(document.body.textContent).not.toContain('%')
  expect(screen.queryByRole('region', { name: '감정 결과' })).toBeNull()
  expectRoot()

  // ⑥
  resolve({ mochi: 30, line: '흠… 귀한 물건이군!' })
  const region = await screen.findByRole('region', { name: '감정 결과' })
  const inCard = within(region)
  expect(inCard.getByTestId('appraised-price').textContent).toBe('모찌 30개')
  expect(inCard.getByTestId('my-price').textContent).toBe('모찌 10개')
  expect(inCard.getByTestId('compare-line')).toBeTruthy()
  expect(inCard.getByTestId('mascot-line').textContent).toBe('흠… 귀한 물건이군!')
  expect(screen.getByRole('button', { name: '다른 물건 꺼내기' })).toBeTruthy()
  expectOnly({})
  expect(screen.queryByRole('progressbar')).toBeNull()
  expectRoot()
  expect(appraise).toHaveBeenCalledTimes(1)
})

// AC-2: ②의 '다음'은 jpg · png를 고르기 전에는 꺼져 있다
test('CAREER-35 AC-2 next is off until a jpg or png is chosen', () => {
  renderApp()
  enter()
  const nextButton = () => screen.getByRole('button', { name: '다음' })
  expect(nextButton().disabled).toBe(true)

  pickFile(txt())
  expect(nextButton().disabled).toBe(true)
  expect(screen.getByRole('alert').textContent).toBe(BAD_FILE_TEXT)
  expect(preview()).toBeNull()

  pickFile(jpg())
  expect(nextButton().disabled).toBe(false)
  expect(screen.queryByRole('alert')).toBeNull()

  pickFile(txt()) // 좋은 사진을 나쁜 파일로 바꾸면 다시 꺼진다
  expect(nextButton().disabled).toBe(true)
  expect(screen.getByRole('alert').textContent).toBe(BAD_FILE_TEXT)

  pickFile(png())
  expect(nextButton().disabled).toBe(false)
  expect(screen.queryByRole('alert')).toBeNull()
})

// AC-2: ③은 아무것도 안 고르고 넘어간다, 보내는 tags는 []
test('CAREER-35 AC-2 tags can be skipped', () => {
  hold()
  renderApp()
  enter()
  const photo = png()
  pickFile(photo)
  next()
  expect(tagsGroup()).not.toBeNull()
  expect(tagGroup().queryAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(0)
  next() // 태그 0개로 ④
  expectOnly({ price: true })
  pickPrice('🍡 10개')
  fireEvent.click(submit())
  expect(appraise).toHaveBeenCalledTimes(1)
  expect(appraise).toHaveBeenCalledWith({ photo, myPrice: 'ten', tags: [] })
})

// AC-2: ④의 '감정 받기!'는 가격을 고르기 전에는 꺼져 있다
test('CAREER-35 AC-2 submit is off until a price is chosen', () => {
  renderApp()
  walkToPrice()
  expect(submit().disabled).toBe(true)
  fireEvent.click(submit())
  expect(appraise).not.toHaveBeenCalled()
  pickPrice('🙅 안 팔아')
  expect(submit().disabled).toBe(false)
})

// AC-2: 태그는 contracts §3 이름 그대로 16개 · 4묶음, 보내는 tags는 눌린 차례가 아니라 contracts 차례
test('CAREER-35 AC-2 tags match contract §3 and are sent in contract order', () => {
  hold()
  renderApp()
  enter()
  const photo = png()
  pickFile(photo)
  next()

  const groups = tagGroup().getAllByRole('group')
  expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(TAG_GROUPS.map(([title]) => title))
  TAG_GROUPS.forEach(([title, names], i) => {
    expect(within(groups[i]).getAllByRole('button').map((b) => b.textContent), title).toEqual(names)
  })
  expect(tagGroup().getAllByRole('button')).toHaveLength(16)

  ;['🧓 10년 넘음', '🏆 인생템', '🗑️ 못 버림', '🎁 선물'].forEach(pickTag) // contracts 차례와 다르게 누른다
  next()
  pickPrice('🍡 10개')
  fireEvent.click(submit())
  expect(appraise).toHaveBeenCalledWith({
    photo,
    myPrice: 'ten',
    tags: ['how-1', 'now-1', 'feeling-2', 'brag-2'],
  })
})

// AC-2: 고른 칩은 aria-pressed="true", 안 고른 칩은 "false" (태그 · 가격 둘 다)
test('CAREER-35 AC-2 chosen chip is pressed', () => {
  renderApp()
  enter()
  pickFile(png())
  next()
  const state = (name) => tagGroup().getByRole('button', { name, exact: true }).getAttribute('aria-pressed')
  expect(state('🎁 선물')).toBe('false')
  pickTag('🎁 선물')
  expect(state('🎁 선물')).toBe('true')
  expect(state('🏆 인생템')).toBe('false')
  expect(Object.values(pressedOf(tagGroup())).filter((v) => v === 'true')).toHaveLength(1)
  pickTag('🎁 선물') // 다시 누르면 풀린다
  expect(state('🎁 선물')).toBe('false')

  pickTag('🏆 인생템')
  next()
  pickPrice('🍡 10개')
  expect(pressedOf(priceGroup())).toEqual({
    '🍡 1개': 'false',
    '🍡 10개': 'true',
    '🍡 100개': 'false',
    '🙅 안 팔아': 'false',
  })
})

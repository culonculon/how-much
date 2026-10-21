// @vitest-environment jsdom
import { StrictMode } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from '../src/App.jsx'
import { appraise } from '../src/appraise.js'

vi.mock('../src/appraise.js', () => ({ appraise: vi.fn(), FAKE_DELAY_MS: 800 }))

// contracts/appraise.md §2 순서
const PRICES = ['🍡 1개', '🍡 10개', '🍡 100개', '🙅 안 팔아']
// contracts/appraise.md §3 이름·순서
const TAG_GROUPS = [
  ['어떻게 왔나', ['🎁 선물', '💸 첫 월급', '🛫 여행', '🥕 중고 득템', '🎰 뽑기·경품', '👵 물려받음']],
  ['지금 상태', ['🗑️ 못 버림', '📦 상자째 보관', '🩹 고쳐 씀', '🐾 반려동물이 씹음']],
  ['마음', ['💔 전 애인 흔적', '🏆 인생템', '🤦 충동구매 후회', '🤷 그냥 좋아']],
  ['자랑', ['🔥 지금은 못 구함', '🧓 10년 넘음']],
]
const FREE_TEXT = 'textarea, input:not([type=file]), [contenteditable]:not([contenteditable=false])'

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
  appraise.mockReset()
})
afterEach(cleanup)

const png = () => new File(['x'], 'cat.png', { type: 'image/png' })
const txt = () => new File(['x'], 'note.txt', { type: 'text/plain' })

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

// AC-2: 이미지가 아닌 파일은 받지 않는다
test('AC-2 rejects a non-image file', () => {
  renderApp()
  pickFile(txt())
  expect(preview()).toBeNull()
  expect(screen.getByRole('alert').textContent).toContain('다시 골라')
  pickPrice('🍡 10개')
  expect(submit().disabled).toBe(true)
})

// AC-2: 사진을 고른 뒤 잘못된 파일을 고르면 미리보기가 사라진다
test('AC-2 a bad file after a good one clears the preview', () => {
  renderApp()
  pickFile(png())
  expect(preview()).not.toBeNull()
  pickFile(txt())
  expect(preview()).toBeNull()
})

// AC-3: 마음 가격 버튼 4개, 마지막에 누른 하나만 선택됨
test('AC-3 four price buttons, only the last pressed is selected', () => {
  renderApp()
  const buttons = priceGroup().getAllByRole('button')
  expect(buttons.map((b) => b.textContent)).toEqual(PRICES)
  pickPrice('🍡 1개')
  pickPrice('🙅 안 팔아')
  const pressed = Object.fromEntries(
    priceGroup()
      .getAllByRole('button')
      .map((b) => [b.textContent, b.getAttribute('aria-pressed')]),
  )
  expect(pressed).toEqual({
    '🍡 1개': 'false',
    '🍡 10개': 'false',
    '🍡 100개': 'false',
    '🙅 안 팔아': 'true',
  })
})

// AC-4: 묶음 4개(6·4·4·2), 이름은 contracts 그대로, 토글
test('AC-4 tag groups, names and counts match the contract', () => {
  renderApp()
  const groups = tagGroup().getAllByRole('group')
  expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(TAG_GROUPS.map(([t]) => t))
  TAG_GROUPS.forEach(([title, names], i) => {
    const buttons = within(groups[i]).getAllByRole('button')
    expect(buttons.map((b) => b.textContent), title).toEqual(names)
  })
})

// AC-4: 둘을 누르고 하나를 다시 누르면 그 하나만 풀린다
test('AC-4 pressing a tag twice unselects it, the other stays selected', () => {
  renderApp()
  const [a, b] = ['🎁 선물', '🏆 인생템']
  pickTag(a)
  pickTag(b)
  pickTag(a)
  const state = (name) =>
    tagGroup().getByRole('button', { name, exact: true }).getAttribute('aria-pressed')
  expect(state(a)).toBe('false')
  expect(state(b)).toBe('true')
})

// AC-5: 첫 화면과 결과 카드에 자유 글 칸이 없다
test('AC-5 no free-text field on the first screen or the result card', async () => {
  appraise.mockResolvedValue({ mochi: 3, line: '대사' })
  const { container } = renderApp()
  expect(container.querySelectorAll(FREE_TEXT)).toHaveLength(0)
  pickFile(png())
  pickPrice('🍡 10개')
  fireEvent.click(submit())
  await screen.findByRole('region', { name: '감정 결과' })
  expect(container.querySelectorAll(FREE_TEXT)).toHaveLength(0)
})

// AC-6: (a) 처음 (b) 사진만 (c) 마음 가격만 → 비활성, 둘 다 → 활성
test('AC-6a nothing chosen disables the submit button', () => {
  renderApp()
  expect(submit().disabled).toBe(true)
})
test('AC-6b photo only disables the submit button', () => {
  renderApp()
  pickFile(png())
  expect(submit().disabled).toBe(true)
})
test('AC-6c price only disables the submit button', () => {
  renderApp()
  pickPrice('🍡 10개')
  expect(submit().disabled).toBe(true)
})
test('AC-6 photo and price enable the submit button with zero tags', () => {
  renderApp()
  pickFile(png())
  pickPrice('🍡 10개')
  expect(submit().disabled).toBe(false)
})

// 직접 쥔 Promise로 감정 중 상태를 붙잡는다
function holdAppraise() {
  let resolve
  appraise.mockReturnValue(new Promise((r) => (resolve = r)))
  return (value) => resolve(value)
}
const mascot = () => screen.getByRole('status', { name: '감정사 아저씨' })

// AC-7: 갸웃, 버튼 비활성, 두 번 눌러도 호출 1번
test('AC-7 thinking state, disabled button, appraise called once', () => {
  holdAppraise()
  renderApp()
  const photo = png()
  pickFile(photo)
  pickPrice('🍡 10개')
  pickTag('🎁 선물')
  fireEvent.click(submit())
  fireEvent.click(submit())
  expect(mascot().textContent).toContain('갸웃')
  expect(submit().disabled).toBe(true)
  expect(appraise).toHaveBeenCalledTimes(1)
  expect(appraise).toHaveBeenCalledWith({ photo, myPrice: 'ten', tags: ['how-1'] })
  expect(screen.queryByRole('region', { name: '감정 결과' })).toBeNull()
})

// AC-8: 도장 + 결과 카드 (아저씨 값 · 내 값 · 대사)
test('AC-8 stamp state and result card', async () => {
  const resolve = holdAppraise()
  renderApp()
  pickFile(png())
  pickPrice('🍡 10개')
  fireEvent.click(submit())
  resolve({ mochi: 7, line: '테스트 대사' })
  const card = within(await screen.findByRole('region', { name: '감정 결과' }))
  expect(mascot().textContent).toContain('도장')
  expect(card.getByTestId('appraised-price').textContent).toBe('모찌 7개')
  expect(card.getByTestId('my-price').textContent).toBe('모찌 10개')
  expect(card.getByTestId('mascot-line').textContent).toBe('테스트 대사')
})

// AC-8: 안 팔아는 카드에 '안 팔아'로 나온다
test('AC-8 never-sell price shows as 안 팔아 on the card', async () => {
  const resolve = holdAppraise()
  renderApp()
  pickFile(png())
  pickPrice('🙅 안 팔아')
  fireEvent.click(submit())
  resolve({ mochi: 0, line: '허허' })
  const card = within(await screen.findByRole('region', { name: '감정 결과' }))
  expect(card.getByTestId('my-price').textContent).toBe('안 팔아')
  expect(card.getByTestId('appraised-price').textContent).toBe('모찌 0개')
})

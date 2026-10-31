// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { StrictMode } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from '../src/App.jsx'
import { appraise } from '../src/appraise.js'
import { ERROR_TEXT as APP_ERROR_TEXT, OFF_DUTY_TEXT } from '../src/options.js'

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
const jpg = () => new File(['x'], 'cat.jpg', { type: 'image/jpeg' })
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
const again = () => screen.getByRole('button', { name: '다시 감정' })

// AC-7: 갸웃, 버튼 비활성, 두 번 눌러도 호출 1번
test('AC-7 thinking state, disabled button, appraise called once', () => {
  holdAppraise()
  renderApp()
  const photo = png()
  pickFile(photo)
  pickPrice('🍡 10개')
  pickTag('🎁 선물')
  const button = submit()
  fireEvent.click(button)
  fireEvent.click(button)
  expect(mascot().textContent).toContain('갸웃')
  expect(screen.queryByRole('button', { name: '감정 받기' })).toBeNull()
  expect(appraise).toHaveBeenCalledTimes(1)
  expect(appraise).toHaveBeenCalledWith({ photo, myPrice: 'ten', tags: ['how-1'] })
  expect(screen.queryByRole('region', { name: '감정 결과' })).toBeNull()
})

// AC-1: jpg도 미리보기가 나온다
test('AC-1 shows a preview for a jpg file', () => {
  renderApp()
  pickFile(jpg())
  expect(preview()).not.toBeNull()
  expect(screen.queryByRole('alert')).toBeNull()
})

// AC-7/AC-9: 태그는 누른 순서가 아니라 contracts/appraise.md §3 표 순서로 넘어간다
test('AC-7 passes several tags to appraise in contract order, not press order', () => {
  holdAppraise()
  renderApp()
  const photo = png()
  pickFile(photo)
  pickPrice('🍡 10개')
  ;['🧓 10년 넘음', '🏆 인생템', '🗑️ 못 버림', '🎁 선물'].forEach(pickTag)
  fireEvent.click(submit())
  expect(appraise).toHaveBeenCalledWith({
    photo,
    myPrice: 'ten',
    tags: ['how-1', 'now-1', 'feeling-2', 'brag-2'],
  })
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

// contracts/appraise.md §5 문구 (CAREER-26)
const ERROR_TEXT = {
  invalid_input: '사진이나 선택을 다시 골라 주세요.',
  refused: '이 사진은 감정하지 않아요. 물건 사진으로 다시 골라 주세요.',
  unavailable: "감정이 잘 안 됐어요. 잠시 뒤 '감정 받기'를 다시 눌러 주세요.",
  person_limit: '허허, 너무 자주 왔구먼. 좀 쉬었다 와.',
}
const reject = (code) => Object.assign(new Error('x'), code ? { code } : {})

// AC-7: 거절되면 갸웃이 끝나고 안내가 보이며, 다른 사진으로 다시 누를 수 있다
test('AC-7 invalid_input ends thinking, shows the notice, and allows a second try', async () => {
  appraise.mockRejectedValueOnce(reject('invalid_input'))
  renderApp()
  pickFile(png())
  pickPrice('🍡 10개')
  fireEvent.click(submit())
  const notice = await screen.findByTestId('appraise-error')
  expect(notice.textContent).toBe(ERROR_TEXT.invalid_input)
  expect(mascot().textContent).toContain('대기')
  fireEvent.click(again())
  expect(submit().disabled).toBe(false)

  pickFile(jpg())
  expect(screen.queryByTestId('appraise-error')).toBeNull()
  appraise.mockReturnValue(new Promise(() => {}))
  fireEvent.click(submit())
  expect(appraise).toHaveBeenCalledTimes(2)
})

// AC-7 (plan S1 D): 모든 실패에서 갸웃이 끝나고 §5 문구가 보인다
test.each([
  ['unavailable', 'unavailable'],
  ['refused', 'refused'],
  ['person_limit', 'person_limit'],
  [undefined, 'unavailable'],
])('AC-7 failure code %s shows the %s notice and idles the mascot', async (code, text) => {
  appraise.mockRejectedValueOnce(reject(code))
  renderApp()
  pickFile(png())
  pickPrice('🍡 10개')
  fireEvent.click(submit())
  expect((await screen.findByTestId('appraise-error')).textContent).toBe(ERROR_TEXT[text])
  expect(mascot().textContent).toContain('대기')
  expect(screen.queryByRole('region', { name: '감정 결과' })).toBeNull()
})

// CAREER-27 AC-9: daily_limit은 오류가 아니라 퇴근 상태다
async function reachOffDuty() {
  appraise.mockRejectedValueOnce(reject('daily_limit'))
  renderApp()
  pickFile(png())
  pickPrice('🍡 10개')
  fireEvent.click(submit())
  await screen.findByTestId('off-duty')
}

test('CAREER-27 AC-9 daily_limit shows off-duty mascot, no error, no card, and retry thinks again', async () => {
  await reachOffDuty()
  expect(mascot().textContent).toContain('🚶 퇴근')
  expect(within(mascot()).getByTestId('off-duty').textContent).toBe(OFF_DUTY_TEXT)
  expect(screen.queryByTestId('appraise-error')).toBeNull()
  expect(screen.queryByRole('region', { name: '감정 결과' })).toBeNull()
  fireEvent.click(again())
  expect(submit().disabled).toBe(false)

  appraise.mockReturnValue(new Promise(() => {}))
  fireEvent.click(submit())
  expect(mascot().textContent).toContain('갸웃')
  expect(screen.queryByTestId('off-duty')).toBeNull()
  expect(appraise).toHaveBeenCalledTimes(2)
})

test('CAREER-27 AC-9 picking another photo keeps the off-duty state', async () => {
  await reachOffDuty()
  fireEvent.click(again())
  pickFile(jpg())
  expect(mascot().textContent).toContain('🚶 퇴근')
  expect(screen.getByTestId('off-duty')).toBeTruthy()
  expect(submit().disabled).toBe(false)
})

test('CAREER-27 AC-9 a successful retry after off-duty shows the card and the stamp', async () => {
  await reachOffDuty()
  fireEvent.click(again())
  appraise.mockResolvedValueOnce({ mochi: 10, line: '흠' })
  fireEvent.click(submit())
  await screen.findByRole('region', { name: '감정 결과' })
  expect(mascot().textContent).toContain('도장')
  expect(screen.queryByTestId('off-duty')).toBeNull()
})

// CAREER-27 AC-9: 화면 글자 = contracts/appraise.md §5 daily_limit 줄의 첫 따옴표 글자
test('CAREER-27 AC-9 off-duty text matches contracts/appraise.md', () => {
  const doc = readFileSync(resolve(cwd(), '../contracts/appraise.md'), 'utf8')
  const line = doc.split('\n').find((l) => l.startsWith('| `daily_limit`'))
  expect(line).toBeTruthy()
  expect(OFF_DUTY_TEXT).toBeTruthy()
  expect(line.match(/"([^"]+)"/)[1]).toBe(OFF_DUTY_TEXT)
})

// CAREER-31 AC-5: person_limit은 퇴근이 아니라 오류 문구 + 갸웃 끝, 다시 누르면 다시 갸웃
test('CAREER-31 AC-5 person_limit is a notice, not off-duty, and retry thinks again', async () => {
  appraise.mockRejectedValueOnce(reject('person_limit'))
  renderApp()
  pickFile(png())
  pickPrice('🍡 10개')
  fireEvent.click(submit())
  await screen.findByTestId('appraise-error')
  expect(mascot().textContent).not.toContain('퇴근')
  expect(screen.queryByTestId('off-duty')).toBeNull()
  fireEvent.click(again())
  expect(submit().disabled).toBe(false)

  appraise.mockReturnValue(new Promise(() => {}))
  fireEvent.click(submit())
  expect(mascot().textContent).toContain('갸웃')
  expect(screen.queryByTestId('appraise-error')).toBeNull()
  expect(appraise).toHaveBeenCalledTimes(2)
})

// CAREER-31 AC-5: 화면 글자 = contracts/appraise.md §5 person_limit 줄의 첫 따옴표 글자, 30자 이내
test('CAREER-31 AC-5 person_limit text matches contracts/appraise.md and is at most 30 chars', () => {
  const doc = readFileSync(resolve(cwd(), '../contracts/appraise.md'), 'utf8')
  const line = doc.split('\n').find((l) => l.startsWith('| `person_limit`'))
  expect(line).toBeTruthy()
  const text = line.match(/"([^"]+)"/)[1]
  expect(APP_ERROR_TEXT.person_limit).toBe(text)
  expect([...text].length).toBeLessThanOrEqual(30)
})

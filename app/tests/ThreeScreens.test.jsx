// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { cwd } from 'node:process'
import { StrictMode } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from '../src/App.jsx'
import { appraise } from '../src/appraise.js'
import { REGION_NOTICE } from '../src/options.js'

vi.mock('../src/appraise.js', () => ({ appraise: vi.fn(), FAKE_DELAY_MS: 800 }))

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
  appraise.mockReset()
})
afterEach(cleanup)

const png = () => new File(['x'], 'cat.png', { type: 'image/png' })
const jpg = () => new File(['x'], 'cat.jpg', { type: 'image/jpeg' })

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

// 갸웃 · 결과 화면에는 고르는 칸이 없다
function noInputs() {
  expect(screen.queryByLabelText('사진 고르기')).toBeNull()
  expect(screen.queryByRole('group', { name: '마음 가격' })).toBeNull()
  expect(screen.queryByRole('group', { name: '사연 태그' })).toBeNull()
}

// contracts/appraise.md §5: `| `code` ` 줄의 첫 따옴표 글자
function contractText(code) {
  const doc = readFileSync(resolvePath(cwd(), '../contracts/appraise.md'), 'utf8')
  const line = doc.split('\n').find((l) => l.startsWith(`| \`${code}\``))
  expect(line, code).toBeTruthy()
  return line.match(/"([^"]+)"/)[1]
}

// CAREER-32 AC-1: 입력 → 갸웃 → 결과, 한 번에 하나, 화면이 바뀔 때마다 초점이 새 화면 안에
test('CAREER-32 AC-1 three screens appear one at a time', async () => {
  const { resolve } = hold()
  renderApp()
  expect(document.activeElement).toBe(document.body) // 처음엔 초점을 뺏지 않음

  // 입력 화면
  expect(screen.getByLabelText('사진 고르기')).toBeTruthy()
  expect(screen.getByRole('group', { name: '마음 가격' })).toBeTruthy()
  expect(screen.getByRole('group', { name: '사연 태그' })).toBeTruthy()
  expect(screen.getByText(REGION_NOTICE)).toBeTruthy()
  expect(submit()).toBeTruthy()
  expect(card()).toBeNull()
  expect(screen.queryByRole('button', { name: '다시 감정' })).toBeNull()
  expect(mascot().textContent).not.toContain('갸웃')
  expect(mascot().textContent).not.toContain('도장')

  pickFile(png())
  pickPrice('🍡 10개')
  pickTag('🎁 선물')
  const button = submit()
  fireEvent.click(button)
  fireEvent.click(button)

  // 갸웃 화면
  expect(mascot().textContent).toContain('🔍 갸웃')
  expect(screen.queryAllByRole('button')).toHaveLength(0)
  noInputs()
  expect(card()).toBeNull()
  expect(document.activeElement).toBe(mascot())

  // 결과 화면
  resolve({ mochi: 3, line: '첫 대사' })
  const region = await screen.findByRole('region', { name: '감정 결과' })
  expect(mascot().textContent).toContain('🔨 도장')
  const inCard = within(region)
  expect(inCard.getByTestId('appraised-price').textContent).toBe('모찌 3개')
  expect(inCard.getByTestId('my-price').textContent).toBe('모찌 10개')
  expect(inCard.getByTestId('mascot-line').textContent).toBe('첫 대사')
  expect(again()).toBeTruthy()
  noInputs()
  expect(screen.queryByRole('button', { name: '감정 받기' })).toBeNull()
  expect(appraise).toHaveBeenCalledTimes(1)
  expect(document.activeElement).toBe(region)
})

// 첫 결과(모찌 3개)까지 가서 고른 사진을 돌려준다 — 마음 가격 10개 · 태그 선물
async function firstCard() {
  appraise.mockResolvedValueOnce({ mochi: 3, line: '첫 대사' })
  renderApp()
  const photo = png()
  pickFile(photo)
  pickPrice('🍡 10개')
  pickTag('🎁 선물')
  fireEvent.click(submit())
  await screen.findByText('모찌 3개')
  return photo
}

const pressedOf = (group) =>
  Object.fromEntries(
    group.getAllByRole('button').map((b) => [b.textContent, b.getAttribute('aria-pressed')]),
  )

// 입력 화면에 고른 것이 그대로 있다 (AC-2 ① · AC-3 ②)
function expectChosen() {
  expect(preview()).not.toBeNull()
  expect(pressedOf(priceGroup())).toEqual({
    '🍡 1개': 'false',
    '🍡 10개': 'true',
    '🍡 100개': 'false',
    '🙅 안 팔아': 'false',
  })
  const tags = pressedOf(tagGroup())
  expect(Object.keys(tags)).toHaveLength(16)
  expect(Object.entries(tags).filter(([, on]) => on === 'true')).toEqual([['🎁 선물', 'true']])
  expect(submit().disabled).toBe(false)
}

// CAREER-32 AC-2 ① ②: '다시 감정'은 고른 것을 그대로 둔 입력 화면으로, 같은 값이 다시 나간다
test('CAREER-32 AC-2 again returns to the input screen with choices kept, then the same values are sent', async () => {
  const photo = await firstCard()
  fireEvent.click(again())

  expectChosen()
  expect(screen.queryByText('모찌 3개')).toBeNull()
  expect(card()).toBeNull()
  expect(mascot().textContent).not.toContain('도장')
  expect(mascot().textContent).not.toContain('갸웃')
  expect(appraise).toHaveBeenCalledTimes(1) // '다시 감정'만으로는 보내지 않음

  const { resolve } = hold()
  fireEvent.click(submit())
  expect(mascot().textContent).toContain('갸웃')
  expect(screen.queryByText('모찌 3개')).toBeNull()

  resolve({ mochi: 7, line: '둘째' })
  await screen.findByText('모찌 7개')
  expect(mascot().textContent).toContain('🔨 도장')
  expect(screen.queryByText('모찌 3개')).toBeNull()
  expect(appraise).toHaveBeenCalledTimes(2)
  expect(appraise.mock.calls[1][0]).toEqual(appraise.mock.calls[0][0])
  expect(appraise.mock.calls[1][0].photo).toBe(photo) // 같은 파일
})

// CAREER-32 AC-2 ③: 하나만 바꾸면 바꾼 것만 바뀌어 나가고, 카드의 '내 값'은 그때 고른 값
const other = jpg()
test.each([
  ['photo', () => pickFile(other), () => ({ photo: other, myPrice: 'ten', tags: ['how-1'] })],
  ['price', () => pickPrice('🍡 100개'), (p) => ({ photo: p, myPrice: 'hundred', tags: ['how-1'] })],
  ['add tag', () => pickTag('🏆 인생템'), (p) => ({ photo: p, myPrice: 'ten', tags: ['how-1', 'feeling-2'] })],
  ['remove tag', () => pickTag('🎁 선물'), (p) => ({ photo: p, myPrice: 'ten', tags: [] })],
])('CAREER-32 AC-2 changing only %s changes only that value', async (name, change, expected) => {
  const photo = await firstCard()
  fireEvent.click(again())
  change()
  appraise.mockResolvedValueOnce({ mochi: 7, line: '둘째' })
  fireEvent.click(submit())
  await screen.findByText('모찌 7개')
  expect(appraise.mock.calls[1][0]).toEqual(expected(photo))
  expect(screen.getByTestId('my-price').textContent).toBe(name === 'price' ? '모찌 100개' : '모찌 10개')
  noInputs()
})

// CAREER-32 AC-3: 실패 · 퇴근은 결과 화면 자리에, 거기서 입력 화면으로 (첫 감정 · 다시 감정 둘 다)
const WHERE = [
  ['first', false],
  ['after a card', true],
]
const CODES = [
  ['person_limit', 'person_limit'],
  ['unavailable', 'unavailable'],
  ['refused', 'refused'],
  ['invalid_input', 'invalid_input'],
  [undefined, 'unavailable'],
  ['daily_limit', 'daily_limit'],
]
test.each(WHERE.flatMap(([where, afterCard]) => CODES.map(([code, text]) => [where, code, text, afterCard])))(
  'CAREER-32 AC-3 %s: rejected with %s',
  async (_where, code, text, afterCard) => {
    if (afterCard) {
      await firstCard()
      fireEvent.click(again())
    } else {
      renderApp()
      pickFile(png())
      pickPrice('🍡 10개')
      pickTag('🎁 선물')
    }
    appraise.mockRejectedValueOnce(reject(code))
    fireEvent.click(submit())

    // ① 결과 화면 자리: 카드 없음, 다시 감정만
    await screen.findByRole('button', { name: '다시 감정' })
    expect(card()).toBeNull()
    noInputs()
    expect(screen.queryByRole('button', { name: '감정 받기' })).toBeNull()
    const off = code === 'daily_limit'
    const shown = () => {
      if (off) {
        expect(mascot().textContent).toContain('🚶 퇴근')
        expect(within(mascot()).getByTestId('off-duty').textContent).toBe(contractText('daily_limit'))
        expect(screen.queryByTestId('appraise-error')).toBeNull()
      } else {
        expect(screen.getByTestId('appraise-error').textContent).toBe(contractText(text))
        expect(screen.queryByTestId('off-duty')).toBeNull()
      }
    }
    shown()
    if (off) {
      expect(document.activeElement).toBe(mascot())
    } else {
      expect(mascot().textContent).toContain('대기')
      expect(document.activeElement).toBe(screen.getByTestId('appraise-error'))
    }

    // ② 다시 감정: 고른 것 그대로, 문구도 그대로. 다른 사진: 실패 문구만 사라진다
    fireEvent.click(again())
    expectChosen()
    shown()
    pickFile(jpg())
    if (off) shown()
    else expect(screen.queryByTestId('appraise-error')).toBeNull()

    // ③ 다시 누르면 갸웃에는 문구 · 퇴근이 없고, 결과에도 없다
    const { resolve } = hold()
    fireEvent.click(submit())
    expect(mascot().textContent).toContain('갸웃')
    expect(screen.queryByTestId('appraise-error')).toBeNull()
    expect(screen.queryByTestId('off-duty')).toBeNull()
    resolve({ mochi: 7, line: '둘째' })
    await screen.findByText('모찌 7개')
    expect(mascot().textContent).toContain('🔨 도장')
    expect(screen.queryByTestId('appraise-error')).toBeNull()
    expect(screen.queryByTestId('off-duty')).toBeNull()
  },
)

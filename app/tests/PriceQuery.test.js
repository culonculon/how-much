// @vitest-environment jsdom
// CAREER-40 T3: AC-2 브라우저가 만든 쿼리를 서버 입력 검사(api/src/input.js, 읽기만)에 그대로 넣어 본다.
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { checkQuery } from '../../api/src/input.js'
import { appraise } from '../src/appraise.js'
import { preparePhoto } from '../src/photo.js'
import { pickPrice, png, renderApp, resetHistory, submit, typePrice, walkToPrice } from './shop-steps.jsx'

vi.mock('../src/photo.js', () => ({ preparePhoto: vi.fn() }))
vi.mock('../src/shareCard.js', () => ({
  makeCard: vi.fn(async () => new Blob(['x'], { type: 'image/jpeg' })),
  saveCard: vi.fn(),
  CARD_W: 1080,
  CARD_H: 1350,
}))

const fetchMock = vi.fn()
const reply = () => new Response('{"mochi":30,"line":"흠… 귀한 물건이군!"}', { status: 200 })
// fetch가 받은 마지막 주소의 쿼리를 서버 검사에 그대로 넣는다. 던지면 이 테스트가 실패한다.
const serverSees = () => checkQuery(new URL(fetchMock.mock.calls.at(-1)[0], 'http://x').searchParams)

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () => reply())
  vi.stubGlobal('fetch', fetchMock)
  preparePhoto.mockReset()
  preparePhoto.mockImplementation(async () => new Blob([Uint8Array.of(0xff, 0xd8, 0xff, 0xd9)], { type: 'image/jpeg' }))
  resetHistory()
})
afterEach(cleanup)

// AC-2: 어댑터 — 화면이 넘기는 id 넷 × 태그 0개 · 2개가 서버 검사를 통과하고 같은 id가 돌아온다
test.each(['one', 'ten', 'hundred', 'never'].flatMap((id) => [[id, []], [id, ['how-1', 'now-2']]]))(
  'CAREER-40 AC-2 the browser query passes the server input check: %s %j',
  async (myPrice, tags) => {
    await appraise({ photo: png(), myPrice, tags })
    expect(serverSees().myPrice).toBe(myPrice)
    expect(serverSees().tags).toEqual(tags)
  },
)

// AC-2: 화면 → 어댑터 한 줄 — 777을 쳐서 감정하면 서버 검사를 통과하고 숫자 777은 요청에 없다
test('CAREER-40 AC-2 the query built from the price field passes the server input check', async () => {
  renderApp()
  walkToPrice()
  typePrice('777')
  fireEvent.click(submit())
  await screen.findByRole('region', { name: '감정 결과' })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(serverSees().myPrice).toBe('hundred')
  expect(fetchMock.mock.calls[0][0]).not.toContain('777')
})

// AC-2: 안 팔아도 같다
test('CAREER-40 AC-2 never from the screen passes the server input check', async () => {
  renderApp()
  walkToPrice()
  pickPrice('안 팔아')
  fireEvent.click(submit())
  await screen.findByRole('region', { name: '감정 결과' })
  expect(serverSees().myPrice).toBe('never')
})

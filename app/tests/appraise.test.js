import { readdirSync, readFileSync } from 'node:fs'
import { beforeEach, expect, test, vi } from 'vitest'
import { appraise } from '../src/appraise.js'
import { preparePhoto } from '../src/photo.js'

const prepared = () => new Blob([Uint8Array.of(0xff, 0xd8, 0xff, 0xd9)], { type: 'image/jpeg' })

vi.mock('../src/photo.js', () => ({ preparePhoto: vi.fn() }))

const fetchMock = vi.fn()
const input = () => ({
  photo: new File(['원본'], 'a.png', { type: 'image/png' }),
  myPrice: 'ten',
  tags: ['how-1', 'now-2'],
})
const json = (body, status = 200) => new Response(body, { status })
const failure = async (p) => p.then(() => null, (e) => e)

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  preparePhoto.mockReset()
  preparePhoto.mockImplementation(async () => prepared())
})

// AC-5(2)(3): 요청 한 번, 다시 그린 Blob이 본문
test('AC-5 posts once to /api/appraise with the prepared Blob, not the picked File', async () => {
  const blob = prepared()
  preparePhoto.mockResolvedValue(blob)
  fetchMock.mockResolvedValue(json('{"mochi":10,"line":"흠"}'))
  const i = input()
  await appraise(i)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [url, init] = fetchMock.mock.calls[0]
  expect(url).toBe('/api/appraise?myPrice=ten&tags=how-1&tags=now-2')
  expect(init.method).toBe('POST')
  expect(init.headers['Content-Type']).toBe('image/jpeg')
  expect(init.body).toBe(blob)
  expect(init.body).not.toBe(i.photo)
  expect(preparePhoto).toHaveBeenCalledTimes(1)
  expect(preparePhoto).toHaveBeenCalledWith(i.photo)
})

// AC-7: 응답 7단계 — 성공 모양
test('AC-7 a valid 200 body returns exactly { mochi, line }', async () => {
  fetchMock.mockResolvedValue(json('{"mochi":10,"line":"흠"}'))
  const r = await appraise(input())
  expect(r).toEqual({ mochi: 10, line: '흠' })
  expect(Object.keys(r)).toHaveLength(2)
})

// AC-7: 모양이 이상한 200은 빈 성공이 아니라 unavailable
test.each([
  '{"mochi":10,"line":"흠","x":1}',
  '{"mochi":-1,"line":"흠"}',
  '{"mochi":1.5,"line":"흠"}',
  '{"mochi":1,"line":"  "}',
])('AC-7 200 with bad shape %s rejects unavailable', async (body) => {
  fetchMock.mockResolvedValue(json(body))
  expect((await failure(appraise(input())))?.code).toBe('unavailable')
})

// AC-7: 서버 거절 코드는 그대로
test.each([
  [400, 'invalid_input'],
  [422, 'refused'],
  [429, 'daily_limit'],
  [429, 'person_limit'],
  [503, 'unavailable'],
])('AC-7 status %i with code %s rejects with that code', async (status, code) => {
  fetchMock.mockResolvedValue(json(JSON.stringify({ code }), status))
  expect((await failure(appraise(input())))?.code).toBe(code)
})

// AC-7: 알 수 없는 응답은 unavailable
test.each([
  [404, '<html>'],
  [400, '{"code":"nope"}'],
  [200, 'not json'],
])('AC-7 unknown response (%i %s) rejects unavailable', async (status, body) => {
  fetchMock.mockResolvedValue(json(body, status))
  expect((await failure(appraise(input())))?.code).toBe('unavailable')
})

test('AC-7 a network error rejects unavailable', async () => {
  fetchMock.mockRejectedValue(new TypeError('failed'))
  expect((await failure(appraise(input())))?.code).toBe('unavailable')
})

// AC-6: 사진을 못 읽으면 보내지 않는다
test('AC-6 unreadable photo rejects invalid_input and never calls fetch', async () => {
  preparePhoto.mockRejectedValue(new Error('decode'))
  const err = await failure(appraise(input()))
  expect(err?.code).toBe('invalid_input')
  expect(fetchMock).toHaveBeenCalledTimes(0)
})

// CAREER-22 AC-9: 화면에서 appraise.js를 import하는 파일은 정확히 하나
test('AC-9 exactly one source file imports appraise.js', () => {
  const src = new URL('../src/', import.meta.url)
  const importers = readdirSync(src, { recursive: true })
    .map(String)
    .filter((p) => /\.jsx?$/.test(p) && !/(^|\/)appraise\.js$/.test(p))
    .filter((p) =>
      /from\s+['"]\.\/appraise(\.js)?['"]/.test(readFileSync(new URL(p, src), 'utf8')),
    )
  expect(importers).toHaveLength(1)
})

import fs from 'node:fs'
import { expect, test } from '@playwright/test'
import { isPng, jpegInfo, makeFixtures } from './photo-fixtures.js'
import { enter, next } from './shop-steps.js'

// plan '테스트와 구현 사이의 약속'
const OK = { status: 200, contentType: 'application/json; charset=utf-8', body: '{"mochi":10,"line":"흠, 손때가 제법 묻었구먼"}' }
const REJECT = { status: 400, contentType: 'application/json; charset=utf-8', body: '{"code":"invalid_input"}' }
// contracts/appraise.md §5 invalid_input
const INVALID_INPUT_TEXT = '사진이나 선택을 다시 골라 주세요.'
const MAX_BYTES = 1_000_000

let F1, F2, F3, F4
test.beforeAll(async ({ browser }) => {
  ;({ F1, F2, F3, F4 } = await makeFixtures(browser))
})

// 서버 입구를 가로채 본문·헤더를 모은다
async function intercept(page, response = OK) {
  const hits = []
  await page.route(
    (url) => url.pathname === '/api/appraise',
    (route) => {
      const req = route.request()
      hits.push({ body: req.postDataBuffer(), headers: req.headers() })
      return route.fulfill(response)
    },
  )
  return hits
}

async function pickAndAppraise(page, file) {
  await page.goto('/')
  await enter(page)
  await page.getByLabel('사진 고르기').setInputFiles(file)
  await next(page)
  await next(page)
  await page.getByRole('button', { name: '🍡 10개', exact: true }).click()
  await page.getByRole('button', { name: '감정 받기!', exact: true }).click()
}
const result = (page) => page.getByRole('region', { name: '감정 결과' })

test('AC-1 big photo is sent as a small JPEG', async ({ page }, testInfo) => {
  const hits = await intercept(page)
  await pickAndAppraise(page, F1)
  await expect(result(page)).toBeVisible()
  expect(hits).toHaveLength(1)
  const { body, headers } = hits[0]
  expect(headers['content-type']).toBe('image/jpeg')
  const info = jpegInfo(body)
  expect(info.isJpeg).toBe(true)
  expect(Math.max(info.width, info.height)).toBeLessThanOrEqual(1024)
  expect(Math.abs(info.height - Math.round((info.width * 3000) / 4000))).toBeLessThanOrEqual(1)
  expect(body.length).toBeLessThanOrEqual(MAX_BYTES)
  fs.writeFileSync(testInfo.outputPath('f1-prepared.jpg'), body) // A1 재료
})

test('AC-2 GPS and every EXIF segment are gone', async ({ page }) => {
  // 시험 사진이 맞게 만들어졌는지 — 빠지면 거짓 초록
  expect(jpegInfo(F1.buffer)).toMatchObject({ isJpeg: true, hasExif: true, width: 4000, height: 3000 })
  const hits = await intercept(page)
  await pickAndAppraise(page, F1)
  await expect(result(page)).toBeVisible()
  expect(hits).toHaveLength(1)
  expect(jpegInfo(hits[0].body).hasExif).toBe(false)
})

test('AC-3 orientation stays portrait after EXIF is removed', async ({ page }) => {
  const hits = await intercept(page)
  await page.goto('/')
  await enter(page)
  await page.getByLabel('사진 고르기').setInputFiles(F2)
  const preview = page.getByRole('img', { name: '고른 사진 미리보기' })
  await expect(preview).toBeVisible()
  await expect.poll(() => preview.evaluate((i) => i.naturalHeight > i.naturalWidth)).toBe(true)
  await next(page)
  await next(page)
  await page.getByRole('button', { name: '🍡 10개', exact: true }).click()
  await page.getByRole('button', { name: '감정 받기!', exact: true }).click()
  await expect(result(page)).toBeVisible()
  expect(hits).toHaveLength(1)
  const info = jpegInfo(hits[0].body)
  expect(info.height).toBeGreaterThan(info.width)
  expect(info.hasExif).toBe(false)
})

test('AC-4 small photo is not enlarged', async ({ page }) => {
  expect(isPng(F3.buffer)).toBe(true)
  const hits = await intercept(page)
  await pickAndAppraise(page, F3)
  await expect(result(page)).toBeVisible()
  expect(hits).toHaveLength(1)
  const info = jpegInfo(hits[0].body)
  expect(info.isJpeg).toBe(true)
  expect(Math.max(info.width, info.height)).toBe(800)
  expect(info.hasExif).toBe(false)
  expect(hits[0].body.length).toBeLessThanOrEqual(MAX_BYTES)
})

test('AC-5 original never leaves, one request to the server entrance', async ({ page }) => {
  const requests = []
  // goto 전에 건다: 첫 문서 요청부터 모은다
  page.context().on('request', (r) => requests.push({ url: r.url(), body: r.postDataBuffer() }))
  await intercept(page)
  await pickAndAppraise(page, F1)
  await expect(result(page)).toBeVisible()
  const origin = 'http://127.0.0.1:5199/'
  const outside = requests
    .map((r) => r.url)
    .filter((u) => !u.startsWith(origin) && !u.startsWith('blob:') && !u.startsWith('data:'))
  expect(outside).toEqual([])
  expect(requests.filter((r) => new URL(r.url).pathname === '/api/appraise').map((r) => r.url)).toHaveLength(1)
  expect(requests.filter((r) => r.body !== null && r.body.includes(F1.buffer)).map((r) => r.url)).toEqual([])
  expect(requests.filter((r) => r.body !== null).map((r) => new URL(r.url).pathname)).toEqual(['/api/appraise'])
})

test('AC-6 unreadable photo is not sent, asks to pick again', async ({ page }) => {
  const hits = await intercept(page)
  await page.goto('/')
  await enter(page)
  await page.getByLabel('사진 고르기').setInputFiles(F4)
  await next(page)
  await next(page)
  await page.getByRole('button', { name: '🍡 10개', exact: true }).click()
  const submit = page.getByRole('button', { name: '감정 받기!', exact: true })
  if (await submit.isEnabled()) await submit.click()
  await expect(page.getByTestId('appraise-error')).toHaveText(INVALID_INPUT_TEXT) // 안 읽히는 사진은 자동으로 ②로 돌아와 거기서 문구가 보인다
  expect(hits).toHaveLength(0)
})

test('AC-7 server rejection ends thinking and allows another try', async ({ page }) => {
  const hits = await intercept(page, REJECT)
  await pickAndAppraise(page, F1)
  const uncle = page.getByTestId('uncle')
  await expect(page.getByTestId('appraise-error')).toHaveText(INVALID_INPUT_TEXT)
  await expect(uncle).toHaveAttribute('data-face', 'base')
  await expect(uncle).not.toHaveAttribute('data-face', 'think')
  await page.getByLabel('사진 고르기').setInputFiles(F3) // invalid_input은 자동으로 ②
  await next(page)
  await next(page)
  const submit = page.getByRole('button', { name: '감정 받기!', exact: true })
  await expect(submit).toBeEnabled()
  await submit.click()
  await expect.poll(() => hits.length).toBe(2)
})

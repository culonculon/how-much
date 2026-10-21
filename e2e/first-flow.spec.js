import { expect, test } from '@playwright/test'

// 1×1 PNG — 파일을 따로 두지 않는다
const png = {
  name: 'cat.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  ),
}
const txt = { name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') }
const FREE_TEXT = 'textarea, input:not([type=file]), [contenteditable]:not([contenteditable=false])'

test('first flow end to end (AC-1,3,4,5,6,7,8,10)', async ({ page }) => {
  const requests = []
  // goto 전에 건다: 첫 문서 요청부터 모은다
  page.context().on('request', (r) => requests.push({ url: r.url(), body: r.postDataBuffer() }))

  await page.goto('/')
  await expect(page.locator(FREE_TEXT)).toHaveCount(0) // AC-5
  const submit = page.getByRole('button', { name: '감정 받기' })
  await expect(submit).toBeDisabled() // AC-6(a)

  // AC-1
  await page.getByLabel('사진 고르기').setInputFiles(png)
  await expect(page.getByRole('img', { name: '고른 사진 미리보기' })).toBeVisible()
  await expect(submit).toBeDisabled() // AC-6(b)

  // AC-3
  const prices = page.getByRole('group', { name: '마음 가격' }).getByRole('button')
  await expect(prices).toHaveCount(4)
  await page.getByRole('button', { name: '🍡 1개', exact: true }).click()
  await page.getByRole('button', { name: '🍡 10개', exact: true }).click()
  await expect(page.locator('[aria-label="마음 가격"] [aria-pressed="true"]')).toHaveText('🍡 10개')
  await expect(page.locator('[aria-label="마음 가격"] [aria-pressed="true"]')).toHaveCount(1)

  // AC-4
  const tags = page.getByRole('group', { name: '사연 태그' })
  const counts = { '어떻게 왔나': 6, '지금 상태': 4, 마음: 4, 자랑: 2 }
  for (const [title, n] of Object.entries(counts)) {
    await expect(tags.getByRole('group', { name: title }).getByRole('button')).toHaveCount(n)
  }
  const a = tags.getByRole('button', { name: '🎁 선물', exact: true })
  const b = tags.getByRole('button', { name: '🏆 인생템', exact: true })
  await a.click()
  await b.click()
  await a.click()
  await expect(a).toHaveAttribute('aria-pressed', 'false')
  await expect(b).toHaveAttribute('aria-pressed', 'true')
  await expect(tags.locator('[aria-pressed="true"]')).toHaveCount(1)

  // AC-6 → AC-7
  await expect(submit).toBeEnabled()
  await submit.click()
  const mascot = page.getByRole('status', { name: '감정사 아저씨' })
  await expect(mascot).toHaveText(/갸웃/)
  await expect(submit).toBeDisabled()

  // AC-8
  await expect(mascot).toHaveText(/도장/)
  await expect(page.getByTestId('appraised-price')).toHaveText(/^모찌 \d+개$/)
  await expect(page.getByTestId('my-price')).toHaveText('모찌 10개')
  await expect(page.getByTestId('mascot-line')).toHaveText(/\S/)
  await expect(page.locator(FREE_TEXT)).toHaveCount(0) // AC-5 다시

  // AC-10: 로컬 밖으로 나간 요청 0개, 본문 있는 요청 0개
  const origin = 'http://127.0.0.1:5199/'
  const outside = requests
    .map((r) => r.url)
    .filter((u) => !u.startsWith(origin) && !u.startsWith('blob:') && !u.startsWith('data:'))
  expect(outside).toEqual([])
  expect(requests.filter((r) => r.body !== null).map((r) => r.url)).toEqual([])
})

test('rejects non-image file (AC-2)', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('사진 고르기').setInputFiles(png)
  await page.getByLabel('사진 고르기').setInputFiles(txt)
  await expect(page.getByRole('img', { name: '고른 사진 미리보기' })).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText('다시 골라')
  await page.getByRole('button', { name: '🍡 10개', exact: true }).click()
  await expect(page.getByRole('button', { name: '감정 받기' })).toBeDisabled()
})

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
// contracts/appraise.md §5 — 글자 그대로
const REGION = '사진은 감정하는 동안 서울 밖 아시아 리전에서 처리될 수 있어요.'
const UNAVAILABLE = "감정이 잘 안 됐어요. 잠시 뒤 '감정 받기'를 다시 눌러 주세요."

async function expectRegionNotice(page) {
  const submit = page.getByRole('button', { name: '감정 받기' })
  await expect(page.getByText(REGION, { exact: true })).toBeVisible()
  await expect(submit).toHaveAccessibleDescription(REGION)
  await expect(page.locator('#region-notice + button')).toHaveText('감정 받기')
}

test('CAREER-29 AC-2 region notice shows before and after picking', async ({ page }) => {
  await page.goto('/')
  await expectRegionNotice(page)
  await page.getByLabel('사진 고르기').setInputFiles(png)
  await page.getByRole('button', { name: '🍡 10개', exact: true }).click()
  await expect(page.getByRole('button', { name: '감정 받기' })).toBeEnabled()
  await expectRegionNotice(page) // 누르기 전
})

test('CAREER-29 AC-3 unavailable returns to idle and retry works', async ({ page }) => {
  let calls = 0
  await page.route(
    (url) => url.pathname === '/api/appraise',
    (route) =>
      ++calls === 1
        ? route.fulfill({ status: 500, contentType: 'text/plain', body: '' })
        : route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: '{"mochi":10,"line":"흠, 손때가 제법 묻었구먼"}',
          }),
  )
  await page.goto('/')
  await page.getByLabel('사진 고르기').setInputFiles(png)
  await page.getByRole('button', { name: '🍡 10개', exact: true }).click()
  const submit = page.getByRole('button', { name: '감정 받기' })
  await submit.click()

  await expect(page.getByTestId('appraise-error')).toHaveText(UNAVAILABLE)
  await expect(page.getByRole('status', { name: '감정사 아저씨' })).toHaveText(/대기/)
  await page.getByRole('button', { name: '다시 감정' }).click()
  await expect(submit).toBeEnabled()

  await submit.click()
  await expect(page.getByRole('region', { name: '감정 결과' })).toBeVisible()
  await expect(page.getByTestId('appraised-price')).toHaveText(/^모찌 (1|3|10|30|100)개$/)
  await expect(page.getByTestId('my-price')).toHaveText('모찌 10개')
  expect(calls).toBe(2)
})

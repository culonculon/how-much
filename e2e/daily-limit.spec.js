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
// contracts/appraise.md §5 daily_limit 줄의 첫 따옴표 글자 — 글자 그대로
const OFF_DUTY = '아저씨 오늘 퇴근했어요. 밤 12시에 다시 출근해요.'

test('CAREER-27 AC-10 daily_limit shows off-duty and retry works', async ({ page }) => {
  let release
  const released = new Promise((r) => (release = r))
  let calls = 0
  await page.route(
    (url) => url.pathname === '/api/appraise',
    async (route) => {
      if (++calls === 1) {
        return route.fulfill({
          status: 429,
          contentType: 'application/json; charset=utf-8',
          body: '{"code":"daily_limit"}',
        })
      }
      await released
      return route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: '{"mochi":10,"line":"흠, 손때가 제법 묻었구먼"}',
      })
    },
  )
  await page.goto('/')
  await page.getByLabel('사진 고르기').setInputFiles(png)
  await page.getByRole('button', { name: '🍡 10개', exact: true }).click()
  const submit = page.getByRole('button', { name: '감정 받기' })
  await submit.click()

  const mascot = page.getByRole('status', { name: '감정사 아저씨' })
  await expect(mascot).toContainText('🚶 퇴근')
  await expect(page.getByTestId('off-duty')).toHaveText(OFF_DUTY)
  await expect(page.getByTestId('appraise-error')).toHaveCount(0)
  await expect(page.getByRole('region', { name: '감정 결과' })).toHaveCount(0)
  await expect(submit).toBeEnabled()

  await submit.click()
  await expect(mascot).toContainText('갸웃')
  await expect(page.getByTestId('off-duty')).toHaveCount(0)

  release()
  await expect(page.getByRole('region', { name: '감정 결과' })).toBeVisible()
  expect(calls).toBe(2)
})

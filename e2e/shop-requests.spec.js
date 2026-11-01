import { expect, test } from '@playwright/test'
import { FAIL_BUTTON, countPosts, enter, failOf, ok, photoInput, pickPrice, png, routeQueue, submitOf, walkToPrice } from './shop-steps.js'

// plan A2: 가장 작은 iPhone에서 주소창 · 도구 막대를 뺀 높이를 어림한 값. 설정 파일은 고치지 않는다.
test.use({ viewport: { width: 375, height: 548 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

const priceText = (page) => page.getByTestId('appraised-price')

// AC-3: ①~④를 지나는 동안(③ 건너뛰기 포함) 요청은 0번이다
test('CAREER-35 AC-3 nothing is sent from step 1 to 4, tags skipped or not', async ({ page }) => {
  await routeQueue(page, [])
  const posts = countPosts(page)

  await walkToPrice(page) // 태그 하나
  await pickPrice(page)
  await expect(submitOf(page)).toBeEnabled() // ④ 도착
  expect(posts()).toBe(0)

  await walkToPrice(page, { tag: null }) // 새로 열어 ③ 건너뛰기
  await pickPrice(page)
  await expect(submitOf(page)).toBeEnabled()
  expect(posts()).toBe(0)
})

// AC-3: '감정 받기!'를 잇달아 2번 누르면 요청은 1번
test('CAREER-35 AC-3 double press sends once', async ({ page }) => {
  const q = await routeQueue(page, ['hold', ok(3)])
  const posts = countPosts(page)
  await walkToPrice(page)
  await pickPrice(page)

  await submitOf(page).dblclick()
  await expect.poll(posts).toBe(1)
  q.release()
  await expect(priceText(page)).toHaveText('모찌 3개')
  expect(posts()).toBe(1)
})

// AC-3: ⑥ '다른 물건 꺼내기'는 보내지 않고, 다시 ④에서 누를 때만 늘어난다
test('CAREER-35 AC-3 another item does not send; pressing on step 4 does', async ({ page }) => {
  await routeQueue(page, [ok(3), ok(7)])
  const posts = countPosts(page)
  await walkToPrice(page)
  await pickPrice(page)
  await submitOf(page).click()
  await expect(priceText(page)).toHaveText('모찌 3개')
  await expect.poll(posts).toBe(1)

  await page.getByRole('button', { name: '다른 물건 꺼내기' }).click()
  await expect(photoInput(page)).toBeAttached() // ②
  expect(posts()).toBe(1)

  await photoInput(page).setInputFiles(png)
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await page.getByRole('button', { name: '다음', exact: true }).click() // 태그 건너뛰고 ④
  await pickPrice(page)
  expect(posts()).toBe(1)
  await submitOf(page).click()
  await expect(priceText(page)).toHaveText('모찌 7개')
  await expect.poll(posts).toBe(2)
})

// AC-3: 실패 · 퇴근 화면의 버튼은 늘리지 않고, ④에서 다시 누를 때만 1 늘어난다
for (const code of ['refused', 'unavailable', 'person_limit', 'daily_limit']) {
  test(`CAREER-35 AC-3 ${code} button does not send`, async ({ page }) => {
    await routeQueue(page, [failOf(code), ok(3)])
    const posts = countPosts(page)
    await walkToPrice(page)
    await pickPrice(page)
    await submitOf(page).click()
    await expect(page.getByTestId(code === 'daily_limit' ? 'off-duty' : 'appraise-error')).toBeVisible()
    await expect.poll(posts).toBe(1)

    await page.getByRole('button', { name: FAIL_BUTTON[code], exact: true }).click()
    if (code === 'refused') {
      await expect(photoInput(page)).toBeAttached() // ②
      expect(posts()).toBe(1)
      await page.getByRole('button', { name: '다음', exact: true }).click()
      await page.getByRole('button', { name: '다음', exact: true }).click()
    }
    await expect(submitOf(page)).toBeEnabled() // ④
    expect(posts()).toBe(1)

    await submitOf(page).click()
    await expect(priceText(page)).toHaveText('모찌 3개')
    await expect.poll(posts).toBe(2)
  })
}

// AC-3: 뒤로 · 앞으로 · 새로고침으로는 늘지 않는다
test('CAREER-35 AC-3 back, forward and reload do not send', async ({ page }) => {
  await routeQueue(page, [ok(3)])
  const posts = countPosts(page)
  await walkToPrice(page)
  await pickPrice(page)
  await submitOf(page).click()
  await expect(priceText(page)).toHaveText('모찌 3개')
  await expect.poll(posts).toBe(1)

  await page.goBack() // ④
  await expect(submitOf(page)).toBeVisible()
  await page.goForward()
  await expect(submitOf(page)).toBeVisible() // 앞으로로는 앞 화면을 되살리지 않는다
  expect(posts()).toBe(1)

  await page.goBack() // 앞으로 뒤라 칸은 ⑥ 자리: 한 단계씩 ③
  await expect(page.getByRole('group', { name: '사연 태그' })).toBeVisible()
  await page.goBack() // ②
  await expect(photoInput(page)).toBeAttached()
  await page.goBack() // ①
  await expect(page.getByRole('button', { name: '가게에 들어가기' })).toBeVisible()
  expect(posts()).toBe(1)

  await page.reload()
  await expect(page.getByRole('button', { name: '가게에 들어가기' })).toBeVisible()
  expect(posts()).toBe(1)
  await enter(page) // 다시 들어가기만으로도 보내지 않는다
  expect(posts()).toBe(1)
})

import { expect, test } from '@playwright/test'
import { FAIL_BUTTON, failOf, ok, photoInput, pickPrice, png, routeQueue, submitOf, walkToPrice } from './shop-steps.js'

// plan A2: 가장 작은 iPhone에서 주소창 · 도구 막대를 뺀 높이를 어림한 값. 설정 파일은 고치지 않는다.
test.use({ viewport: { width: 375, height: 548 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

const buttonOf = (page, name) => page.getByRole('button', { name, exact: true })
const groupOf = (page, name) => page.getByRole('group', { name })

// Tab을 눌러 locator에 닿을 때까지 간다. 못 닿으면 던진다.
async function tabTo(page, locator, max = 40) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    if ((await locator.count()) > 0 && (await locator.evaluate((el) => el === document.activeElement))) return
  }
  throw new Error('Tab으로 닿지 않았다: ' + locator)
}

// AC-8: Tab · Space · Enter만으로 ① → ⑥ (사진 파일은 키보드로 고를 수 없어 setInputFiles)
test('CAREER-35 AC-8 keyboard can finish all six steps', async ({ page }) => {
  await routeQueue(page, [ok(3)])
  await page.goto('/')

  await expect(buttonOf(page, '가게에 들어가기')).toBeVisible()
  await tabTo(page, buttonOf(page, '가게에 들어가기'))
  await page.keyboard.press('Enter') // ②
  await expect(groupOf(page, '물건 꺼내기')).toBeFocused()
  await tabTo(page, photoInput(page))
  await photoInput(page).setInputFiles(png)
  await tabTo(page, buttonOf(page, '다음'))
  await page.keyboard.press('Enter') // ③
  await expect(groupOf(page, '사연 말하기')).toBeFocused()

  const chip = buttonOf(page, '🎁 선물')
  await tabTo(page, chip)
  await page.keyboard.press('Space')
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  await tabTo(page, buttonOf(page, '다음'))
  await page.keyboard.press('Enter') // ④
  await expect(groupOf(page, '내 값 부르기')).toBeFocused()

  const price = buttonOf(page, '🍡 10개')
  await tabTo(page, price)
  await page.keyboard.press('Space')
  await expect(price).toHaveAttribute('aria-pressed', 'true')
  await tabTo(page, submitOf(page))
  await page.keyboard.press('Enter') // ⑤ → ⑥

  await expect(page.getByTestId('appraised-price')).toHaveText('모찌 3개')
  await expect(page.getByRole('region', { name: '감정 결과' })).toBeFocused()
  await tabTo(page, buttonOf(page, '다른 물건 꺼내기')) // ⑥의 버튼도 키보드로 닿는다
})

// AC-8: 움직임 줄이기에서는 어느 화면에도 움직이는 것이 없다 (D1~D5가 더해져도 지킨다)
test('CAREER-35 AC-8 nothing moves with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const q = await routeQueue(page, ['hold', ok(3), failOf('unavailable'), failOf('daily_limit')])
  const moving = () => page.evaluate(() => document.getAnimations().length)

  await page.goto('/') // ①
  await expect(buttonOf(page, '가게에 들어가기')).toBeVisible()
  expect(await moving()).toBe(0)
  await walkToPrice(page, { open: false }) // ② ③ ④
  expect(await moving()).toBe(0)
  await pickPrice(page)
  await submitOf(page).click() // ⑤
  await expect(page.getByRole('progressbar', { name: '감정 중' })).toBeVisible()
  expect(await moving()).toBe(0)
  q.release() // ⑥
  await expect(page.getByTestId('appraised-price')).toHaveText('모찌 3개')
  expect(await moving()).toBe(0)

  await page.goBack() // ④ → 실패
  await submitOf(page).click()
  await expect(page.getByTestId('appraise-error')).toBeVisible()
  expect(await moving()).toBe(0)
  await buttonOf(page, FAIL_BUTTON.unavailable).click() // ④ → 퇴근
  await submitOf(page).click()
  await expect(page.getByTestId('off-duty')).toBeVisible()
  expect(await moving()).toBe(0)
})

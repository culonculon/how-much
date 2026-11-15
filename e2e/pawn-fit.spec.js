import { expect, test } from '@playwright/test'
import { ok, priceInput, routeQueue, submitOf, typePrice, walkToPrice } from './shop-steps.js'

// plan A2: 가장 작은 iPhone에서 주소창 · 도구 막대를 뺀 높이를 어림한 값. 설정 파일은 고치지 않는다.
test.use({ viewport: { width: 375, height: 548 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

// 30자 대사 (spec 사용자 답: 서버 line은 30자 이하)
const THIRTY = '가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나'

const ready = (page) => page.evaluate(() => document.fonts.ready)
const buttonOf = (page, name) => page.getByRole('button', { name, exact: true })

// AC-4: 아저씨 9999 · 내 값 9999 — ⑥이 스크롤 없이 다 보이고 값이 한 줄로 칸 안에 든다
test('CAREER-40 AC-4 9999 against 9999 fits on the reveal', async ({ page }) => {
  await routeQueue(page, [ok(9999, THIRTY)])
  await walkToPrice(page)
  await ready(page)
  await typePrice(page, '9999')
  await submitOf(page).click()
  await expect(page.getByTestId('appraised-shown')).toHaveText('한정선 9999개') // 숫자 오르기가 끝난 뒤
  await ready(page)

  for (const l of [
    page.getByRole('group', { name: '값 공개' }),
    page.getByTestId('appraised-shown'),
    page.getByTestId('my-shown'),
    page.getByTestId('compare-line'),
    buttonOf(page, '다른 물건 꺼내기'),
  ]) {
    await expect(l).toBeInViewport({ ratio: 1 })
  }
  await expect(page.getByTestId('my-shown')).toHaveText('한정선 9999개')

  // 값 글자와, 그것을 '값 공개' 묶음까지 감싼 모든 칸이 넘치지 않고, 글자는 한 줄이다
  const report = await page.getByRole('group', { name: '값 공개' }).evaluate((group) => {
    const out = []
    for (const id of ['appraised-shown', 'my-shown']) {
      const el = group.querySelector(`[data-testid="${id}"]`)
      for (let n = el; n; n = n.parentElement) {
        if (n.scrollWidth > n.clientWidth) out.push(`${id}: ${n.tagName}.${n.className} scrollWidth ${n.scrollWidth} > clientWidth ${n.clientWidth}`)
        if (n === group) break
      }
      if (el.getClientRects().length !== 1) out.push(`${id}: ${el.getClientRects().length}줄`)
    }
    return out
  })
  expect(report).toEqual([])
})

// AC-4: ④ 숫자 칸에 9999가 다 보인다
test('CAREER-40 AC-4 9999 is fully visible in the field', async ({ page }) => {
  await walkToPrice(page)
  await ready(page)
  await typePrice(page, '9999')
  const field = priceInput(page)
  await expect(field).toBeInViewport({ ratio: 1 })
  expect(await field.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
})

// AC-1: 숫자 칸 · − · + · 빠른 버튼 다섯이 높이 24 이상
test('CAREER-40 AC-1 field and buttons are 24px or taller', async ({ page }) => {
  await walkToPrice(page)
  await ready(page)
  const targets = [
    ['숫자 칸', priceInput(page)],
    ...['한 개 빼기', '한 개 더하기', '1개', '10개', '100개', '777개', '안 팔아'].map((n) => [n, buttonOf(page, n)]),
  ]
  for (const [name, locator] of targets) {
    const box = await locator.boundingBox()
    expect(box, name).not.toBeNull()
    expect(box.height, name).toBeGreaterThanOrEqual(24)
  }
})

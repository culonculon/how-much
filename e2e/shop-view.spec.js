import { expect, test } from '@playwright/test'
import {
  FAIL_BUTTON, contractText, enter, failOf, next, ok, photoInput, pickPrice, png, routeQueue, submitOf, walkToPrice, walkToTags,
} from './shop-steps.js'

// plan A2: 가장 작은 iPhone에서 주소창 · 도구 막대를 뺀 높이를 어림한 값. 설정 파일은 고치지 않는다.
test.use({ viewport: { width: 375, height: 548 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

// 30자 대사 (spec 사용자 답: 서버 line은 30자 이하)
const THIRTY = '가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나'

const ready = (page) => page.evaluate(() => document.fonts.ready)
const buttonOf = (page, name) => page.getByRole('button', { name, exact: true })
const mascotOf = (page) => page.getByRole('status', { name: '감정사 아저씨' })

// 위 · 아래 끝이 모두 화면 안 (이 확인은 스크롤하지 않는다)
async function inView(...locs) {
  for (const l of locs) await expect(l).toBeInViewport({ ratio: 1 })
}

async function open(page) {
  await page.goto('/')
  await ready(page)
}

// ① → ④. 이미 ①이면 open: false
async function toPrice(page, opts) {
  await walkToPrice(page, opts)
  await ready(page)
}

// AC-11: ① · ④ · ⑤ · ⑥은 내리지 않아도 다 보인다 (⑥은 30자 대사로)
test('CAREER-35 AC-11 steps 1, 4, 5 and 6 are in view', async ({ page }) => {
  const q = await routeQueue(page, ['hold', ok(30, THIRTY)])
  await open(page)
  await inView(buttonOf(page, '가게에 들어가기')) // ①

  await toPrice(page, { open: false }) // ④
  await inView(
    ...(await page.getByRole('group', { name: '마음 가격' }).getByRole('button').all()),
    page.locator('#region-notice'),
    submitOf(page),
  )

  await pickPrice(page)
  await submitOf(page).click() // ⑤
  await expect(page.getByRole('progressbar', { name: '감정 중' })).toBeVisible()
  await inView(mascotOf(page), page.getByRole('progressbar', { name: '감정 중' }))

  q.release() // ⑥
  await expect(page.getByTestId('mascot-line')).toHaveText(THIRTY)
  await ready(page)
  await inView(
    page.getByRole('group', { name: '값 공개' }),
    page.getByTestId('appraised-shown'),
    page.getByTestId('my-shown'),
    page.getByTestId('compare-line'),
    buttonOf(page, '다른 물건 꺼내기'),
  )
})

// AC-11: 실패 · 퇴근 화면의 문구와 버튼
for (const code of ['refused', 'unavailable', 'person_limit', 'daily_limit']) {
  test(`CAREER-35 AC-11 ${code} text and button are in view`, async ({ page }) => {
    await routeQueue(page, [failOf(code)])
    await open(page)
    await toPrice(page, { open: false })
    await pickPrice(page)
    await submitOf(page).click()
    const notice = page.getByTestId(code === 'daily_limit' ? 'off-duty' : 'appraise-error')
    await expect(notice).toBeVisible()
    await ready(page)
    await inView(notice, buttonOf(page, FAIL_BUTTON[code]))
  })
}

// AC-11: busy 화면(안내 + 꺼진 버튼)과, 실패에서 ④로 돌아왔을 때 남은 문구 · 버튼 · 안내
test('CAREER-35 AC-11 busy and a leftover notice on step 4 are in view', async ({ page }) => {
  const q = await routeQueue(page, ['hold', ok(3), failOf('unavailable')])
  await open(page)
  await toPrice(page, { open: false })
  await pickPrice(page)
  await submitOf(page).click()
  await expect(page.getByRole('progressbar', { name: '감정 중' })).toBeVisible()
  await page.goBack() // 답을 붙잡은 채 ④: busy
  await expect(page.locator('#busy-note')).toBeVisible()
  await expect(submitOf(page)).toBeDisabled()
  await inView(page.locator('#busy-note'), submitOf(page), page.locator('#region-notice'))

  q.release()
  await expect(submitOf(page)).toBeEnabled()
  await submitOf(page).click() // 둘째: unavailable
  await expect(page.getByTestId('appraise-error')).toBeVisible()
  await buttonOf(page, FAIL_BUTTON.unavailable).click() // 남은 문구가 있는 ④
  await expect(submitOf(page)).toBeVisible()
  await ready(page)
  await inView(page.getByTestId('appraise-error'), submitOf(page), page.locator('#region-notice'))
})

// AC-11: ② · ③은 내려도 되지만 '다음'까지 닿는다. ③에서 스크롤한 채 넘어가면 ④는 맨 위
test('CAREER-35 AC-11 next is reachable on steps 2 and 3', async ({ page }) => {
  await open(page)
  await enter(page)
  await photoInput(page).setInputFiles(png)
  const nextButton = buttonOf(page, '다음')
  await nextButton.scrollIntoViewIfNeeded() // ②
  await expect(nextButton).toBeEnabled()
  await nextButton.click({ trial: true })
  await nextButton.click()

  await expect(page.getByRole('group', { name: '사연 태그' })).toBeVisible() // ③
  await ready(page)
  await nextButton.scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0) // 칩 16개라 내려야 닿는다
  await nextButton.click({ trial: true })
  await nextButton.click()

  await expect(submitOf(page)).toBeVisible() // ④
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
})

// ①~④ · ⑥ · 실패 화면을 차례로 지나며 visit을 부른다
async function visitScreens(page, visit) {
  await routeQueue(page, [ok(3), failOf('refused')])
  await open(page)
  await expect(buttonOf(page, '가게에 들어가기')).toBeVisible()
  await visit('door')
  await enter(page)
  await visit('photo')
  await photoInput(page).setInputFiles(png)
  await next(page)
  await ready(page)
  await visit('tags')
  await next(page)
  await pickPrice(page)
  await visit('price')
  await submitOf(page).click()
  await expect(page.getByTestId('appraised-price')).toHaveText('모찌 3개')
  await visit('result')
  await page.goBack()
  await submitOf(page).click()
  await expect(page.getByTestId('appraise-error')).toBeVisible()
  await visit('failure')
}

// 모든 버튼(칩 포함)의 화면 높이가 min 이상
async function expectTall(page, min) {
  const buttons = await page.getByRole('button').all()
  expect(buttons.length).toBeGreaterThan(0)
  for (const b of buttons) {
    const box = await b.boundingBox()
    expect(box.height, await b.innerText()).toBeGreaterThanOrEqual(min)
  }
}

// AC-2: 칩 · 버튼은 화면에서 높이 24 CSS px 이상 (WCAG 2.5.8 최소값)
test('CAREER-35 AC-2 chips and buttons are tall enough', async ({ page }) => {
  await visitScreens(page, () => expectTall(page, 24))
})

// A5: 칩 44 · 버튼 48 (애플 권장 44). 24와 별도 — H0에서 값을 낮추면 이 수치를 맞춘다
test('CAREER-35 A5 chips and buttons are 44 or more', async ({ page }) => {
  await visitScreens(page, () => expectTall(page, 44))
})

// AC-2: 고른 칩은 앞에 ▶ (CSS로 그린다 — 안 고른 칩에는 없다)
test('CAREER-35 AC-2 chosen chip shows ▶', async ({ page }) => {
  const mark = (loc) => loc.evaluate((el) => getComputedStyle(el.querySelector('.chip-mark'), '::before').content)
  await open(page)
  await walkToTags(page, { open: false })
  const chosen = buttonOf(page, '🎁 선물')
  const other = buttonOf(page, '🏆 인생템')
  expect(await mark(chosen)).toBe('none')
  await chosen.click()
  expect(await mark(chosen)).toContain('▶')
  expect(await mark(other)).toBe('none')

  await next(page) // 마음 가격 칩도 같다
  await pickPrice(page)
  expect(await mark(buttonOf(page, '🍡 10개'))).toContain('▶')
  expect(await mark(buttonOf(page, '🍡 1개'))).toBe('none')
})

// AC-9: 그림은 칸 수의 정수배 폭이고, 조상에 transform이 없고, 칸 경계를 안 흐린다
test('CAREER-35 AC-9 pixels stay on whole cells', async ({ page }) => {
  await routeQueue(page, [ok(3)])
  await open(page)
  const check = async (where) => {
    const r = await page.getByTestId('uncle').evaluate((el) => {
      const transformed = []
      for (let n = el; n; n = n.parentElement) if (getComputedStyle(n).transform !== 'none') transformed.push(n.tagName)
      return { width: el.getBoundingClientRect().width, transformed, shape: getComputedStyle(el).shapeRendering }
    })
    expect(r.width % 40, `${where} width ${r.width}`).toBe(0)
    expect(r.transformed, where).toEqual([])
    expect(r.shape, where).toBe('crispEdges')
    const items = await page.getByTestId('shop-item').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width % 12))
    expect(items, where).toEqual([0, 0, 0, 0])
  }
  await expect(buttonOf(page, '가게에 들어가기')).toBeVisible()
  await check('door')
  await enter(page)
  await check('photo')
  await photoInput(page).setInputFiles(png)
  await next(page)
  await next(page)
  await pickPrice(page)
  await submitOf(page).click()
  await expect(page.getByTestId('appraised-price')).toHaveText('모찌 3개')
  await check('result')
})

// Q9: 사용자가 시안과 나란히 보는 11화면을 찍어 둔다 (확인 없이 파일만 남긴다 — tasks H0)
test('CAREER-35 Q9 shots', async ({ page }, testInfo) => {
  const q = await routeQueue(page, [
    'hold', ok(1), // ⑤ · busy (붙잡았다가 버려지는 답)
    ok(30, '흠… 귀한 물건이군!'), // ⑥
    failOf('refused'), failOf('unavailable'), failOf('person_limit'), failOf('daily_limit'),
  ])
  const shot = async (name) => {
    await ready(page)
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`) })
  }
  await open(page)
  await shot('door')
  await enter(page)
  await shot('photo')
  await photoInput(page).setInputFiles(png)
  await next(page)
  await page.getByRole('button', { name: '🎁 선물', exact: true }).click()
  await shot('tags')
  await next(page)
  await pickPrice(page)
  await shot('price')
  await submitOf(page).click()
  await expect(page.getByRole('progressbar', { name: '감정 중' })).toBeVisible()
  await shot('thinking')
  await page.goBack()
  await expect(page.locator('#busy-note')).toBeVisible()
  await shot('busy')
  q.release()
  await expect(submitOf(page)).toBeEnabled()

  await submitOf(page).click()
  await expect(page.getByTestId('appraised-price')).toHaveText('모찌 30개')
  await shot('result')
  await page.goBack()
  await submitOf(page).click()
  await expect(page.getByTestId('appraise-error')).toHaveText(contractText('refused'))
  await shot('refused')

  await buttonOf(page, FAIL_BUTTON.refused).click() // ② → ④로 다시 걸어간다
  await next(page)
  await next(page)
  await submitOf(page).click()
  await expect(page.getByTestId('appraise-error')).toHaveText(contractText('unavailable'))
  await shot('unavailable')
  await buttonOf(page, FAIL_BUTTON.unavailable).click()
  await submitOf(page).click()
  await expect(page.getByTestId('appraise-error')).toHaveText(contractText('person_limit'))
  await shot('person_limit')
  await buttonOf(page, FAIL_BUTTON.person_limit).click()
  await submitOf(page).click()
  await expect(page.getByTestId('off-duty')).toHaveText(contractText('daily_limit'))
  await shot('daily_limit')
})

import { expect, test } from '@playwright/test'
import {
  FAIL_BUTTON, countPosts, enter, failOf, ok, photoInput, pickPrice, png, routeQueue, submitOf, walkToPrice,
} from './shop-steps.js'

// plan A2: 가장 작은 iPhone에서 주소창 · 도구 막대를 뺀 높이를 어림한 값. 설정 파일은 고치지 않는다.
test.use({ viewport: { width: 375, height: 548 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

const door = (page) => page.getByRole('button', { name: '가게에 들어가기' })
const tagsGroup = (page) => page.getByRole('group', { name: '사연 태그' })
const priceGroup = (page) => page.getByRole('group', { name: '마음 가격' })
const regionOf = (page) => page.getByRole('region', { name: '감정 결과' })
const preview = (page) => page.getByRole('img', { name: '고른 사진 미리보기' })
const priceText = (page) => page.getByTestId('appraised-price')

// 어느 화면에서도 주소는 `/`뿐 — 로컬에서 배포 nginx 404를 대신 잡는다 (ADR-0009: 주소 안 바뀜)
function expectRoot(page) {
  const u = new URL(page.url())
  expect(u.pathname).toBe('/')
  expect(u.search).toBe('')
  expect(u.hash).toBe('')
}

// 늦게 오는 popstate 처리를 기다린다(고정 기다림 없이 그림 두 번)
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

// 화면별로 거기까지 간다. 감정은 한 번 나간 것으로 센다.
const ARRIVE = {
  photo: { replies: [], go: async (page) => { await page.goto('/'); await enter(page); await photoInput(page).waitFor() } },
  tags: { replies: [], go: async (page) => { await walkToPrice(page, { tag: null }); await page.goBack(); await expect(tagsGroup(page)).toBeVisible() } },
  price: { replies: [], go: async (page) => { await walkToPrice(page); await expect(submitOf(page)).toBeVisible() } },
  thinking: {
    replies: ['hold', ok(3)], // 붙잡은 채 다시 불러오고 풀지 않는다
    go: async (page) => {
      await walkToPrice(page)
      await pickPrice(page)
      await submitOf(page).click()
      await expect(page.getByRole('progressbar', { name: '감정 중' })).toBeVisible()
    },
  },
  result: {
    replies: [ok(3)],
    go: async (page) => {
      await walkToPrice(page)
      await pickPrice(page)
      await submitOf(page).click()
      await expect(priceText(page)).toHaveText('모찌 3개')
    },
  },
  failure: {
    replies: [failOf('unavailable')],
    go: async (page) => {
      await walkToPrice(page)
      await pickPrice(page)
      await submitOf(page).click()
      await expect(page.getByTestId('appraise-error')).toBeVisible()
    },
  },
  off: {
    replies: [failOf('daily_limit')],
    go: async (page) => {
      await walkToPrice(page)
      await pickPrice(page)
      await submitOf(page).click()
      await expect(page.getByTestId('off-duty')).toBeVisible()
    },
  },
}

// 빈 ①
async function expectEmptyDoor(page) {
  await expect(door(page)).toBeVisible()
  await expect(photoInput(page)).toHaveCount(0)
  await expect(tagsGroup(page)).toHaveCount(0)
  await expect(priceGroup(page)).toHaveCount(0)
  await expect(regionOf(page)).toHaveCount(0)
  await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0)
  await expect(page.getByTestId('appraise-error')).toHaveCount(0)
  await expect(page.getByTestId('off-duty')).toHaveCount(0)
}

// AC-7: ④ → ③ → ② → ①로 한 단계씩, 고른 것은 그대로
test('CAREER-35 AC-7 back walks one step at a time with choices kept', async ({ page }) => {
  await routeQueue(page, [])
  await walkToPrice(page)
  await pickPrice(page)
  await expect(page.locator('[aria-label="마음 가격"] [aria-pressed="true"]')).toHaveText('🍡 10개')
  expectRoot(page)

  await page.goBack() // ③
  await expect(tagsGroup(page)).toBeVisible()
  await expect(priceGroup(page)).toHaveCount(0)
  await expect(tagsGroup(page).locator('[aria-pressed="true"]')).toHaveText('🎁 선물')
  expectRoot(page)

  await page.goBack() // ②
  await expect(preview(page)).toBeVisible()
  await expect(tagsGroup(page)).toHaveCount(0)
  expectRoot(page)

  await page.goBack() // ①
  await expect(door(page)).toBeVisible()
  await expect(photoInput(page)).toHaveCount(0)
  expectRoot(page)

  // 다시 걸어가면 사진 · 태그 · 가격이 그대로다
  await enter(page)
  await expect(preview(page)).toBeVisible()
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await expect(tagsGroup(page).locator('[aria-pressed="true"]')).toHaveText('🎁 선물')
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await expect(page.locator('[aria-label="마음 가격"] [aria-pressed="true"]')).toHaveText('🍡 10개')
  expectRoot(page)
})

// AC-7: ⑥ · 실패 · 퇴근에서 뒤로 → ④, 고른 것 그대로
const WHERE = ['result', 'refused', 'unavailable', 'person_limit', 'daily_limit']
for (const where of WHERE) {
  test(`CAREER-35 AC-7 back from ${where} goes to step 4`, async ({ page }) => {
    await routeQueue(page, [where === 'result' ? ok(3) : failOf(where)])
    await walkToPrice(page)
    await pickPrice(page)
    await submitOf(page).click()
    if (where === 'result') await expect(priceText(page)).toHaveText('모찌 3개')
    else await expect(page.getByTestId(where === 'daily_limit' ? 'off-duty' : 'appraise-error')).toBeVisible()
    expectRoot(page)

    await page.goBack()
    await expect(submitOf(page)).toBeEnabled() // ④
    await expect(page.locator('[aria-label="마음 가격"] [aria-pressed="true"]')).toHaveText('🍡 10개')
    await expect(regionOf(page)).toHaveCount(0)
    await expect(photoInput(page)).toHaveCount(0)
    expectRoot(page)
  })
}

// AC-7: ⑥에서 뒤로 뒤 앞으로를 눌러도 앞 결과 카드는 다시 나오지 않는다
test('CAREER-35 AC-7 forward after back shows no old card', async ({ page }) => {
  await routeQueue(page, [ok(3)])
  const posts = countPosts(page)
  await walkToPrice(page)
  await pickPrice(page)
  await submitOf(page).click()
  await expect(priceText(page)).toHaveText('모찌 3개')

  await page.goBack()
  await expect(submitOf(page)).toBeVisible()
  await page.goForward()
  await settle(page)
  await expect(submitOf(page)).toBeVisible()
  await expect(regionOf(page)).toHaveCount(0)
  await expect(page.getByText('모찌 3개')).toHaveCount(0)
  expectRoot(page)
  expect(posts()).toBe(1)
})

// AC-7: 감정을 3번 한 뒤 뒤로를 계속 눌러도(앱 밖까지) 앞 결과 카드는 한 번도 나오지 않는다
test('CAREER-35 AC-7 back never shows an old card after three appraisals', async ({ page }) => {
  await routeQueue(page, [ok(3), ok(7), ok(9)])
  const posts = countPosts(page)
  await walkToPrice(page)
  await pickPrice(page)
  await submitOf(page).click()
  await expect(priceText(page)).toHaveText('모찌 3개')

  await page.goBack() // 같은 것을 다시: ④에서 한 번 더
  await submitOf(page).click()
  await expect(priceText(page)).toHaveText('모찌 7개')

  await page.getByRole('button', { name: '다른 물건 꺼내기' }).click() // 다른 물건: ②에서 처음부터
  await photoInput(page).setInputFiles(png)
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await pickPrice(page)
  await submitOf(page).click()
  await expect(priceText(page)).toHaveText('모찌 9개')
  await expect.poll(posts).toBe(3)

  const screens = [() => submitOf(page), () => tagsGroup(page), () => photoInput(page), () => door(page)]
  for (const screen of screens) {
    await page.goBack()
    await expect(screen()).toBeAttached()
    await expect(regionOf(page)).toHaveCount(0)
    expectRoot(page)
  }
  for (let i = 0; i < 3; i++) {
    await page.goBack() // 앱 밖(about:blank)까지
    await expect(regionOf(page)).toHaveCount(0)
  }
  expect(page.url()).toBe('about:blank')
  expect(posts()).toBe(3)
})

// AC-7: 어느 화면에서 새로고침해도 빈 ①, 새 탭으로 열어도 빈 ①, 요청은 늘지 않는다
for (const where of Object.keys(ARRIVE)) {
  test(`CAREER-35 AC-7 reload on ${where} starts on empty step 1`, async ({ page }) => {
    await routeQueue(page, ARRIVE[where].replies)
    const posts = countPosts(page)
    await ARRIVE[where].go(page)
    expectRoot(page)
    if (where === 'thinking') await expect.poll(posts).toBe(1) // 요청은 사진을 줄인 뒤에 나간다
    const n = posts()

    await page.reload()
    expectRoot(page)
    await expectEmptyDoor(page)
    expect(posts()).toBe(n)

    const url = page.url()
    const p2 = await page.context().newPage()
    await p2.goto(url)
    expectRoot(p2)
    await expectEmptyDoor(p2)
    expect(posts()).toBe(n)
    await page.unrouteAll({ behavior: 'ignoreErrors' })
  })
}

// AC-7: 새로고침 뒤 뒤로 · 앞으로를 번갈아 눌러도 사진 없는 ③ · ④나 앞 결과가 나오지 않는다
for (const where of ['tags', 'result']) {
  test(`CAREER-35 AC-7 back and forward after reload never show steps 3-4 without a photo or an old result (${where})`, async ({ page }) => {
    await routeQueue(page, ARRIVE[where].replies)
    await ARRIVE[where].go(page)
    await page.reload()
    await expectEmptyDoor(page)

    for (const op of ['back', 'forward', 'back', 'back', 'forward', 'forward']) {
      await (op === 'back' ? page.goBack() : page.goForward())
      await settle(page)
      await expectEmptyDoor(page) // ① 그대로: 사진 칸 · ③ · ④ · 결과 없음
      expectRoot(page)
    }
  })
}

// AC-7: 사진 · 고른 것은 localStorage · sessionStorage · IndexedDB · 주소 어디에도 남지 않는다
test('CAREER-35 AC-7 nothing stays in browser storage', async ({ page }) => {
  await routeQueue(page, [ok(3)])
  await walkToPrice(page)
  await pickPrice(page)
  await submitOf(page).click()
  await expect(priceText(page)).toHaveText('모찌 3개')
  expectRoot(page)

  const stored = await page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    databases: await indexedDB.databases(),
    stateKeys: Object.keys(history.state ?? {}),
    howMuch: history.state?.howMuch,
  }))
  expect(stored.local).toBe(0)
  expect(stored.session).toBe(0)
  expect(stored.databases).toEqual([])
  expect(stored.stateKeys).toEqual(['howMuch'])
  expect(typeof stored.howMuch).toBe('number')
})

// AC-7 (plan 시나리오 3): refused → '사진 다시 꺼내기'로 ② → 뒤로는 ④가 아니라 ①
test('CAREER-35 AC-7 refused back to step 2 then back goes to step 1', async ({ page }) => {
  await routeQueue(page, [failOf('refused')])
  await walkToPrice(page)
  await pickPrice(page)
  await submitOf(page).click()
  await expect(page.getByTestId('appraise-error')).toBeVisible()

  await page.getByRole('button', { name: FAIL_BUTTON.refused, exact: true }).click()
  await expect(photoInput(page)).toBeAttached() // ②
  expectRoot(page)

  await page.goBack()
  await expect(door(page)).toBeVisible() // ①
  await expect(photoInput(page)).toHaveCount(0)
  await expect(submitOf(page)).toHaveCount(0)
  expectRoot(page)
})

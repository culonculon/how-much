import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { enter, next } from './shop-steps.js'

// plan A2: 가장 작은 iPhone에서 주소창 · 도구 막대를 뺀 높이를 어림한 값. 설정 파일은 고치지 않는다.
test.use({ viewport: { width: 375, height: 548 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

// 1×1 PNG — 파일을 따로 두지 않는다
const png = {
  name: 'cat.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  ),
}
const JSON_TYPE = 'application/json; charset=utf-8'
const ok = (mochi, line) => ({ status: 200, body: JSON.stringify({ mochi, line }) })
const fail = (status, code) => ({ status, body: JSON.stringify({ code }) })
const LINE = '흠, 손때가 제법 묻었구먼'

// contracts/appraise.md §5: `| `code` ` 줄의 첫 따옴표 글자
const contract = readFileSync(new URL('../contracts/appraise.md', import.meta.url), 'utf8')
function contractText(code) {
  const line = contract.split('\n').find((l) => l.startsWith(`| \`${code}\``))
  expect(line, code).toBeTruthy()
  return line.match(/"([^"]+)"/)[1]
}

// replies를 차례로 준다. 'hold'는 release()까지 붙잡았다가 바로 다음 항목으로 답한다.
async function routeQueue(page, replies) {
  const queue = [...replies]
  let open = null // 붙잡는 중인 요청이 있으면 그것을 푸는 함수
  let early = 0 // 요청이 오기 전에 부른 release 수
  await page.route(
    (u) => u.pathname === '/api/appraise',
    async (route) => {
      let next = queue.shift()
      if (next === 'hold') {
        if (early > 0) early--
        else await new Promise((r) => (open = r))
        open = null
        next = queue.shift()
      }
      if (!next) throw new Error('routeQueue: 답보다 요청이 많다')
      return route.fulfill({ contentType: JSON_TYPE, ...next })
    },
  )
  return { release: () => (open ? open() : early++) }
}

// POST /api/appraise 요청 수. goto 전에 건다(새 탭 요청도 센다).
function countPosts(page) {
  let n = 0
  page.context().on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/appraise') n++
  })
  return () => n
}

const uncleOf = (page) => page.getByTestId('uncle')
const submitOf = (page) => page.getByRole('button', { name: '감정 받기!', exact: true })
const regionOf = (page) => page.getByRole('region', { name: '감정 결과' })
const preview = (page) => page.getByRole('img', { name: '고른 사진 미리보기' })

// plan 실패 시나리오 7: 어느 화면에서도 주소는 `/`뿐 — 로컬에서 배포 nginx 404를 대신 잡는다
function expectRoot(page) {
  const u = new URL(page.url())
  expect(u.pathname).toBe('/')
  expect(u.hash).toBe('')
}

// ④까지 걸어가 사진 · 태그 · 가격을 고른다
async function choose(page) {
  await page.goto('/')
  await enter(page)
  await page.getByLabel('사진 고르기').setInputFiles(png)
  await next(page)
  await page.getByRole('button', { name: '🎁 선물', exact: true }).click()
  await next(page)
  await page.getByRole('button', { name: '🍡 10개', exact: true }).click()
}

// ④에서 시작해 고른 것이 그대로: ④ 가격 / 뒤로 ③ 태그 / 뒤로 ② 미리보기, 다음 둘로 ④로 돌아온다
async function expectChosen(page) {
  const price = page.locator('[aria-label="마음 가격"] [aria-pressed="true"]')
  await expect(price).toHaveCount(1)
  await expect(price).toHaveText('🍡 10개')
  await page.goBack()
  const tag = page.locator('[aria-label="사연 태그"] [aria-pressed="true"]')
  await expect(tag).toHaveCount(1)
  await expect(tag).toHaveText('🎁 선물')
  await page.goBack()
  await expect(preview(page)).toBeVisible()
  await next(page)
  await next(page)
}

// 아무것도 고르지 않은 첫 화면(①)
async function expectEmpty(page) {
  await expect(preview(page)).toHaveCount(0)
  await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '가게에 들어가기' })).toBeVisible()
  await expect(page.getByLabel('사진 고르기')).toHaveCount(0)
  await expect(regionOf(page)).toHaveCount(0)
  await expect(page.getByTestId('appraise-error')).toHaveCount(0)
  await expect(page.getByTestId('off-duty')).toHaveCount(0)
}

// CAREER-32 AC-5 ① ③: 결과에서 뒤로 → 고른 것 그대로, 다시 감정 → 결과, 앞으로 → 옛 카드 없음
test('CAREER-32 AC-5 ① back from a result keeps choices, then ③ forward shows no old card', async ({ page }) => {
  const q = await routeQueue(page, [ok(3, LINE), 'hold', ok(7, LINE)])
  const posts = countPosts(page)
  await choose(page)
  expectRoot(page)

  await submitOf(page).click()
  await expect(page.getByTestId('appraised-price')).toHaveText('모찌 3개')
  expectRoot(page)

  await page.goBack()
  expectRoot(page)
  await expectChosen(page)
  await expect(submitOf(page)).toBeEnabled()
  await expect(regionOf(page)).toHaveCount(0)
  expect(posts()).toBe(1)

  await submitOf(page).click()
  await expect(uncleOf(page)).toHaveAttribute('data-face', 'think')
  expectRoot(page)
  q.release()
  await expect(page.getByTestId('appraised-price')).toHaveText('모찌 7개')
  expect(posts()).toBe(2)
  expectRoot(page)

  await page.goBack() // ⑥ → ④ 뒤 앞으로
  await expect(submitOf(page)).toBeVisible()
  await page.goForward()
  expectRoot(page)
  await expect(page.getByText('모찌 3개')).toHaveCount(0)
  expect(posts()).toBe(2)
})

// CAREER-32 AC-5 ③ (첫 번째 읽기): 뒤로 바로 뒤의 앞으로
test('CAREER-32 AC-5 ③ forward right after back shows no card', async ({ page }) => {
  await routeQueue(page, [ok(3, LINE)])
  const posts = countPosts(page)
  await choose(page)
  await submitOf(page).click()
  await expect(page.getByTestId('appraised-price')).toHaveText('모찌 3개')

  await page.goBack()
  expectRoot(page)
  await page.goForward()
  expectRoot(page)
  await expect(regionOf(page)).toHaveCount(0)
  await expect(submitOf(page)).toBeVisible()
  expect(posts()).toBe(1)
})

// CAREER-32 AC-5 ②: 실패 · 퇴근 화면에서 뒤로 → AC-3 ②와 같은 입력 화면 (문구가 남음)
for (const code of ['person_limit', 'daily_limit']) {
  test(`CAREER-32 AC-5 ② back from ${code}`, async ({ page }) => {
    await routeQueue(page, [fail(429, code)])
    await choose(page)
    await submitOf(page).click()
    if (code === 'daily_limit') await expect(page.getByTestId('off-duty')).toBeVisible()
    else await expect(page.getByTestId('appraise-error')).toBeVisible()
    expectRoot(page)

    await page.goBack()
    expectRoot(page)
    await expect(submitOf(page)).toBeEnabled() // ④에 남은 문구는 걸어다니기 전에 본다
    if (code === 'daily_limit') {
      await expect(page.getByTestId('off-duty')).toBeVisible() // 입력 쪽에 퇴근 문구가 남는다
      await expect(page.getByTestId('off-duty')).toHaveText(contractText('daily_limit'))
    } else {
      await expect(page.getByTestId('appraise-error')).toHaveText(contractText(code))
    }
    await expectChosen(page)
  })
}

// CAREER-32 AC-5 ④: 세 번 감정한 뒤 뒤로를 눌러도 옛 카드는 다시 나오지 않는다
test('CAREER-32 AC-5 ④ after three appraisals back never shows an old card', async ({ page }) => {
  await routeQueue(page, [ok(3, LINE), ok(7, LINE), ok(9, LINE)])
  const posts = countPosts(page)
  await choose(page)
  await submitOf(page).click()
  await expect(page.getByTestId('appraised-price')).toHaveText('모찌 3개')
  await page.goBack() // ⑥ → ④
  await submitOf(page).click()
  await expect(page.getByTestId('appraised-price')).toHaveText('모찌 7개')
  await page.goBack()
  await submitOf(page).click()
  await expect(page.getByTestId('appraised-price')).toHaveText('모찌 9개')
  expectRoot(page)

  await page.goBack()
  expectRoot(page)
  await expectChosen(page)
  await expect(regionOf(page)).toHaveCount(0)

  // 앱 몫 history는 다섯 칸 이하: 끝까지, 앱 밖(about:blank)까지 뒤로 가도 옛 카드는 한 번도 안 나온다
  for (let i = 0; i < 7; i++) {
    await page.goBack()
    await expect(regionOf(page)).toHaveCount(0)
  }
  expect(posts()).toBe(3)
})

// CAREER-32 AC-5 ⑤ (U10 b): 갸웃 중 뒤로 → 입력, 늦은 답은 버리고 그때까지 감정 받기는 꺼짐
test('CAREER-32 AC-5 ⑤ back while thinking discards the late answer', async ({ page }) => {
  const q = await routeQueue(page, ['hold', ok(3, LINE)])
  const posts = countPosts(page)
  await choose(page)
  await submitOf(page).click()
  await expect(uncleOf(page)).toHaveAttribute('data-face', 'think')
  expectRoot(page)

  await page.goBack()
  expectRoot(page)
  await expectChosen(page)
  await expect(submitOf(page)).toBeDisabled()
  await expect(page.locator('#busy-note')).toBeVisible()
  // 사용자가 정한 글자 (2026-10-31)
  await expect(page.locator('#busy-note')).toHaveText('앞 감정을 마무리하는 중이에요. 끝나면 다시 누를 수 있어요.')

  q.release()
  await expect(submitOf(page)).toBeEnabled()
  await expect(regionOf(page)).toHaveCount(0)
  await expect(uncleOf(page)).not.toHaveAttribute('data-face', 'happy')
  expect(posts()).toBe(1)
})

// CAREER-32 AC-5 ⑥: 새로고침하면 어느 화면에서든 빈 입력 화면, 요청은 늘지 않는다
for (const where of ['thinking', 'result', 'person_limit', 'daily_limit']) {
  test(`CAREER-32 AC-5 ⑥ reload on ${where} starts empty`, async ({ page }) => {
    const replies = {
      thinking: ['hold', ok(3, LINE)], // 붙잡은 채 다시 불러오고 풀지 않는다
      result: [ok(3, LINE)],
      person_limit: [fail(429, 'person_limit')],
      daily_limit: [fail(429, 'daily_limit')],
    }[where]
    await routeQueue(page, replies)
    const posts = countPosts(page)
    await choose(page)
    await submitOf(page).click()
    if (where === 'thinking') await expect(uncleOf(page)).toHaveAttribute('data-face', 'think')
    else if (where === 'result') await expect(page.getByTestId('appraised-price')).toHaveText('모찌 3개')
    else if (where === 'person_limit') await expect(page.getByTestId('appraise-error')).toBeVisible()
    else await expect(page.getByTestId('off-duty')).toBeVisible()
    expectRoot(page)
    await expect.poll(posts).toBe(1) // 요청은 사진을 줄인 뒤에 나간다
    const n = posts()

    await page.reload()
    expectRoot(page)
    await expectEmpty(page)
    expect(posts()).toBe(n)
    await page.unrouteAll({ behavior: 'ignoreErrors' })
  })
}

// CAREER-32 AC-5 ⑥: 결과 화면의 주소를 새 탭에서 바로 열어도 빈 입력 화면
test('CAREER-32 AC-5 ⑥ opening the result address in a new tab starts empty', async ({ page }) => {
  await routeQueue(page, [ok(3, LINE)])
  const posts = countPosts(page)
  await choose(page)
  await submitOf(page).click()
  await expect(page.getByTestId('appraised-price')).toHaveText('모찌 3개')
  const url = page.url()

  const p2 = await page.context().newPage()
  await p2.goto(url)
  expectRoot(p2)
  await expectEmpty(p2)
  expect(posts()).toBe(1)
})

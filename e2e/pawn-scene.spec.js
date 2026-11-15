import { expect, test } from '@playwright/test'
import { failOf, ok, pickPrice, routeQueue, submitOf, walkToPrice } from './shop-steps.js'

// plan A2: 가장 작은 iPhone에서 주소창 · 도구 막대를 뺀 높이를 어림한 값. 설정 파일은 고치지 않는다.
test.use({ viewport: { width: 375, height: 548 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

const ORIGIN = 'http://127.0.0.1:5199/'

// plan A2 '3px 칸 확인': truck-board 안 모든 자손 상자(판 기준)의 left · top · width · height가 3의 배수.
// svg는 자기 상자만 본다(안쪽 path는 viewBox 칸). 어긋난 요소를 모아 돌려준다.
const offGrid = (page) =>
  page.getByTestId('truck-board').evaluate((board) => {
    const r2 = (v) => Math.round(v * 100) / 100
    const o = board.getBoundingClientRect()
    const bad = []
    if (!Number.isInteger(r2(o.left))) bad.push(`board left=${r2(o.left)}`)
    const nodes = [...board.querySelectorAll('*')]
    for (const el of nodes) {
      const svg = el.closest('svg')
      if (svg && svg !== el) continue
      const b = el.getBoundingClientRect()
      for (const [prop, v] of [['left', b.left - o.left], ['top', b.top - o.top], ['width', b.width], ['height', b.height]]) {
        if (r2(v) % 3 !== 0) bad.push(`${el.tagName.toLowerCase()} .${el.getAttribute('class') ?? ''} [${el.dataset.testid ?? ''}] ${prop}=${r2(v)}`)
      }
    }
    return { count: nodes.length, bad }
  })

async function expectOnGrid(page, where) {
  const { count, bad } = await offGrid(page)
  expect(count, `${where}: 판 안에 자손이 있다`).toBeGreaterThan(0)
  expect(bad, where).toEqual([])
  const uncle = page.getByTestId('uncle')
  if ((await uncle.count()) > 0) expect((await uncle.boundingBox()).width, `${where}: uncle 폭`).toBe(120)
}

// AC-5: 멈춘 그림(동작 줄이기)의 모든 장면 상자가 3px 칸 위에 있다
test('CAREER-40 AC-5 every scene box sits on the 3px grid', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const q = await routeQueue(page, ['hold', ok(23), failOf('refused'), failOf('daily_limit')])

  await page.goto('/') // ①
  await expect(page.getByRole('button', { name: '가게에 들어가기', exact: true })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await expectOnGrid(page, '① door')

  await walkToPrice(page, { open: false })
  await expectOnGrid(page, '④ price')
  await pickPrice(page)
  await submitOf(page).click()
  await expect(page.getByRole('progressbar', { name: '감정 중' })).toBeVisible()
  await expectOnGrid(page, '⑤ thinking')
  q.release()
  await expect(page.getByTestId('appraised-shown')).toHaveText('한정선 23개')
  await expectOnGrid(page, '⑥ result')

  await page.goBack() // ④ → refused
  await submitOf(page).click()
  await expect(page.getByTestId('appraise-error')).toBeVisible()
  await expectOnGrid(page, 'refused')

  await walkToPrice(page) // 새로 열어 ④ → 퇴근
  await pickPrice(page)
  await submitOf(page).click()
  await expect(page.getByTestId('off-duty')).toBeVisible()
  await expectOnGrid(page, 'off duty')
})

// AC-5: 글꼴은 갈무리11 그대로이고 ①→⑥ · 퇴근에서 밖으로 나가는 요청이 없다 (CAREER-35 AC-10 꼴)
test('CAREER-40 AC-5 font stays Galmuri11 and nothing leaves the site', async ({ page }) => {
  await routeQueue(page, [ok(23), failOf('daily_limit')])
  const urls = []
  page.context().on('request', (r) => urls.push(r.url())) // goto 전에 건다: 첫 문서 요청부터

  await page.goto('/')
  await expect(page.getByRole('button', { name: '가게에 들어가기', exact: true })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  const signs = page.getByTestId('shop-scene').getByText('이동식 전당포')
  expect(await signs.count()).toBeGreaterThan(0) // 큰 장면 간판 글자
  for (const family of await signs.evaluateAll((els) => els.map((e) => getComputedStyle(e).fontFamily))) {
    expect(family.replace(/^["']/, '')).toMatch(/^Galmuri11/)
  }

  await walkToPrice(page, { open: false })
  await pickPrice(page)
  await submitOf(page).click()
  await expect(page.getByTestId('appraised-shown')).toHaveText('한정선 23개')
  await page.goBack() // ④ → 퇴근
  await submitOf(page).click()
  await expect(page.getByTestId('off-duty')).toBeVisible()

  expect(urls.filter((u) => !u.startsWith(ORIGIN) && !u.startsWith('blob:') && !u.startsWith('data:'))).toEqual([])
})

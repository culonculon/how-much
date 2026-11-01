import { expect, test } from '@playwright/test'
import { enter, ok, photoInput, pickPrice, png, routeQueue, submitOf, walkToPrice } from './shop-steps.js'

// plan A2: 가장 작은 iPhone에서 주소창 · 도구 막대를 뺀 높이를 어림한 값. 설정 파일은 고치지 않는다.
test.use({ viewport: { width: 375, height: 548 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

const ORIGIN = 'http://127.0.0.1:5199/'

// 갈무리 FontFace의 상태 · 표시 방법 (CSS의 @font-face가 document.fonts에 올라온다)
const galmuri = (page) =>
  page.evaluate(() => {
    const f = [...document.fonts].find((x) => x.family.replace(/["']/g, '') === 'Galmuri11')
    return f ? { status: f.status, display: f.display } : null
  })

// AC-10: ①→⑥ 동안 밖으로 나가는 요청이 없고, 글꼴이 사이트 안에서 200으로 와 화면 글자에 적용된다
test('CAREER-35 AC-10 no request leaves the site and the font arrives', async ({ page }) => {
  await routeQueue(page, [ok(3)])
  const urls = []
  page.context().on('request', (r) => urls.push(r.url())) // goto 전에 건다: 첫 문서 요청부터
  const fonts = []
  page.on('response', (r) => new URL(r.url()).pathname.endsWith('.woff2') && fonts.push(r.status()))

  await walkToPrice(page)
  await pickPrice(page)
  await submitOf(page).click()
  await expect(page.getByTestId('appraised-price')).toHaveText('모찌 3개')

  expect(urls.filter((u) => !u.startsWith(ORIGIN) && !u.startsWith('blob:') && !u.startsWith('data:'))).toEqual([])
  await page.evaluate(() => document.fonts.ready)
  expect(fonts.length).toBeGreaterThan(0)
  expect(fonts.every((s) => s === 200)).toBe(true)
  expect((await galmuri(page)).status).toBe('loaded')
  const family = await page.getByRole('button', { name: '다른 물건 꺼내기' }).evaluate((el) => getComputedStyle(el).fontFamily)
  expect(family.replace(/^["']/, '')).toMatch(/^Galmuri11/)
})

// AC-10: 글꼴이 늦어도(붙잡아 둠) 글자가 보이고 버튼이 눌린다 — font-display: swap
test('CAREER-35 AC-10 text is visible while the font is held', async ({ page }) => {
  let release
  const held = new Promise((r) => (release = r))
  await page.route('**/*.woff2', async (route) => {
    await held
    await route.continue()
  })
  await page.goto('/')
  const button = page.getByRole('button', { name: '가게에 들어가기' })
  await expect(button).toBeVisible()

  const font = await galmuri(page)
  expect(font.display).toBe('swap')
  expect(font.status).not.toBe('loaded') // 아직 붙잡혀 있다
  const box = await button.boundingBox()
  expect(box.height).toBeGreaterThan(0)
  await expect(button).toHaveText(/가게에 들어가기/) // toBeVisible은 투명한 글자도 통과하므로 글자와 박스를 함께 본다

  await enter(page) // 글꼴 없이도 눌려서 ②로 간다
  await expect(photoInput(page)).toBeAttached()
  await photoInput(page).setInputFiles(png)

  release()
  await page.evaluate(() => document.fonts.ready)
  await expect.poll(async () => (await galmuri(page)).status).toBe('loaded')
  await page.unrouteAll({ behavior: 'ignoreErrors' })
})

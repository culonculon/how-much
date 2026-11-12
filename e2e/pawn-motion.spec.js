import { expect, test } from '@playwright/test'
import { enter, failOf, ok, photoInput, pickPrice, routeQueue, submitOf, typePrice, walkToPrice } from './shop-steps.js'

// plan A2: 가장 작은 iPhone에서 주소창 · 도구 막대를 뺀 높이를 어림한 값. 설정 파일은 고치지 않는다.
test.use({ viewport: { width: 375, height: 548 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

const buttonOf = (page, name) => page.getByRole('button', { name, exact: true })

// 돕는 함수 (expect 없음). plan A2 '모두 steps()를 보는 법'
const anims = (page) =>
  page.evaluate(() =>
    document.getAnimations().map((a) => ({
      name: a.animationName ?? a.id,
      iterations: a.effect.getTiming().iterations,
      steps: a.effect.getTiming().easing.startsWith('steps(') || a.effect.getKeyframes().slice(0, -1).every((k) => k.easing.startsWith('steps(')),
      playState: a.playState,
    })),
  )
const namesOf = async (page) => (await anims(page)).map((a) => a.name)
const A_NAMES = ['hm-arrive', 'hm-shut-up', 'hm-bubble']
const D_NAMES = ['hm-count', 'hm-stamp', 'hm-spark']
const E_NAMES = ['hm-shut-down', 'hm-drive', 'hm-smoke', 'hm-post']
// 움직임이 있다 · 한 번만 · 모두 steps()
function expectOnceSteps(list, names) {
  for (const n of names) {
    const a = list.find((x) => x.name === n)
    expect(a, `${n}이 있다`).toBeTruthy()
    expect(a.iterations, `${n} 되풀이`).toBe(1)
    expect(a.steps, `${n} steps()`).toBe(true)
  }
}
const expectAllSteps = (list) => {
  for (const a of list) expect(a.steps, `${a.name} steps()`).toBe(true)
}

// AC-6 A: 열 때 한 번, 그 동안에도 버튼이 눌리고, 다시 열어 끝까지 기다리면 A 이름은 0개
test('CAREER-40 AC-6 A runs once on opening and the button works at once', async ({ page }) => {
  await routeQueue(page, [])
  await page.goto('/')
  const opening = await anims(page) // 기다리지 않고
  expectOnceSteps(opening, A_NAMES)
  expectAllSteps(opening)
  await enter(page) // 움직이는 중에 누른다
  await expect(photoInput(page)).toBeAttached() // ②

  await page.goto('/') // 다시 ①
  await expect(buttonOf(page, '가게에 들어가기')).toBeVisible()
  await page.evaluate(() =>
    Promise.all(document.getAnimations().filter((a) => a.effect.getTiming().iterations !== Infinity).map((a) => a.finished)),
  ) // 그 화면의 한 번짜리 움직임이 모두 끝날 때까지 (말풍선 지연 2.82s 때문에 고정 시간 대신)
  const left = await namesOf(page)
  expect(left.filter((n) => A_NAMES.includes(n))).toEqual([])
})

// AC-6 B · C: 되풀이는 숨쉬기 · 눈 깜빡 · 돋보기 · 접시 · 막대 · 점뿐
test('CAREER-40 AC-6 B and C repeat only where allowed', async ({ page }) => {
  const ALLOWED = ['hm-breathe', 'hm-blink', 'hm-mag', 'hm-pan', 'hm-bar', 'hm-dots']
  const q = await routeQueue(page, ['hold', ok(23), failOf('daily_limit')])
  const observed = []
  const look = async () => observed.push(...(await anims(page)))
  const infinite = (list, n) => list.find((a) => a.name === n)?.iterations

  await page.goto('/') // ①
  await expect(buttonOf(page, '가게에 들어가기')).toBeVisible()
  await look()
  await walkToPrice(page, { open: false }) // ④
  await page.waitForFunction(() => ['hm-breathe', 'hm-blink'].every((n) => document.getAnimations().some((a) => (a.animationName ?? a.id) === n)))
  const four = await anims(page)
  observed.push(...four)
  expect(infinite(four, 'hm-breathe')).toBe(Infinity)
  expect(infinite(four, 'hm-blink')).toBe(Infinity)

  await pickPrice(page)
  await submitOf(page).click() // ⑤
  await expect(page.getByRole('progressbar', { name: '감정 중' })).toBeVisible()
  await page.waitForFunction(() => ['hm-mag', 'hm-pan'].every((n) => document.getAnimations().some((a) => (a.animationName ?? a.id) === n)))
  const five = await anims(page)
  observed.push(...five)
  expect(infinite(five, 'hm-mag')).toBe(Infinity)
  expect(infinite(five, 'hm-pan')).toBe(Infinity)

  q.release() // ⑥
  await expect(page.getByTestId('appraised-price')).toHaveText('한정선 모찌 23개')
  await look()
  await page.goBack() // ④ → 퇴근
  await submitOf(page).click()
  await expect(page.getByTestId('off-duty')).toBeVisible()
  await look()

  expect(observed.filter((a) => a.iterations === Infinity && !ALLOWED.includes(a.name)).map((a) => a.name)).toEqual([])
  expectAllSteps(observed)
})

// AC-6 D: 숫자는 서버 값까지 한 번 오르고, 읽는 글자는 처음부터 마지막 값이며 라이브 영역이 아니다
test('CAREER-40 AC-6 D counts up to the server value, once', async ({ page }) => {
  await routeQueue(page, [ok(23)])
  await walkToPrice(page)
  await typePrice(page, '7')
  await submitOf(page).click()
  await page.waitForFunction(() => ['hm-count', 'hm-stamp'].every((n) => document.getAnimations().some((a) => (a.animationName ?? a.id) === n)))
  const list = await anims(page)
  expectOnceSteps(list, ['hm-count', 'hm-stamp'])
  expectAllSteps(list)
  await expect(page.getByTestId('appraised-price')).toHaveText('한정선 모찌 23개') // 오르는 동안에도 처음부터 끝 값
  expect(await page.getByTestId('appraised-price').evaluate((el) => el.closest('[aria-live]') === null)).toBe(true)
  expect(await page.getByTestId('appraised-shown').evaluate((el) => el.closest('[aria-live]') === null)).toBe(true)

  await expect(page.getByTestId('appraised-shown')).toHaveText('한정선 23개') // 끝 값 = mochi
  await expect.poll(async () => (await namesOf(page)).filter((n) => D_NAMES.includes(n)), { timeout: 5000 }).toEqual([])
  await expect(page.getByTestId('appraised-shown')).toHaveText('한정선 23개') // 끝난 뒤에도 그대로
})

// AC-6 E: 셔터가 내려오고 트럭이 한 번 떠나며 빈 길이 남는다 (plan A2 '퇴근 E')
test('CAREER-40 AC-6 E the truck shuts, leaves once and an empty road stays', async ({ page }) => {
  await routeQueue(page, [failOf('daily_limit')])
  await walkToPrice(page)
  await pickPrice(page)
  await submitOf(page).click()
  await page.waitForFunction(() => ['hm-shut-down', 'hm-drive', 'hm-smoke', 'hm-post'].every((n) => document.getAnimations().some((a) => (a.animationName ?? a.id) === n)))
  const list = await anims(page)
  expectOnceSteps(list, E_NAMES)
  expectAllSteps(list)

  // 글자와 버튼은 기다리지 않고 보이고 눌린다
  await expect(page.getByTestId('off-duty')).toBeVisible({ timeout: 1000 })
  const again = buttonOf(page, '내일 다시 오기')
  await expect(again).toBeEnabled({ timeout: 1000 })
  await again.click({ trial: true, timeout: 1000 })

  // 움직임을 모두 멈추고 시각을 맞춰 본다
  const probe = (t) =>
    page.evaluate((time) => {
      window.__held ??= document.getAnimations().map((a) => (a.pause(), a))
      for (const a of window.__held) a.currentTime = time
      const by = (id) => document.querySelector(`[data-testid="${id}"]`)
      const shown = (el) => !!el && getComputedStyle(el).visibility !== 'hidden'
      return {
        truck: shown(by('truck')),
        smoke: shown(by('smoke')),
        post: shown(by('post-sign')),
        shutter: Math.round(by('shutter').getBoundingClientRect().height * 100) / 100,
        left: parseFloat(getComputedStyle(by('truck')).left),
      }
    }, t)
  const at06 = await probe(600)
  expect(at06.truck).toBe(true)
  expect(at06.smoke).toBe(false)
  expect(at06.post).toBe(false)
  expect(at06.shutter).toBeGreaterThan(0)
  expect(at06.shutter).toBeLessThan(87)
  const at25 = await probe(2500)
  expect(at25.truck).toBe(true)
  expect(at25.smoke).toBe(true)
  expect(at25.shutter).toBe(87)
  expect(at25.left).toBeGreaterThan(0)
  expect(at25.left % 30).toBe(0)
  const at39 = await probe(3900)
  expect(at39.truck).toBe(false)
  expect(at39.post).toBe(false)

  // 끝으로 넘긴다 (끝난 뒤 play()는 처음으로 되감기므로 finish())
  await page.evaluate(() => window.__held.forEach((a) => a.finish()))
  expect(await anims(page)).toEqual([])
  await expect(page.getByTestId('truck')).toBeHidden()
  await expect(page.getByTestId('smoke')).toBeHidden()
  await expect(page.getByTestId('post-sign')).toBeVisible()
  await expect(page.getByTestId('closed-sign')).toBeVisible()
  await expect(page.getByTestId('closed-sign')).toHaveText('오늘 영업 끝')
})

// AC-6 F: 누르는 한 번에 한 번만 움직인다
test('CAREER-40 AC-6 F runs once per press', async ({ page }) => {
  await routeQueue(page, [])
  await walkToPrice(page)
  await page.evaluate(() => {
    window.__press = []
    document.addEventListener('animationstart', (e) => {
      if (e.animationName === 'hm-press') {
        window.__press.push(e.target.getAnimations().filter((a) => a.animationName === 'hm-press').map((a) => a.effect.getTiming().iterations))
      }
    })
  })
  const box = await buttonOf(page, '10개').boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await expect.poll(() => page.evaluate(() => window.__press.length)).toBe(1)
  expect(await page.evaluate(() => window.__press[0])).toEqual([1])
  await page.mouse.up()
  await expect.poll(async () => (await namesOf(page)).filter((n) => n === 'hm-press'), { timeout: 300 }).toEqual([])
  expect(await page.evaluate(() => window.__press.length)).toBe(1) // 뗄 때 다시 돌지 않았다
})

// K8 (plan A6 'K8 — 다시 짬' (가) 2): 움직임의 모든 step 순간에 CAREER-35 칸 검사가 그대로 선다
const MIN_MOMENTS = {
  // plan A2 움직임 표의 step 수 (이 수 이상 재야 한다)
  'hm-arrive': 12, 'hm-shut-up': 6, 'hm-bubble': 1, 'hm-breathe': 1,
  'hm-mag': 3, 'hm-pan': 1, 'hm-bar': 8,
  'hm-count': 12, 'hm-stamp': 2,
  'hm-shut-down': 6, 'hm-drive': 14, 'hm-smoke': 10, 'hm-post': 1,
}
const SHOULD_HAVE = {
  '① door': ['hm-arrive', 'hm-shut-up', 'hm-bubble', 'hm-breathe'],
  '④ price': ['hm-breathe'],
  '⑤ thinking': ['hm-mag', 'hm-pan', 'hm-bar'],
  '⑥ result': ['hm-count', 'hm-stamp', 'hm-breathe'],
  'off duty': ['hm-shut-down', 'hm-drive', 'hm-smoke', 'hm-post'],
}
// 화면 안에서 한 번에: 모두 pause → step 구간 가운데 시각 모으기 → 시각마다 currentTime을 맞추고 검사
const sweep = (page) =>
  page.evaluate(() => {
    const all = document.getAnimations()
    all.forEach((a) => a.pause())
    const nameOf = (a) => a.animationName ?? a.id
    const stepsOf = (easing) => Number(easing.match(/^steps\((\d+)/)?.[1] ?? 0)
    const times = new Map() // 시각 → 그 시각을 만든 움직임 이름
    const moments = {}
    const add = (a, t) => {
      times.set(t, times.get(t) ?? nameOf(a))
      moments[nameOf(a)] = (moments[nameOf(a)] ?? 0) + 1
    }
    for (const a of all) {
      const { delay, duration, easing } = a.effect.getTiming()
      const dur = Number(duration)
      if (!(dur > 0)) continue
      if (delay > 0) add(a, delay / 2) // 지연 가운데
      const n = stepsOf(easing)
      for (let k = 0; k < n; k++) add(a, delay + (dur * (k + 0.5)) / n) // steps(n): n칸
      const kfs = a.effect.getKeyframes()
      for (let i = 0; i < kfs.length - 1; i++) {
        const from = kfs[i].computedOffset
        const to = kfs[i + 1].computedOffset
        const m = stepsOf(kfs[i].easing) || 1 // steps(m): m칸, 그 밖은 구간 가운데 하나
        for (let k = 0; k < m; k++) add(a, delay + dur * (from + ((to - from) * (k + 0.5)) / m))
      }
    }
    const r2 = (v) => Math.round(v * 100) / 100
    const label = (el) => `${el.tagName.toLowerCase()}.${el.getAttribute('class') ?? ''}·${el.dataset.testid ?? ''}`
    const bad = []
    for (const [t, name] of [...times].sort((x, y) => x[0] - y[0])) {
      all.forEach((a) => {
        a.currentTime = t
      })
      const miss = (el, prop, value) => bad.push({ t, name, el: label(el), prop, value })
      const uncle = document.querySelector('[data-testid="uncle"]')
      if (uncle) {
        // CAREER-35 'AC-9 pixels stay on whole cells'의 세 줄 (글자 그대로) + translate · scale · rotate
        const width = uncle.getBoundingClientRect().width
        if (width % 40 !== 0) miss(uncle, 'width % 40', width)
        for (let n = uncle; n; n = n.parentElement) {
          const s = getComputedStyle(n)
          if (s.transform !== 'none') miss(n, 'transform', s.transform)
          for (const p of ['translate', 'scale', 'rotate']) if (s[p] !== 'none') miss(n, p, s[p])
        }
        const shape = getComputedStyle(uncle).shapeRendering.toLowerCase()
        if (shape !== 'crispedges') miss(uncle, 'shapeRendering', shape)
      }
      const board = document.querySelector('[data-testid="truck-board"]')
      const o = board.getBoundingClientRect()
      for (const el of board.querySelectorAll('*')) {
        const svg = el.closest('svg')
        if (svg && svg !== el) continue
        const b = el.getBoundingClientRect()
        const sides = [['left', b.left - o.left], ['top', b.top - o.top], ['width', b.width], ['height', b.height]]
        for (const [prop, v] of sides) if (r2(v) % 3 !== 0) miss(el, prop, r2(v))
      }
      const stamp = document.querySelector('[data-testid="stamp"]')
      if (stamp) {
        const b = stamp.getBoundingClientRect()
        if (r2(b.width) % 3 !== 0) miss(stamp, 'width', r2(b.width))
        if (r2(b.height) % 3 !== 0) miss(stamp, 'height', r2(b.height))
      }
    }
    return { bad, moments }
  })

test('CAREER-40 AC-5 the CAREER-35 cell check holds at every step of motion', async ({ page }) => {
  const q = await routeQueue(page, ['hold', ok(23), failOf('daily_limit')])
  const results = {}
  const run = async (where) => {
    results[where] = await sweep(page)
  }

  await page.goto('/')
  await expect(buttonOf(page, '가게에 들어가기')).toBeVisible()
  await run('① door')
  await walkToPrice(page, { open: false })
  await run('④ price')
  await pickPrice(page)
  await submitOf(page).click()
  await expect(page.getByRole('progressbar', { name: '감정 중' })).toBeVisible()
  await run('⑤ thinking')
  q.release()
  await expect(page.getByTestId('appraised-price')).toHaveText('한정선 모찌 23개')
  await run('⑥ result')
  await page.goBack()
  await submitOf(page).click()
  await expect(page.getByTestId('off-duty')).toBeVisible()
  await run('off duty')

  const verdict = {}
  for (const [where, { bad, moments }] of Object.entries(results)) {
    verdict[where] = { bad, missing: SHOULD_HAVE[where].filter((n) => !((moments[n] ?? 0) >= MIN_MOMENTS[n])).map((n) => `${n}: ${moments[n] ?? 0} < ${MIN_MOMENTS[n]}`) }
  }
  expect(verdict).toEqual(Object.fromEntries(Object.keys(SHOULD_HAVE).map((w) => [w, { bad: [], missing: [] }])))
})

// AC-6 동작 줄이기: 움직임 0개, 마지막 모습이 바로 보인다
test('CAREER-40 AC-6 reduced motion shows the last picture at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const q = await routeQueue(page, ['hold', ok(23), failOf('daily_limit')])
  const count = () => page.evaluate(() => document.getAnimations().length)

  await page.goto('/') // ①
  await expect(buttonOf(page, '가게에 들어가기')).toBeVisible()
  expect(await count()).toBe(0)
  const shutter = page.getByTestId('shutter')
  await expect(shutter).toHaveAttribute('data-shutter', 'up')
  expect(await shutter.evaluate((el) => el.getBoundingClientRect().height)).toBe(0)

  await walkToPrice(page, { open: false }) // ④
  expect(await count()).toBe(0)
  const box = await buttonOf(page, '10개').boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down() // 버튼 누르는 중
  expect(await count()).toBe(0)
  await page.mouse.up()
  await expect(buttonOf(page, '10개')).toHaveAttribute('aria-pressed', 'true')
  await submitOf(page).click() // ⑤
  await expect(page.getByRole('progressbar', { name: '감정 중' })).toBeVisible()
  expect(await count()).toBe(0)

  q.release() // ⑥
  await expect(page.getByRole('region', { name: '감정 결과' })).toBeVisible()
  expect(await page.getByTestId('appraised-shown').textContent()).toBe('한정선 23개') // 첫 확인부터 마지막 값
  expect(await page.getByTestId('stamp').isVisible()).toBe(true)
  expect(await count()).toBe(0)

  await page.goBack() // ④ → 퇴근
  await submitOf(page).click()
  await expect(page.getByTestId('off-duty')).toBeVisible()
  expect(await page.getByTestId('truck').isHidden()).toBe(true) // 첫 확인부터 빈 길
  expect(await page.getByTestId('smoke').isHidden()).toBe(true)
  expect(await page.getByTestId('post-sign').isVisible()).toBe(true)
  expect(await page.getByTestId('closed-sign').isVisible()).toBe(true)
  expect(await count()).toBe(0)
})

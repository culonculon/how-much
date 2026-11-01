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

const mascotOf = (page) => page.getByRole('status', { name: '감정사 아저씨' })
const uncleOf = (page) => page.getByTestId('uncle')
// 실패 · 퇴근 화면의 버튼 (plan A1 '글자의 원본')
const FAIL_BUTTON = { person_limit: '조금 뒤에 다시', unavailable: '다시 감정 받기', daily_limit: '내일 다시 오기' }
const againOf = (page) => page.getByRole('button', { name: '다른 물건 꺼내기', exact: true })
const failButtonOf = (page, code) => page.getByRole('button', { name: FAIL_BUTTON[code], exact: true })

// ③(사연 태그)에서 멈춘다: 사진 · 태그를 고르고 ③에 있다
async function choose(page) {
  await page.goto('/')
  await enter(page)
  await page.getByLabel('사진 고르기').setInputFiles(png)
  await next(page)
  await page.getByRole('button', { name: '🎁 선물', exact: true }).click()
}

// ③에서 '화면을 내린 상태'로 '다음'을 누르고, ④에서 가격을 골라 '감정 받기!'를 누른다.
// 누른 뒤에는 화면을 움직이지 않는다(scroll · hover · tap 금지).
async function press(page) {
  const n = page.getByRole('button', { name: '다음', exact: true })
  await expect(n).toBeEnabled()
  await n.evaluate((el) => el.scrollIntoView({ block: 'end' }))
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await n.click()
  await page.getByRole('button', { name: '🍡 10개', exact: true }).click()
  await page.getByRole('button', { name: '감정 받기!', exact: true }).click()
}

// 위 · 아래 끝이 모두 화면 안 (이 확인은 스크롤하지 않는다)
async function inView(...locs) {
  for (const l of locs) await expect(l).toBeInViewport({ ratio: 1 })
}

// ⑥에서 '뒤로' 둘로 ③에 간다 (같은 물건으로 다시)
async function backToTags(page) {
  await page.goBack()
  await page.goBack()
  await expect(page.getByRole('group', { name: '사연 태그' })).toBeVisible()
}

async function resultInView(page) {
  await inView(
    page.getByRole('region', { name: '감정 결과' }),
    page.getByTestId('appraised-price'),
    page.getByTestId('my-price'),
    page.getByTestId('mascot-line'),
    againOf(page),
  )
}

// CAREER-32 AC-4 ①: 갸웃 · 카드 세 줄 · 다시 감정이 화면을 내리지 않아도 보인다 (첫 · 둘째 감정)
test('CAREER-32 AC-4 ① thinking, card and again are in view on first and second appraise', async ({ page }) => {
  const q = await routeQueue(page, [
    'hold',
    ok(3, '흠, 손때가 제법 묻었구먼'),
    'hold',
    ok(7, '허허, 또 왔구먼'),
  ])
  await choose(page)

  await press(page)
  await expect(uncleOf(page)).toHaveAttribute('data-face', 'think')
  await inView(mascotOf(page))
  q.release()
  await expect(page.getByTestId('appraised-price')).toHaveText('모찌 3개')
  await resultInView(page)

  await backToTags(page)
  await press(page)
  await expect(uncleOf(page)).toHaveAttribute('data-face', 'think')
  await inView(mascotOf(page))
  q.release()
  await expect(page.getByTestId('appraised-price')).toHaveText('모찌 7개')
  await resultInView(page)
})

// CAREER-32 AC-4 ②: 둘째 감정이 실패 · 퇴근이어도 문구와 다시 감정이 화면 안에 있다
for (const [code, status] of [
  ['person_limit', 429],
  ['unavailable', 503],
  ['daily_limit', 429],
]) {
  test(`CAREER-32 AC-4 ② ${code} on the second appraise is in view`, async ({ page }) => {
    await routeQueue(page, [ok(3, '흠, 손때가 제법 묻었구먼'), fail(status, code)])
    await choose(page)

    await press(page)
    await expect(page.getByTestId('appraised-price')).toHaveText('모찌 3개')
    await backToTags(page)
    await press(page)

    if (code === 'daily_limit') {
      await expect(uncleOf(page)).toHaveCount(0) // 아저씨 없이 어두운 가게
      await expect(page.getByTestId('shop-scene')).toHaveAttribute('data-scene', 'night')
      await expect(page.getByTestId('off-duty')).toHaveText(contractText('daily_limit'))
      await expect(page.getByTestId('appraise-error')).toHaveCount(0)
      await inView(mascotOf(page), page.getByTestId('off-duty'), failButtonOf(page, code))
    } else {
      await expect(page.getByTestId('appraise-error')).toHaveText(contractText(code))
      await inView(page.getByTestId('appraise-error'), failButtonOf(page, code))
    }
    if (code === 'person_limit') {
      // spec 글자 그대로
      await expect(page.getByTestId('appraise-error')).toHaveText('허허, 너무 자주 왔구먼. 좀 쉬었다 와.')
    }
  })
}

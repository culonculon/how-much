// CAREER-40 AC-7 카드 꼬리 글 줄: 24px, 오른쪽 끝 ≤ 792(도장 816 앞), 넘으면 6px씩 줄여 맞춤(plan A2 '카드 자리표').
// 카드 캔버스를 toBlob 직전에 손실 없이 읽어 꼬리 글 색(#a3542a)의 가장 오른쪽 점을 잰다. 글꼴은 진짜 Galmuri11.
import { expect, test } from '@playwright/test'
import { enter, next, ok, photoInput, pickPrice, png, routeQueue, submitOf } from './shop-steps.js'

const REAL_HOST = 'd2x05xzjhjvp9j.cloudfront.net'
const FOOT_LEFT = 288
const FOOT_RIGHT_MAX = 792

// goto 전에 건다: 1080 폭 카드가 toBlob에 오면 꼬리 글 줄(y 1180~1212, x 284~815)에서 꼬리 글 색의 가장 오른쪽 x를 window.__footRight에 적는다.
async function watchFooter(page) {
  await page.addInitScript(() => {
    const toBlob = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function (...args) {
      if (this.width === 1080) {
        const d = this.getContext('2d').getImageData(284, 1180, 532, 32).data
        let right = -1
        for (let i = 0; i < d.length; i += 4) {
          if (Math.abs(d[i] - 0xa3) <= 24 && Math.abs(d[i + 1] - 0x54) <= 24 && Math.abs(d[i + 2] - 0x2a) <= 24) right = Math.max(right, 284 + ((i / 4) % 532))
        }
        window.__footRight = right
      }
      return toBlob.apply(this, args)
    }
  })
}

// 주소창 host를 실제 배포 주소처럼 바꾼다: 그 주소로 가는 요청을 로컬 서버로 넘긴다
async function asHost(page, host) {
  await page.route(`http://${host}/**`, (route) => route.fetch({ url: route.request().url().replace(`http://${host}`, 'http://127.0.0.1:5199') }).then((r) => route.fulfill({ response: r })))
}

async function cardFooterRight(page, url) {
  await routeQueue(page, [ok(30)])
  await watchFooter(page)
  await page.goto(url)
  await page.evaluate(() => document.fonts.ready)
  await enter(page)
  await photoInput(page).setInputFiles(png)
  await next(page)
  await page.getByRole('button', { name: '🎁 선물', exact: true }).click()
  await next(page)
  await pickPrice(page, '10개')
  await submitOf(page).click()
  await page.getByRole('button', { name: '공유', exact: true }).click()
  await page.waitForFunction(() => window.__footRight !== undefined)
  return page.evaluate(() => window.__footRight)
}

test('CAREER-40 AC-7 card footer with the real host ends by x 792', async ({ page }) => {
  test.slow()
  await asHost(page, REAL_HOST)
  const right = await cardFooterRight(page, `http://${REAL_HOST}/`)
  expect(await page.evaluate(() => location.host)).toBe(REAL_HOST)
  expect(right, '꼬리 글이 그려졌고 12px까지 줄이지는 않았다').toBeGreaterThan(700)
  expect(right, '꼬리 글 오른쪽 끝').toBeLessThanOrEqual(FOOT_RIGHT_MAX)
})

test('CAREER-40 AC-7 card footer with a short host stays 24px', async ({ page }) => {
  test.slow()
  const right = await cardFooterRight(page, '/')
  // 24px 그대로면 끝은 288 + (같은 글꼴로 잰 24px 폭). 한 단계(18px)만 줄어도 이 값에서 크게 벗어난다
  const width24 = await page.evaluate(
    (left) => {
      const ctx = document.createElement('canvas').getContext('2d')
      ctx.font = "24px Galmuri11, 'Apple SD Gothic Neo', monospace"
      return left + ctx.measureText(`내 물건도 감정받기 ▶ ${location.host}`).width
    },
    FOOT_LEFT,
  )
  expect(Math.abs(right - width24)).toBeLessThanOrEqual(4)
})

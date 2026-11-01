// CAREER-34 T2~T9: 공유 카드 e2e. 공유 창은 가짜(fakeShare)로 바꾼다 — plan A4 '공유 창 흉내'.
import { readFileSync, writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { jpegInfo, makeFixtures } from './photo-fixtures.js'
import { LINE, countPosts, next, ok, photoInput, pickPrice, png, routeQueue, submitOf, enter } from './shop-steps.js'

const CARD_NAME = 'how-much-card.jpg'
// U1 사용자 답(2026-11-01). 구현의 options.js를 import하지 않는다 — 구현이 바뀌어도 글자는 그대로여야 한다.
const NOT_DRAWN = '공유 그림을 만들지 못했어요.'
const USE_SAVE = '공유 창을 열지 못했어요. 저장을 눌러 주세요.'
// 30자 대사 (shop-view.spec.js와 같은 글자)
const THIRTY = '가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나'

// goto 전에 건다. mode: ok · hold · abort · notallowed · other · none · nocanshare · cantshare
async function fakeShare(page, mode) {
  await page.addInitScript((mode) => {
    Reflect.deleteProperty(Navigator.prototype, 'share')
    Reflect.deleteProperty(Navigator.prototype, 'canShare')
    const put = (name, fn) => Object.defineProperty(Navigator.prototype, name, { value: fn, configurable: true, writable: true })

    window.__toBlobs = 0
    const toBlob = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function (...args) {
      window.__toBlobs++
      return toBlob.apply(this, args)
    }

    const rec = { order: [], canFiles: [], calls: [] }
    window.__share = rec
    if (mode !== 'none') {
      if (mode !== 'nocanshare') {
        put('canShare', function (d) {
          rec.order.push('canShare')
          rec.canFiles.push(d?.files?.length ?? 0)
          return mode !== 'cantshare'
        })
      }
      put('share', function (d) {
        // 동기로 먼저 기록한다 (눌림 안에서 불렸는지 · 그 시점의 그리기 수)
        const entry = {
          keys: Object.keys(d),
          active: navigator.userActivation.isActive,
          toBlobs: window.__toBlobs,
          nfiles: d.files?.length ?? 0,
          done: false,
        }
        rec.order.push('share')
        rec.calls.push(entry)
        const file = d.files?.[0]
        const recorded = (async () => {
          if (file) {
            entry.name = file.name
            entry.type = file.type
            entry.b64 = await new Promise((res) => {
              const r = new FileReader()
              r.onload = () => res(String(r.result).split(',')[1])
              r.readAsDataURL(file)
            })
            try {
              const bmp = await createImageBitmap(file)
              entry.width = bmp.width
              entry.height = bmp.height
              bmp.close()
            } catch {
              entry.width = 0
              entry.height = 0
            }
          }
          entry.done = true
        })()
        // 진짜 공유 창은 닫힐 때까지 끝나지 않는다 — hold는 끝내지 않는다
        if (mode === 'hold') return new Promise(() => {})
        return recorded.then(() => {
          if (mode === 'abort') throw new DOMException('cancelled', 'AbortError')
          if (mode === 'notallowed') throw new DOMException('refused', 'NotAllowedError')
          if (mode === 'other') throw new Error('boom')
        })
      })
    }
  }, mode)
}

const shareOf = (page) => page.getByRole('button', { name: '공유', exact: true })
const noteOf = (page) => page.getByTestId('share-note')
const buttonOf = (page, name) => page.getByRole('button', { name, exact: true })
const ready = (page) => page.evaluate(() => document.fonts.ready)
const shareCount = (page) => page.evaluate(() => window.__share.calls.length)

// ① → 감정 받기! 직전(④, 가격 고름)까지
async function toSubmit(page, { price = '🍡 10개', file = png, fonts = true } = {}) {
  await page.goto('/')
  if (fonts) await ready(page)
  await enter(page)
  await photoInput(page).setInputFiles(file)
  await next(page)
  await page.getByRole('button', { name: '🎁 선물', exact: true }).click()
  await next(page)
  await pickPrice(page, price)
}

// 다시 부르면 새로 시작이다 (init script는 유지됨). 답은 부르는 쪽이 먼저 건다.
async function reveal(page, opts) {
  await toSubmit(page, opts)
  await submitOf(page).click()
  await expect(page.getByTestId('mascot-line')).toBeVisible()
}

const enabled = (page) => expect(shareOf(page)).toBeEnabled({ timeout: 15_000 })

// 켜지면 누른다. 누르기 직전 toBlob 수를 돌려준다.
async function press(page) {
  await enabled(page)
  const before = await page.evaluate(() => window.__toBlobs)
  await shareOf(page).click()
  return before
}

// n번째 share 호출의 기록이 끝나길 기다려 { ...기록, bytes }
async function shared(page, n = 1) {
  let rec = null
  await expect
    .poll(async () => {
      rec = await page.evaluate((i) => {
        const c = window.__share.calls[i]
        return c?.done ? c : null
      }, n - 1)
      return rec !== null
    })
    .toBe(true)
  return { ...rec, bytes: Buffer.from(rec.b64 ?? '', 'base64') }
}

// 두 프레임이 지나갈 때까지 (고정 시간을 기다리지 않는다)
const flush = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

// 요청 뒤(= 어댑터 다시 그리기 끝)에 toBlob을 망가뜨리고 답을 푼다 → 그리기가 실패하는 ⑥
async function revealDrawFails(page, line = LINE) {
  const q = await routeQueue(page, ['hold', ok(30, line)])
  const asked = page.waitForRequest((r) => new URL(r.url()).pathname === '/api/appraise')
  asked.catch(() => {}) // 아래 await에서 다시 던져진다
  await toSubmit(page)
  await submitOf(page).click()
  await asked
  await page.evaluate(() => {
    HTMLCanvasElement.prototype.toBlob = function (cb) {
      cb(null)
    }
  })
  q.release()
  await expect(page.getByTestId('mascot-line')).toBeVisible()
}

// ---------------------------------------------------------------- T2 AC-2

// AC-2 주어진: 가짜 share(hold) / 할 때: '공유' / 그러면: canShare → share 1번, 눌림 안, files 하나, 그림 파일, 내려받기 없음
test('CAREER-34 AC-2 share passes one image file', async ({ page }) => {
  await routeQueue(page, [ok(30)])
  await fakeShare(page, 'hold')
  const downloads = []
  page.on('download', (d) => downloads.push(d))
  await reveal(page)

  const before = await press(page)
  const s = await shared(page)
  const order = await page.evaluate(() => window.__share.order)
  const canFiles = await page.evaluate(() => window.__share.canFiles)

  expect(order.slice(0, 2)).toEqual(['canShare', 'share'])
  expect(order.filter((x) => x === 'share')).toHaveLength(1)
  expect(canFiles[0]).toBe(1) // 그 파일을 담은 인자로 물었다
  expect(s.active).toBe(true)
  expect(s.toBlobs).toBe(before) // 눌렀을 때 그리지 않았다
  expect(s.keys).toEqual(['files'])
  expect(s.nfiles).toBe(1)
  expect(s.type.startsWith('image/')).toBe(true)
  expect(s.width).toBeGreaterThan(0)
  expect(s.height).toBeGreaterThan(0)
  expect(downloads).toHaveLength(0)
})

// AC-2: 잇달아 2번 눌러도 1번 (끝나지 않는 공유 창)
test('CAREER-34 AC-2 share passes one image file — double press', async ({ page }) => {
  await routeQueue(page, [ok(30)])
  await fakeShare(page, 'hold')
  await reveal(page)
  await enabled(page)

  await shareOf(page).dblclick()
  await shared(page)
  await flush(page)
  expect(await shareCount(page)).toBe(1)
})

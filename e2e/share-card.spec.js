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

// ---------------------------------------------------------------- T3 AC-3

// AC-3: 아저씨 값 · 비교 한 줄이 바뀌어도 카드 바이트는 같다. 내 값은 들어가 있다.
test('CAREER-34 AC-3 card bytes ignore mochi and compare line', async ({ page }) => {
  test.slow()
  await routeQueue(page, [ok(30), ok(3), ok(10), ok(30), ok(3)])
  await fakeShare(page, 'hold')
  const take = async (price) => {
    await reveal(page, { price })
    await press(page)
    return shared(page)
  }
  const ten = [await take('🍡 10개'), await take('🍡 10개'), await take('🍡 10개')] // 더 쳐줌 · 짜게 봄 · 같음
  const never = [await take('🙅 안 팔아'), await take('🙅 안 팔아')]

  for (const s of [...ten, ...never]) expect(s.bytes.length).toBeGreaterThan(1000)
  expect(ten[1].bytes.equals(ten[0].bytes)).toBe(true)
  expect(ten[2].bytes.equals(ten[0].bytes)).toBe(true)
  expect(never[1].bytes.equals(never[0].bytes)).toBe(true)
  expect(ten[0].bytes.equals(never[0].bytes)).toBe(false) // 내 값은 정말 들어간다
  for (const s of [...ten, ...never]) {
    expect(s.name).toBe(CARD_NAME)
    expect(s.name).not.toContain('30')
    expect(JSON.stringify(s.keys)).not.toContain('30')
  }
})

// ---------------------------------------------------------------- T4 AC-4

// AC-4: 카드는 지금 결과의 내용이다 (앞 감정이 남지 않음)
test('CAREER-34 AC-4 card shows only the current result', async ({ page, browser }) => {
  test.slow()
  const { F3 } = await makeFixtures(browser)
  await routeQueue(page, Array.from({ length: 10 }, () => ok(30)))
  await fakeShare(page, 'hold')
  const card = async () => {
    await press(page)
    return (await shared(page)).bytes
  }
  const fresh = async (opts) => {
    await reveal(page, opts)
    return card()
  }

  const d1 = await fresh({ file: png, price: '🍡 1개' })
  const d2 = await fresh({ file: F3, price: '🍡 100개' })
  const own10 = await fresh({ file: png, price: '🍡 10개' })
  const own100 = await fresh({ file: png, price: '🍡 100개' })

  // ㄱ 첫 감정 뒤 뒤로 → 다른 마음 가격
  await reveal(page, { file: png, price: '🍡 10개' })
  await page.goBack()
  await expect(submitOf(page)).toBeVisible() // ④
  await pickPrice(page, '🍡 1개')
  await submitOf(page).click()
  await expect(page.getByTestId('mascot-line')).toBeVisible()
  const a = await card()

  // ㄴ 첫 감정 뒤 '다른 물건 꺼내기' → 다른 사진 · 다른 마음 가격
  await reveal(page, { file: png, price: '🍡 10개' })
  await buttonOf(page, '다른 물건 꺼내기').click()
  await photoInput(page).setInputFiles(F3)
  await next(page)
  await page.getByRole('button', { name: '🎁 선물', exact: true }).click()
  await next(page)
  await pickPrice(page, '🍡 100개')
  await submitOf(page).click()
  await expect(page.getByTestId('mascot-line')).toBeVisible()
  const b = await card()

  expect(a.equals(d1)).toBe(true)
  expect(b.equals(d2)).toBe(true)
  expect(d1.equals(own10)).toBe(false) // 내가 부른 값이 들어간다
  expect(own100.equals(d2)).toBe(false) // 사진이 들어간다
})

// ---------------------------------------------------------------- T5 AC-5

// AC-5: GPS가 든 큰 JPEG를 골라도 카드에는 위치 정보가 없다
test('CAREER-34 AC-5 card has no location data', async ({ page, browser }) => {
  const { F1 } = await makeFixtures(browser)
  await routeQueue(page, [ok(30)])
  await fakeShare(page, 'hold')
  await reveal(page, { file: F1 })
  await press(page)
  const { bytes } = await shared(page)

  expect(jpegInfo(bytes)).toMatchObject({ isJpeg: true, hasExif: false, width: 1080, height: 1350 })
  expect(bytes.includes(F1.buffer.subarray(0, 4096))).toBe(false)
  expect(bytes.includes(Buffer.from('how-much\0'))).toBe(false) // F1 EXIF 글자
})

// ---------------------------------------------------------------- T6 AC-6

// 받은 파일이 카드이고, 화면은 ⑥ 그대로다
async function stays(page, download, bytes) {
  expect(download.suggestedFilename()).toBe(CARD_NAME)
  expect(jpegInfo(bytes)).toMatchObject({ isJpeg: true, hasExif: false })
  await expect(page.getByRole('region', { name: '감정 결과' })).toBeVisible()
  await expect(page.getByRole('group', { name: '값 공개' })).toBeVisible()
  expect(new URL(page.url()).pathname).toBe('/')
}

// AC-6 ①②③: 공유 창이 없거나 이 파일을 못 받으면 같은 클릭에서 내려받고, 글자는 '저장'
for (const mode of ['none', 'nocanshare', 'cantshare']) {
  test(`CAREER-34 AC-6 falls back to download — ${mode}`, async ({ page }) => {
    await routeQueue(page, [ok(30)])
    await fakeShare(page, mode)
    await reveal(page)
    await enabled(page)
    const [download] = await Promise.all([page.waitForEvent('download'), shareOf(page).click()])
    await expect(page.getByTestId('share-button')).toHaveText('저장')
    await expect(noteOf(page)).toHaveCount(0)
    const bytes = readFileSync(await download.path())
    await stays(page, download, bytes)

    // 공유 파일이 없으므로 같은 고른 것 · 같은 답으로 다른 탭에서 공유 파일을 받아 비교한다
    const other = await page.context().newPage()
    await routeQueue(other, [ok(30)])
    await fakeShare(other, 'hold')
    await reveal(other)
    await press(other)
    expect(bytes.equals((await shared(other)).bytes)).toBe(true)
  })
}

// AC-6 ④⑤: 공유가 거부되면 저절로 내려받지 않고 문구 + '저장', 한 번 더 누르면 내려받는다
for (const mode of ['notallowed', 'other']) {
  test(`CAREER-34 AC-6 falls back to download — ${mode}`, async ({ page }) => {
    await routeQueue(page, [ok(30)])
    await fakeShare(page, mode)
    const downloads = []
    page.on('download', (d) => downloads.push(d))
    await reveal(page)
    await press(page)
    const s = await shared(page)
    await expect(noteOf(page)).toBeVisible()
    await expect(noteOf(page)).toHaveText(USE_SAVE)
    await expect(page.getByTestId('share-button')).toHaveText('저장')
    expect(downloads).toHaveLength(0)

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('share-button').click()])
    await expect(noteOf(page)).toHaveCount(0)
    const bytes = readFileSync(await download.path())
    expect(bytes.equals(s.bytes)).toBe(true)
    await stays(page, download, bytes)
  })
}

// ---------------------------------------------------------------- T7 AC-7

const AC7 = 'CAREER-34 AC-7 cancel, draw failure and font failure stay on the reveal'

// AC-7 ①: 취소는 실패가 아니다. 문구 없음 · 글자 '공유' · 다시 누르면 다시 share
test(`${AC7} — cancel`, async ({ page }) => {
  await routeQueue(page, [ok(30)])
  await fakeShare(page, 'abort')
  const downloads = []
  page.on('download', (d) => downloads.push(d))
  await reveal(page)
  await press(page)
  await shared(page)
  await flush(page)
  expect(downloads).toHaveLength(0)
  await expect(noteOf(page)).toHaveCount(0)
  await expect(page.getByRole('region', { name: '감정 결과' })).toBeVisible()
  await expect(page.getByTestId('share-button')).toHaveText('공유')

  await shareOf(page).click()
  await shared(page, 2)
  expect(await shareCount(page)).toBe(2)
})

// AC-7 ②: 그리기가 실패하면 문구만. toBlob은 어댑터가 끝난 뒤에 망가뜨린다(처음부터면 ⑥에 못 간다)
test(`${AC7} — draw failure`, async ({ page }) => {
  await fakeShare(page, 'hold')
  const downloads = []
  page.on('download', (d) => downloads.push(d))
  await revealDrawFails(page)
  await enabled(page)
  await shareOf(page).click()

  await expect(noteOf(page)).toHaveAttribute('role', 'alert')
  await expect(noteOf(page)).toHaveText(NOT_DRAWN)
  expect(await shareCount(page)).toBe(0)
  expect(downloads).toHaveLength(0)
  await expect(page.getByTestId('appraised-shown')).toBeVisible()
  await expect(buttonOf(page, '다른 물건 꺼내기')).toBeVisible()
})

// AC-7 ③: 글꼴이 실패해도 눌림 안에서 share가 불린다
test(`${AC7} — font failure`, async ({ page }) => {
  await page.route('**/*.woff2', (r) => r.abort())
  await routeQueue(page, [ok(30)])
  await fakeShare(page, 'hold')
  await reveal(page)
  await press(page)
  const s = await shared(page)
  expect(await shareCount(page)).toBe(1)
  expect(s.active).toBe(true)
})

// AC-7 ③: 글꼴이 오지 않고 붙잡혀도(상한 뒤) 같다
test(`${AC7} — font held`, async ({ page }) => {
  await page.route('**/*.woff2', () => {}) // 응답하지 않는다
  await routeQueue(page, [ok(30)])
  await fakeShare(page, 'hold')
  await reveal(page, { fonts: false })
  await press(page)
  const s = await shared(page)
  expect(await shareCount(page)).toBe(1)
  expect(s.active).toBe(true)
})

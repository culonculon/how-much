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
// CAREER-37: cantshareurl — canShare false only when url is in the data
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
    rec.can = [] // CAREER-37: what canShare was asked, as plain values
    let lastCan = null
    if (mode !== 'none') {
      if (mode !== 'nocanshare') {
        put('canShare', function (d) {
          lastCan = d
          rec.can.push({ keys: Object.keys(d ?? {}), nfiles: d?.files?.length ?? 0, url: d?.url ?? null })
          rec.order.push('canShare')
          rec.canFiles.push(d?.files?.length ?? 0)
          if (mode === 'cantshareurl' && d && 'url' in d) return false
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
        entry.url = d.url ?? null
        entry.sameFile = !!d.files?.[0] && d.files[0] === lastCan?.files?.[0]
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

// 카드(1080×1350 캔버스)의 toBlob만 null을 준다 → 사진 준비는 통과하고 shareCard의 'card not drawn'까지 닿는다
async function revealDrawFails(page, line = LINE) {
  const q = await routeQueue(page, ['hold', ok(30, line)])
  const asked = page.waitForRequest((r) => new URL(r.url()).pathname === '/api/appraise')
  asked.catch(() => {}) // 아래 await에서 다시 던져진다
  await toSubmit(page)
  await submitOf(page).click()
  await asked
  await page.evaluate(() => {
    const toBlob = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function (cb, ...rest) {
      if (this.width === 1080 && this.height === 1350) return cb(null) // 카드만. 사진 준비는 통과
      return toBlob.call(this, cb, ...rest)
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
  expect(s.keys).toEqual(['files', 'url']) // CAREER-37: the site url is shared too
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

// CAREER-37 AC-1 주어진: 가짜 share(hold) / 할 때: '공유' / 그러면: 같은 인자로 canShare → share 1번, files 1개 + url(origin + '/')
test('CAREER-37 AC-1 share passes the card and the site url', async ({ page }) => {
  await routeQueue(page, [ok(30)])
  await fakeShare(page, 'hold')
  const downloads = []
  page.on('download', (d) => downloads.push(d))
  await reveal(page)

  const before = await press(page)
  const s = await shared(page)
  const order = await page.evaluate(() => window.__share.order)
  const can = await page.evaluate(() => window.__share.can)
  const origin = await page.evaluate(() => location.origin)
  const host = await page.evaluate(() => location.host)

  expect(order.slice(0, 2)).toEqual(['canShare', 'share'])
  expect(order.filter((x) => x === 'share')).toHaveLength(1)
  expect(can[0].keys).toEqual(s.keys) // canShare가 share와 같은 키 · 값으로 불렸다
  expect(can[0].url).toBe(s.url)
  expect(can[0].nfiles).toBe(1)
  expect(s.sameFile).toBe(true)
  expect(s.keys).toEqual(['files', 'url'])
  expect(s.url).toBe(origin + '/')
  const u = new URL(s.url)
  expect(u.pathname).toBe('/')
  expect(u.search).toBe('')
  expect(u.hash).toBe('')
  expect(u.host).toBe(host)
  expect(s.nfiles).toBe(1)
  expect(s.name).toBe(CARD_NAME)
  expect(s.type).toBe('image/jpeg')
  expect(s.width).toBeGreaterThan(0)
  expect(s.height).toBeGreaterThan(0)
  expect(s.active).toBe(true)
  expect(s.toBlobs).toBe(before)
  expect(downloads).toHaveLength(0)
})

// CAREER-37 AC-1: 잇달아 2번 눌러도 1번
test('CAREER-37 AC-1 share passes the card and the site url — double press', async ({ page }) => {
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
    const downloads = []
    page.on('download', (d) => downloads.push(d))
    await reveal(page)
    await enabled(page)
    const [download] = await Promise.all([page.waitForEvent('download'), shareOf(page).click()])
    await flush(page)
    expect(downloads).toHaveLength(1) // 내려받기 정확히 1번
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

// CAREER-37 AC-3 ④: url이 든 인자에만 canShare가 false → 한 번만 묻고 share 없이 내려받는다 (files만 · url만으로 다시 묻지 않음)
test('CAREER-37 AC-3 falls back to download when files with url cannot be shared', async ({ page }) => {
  await routeQueue(page, [ok(30)])
  await fakeShare(page, 'cantshareurl')
  const downloads = []
  page.on('download', (d) => downloads.push(d))
  await reveal(page)
  await enabled(page)
  const [download] = await Promise.all([page.waitForEvent('download'), shareOf(page).click()])
  await flush(page)
  expect(downloads).toHaveLength(1)
  await expect(page.getByTestId('share-button')).toHaveText('저장')
  await expect(noteOf(page)).toHaveCount(0)
  expect(await shareCount(page)).toBe(0)
  const can = await page.evaluate(() => window.__share.can)
  expect(can).toHaveLength(1)
  expect(can[0].keys).toEqual(['files', 'url'])
  const bytes = readFileSync(await download.path())
  await stays(page, download, bytes)

  const other = await page.context().newPage()
  await routeQueue(other, [ok(30)])
  await fakeShare(other, 'hold')
  await reveal(other)
  await press(other)
  expect(bytes.equals((await shared(other)).bytes)).toBe(true)
})

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
    await flush(page)
    expect(downloads).toHaveLength(1) // 내려받기 정확히 1번
    await expect(noteOf(page)).toHaveCount(0)
    const bytes = readFileSync(await download.path())
    expect(bytes.equals(s.bytes)).toBe(true)
    await stays(page, download, bytes)
  })
}

// CAREER-36: '저장' 상태에서 연타해도 내려받기는 1번 (공유 창이 없을 때 · 거부된 뒤)
for (const mode of ['none', 'notallowed']) {
  test(`CAREER-36 save double press downloads once — ${mode}`, async ({ page }) => {
    await routeQueue(page, [ok(30)])
    await fakeShare(page, mode)
    const downloads = []
    page.on('download', (d) => downloads.push(d))
    await reveal(page)
    await enabled(page)
    if (mode === 'notallowed') {
      await shareOf(page).click()
      await expect(page.getByTestId('share-button')).toHaveText('저장')
      expect(downloads).toHaveLength(0)
    }
    await page.getByTestId('share-button').dblclick()
    await expect.poll(() => downloads.length).toBeGreaterThan(0)
    await flush(page) // 늦게 오는 2번째를 기다린다
    expect(downloads).toHaveLength(1)
  })
}

// CAREER-36: 연타 막음(600ms)이 지나면 '저장'은 다시 내려받는다 — 막음이 영구히 막는 것이 아님을 확인
test('CAREER-36 save again after the double press guard', async ({ page }) => {
  await routeQueue(page, [ok(30)])
  await fakeShare(page, 'none')
  const downloads = []
  page.on('download', (d) => downloads.push(d))
  await reveal(page)
  await enabled(page)
  await shareOf(page).click()
  await expect.poll(() => downloads.length).toBe(1)
  await expect(page.getByTestId('share-button')).toHaveText('저장')
  await page.waitForTimeout(700) // 고정 대기는 여기만: 막음 시간(ShareRow.jsx 600ms)이 지나야 한다
  await page.getByTestId('share-button').click()
  await expect.poll(() => downloads.length).toBe(2)
})

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

// AC-7 ②: 그리기가 실패하면 문구만. toBlob 흉내는 카드 캔버스(1080×1350)만 망가뜨리고 사진 준비(최대 1024px)는 통과시킨다
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

// ---------------------------------------------------------------- T8, T9: 가장 작은 iPhone

test.describe('reveal on the smallest iPhone', () => {
  test.use({ viewport: { width: 375, height: 548 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

  // 위 · 아래 끝이 모두 화면 안 (스크롤하지 않는다)
  async function inView(...locs) {
    for (const l of locs) await expect(l).toBeInViewport({ ratio: 1 })
  }

  // AC-8 '요청': 감정 받기 직전부터 공유 · 저장까지 /api/appraise POST 1번 말고 요청이 없다 (blob: · data:는 네트워크가 아님)
  for (const mode of ['ok', 'abort', 'none']) {
    test(`CAREER-34 AC-8 no requests — ${mode}`, async ({ page }) => {
      await routeQueue(page, [ok(30, THIRTY)])
      const posts = countPosts(page)
      await fakeShare(page, mode)
      await toSubmit(page)
      // '감정 받기!' 누르기 전부터 센다. /api/appraise POST 1번만 빼고 요청은 0개
      const others = []
      page.context().on('request', (r) => {
        const appraise = r.method() === 'POST' && new URL(r.url()).pathname === '/api/appraise'
        if (!appraise && !/^(blob|data):/.test(r.url())) others.push(r.url())
      })
      await submitOf(page).click()
      await expect(page.getByTestId('mascot-line')).toBeVisible()
      await enabled(page)
      if (mode === 'none') await Promise.all([page.waitForEvent('download'), shareOf(page).click()])
      else {
        await shareOf(page).click()
        await shared(page)
      }
      await flush(page)
      expect(others).toEqual([])
      expect(posts()).toBe(1)
    })
  }

  // AC-8 '자리': ⑥의 요소가 모두 화면 안, 버튼 높이 44 이상
  test('CAREER-34 AC-8 in view', async ({ page }) => {
    await routeQueue(page, [ok(30, THIRTY)])
    await fakeShare(page, 'hold')
    await reveal(page)
    await enabled(page)
    await ready(page)
    const share = page.getByTestId('share-button')
    await inView(
      page.getByRole('group', { name: '값 공개' }),
      page.getByTestId('appraised-shown'),
      page.getByTestId('compare-line'),
      share,
      buttonOf(page, '다른 물건 꺼내기'),
    )
    expect((await share.boundingBox()).height).toBeGreaterThanOrEqual(44)
  })

  // AC-8 '자리': 그리기 실패 문구가 떠도 문구와 두 버튼이 화면 안
  test('CAREER-34 AC-8 in view — note after draw failure', async ({ page }) => {
    await fakeShare(page, 'hold')
    await revealDrawFails(page, THIRTY)
    await enabled(page)
    await ready(page)
    await shareOf(page).click()
    await expect(noteOf(page)).toHaveText(NOT_DRAWN)
    await inView(noteOf(page), page.getByTestId('share-button'), buttonOf(page, '다른 물건 꺼내기'))
  })

  // AC-8 '자리': 공유가 거부된 뒤 문구와 두 버튼이 화면 안
  test('CAREER-34 AC-8 in view — note after notallowed', async ({ page }) => {
    await routeQueue(page, [ok(30, THIRTY)])
    await fakeShare(page, 'notallowed')
    await reveal(page)
    await press(page)
    await expect(noteOf(page)).toHaveText(USE_SAVE)
    await ready(page)
    await inView(noteOf(page), page.getByTestId('share-button'), buttonOf(page, '다른 물건 꺼내기'))
  })

  // AC-8 history: 공유 · 취소 · 저장은 history를 바꾸지 않고, 뒤로 → ④, 앞으로 → 카드 되살림 없음
  for (const mode of ['ok', 'abort', 'none']) {
    test(`CAREER-34 AC-8 history — ${mode}`, async ({ page }) => {
      await routeQueue(page, [ok(30, THIRTY)])
      await fakeShare(page, mode)
      await reveal(page)
      await enabled(page)
      const where = () => page.evaluate(() => ({ length: history.length, state: history.state }))
      const before = await where()
      if (mode === 'none') await Promise.all([page.waitForEvent('download'), shareOf(page).click()])
      else {
        await shareOf(page).click()
        await shared(page)
      }
      expect(await where()).toEqual(before)

      await page.goBack()
      await expect(submitOf(page)).toBeVisible() // ④
      await expect(buttonOf(page, '🍡 10개')).toHaveAttribute('aria-pressed', 'true')
      await page.goForward()
      await expect(submitOf(page)).toBeVisible()
      await expect(page.getByRole('region', { name: '감정 결과' })).toHaveCount(0)
    })
  }

  // AC-8 history: 공유 뒤 '다른 물건 꺼내기'는 새로 시작이다
  test('CAREER-34 AC-8 history — another item after sharing', async ({ page }) => {
    await routeQueue(page, [ok(30, THIRTY)])
    await fakeShare(page, 'ok')
    await reveal(page)
    await press(page)
    await shared(page)
    await buttonOf(page, '다른 물건 꺼내기').click()
    await expect(photoInput(page)).toBeAttached() // ②
    await expect(page.getByRole('img', { name: '고른 사진 미리보기' })).toHaveCount(0)
    await expect(buttonOf(page, '다음')).toBeDisabled()
  })

  // AC-8 초점: ⑥ 도착은 '감정 결과' 영역, 누른 뒤에는 버튼에 남는다. 화면에 그림 · 캔버스는 없다
  for (const mode of ['ok', 'abort', 'none']) {
    test(`CAREER-34 AC-8 focus — ${mode}`, async ({ page }) => {
      await routeQueue(page, [ok(30, THIRTY)])
      await fakeShare(page, mode)
      await reveal(page)
      const region = page.getByRole('region', { name: '감정 결과' })
      await expect(region).toBeFocused()
      await enabled(page) // 버튼이 켜진 뒤에도 그대로
      await expect(region).toBeFocused()
      await expect(page.locator('canvas, img')).toHaveCount(0)
      await expect(page.getByTestId('uncle')).toHaveAttribute('aria-hidden', 'true')

      const share = page.getByTestId('share-button')
      if (mode === 'none') {
        await Promise.all([page.waitForEvent('download'), shareOf(page).click()])
        await expect(share).toHaveText('저장')
      } else {
        await shareOf(page).click()
        await shared(page)
      }
      await expect(share).toBeFocused()
    })
  }

  // T9 H0: 사용자가 눈으로 볼 파일 5개. 확인 없이 저장만 한다.
  test('CAREER-34 H0 shots', async ({ page, browser }, testInfo) => {
    test.slow()
    const { F1, F2 } = await makeFixtures(browser)
    const save = (name, bytes) => writeFileSync(testInfo.outputPath(name), bytes)
    await routeQueue(page, Array.from({ length: 4 }, () => ok(30, THIRTY)))
    await fakeShare(page, 'notallowed')

    await reveal(page, { file: F2, price: '🍡 10개' })
    await press(page)
    save('card-portrait.jpg', (await shared(page)).bytes)

    await reveal(page, { file: F1, price: '🙅 안 팔아' })
    await press(page)
    save('card-landscape.jpg', (await shared(page)).bytes)

    await reveal(page)
    await enabled(page)
    await ready(page)
    await page.screenshot({ path: testInfo.outputPath('reveal.png') })
    await shareOf(page).click()
    await expect(noteOf(page)).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('reveal-note.png') })

    const other = await page.context().newPage() // 글꼴이 없을 때 카드
    await other.route('**/*.woff2', (r) => r.abort())
    await routeQueue(other, [ok(30, THIRTY)])
    await fakeShare(other, 'hold')
    await reveal(other, { file: F2, price: '🍡 10개' })
    await press(other)
    save('card-fallback.jpg', (await shared(other)).bytes)
  })
})

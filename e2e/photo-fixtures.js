// 시험 사진을 테스트 때 만든다 (plan '시험 사진'). 저장소에 이진 파일을 두지 않는다.

// 브라우저 canvas로 그려 base64로 돌려받는다.
async function draw(page, spec) {
  const b64 = await page.evaluate(async ({ w, h, kind, type, q }) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')
    if (kind === 'gridGradient') {
      const grad = g.createLinearGradient(0, 0, w, h)
      grad.addColorStop(0, '#e63946')
      grad.addColorStop(1, '#1d3557')
      g.fillStyle = grad
      g.fillRect(0, 0, w, h)
      g.strokeStyle = '#ffffff'
      g.lineWidth = 6
      for (let x = 0; x < w; x += 200) {
        g.beginPath()
        g.moveTo(x, 0)
        g.lineTo(x, h)
        g.stroke()
      }
      for (let y = 0; y < h; y += 200) {
        g.beginPath()
        g.moveTo(0, y)
        g.lineTo(w, y)
        g.stroke()
      }
    } else if (kind === 'redBlue') {
      g.fillStyle = '#ff0000'
      g.fillRect(0, 0, w, h / 2)
      g.fillStyle = '#0000ff'
      g.fillRect(0, h / 2, w, h / 2)
    } else {
      g.fillStyle = '#2a9d8f'
      g.fillRect(0, 0, w, h)
      g.clearRect(0, 0, w / 2, h / 2) // 일부를 투명하게
    }
    const blob = await new Promise((resolve) => c.toBlob(resolve, type, q))
    return await new Promise((resolve) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result).split(',')[1])
      r.readAsDataURL(blob)
    })
  }, spec)
  return Buffer.from(b64, 'base64')
}

const u16 = (n) => {
  const b = Buffer.alloc(2)
  b.writeUInt16LE(n)
  return b
}
const u32 = (n) => {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(n)
  return b
}
// IFD 항목 12바이트: 태그 · 형 · 개수 · 값(또는 값 위치)
const entry = (tag, type, count, value) => Buffer.concat([u16(tag), u16(type), u32(count), value])
const rationals = (...pairs) => Buffer.concat(pairs.flatMap(([n, d]) => [u32(n), u32(d)]))

// SOI(FF D8) 바로 뒤에 APP1 `Exif\0\0` + TIFF(II*\0, IFD0 오프셋 8)를 끼운다.
export function insertExif(jpeg, { orientation, gps } = {}) {
  const make = Buffer.from('how-much\0') // 9바이트 → 값 위치로 가리킴
  const n0 = 1 + (orientation ? 1 : 0) + (gps ? 1 : 0)
  const ifd0Size = 2 + 12 * n0 + 4
  const makeOff = 8 + ifd0Size
  const gpsOff = makeOff + make.length
  const gpsIfdSize = 2 + 12 * 4 + 4
  const latOff = gpsOff + gpsIfdSize
  const lonOff = latOff + 24

  const e0 = [entry(0x010f, 2, make.length, u32(makeOff))]
  if (orientation) e0.push(entry(0x0112, 3, 1, Buffer.concat([u16(orientation), u16(0)])))
  if (gps) e0.push(entry(0x8825, 4, 1, u32(gpsOff)))
  const parts = [
    Buffer.from('II*\0'),
    u32(8),
    u16(n0),
    ...e0,
    u32(0),
    make,
  ]
  if (gps) {
    parts.push(
      u16(4),
      entry(0x0001, 2, 2, Buffer.from('N\0\0\0')),
      entry(0x0002, 5, 3, u32(latOff)),
      entry(0x0003, 2, 2, Buffer.from('E\0\0\0')),
      entry(0x0004, 5, 3, u32(lonOff)),
      u32(0),
      rationals([37, 1], [33, 1], [0, 1]),
      rationals([127, 1], [0, 1], [0, 1]),
    )
  }
  const tiff = Buffer.concat(parts)
  const body = Buffer.concat([Buffer.from('Exif\0\0'), tiff])
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), Buffer.from([(body.length + 2) >> 8, (body.length + 2) & 0xff]), body])
  return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)])
}

// JPEG 마커를 SOS 전까지 걸으며 읽는다. 길이가 끝을 넘으면 던진다.
export function jpegInfo(buf) {
  const isJpeg = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  const info = { isJpeg, width: 0, height: 0, hasExif: false }
  if (!isJpeg) return info
  let i = 2
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw new Error(`marker expected at ${i}`)
    while (buf[i + 1] === 0xff) i++ // 채움 바이트
    const m = buf[i + 1]
    if (m === 0xda || m === 0xd9) break
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
      i += 2
      continue
    }
    const len = buf.readUInt16BE(i + 2)
    if (len < 2 || i + 2 + len > buf.length) throw new Error(`segment overruns at ${i}`)
    const data = buf.subarray(i + 4, i + 2 + len)
    if (m === 0xe1 && data.subarray(0, 6).equals(Buffer.from('Exif\0\0'))) info.hasExif = true
    const isSof = m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)
    if (isSof && info.width === 0) {
      info.height = data.readUInt16BE(1)
      info.width = data.readUInt16BE(3)
    }
    i += 2 + len
  }
  return info
}

export const isPng = (buf) =>
  buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))

export async function makeFixtures(browser) {
  const page = await browser.newPage()
  try {
    await page.setContent('<canvas></canvas>')
    const f1 = await draw(page, { w: 4000, h: 3000, kind: 'gridGradient', type: 'image/jpeg', q: 0.9 })
    const f2 = await draw(page, { w: 1200, h: 800, kind: 'redBlue', type: 'image/jpeg', q: 0.9 })
    const f3 = await draw(page, { w: 800, h: 600, kind: 'transparent', type: 'image/png' })
    return {
      F1: { name: 'f1.jpg', mimeType: 'image/jpeg', buffer: insertExif(f1, { gps: true }) },
      F2: { name: 'f2.jpg', mimeType: 'image/jpeg', buffer: insertExif(f2, { orientation: 6 }) },
      F3: { name: 'f3.png', mimeType: 'image/png', buffer: f3 },
      F4: { name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('이건 사진이 아니에요') },
    }
  } finally {
    await page.close()
  }
}

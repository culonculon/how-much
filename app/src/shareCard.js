// mochi and line never come in: the card cannot show them (ADR-0010).
import { CARD, PRICES } from './options.js'
import { preparePhoto } from './photo.js'
import { PU, U } from './pixels.js'

export const CARD_W = 1080
export const CARD_H = 1350
const FONT_WAIT_MS = 1500
const DOT = 8
const font = (px) => `${px}px Galmuri11, 'Apple SD Gothic Neo', monospace`

async function fontReady() {
  let timer
  const late = new Promise((done) => { timer = setTimeout(done, FONT_WAIT_MS) })
  try {
    await Promise.race([document.fonts?.load(font(36)), late])
  } catch {
    // font failed: draw with the fallback (AC-7 ③)
  } finally {
    clearTimeout(timer)
  }
}

export async function makeCard(photo, myPrice) {
  await fontReady()
  const jpeg = await preparePhoto(photo)
  const bitmap = await createImageBitmap(jpeg)
  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  const box = (color, x, y, w, h) => {
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)
  }
  // Integer left edge, so glyph cells land on pixels.
  const text = (s, px, color, cx, baseline) => {
    ctx.font = font(px)
    ctx.fillStyle = color
    ctx.fillText(s, Math.round(cx - ctx.measureText(s).width / 2), baseline)
  }

  box('#b07a48', 0, 0, CARD_W, CARD_H)
  box('#3b2416', 48, 48, 984, 792)
  box('#2b1a0e', 60, 60, 960, 768)
  const scale = Math.min(960 / bitmap.width, 768 / bitmap.height)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 60 + Math.round((960 - w) / 2), 60 + Math.round((768 - h) / 2), w, h)
  bitmap.close()

  U.happy.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c !== '.' && PU[c]) box(PU[c], 48 + x * DOT, 872 + y * DOT, DOT, DOT)
    }),
  )

  box('#3b2416', 392, 872, 640, 320)
  box('#fff4e0', 404, 884, 616, 296)
  const mine = PRICES.find((p) => p.id === myPrice)
  text(CARD.capUncle, 36, '#3b2416', 712, 940)
  text(CARD.hidden, 72, '#a3542a', 712, 1040)
  text(`${CARD.capMine} ${mine.mochi == null ? '안 팔아' : `🍡 × ${mine.mochi}`}`, 36, '#3b2416', 712, 1130)
  text(location.host, 36, '#2b1a0e', CARD_W / 2, 1290)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
  if (!blob) throw new Error('card not drawn')
  return new File([blob], CARD.fileName, { type: 'image/jpeg' })
}

export function saveCard(file) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

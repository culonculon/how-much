// mochi and line never come in: the card cannot show them (ADR-0010). The card is a pawn ticket (전당표), mockup-v3 Card at 2x:
// 1080x1350, 6px cells. Places and colours: plan A2 '카드 자리표'.
import { CARD, HANJEONG, shownOf } from './options.js'
import { preparePhoto } from './photo.js'
import { PU, U } from './pixels.js'

export const CARD_W = 1080
export const CARD_H = 1350
const FONT_WAIT_MS = 1500
const MINE_MAX = 612 // the value text must end by x = 924 (inside the wood box)
const FOOT_MAX = 504 // the footer line starts at x = 288 and must end by x = 792 (before the stamp at 816)
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

export async function makeCard(photo, mine) {
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
  // Integer left edge, so glyph cells land on pixels. align: 'c' centre at x, 'l' left edge at x, 'r' right edge at x.
  const text = (s, px, color, x, baseline, align = 'c') => {
    ctx.font = font(px)
    ctx.fillStyle = color
    const w = ctx.measureText(s).width
    ctx.fillText(s, Math.round(align === 'c' ? x - w / 2 : align === 'r' ? x - w : x), baseline)
    return w
  }
  const hanjeong = (x, y, cell) => {
    HANJEONG.forEach(([fill, d]) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(cell, cell)
      ctx.fillStyle = fill === '#3b2416' ? '#2b1a0e' : fill // the card's rice cake has the darker outline
      ctx.fill(new Path2D(d))
      ctx.restore()
    })
  }
  const MID = 534 // paper centre

  // wood wall
  box('#4a2f1c', 0, 0, CARD_W, CARD_H)
  for (let y = 36; y < CARD_H; y += 42) box('#3f2817', 0, y, CARD_W, 6)

  // paper: shadow, 12px outline, sheet
  box('#2b1a0e', 84, 90, 948, 1212)
  box('#2b1a0e', 48, 54, 972, 1236)
  box('#fff4e0', 60, 66, 948, 1212)

  // awning: 72px stripes with a scalloped edge (mockup `stripes` x2), cut at the paper edge
  ctx.save()
  ctx.beginPath()
  ctx.rect(60, 66, 948, 54)
  ctx.clip()
  for (let i = 0; i < 14; i++) {
    const c = i % 2 === 0 ? '#c0503a' : '#fff4e0'
    const x = 60 + i * 72
    box(c, x, 66, 72, 36)
    box(c, x + 6, 102, 60, 6)
    box(c, x + 12, 108, 48, 6)
    box('#2b1a0e', x + 6, 108, 6, 6)
    box('#2b1a0e', x + 60, 108, 6, 6)
    box('#2b1a0e', x + 12, 114, 48, 6)
  }
  box('rgba(43, 26, 14, 0.12)', 60, 96, 948, 6)
  ctx.restore()

  // head and title (letter by letter: canvas letterSpacing is not everywhere)
  text(CARD.head, 24, '#a3542a', MID, 186)
  ctx.font = font(72)
  const chars = [...CARD.title]
  const widths = chars.map((c) => ctx.measureText(c).width)
  let tx = MID - (widths.reduce((a, b) => a + b, 0) + 36 * (chars.length - 1)) / 2
  chars.forEach((c, i) => {
    text(c, 72, '#3b2416', tx, 288, 'l')
    tx += widths[i] + 36
  })
  box('#3b2416', MID - 168, 312, 336, 6)
  box('#e8b84a', MID - 168, 324, 336, 6)

  // photo frame (inner 300x300, the whole picture kept)
  box('#3b2416', 108, 360, 312, 312)
  box('#e8dccb', 114, 366, 300, 300)
  const scale = Math.min(300 / bitmap.width, 300 / bitmap.height)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 114 + Math.round((300 - w) / 2), 366 + Math.round((300 - h) / 2), w, h)
  bitmap.close()

  // tag with a string: the uncle's value stays hidden ('?')
  box('#3b2416', 402, 594, 6, 24)
  box('#3b2416', 408, 618, 66, 36)
  box('#ffd27a', 414, 624, 54, 24)
  text(CARD.tag, 24, '#3b2416', 441, 644)

  // dotted rows: name ··· value
  const row = (name, value, baseline) => {
    const left = 462
    const nameW = text(name, 24, '#a3542a', left, baseline, 'l')
    const valueW = text(value, 24, '#3b2416', 960, baseline, 'r')
    for (let x = Math.ceil((left + nameW + 12) / 12) * 12; x + 6 <= 960 - valueW - 12; x += 12) box('#c58a52', x, baseline - 6, 6, 6)
  }
  row(CARD.capUncle, CARD.hidden, 396)
  row(CARD.capWho, CARD.who, 456)

  // wood value box
  box('#2b1a0e', 108, 726, 852, 132)
  box('#4a2f1c', 114, 732, 840, 120)
  box('#6b4224', 114, 732, 840, 6)
  box('#3b2416', 114, 846, 840, 6)
  hanjeong(138, 750, 8)
  hanjeong(216, 770, 6)
  text(CARD.capMine, 24, '#e8d3b4', 312, 774, 'l')
  const value = shownOf(mine)
  let px = 72
  ctx.font = font(px)
  while (px > 12 && ctx.measureText(value).width > MINE_MAX) ctx.font = font((px -= 6))
  text(value, px, '#ffd27a', 312, 846, 'l')

  // the uncle's face, the footer and the 감정필 stamp
  U.happy.forEach((r, y) =>
    [...r].forEach((c, x) => {
      if (c !== '.' && PU[c]) box(PU[c], 108 + x * 4, 1074 + y * 4, 4, 4)
    }),
  )
  const foot = `${CARD.foot} ${location.host}`
  let fpx = 24
  ctx.font = font(fpx)
  while (fpx > 12 && ctx.measureText(foot).width > FOOT_MAX) ctx.font = font((fpx -= 6))
  text(foot, fpx, '#a3542a', 288, 1206, 'l')
  box('rgba(192, 80, 58, 0.06)', 816, 1092, 132, 132)
  ctx.strokeStyle = '#c0503a'
  ctx.lineWidth = 12
  ctx.strokeRect(822, 1098, 120, 120)
  ctx.textBaseline = 'middle'
  text(CARD.stamp[0], 48, '#c0503a', 882, 1131)
  text(CARD.stamp[1], 48, '#c0503a', 882, 1185)

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

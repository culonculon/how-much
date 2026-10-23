// Values: contracts/appraise.md §6. Flow: CAREER-26 plan '보내는 흐름', ADR-0003.
export const MAX_EDGE_PX = 1024
export const MAX_PHOTO_BYTES = 1_000_000
export const TARGET_PHOTO_BYTES = 250_000
export const JPEG_QUALITIES = [0.85, 0.7, 0.55]

export function fitWithin(width, height, maxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

const toBlob = (canvas, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))

// Redraws on a canvas: bakes in EXIF orientation, drops all metadata. Rejects when the photo can't be used.
export async function preparePhoto(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_EDGE_PX)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let blob = null
  for (const q of JPEG_QUALITIES) {
    blob = await toBlob(canvas, q)
    if (!blob || blob.size <= TARGET_PHOTO_BYTES) break
  }
  if (!blob || blob.size > MAX_PHOTO_BYTES) throw new Error('photo too large or unreadable')
  return blob
}

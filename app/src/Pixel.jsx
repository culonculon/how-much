import { memo } from 'react'
import { I, PI, PU, U } from './pixels.js'

// One <path> per colour; a run of same-colour cells in a row is one piece ("M{x} {y}h{n}v1h-{n}z"), like mockup-v3 Scene,
// so there are no hairlines between cells (plan A2 '아저씨').
function drawn(map, palette) {
  const byColor = {}
  map.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const color = row[x] !== '.' && palette[row[x]]
      let n = 1
      while (x + n < row.length && row[x + n] !== '.' && palette[row[x + n]] === color) n++
      if (color) (byColor[color] ??= []).push(`M${x} ${y}h${n}v1h-${n}z`)
      x += n
    }
  })
  return Object.entries(byColor).map(([fill, d]) => <path key={fill} fill={fill} d={d.join('')} />)
}

export const Uncle = memo(function Uncle({ face }) {
  return (
    <svg className="px uncle" data-testid="uncle" data-face={face} viewBox="0 0 40 40" shapeRendering="crispEdges" aria-hidden="true">
      {drawn(U[face], PU)}
    </svg>
  )
})

export const Item = memo(function Item({ item }) {
  return (
    <svg className="px item" data-testid="shop-item" data-item={item} viewBox={`0 0 12 ${I[item].length}`} shapeRendering="crispEdges" aria-hidden="true">
      {drawn(I[item], PI[item])}
    </svg>
  )
})

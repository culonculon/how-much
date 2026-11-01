import { memo } from 'react'
import { I, PI, PU, U } from './pixels.js'

// One <path> per colour ("M{x} {y}h1v1h-1z" per cell) keeps a face to ~20 elements instead of ~1000 (plan A2).
function drawn(map, palette) {
  const byColor = {}
  map.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c !== '.' && palette[c]) (byColor[palette[c]] ??= []).push(`M${x} ${y}h1v1h-1z`)
    }),
  )
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

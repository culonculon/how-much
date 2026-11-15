import { memo, useMemo } from 'react'
import { Uncle } from './Pixel.jsx'
import { truckLayers } from './truck.js'

// The truck pawnshop, a 390x300 board of 3px cells (mockup-v3 Scene). Tall scenes (arrive, think) show all of it; the others
// show the 180px strip at 66..246 (awning, counter, uncle, caption). Modes: arrive | idle | think | leave (leave = night, no uncle).
const Z = 3
const Cells = ({ list }) =>
  list.map(([x, y, w, h, color], i) => <div key={i} className="c" style={{ left: x * Z, top: y * Z, width: w * Z, height: h * Z, background: color }} />)

// the mockup's eyelid cover fits the base and happy eyes only
const BLINKS = ['base', 'happy']

const Board = memo(function Board({ face, mode }) {
  const night = mode === 'leave'
  const { rects, bg, front, loud, scaleFrom } = useMemo(() => truckLayers(night), [night])
  return (
    <div className="board" data-testid="truck-board" aria-hidden="true">
      <Cells list={bg} />
      {night && (
        <div className="post" data-testid="post-sign">
          <div className="pole" />
          <div className="plank" />
          <div className="post-text">
            <span data-testid="closed-sign">오늘 영업 끝</span>
            <span>내일 또 와요</span>
          </div>
        </div>
      )}
      <div className="truck" data-testid="truck" data-truck={night ? 'gone' : 'here'}>
        {night && (
          <div className="smoke" data-testid="smoke">
            <div className="puff" />
          </div>
        )}
        <Cells list={rects.slice(0, loud[0])} />
        <div className="layer" data-testid={night ? undefined : 'truck-loudspeaker'}>
          <Cells list={rects.slice(loud[0], loud[1])} />
        </div>
        <Cells list={rects.slice(loud[1])} />
        {face && (
          <div className="uncle-box">
            <Uncle face={face} />
            {BLINKS.includes(face) && (
              <div className="eyes">
                <i style={{ left: 36 }} />
                <i style={{ left: 75 }} />
              </div>
            )}
          </div>
        )}
        <div className="shutter" data-testid="shutter" data-shutter={night ? 'down' : 'up'}>
          {night && <div className="shutter-sign">{'오늘 영업 끝\n다른 동네로 떠나요'}</div>}
        </div>
        <div className="layer" data-testid="shop-counter">
          <Cells list={front.slice(0, scaleFrom)} />
        </div>
        {!night && (
          <div className="layer" data-testid="truck-scale">
            <Cells list={front.slice(scaleFrom)} />
            <div className="pan">
              <i />
              <i />
            </div>
          </div>
        )}
        {!night && mode !== 'think' && (
          <div className="mag small" data-testid="magnifier" data-size="small">
            <i />
            <i />
            <i />
            <i />
          </div>
        )}
        {mode === 'think' && (
          <div className="mag big" data-testid="magnifier" data-size="big">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        )}
        {mode === 'arrive' && (
          <div className="bubble">
            <i />
            <i />
            <i />
            <div className="pt">{'물건 감정해요~\n추억도 쳐 드려요~'}</div>
          </div>
        )}
        <div className="pt sign-text">이동식 전당포</div>
        <div className="pt caption">고물 · 추억 · 잡동사니 감정</div>
      </div>
    </div>
  )
})

export default function Shop({ face, mode, children }) {
  return (
    <div className={`scene${mode === 'arrive' || mode === 'think' ? ' tall' : ''}${mode === 'leave' ? ' night' : ''}`} data-testid="shop-scene" data-shop="truck" data-scene={mode === 'leave' ? 'night' : 'day'} data-mode={mode}>
      {children}
      <Board face={face} mode={mode} />
    </div>
  )
}

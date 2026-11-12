import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { appraise } from './appraise.js'
import { useCountUp } from './countUp.js'
import Shop from './Shop.jsx'
import ShareRow from './ShareRow.jsx'
import {
  BAD_FILE_TEXT, BUSY_TEXT, ERROR_TEXT, FAIL_BUTTONS, HANJEONG, MY_PRICE, NOTICE_DOOR, NOTICE_THINKING, OFF_DUTY_TEXT, PRICE_TEXT,
  REGION_NOTICE, STEPS, TAG_GROUPS, THINKING_LINE, compareLine, priceIdOf, readOf, shownOf,
} from './options.js'

const ALL_TAG_IDS = TAG_GROUPS.flatMap((g) => g.tags.map((t) => t.id))
const DEPTH = { door: 0, photo: 1, tags: 2, price: 3, thinking: 4, result: 4 }
const PREV = { door: 'door', photo: 'door', tags: 'photo', price: 'tags', thinking: 'price', result: 'price' }
const entryOf = (state) => (Number.isInteger(state?.howMuch) ? state.howMuch : 0) // old tabs hold { howMuch: 'out' }
function faceOf(view, status, error) {
  if (view === 'door') return 'happy'
  if (view === 'thinking') return 'think'
  if (view !== 'result') return 'base'
  if (status === 'done') return 'happy'
  if (status === 'off') return null // no uncle: dark shop
  return { refused: 'frown', person_limit: 'sleepy' }[error] ?? 'sweat'
}
const glyph = (c) => <span aria-hidden="true">{c}</span>

// plan A5. ASCII digits only: '１２' (full width), '-5', '3.5', ' 23' are not numbers. The text is never rewritten.
const DIGITS = /^[0-9]+$/
const NO_MINE = { text: '', never: false, quick: null }
const numberOf = ({ text, never }) => {
  if (never || !DIGITS.test(text)) return undefined
  const n = Number(text)
  return n >= MY_PRICE.min && n <= MY_PRICE.max ? n : undefined
}

function Chip({ on, onClick, children }) {
  return (
    <button type="button" className="chip" aria-pressed={on} onClick={onClick}>
      <span className="chip-mark" aria-hidden="true" />
      {children}
    </button>
  )
}

const Hanjeong = ({ cell }) => (
  <svg className="px" width={12 * cell} height={10 * cell} viewBox="0 0 12 10" shapeRendering="crispEdges" aria-hidden="true">
    {HANJEONG.map(([fill, d]) => <path key={fill} fill={fill} d={d} />)}
  </svg>
)

// A drawn price: the picture is seen, the words are read.
// The seen number counts up (aria-hidden); the read words are the end value from the start.
function Price({ n, shownId, readId }) {
  const ref = useRef(null)
  const counted = useCountUp(ref, n)
  return (
    <p className="price">
      <Hanjeong cell={4} />
      <span ref={ref} aria-hidden="true" data-testid={shownId}>{shownOf(counted)}</span>
      <span className="sr-only" data-testid={readId}>{readOf(n)}</span>
    </p>
  )
}

export default function App() {
  const [view, setView] = useState('door') // door | photo | tags | price | thinking | result
  const [photo, setPhoto] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [fileError, setFileError] = useState(false)
  const [mine, setMine] = useState(NO_MINE) // { text, never, quick }: what the price field shows
  const [tags, setTags] = useState([])
  const [status, setStatus] = useState('idle') // idle | done | off
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const reqRef = useRef(0)
  const stepRef = useRef(null)
  const mascotRef = useRef(null)
  const cardRef = useRef(null)
  const errorRef = useRef(null)
  const submitRef = useRef(null)
  const busyRef = useRef(null)
  const refocusSubmit = useRef(false)
  const entryRef = useRef(0)

  // Call only from click handlers: pushState needs user activation (ADR-0009).
  function advance(next) {
    if (DEPTH[next] > entryRef.current) {
      entryRef.current = DEPTH[next]
      history.pushState({ howMuch: DEPTH[next] }, '')
    }
    setView(next)
  }

  useEffect(() => {
    entryRef.current = entryOf(history.state)
    const onPop = (e) => {
      const entry = entryOf(e.state)
      const back = entry < entryRef.current
      entryRef.current = entry
      if (!back) return
      reqRef.current++
      setView((v) => PREV[v])
      setStatus((s) => (s === 'off' ? 'off' : 'idle'))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Free the blob URL when it is replaced or the component goes away.
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl])

  function pickFile(e) {
    const file = e.target.files[0]
    setError(null)
    const ok = file && ['image/jpeg', 'image/png'].includes(file.type)
    setFileError(Boolean(file) && !ok)
    setPhoto(ok ? file : null)
    setPreviewUrl(ok ? URL.createObjectURL(file) : null)
  }

  function toggleTag(id) {
    setTags((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]))
  }

  async function submit() {
    const id = ++reqRef.current
    setError(null)
    setStatus((s) => (s === 'off' ? 'idle' : s))
    advance('thinking')
    setBusy(true)
    const sent = mine.never ? null : numberOf(mine) // what is sent and drawn; null = never
    try {
      const r = await appraise({ photo, myPrice: priceIdOf(sent), tags: ALL_TAG_IDS.filter((t) => tags.includes(t)) })
      if (id !== reqRef.current) return
      setResult({ ...r, mine: sent })
      setStatus('done')
      setView('result')
    } catch (e) {
      if (id !== reqRef.current) return
      if (e.code === 'daily_limit') {
        setStatus('off')
        setView('result')
      } else if (e.code === 'invalid_input') {
        setError('invalid_input')
        setStatus('idle')
        setView('photo')
      } else {
        setError(e.code in ERROR_TEXT ? e.code : 'unavailable')
        setStatus('idle')
        setView('result')
      }
    } finally {
      refocusSubmit.current = document.activeElement === busyRef.current // note disappears with busy; keep focus on the button
      setBusy(false)
    }
  }

  // "Another item": forget everything and start again at the photo.
  function another() {
    setPhoto(null)
    setPreviewUrl(null)
    setFileError(false)
    setMine(NO_MINE)
    setTags([])
    setResult(null)
    setError(null)
    setStatus('idle')
    setView('photo')
  }

  function failureButton() {
    const code = status === 'off' ? 'daily_limit' : error
    const b = FAIL_BUTTONS[code]
    if (!b) return null
    return (
      <>
        <button type="button" className={b.fade ? 'btn fade' : 'btn'} onClick={() => { setStatus((s) => (s === 'off' ? 'off' : 'idle')); setView(code === 'refused' ? 'photo' : 'price') }}>
          {b.mark && glyph(b.mark)} {b.text}
        </button>
        {b.note && <p className="note">{b.note}</p>}
      </>
    )
  }

  // Move focus and scroll only when the view changes (not on first render or StrictMode re-run).
  const prevView = useRef(view)
  useLayoutEffect(() => {
    const from = prevView.current
    if (from === view) return
    prevView.current = view
    document.documentElement.scrollTop = 0 // jsdom has no window.scrollTo
    const fromEnd = from === 'thinking' || from === 'result'
    let target = stepRef.current
    if (view === 'thinking') target = mascotRef.current
    else if (view === 'result') target = cardRef.current ?? errorRef.current ?? mascotRef.current
    else if (view === 'photo' && from === 'thinking') target = errorRef.current ?? stepRef.current
    else if (view === 'price' && fromEnd) target = submitRef.current && !submitRef.current.disabled ? submitRef.current : (busyRef.current ?? stepRef.current)
    target?.focus({ preventScroll: true })
  }, [view])

  useLayoutEffect(() => {
    if (!busy && refocusSubmit.current) submitRef.current?.focus({ preventScroll: true })
    refocusSubmit.current = false
  }, [busy])

  const step = STEPS[view]
  const n = numberOf(mine)
  const ready = mine.never || n !== undefined
  const isOff = status === 'off'
  const sceneMode = view === 'door' ? 'arrive' : view === 'thinking' ? 'think' : view === 'result' && isOff ? 'leave' : 'idle'
  const offNote = isOff && <p data-testid="off-duty">{OFF_DUTY_TEXT}</p>
  const errorNote = error && (view === 'photo' || view === 'price') && (
    <div className="toast">
      {glyph('⚠')} <p role="alert" data-testid="appraise-error" tabIndex={-1} ref={errorRef}>{ERROR_TEXT[error]}</p>
    </div>
  )
  const showCard = view === 'result' && status === 'done'
  const showFailure = view === 'result' && !showCard
  // The status box is always there (live regions must exist before they speak); it looks like a window only when it has words.
  const statusBox = (
    <div role="status" aria-label="감정사 아저씨" tabIndex={-1} ref={mascotRef} className={view === 'thinking' || isOff ? 'win' : undefined}>
      {view === 'thinking' && <>{THINKING_LINE}<span aria-hidden="true" className="dots">…</span></>}
      {offNote}
    </div>
  )

  return (
    <main className="shop">
      <Shop face={faceOf(view, status, error)} mode={sceneMode}>
        <h1 className="sr-only">how-much</h1>
      </Shop>
      <div className="body">
        {step && (
          <div role="group" aria-label={step.label} aria-describedby="step-line" tabIndex={-1} ref={stepRef} className={view === 'door' ? 'win center' : 'win'}>
            {view !== 'door' && <span className="who">감정사<br /></span>}
            {view === 'door' && <><span className="who">{step.kicker}</span><span className="title">{step.title}</span></>}
            <span id="step-line">{step.line}</span>
            {view !== 'door' && glyph('▼')}
          </div>
        )}
        {statusBox}
        {showCard && (
          <section aria-label="감정 결과" tabIndex={-1} ref={cardRef}>
            <div role="group" aria-label="값 공개" className="reveal">
            <div className="win">
              <span className="who">감정사<br /></span>
              <span data-testid="mascot-line">{result.line}</span>
              {glyph('▼')}
            </div>
            <div className="win value">
              <p className="cap">아저씨 감정가</p>
              <Price n={result.mochi} shownId="appraised-shown" readId="appraised-price" />
              <p className="cap dash">
                내가 부른 값{' '}
                <span className="mine">
                  <span aria-hidden="true" data-testid="my-shown">{shownOf(result.mine)}</span>
                  <span className="sr-only" data-testid="my-price">{readOf(result.mine)}</span>
                </span>
              </p>
              <CompareLine mine={result.mine} mochi={result.mochi} />
              <span className="stamp" data-testid="stamp" aria-hidden="true">감정<br />필</span>
              <span className="spark s1" aria-hidden="true" />
              <span className="spark s2" aria-hidden="true" />
              <span className="spark s3" aria-hidden="true" />
            </div>
            </div>
          </section>
        )}
        {showFailure && (
          <>
            {!isOff && (
              <div className="win">
                <span className="who">감정사<br /></span>
                <p role="alert" data-testid="appraise-error" tabIndex={-1} ref={errorRef}>{ERROR_TEXT[error]}</p>
                {glyph('▼')}
              </div>
            )}
            {failureButton()}
          </>
        )}
        {showCard && (
          <ShareRow photo={photo} mine={result.mine}>
            <button type="button" className="btn" onClick={another}>다른 물건 꺼내기</button>
          </ShareRow>
        )}

        {view === 'door' && (
          <button type="button" className="btn" onClick={() => advance('photo')}>
            {glyph('▶︎')} 가게에 들어가기{glyph('_')}
          </button>
        )}
        {view === 'door' && (
          <>
            <p className="tags">{['맡기면 값부터', '고물도 OK', '전당표 공유'].map((t) => <span key={t}>{t}</span>)}</p>
            <p className="note pre">{NOTICE_DOOR}</p>
          </>
        )}

        {view === 'photo' && (
          <>
            <label className="win drop">
              <input type="file" aria-label="사진 고르기" accept="image/png,image/jpeg" onChange={pickFile} />
              {previewUrl ? <img src={previewUrl} alt="고른 사진 미리보기" /> : glyph('[ 📷 사진 꺼내기 ]')}
            </label>
            {fileError && <p role="alert" className="toast">{BAD_FILE_TEXT}</p>}
            {errorNote}
            <button type="button" className="btn" disabled={!photo} onClick={() => advance('tags')}>
              다음 {glyph('▶︎')}
            </button>
          </>
        )}

        {view === 'tags' && (
          <>
            <div role="group" aria-label="사연 태그">
              {TAG_GROUPS.map((g) => (
                <div key={g.id} role="group" aria-label={g.title}>
                  <h2 className="sec">{g.title}</h2>
                  <div className="chips">
                    {g.tags.map((t) => (
                      <Chip key={t.id} on={tags.includes(t.id)} onClick={() => toggleTag(t.id)}>{t.name}</Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn" onClick={() => advance('price')}>
              다음 {glyph('▶︎')}
            </button>
          </>
        )}

        {view === 'price' && (
          <>
            <div role="group" aria-label="마음 가격" className="price-box">
              <label htmlFor="my-price-input">{PRICE_TEXT.label}</label>
              <div className="price-row">
                <button type="button" className="sq" aria-label="한 개 빼기" disabled={n === undefined || n <= MY_PRICE.min} onClick={() => setMine({ text: String(n - 1), never: false, quick: null })}>
                  {glyph('−')}
                </button>
                <span className="price-field" style={mine.never ? { opacity: 0.45 } : undefined}>
                  <Hanjeong cell={3} />
                  {/* the user's text stays in this one field: not in a form, no name, never copied elsewhere (K7) */}
                  <input
                    id="my-price-input" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" enterKeyHint="done"
                    value={mine.text} aria-invalid={!ready || undefined} aria-describedby={ready ? undefined : 'price-hint'}
                    onChange={(e) => setMine({ text: e.target.value, never: false, quick: null })}
                  />
                  {glyph('개')}
                </span>
                <button type="button" className="sq" aria-label="한 개 더하기" disabled={n === MY_PRICE.max || (mine.text !== '' && n === undefined)} onClick={() => setMine({ text: String((n ?? 0) + 1), never: false, quick: null })}>
                  {glyph('+')}
                </button>
              </div>
              {!ready && <p id="price-hint" className="note">{mine.text === '' ? PRICE_TEXT.empty : PRICE_TEXT.bad}</p>}
              <div className="chips">
                {MY_PRICE.quick.map((q) => (
                  <Chip key={q} on={mine.quick === q} onClick={() => setMine({ text: String(q), never: false, quick: q })}>{q}개</Chip>
                ))}
                <Chip on={mine.never} onClick={() => setMine({ text: '', never: true, quick: null })}>안 팔아</Chip>
              </div>
            </div>
            {errorNote}
            <p id="region-notice" className="note">{REGION_NOTICE}</p>
            <button type="button" className="btn" ref={submitRef} aria-describedby={busy ? 'region-notice busy-note' : 'region-notice'} disabled={!photo || !ready || busy} onClick={submit}>
              감정 받기!
            </button>
            {busy && <p id="busy-note" className="toast" ref={busyRef} tabIndex={-1}>{BUSY_TEXT}</p>}
          </>
        )}

        {view === 'thinking' && (
          <>
            <div className="win bar-box">
              <div role="progressbar" aria-label="감정 중" className="bar" />
            </div>
            <p className="note pre">{NOTICE_THINKING}</p>
          </>
        )}
      </div>
    </main>
  )
}

function CompareLine({ mine, mochi }) {
  const { mark, text } = compareLine(mine, mochi)
  return (
    <p className="compare" data-testid="compare-line">
      {mark && glyph(mark)}
      {mark && ' '}
      {text}
    </p>
  )
}

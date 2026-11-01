import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { appraise } from './appraise.js'
import Shop from './Shop.jsx'
import ShareRow from './ShareRow.jsx'
import {
  BAD_FILE_TEXT, BUSY_TEXT, ERROR_TEXT, FAIL_BUTTONS, OFF_DUTY_TEXT, PRICES, REGION_NOTICE, STEPS, TAG_GROUPS, THINKING_LINE,
  compareLine,
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

function Chip({ on, onClick, children }) {
  return (
    <button type="button" className="chip" aria-pressed={on} onClick={onClick}>
      <span className="chip-mark" aria-hidden="true" />
      {children}
    </button>
  )
}

// A drawn price: the symbol is seen, the words are read.
function Price({ shown, read, shownId, readId }) {
  return (
    <p className="price">
      <span aria-hidden="true" data-testid={shownId}>{shown}</span>
      <span className="sr-only" data-testid={readId}>{read}</span>
    </p>
  )
}

export default function App() {
  const [view, setView] = useState('door') // door | photo | tags | price | thinking | result
  const [photo, setPhoto] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [fileError, setFileError] = useState(false)
  const [myPrice, setMyPrice] = useState(null)
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
    try {
      const r = await appraise({ photo, myPrice, tags: ALL_TAG_IDS.filter((t) => tags.includes(t)) })
      if (id !== reqRef.current) return
      setResult(r)
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
    setMyPrice(null)
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
  const mine = PRICES.find((p) => p.id === myPrice)
  const isOff = status === 'off'
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
      {view === 'thinking' && <>{THINKING_LINE}{glyph('…')}</>}
      {offNote}
    </div>
  )

  return (
    <main className="shop">
      <Shop face={faceOf(view, status, error)} night={view === 'result' && status === 'off'} big={view === 'door' || view === 'thinking'}>
        <h1 className={view === 'door' ? 'sign' : 'sr-only'}>how-much</h1>
      </Shop>
      <div className="body">
        {step && (
          <div role="group" aria-label={step.label} aria-describedby="step-line" tabIndex={-1} ref={stepRef} className={view === 'door' ? 'win center' : 'win'}>
            {view !== 'door' && <span className="who">감정사<br /></span>}
            <span id="step-line">{step.line}</span>
            {view !== 'door' && glyph('▼')}
          </div>
        )}
        {statusBox}
        {showCard && (
          <section aria-label="감정 결과" tabIndex={-1} ref={cardRef}>
            <div role="group" aria-label="값 공개" className="win">
              <span className="who">감정사<br /></span>
              <span data-testid="mascot-line">{result.line}</span>
              {glyph('▼')}
            </div>
            <div className="win value">
              <p className="cap">아저씨 감정가</p>
              <Price shown={`🍡 × ${result.mochi}`} read={`모찌 ${result.mochi}개`} shownId="appraised-shown" readId="appraised-price" />
              <p className="cap">
                내가 부른 값{' '}
                <span className="mine">
                  <span aria-hidden="true" data-testid="my-shown">{mine.mochi == null ? '안 팔아' : `🍡 × ${mine.mochi}`}</span>
                  <span className="sr-only" data-testid="my-price">{mine.card}</span>
                </span>
              </p>
              <CompareLine mine={mine.mochi} mochi={result.mochi} />
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
          <ShareRow photo={photo} myPrice={myPrice}>
            <button type="button" className="btn" onClick={another}>다른 물건 꺼내기</button>
          </ShareRow>
        )}

        {view === 'door' && (
          <button type="button" className="btn" onClick={() => advance('photo')}>
            {glyph('▶︎')} 가게에 들어가기{glyph('_')}
          </button>
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
            <div role="group" aria-label="마음 가격" className="chips">
              {PRICES.map((p) => (
                <Chip key={p.id} on={myPrice === p.id} onClick={() => setMyPrice(p.id)}>{p.button}</Chip>
              ))}
            </div>
            {errorNote}
            <p id="region-notice" className="note">{REGION_NOTICE}</p>
            <button type="button" className="btn" ref={submitRef} aria-describedby={busy ? 'region-notice busy-note' : 'region-notice'} disabled={!photo || !myPrice || busy} onClick={submit}>
              감정 받기!
            </button>
            {busy && <p id="busy-note" className="toast" ref={busyRef} tabIndex={-1}>{BUSY_TEXT}</p>}
          </>
        )}

        {view === 'thinking' && (
          <div className="win bar-box">
            <div role="progressbar" aria-label="감정 중" className="bar" />
          </div>
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

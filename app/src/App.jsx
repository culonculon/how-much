import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { appraise } from './appraise.js'
import { BUSY_TEXT, ERROR_TEXT, OFF_DUTY_TEXT, PRICES, REGION_NOTICE, TAG_GROUPS } from './options.js'

const ALL_TAG_IDS = TAG_GROUPS.flatMap((g) => g.tags.map((t) => t.id))
const MASCOT = { idle: '대기', thinking: '🔍 갸웃', done: '🔨 도장', off: '🚶 퇴근' }

const pressed = (on) => ({
  padding: '6px 12px',
  margin: 4,
  cursor: 'pointer',
  border: on ? '3px solid #000' : '1px solid #999',
  background: on ? '#ffe28a' : '#fff',
  fontWeight: on ? 'bold' : 'normal',
})

export default function App() {
  const [photo, setPhoto] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [fileError, setFileError] = useState(false)
  const [myPrice, setMyPrice] = useState(null)
  const [tags, setTags] = useState([])
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [screen, setScreen] = useState('input') // 'input' | 'thinking' | 'result'
  const [busy, setBusy] = useState(false)
  const reqRef = useRef(0)
  const mascotRef = useRef(null)
  const cardRef = useRef(null)
  const errorRef = useRef(null)
  const submitRef = useRef(null)
  const busyRef = useRef(null)
  const refocusSubmit = useRef(false)

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

  const toInput = () => {
    setScreen('input')
    setStatus((s) => (s === 'off' ? 'off' : 'idle'))
  }

  async function submit() {
    if (history.state?.howMuch !== 'out') history.pushState({ howMuch: 'out' }, '') // before await: needs user activation
    const id = ++reqRef.current
    setError(null)
    setStatus('thinking')
    setScreen('thinking')
    setBusy(true)
    try {
      const r = await appraise({ photo, myPrice, tags: ALL_TAG_IDS.filter((t) => tags.includes(t)) })
      if (id !== reqRef.current) return
      setResult(r)
      setStatus('done')
    } catch (e) {
      if (id !== reqRef.current) return
      if (e.code === 'daily_limit') {
        setStatus('off')
      } else {
        setError(e.code in ERROR_TEXT ? e.code : 'unavailable')
        setStatus('idle')
      }
    } finally {
      refocusSubmit.current = document.activeElement === busyRef.current // note disappears with busy; keep focus on the button
      setBusy(false)
    }
    if (id === reqRef.current) setScreen('result')
  }

  useEffect(() => {
    const onPop = () => {
      reqRef.current++
      toInput()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Move focus and scroll only when the screen changes (not on first render or StrictMode re-run).
  const prevScreen = useRef(screen)
  useLayoutEffect(() => {
    if (prevScreen.current === screen) return
    prevScreen.current = screen
    document.documentElement.scrollTop = 0 // jsdom has no window.scrollTo
    const target =
      screen === 'thinking'
        ? mascotRef.current
        : screen === 'result'
          ? (cardRef.current ?? errorRef.current ?? mascotRef.current)
          : submitRef.current && !submitRef.current.disabled
            ? submitRef.current
            : busyRef.current
    target?.focus({ preventScroll: true })
  }, [screen])

  useLayoutEffect(() => {
    if (!busy && refocusSubmit.current) submitRef.current?.focus({ preventScroll: true })
    refocusSubmit.current = false
  }, [busy])

  return (
    <main>
      <h1>how-much</h1>
      <div role="status" aria-label="감정사 아저씨" tabIndex={-1} ref={mascotRef}>{MASCOT[status]}{status === 'off' && <p data-testid="off-duty">{OFF_DUTY_TEXT}</p>}</div>

      {screen === 'input' && (
        <>
          <label>
            사진 고르기 <input type="file" accept="image/png,image/jpeg" onChange={pickFile} />
          </label>
          {fileError && <p role="alert">사진을 다시 골라 주세요 (jpg·png)</p>}
          {error && <p role="alert" data-testid="appraise-error">{ERROR_TEXT[error]}</p>}
          {previewUrl && <img src={previewUrl} alt="고른 사진 미리보기" style={{ display: 'block', maxWidth: 240 }} />}

          <div role="group" aria-label="마음 가격">
            {PRICES.map((p) => (
              <button key={p.id} type="button" aria-pressed={myPrice === p.id} style={pressed(myPrice === p.id)} onClick={() => setMyPrice(p.id)}>
                {p.button}
              </button>
            ))}
          </div>

          <div role="group" aria-label="사연 태그">
            {TAG_GROUPS.map((g) => (
              <div key={g.id} role="group" aria-label={g.title}>
                <h2>{g.title}</h2>
                {g.tags.map((t) => (
                  <button key={t.id} type="button" aria-pressed={tags.includes(t.id)} style={pressed(tags.includes(t.id))} onClick={() => toggleTag(t.id)}>
                    {t.name}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <p id="region-notice">{REGION_NOTICE}</p>
          <button type="button" ref={submitRef} aria-describedby={busy ? 'region-notice busy-note' : 'region-notice'} disabled={!photo || !myPrice || busy} onClick={submit}>
            감정 받기
          </button>
          {busy && <p id="busy-note" ref={busyRef} tabIndex={-1}>{BUSY_TEXT}</p>}
        </>
      )}

      {screen === 'result' && (
        <>
          {status === 'done' && (
            <section aria-label="감정 결과" tabIndex={-1} ref={cardRef}>
              <p data-testid="appraised-price">모찌 {result.mochi}개</p>
              <p data-testid="my-price">{PRICES.find((p) => p.id === myPrice).card}</p>
              <p data-testid="mascot-line">{result.line}</p>
            </section>
          )}
          {error && <p role="alert" data-testid="appraise-error" tabIndex={-1} ref={errorRef}>{ERROR_TEXT[error]}</p>}
          <button type="button" onClick={toInput}>다시 감정</button>
        </>
      )}
    </main>
  )
}

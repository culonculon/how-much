import { useEffect, useState } from 'react'
import { appraise } from './appraise.js'
import { ERROR_TEXT, PRICES, REGION_NOTICE, TAG_GROUPS } from './options.js'

const ALL_TAG_IDS = TAG_GROUPS.flatMap((g) => g.tags.map((t) => t.id))
const MASCOT = { idle: '대기', thinking: '🔍 갸웃', done: '🔨 도장' }

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
    setError(null)
    setStatus('thinking')
    try {
      setResult(await appraise({ photo, myPrice, tags: ALL_TAG_IDS.filter((id) => tags.includes(id)) }))
      setStatus('done')
    } catch (e) {
      setError(e.code in ERROR_TEXT ? e.code : 'unavailable')
      setStatus('idle')
    }
  }

  return (
    <main>
      <h1>how-much</h1>
      <div role="status" aria-label="감정사 아저씨">{MASCOT[status]}</div>

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
      <button type="button" aria-describedby="region-notice" disabled={!photo || !myPrice || status !== 'idle'} onClick={submit}>
        감정 받기
      </button>

      {status === 'done' && (
        <section aria-label="감정 결과">
          <p data-testid="appraised-price">모찌 {result.mochi}개</p>
          <p data-testid="my-price">{PRICES.find((p) => p.id === myPrice).card}</p>
          <p data-testid="mascot-line">{result.line}</p>
        </section>
      )}
    </main>
  )
}

import { useEffect, useRef, useState } from 'react'
import { SHARE_TEXT } from './options.js'
import { makeCard, saveCard } from './shareCard.js'

// Mounted only on the reveal, so leaving it forgets the card (AC-4).
export default function ShareRow({ photo, myPrice, children }) {
  const [card, setCard] = useState(null) // null = drawing | File | 'failed'
  const [saving, setSaving] = useState(false) // true: the button saves instead of sharing
  const [note, setNote] = useState(null)
  const sheetOpen = useRef(false)
  const savedAt = useRef(0)

  useEffect(() => {
    let alive = true
    makeCard(photo, myPrice).then(
      (file) => alive && setCard(file),
      (e) => {
        console.warn('card not drawn:', e?.name) // the name only, never the photo (contracts §6)
        if (alive) setCard('failed')
      },
    )
    return () => { alive = false }
  }, [photo, myPrice])

  // No await before share: it must run inside the click (Safari may refuse otherwise).
  function press() {
    if (sheetOpen.current) return
    if (card === 'failed') return setNote(SHARE_TEXT.notDrawn)
    // Same object for canShare and share; url comes from location, like the card's address text.
    const data = { files: [card], url: location.origin + '/' }
    if (saving || !navigator.share || !navigator.canShare?.(data)) {
      if (Date.now() - savedAt.current < 600) return // double press: one download; a later press saves again
      savedAt.current = Date.now()
      saveCard(card)
      setSaving(true)
      setNote(null)
      return
    }
    sheetOpen.current = true
    navigator.share(data)
      .catch((e) => {
        if (e.name === 'AbortError') return // cancelled is not a failure
        setSaving(true) // the click has ended: a second press downloads
        setNote(SHARE_TEXT.useSave)
      })
      .finally(() => { sheetOpen.current = false })
  }

  return (
    <>
      <div className="btn-row">
        <button type="button" className="btn" data-testid="share-button" disabled={card === null} onClick={press}>
          {saving ? '저장' : '공유'}
        </button>
        {children}
      </div>
      {note && (
        <div className="toast">
          <span aria-hidden="true">⚠</span> <p role="alert" data-testid="share-note">{note}</p>
        </div>
      )}
    </>
  )
}

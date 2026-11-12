import { useEffect, useState } from 'react'

// plan A2 D: the reveal number counts up in 12 steps over 0.6s. It rides a Web Animation (id 'hm-count') on the element, so
// getAnimations() sees it (AC-6) and the end value comes from one place. No motion support or 'reduce': the end value at once.
const motion = () =>
  typeof window.matchMedia === 'function' && typeof Element.prototype.animate === 'function' && window.matchMedia('(prefers-reduced-motion: no-preference)').matches

export function useCountUp(ref, target) {
  const [shown, setShown] = useState(() => (motion() ? 0 : target))
  useEffect(() => {
    const el = ref.current
    if (!el || !motion()) return
    const a = el.animate([{ opacity: 1 }, { opacity: 1 }], { id: 'hm-count', duration: 600, easing: 'steps(12, end)' })
    let frame
    const tick = () => {
      setShown(Math.floor(target * (a.effect.getComputedTiming().progress ?? 1)))
      frame = requestAnimationFrame(tick)
    }
    tick()
    a.finished.then(() => setShown(target), () => {}) // cancelled: the cleanup below owns it
    return () => {
      cancelAnimationFrame(frame)
      a.cancel()
    }
  }, [ref, target])
  return shown
}

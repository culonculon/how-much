// Contracts: contracts/appraise.md §4~§6, appraise-http.md §2·§5. The only place that talks to the network.
import { preparePhoto } from './photo.js'

const CODES = ['invalid_input', 'refused', 'unavailable', 'daily_limit', 'person_limit']
const fail = (code) => Object.assign(new Error(code), { code })

export async function appraise({ photo, myPrice, tags }) {
  let body
  try {
    body = await preparePhoto(photo)
  } catch {
    throw fail('invalid_input')
  }
  const query = new URLSearchParams([['myPrice', myPrice], ...tags.map((t) => ['tags', t])])
  let res
  try {
    res = await fetch(`/api/appraise?${query}`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body })
  } catch {
    throw fail('unavailable')
  }
  let data = null
  try {
    data = await res.json()
  } catch {
    // not JSON -> unavailable below
  }
  const ok =
    res.ok &&
    data &&
    Object.keys(data).length === 2 &&
    Number.isInteger(data.mochi) &&
    data.mochi >= 0 &&
    typeof data.line === 'string' &&
    data.line.trim() !== ''
  if (ok) return { mochi: data.mochi, line: data.line }
  throw fail(CODES.includes(data?.code) ? data.code : 'unavailable')
}

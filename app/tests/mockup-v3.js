// CAREER-40 T1: 시안 v3(`*.dc.html`)의 코드를 읽는 돕는 함수 (plan A2 '시안 코드 읽기'). expect는 넣지 않는다.
// 못 찾거나 모르는 글자가 있으면 던진다 — 빈 값으로 통과하지 않는다.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const DIR = '../specs/CAREER-40-pawnshop-concept/mockup-v3'

export function renderMockup(file, props = {}) {
  const html = readFileSync(resolve(cwd(), DIR, `${file}.dc.html`), 'utf8')
  const m = html.match(/<script type="text\/x-dc" data-dc-script[^>]*>([\s\S]*?)<\/script>/)
  if (!m) throw new Error(`mockup-v3: ${file}에서 data-dc-script를 찾지 못했다`)
  const Base = class {
    constructor(p) {
      this.props = p
      this.state = {}
    }
    setState() {}
  }
  const Component = new Function('DCLogic', `${m[1]}\nreturn Component`)(Base)
  return new Component(props).renderVals()
}

// 시안 st 글자 → 3으로 나눈 칸 [x, y, w, h, 색]
const ST = /^left:(\d+)px;top:(\d+)px;width:(\d+)px;height:(\d+)px;background:(#[0-9a-f]{6})$/
export const cellsOfSt = (list) =>
  list.map(({ st }) => {
    const m = st.match(ST)
    if (!m) throw new Error(`mockup-v3: 풀 수 없는 st 글자: ${st}`)
    const [x, y, w, h] = m.slice(1, 5).map((v) => {
      if (Number(v) % 3 !== 0) throw new Error(`mockup-v3: 3의 배수가 아닌 값 ${v} (${st})`)
      return Number(v) / 3
    })
    return [x, y, w, h, m[5]]
  })

// renderVals().u 에서 색 열쇠별 d (빈 색 'M0 0'은 뺀다)
export const pathsOf = (u) => Object.fromEntries(Object.entries(u).filter(([, d]) => d !== 'M0 0'))

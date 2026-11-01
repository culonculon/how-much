// CAREER-35 T2: 6단계 e2e가 같이 쓰는 돕는 함수. expect는 넣지 않는다(T11 expect 수 비교가 흐려짐).
// 화면을 못 찾으면 5초 안에 `waitFor`가 던진다(긴 click 기다림으로 30초를 쓰지 않게).
import { readFileSync } from 'node:fs'

// 1×1 PNG — 파일을 따로 두지 않는다
export const png = {
  name: 'cat.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  ),
}

export const LINE = '흠, 손때가 제법 묻었구먼'
const JSON_TYPE = 'application/json; charset=utf-8'
export const ok = (mochi, line = LINE) => ({ status: 200, body: JSON.stringify({ mochi, line }) })
export const fail = (status, code) => ({ status, body: JSON.stringify({ code }) })
// contracts/appraise-http.md §5 상태 번호
export const STATUS = { refused: 422, unavailable: 503, person_limit: 429, daily_limit: 429, invalid_input: 400 }
export const failOf = (code) => fail(STATUS[code], code)

// 실패 · 퇴근 화면의 버튼 이름 (plan A1 '글자의 원본')
export const FAIL_BUTTON = {
  refused: '사진 다시 꺼내기',
  unavailable: '다시 감정 받기',
  person_limit: '조금 뒤에 다시',
  daily_limit: '내일 다시 오기',
}

// contracts/appraise.md §5: `| `code` ` 줄의 첫 따옴표 글자. 없으면 던진다.
const contract = readFileSync(new URL('../contracts/appraise.md', import.meta.url), 'utf8')
export function contractText(code) {
  const line = contract.split('\n').find((l) => l.startsWith(`| \`${code}\``))
  if (!line) throw new Error(`contracts §5에 ${code} 줄이 없다`)
  return line.match(/"([^"]+)"/)[1]
}

// replies를 차례로 준다. 'hold'는 release()까지 붙잡았다가 바로 다음 항목으로 답한다.
export async function routeQueue(page, replies) {
  const queue = [...replies]
  let open = null // 붙잡는 중인 요청이 있으면 그것을 푸는 함수
  let early = 0 // 요청이 오기 전에 부른 release 수
  await page.route(
    (u) => u.pathname === '/api/appraise',
    async (route) => {
      let next = queue.shift()
      if (next === 'hold') {
        if (early > 0) early--
        else await new Promise((r) => (open = r))
        open = null
        next = queue.shift()
      }
      if (!next) throw new Error('routeQueue: 답보다 요청이 많다')
      return route.fulfill({ contentType: JSON_TYPE, ...next })
    },
  )
  return { release: () => (open ? open() : early++) }
}

// POST /api/appraise 요청 수. goto 전에 건다(새 탭 요청도 센다).
export function countPosts(page) {
  let n = 0
  page.context().on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/appraise') n++
  })
  return () => n
}

export const submitOf = (page) => page.getByRole('button', { name: '감정 받기!', exact: true })
export const uncle = (page) => page.getByTestId('uncle')
export const photoInput = (page) => page.getByLabel('사진 고르기')

const press = async (page, name) => {
  const button = page.getByRole('button', { name, exact: true })
  await button.waitFor({ timeout: 5000 })
  await button.click()
}
export const enter = (page) => press(page, '가게에 들어가기') // ① → ②
export const next = (page) => press(page, '다음')
export const pickPrice = (page, name = '🍡 10개') => press(page, name)

// ①(goto) → ③. 이미 열려 있으면 open: false
export async function walkToTags(page, { open = true } = {}) {
  if (open) await page.goto('/')
  await enter(page)
  await photoInput(page).waitFor({ state: 'attached', timeout: 5000 })
  await photoInput(page).setInputFiles(png)
  await next(page)
}

// ① → ④. tag가 null이면 ③을 건너뛴다(태그 0개)
export async function walkToPrice(page, { tag = '🎁 선물', open = true } = {}) {
  await walkToTags(page, { open })
  if (tag) await press(page, tag)
  await next(page)
}

// Fake server on the real appraise server's port: counts requests, answers 503. CAREER-29 AC-5.
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const BUSY = '[guard-8787] 8787에 이미 무언가 떠 있다(진짜 감정 서버?) — 끄고 다시 돌린다'

export async function startGuard() {
  const seen = []
  const server = createServer((req, res) => {
    seen.push(`${req.method} ${req.url}`)
    req.resume()
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end('{"code":"unavailable"}')
  })
  await new Promise((resolve, reject) => {
    server.once('error', (e) => reject(e.code === 'EADDRINUSE' ? new Error(BUSY) : e))
    server.listen(8787, '127.0.0.1', resolve)
  })
  const close = () =>
    new Promise((resolve) => {
      server.close(() => resolve())
      server.closeAllConnections()
    })
  return { seen, close }
}

async function finish({ seen, close }) {
  await close()
  console.log('[guard-8787] 받은 요청 ' + seen.length + '개')
  return seen.length === 0 ? null : `[guard-8787] 진짜 서버 자리로 간 요청 ${seen.length}개: ${seen.join(', ')}`
}

export default async function globalSetup() {
  const guard = await startGuard()
  return async () => {
    const problem = await finish(guard)
    if (problem) throw new Error(problem)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let guard
  try {
    guard = await startGuard()
  } catch (e) {
    console.error(e.message)
    process.exit(e.message === BUSY ? 3 : 2)
  }
  // async spawn: the fake server lives in this process and must keep answering
  const r = await new Promise((resolve) => {
    const c = spawn(process.argv[2], process.argv.slice(3), { stdio: 'inherit' })
    c.on('error', () => resolve({ status: null, error: true }))
    c.on('close', (status, signal) => resolve({ status, signal }))
  })
  const problem = await finish(guard)
  if (problem) console.error(problem)
  process.exit(r.status ? r.status : r.error || r.signal ? 1 : problem ? 1 : 0)
}

// @vitest-environment jsdom
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { cwd } from 'node:process'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from '../src/App.jsx'

vi.mock('../src/appraise.js', () => ({ appraise: vi.fn(), FAKE_DELAY_MS: 800 }))

// jsdom에서는 import.meta.url이 file 주소가 아니라 vitest 실행 위치(app/)에서 찾는다
const APP = cwd()

// contracts/appraise.md §5 리전 안내 — 글자 그대로
const REGION = '사진은 감정하는 동안 서울 밖 아시아 리전에서 처리될 수 있어요.'

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
})
afterEach(cleanup)

const submit = () => screen.getByRole('button', { name: '감정 받기' })

// 안내가 버튼의 설명이고 버튼 바로 앞 형제인지
function expectNoticeBesideButton() {
  expect(screen.getByText(REGION)).toBeTruthy()
  const id = submit().getAttribute('aria-describedby')
  expect(id).toBeTruthy()
  expect(document.getElementById(id).textContent).toBe(REGION)
  expect(submit().previousElementSibling).toBe(document.getElementById(id))
}

// CAREER-29 AC-2: 첫 화면에서 안내가 보이고 버튼 바로 앞에 있다
test('CAREER-29 AC-2 region notice is visible before picking a photo', () => {
  render(<App />)
  expectNoticeBesideButton()
})

// CAREER-29 AC-2: 사진·가격을 고른 뒤(누르기 직전)에도 같다
test('CAREER-29 AC-2 region notice stays right before submit after picking', () => {
  render(<App />)
  fireEvent.change(screen.getByLabelText('사진 고르기'), {
    target: { files: [new File(['x'], 'cat.png', { type: 'image/png' })] },
  })
  fireEvent.click(
    within(screen.getByRole('group', { name: '마음 가격' })).getByRole('button', {
      name: '🍡 10개',
      exact: true,
    }),
  )
  expect(submit().disabled).toBe(false)
  expectNoticeBesideButton()
})

// CAREER-29 AC-2: 화면 글자 = 테스트 상수 = contracts/appraise.md §5 원본
test('CAREER-29 AC-2 notice text matches contracts/appraise.md', () => {
  const doc = readFileSync(resolve(APP, '../contracts/appraise.md'), 'utf8')
  const line = doc.split('\n').find((l) => l.includes('리전 안내'))
  expect(line).toBeTruthy()
  expect(line.match(/"([^"]+)"/)[1]).toBe(REGION)
  render(<App />)
  expect(screen.getByText(REGION).textContent).toBe(REGION)
})

// CAREER-29 AC-4: 화면 코드에 서버 주소·환경변수가 없다
test('CAREER-29 AC-4 app/src has no server address or env', () => {
  const root = resolve(APP, 'src')
  const files = readdirSync(root, { recursive: true }).filter((f) => /\.jsx?$/.test(f))
  expect(files.length).toBeGreaterThan(0)
  const hits = []
  for (const f of files) {
    readFileSync(join(root, f), 'utf8')
      .split('\n')
      .forEach((l, i) => {
        if (/8787|127\.0\.0\.1|VITE_|import\.meta\.env/.test(l)) hits.push(`${f}:${i + 1}: ${l.trim()}`)
      })
  }
  expect(hits).toEqual([])
})

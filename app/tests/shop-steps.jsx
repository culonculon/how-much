// CAREER-35 T1: 6단계 화면 단위 테스트가 같이 쓰는 돕는 함수. expect는 넣지 않는다(T11 expect 수 비교가 흐려짐).
// vi.mock('../src/appraise.js', …)는 이 파일이 아니라 각 테스트 파일에 둔다.
import { StrictMode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../src/App.jsx'
import { appraise } from '../src/appraise.js'

export const png = () => new File(['x'], 'cat.png', { type: 'image/png' })
export const jpg = () => new File(['x'], 'cat.jpg', { type: 'image/jpeg' })
export const txt = () => new File(['x'], 'note.txt', { type: 'text/plain' })

export function renderApp() {
  return render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

export const priceGroup = () => within(screen.getByRole('group', { name: '마음 가격' }))
export const tagGroup = () => within(screen.getByRole('group', { name: '사연 태그' }))
export const preview = () => screen.queryByRole('img', { name: '고른 사진 미리보기' })

export const enter = () => fireEvent.click(screen.getByRole('button', { name: '가게에 들어가기' }))
export const next = () => fireEvent.click(screen.getByRole('button', { name: '다음' }))
export const submit = () => screen.getByRole('button', { name: '감정 받기!' })
export const toPhoto = enter // ① → ②

export const pickFile = (file) =>
  fireEvent.change(screen.getByLabelText('사진 고르기'), { target: { files: [file] } })
export const pickPrice = (name) => fireEvent.click(priceGroup().getByRole('button', { name, exact: true }))
export const pickTag = (name) => fireEvent.click(tagGroup().getByRole('button', { name, exact: true }))

// ①(이미 그려진 첫 화면) → ④. 고른 사진을 돌려준다.
export function walkToPrice({ photo = png(), tags = ['🎁 선물'] } = {}) {
  enter()
  pickFile(photo)
  next()
  tags.forEach(pickTag)
  next()
  return photo
}

export const reject = (code) => Object.assign(new Error('x'), code ? { code } : {})

// 답을 테스트가 풀어 줄 때까지 붙잡는다
export function hold() {
  let resolve, reject
  appraise.mockReturnValueOnce(
    new Promise((res, rej) => {
      resolve = res
      reject = rej
    }),
  )
  return { resolve, reject }
}

// 아저씨 그림의 표정. 아저씨가 없으면(퇴근) null
export const face = () => screen.queryByTestId('uncle')?.getAttribute('data-face') ?? null

// history.back() 뒤 popstate가 한 번 오는 것까지 기다린다. 안 오면 던진다(헛돌아 멈추지 않게).
export async function back() {
  await act(async () => {
    await new Promise((done, fail) => {
      const timer = setTimeout(() => fail(new Error('back(): popstate가 오지 않았다')), 1000)
      window.addEventListener(
        'popstate',
        () => {
          clearTimeout(timer)
          done()
        },
        { once: true },
      )
      history.back()
    })
  })
}

export const resetHistory = () => history.replaceState(null, '')

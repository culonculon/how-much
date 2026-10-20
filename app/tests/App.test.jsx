import { renderToString } from 'react-dom/server'
import { expect, test } from 'vitest'
import App from '../src/App.jsx'

// AC-3: 테스트가 실제로 돈다 (AC-1의 "how-much" 글자도 함께 확인)
test('shows the app name', () => {
  expect(renderToString(<App />)).toContain('how-much')
})

import { expect, test } from '@playwright/test'
import { countPosts, ok, pickPrice, routeQueue, submitOf, typePrice, walkToPrice } from './shop-steps.js'

// plan A2: 가장 작은 iPhone에서 주소창 · 도구 막대를 뺀 높이를 어림한 값. 설정 파일은 고치지 않는다.
test.use({ viewport: { width: 375, height: 548 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

// AC-2: 숫자 칸에 친 수는 plan A5 표의 id 하나로만 나가고, 요청은 ④에서 1번이다
for (const [typed, id] of [['1', 'one'], ['777', 'hundred'], ['9999', 'hundred'], [null, 'never']]) {
  test(`CAREER-40 AC-2 ${typed ?? 'never'} is sent as ${id}`, async ({ page }) => {
    await routeQueue(page, [ok(3)])
    const posts = countPosts(page)
    const urls = []
    page.context().on('request', (r) => {
      const u = new URL(r.url())
      if (r.method() === 'POST' && u.pathname === '/api/appraise') urls.push(u)
    })

    await walkToPrice(page) // ①~③
    expect(posts()).toBe(0)
    if (typed === null) await pickPrice(page, '안 팔아')
    else await typePrice(page, typed)
    expect(posts()).toBe(0) // 고르는 동안은 보내지 않는다
    await submitOf(page).click()
    await expect.poll(posts).toBe(1)

    expect(urls).toHaveLength(1)
    const q = urls[0].searchParams
    expect(q.getAll('myPrice')).toEqual([id])
    expect([...new Set(q.keys())].sort()).toEqual(['myPrice', 'tags'])
    if (typed !== null) {
      expect([...q.values()]).not.toContain(typed)
      expect(urls[0].search).not.toContain(`myPrice=${typed}`)
    }
    await expect(page.getByTestId('appraised-price')).toHaveText('한정선 모찌 3개')
    expect(posts()).toBe(1)
  })
}

[CAREER-32](https://culonculon98.atlassian.net/browse/CAREER-32) · spec: [spec.md](spec.md) · plan: [plan.md](plan.md) · ADR: [0008](../../docs/adr/0008-screens-without-url-change.md) · 약속: [contracts/appraise.md](../../contracts/appraise.md) §5 (바꾸지 않음)

상태: 승인됨 (2026-10-31)

- 방식: **맡긴다**. 브랜치 `CAREER-32-reappraise-card` 하나. 순서: **U1 → T1 → T2 → T3 → T4 · T5 · T6 → F1 → F2 → F3 → F4 → P1 → (머지 · 배포 뒤) H1**
  - [P] = 같은 역할 세션 안에서 차례를 바꿔도 되는 것(파일이 겹치지 않음). T4 · T5 · T6은 [P]. T1~T3은 같은 파일, F1~F4는 `App.jsx` 하나라 [P] 없음.
  - 테스트 커밋(T)이 모두 구현 커밋(F)보다 먼저다 — reviewer가 커밋 순서로 본다.
- **U1 전에는 만들지 않는다**(CLAUDE.md §4). contracts는 바뀌지 않는다(plan A3).
- 명령은 **저장소 루트**에서. `cd`가 든 명령은 `bash -c '…'`로. 세션 보고에는 출력 그대로, PR '검사 결과' 칸에는 CI 링크만.
- 이름의 원본: plan A1 '코드 모양' · '그리는 차례'. 문구의 원본: contracts/appraise.md §5(테스트는 파일에서 읽음) · `options.js`(`REGION_NOTICE` · `OFF_DUTY_TEXT` · `BUSY_TEXT`).
- 테스트가 실패하면 **테스트를 느슨하게 고치지 않는다** — 화면을 고치거나 멈춘다. 이미 있는 테스트는 T6 짝 표 말고는 고치지 않는다.
- 공통 고정값: 첫 답 `{ mochi: 3, line: '첫 대사' }`(e2e는 `"흠, 손때가 제법 묻었구먼"`) · 둘째 답 `{ mochi: 7, … }` · 고르는 것 png · `🍡 10개` · `🎁 선물`.

---

## U1 — plan · ADR 승인 · 순서 1
- 담당: **사용자**
- 파일: `specs/CAREER-32-reappraise-card/plan.md` · `tasks.md` · `docs/adr/0008-screens-without-url-change.md` (승인 · 커밋만)
- AC: 만들기 시작 조건
- 단계
  1. plan '사용자가 정할 것' 1 · 2를 고른다(`BUSY_TEXT` 글자가 다르면 plan A1 표 글자를 고친다).
  2. plan · tasks 상태 줄을 `승인됨 (2026-MM-DD)`, ADR-0008 상태를 `확정 (날짜)`로 바꾼다.
  3. 커밋: `CAREER-32: three screens plan and ADR-0008`
- 검사 명령: `grep -m1 -H '^상태' specs/CAREER-32-reappraise-card/plan.md specs/CAREER-32-reappraise-card/tasks.md; grep -m1 -H '^- 상태' docs/adr/0008-screens-without-url-change.md`
- 끝난 상태: 셋 다 `승인됨` / `확정`.

## T1 — AC-1 세 화면 단위 테스트 (빨강) · 순서 2
- 담당: test-writer
- 파일: `app/tests/ThreeScreens.test.jsx` (새로)
- AC: AC-1 (+ plan A1 초점)
- 파일 머리(T2 · T3이 이어 씀) — `app/tests/FirstFlow.test.jsx` 1~50 · 149~155 · 233줄 꼴을 **복사**(그 파일은 여기서 고치지 않음): `// @vitest-environment jsdom` · `vi.mock('../src/appraise.js', …)` · `StrictMode`로 그리는 `renderApp` · `png` · `jpg` · `pickFile` · `pickPrice` · `pickTag` · `submit` · `preview` · `mascot` · `reject`. 더할 것:
  - `card = () => screen.queryByRole('region', { name: '감정 결과' })` · `again = () => screen.getByRole('button', { name: '다시 감정' })`
  - `hold()` — `appraise.mockReturnValueOnce(new Promise((res, rej) => …))`로 `{ resolve, reject }`를 돌려준다
  - `noInputs()` — `queryByLabelText('사진 고르기')` · `queryByRole('group', { name: '마음 가격' })` · `queryByRole('group', { name: '사연 태그' })` 모두 `null`을 `expect`
  - `contractText(code)` — FirstFlow 314~319줄 꼴로 `contracts/appraise.md`의 `` | `<code>` `` 줄 첫 `"…"`
  - `beforeEach`: FirstFlow와 같음 / `afterEach(cleanup)`
- 테스트 `CAREER-32 AC-1 three screens appear one at a time`
  1. `const { resolve } = hold()` · `renderApp()` → `document.activeElement === document.body`(처음엔 초점을 뺏지 않음)
  2. 입력: 사진 칸 · 두 묶음 · `getByText(REGION_NOTICE)` · `submit()` 있음 · `card() === null` · `queryByRole('button', { name: '다시 감정' }) === null` · `mascot()`에 `갸웃` · `도장` 없음
  3. png · `🍡 10개` · `🎁 선물` → `const button = submit()` · `fireEvent.click(button)` 2번
  4. 갸웃: `mascot()`에 `🔍 갸웃` · `screen.queryAllByRole('button')` 길이 0 · `noInputs()` · `card() === null` · `document.activeElement === mascot()`
  5. `resolve({ mochi: 3, line: '첫 대사' })` → `await screen.findByRole('region', { name: '감정 결과' })` → `mascot()`에 `🔨 도장` · 카드 안 `appraised-price` `모찌 3개` · `my-price` `모찌 10개` · `mascot-line` `첫 대사` · `again()` 있음 · `noInputs()` · `queryByRole('button', { name: '감정 받기' }) === null` · `appraise` 1번 · `document.activeElement === card()`
- 단계
  1. 쓴다. 2. 검사 명령 → lint 통과, test 실패. **새 실패는 이 테스트뿐이고 이유가 2~4단계(한 페이지라 갸웃에 입력이 남음 · 버튼이 있음)**여야 한다. 3. 커밋: `CAREER-32: three screens unit test`
- 검사 명령: `npm --prefix app run lint && { npm --prefix app test; echo "exit=$?"; }`
- 끝난 상태: lint 0 · `exit` 0 아님 · 실패는 위 이유 하나.

## T2 — AC-2 '다시 감정' 단위 테스트 (빨강) · 순서 3
- 담당: test-writer
- 파일: `app/tests/ThreeScreens.test.jsx` (더함만)
- AC: AC-2 (+ U4 대체: 입력 화면 아저씨)
- 돕는 함수 `firstCard()`: `appraise.mockResolvedValueOnce({ mochi: 3, line: '첫 대사' })` → `renderApp()` → `const photo = png()` · 고르기 → 누름 → `await screen.findByText('모찌 3개')` → `photo` 돌려줌.
- `CAREER-32 AC-2 again returns to the input screen with choices kept, then the same values are sent`
  - ①: `const photo = await firstCard()` → `fireEvent.click(again())` → `preview()` 있음 · 마음 가격 4개의 `aria-pressed`가 `{ '🍡 10개': 'true', 나머지: 'false' }` · 태그 16개 중 `🎁 선물`만 `'true'` · `submit().disabled === false` · `queryByText('모찌 3개') === null` · `card() === null` · `mascot()`에 `도장` · `갸웃` 없음 · `appraise` 1번
  - ②: `const { resolve } = hold()` → 누름 → `mascot()`에 `갸웃` · `queryByText('모찌 3개') === null` → `resolve({ mochi: 7, line: '둘째' })` → `findByText('모찌 7개')` · `mascot()`에 `🔨 도장` · `queryByText('모찌 3개') === null` · `appraise.mock.calls[1][0]`이 `calls[0][0]`과 `toEqual`, `photo`는 `toBe`(같은 파일)
- `test.each` `CAREER-32 AC-2 changing only %s changes only that value`
  | 이름 | 바꾸기(①에 이어) | 두 번째 인자 |
  |---|---|---|
  | `photo` | `const f = jpg(); pickFile(f)` | `{ photo: f, myPrice: 'ten', tags: ['how-1'] }` |
  | `price` | `pickPrice('🍡 100개')` | `{ photo, myPrice: 'hundred', tags: ['how-1'] }` |
  | `add tag` | `pickTag('🏆 인생템')` | `{ photo, myPrice: 'ten', tags: ['how-1', 'feeling-2'] }` |
  | `remove tag` | `pickTag('🎁 선물')` | `{ photo, myPrice: 'ten', tags: [] }` |
  - 각각: `firstCard()` → `again()` → 바꾸기 → `mockResolvedValueOnce({ mochi: 7, line: '둘째' })` → 누름 → `findByText('모찌 7개')` → 두 번째 인자 `toEqual` 위 표 · `my-price`가 `price`면 `모찌 100개`, 아니면 `모찌 10개` · `noInputs()`
- 단계: 1. 더한다. 2. 검사 명령 → 새 실패가 이 테스트들이고 이유가 '`다시 감정` 버튼을 못 찾음'. 3. 커밋: `CAREER-32: reappraise keeps choices unit tests`
- 검사 명령: T1과 같음
- 끝난 상태: lint 0 · 실패가 T1 · T2 테스트뿐.

## T3 — AC-3 실패 · 퇴근 단위 테스트 (빨강) · 순서 4
- 담당: test-writer
- 파일: `app/tests/ThreeScreens.test.jsx` (더함만)
- AC: AC-3 (+ plan A1 초점: 실패 → 문구, 퇴근 → 아저씨 칸)
- `describe.each([['first', false], ['after a card', true]])` × `test.each([['person_limit','person_limit'], ['unavailable','unavailable'], ['refused','refused'], ['invalid_input','invalid_input'], [undefined,'unavailable'], ['daily_limit','daily_limit']])` — 이름 `CAREER-32 AC-3 %s: rejected with %s`
  - 준비: `after a card`면 `firstCard()` → `again()`, 아니면 `renderApp()` → 고르기. `appraise.mockRejectedValueOnce(reject(code))` → 누름
  - ①: `await screen.findByRole('button', { name: '다시 감정' })` → `card() === null` · `noInputs()` · `queryByRole('button', { name: '감정 받기' }) === null`
    - 실패: `mascot()`에 `대기` · `getByTestId('appraise-error').textContent === contractText(text)` · `queryByTestId('off-duty') === null` · `document.activeElement === getByTestId('appraise-error')`
    - 퇴근: `mascot()`에 `🚶 퇴근` · `within(mascot()).getByTestId('off-duty').textContent === contractText('daily_limit')` · `queryByTestId('appraise-error') === null` · `document.activeElement === mascot()`
  - ②: `again()` 누름 → 사진 · 값 · 태그 그대로(T2 ①과 같은 확인) · `submit().disabled === false` · 실패면 `appraise-error` 글자 그대로, 퇴근이면 `🚶 퇴근` · `off-duty` 글자 그대로 → `pickFile(jpg())` → 실패면 `appraise-error` 없음, 퇴근이면 `🚶 퇴근` · `off-duty` 그대로
  - ③: `const { resolve } = hold()` → 누름 → `mascot()`에 `갸웃` · `appraise-error` · `off-duty` 없음 → `resolve({ mochi: 7, line: '둘째' })` → `findByText('모찌 7개')` · `🔨 도장` · `appraise-error` · `off-duty` 없음
- 단계: 1. 더한다. 2. 검사 명령 → 새 실패 12개 모두 이유가 '`다시 감정`을 못 찾음'(①). 3. 커밋: `CAREER-32: failure and off-duty screens unit tests`
- 검사 명령: T1과 같음
- 끝난 상태: lint 0 · 실패가 T1~T3뿐.

## T4 [P] — AC-4 화면을 내리지 않아도 보임 e2e (빨강) · 순서 5
- 담당: test-writer
- 파일: `e2e/three-screens-view.spec.js` (새로)
- AC: AC-4 · 원본 plan A2
- 파일 맨 위: `test.use({ viewport: { width: 375, height: 548 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })` — `devices[…]`를 펼치지 않는다. png는 `daily-limit.spec.js` 3~11줄 꼴. 문구는 `readFileSync(new URL('../contracts/appraise.md', import.meta.url), 'utf8')`에서 T1 `contractText` 규칙.
- 돕는 함수
  - `routeQueue(page, replies)`: `page.route((u) => u.pathname === '/api/appraise', …)`로 차례로 `fulfill`(`contentType: 'application/json; charset=utf-8'`). 항목이 `'hold'`면 돌려준 `release()`까지 기다렸다 다음 성공을 준다. 넘치면 `throw`.
  - `press(page)`: `const s = page.getByRole('button', { name: '감정 받기' })` · `await expect(s).toBeEnabled()` · `await s.evaluate((el) => el.scrollIntoView({ block: 'end' }))` · `expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)` · `await s.click()`. **누른 뒤 스크롤 · `scrollIntoViewIfNeeded` · `hover` · `tap` 금지.**
  - `inView(...locs)`: 각각 `await expect(l).toBeInViewport({ ratio: 1 })`
- `CAREER-32 AC-4 ① thinking, card and again are in view on first and second appraise`
  - 응답: 첫째 붙잡음 → `200 {"mochi":3,…}`, 둘째 붙잡음 → `200 {"mochi":7,"line":"허허, 또 왔구먼"}`
  - 고르기 → `press` → `mascot` `toContainText('갸웃')` · `inView(mascot)` → `release()` → `appraised-price` `모찌 3개` → `inView(region '감정 결과', appraised-price, my-price, mascot-line, 다시 감정)`
  - `다시 감정` 누름 → `press` → 갸웃 · `inView(mascot)` → `release()` → `모찌 7개` → 같은 `inView`
- `for (const code of ['person_limit', 'unavailable', 'daily_limit'])` `CAREER-32 AC-4 ② ${code} on the second appraise is in view`
  - 응답 `200 {mochi 3}` → 429 `{"code":"person_limit"}` / 503 `{"code":"unavailable"}` / 429 `{"code":"daily_limit"}`
  - `press` → 첫 카드 → `다시 감정` → `press` → 오류면 `appraise-error` `toHaveText(contractText(code))` · `inView(appraise-error, 다시 감정)`. `daily_limit`이면 `mascot` `toContainText('🚶 퇴근')` · `off-duty` `toHaveText(contractText('daily_limit'))` · `inView(mascot, off-duty, 다시 감정)` · `appraise-error` `toHaveCount(0)`
  - `person_limit` 글자가 `"허허, 너무 자주 왔구먼. 좀 쉬었다 와."`인지도 한 줄 `expect`(spec 글자 그대로)
- 단계
  1. 쓴다. 2. 검사 명령 → 이 파일만 실패. ①의 **첫 실패 이유가 `toBeInViewport`**(카드가 버튼 아래 화면 밖)여야 한다. `scrollY > 0`에서 실패하거나 `toBeInViewport`가 고치기 전에 통과하면 **멈추고** 알린다(plan 실패 시나리오 8). 출력에 `[guard-8787] 받은 요청 0개`. 3. 커밋: `CAREER-32: mobile viewport visibility e2e`
- 검사 명령: `bash -c "$(jq -r '.checks.app.e2e' pipeline.config.json)"; echo "e2e exit=$?"; git diff --stat HEAD -- e2e/playwright.config.js pipeline.config.json`
- 끝난 상태: `exit` 0 아님 · 실패가 위 이유 · 마지막 diff 빈 줄.

## T5 [P] — AC-5 뒤로 · 앞으로 · 새로고침 · 바로 열기 (빨강) · 순서 5
- 담당: test-writer
- 파일: `e2e/three-screens-history.spec.js` (새로) · `app/tests/ScreenHistory.test.jsx` (새로)
- AC: AC-5 (+ plan A1 · ADR-0008 주소 `/` · U10 (b) 안내)
- **e2e** — 파일 맨 위 `test.use`는 T4와 같다. `routeQueue` · png는 T4 꼴을 복사. 요청 수: `page.context().on('request', …)`로 `method() === 'POST'` · `pathname === '/api/appraise'`를 센다(`goto` 전에 건다). `expectRoot(page)`: `new URL(page.url())`의 `pathname === '/'` · `hash === ''`. `expectChosen(page)`: 미리보기 보임 · `[aria-label="마음 가격"] [aria-pressed="true"]`가 `🍡 10개` 하나 · `[aria-label="사연 태그"] [aria-pressed="true"]`가 `🎁 선물` 하나. `expectEmpty(page)`: 미리보기 0 · `[aria-pressed="true"]` 0 · `감정 받기` 꺼짐 · region `감정 결과` · `appraise-error` · `off-duty` 모두 0.
  - **모든 화면(입력 · 갸웃 · 결과 · 뒤로 뒤)에서 `expectRoot`** (plan 실패 시나리오 7 — 로컬에서 nginx 404를 대신 잡음)
  - `CAREER-32 AC-5 ① back from a result keeps choices, then ③ forward shows no old card` — 응답 `{mochi 3}` → `{mochi 7}`. 결과(3) → `goBack()` → `expectChosen` · `감정 받기` 켜짐 · region 0 · 요청 1 → 누름 → `갸웃` → `모찌 7개` · 요청 2 → `goForward()` → `모찌 3개` 0 · 요청 2
  - `CAREER-32 AC-5 ③ forward right after back shows no card` — 결과(3) → `goBack()` → `goForward()` → region 0 · `감정 받기` 보임 · 요청 1
  - `for code of ['person_limit', 'daily_limit']` `CAREER-32 AC-5 ② back from ${code}` — 실패 · 퇴근 화면 → `goBack()` → `expectChosen` · 켜짐 · `person_limit`이면 `appraise-error` 글자(contracts) · `daily_limit`이면 `🚶 퇴근` · `off-duty` 글자
  - `CAREER-32 AC-5 ④ after three appraisals back never shows an old card` — 응답 3 · 7 · 9, 사이마다 `다시 감정` → 결과(9) → `goBack()` → 입력 · region 0 → `goBack()` → region 0 · 요청 3
  - `CAREER-32 AC-5 ⑤ back while thinking discards the late answer` — 첫째 붙잡음 → 누름 → 갸웃 → `goBack()` → `expectChosen` · `감정 받기` 꺼짐 · `#busy-note` 보임 → `release()` → `감정 받기` 켜짐 · region 0 · `mascot`에 `도장` 없음 · 요청 1
  - `for where of ['thinking', 'result', 'person_limit', 'daily_limit']` `CAREER-32 AC-5 ⑥ reload on ${where} starts empty` — 그 화면까지 → 요청 수 `n` → `reload()` → `expectEmpty` · 요청 `n`. `thinking`은 붙잡은 채 다시 불러오고 풀지 않는다. 끝에 `await page.unrouteAll({ behavior: 'ignoreErrors' })`
  - `CAREER-32 AC-5 ⑥ opening the result address in a new tab starts empty` — 결과 → `const url = page.url()` → `const p2 = await page.context().newPage(); await p2.goto(url)` → `expectEmpty(p2)` · 요청 1
- **단위** `app/tests/ScreenHistory.test.jsx` — 머리는 T1 꼴 복사, `import { BUSY_TEXT } from '../src/options.js'`.
  - `CAREER-32 AC-5 popstate while thinking returns to input and drops the late answer` — `hold()` → 고르기 → 누름 → `act(() => window.dispatchEvent(new PopStateEvent('popstate')))` → 입력 화면 · 고른 것 그대로 · `submit().disabled === true` · `getByText(BUSY_TEXT).id === 'busy-note'` · `submit().getAttribute('aria-describedby') === 'region-notice busy-note'` · `document.activeElement.id === 'busy-note'` · `mascot()`에 `갸웃` 없음 → `await act(() => resolve({ mochi: 3, line: 'x' }))` → `card() === null` · `submit().disabled === false` · `aria-describedby === 'region-notice'` · `queryByText(BUSY_TEXT) === null` · `appraise` 1번
  - 같은 꼴로 늦은 답이 `reject('daily_limit')`이면 `🚶 퇴근` · `off-duty` 없음(버림)
  - `CAREER-32 AC-5 history grows by at most one entry over many appraisals` — `const before = history.length` → 감정 3번(사이 `again()`) → `history.length <= before + 1` · `history.state`가 `{ howMuch: 'out' }`
  - `CAREER-32 AC-5 popstate on a result returns to input with focus on submit` — `firstCard` 꼴 → popstate → 입력 · `document.activeElement === submit()`
- 단계: 1. 쓴다. 2. 검사 명령 → 이 두 파일의 테스트만 새로 실패(이유: `다시 감정` 없음 · 뒤로가 앱 밖으로 감 · `busy-note` 없음). 3. 커밋: `CAREER-32: browser history unit and e2e tests`
- 검사 명령: `npm --prefix app run lint && { npm --prefix app test; echo "unit exit=$?"; }; bash -c "$(jq -r '.checks.app.e2e' pipeline.config.json)"; echo "e2e exit=$?"`
- 끝난 상태: 두 `exit` 0 아님 · 새 실패가 이 두 파일뿐.

<a id="t6"></a>
## T6 [P] — 이미 있는 테스트를 3단으로 옮기기 (A4 · AC-7) · 순서 5
- 담당: test-writer
- 파일: `app/tests/FirstFlow.test.jsx` · `e2e/first-flow.spec.js` · `e2e/connect-screen.spec.js` · `e2e/daily-limit.spec.js` · `e2e/photo-upload.spec.js` — **아래 표 말고는 한 글자도 바꾸지 않는다**
- AC: AC-7 · 원본 plan A4
- 짝 표(줄 번호는 main 기준)

| 파일 · 테스트 | 지움 | 더함 / 바꿔 넣음 | 같은 것을 보나 |
|---|---|---|---|
| FirstFlow 155줄 뒤 (돕는 함수) | — | `const again = () => screen.getByRole('button', { name: '다시 감정' })` | 화면 넘기기 |
| FirstFlow 'AC-7 thinking state, disabled button, appraise called once' | 165 `  fireEvent.click(submit())` · 166 `  fireEvent.click(submit())` | `  const button = submit()` · `  fireEvent.click(button)` · `  fireEvent.click(button)` | 같은 버튼을 두 번 누름 → 169줄 `toHaveBeenCalledTimes(1)` 그대로 |
| 〃 | 168 `  expect(submit().disabled).toBe(true)` | `  expect(screen.queryByRole('button', { name: '감정 받기' })).toBeNull()` | '갸웃 중 다시 누를 수 없음' — 꺼짐 → 없음 |
| FirstFlow 'AC-7 invalid_input ends thinking…' | — | 245줄 앞 `  fireEvent.click(again())` | 화면 넘기기 |
| FirstFlow 'CAREER-27 AC-9 daily_limit shows off-duty…' | — | 287줄 앞 `  fireEvent.click(again())` | 〃 (283~286은 결과 화면에서 그대로 확인) |
| FirstFlow 'CAREER-27 AC-9 picking another photo…' | — | 297줄 뒤 `  fireEvent.click(again())` | 〃 |
| FirstFlow 'CAREER-27 AC-9 a successful retry…' | — | 305줄 뒤 `  fireEvent.click(again())` | 〃 |
| FirstFlow 'CAREER-31 AC-5 person_limit is a notice…' | — | 332줄 앞 `  fireEvent.click(again())` | 〃 (329~331은 결과 화면에서) |
| first-flow 'first flow end to end' | 68 `  await expect(submit).toBeDisabled()` | `  await expect(submit).toHaveCount(0)` | '갸웃 중 누를 수 없음'. 갸웃 · 결과 화면 모두 0개라 옛 '67~68줄 흔들림'이 없어짐 |
| connect-screen 'CAREER-29 AC-3 …' | — | 53줄 앞 `  await page.getByRole('button', { name: '다시 감정' }).click()` | 화면 넘기기 |
| daily-limit 'CAREER-27 AC-10 …' | — | 48줄 앞 같은 줄 | 〃 (44~47은 결과 화면에서) |
| photo-upload 'AC-7 server rejection …' | — | 128줄 앞 같은 줄 | 〃 |

- 옮기지 않음: `connect.test.jsx` · `App.test.jsx` · FirstFlow 나머지 · photo-upload AC-1~6 · first-flow 'rejects non-image' (plan A4 표)
- 단계
  1. 표대로 고친다.
  2. 검사 명령 → 표의 테스트만 실패하고 이유가 '`다시 감정` 없음'(FirstFlow · e2e 셋) · '`toHaveCount(0)` — 1개'(first-flow)여야 한다.
  3. 아래 A4 확인 명령 → '지운 줄' 4줄이 표와 같고, 이름 diff 없음, `expect` 수 `main <= 지금`.
  4. 커밋: `CAREER-32: move existing tests to three screens`
- 검사 명령:
  ```
  npm --prefix app run lint && { npm --prefix app test; echo "unit exit=$?"; }; bash -c "$(jq -r '.checks.app.e2e' pipeline.config.json)"; echo "e2e exit=$?"
  bash -c 'for f in app/tests/FirstFlow.test.jsx e2e/first-flow.spec.js e2e/connect-screen.spec.js e2e/daily-limit.spec.js e2e/photo-upload.spec.js; do echo "== $f"; git diff -U0 origin/main -- "$f" | grep -E "^[-+][^-+]"; diff <(git show "origin/main:$f" | grep -E "^(test|\]\))\(") <(grep -E "^(test|\]\))\(" "$f") && echo "names same"; echo "expect $(git show "origin/main:$f" | grep -c "expect(") -> $(grep -c "expect(" "$f")"; done'
  ```
- 끝난 상태: 두 `exit` 0 아님 · 실패가 표의 테스트뿐 · 두 번째 명령 결과가 표와 같음.

---

## F1 — 세 화면 · 실패 · 퇴근 자리 · 초점 (초록: AC-1 · AC-3 · T6) · 순서 6
- 담당: frontend-dev
- 파일: `app/src/App.jsx`
- AC: AC-1 · AC-3 · AC-7(옮긴 테스트)
- 원본: plan A1 '코드 모양' · '그리는 차례' · '상태 흐름'
- 단계
  1. `screen` 상태 · `reqRef` · `mascotRef` · `cardRef` · `errorRef` · `submitRef` · `busyRef`를 둔다. `submit`을 plan 코드 모양대로(이 단계에서는 history 줄 · `busy` 없이 — F4에서 더함).
  2. '그리는 차례'대로 화면별로 그린다. 결과 화면의 '다시 감정'은 `onClick={() => setScreen('input')}`(F2에서 `toInput`으로 바꿈). 아저씨 칸 · 카드 · 결과 화면의 `appraise-error`에 `tabIndex={-1}`과 ref, '감정 받기'에 `ref={submitRef}`. `#region-notice`는 '감정 받기' 바로 앞 그대로.
  3. plan 코드 모양의 `useLayoutEffect`(앞 `screen` 비교 · `scrollTop = 0` · 초점)를 넣는다.
  4. 검사 명령 → T1 · T3 · T6 통과, 이미 있던 테스트 모두 통과. 남은 실패는 T2 ①(입력 화면 아저씨 `도장`) · T5 · (T4는 이미 초록일 수 있음)뿐이어야 한다.
  5. 커밋: `CAREER-32: input, thinking and result screens`
- 검사 명령: `npm --prefix app run lint && { npm --prefix app test; echo "unit exit=$?"; }; bash -c "$(jq -r '.checks.app.e2e' pipeline.config.json)"; echo "e2e exit=$?"`
- 끝난 상태: lint 0 · 실패 이름에 `AC-1` · `AC-3` · `CAREER-27` · `CAREER-29` · `CAREER-31` · `first flow` · `photo` 없음.

## F2 — '다시 감정'의 아저씨 (초록: AC-2) · 순서 7
- 담당: frontend-dev
- 파일: `app/src/App.jsx`
- AC: AC-2 (+ U4 대체)
- 단계: 1. plan의 `toInput`을 두고 '다시 감정' `onClick={toInput}`. 2. 검사 명령 → T2 모두 통과. 3. 커밋: `CAREER-32: again returns to input with idle mascot`
- 검사 명령: `npm --prefix app run lint && { npm --prefix app test; echo "unit exit=$?"; }`
- 끝난 상태: lint 0 · 단위 실패 이름에 `AC-2` 없음(남은 단위 실패는 `ScreenHistory`뿐).

## F3 — 맨 위부터 보이기 (초록: AC-4) · 순서 8
- 담당: frontend-dev
- 파일: `app/src/App.jsx` (F1 단계 3이 이미 넣었으면 고칠 것 없음 — 확인만)
- AC: AC-4
- 단계: 1. `useLayoutEffect`에 `document.documentElement.scrollTop = 0`이 초점 앞에 있는지 본다. CSS · 레이아웃 · 요소 차례는 바꾸지 않는다. 2. 검사 명령 → `three-screens-view.spec.js` 통과. 375×548에서 실패하면 크기 · 레이아웃을 세션이 바꾸지 않고 **멈춘다**. 3. 바뀐 것이 있을 때만 커밋: `CAREER-32: show each screen from the top`
- 검사 명령: `bash -c "$(jq -r '.checks.app.e2e' pipeline.config.json)"; echo "e2e exit=$?"`
- 끝난 상태: e2e 실패가 `three-screens-history.spec.js`뿐.

## F4 — history · 늦은 답 버리기 · 기다림 안내 (초록: AC-5) · 순서 9
- 담당: frontend-dev
- 파일: `app/src/App.jsx` · `app/src/options.js`
- AC: AC-5 · ADR-0008 · U10 (b)
- 단계
  1. `options.js` 끝에 `// CAREER-32 plan A1 (U10 b) — not in contracts` · `export const BUSY_TEXT = '<U1에서 정한 글자>'`.
  2. `submit` 첫 줄 history 규칙(**`await` 전**) · `busy`(`finally`) · 버튼 `disabled={!photo || !myPrice || busy}`.
  3. `popstate` effect(plan 코드 모양). 입력 화면 '감정 받기' 뒤 `busy && <p id="busy-note" ref={busyRef} tabIndex={-1}>{BUSY_TEXT}</p>` · `aria-describedby={busy ? 'region-notice busy-note' : 'region-notice'}`.
  4. 검사 명령 → 모두 통과. 5. 커밋: `CAREER-32: browser back and forward on three screens`
- 검사 명령: `bash -c 'for n in lint test build e2e; do echo "== $n"; bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)" || exit 1; done'; git status --porcelain app e2e`
- 끝난 상태: 종료 코드 0 · test · e2e 통과 수 0 아님 · `[guard-8787] 받은 요청 0개` · `git status`에 `node_modules` · `dist` · `test-results` 없음.

## P1 — 전체 검사 · A4 확인 · PR · 순서 10 (F4 뒤)
- 담당: frontend-dev(검사 · PR 열기) · reviewer · 사용자(머지)
- 파일: 없음 (PR 본문 — `.github/pull_request_template.md`)
- AC: AC-7 · 전부(대조표)
- 단계
  1. `bash -c 'for n in lint test e2e build api; do echo "== $n"; bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)"; echo "exit=$?"; done'` → 모두 `exit=0`, 통과 수 0 아님. 출력 그대로 보고.
  2. T6의 두 번째 명령을 다시 돌려 결과를 PR '결정' 칸 아래에 붙인다(A4 증거).
  3. `git diff --stat origin/main -- api infra contracts e2e/playwright.config.js pipeline.config.json app/tests/connect.test.jsx app/tests/App.test.jsx` → 빈 줄.
  4. 제목 `CAREER-32: three screens with reappraise and visible result`. 칸:
     - 결정: ADR-0008(주소 `/` · history 한 칸 · 라우터 없음) · plan A1 초점 대상 · `scrollTop = 0` · `BUSY_TEXT` · A2(chromium 375×548, 설정 안 바꿈) · T6 바꿔 넣은 확인 2줄(꺼짐 → 없음)
     - 범위 변경: 없음 / 새 의존성: 없음
     - 비용·남용 영향: spec 그대로 + "AC-6은 머지 · 배포 뒤 사용자 확인 — 결과를 이 칸에 덧붙임"
     - spec AC-1~7 ✔/✘ 대조(AC-6은 '머지 뒤 H1')
- 검사 명령: `gh pr checks --watch`
- 끝난 상태: 필수 검사 모두 통과(`reviewer/gate` 포함) · 3단계 diff 빈 줄.

## H1 — iPhone 확인 (AC-6) · 머지 · 배포 뒤
- 담당: **사용자** (배포 `docs/runbook/배포.md` §3, 로그 §5)
- 파일: 없음 (PR '비용·남용 영향' 칸에 덧붙임)
- AC: AC-6 (a)~(g)
- 단계: spec AC-6 '할 때' 그대로. (a)에서 카드 아래 끝 · '다시 감정'이 도구 막대에 가리면 ✘로 적고 architect에게 알린다(plan 실패 시나리오 9). (f) 새로고침 뒤 404면 ADR-0008이 틀린 것이니 바로 알린다.
- 검사 명령: runbook §5 로그 보기 명령으로 이 6번의 `appraise` 줄 — `memo` · `outcome` · `attempts`
- 끝난 상태: (a)~(g) 모두 ✔이고 PR 칸에 적혀 있다.

---

## R1 — reviewer '고치면 좋은 것' ① 초점 떨어짐 (PR #21 리뷰 뒤, 사용자 10/31 고치기로)
- 문제: 갸웃 중 '뒤로' → 입력 화면에서 초점이 `#busy-note`에 있음 → 늦은 답이 와서 `busy`가 풀리면 `#busy-note`가 사라지며 초점이 `body`로 떨어진다(키보드 사용자는 처음부터 다시)
- 정함(10/31): `busy`가 풀릴 때 초점이 `#busy-note`에 있었으면 초점을 '감정 받기'로 옮긴다(이제 눌릴 수 있는 버튼 — plan A1 입력 화면 초점 대상과 같음). 초점이 다른 곳(사진 칸 등)에 있었으면 건드리지 않는다. 스크롤은 바꾸지 않는다
- R1-T (test-writer): `app/tests/ScreenHistory.test.jsx`에 더함만 — ① 갸웃 중 popstate → 늦은 답(성공·실패 각 1) → `document.activeElement`가 '감정 받기' ② 갸웃 중 popstate → 사용자가 다른 칸(가격 버튼)에 초점을 둔 뒤 늦은 답 → 초점은 그 칸 그대로. 빨강 이유: ①은 `body`. ②는 지금도 통과할 수 있음(지키는 테스트). 커밋: `CAREER-32: busy note focus unit tests`
- R1-F (frontend-dev): `app/src/App.jsx`만. 커밋: `CAREER-32: keep focus when busy note goes away`
- 검사: `checks.app` 전부(lint · test · e2e · build · api)


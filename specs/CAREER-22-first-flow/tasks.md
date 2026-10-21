[CAREER-22](https://culonculon98.atlassian.net/browse/CAREER-22) · spec: [spec.md](spec.md) · plan: [plan.md](plan.md) · 약속: [contracts/appraise.md](../../contracts/appraise.md)

상태: 승인됨 (2026-10-21)

- 브랜치: `CAREER-22-first-flow` 하나. 순서: **U1 → (T1 ∥ T2) → U2 → T3 → T4 → T5**
  - T1·T2는 [P]: 서로 다른 파일이고 서로 기대지 않는다. 둘 다 test-writer라서 한 세션에서 차례로 해도 된다.
  - U2를 T3보다 먼저 하는 이유: `checks.app.e2e`가 채워져 있어야 frontend-dev 세션이 끝날 때 Stop 훅이 e2e를 **실제로** 돌린다(TODO면 건너뜀). T2 뒤에 하는 이유: `e2e/package.json`이 있어야 명령을 돌려 볼 수 있다.
- 모든 명령은 **저장소 루트**에서 돌린다(CI와 같은 자리). `cd e2e`가 들어간 명령은 `bash -c '…'`나 서브셸로 돌려 루트로 돌아온다.
- 세션 보고에는 검사 출력을 **그대로** 붙인다. PR '검사 결과' 칸에는 CI 링크만.
- 요소 이름·testid는 plan.md '테스트와 구현 사이의 약속' 표가 원본이다. 값(마음 가격 id·태그 id·이름·가짜 결과)은 contracts/appraise.md가 원본이다.

---

## U1 — 승인과 태그 이름 · 순서 1
- 담당: **사용자**
- 파일: `contracts/appraise.md` §3 (태그 이름 16개 — 사용자가 직접 쓰거나 architect에게 알려 주면 architect가 옮긴다), 같은 파일 맨 위 상태 줄, `plan.md`·`tasks.md` 상태 줄
- AC: AC-4(이름의 원본), 만들기 시작 조건(CLAUDE.md §4)
- 단계
  1. plan.md를 읽고 승인한다. 열린 질문 4에서 A·B·C 가운데 하나를 고른다(U2에 쓸 값).
  2. contracts §3 표를 태그마다 한 줄(`| \`how\` | 어떻게 왔나 | \`how-1\` | 이름 |`)로, 묶음별 6·4·4·2줄 채운다. id는 그대로 두고 이름만 넣는다. 표 아래 `<!-- 사용자가 채울 꼴 … -->` 주석은 지운다.
  3. contracts 상태를 `확정 (2026-MM-DD)`로, plan·tasks 상태를 `승인됨 (…)`으로 바꾼다.
  4. 커밋: `CAREER-22: appraise contract and plan`
- 검사 명령: ``grep -c '(사용자' contracts/appraise.md; for g in how now feeling brag; do printf '%s ' "$g"; grep -cE "\`$g-[0-9]+\` \| [^(| ]" contracts/appraise.md; done; sed -n 3p contracts/appraise.md``
  (기대: 첫 줄 `0`, 이어서 `how 6` · `now 4` · `feeling 4` · `brag 2`, 마지막 줄에 '확정')
- 끝난 상태: '(사용자: …)' 자리 표시가 0개이고, 태그 이름이 16개(6·4·4·2)이며, contracts 상태가 '확정'이다.

## T1 — 단위 테스트 쓰기 (빨강) · 순서 2 · [P]
- 담당: test-writer
- 파일 (새로): `app/tests/appraise.test.js` · `app/tests/FirstFlow.test.jsx`
- AC: AC-2 · AC-3 · AC-4 · AC-5 · AC-6 · AC-7 · AC-8 · AC-9
- 공통 규칙
  - `test`·`expect`·`vi`·`afterEach`·`beforeEach`는 `vitest`에서 import한다(전역 없음).
  - `FirstFlow.test.jsx` 맨 첫 줄: `// @vitest-environment jsdom`. `afterEach(cleanup)`을 직접 건다(plan 실패 시나리오 5).
  - `render`·`screen`·`fireEvent`·`within`·`cleanup`은 `@testing-library/react`에서. `user-event`·MSW는 쓰지 않는다(새 의존성을 줄인다 — plan '고른 이유').
  - `URL.createObjectURL = vi.fn(() => 'blob:test')`, `URL.revokeObjectURL = vi.fn()`을 `beforeEach`에서 넣는다(jsdom에 없음, 실패 시나리오 4).
  - 사진: `new File(['x'], 'cat.png', { type: 'image/png' })` / 잘못된 파일: `new File(['x'], 'note.txt', { type: 'text/plain' })` → `fireEvent.change(getByLabelText('사진 고르기'), { target: { files: [file] } })`.
  - `process`·`Buffer`·`__dirname`을 쓰지 않는다(lint 실패, 실패 시나리오 6).
  - 테스트마다 AC 번호를 이름이나 한 줄 주석에 적는다.
- `app/tests/appraise.test.js` (node 환경)
  - AC-9 모양: `vi.useFakeTimers()` → `myPrice` 4개 × `tags` `[]`·`['how-1','now-2','brag-1']`로 `appraise({ photo: new File(['x'],'a.png',{type:'image/png'}), myPrice, tags })` → `await vi.advanceTimersByTimeAsync(FAKE_DELAY_MS)` → 결과의 `Object.keys(r).sort()`가 `['line','mochi']`, `Number.isInteger(r.mochi) && r.mochi >= 0`, `typeof r.line === 'string' && r.line.trim() !== ''`.
  - AC-9 부르는 곳 하나: `readdirSync(new URL('../src/', import.meta.url), { recursive: true })`에서 `.js`·`.jsx` 파일 중 `appraise.js` 자신을 빼고, 내용이 `/from\s+['"]\.\/appraise(\.js)?['"]/`에 맞는 파일 수가 정확히 1.
- `app/tests/FirstFlow.test.jsx` (jsdom). 렌더는 `render(<StrictMode><App /></StrictMode>)` (실패 시나리오 3)
  - AC-2: txt를 고름 → `queryByRole('img', { name: '고른 사진 미리보기' })`가 null, `getByRole('alert')`에 `다시 골라`, 마음 가격을 골라도 '감정 받기' `disabled`. png를 고른 뒤 txt를 고르면 미리보기가 사라진다.
  - AC-3: '마음 가격' 그룹 안 버튼이 정확히 4개이고 글자가 contracts §2 순서대로 → `🍡 1개` 클릭 → `🙅 안 팔아` 클릭 → `aria-pressed="true"`는 `🙅 안 팔아` 하나만, 나머지 셋은 `"false"`.
  - AC-4: '사연 태그' 그룹 안 묶음 그룹 이름이 순서대로 `어떻게 왔나`·`지금 상태`·`마음`·`자랑`, 각 버튼 수 6·4·4·2, 버튼 글자가 contracts §3 이름과 같다(이름 16개를 테스트에 그대로 옮긴다) → 서로 다른 태그 A·B 클릭 → A 다시 클릭 → A `false`, B `true`.
  - AC-5: 첫 화면과 결과 카드가 나온 뒤 모두 `container.querySelectorAll('textarea, input:not([type=file]), [contenteditable]:not([contenteditable=false])').length === 0`.
  - AC-6: (a) 처음 (b) png만 (c) 마음 가격만(새로 렌더) — 셋 다 '감정 받기' `disabled`. png + 마음 가격 → 활성(태그 0개).
  - AC-7: `vi.mock('../src/appraise.js', …)`로 `appraise`를 `vi.fn()`으로 바꾸고, 직접 쥔 Promise(`let resolve; new Promise(r => resolve = r)`)를 돌려준다. png + `🍡 10개` + 태그 `how-1` 자리 버튼 하나 → '감정 받기' 클릭 2번 연달아 → 아저씨 자리(`getByRole('status', { name: '감정사 아저씨' })`)에 `갸웃`, 버튼 `disabled`, `appraise` 호출 1번, 받은 인자가 `{ photo: <고른 File>, myPrice: 'ten', tags: ['how-1'] }`(`toHaveBeenCalledWith`, `photo`는 같은 객체).
  - AC-8: 위에서 `resolve({ mochi: 7, line: '테스트 대사' })` → `findByRole('region', { name: '감정 결과' })` → 아저씨 자리 `도장`, `getByTestId('appraised-price')` = `모찌 7개`, `my-price` = `모찌 10개`, `mascot-line` = `테스트 대사`. 한 번 더: `🙅 안 팔아`로 하면 `my-price` = `안 팔아`.
- 단계
  1. 두 파일을 쓴다.
  2. 검사 명령을 돌려 lint는 통과, test는 **실패**하는지 본다. 실패 이유가 '모듈·패키지 없음'(`@testing-library/react`, `jsdom`, `../src/appraise.js`) 또는 '요소 없음'이어야 한다 — 문법 오류면 고친다. 기존 `App.test.jsx`는 통과로 남는다.
  3. 커밋: `CAREER-22: first flow unit tests`
- 검사 명령: `npm --prefix app run lint && { npm --prefix app test; echo "exit=$?"; }`
- Stop 훅: test-writer는 lint만 돈다. 정상이다.
- 끝난 상태: lint 종료 코드 0, test `exit`가 0이 아니고, AC-2~AC-9가 모두 테스트 이름·주석에 있다.

## T2 — e2e 패키지와 흐름 테스트 (빨강) · 순서 2 · [P]
- 담당: test-writer
- 파일 (새로): `e2e/package.json` · `e2e/package-lock.json` · `e2e/playwright.config.js` · `e2e/first-flow.spec.js` · `e2e/.gitignore`
- AC: AC-1 · AC-2 · AC-3 · AC-4 · AC-5 · AC-6(a)(b) · AC-7 · AC-8 · AC-10 · AC-11의 바탕
- 단계
  1. `e2e/package.json`: `{"name":"e2e","private":true,"type":"module","scripts":{"test":"playwright test"}}` → `npm --prefix e2e install -D @playwright/test` (lock 생김).
  2. `e2e/playwright.config.js`: plan.md '열린 질문 5' 표 값 **그대로**. 만든 뒤 고치기는 훅이 막는다 — 쓰기 전에 표와 한 줄씩 대조한다(실패 시나리오 9).
  3. `e2e/.gitignore`: `test-results/`, `playwright-report/`.
  4. `e2e/first-flow.spec.js`
     - 사진: `{ name: 'cat.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64') }` (1×1 PNG, 파일을 따로 두지 않는다). txt: `{ name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') }`.
     - 테스트 1 `first flow end to end (AC-1,3,4,5,6,7,8,10)` — 한 흐름:
       1. `page.context().on('request', r => requests.push({ url: r.url(), body: r.postDataBuffer() }))`를 `goto` **전에** 건다.
       2. `goto('/')` → AC-5 입력칸 0개(`page.locator('textarea, input:not([type=file]), [contenteditable]:not([contenteditable=false])')` `toHaveCount(0)`) → AC-6(a) '감정 받기' `toBeDisabled()`.
       3. AC-1: `getByLabel('사진 고르기').setInputFiles(png)` → `getByRole('img', { name: '고른 사진 미리보기' })` `toBeVisible()` → AC-6(b) 여전히 비활성.
       4. AC-3: '마음 가격' 그룹 버튼 `toHaveCount(4)` → `🍡 1개` → `🍡 10개` 클릭 → `🍡 10개`만 `aria-pressed="true"`.
       5. AC-4: '사연 태그' 묶음 4개의 버튼 수 6·4·4·2 → 태그 둘 클릭 → 하나 다시 클릭 → 하나만 `true`.
       6. AC-6: '감정 받기' `toBeEnabled()` → 클릭 → AC-7: 아저씨 자리 `toHaveText(/갸웃/)`, 버튼 `toBeDisabled()`.
       7. AC-8: 아저씨 자리 `toHaveText(/도장/)` → `getByTestId('appraised-price')` `toHaveText(/^모찌 \d+개$/)`, `my-price` `toHaveText('모찌 10개')`, `mascot-line` `toHaveText(/\S/)`. AC-5를 한 번 더.
       8. AC-10: 모든 `url`이 `http://127.0.0.1:5199/`로 시작하거나 `blob:`·`data:`로 시작 → 아닌 것 목록이 `[]`. `body !== null`인 요청이 `[]`. (실패 메시지에 걸린 URL이 보이도록 배열을 그대로 `expect(...).toEqual([])`)
     - 테스트 2 `rejects non-image file (AC-2)`: png → txt 순서로 고름 → 미리보기 `toHaveCount(0)`, `getByRole('alert')` `toContainText('다시 골라')`, 마음 가격을 골라도 '감정 받기' 비활성.
     - `waitForTimeout`을 쓰지 않는다. `test.only`를 남기지 않는다.
  5. 검사 명령을 돌린다. `--list`에 테스트 2개가 보이고, 실행은 **실패**해야 한다. 실패 이유가 설정 오류(`webServer` 시작 실패, 모듈 못 찾음)가 아니라 요소 못 찾음(`사진 고르기`)이어야 한다. dev 서버가 뜨지 않으면 루트에서 `npm --prefix app ci`를 먼저 했는지 본다.
  6. 커밋: `CAREER-22: first flow e2e test`
- 검사 명령: `bash -c 'cd e2e && npm ci && npx playwright install chromium && npx playwright test --list && { npx playwright test; echo "exit=$?"; }'`
- 끝난 상태: `--list`가 2 tests, 실행 `exit`가 0이 아니고 실패 위치가 첫 요소 찾기, `git status --porcelain e2e`에 `test-results`·`node_modules`가 없다.

## U2 — `checks.app.e2e` 채우기 · 순서 3
- 담당: **사용자(앞 세션, infra-dev와 함께)** — 역할 쓰기 구역 밖(`pipeline.config.json`)
- 파일: `pipeline.config.json`의 `checks.app.e2e`
- AC: AC-11의 전제
- 단계
  1. U1에서 고른 선택지(plan '열린 질문 4')의 값을 그대로 넣는다. 추천 A: `cd e2e && npm ci && npx playwright install --with-deps chromium && npx playwright test`
  2. 로컬에서 한 번 돌린다(브라우저를 미리 받아 Stop 훅 120초를 넘지 않게 — 실패 시나리오 10). 아직 화면이 없으니 **실패가 정상**이다. 확인할 것: (a) macOS에서 `--with-deps`가 sudo를 묻지 않고 지나가는지 (b) 실패가 T2와 같은 자리(요소 못 찾음)인지.
     - (a)에서 sudo를 묻거나 실패하면 값을 `--with-deps` 없는 꼴로 하고, CI에서는 어떻게 할지 infra-dev와 다시 정한다(B나 C).
  3. spec '열린 질문 4'를 '정해진 것'으로 옮긴다(spec-writer나 사용자).
  4. 커밋: `CAREER-22: e2e check command`
- 검사 명령: `jq -r '.checks.app.e2e' pipeline.config.json; bash -c "$(jq -r '.checks.app.e2e' pipeline.config.json)"; echo "exit=$?"`
- 끝난 상태: 값이 TODO가 아니고, 한 번 돌려서 실패 이유가 요소 못 찾음이다(브라우저 설치 오류가 아님).

## T3 — 첫 흐름 화면 만들기 (초록) · 순서 4
- 담당: frontend-dev
- 파일
  - 새로: `app/src/options.js` · `app/src/appraise.js`
  - 고침: `app/src/App.jsx` · `app/package.json` · `app/package-lock.json`
- AC: AC-1~AC-10 (테스트 통과), AC-11
- 단계
  1. `npm --prefix app install -D jsdom @testing-library/react @testing-library/dom` — peer 충돌이 나면 멈추고 보고한다. `--force`·`--legacy-peer-deps`를 쓰지 않는다.
  2. `app/src/options.js`: contracts §2 표(`id`·버튼 글자·카드 글자)와 §3 표(묶음 id·제목, 태그 id·이름)를 그대로 옮긴 배열 두 개를 내보낸다. 순서도 표 그대로.
  3. `app/src/appraise.js`: contracts §6 그대로. `export const FAKE_DELAY_MS = 800`, `export async function appraise(input)` → `setTimeout`으로 800ms 기다린 뒤 `{ mochi: 3, line: '흠… 사연이 묻어 있구먼.' }`. `input.photo`를 읽지 않는다. 네트워크 API를 쓰지 않는다.
  4. `app/src/App.jsx`: plan '테스트와 구현 사이의 약속' 표 그대로. 상태는 `photo`·`previewUrl`·`fileError`·`myPrice`·`tags`(Set이나 배열)·`status`(`idle`|`thinking`|`done`)·`result`. `appraise`는 이 파일에서만 import하고, '감정 받기' 클릭 처리기 안에서만 부른다(useEffect 금지). `tags`는 contracts 표 순서로 정렬해 넘긴다. `<h1>how-much</h1>`는 남긴다.
  5. 선택됨은 `aria-pressed`와 함께 눈에도 보이게(테두리 두께·배경 등). 인라인 `style`로 충분하다 — CSS 파일을 새로 만들어도 되지만 `app/public/`은 쓰지 않는다.
  6. 검사 명령을 돌린다. 실패하면 **테스트를 고치지 않고** 화면을 고친다. 테스트가 plan·contracts와 어긋나 보이면 멈추고 보고한다.
  7. 흔들림 확인: `bash -c 'cd e2e && npx playwright test --repeat-each=10'` — 20번 모두 통과해야 한다.
  8. dev 서버를 켜고 **주소만** 보고한다 → 사용자가 브라우저로 한 번 끝까지 해 보고, 선택됨이 눈으로 보이는지 확인한다(AC-3 '눈으로도'). 확인 뒤 끈다.
  9. 커밋: `CAREER-22: first flow screen with fake appraiser`
- 검사 명령 (CI처럼 루트에서 `checks.app`을 차례로):
  ```
  for n in lint test build e2e; do echo "== $n"; bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)" || exit 1; done && git status --porcelain app e2e
  ```
- Stop 훅: U2 덕분에 lint·test·build·e2e가 실제로 돈다.
- 끝난 상태: 검사 명령 종료 코드 0, test 출력에 실패 0·통과 1개 이상(기존 1 + 새 테스트), e2e 출력에 `2 passed`, `--repeat-each=10`이 `20 passed`, `git status`에 `node_modules`·`dist`·`test-results`가 없고, 사용자가 단계 8을 확인했다.

## T4 — e2e가 실패를 잡는지 확인 (AC-12) · 순서 5
- 담당: frontend-dev (결과 카드는 ui 구역)
- 파일: `app/src/App.jsx` (잠깐 바꿨다 되돌림 — 커밋하지 않음)
- AC: AC-11 · AC-12
- 단계
  1. AC-11: `bash -c "$(jq -r '.checks.app.e2e' pipeline.config.json)"; echo "exit=$?"` → `2 passed`, `exit=0`. 출력을 그대로 보고에 붙인다.
  2. AC-12: 결과 카드의 `mascot-line` 요소가 빈 글자를 보이게 바꾼다(예: `{result.line}` → `{''}`) → 1의 명령 → `exit`가 0이 아니고 실패 위치가 `mascot-line`인지 본다. 출력을 그대로 보고에 붙인다.
  3. `git restore app/src/App.jsx` → 1을 다시 돌려 `exit=0`. `git diff app/src`가 비었는지 본다. 되돌리지 않고 끝내면 Stop 훅이 실패로 잡는다.
- 검사 명령: `bash -c "$(jq -r '.checks.app.e2e' pipeline.config.json)"; echo "exit=$?"; git diff --stat app/src`
- 끝난 상태: 1·3의 `exit=0`, 2의 `exit`가 0이 아니고, `git diff --stat app/src`가 비었다. 커밋 없음(보고만).

## T5 — PR과 CI · 순서 6
- 담당: frontend-dev(PR 열기) · 사용자(머지)
- 파일: 없음(PR 본문 — `.github/pull_request_template.md` 틀)
- AC: 전부(대조표), AC-11(CI — U2에서 A를 골랐을 때)
- 단계
  1. PR 제목 `CAREER-22: first flow with fake appraiser`.
  2. PR 칸
     - 결정: e2e는 `e2e/` 독립 패키지 + `webServer`(plan 질문 5), 가짜 감정 800ms·고정 값(질문 6), 단위 테스트 DOM = jsdom + Testing Library, U2에서 고른 질문 4 선택지(B라면 'CI 요약의 통과는 실제로 안 돈 것'을 적는다)
     - 범위 변경: 없음
     - 새 의존성: `app` devDependencies `jsdom` · `@testing-library/react` · `@testing-library/dom`, `e2e` devDependencies `@playwright/test` — 버전과 이유 한 줄씩
     - 비용·남용 영향: spec 그대로(없음 — AI 호출·새 입구 없음, AC-10으로 확인). A를 골랐다면 'CI 시간 늘어남(분)'을 적는다
     - spec 완료 조건 AC-1~AC-12 ✔/✘ 대조
     - '검사 결과' 칸은 CI 링크만
  3. CI `checks / app` 요약을 본다. `npm ci`가 linux 바이너리 문제로 실패하면 `docs/runbook/로컬-실행.md` 'lock 다시 만들기'(`app/`·`e2e/` 각각).
- 검사 명령: `gh pr checks --watch` 뒤 CI `checks / app` 요약 확인
- 끝난 상태: 요약에 `통과: app.lint`·`app.test`·`app.build`, 그리고 A면 `통과: app.e2e`(B면 건너뜀 문구가 찍혀 있음)가 있고, 모든 필수 검사가 통과다.

---

## AC ↔ 작업
| AC | 테스트 | 통과시키는 곳 | 그 밖 |
|---|---|---|---|
| AC-1 | T2 테스트 1 | T3 | |
| AC-2 | T1 · T2 테스트 2 | T3 | |
| AC-3 | T1 · T2 | T3 | 눈으로: T3 단계 8 (사용자) |
| AC-4 | T1 · T2 | T3 | 이름의 원본: U1 |
| AC-5 | T1 · T2 | T3 | |
| AC-6 | T1 (a)(b)(c) · T2 (a)(b) | T3 | |
| AC-7 | T1 (호출 1번) · T2 | T3 | |
| AC-8 | T1 · T2 | T3 | |
| AC-9 | T1 `appraise.test.js` | T3 | |
| AC-10 | T2 테스트 1 단계 8 | T3 | |
| AC-11 | T2 | T3 | U2 (명령) → T4 단계 1 |
| AC-12 | — | — | T4 단계 2·3 |

[CAREER-35](https://culonculon98.atlassian.net/browse/CAREER-35) · spec: [spec.md](spec.md) · plan: [plan.md](plan.md) · ADR: [0009](../../docs/adr/0009-six-steps-history-ladder.md) · 약속: [contracts/appraise.md](../../contracts/appraise.md) §5

상태: 승인됨 (2026-11-01)

- 방식: **맡긴다**. 브랜치 `CAREER-35-shop-screen` 하나. 순서: **U1 → T1 → T2~T11 → F1 → F2 → F3 → F4 → F5 → F6 → F7 → H0 → P1 → (머지 · 배포 뒤) H1 · R1 → 시간이 남으면 D1 → D2 → D3 → D4 → D5**
  - [P] = 같은 역할 세션 안에서 차례를 바꿔도 되는 것(파일이 겹치지 않음). T2~T11은 [P]이고 T1의 돕는 함수가 먼저다. F는 모두 `App.jsx`를 건드려 [P]가 없다.
  - 테스트 커밋(T)이 모두 구현 커밋(F)보다 먼저다.
- **U1 전에는 만들지 않는다**(CLAUDE.md §4). contracts가 U1에서 확정된다.
- **F7 · P1까지가 완료 조건 전부다.** D는 없어도 AC-1~13이 선다.
- 명령은 **저장소 루트**에서. 세션 보고에는 출력 그대로, PR '검사 결과' 칸에는 CI 링크만.
- 이름 · 글자의 원본: plan A1 '코드 모양' · '상태 흐름' · '초점 · 이름표' · '글자의 원본'. §5 문구의 원본은 `options.js` · contracts.
- 테스트가 실패하면 **느슨하게 고치지 않는다.** 화면을 고치거나 멈춘다. 이미 있는 테스트는 T11 짝 표 말고는 고치지 않는다. `e2e/playwright.config.js`는 고칠 일이 없다(plan A4). 고쳐야 한다는 결론이 나오면 멈춘다.
- 공통 고정값: 첫 답 `{ mochi: 30, line: '흠… 귀한 물건이군!' }` · 고르는 것 png · `🍡 10개` · `🎁 선물` · **30자 대사** `'가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나'`.
- 공통 검사: `unit` = `npm --prefix app run lint && { npm --prefix app test; echo "unit exit=$?"; }` / `e2e` = `bash -c "$(jq -r '.checks.app.e2e' pipeline.config.json)"; echo "e2e exit=$?"`

---

## U1 — 승인 · contracts 고침 · 서버 확인 · 순서 1
- 담당: **사용자** (contracts · ADR 글 고침은 architect 세션)
- 파일: `specs/CAREER-35-shop-screen/plan.md` · `tasks.md` · `docs/adr/0009-six-steps-history-ladder.md` · `docs/adr/0008-screens-without-url-change.md`(상태 줄) · `contracts/appraise.md`(§5 후보)
- AC: 만들기 시작 조건 · AC-13(contracts 범위)
- 단계
  1. plan '사용자가 정할 것' 1~5를 고른다.
  2. 서버에서 `sudo nginx -T 2>/dev/null | grep -nE 'mime.types|default_type|woff2'`(읽기만) → 결과를 plan A3 표에 적는다.
  3. architect 세션이 §5를 후보대로 고치고 ADR-0009 `확정` · ADR-0008 `0009로 대체됨` · plan · tasks `승인됨`으로 바꾼다. 고른 값(글꼴 방법 · 무게 기준선)을 plan에 적는다.
  4. 커밋: `CAREER-35: shop screen plan, ADR-0009 and contract faces`
- 검사 명령: `npm --prefix app test -- FirstFlow connect ThreeScreens; grep -m1 -H '^상태' specs/CAREER-35-shop-screen/plan.md specs/CAREER-35-shop-screen/tasks.md; grep -m1 -H '^- 상태' docs/adr/0009-six-steps-history-ladder.md`
- 끝난 상태: 문구를 파싱하는 테스트가 그대로 통과(§5 고침이 파싱을 안 깸) · 세 줄이 `승인됨` / `확정`.

## T1 — AC-1 · AC-2 단계 단위 테스트 + 돕는 함수 (빨강) · 순서 2
- 담당: test-writer
- 파일: `app/tests/shop-steps.jsx` (새로) · `app/tests/ShopSteps.test.jsx` (새로)
- AC: AC-1 · AC-2
- 돕는 함수(`expect` 넣지 않음): `renderApp`(StrictMode) · `png` · `jpg` · `txt` · `enter()`('가게에 들어가기') · `next()`(이름 `다음`) · `pickFile` · `pickPrice` · `pickTag` · `submit()`(이름 `감정 받기!`) · `toPhoto()` · `walkToPrice({ photo = png(), tags = ['🎁 선물'] })`(①→④) · `reject(code)` · `hold()`(ThreeScreens 47~56줄 꼴) · `face()`(`queryByTestId('uncle')?.getAttribute('data-face') ?? null`) · `back()`(`history.back()` 뒤 `popstate` 한 번을 `act`로 기다림) · `resetHistory()`(`history.replaceState(null, '')`). 머리: `vi.mock('../src/appraise.js', …)`는 각 테스트 파일에 둔다.
- 테스트
  - `CAREER-35 AC-1 six steps appear one at a time`: `hold()` → ① 버튼은 `가게에 들어가기`뿐 · 사진 칸 · 묶음 없음 → ②는 사진 칸 · `다음`만 · png 고름 → 미리보기 → ③은 `사연 태그`만 → ④는 `마음 가격` · `getByText(REGION_NOTICE)` · `감정 받기!`만 → ⑤는 `queryAllByRole('button')` 0개 · `getByRole('progressbar', { name: '감정 중' })` · `aria-valuenow` 없음 · `%` 글자 없음 → 답 풀기 → ⑥은 `appraised-price` · `my-price` · `compare-line` · `mascot-line` · `다른 물건 꺼내기` · 고르는 칸 없음. 단계마다 `location.pathname === '/'` · `location.hash === ''`.
  - `CAREER-35 AC-2 next is off until a jpg or png is chosen`: `다음` 꺼짐 → `txt` → 꺼짐 · 문구 `사진을 다시 골라 주세요 (jpg·png)` → `jpg` → 켜짐.
  - `CAREER-35 AC-2 tags can be skipped`: 태그 없이 ④ → 가격 → 누름 → `appraise` 인자 `tags` `[]`.
  - `CAREER-35 AC-2 submit is off until a price is chosen` · `CAREER-35 AC-2 tags match contract §3 and are sent in contract order`(FirstFlow 17~22줄 표 · 눌린 차례와 다르게) · `CAREER-35 AC-2 chosen chip is pressed`(`aria-pressed` `true`/`false`).
- 단계: 1. 쓴다. 2. `unit` → 이 파일만 새로 실패하고 이유가 '`가게에 들어가기`를 못 찾음'. 3. 커밋: `CAREER-35: six steps unit tests`
- 검사 명령: `unit`
- 끝난 상태: lint 0 · 실패 이유가 위 하나.

## T2 [P] — AC-3 요청 수 e2e (빨강) · 순서 3
- 담당: test-writer
- 파일: `e2e/shop-steps.js` (새로) · `e2e/shop-requests.spec.js` (새로)
- AC: AC-3
- `e2e/shop-steps.js`(`expect` 넣지 않음): `png` · `ok` · `fail` · `routeQueue` · `countPosts`(three-screens-history 7~58줄 꼴) · `enter` · `next` · `walkToTags(page)` · `walkToPrice(page, { tag = '🎁 선물' })` · `submitOf`(`{ name: '감정 받기!', exact: true }`) · `uncle`(`getByTestId('uncle')`).
- 테스트(`test.use`는 three-screens-history 5줄과 같음)
  - `CAREER-35 AC-3 nothing is sent from step 1 to 4, tags skipped or not` → 0.
  - `CAREER-35 AC-3 double press sends once` · `dblclick` → `expect.poll` 1.
  - `CAREER-35 AC-3 another item does not send; pressing on step 4 does` → 1 → `다른 물건 꺼내기` → 1 → 다시 걸어가 누름 → 2.
  - `for code` refused · unavailable · person_limit · daily_limit(상태 번호는 `contracts/appraise-http.md` §5 그대로): `CAREER-35 AC-3 ${code} button does not send` → 버튼 → 수 그대로 → ④에서 누를 때만 +1.
  - `CAREER-35 AC-3 back, forward and reload do not send`.
- 단계: 1. 쓴다. 2. `e2e` → 이 파일이 실패하고 이유가 `가게에 들어가기` 못 찾음. 3. 커밋: `CAREER-35: request count e2e`
- 검사 명령: `e2e`
- 끝난 상태: `exit` 0 아님 · 위 이유 · 출력에 `[guard-8787] 받은 요청 0개`.

## T3 [P] — AC-4 표정 · 장면 단위 테스트 (빨강) · 순서 3
- 담당: test-writer
- 파일: `app/tests/ShopFaces.test.jsx` (새로)
- AC: AC-4
- `test.each` `CAREER-35 AC-4 %s shows %s`: ①·⑥ `happy` · ②③④ · busy · invalid_input `base` · ⑤ `think` · refused `frown` · unavailable · 코드 없음 `sweat` · person_limit `sleepy`. 모두 `shop-scene`의 `data-scene="day"` · `shop-item` 4개(`vase` · `clock` · `bear` · `lamp`) · `shop-counter` 있음.
- `CAREER-35 AC-4 daily_limit has no uncle`: `face() === null` · `data-scene="night"` · `closed-sign` 글자 `오늘 영업 끝`.
- 단계: 1. 쓴다. 2. `unit` → 새 실패가 이 파일 · 이유가 ①을 못 찾음. 3. 커밋: `CAREER-35: face and scene unit tests`
- 검사 명령: `unit`
- 끝난 상태: lint 0 · 위 이유.

## T4 [P] — AC-5 실패 · 퇴근 · 바쁨 + '다른 물건' 단위 테스트 (빨강) · 순서 3
- 담당: test-writer
- 파일: `app/tests/ShopFailure.test.jsx` (새로)
- AC: AC-5 (+ Q2 '다른 물건')
- `describe.each` 첫 감정 · 앞 결과 뒤(`back()`으로 ④)
  - ① `test.each` 코드 다섯: `appraise-error`(또는 `off-duty`)가 `ERROR_TEXT` · `OFF_DUTY_TEXT`와 `textContent` 그대로, 코드 없음은 `unavailable` 문구, 실패는 `role="alert"`, `감정 결과` 없음, `공유` 이름 버튼 없음.
  - ② 버튼 → refused는 ②(미리보기 있음) · 나머지는 ④(가격 `aria-pressed` 그대로) · ③까지 `back()`해 태그 그대로 · 문구 남음.
- `CAREER-35 AC-5 ③ invalid_input returns to step 2`: 자동으로 ② · 문구 · 고른 것 그대로 → 다른 사진 → 문구 없음.
- `CAREER-35 AC-5 ④ back while thinking shows busy, then a retry works`: `hold()` → 누름 → 뒤로 → `감정 받기!` 꺼짐 · `BUSY_TEXT` 글자 그대로 → 풀기 → `감정 결과` 없음 · 안내 없음 · 켜짐 → **다시 누름 → 새 답 → ⑥** · `appraise` 2번. 늦은 답이 실패일 때도 한 건.
- `CAREER-35 Q2 another item clears everything and goes to step 2`: ⑥ → 버튼 → 사진 칸 · 미리보기 없음 · `다음` 꺼짐 → 걸어가 ③ · ④에서 눌린 칩 0개 · `face() === 'base'`.
- 단계: 1. 쓴다. 2. `unit` → 새 실패가 이 파일. 3. 커밋: `CAREER-35: failure and busy unit tests`
- 검사 명령: `unit`
- 끝난 상태: lint 0.

## T5 [P] — AC-6 값 공개 단위 테스트 (빨강) · 순서 3
- 담당: test-writer
- 파일: `app/tests/ShopReveal.test.jsx` (새로)
- AC: AC-6
- `test.each` `CAREER-35 AC-6 price %s, server %s shows %s`
  | 고른 값 | `mochi` | `compare-line` `textContent` | `my-shown` |
  |---|---|---|---|
  | 10 | 30 | `▲ 아저씨가 더 쳐줬다!` | `🍡 × 10` |
  | 10 | 3 | `▼ 아저씨는 좀 짜게 봤다` | `🍡 × 10` |
  | 10 | 0 | `▼ 아저씨는 좀 짜게 봤다` | `🍡 × 10` |
  | 10 | 10 | `= 자네 눈이 제법이군!` | `🍡 × 10` |
  | 안 팔아 | 30 | `안 판다니… 그래도 값은 매겨 봤네` | `안 팔아` |
- 각각 `appraised-shown` `🍡 × N` · `appraised-price` `모찌 N개` · `my-price` · `mascot-line`이 `line` 그대로. 글자는 위 표를 그대로 적는다(spec 사용자 답).
- `CAREER-35 AC-6 the result appears as soon as the answer comes`: 풀기 → 다음 렌더에서 `감정 결과` 있음 · 진행 막대 없음(타이머 없음).
- 단계: 1. 쓴다. 2. `unit`. 3. 커밋: `CAREER-35: reveal unit tests`
- 검사 명령: `unit`
- 끝난 상태: lint 0 · 새 실패가 이 파일.

## T6 [P] — AC-7 뒤로 · 앞으로 · 새로고침 (빨강) · 순서 3
- 담당: test-writer
- 파일: `e2e/shop-history.spec.js` (새로) · `app/tests/ShopHistory.test.jsx` (새로)
- AC: AC-7 · ADR-0009
- e2e(모든 화면에서 `expectRoot` — three-screens-history 67~71줄 꼴)
  - `CAREER-35 AC-7 back walks one step at a time with choices kept`: ④ 가격 고름 → 뒤로 ③ 태그 → 뒤로 ② 미리보기 → 뒤로 ① → 눌림 · 사진은 다시 걸어가 그대로.
  - `for where` ⑥ · refused · unavailable · person_limit · daily_limit: `CAREER-35 AC-7 back from ${where} goes to step 4`.
  - `CAREER-35 AC-7 forward after back shows no old card`.
  - `CAREER-35 AC-7 back never shows an old card after three appraisals`: 감정 3번 후 끝까지 뒤로, 매번 `감정 결과` 0.
  - `for where` ②③④⑤⑥ · 실패 · 퇴근: `CAREER-35 AC-7 reload on ${where} starts on empty step 1`, 새 탭도 한 건.
  - `CAREER-35 AC-7 back and forward after reload never show steps 3-4 without a photo or an old result`: ③ · ⑥에서 새로고침 뒤 뒤로 · 앞으로 번갈아, 매번 사진 칸 없는 ③ · ④ · 결과 0개.
  - `CAREER-35 AC-7 nothing stays in browser storage`: ⑥에서 `localStorage.length` · `sessionStorage.length` 0 · `indexedDB.databases()` 빈 배열 · `history.state`가 `{ howMuch: 숫자 }`뿐.
  - `CAREER-35 AC-7 refused back to step 2 then back goes to step 1`(plan 시나리오 3).
- 단위
  - `CAREER-35 AC-7 entries never exceed five over many appraisals`: 시작 `history.length` → 감정 3번(사이 '다른 물건') → `+4` 이하.
  - `CAREER-35 AC-7 an old { howMuch: 'out' } entry does not break back`: `history.replaceState({ howMuch: 'out' }, '')` 뒤 그림 · 걸어가기 · `back()` 정상.
- 단계: 1. 쓴다. 2. `unit` · `e2e`. 3. 커밋: `CAREER-35: browser history e2e`
- 검사 명령: `unit` 다음 `e2e`
- 끝난 상태: 두 `exit` 0 아님 · 새 실패가 이 파일들.

## T7 [P] — AC-8 접근성 (빨강) · 순서 3
- 담당: test-writer
- 파일: `app/tests/ShopA11y.test.jsx` (새로) · `e2e/shop-a11y.spec.js` (새로)
- AC: AC-8
- 단위 `CAREER-35 AC-8 focus moves into each new step` — 처음 `activeElement === body`. 표(plan '초점 · 이름표') 그대로 도착마다 `activeElement`와 이름 확인: `getByRole('group', { name: '물건 꺼내기' })` · `사연 말하기` · `내 값 부르기` · ①로 뒤로 `가게 문` · ⑤ `getByRole('status', { name: '감정사 아저씨' })` · ⑥ `getByRole('region', { name: '감정 결과' })` + 안의 그룹 `값 공개` · 실패 `appraise-error` · 퇴근 status 칸.
- 단위 `CAREER-35 AC-8 drawn glyphs are not in accessible names`: 모든 화면의 버튼 이름에 `▶` · `▼` · `◀` · `↻` · `_` 없음 · `uncle` · `shop-item`은 `aria-hidden="true"`.
- e2e `CAREER-35 AC-8 keyboard can finish all six steps`: Tab · Space · Enter만으로 ①→⑥(사진은 `setInputFiles`).
- e2e `CAREER-35 AC-8 nothing moves with reduced motion`: `page.emulateMedia({ reducedMotion: 'reduce' })` → 모든 화면에서 `document.getAnimations().length === 0`. 움직임이 없는 지금은 F 뒤에 통과하고, D1~D5가 더해져도 지킨다.
- 단계: 1. 쓴다. 2. `unit` · `e2e`. 3. 커밋: `CAREER-35: accessibility tests`
- 검사 명령: `unit` 다음 `e2e`
- 끝난 상태: 새 실패가 이 파일들.

## T8 [P] — AC-9 지도 맞대기 (빨강) · 순서 3
- 담당: test-writer
- 파일: `app/tests/PixelMap.test.jsx` (새로)
- AC: AC-9 · 원본 plan A2
- 시안 읽기: `readFileSync(resolve(cwd(), '../specs/CAREER-35-shop-screen/mockup-v3.html'))`. `const U=` 뒤부터 `, I=` 앞까지와 `I=` 뒤를 `JSON.parse`, `PU` · `PI`는 객체 글자라 `new Function('return ' + 글자)()`. 못 찾으면 테스트 실패(빈 값으로 통과 금지).
- 테스트
  - `CAREER-35 AC-9 maps match the mockup`: `pixels.js`의 네 값이 `toEqual`. 표정 키 6개 · 물건 키 4개.
  - `CAREER-35 AC-9 sizes`: 표정 40줄 × 40칸, 물건 12칸 × 10줄(`vase` · `bear`) · 9줄(`clock` · `lamp`). 글자는 모두 `.` 또는 그 팔레트 안.
  - `test.each` `CAREER-35 AC-9 %s is drawn cell by cell`: `render(<Uncle face=… />)` / `<Item item=… />` → `svg`의 `<path>`마다 `d`를 `/M(\d+) (\d+)h1v1h-1z/g`로 풀고(남는 글자가 있으면 실패) `fill`과 함께 칸 표로 → 지도에서 팔레트로 바꾼 표와 `toEqual`. `.` 칸은 표에 없음. `viewBox` · `shape-rendering="crispEdges"` · `aria-hidden="true"`.
- 단계: 1. 쓴다. 2. `unit` → import 실패. 3. 커밋: `CAREER-35: pixel map tests`
- 검사 명령: `unit`
- 끝난 상태: lint 0 · 실패 이유가 `pixels.js` · `Pixel.jsx` 없음.

## T9 [P] — AC-10 글꼴 (빨강) · 순서 3
- 담당: test-writer
- 파일: `e2e/shop-font.spec.js` (새로) · `app/tests/FontBuild.test.js` (새로)
- AC: AC-10
- e2e
  - `CAREER-35 AC-10 no request leaves the site and the font arrives`: `context.on('request')`로 ①→⑥ 전부 기록 → `blob:` · `data:` 말고 다른 출처 0개 · `.woff2` 응답 1개 이상 `status 200` → `document.fonts.ready` 뒤 `Galmuri11` `FontFace.status === 'loaded'` · `getComputedStyle(button).fontFamily`가 `Galmuri11`로 시작.
  - `CAREER-35 AC-10 text is visible while the font is held`: `page.route('**/*.woff2', …)`로 붙잡음 → `FontFace.display === 'swap'` · 버튼 글자 박스 높이 > 0 · 눌러서 ②로 감 → 풀기.
- 단위 `CAREER-35 AC-10 build carries the font and the licence`(`{ timeout: 60_000 }`): `mkdtemp(os.tmpdir())`에 `execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', tmp, '--emptyOutDir'])` → `tmp/licenses/Galmuri-OFL.txt`에 `SIL OPEN FONT LICENSE` · `tmp/assets`에 `.woff2` · 빌드 글자 전체에 `jsdelivr` 없음 → `finally`에서 그 `tmp`만 지움.
- 단계: 1. 쓴다. 2. `unit` · `e2e`. 3. 커밋: `CAREER-35: font and licence tests`
- 검사 명령: `unit` 다음 `e2e`
- 끝난 상태: 새 실패가 이 파일들.

## T10 [P] — AC-11 + AC-2 크기 · 화면 찍기 (빨강) · 순서 3
- 담당: test-writer
- 파일: `e2e/shop-view.spec.js` (새로)
- AC: AC-11 · AC-2(높이 · `▶`) · plan A2(칸 흐림) · A5
- `test.use({ viewport: { width: 375, height: 548 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })`. 모두 `document.fonts.ready` 뒤. `inView`는 three-screens-view 70~72줄 꼴.
- 테스트
  - `CAREER-35 AC-11 steps 1, 4, 5 and 6 are in view`: ① 버튼 · ④ 가격 4개 · `#region-notice` · `감정 받기!` · ⑤ status 칸 · 막대 · ⑥ `값 공개` 그룹 · `appraised-shown` · `my-shown` · `compare-line` · `다른 물건 꺼내기`. **⑥은 공통 30자 대사로.**
  - `for code` refused · unavailable · person_limit · daily_limit: 문구 · 버튼 in view.
  - `CAREER-35 AC-11 busy and a leftover notice on step 4 are in view`: 바쁨 안내 · 꺼진 버튼 / unavailable에서 돌아온 ④의 문구 · 버튼 · 안내.
  - `CAREER-35 AC-11 next is reachable on steps 2 and 3`: `scrollIntoViewIfNeeded` 뒤 누를 수 있음. ③에서 스크롤한 채 `다음` → ④는 `scrollY === 0`.
  - `CAREER-35 AC-2 chips and buttons are tall enough`: 모든 칩 · 버튼 `boundingBox().height >= 24`(AC). A5 값 `>= 44`는 **별도 테스트** `CAREER-35 A5 chips and buttons are 44 or more`.
  - `CAREER-35 AC-2 chosen chip shows ▶`: `getComputedStyle(el.querySelector('.chip-mark'), '::before').content`에 `▶` · 안 고른 칩은 `none`.
  - `CAREER-35 AC-9 pixels stay on whole cells`: `uncle` 폭 % 40 === 0 · 조상까지 `transform === 'none'` · `shape-rendering` crispEdges.
  - `CAREER-35 Q9 shots`: 11화면(①~⑥ · refused · unavailable · person_limit · daily_limit · busy)을 `testInfo.outputPath('<화면>.png')`로 저장. 확인 없이 파일만 남긴다.
- 단계: 1. 쓴다. 2. `e2e`. 3. 커밋: `CAREER-35: 375x548 view e2e`
- 검사 명령: `e2e`
- 끝난 상태: `exit` 0 아님 · 새 실패가 이 파일.

<a id="t11"></a>
## T11 [P] — 이미 있는 테스트 옮기기 (A4 · AC-13) · 순서 3
- 담당: test-writer
- 파일: `app/tests/FirstFlow.test.jsx` · `ThreeScreens.test.jsx` · `ScreenHistory.test.jsx` · `connect.test.jsx` · `e2e/first-flow.spec.js` · `connect-screen.spec.js` · `daily-limit.spec.js` · `photo-upload.spec.js` · `three-screens-history.spec.js` · `three-screens-view.spec.js` — **아래 표 말고는 바꾸지 않는다**
- AC: AC-13 · 원본 plan A4

**짝 종류**
| 기호 | 지움 → 넣음 | 같은 것을 보나 |
|---|---|---|
| K1 | (지우지 않음) → 걸어가기 줄 더함 | 화면 넘기기 |
| K2 | 찾는 이름 `감정 받기` → `감정 받기!`(e2e는 `exact: true`) | 같은 버튼. `#region-notice + button`의 `toHaveText`도 |
| K3 | `갸웃` → `face()`/`uncle` `think` · `🔨 도장`/`도장` → `happy` · `대기` → 코드별(`frown` · `sweat` · `sleepy`, invalid_input은 `base`) · `not 갸웃/도장` → `not think/happy` · `🚶 퇴근` → `uncle` 0개 + `data-scene="night"`(입력 쪽에 남을 때는 `off-duty` 그대로로 본다) | spec AC-13 지정 짝(AC-4) |
| K4 | `다시 감정` → ⑥: `back()`/`goBack()` · refused `사진 다시 꺼내기` · unavailable `다시 감정 받기` · person_limit `조금 뒤에 다시` · daily_limit `내일 다시 오기` · invalid_input: 줄 지움(자동으로 ②) | spec AC-13 지정 짝(AC-5 · AC-7) |
| K5 | 한 화면에서 보던 사진 · 값 · 태그 → ④ 값 + `submit` / 뒤로 ③ 태그 / 뒤로 ② 미리보기 / `다음` 둘로 ④ | 같은 세 가지 |
| K6 | 사라진 전제 — 아래 표 '개별' | 칸마다 적음 |

**파일별**
| 파일 · 테스트 | 짝 |
|---|---|
| FirstFlow: 'AC-2 rejects' · 'AC-2 a bad file' · 'AC-1 preview' | K1(②까지) · '미리보기 · alert'는 그대로 / 개별: 'rejects'의 `pickPrice` + `submit().disabled` → `다음` 꺼짐(사진 없이 못 감) |
| FirstFlow: 'AC-3 four price' · 'AC-4' 둘 | K1 |
| FirstFlow: 'AC-5 no free-text' | K1 · K2 · **단계마다 `expect` 더함** |
| FirstFlow: 'AC-6a' · 'AC-6b' · 'AC-6c' | 개별: 'a' `submit` 꺼짐 → ②의 `다음` 꺼짐 · 'b' 사진만 → ④ 가격 전 `submit` 꺼짐 · 'c' 가격만(사진 없음) → ④까지 간 뒤 ②로 뒤로 나쁜 파일 → `다음` 꺼짐 |
| FirstFlow: 'AC-6 photo and price…' · 'AC-7 passes several tags' | K1 · K2 |
| FirstFlow: 'AC-7 thinking state' · 'AC-8' 둘 | K1 · K2 · K3 |
| FirstFlow: 'AC-7 invalid_input' · 'AC-7 failure code %s' | K1 · K2 · K3 · K4 / 개별: `submit().disabled` 확인 → ②의 `다음` 켜짐 |
| FirstFlow: CAREER-27 AC-9 셋 · CAREER-31 AC-5 | K1 · K2 · K3 · K4 ('off-duty text' · '30 chars'는 그대로) |
| ThreeScreens: AC-1 | K1 · K2 · K3 · K4 / 개별: 한 화면 입력 확인 → ②③④ 각 단계에서 |
| ThreeScreens: AC-2 ①② · `changing only %s` | K1 · K2 · K3 · K4(⑥ → `back()`) · K5 / 개별: `photo`는 ②까지 `back()`, `add/remove tag`는 ③까지 |
| ThreeScreens: AC-3 `%s: rejected with %s` | K1 · K2 · K3 · K4 · K5 / 개별: `findByRole('다시 감정')` → 코드별 버튼(invalid_input은 `appraise-error`), `noInputs()`는 invalid_input만 뺌, `pickFile(jpg())`는 ②까지 `back()` |
| ScreenHistory: AC-5 둘 · R1 셋 · 'popstate on a result' | K1 · K2 · K3 (`expectInputWithChoices`는 K5. `activeElement` 확인은 그대로) |
| ScreenHistory: 'history grows by at most one entry' | 개별: ④까지 걸어간 뒤 `before`를 재고, 감정 3번(사이 `back()`) → `<= before + 1` 그대로 · `{ howMuch: 'out' }` → `{ howMuch: 4 }` |
| connect: AC-2 둘 | K1 · K2 / 개별: 'before picking a photo'는 **④에서 가격 고르기 전**에 본다(이름 그대로 · 주석에 이유: 사진은 ②에서 고르고 나가기 전에 안내가 보인다, plan 'spec 메모') |
| connect: 'notice text' | K1(화면 쪽 줄만) |
| connect: 'CAREER-29 AC-4' | 안 고침 |
| first-flow: 'first flow end to end' | K1 · K2 · K3 / 개별: 줄 차례를 ② → ③(AC-4) → ④(AC-3) → 누름으로. 33줄 `submit` 꺼짐 → ②의 `다음` 꺼짐 · 38줄 → ④ 가격 전 `submit` 꺼짐 |
| first-flow: 'rejects non-image' | K1 / 개별: 가격 클릭 줄 지움 · `submit` 꺼짐 → `다음` 꺼짐 |
| connect-screen: AC-2 | K1 · K2 / 개별: connect와 같은 이유로 ④ 가격 전 · 후 |
| connect-screen: AC-3 · daily-limit | K1 · K2 · K3 · K4 |
| photo-upload: AC-1~5 | K1 · K2 (`pickAndAppraise`와 AC-3 안에서) |
| photo-upload: AC-6 | K1 · K2 (`if (await submit.isEnabled())` 그대로, 문구는 ②에서) |
| photo-upload: AC-7 | K1 · K2 · K3 · K4(줄 지움) |
| three-screens-history: 전부 | K1 · K2 · K3 · K4 · K5 (`expectChosen` · `expectEmpty`는 그 파일에) / 개별: `expectEmpty`의 `submit` 꺼짐 → ① 버튼 보임 + 사진 칸 0 / 'AC-5 ④'의 뒤로 2번 → 칸이 많아져 끝까지 뒤로(앱 밖까지 `page.goBack()` 반복, 매번 `감정 결과` 0) |
| three-screens-view: 전부 | K1 · K2 · K3 · K4 / 개별 `press`: `choose`를 ③에서 멈추고 ③에서 `다음`을 `scrollIntoView` · **`scrollY > 0` 그대로** · 누름 → ④ 가격 → `감정 받기!`. 둘째 감정은 `goBack()` 둘로 ③에서 같게 |

- 옮기지 않음: `App.test.jsx` · `appraise.test.js` · `photo.test.js` · `e2e/playwright.config.js` · `photo-fixtures.js` · `guard-8787.js`
- 단계
  1. 표대로 고친다.
  2. `unit` · `e2e` → 고친 테스트는 '`가게에 들어가기` 못 찾음'으로 실패한다(안 고친 테스트는 통과).
  3. 아래 A4 확인 명령 → 파일마다 `names same` · `expect` `main <= 지금`.
  4. `expect`가 든 `-` 줄을 모두 위 짝에 대 보고 PR에 붙일 글로 남긴다.
  5. 커밋: `CAREER-35: move existing tests to six steps`
- A4 확인 명령:
  ```
  bash -c 'for f in app/tests/FirstFlow.test.jsx app/tests/ThreeScreens.test.jsx app/tests/ScreenHistory.test.jsx app/tests/connect.test.jsx e2e/first-flow.spec.js e2e/connect-screen.spec.js e2e/daily-limit.spec.js e2e/photo-upload.spec.js e2e/three-screens-history.spec.js e2e/three-screens-view.spec.js; do echo "== $f"; re="[\x27\`][^\x27\`]*(AC-[0-9]|CAREER-[0-9])[^\x27\`]*[\x27\`]"; diff <(git show "origin/main:$f" | grep -oE "$re" | sort) <(grep -oE "$re" "$f" | sort) && echo "names same"; echo "expect $(git show "origin/main:$f" | grep -c "expect(") -> $(grep -c "expect(" "$f")"; git diff -U0 origin/main -- "$f" | grep -E "^-.*expect"; done'
  ```
- 끝난 상태: 위 2 · 3 · 4 그대로.

---

## F1 — 6단계 뼈대 · 고르기 · 초점 (초록: AC-1 · AC-2 · AC-8) · 순서 4
- 담당: frontend-dev
- 파일: `app/src/App.jsx` · `app/src/options.js` · `app/index.html`
- AC: AC-1 · AC-2 · AC-8 · 원본 plan A1
- 단계
  1. `options.js`에 plan '글자의 원본'을 더한다.
  2. `view`로 ①~⑥을 그린다(이 단계의 `advance`는 `setView`만). 그림 자리는 비워 두고 글자 · 버튼 · 칩 · `.chip-mark` · `.sr-only` 값 · 안내 차례 · 사진 칸은 plan 규칙대로. 모양은 F7.
  3. plan '초점 · 이름표'의 `useLayoutEffect` · `lang="ko"`.
  4. `unit` → `ShopSteps` · `ShopA11y` 단위 통과. 5. 커밋: `CAREER-35: six step screens`
- 검사 명령: `unit`
- 끝난 상태: lint 0 · 실패 이름에 `CAREER-35 AC-1` · `AC-2`(단위) · `AC-8`(단위) 없음.

## F2 — history (초록: AC-3 · AC-7) · 순서 5
- 담당: frontend-dev
- 파일: `app/src/App.jsx`
- AC: AC-3 · AC-7 · ADR-0009
- 단계: 1. plan 코드 모양대로 `DEPTH` · `PREV` · `entryOf` · `advance` · `popstate`. 2. `submit` 첫 줄 `advance('thinking')`. **`await` 뒤에서 `pushState`를 부르지 않는다.** 3. `unit` · `e2e` → `shop-requests` · `shop-history` · `ShopHistory` 통과. 4. 커밋: `CAREER-35: browser back through six steps`
- 검사 명령: `unit` 다음 `e2e`
- 끝난 상태: 실패 이름에 `CAREER-35 AC-3` · `AC-7` 없음.

## F3 — 실패 · 퇴근 · 바쁨 · 다른 물건 (초록: AC-5) · 순서 6
- 담당: frontend-dev
- 파일: `app/src/App.jsx`
- AC: AC-5
- 단계: 1. plan 상태 흐름의 실패 줄 · 버튼 · invalid_input → ② · `다른 물건 꺼내기` 비우기. 2. `.toast`의 `⚠`는 `aria-hidden`, 문구 `p`에 `role="alert"` · ref. 3. `unit` → `ShopFailure` 통과. 4. 커밋: `CAREER-35: failure, off-duty and busy screens`
- 검사 명령: `unit`
- 끝난 상태: 실패 이름에 `CAREER-35 AC-5` · `Q2` 없음.

## F4 — 값 공개 (초록: AC-6) · 순서 7
- 담당: frontend-dev
- 파일: `app/src/App.jsx`
- AC: AC-6
- 단계: 1. 값 창 · 비교 줄(`never` 먼저, 그다음 `mochi`와 `PRICES.mochi` 비교). 2. `unit` → `ShopReveal` 통과. 3. 커밋: `CAREER-35: reveal card with comparison line`
- 검사 명령: `unit`
- 끝난 상태: 실패 이름에 `CAREER-35 AC-6` 없음.

## F5 — 장면 · 표정 · 물건 (초록: AC-4 · AC-9) · 순서 8
- 담당: frontend-dev
- 파일: `app/src/pixels.js` · `app/src/Pixel.jsx` · `app/src/Shop.jsx` · `app/src/App.jsx`
- AC: AC-4 · AC-9 · 원본 plan A2
- 단계
  1. 시안 85~87줄의 값을 `pixels.js`로 **그대로 복사**(`U` · `I` · `PU` · `PI`). 손으로 고치지 않는다.
  2. `Pixel.jsx`: 색마다 `<path d="M{x} {y}h1v1h-1z…" fill>`, `memo`.
  3. `Shop.jsx`: `data-testid`는 plan A1 표대로. `faceOf`로 표정. `App`의 `view`가 바뀌어도 같은 자리.
  4. `unit` → `ShopFaces` · `PixelMap` 통과. 5. 커밋: `CAREER-35: shop scene and pixel art`
- 검사 명령: `unit`
- 끝난 상태: 단위 테스트 전부 통과(T11 포함).

## F6 — 갈무리 · 무게 (초록: AC-10) · 순서 9
- 담당: frontend-dev
- 파일: `app/src/fonts/Galmuri11.woff2` · `app/public/licenses/Galmuri-OFL.txt` · `app/src/shop.css` · `app/src/main.jsx`
- AC: AC-10 · 원본 plan A3
- 단계(U1에서 파일 복사를 고른 경우. npm이면 plan에 U1이 적은 방법)
  1. `d=$(mktemp -d) && (cd "$d" && npm pack galmuri@2.39.3 --silent && tar -xzf galmuri-2.39.3.tgz) && ls "$d/package" "$d/package/dist" | grep -iE 'licen|ofl|Galmuri11'`. **`Galmuri11.woff2`나 라이선스 글이 없으면 멈춘다.** 내려받은 묶음의 스크립트는 돌리지 않는다.
  2. 두 파일을 복사한다. `shasum -a 256`과 판을 PR '결정' 칸에 적는다. Reserved Font Name 줄이 있으면 PR에 적는다(줄이지 않으므로 지금 문제는 없음).
  3. `shop.css`에 plan `@font-face`와 `body` 글꼴, `main.jsx`에 import.
  4. 크기 표: `npm --prefix app run build && for f in app/dist/index.html app/dist/assets/*; do printf '%s raw=%s gz=%s\n' "$f" "$(wc -c <"$f")" "$(gzip -c "$f" | wc -c)"; done`. **raw 합이 U1 기준선을 넘으면 멈추고 표를 들고 알린다.**
  5. `unit` · `e2e` → `shop-font` · `FontBuild` 통과. 6. 커밋: `CAREER-35: self-hosted Galmuri font`
- 검사 명령: `unit` 다음 `e2e` 다음 위 4의 크기 표
- 끝난 상태: 실패 이름에 `CAREER-35 AC-10` 없음 · 크기 표가 기준선 안.

## F7 — 나무 감정소 모양 · 375px (초록: AC-11) · 순서 10
- 담당: frontend-dev
- 파일: `app/src/shop.css` · `app/src/App.jsx`(클래스 이름만)
- AC: AC-11 · AC-2 높이 · 원본 plan A5
- 단계
  1. 시안 CSS를 옮기되 plan A5 표의 값을 쓴다. `.phone` · `.col` · `.label` · `.sub` 등 시안 설명용은 옮기지 않는다. **`.blink` · `.lampglow` · `.spark` · `.moon` · `.zz` · 막대 움직임은 넣지 않는다**(D1~D5). `▼` · `_` · `…`는 멈춘 글자로 둔다. `.bar`는 시안 그대로 멈춘 빗금.
  2. `uncle` 가운데는 flex, `translateX` 없음.
  3. `e2e` → `shop-view` 통과. **AC-11이 값을 바꿔야만 통과되면 A5 값을 세션이 정하지 말고 멈춘다.**
  4. 커밋: `CAREER-35: wooden shop styles for 375px`
- 검사 명령: `bash -c 'for n in lint test build e2e; do echo "== $n"; bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)" || exit 1; done'; git status --porcelain app e2e`
- 끝난 상태: 종료 코드 0 · 통과 수 0 아님 · `[guard-8787] 받은 요청 0개` · `git status`에 `node_modules` · `dist` · `test-results` 없음.

## H0 — 화면 찍기를 사용자가 본다 (Q9 A · A5) · 순서 11
- 담당: **사용자** (frontend-dev가 파일을 건넴)
- 파일: 없음 (`e2e/test-results/**/` 아래 11장, 커밋하지 않음)
- AC: AC-12 전 단계 · spec Q9 · plan A5
- 단계: 1. frontend-dev가 `shop-view` `Q9 shots`로 나온 경로를 보고한다. 2. 사용자가 `mockup-v3.html`과 나란히 본다. refused · unavailable · busy는 이 눈 확인이 iPhone 확인을 대신한다(Q9 A). 3. 값(칩 44 · 대사 14 등)을 바꾸면 plan A5 값을 고치고 F7을 다시 돌린다. 44 아래로 낮추면 테스트 `A5 …`의 수치도 test-writer가 맞춘다.
- 검사 명령: `find e2e/test-results -name '*.png' -path '*Q9*' | wc -l` → 11
- 끝난 상태: 사용자가 '이대로' 또는 고칠 값을 말했다.

## P1 — 전체 검사 · A4 확인 · PR · 순서 12
- 담당: frontend-dev(검사 · PR 열기) · reviewer · 사용자(머지)
- 파일: 없음 (PR 본문 — `.github/pull_request_template.md`)
- AC: AC-13 · 전부(대조표)
- 단계
  1. `bash -c 'for n in lint test e2e build api; do echo "== $n"; bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)"; echo "exit=$?"; done'` → 모두 `exit=0`, 통과 수 0 아님. 출력 그대로 보고.
  2. T11 A4 확인 명령을 다시 돌려 결과와 `-` 줄 짝을 PR '결정' 칸 아래에 붙인다.
  3. `git diff --stat origin/main -- api infra e2e/playwright.config.js pipeline.config.json app/tests/App.test.jsx app/vite.config.js app/eslint.config.js specs/CAREER-35-shop-screen/mockup-v3.html` → 빈 줄.
  4. `git diff origin/main -- contracts`의 문구 · 코드 줄이 그대로인지 본다. §5 줄 첫 큰따옴표 글자가 같다.
  5. 제목 `CAREER-35: wooden shop screen in six steps`. 칸:
     - 결정: ADR-0009 · 글꼴 파일 복사(판 · sha256) · 그림 색별 `path` · A5 값 · 기준선과 크기 표 · T11 짝
     - 범위 변경: 없음(Q10 CLAUDE.md는 사용자 몫) / 새 의존성: 없음
     - 비용·남용 영향: spec 그대로 + 크기 표 + "AC-12는 머지 · 배포 뒤 이 칸에 덧붙임"
     - spec AC-1~13 ✔/✘ 대조(AC-12는 '머지 뒤 H1')
- 검사 명령: `gh pr checks --watch`
- 끝난 상태: 필수 검사 모두 통과(`reviewer/gate` 포함) · 3단계 빈 줄.

## H1 — iPhone 확인 (AC-12) · 머지 · 배포 뒤
- 담당: **사용자** (배포 `docs/runbook/배포.md` §3, 로그 §5, 상한 §8)
- 파일: 없음 (PR '비용·남용 영향' 칸에 덧붙임)
- AC: AC-12 (a)~(f) + plan A2 · A3 확인
- 단계
  1. spec AC-12 '할 때' 그대로. (a)에서 `▶`가 이모지로 보이는지, 칸이 흐린지도 본다.
  2. 글꼴 응답: `f=$(curl -s https://d2x05xzjhjvp9j.cloudfront.net/ | grep -oE 'assets/[^"]+\.css'); w=$(curl -s "https://d2x05xzjhjvp9j.cloudfront.net/$f" | grep -oE 'assets/[^)"]+\.woff2' | head -1); curl -sI "https://d2x05xzjhjvp9j.cloudfront.net/$w" | grep -iE '^(HTTP|content-type|content-length)'`. `curl -sI https://d2x05xzjhjvp9j.cloudfront.net/licenses/Galmuri-OFL.txt | head -1` → 200. 글꼴이 안 뜨거나 종류가 나빠 문제가 보이면 plan A3 '`infra/`를 바꿔야 한다면'으로, 따로 PR.
  3. (선택, Mac Safari 웹 인스펙터 · 케이블) ②에서 콘솔: `const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('다음'));const t=performance.now();b.click();requestAnimationFrame(()=>requestAnimationFrame(()=>console.log(Math.round(performance.now()-t))))` → 200 이하. 넘으면 PR에 적고 architect에게 알린다(AC ✘ 아님).
- 검사 명령: runbook §5 로그 보기 명령으로 감정 줄의 `outcome` · `attempts`
- 끝난 상태: (a)~(f) 모두 ✔이고 PR 칸에 적혀 있다.

## R1 — runbook 글자 · H1 뒤
- 담당: release-ops
- 파일: `docs/runbook/배포.md` §6-2 · §8
- AC: 없음 (plan A4)
- 단계: 1. 161행 '아저씨가 바로 🚶퇴근이다'와 187행 '🚶퇴근'을 '어두운 가게 · 오늘 영업 끝 팻말'로 바꾼다. 다른 줄은 바꾸지 않는다. 2. `배포-증거-점검표.md`는 그날의 기록이라 고치지 않는다. 3. 커밋: `CAREER-35: runbook off-duty wording`
- 검사 명령: `grep -n '🚶' docs/runbook/배포.md`
- 끝난 상태: 출력 없음.

---

## 시간이 남으면 — 미룰 것 (Q5 차례, 하나씩 따로)
없어도 AC-1~13이 선다. 앞 PR을 머지한 뒤 이 차례로 작은 PR 하나씩 낸다. 11/8 전에 시간이 끝나면 **남은 것을 하지 않고 끝낸다.** 모두 `@media (prefers-reduced-motion: no-preference)` 안에 쓰고, T7의 reduced-motion 테스트가 그대로 지킨다. 각각 **빨강(test-writer) → 초록(frontend-dev)**, 파일은 `e2e/shop-motion.spec.js`(D1에서 새로) · `app/src/shop.css` · `app/src/Shop.jsx` 또는 `App.jsx`(요소 하나). 검사 명령은 모두 `e2e`, 끝난 상태는 그 테스트 통과 · 나머지 그대로다.

| 차례 | 무엇 | 빨강 (`shop-motion.spec.js`) | 초록 | 커밋 |
|---|---|---|---|---|
| D1 | ▼ 깜빡임(`_` · `…`도 같은 클래스) | `CAREER-35 D1 caret blinks`: ②에서 `getAnimations().length > 0` | 시안 `.blink` | `CAREER-35: blinking caret` |
| D2 | ⑤ 막대 움직임 | `D2 bar moves`: ⑤ 막대 요소에 애니메이션 · **`aria-valuenow`는 여전히 없음** | `.bar` 배경 위치 움직임. 진행률처럼 끝까지 차지 않는다 | `CAREER-35: moving progress bar` |
| D3 | 등불 빛 | `D3 lamp glow`: 낮 장면에 `.lampglow` 1개 · 밤에 0개 · `aria-hidden` | 시안 `.lampglow` | `CAREER-35: lamp glow` |
| D4 | ⑤ 반짝임 | `D4 sparks`: ⑤에 `.spark` 2개 · 이름에 `✦` 없음 | 시안 `.spark` · `aria-hidden` | `CAREER-35: sparks while appraising` |
| D5 | 졸림 `zZ` · 퇴근 달 | `D5 zz and moon`: person_limit `.zz` · daily_limit `.moon` · `aria-hidden` | 시안 `.zz` · `.moon` | `CAREER-35: sleepy z and moon` |
| D6 | 두구두구(Q1 B) | **만들지 않는다.** Q1 A · AC-6 '바로 ⑥' · AC-8 · AC-11과 어긋난다. 사용자가 기다리는 시간과 AC 변경을 정해 주면 새 스토리로 | — | — |

- D3 · D5는 AC-12 (a)에서 시안과 다른 부분으로 보일 수 있다. Q5에서 미뤄도 된다고 정한 곳이므로 ✘로 보지 않는다.
- D를 더한 뒤 AC-11이 빨강이면 그 D를 빼고 알린다.

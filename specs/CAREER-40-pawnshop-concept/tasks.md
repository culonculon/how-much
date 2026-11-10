[CAREER-40](https://culonculon98.atlassian.net/browse/CAREER-40) · spec: [spec.md](spec.md) · plan: [plan.md](plan.md) · 시안: [mockup-v3/](mockup-v3/README.md) · 약속: [contracts/appraise.md](../../contracts/appraise.md) §2 · §5

상태: 초안 — 사용자 승인 전 (2026-11-10 · 같은 날 사용자 검토 답으로 고침: T2 · T6 · T8 · T9 · T10 · F1 · F3 · F4)

- 방식: **맡긴다**. 브랜치 `CAREER-40-pawnshop-concept` 하나. 순서: **U1 → T1 → T2~T10 [P] → F1 → F2 → F3 → F4 → F5 → F6 → H0 → P1 → (머지 · 배포 뒤) H1 · R1**
  - [P] = 같은 역할 세션 안에서 차례를 바꿔도 되는 것(파일이 겹치지 않음). T2~T10은 [P]이고 T1의 돕는 함수가 먼저다. F는 모두 `App.jsx` 또는 `shop.css`를 건드려 [P]가 없다. 만들기 세션은 동시에 2개까지(CLAUDE.md §4).
  - 테스트 커밋(T)이 모두 구현 커밋(F)보다 먼저다.
- **U1 전에는 만들지 않는다**(contracts C1 · C2가 U1에서 확정).
- 명령은 **저장소 루트**에서. architect 세션은 셸이 없어 아래 명령을 돌리지 않았다 — 앞 세션 · 각 역할 세션이 돌리고 세션 보고에는 출력 그대로, PR '검사 결과' 칸에는 CI 링크만.
- 이름 · 글자 · 표식의 원본: plan A5(상태 · 숫자 칸) · A3(글자) · A2(표식 · 움직임 이름 · 카드 자리표). §5 문구의 원본은 contracts · `options.js`.
- 테스트가 실패하면 **느슨하게 고치지 않는다.** 화면을 고치거나 멈춘다. 이미 있는 테스트는 T10 짝 표 말고는 고치지 않는다. `e2e/playwright.config.js` · lint · vitest 설정은 고칠 일이 없다. 고쳐야 한다는 결론이 나오면 멈춘다.
- 새 테스트 이름 앞머리 `CAREER-40 AC-n`. 공통 고정값: 첫 답 `{ mochi: 30, line: '흠… 귀한 물건이군!' }` · **30자 대사** `'가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나'` · 고르는 것 png · `🎁 선물`.
- 공통 검사
  - `unit` = `npm --prefix app run lint && { npm --prefix app test; echo "unit exit=$?"; }`
  - `e2e` = `bash -c "$(jq -r '.checks.app.e2e' pipeline.config.json)"; echo "e2e exit=$?"`
  - `api` = `bash -c "$(jq -r '.checks.app.api' pipeline.config.json)"; echo "api exit=$?"`

---

## U1 — 승인 · contracts 확정 · 순서 1
- 담당: **사용자** (글 고침은 architect 세션)
- 파일: `specs/CAREER-40-pawnshop-concept/plan.md` · `tasks.md` · `contracts/appraise.md`(머리 줄만)
- AC: 만들기 시작 조건 · AC-10(contracts 범위)
- 단계
  1. 사용자가 plan '사용자가 정할 것' 1~4(plan · tasks · C1 · C2 · K7 · K8)를 고른다. A1 · ⑨ · `PRICE_TEXT.empty`는 11/10에 답함(plan 끝 '사용자 답').
  2. architect 세션이 contracts 머리 줄의 `제안 — 사용자 승인 전`을 `사용자 승인 YYYY-MM-DD`로, plan · tasks 상태를 `승인됨 (YYYY-MM-DD)`로 바꾸고 고른 답을 plan 끝 '사용자 답'에 덧붙인다. 다르게 고르면 그 줄을 고친다(C1 표 첫 열 · C2 첫 큰따옴표 모양은 지킨다).
  3. 커밋(앞 세션): `CAREER-40: pawnshop plan and contract myPrice meaning`
- 검사 명령: `bash -c "$(jq -r '.checks.app.api' pipeline.config.json)"; echo "api exit=$?"; npm --prefix app test -- FirstFlow ThreeScreens; grep -m1 -H '^상태' specs/CAREER-40-pawnshop-concept/plan.md specs/CAREER-40-pawnshop-concept/tasks.md`
- 끝난 상태: `api exit=0`(§2 표 첫 열을 `input.test.js`가 그대로 읽음) · 화면 테스트는 **`CAREER-27 AC-9 off-duty text matches contracts/appraise.md`과 퇴근 글자를 contracts와 맞대는 줄만 빨강**(contracts가 먼저 바뀌어서 — F1에서 초록) · 상태 두 줄 `승인됨`.

## T1 — 돕는 함수 (K6 · 시안 읽기) · 순서 2
- 담당: test-writer
- 파일: `app/tests/shop-steps.jsx` · `e2e/shop-steps.js` · `app/tests/mockup-v3.js` (새로)
- AC: 모든 T의 바탕 · AC-10
- 단계
  1. `shop-steps.jsx`: `priceInput = () => screen.getByRole('textbox', { name: PRICE_LABEL })`(`PRICE_LABEL = '내가 부르는 값 (1~9999개)'`를 테스트 상수로 적음 — 구현을 import하지 않음) · `typePrice(text)` = `fireEvent.change(priceInput(), { target: { value: text } })` · `minus()` / `plus()`(이름 `한 개 빼기` · `한 개 더하기`). `pickPrice`는 그대로 두고 부르는 쪽 이름만 T10에서 바뀐다.
  2. `e2e/shop-steps.js`: `pickPrice(page, name = '10개')`(K6) · `priceInput(page)` · `typePrice(page, text)`(= `priceInput(page).fill(text)`).
  3. `app/tests/mockup-v3.js`: plan A2 '시안 코드 읽기' 그대로 `renderMockup(file, props)` · `cellsOfSt(list)` · `pathsOf(u)`. **`expect`를 넣지 않는다.** 못 찾으면 던진다.
  4. `unit` · `e2e` → **기본 이름 `10개`를 못 찾아** 걷는 e2e가 빨강이 된다(예상). 단위는 바뀌지 않음.
  5. 커밋: `CAREER-40: test helpers for price field and mockup v3`
- 검사 명령: `unit` 다음 `e2e`
- 끝난 상태: lint 0 · e2e 실패 이유가 `10개` 버튼 못 찾음.

## T2 [P] — AC-1 숫자 칸 단위 테스트 (빨강) · 순서 3
- 담당: test-writer
- 파일: `app/tests/PriceInput.test.jsx` (새로)
- AC: AC-1 · plan A5
- 테스트 (모두 ④까지 `walkToPrice()` 뒤)
  - `CAREER-40 AC-1 price field, steps, quick buttons and never are there`: `마음 가격` 그룹 안에 `textbox` 하나(이름 `PRICE_LABEL`, `inputmode="numeric"`, `type`이 `number`가 아님) · `한 개 빼기` · `한 개 더하기` · `1개` · `10개` · `100개` · `777개` · `안 팔아`.
  - `test.each(['1', '23', '9999'])` `CAREER-40 AC-1 %s turns submit on`: `typePrice` → `감정 받기!` 켜짐 · 칸에 `aria-describedby` 없음.
  - `test.each(['', '0', '-5', '10000', '3.5', 'abc', '１２'])` `CAREER-40 AC-1 %j keeps submit off and says why`: 꺼짐 · 칸의 `aria-describedby`가 가리키는 요소 글자가 비지 않음 · **칸의 `value`가 친 글자 그대로**(몰래 안 바뀜). `''`은 처음 상태와 다 지운 상태 두 번.
  - `CAREER-40 AC-1 plus and minus step by one`: 빈 칸에서 `+` → `1` · `−` 꺼짐(1) · `+` → `2` · `−` → `1` · `typePrice('9999')` → `+` 꺼짐 · `−` → `9998`.
  - `CAREER-40 AC-1 a quick button fills the field and only it is pressed`: `777개` → 칸 `777` · `777개`만 `aria-pressed="true"` · `10개` → `10` · `10개`만.
  - `CAREER-40 AC-1 typing a quick number does not press its button` (plan A5 결정): `typePrice('10')` → 빠른 버튼 모두 `false` · `10개` 누른 뒤 `typePrice('100')` → 모두 `false` · `typePrice('9')` 뒤 `+`(→ 10) → 모두 `false`.
  - `CAREER-40 AC-1 never empties the field and is released by any number action`: `23` → `안 팔아` → 칸 `''` · `안 팔아`만 `true` · 켜짐 → (따로 세 번) `typePrice('5')` / `+` / `100개` → `안 팔아` `false`. `안 팔아` 상태에서 칸 · `+`는 `disabled`가 아님.
  - `CAREER-40 AC-1 sends the mapped id` (A5 표): `1`→`one` · `9`→`one` · `10`→`ten` · `99`→`ten` · `100`→`hundred` · `777`→`hundred` · `9999`→`hundred` · `안 팔아`→`never` — `appraise` 인자 `myPrice`. 표는 테스트에 글자로 적는다(`priceIdOf`를 import하지 않음).
  - `CAREER-40 AC-1 shows the hint words` : 처음 빈 칸에서 `price-hint` 글자가 `한정선 몇 개에 넘길지 불러 주세요. 값만 궁금하면 ‘안 팔아’도 돼요.`(굽은 따옴표 그대로) · `typePrice('abc')` 뒤 `1부터 9999까지 정수만 넣을 수 있어요.` (글자는 테스트에 적음)
  - `CAREER-40 AC-1 only the number leaves the price field` (**K7 짝 — plan A6 'K7 — 다시 짬'**): 이 파일 위에 `vi.mock('../src/shareCard.js', () => ({ makeCard: vi.fn(async () => new Blob(['x'], { type: 'image/jpeg' })) }))`(ShareRow가 쓰는 다른 이름이 있으면 함께 — `shareCard.js` 내보내기를 읽고 맞춘다). 두 번 따로 렌더해 `'0023'` · `'23'`을 쳐서 감정(`mochi` 30) → 두 `appraise` 첫 인자가 `toEqual` · `Object.keys`가 `['photo','myPrice','tags']`(정렬해 비교) · `myPrice === 'ten'` · ⑥ `my-shown` `한정선 23개` · `my-price` `한정선 모찌 23개` · `감정 결과` `textContent`에 `0023` 0번 · `공유`(없으면 `저장`) 누름(`navigator.share` · `URL.createObjectURL` 가짜는 `ShareCard.test.jsx` 꼴 그대로) → `makeCard` 둘째 인자 `=== 23`(숫자).
- 높이 24 이상은 jsdom이 못 재므로 T5(e2e)에서 본다.
- 단계: 1. 쓴다. 2. `unit` → 이 파일만 새로 실패, 이유가 `textbox` 못 찾음. 3. 커밋: `CAREER-40: price field unit tests`
- 검사 명령: `unit`
- 끝난 상태: lint 0 · 실패 이유 위 하나.

## T3 [P] — AC-2 요청 모양 (빨강) · 순서 3
- 담당: test-writer
- 파일: `app/tests/PriceQuery.test.js` (새로) · `e2e/pawn-request.spec.js` (새로)
- AC: AC-2
- 단위 `CAREER-40 AC-2 the browser query passes the server input check`: `fetch`를 가짜로(`appraise.test.js` 꼴) → 진짜 `appraise({ photo, myPrice, tags })`를 `myPrice` 넷 × `tags` `[]` · `['how-1', 'now-2']`로 부름 → 받은 URL의 `searchParams`를 `import { checkQuery } from '../../api/src/input.js'`에 그대로 넣어 **던지지 않음** · 돌려준 `myPrice`가 같음. 그리고 화면에서 걸어가 `typePrice('777')` → 누름 → `appraise` 인자를 같은 식으로 `checkQuery`에 넣어 봄(화면 → 어댑터 한 줄). `api/`는 읽기만 한다. **lint가 이 import를 막으면 멈춘다**(plan '확인 못 함').
- e2e (`countPosts` · `routeQueue` — `e2e/shop-steps.js`)
  - `for [typed, id]` `['1','one']` · `['777','hundred']` · `['9999','hundred']` · `[null,'never']`: `CAREER-40 AC-2 ${typed ?? 'never'} is sent as ${id}` — ①~③에서 0건 · ④에서 칸에 손으로 침(`typePrice`, `never`는 `안 팔아`) → 누름 → **1건** · `searchParams.getAll('myPrice')`가 `[id]` · 키는 `myPrice` · `tags`뿐 · 어느 값도 `typed`와 같지 않음 · URL 전체에 `typed`가 `myPrice=` 뒤로 오지 않음.
- 단계: 1. 쓴다. 2. `unit` · `e2e` → 단위는 화면 줄에서 실패(칸 없음), e2e는 칸 못 찾음. 3. 커밋: `CAREER-40: request shape tests`
- 검사 명령: `unit` 다음 `e2e`
- 끝난 상태: 어댑터 줄은 **지금도 통과**(id를 그대로 보내므로) · 새 실패는 화면 줄 · e2e 위 이유.

## T4 [P] — AC-3 한정선 · 비교 · 옛 단위 0개 (빨강) · 순서 3
- 담당: test-writer
- 파일: `app/tests/PawnReveal.test.jsx` (새로) · `app/tests/OldUnit.test.js` (새로)
- AC: AC-3
- `test.each` 30줄 `CAREER-40 AC-3 mine %s, server %s` — 내 값 `1` · `23` · `777` · `9999` · `안 팔아` × `mochi` `0` · `7` · `23` · `37` · `100` · `9999`. 기대 표시는 **테스트에 글자로 적는다**:
  | 내 값 | mochi 0 · 7 · 23 · 37 · 100 · 9999 |
  |---|---|
  | 1 | ▼ ▲ ▲ ▲ ▲ ▲ |
  | 23 | ▼ ▼ = ▲ ▲ ▲ |
  | 777 | ▼ ▼ ▼ ▼ ▼ ▲ |
  | 9999 | ▼ ▼ ▼ ▼ ▼ = |
  | 안 팔아 | 모두 `안 판다니… 그래도 값은 매겨 봤네` |
  - 각 줄: `appraised-shown` `한정선 {mochi}개` · `appraised-price` `한정선 모찌 {mochi}개` · `my-shown` `한정선 {내 값}개`/`안 팔아` · `my-price` `한정선 모찌 {내 값}개`/`안 팔아` · `compare-line` `textContent`가 `▲ 아저씨가 더 쳐줬다!` · `▼ 아저씨는 좀 짜게 봤다` · `= 자네 눈이 제법이군!` · never 줄 중 하나 · `감정 결과` 안에 `stamp` 하나(`aria-hidden="true"`).
  - 내 값은 **숫자 칸에 쳐서** 넣는다(빠른 버튼 아님).
- `OldUnit.test.js` `CAREER-40 AC-3 no old unit left in app/src`: `app/src`의 `.js` · `.jsx` 모두 읽어 `//` · `/* */` 주석을 지운 뒤 `🍡 × ` · `/모찌 (\d|\$\{)/` · `원` 0개. 읽은 파일 수가 0이면 실패.
- 단계: 1. 쓴다. 2. `unit`. 3. 커밋: `CAREER-40: hanjeong reveal unit tests`
- 검사 명령: `unit`
- 끝난 상태: lint 0 · 새 실패가 이 두 파일.

## T5 [P] — AC-4 375×548 · AC-1 높이 (빨강) · 순서 3
- 담당: test-writer
- 파일: `e2e/pawn-fit.spec.js` (새로)
- AC: AC-4(화면) · AC-1(높이 24)
- `test.use`는 `shop-view.spec.js` 7줄과 같음. 모두 `document.fonts.ready` 뒤.
  - `CAREER-40 AC-4 9999 against 9999 fits on the reveal`: 답 `ok(9999, THIRTY)` · 내 값 `9999` → 움직임이 끝날 때까지(`appraised-shown` `toHaveText('한정선 9999개')`) → `값 공개` 그룹 · `appraised-shown` · `my-shown` · `compare-line` · `다른 물건 꺼내기`가 `toBeInViewport({ ratio: 1 })` · `appraised-shown`과 `my-shown`을 담은 칸(`.value`의 자식 줄마다) `scrollWidth <= clientWidth` · 두 글자의 `getClientRects().length === 1`(한 줄).
  - `CAREER-40 AC-4 9999 is fully visible in the field`: `typePrice('9999')` → 칸 `scrollWidth <= clientWidth` · `toBeInViewport({ ratio: 1 })`.
  - `CAREER-40 AC-1 field and buttons are 24px or taller`: ④에서 칸 · −/+ · 빠른 버튼 5개 `boundingBox().height >= 24`.
- 단계: 1. 쓴다. 2. `e2e`. 3. 커밋: `CAREER-40: 375x548 fit e2e`
- 검사 명령: `e2e`
- 끝난 상태: 새 실패가 이 파일.

## T6 [P] — AC-5 · AC-8 장면 단위 테스트 (빨강) · 순서 3
- 담당: test-writer
- 파일: `app/tests/PawnScene.test.jsx` (새로)
- AC: AC-5 · AC-8 · plan A2 '표식' · '아저씨'
- 테스트
  - `test.each` `CAREER-40 AC-5 %s has the truck` — ①(`data-mode="arrive"` · `truck-loudspeaker` · `truck-scale`) · ② · ③ · ④(`idle`) · ⑤(`think` · `magnifier[data-size=big]` · `truck-scale`) · ⑥(`stamp`) · refused · unavailable · person_limit · invalid_input · busy: 모두 `shop-scene[data-shop=truck]` · `data-scene="day"` · `truck` · `shop-counter` 1개 · **`shop-item` 0개 · `.shelf` 0개 · `.items` 0개** · 표정은 CAREER-35 짝 그대로(`face()`).
  - `CAREER-40 AC-5 / AC-8 off duty`: `daily_limit` → `data-scene="night"` · `data-mode="leave"` · `truck[data-truck=gone]`(끝 모습 — plan A2 '퇴근 E') · `truck` 안에 `shutter[data-shutter=down]` · `smoke` · `shop-counter` · `post-sign`은 `truck` **밖** · `closed-sign`이 화면에 1개이고 `post-sign` 안 첫 줄, 글자 `오늘 영업 끝` · `post-sign` `textContent`에 `내일 또 와요` · `uncle` 0개 · ①~⑥ · 실패 화면에서는 `truck[data-truck=here]` · `post-sign` · `smoke` · `closed-sign` 0개 · `status` 칸 안 `off-duty` `textContent`가 **contracts §5 `daily_limit` 줄의 첫 큰따옴표 글자**(`contractText` 꼴로 직접 읽음) · `appraise-error` 없음 · `감정 결과` 없음 · `감정 받기!`로 돌아가 다시 누를 수 있음(`내일 다시 오기` → ④ → 켜짐).
  - `test.each(['base','happy','think','frown','sweat','sleepy'])` `CAREER-40 AC-5 %s is one path per colour`: `render(<Uncle face />)` → `path` 수 = 서로 다른 `fill` 수 · `rect` 0개 · 이어진 조각 `M(\d+) (\d+)h(\d+)v1h-\3z`를 풀어 칸 표가 `pixels.js` 지도 + `PU`와 같음(남는 글자 있으면 실패).
  - `test.each(['base','happy'])` `CAREER-40 AC-5 %s paths match mockup v3`: `renderMockup('Scene', { mode: 'idle', face })`의 `u`에서 `M0 0`을 뺀 색별 `d`와 앱 `<path>`의 `fill` → `d`가 `toEqual`.
  - `test.each([false, true])` `CAREER-40 AC-5 truck cells match mockup v3 (night %s)`: `truckLayers(night)`가 `renderMockup('Scene', { mode: night ? 'leave' : 'idle' })`의 `bg` · `rects` · `front`를 `cellsOfSt`로 푼 것과 차례까지 `toEqual`.
  - `CAREER-40 AC-5 no 감정소 or 나무 in step words`: `STEPS`의 `label` · `line` · `kicker` · `title`, `THINKING_LINE` 글자에 `감정소` · `나무` 0개 · ① 화면 `textContent`에도 0개.
  - `CAREER-40 AC-5 pictures are decoration`: `shop-scene` 안 `svg` · 트럭 묶음 · `stamp`는 `aria-hidden="true"`(또는 조상이) · 버튼 이름에 `−` · `+` · `▶` 없음.
- 단계: 1. 쓴다. 2. `unit` → 새 실패가 이 파일(트럭 표식 · `truck.js` 없음). 3. 커밋: `CAREER-40: truck scene unit tests`
- 검사 명령: `unit`
- 끝난 상태: lint 0 · 위 이유.

## T7 [P] — AC-5 3px 칸 · 글꼴 · 요청 (빨강) · 순서 3
- 담당: test-writer
- 파일: `e2e/pawn-scene.spec.js` (새로)
- AC: AC-5 · plan A2 '3px 칸 확인'
- `CAREER-40 AC-5 every scene box sits on the 3px grid`: `emulateMedia({ reducedMotion: 'reduce' })` · 375×548 · ① · ④ · ⑤ · ⑥ · refused · 퇴근에서 `truck-board` 안 모든 자손의 상자(plan A2 계산) % 3 === 0 · `uncle` 폭 120. 어긋난 요소를 `tag · class · 값`으로 모아 한 번에 실패 메시지에.
- `CAREER-40 AC-5 font stays Galmuri11 and nothing leaves the site`: CAREER-35 AC-10 테스트 꼴로 ①→⑥ · 퇴근 요청 기록 → 다른 출처 0개 · 큰 장면 간판 글자의 `fontFamily`가 `Galmuri11`로 시작.
- 단계: 1. 쓴다. 2. `e2e`. 3. 커밋: `CAREER-40: 3px grid e2e`
- 검사 명령: `e2e`
- 끝난 상태: 새 실패가 이 파일.

## T8 [P] — AC-6 움직임 (빨강) · 순서 3
- 담당: test-writer
- 파일: `e2e/pawn-motion.spec.js` (새로)
- AC: AC-6 · plan A2 '움직임 규칙'(이름 표가 원본)
- 돕는 함수(이 파일 안, `expect` 없음): `anims(page)` = `document.getAnimations().map((a) => ({ name: a.animationName ?? a.id, iterations: a.effect.getTiming().iterations, steps: a.effect.getTiming().easing.startsWith('steps(') || a.effect.getKeyframes().slice(0, -1).every((k) => k.easing.startsWith('steps(')), playState: a.playState }))` (plan A2 '모두 steps()를 보는 법').
- 보통 설정
  - `CAREER-40 AC-6 A runs once on opening and the button works at once`: `goto` 직후 `hm-arrive` · `hm-shut-up` · `hm-bubble`이 있고 모두 `iterations === 1` · `steps` → **기다리지 않고** `가게에 들어가기` 누름 → ②. 다시 ①을 열어 **그 화면의 A 움직임이 모두 끝날 때까지(`Promise.all(anims.map((a) => a.finished))`) 기다린 뒤** A 이름 0개(11/10 사용자 — 고정 3초는 말풍선 지연 2.82s 때문에 아슬아슬).
  - `CAREER-40 AC-6 B and C repeat only where allowed`: ④에서 `hm-breathe` · `hm-blink` `Infinity` · ⑤에서 `hm-mag` · `hm-pan` `Infinity`. **무한인 것은 이 넷과 `hm-bar` · `hm-dots`뿐**(모든 화면에서 모아 봄).
  - `CAREER-40 AC-6 D counts up to the server value, once`: `ok(23)` · 내 값 `7` → ⑥ 직후 `hm-count` · `hm-stamp` 있음 · `iterations === 1` → `appraised-shown`이 끝에 `한정선 23개` · 오르는 동안 `appraised-price`는 처음부터 `한정선 모찌 23개`이고 `aria-live`가 있는 조상 없음 · 2초 뒤 D 이름 0개.
  - `CAREER-40 AC-6 E the truck shuts, leaves once and an empty road stays`(plan A2 '퇴근 E'): `daily_limit` → 바로 `hm-shut-down` · `hm-drive` · `hm-smoke` · `hm-post`가 있고 모두 `iterations === 1` · `off-duty` 글자와 `내일 다시 오기`는 **기다리지 않고** 보이고 눌림 → 움직임을 모두 `pause()`하고 `currentTime`을 맞춰 본다: **0.6s** `truck` 보임 · `smoke` 숨음 · `post-sign` 숨음 · 셔터 높이가 0과 87 사이 / **2.5s** `truck` 보임 · `smoke` 보임 · 셔터 높이 87 · `truck`의 `left`가 0보다 크고 30의 배수 / **3.9s** `truck` 숨음 · `post-sign` 숨음 → 모두 `finish()`(끝으로 넘김 — 끝난 뒤 `play()`는 처음으로 되감기므로 쓰지 않음) → **움직임 0개** · `truck` · `smoke` 숨음(`toBeHidden`) · `post-sign` · `closed-sign` 보임(`toBeVisible`) · `closed-sign` 글자 `오늘 영업 끝`.
  - `CAREER-40 AC-6 F runs once per press`: ④ `10개`에 `mouse.down()` → `hm-press` 있음 · `mouse.up()` 뒤 300ms → 0개.
  - `CAREER-40 AC-5 the CAREER-35 cell check holds at every step of motion` (**K8 — plan A6 'K8 — 다시 짬' (가) 2**): ① · ④ · ⑤ · ⑥(`ok(23)`) · 퇴근에서 화면이 뜨자마자 `page.evaluate` 한 번 안에서: `getAnimations()` 모두 `pause()` → 움직임마다 `getTiming()`의 `delay` · `duration` · `iterations` · `easing`과 `getKeyframes()`의 `offset`에서 **step 구간마다 가운데 시각**을 모음(`steps(n)`은 n칸, `steps(1)` 손 키프레임은 키프레임 사이마다, 무한은 첫 바퀴만, 지연이 있으면 지연 가운데도 하나) → 시각마다 모든 움직임 `currentTime = t` → (i) `uncle`이 있으면 CAREER-35 'AC-9 pixels stay on whole cells'의 세 줄을 **글자 그대로**(폭 % 40 === 0 · 조상 모두 `transform === 'none'` · `shapeRendering` `crispedges`) + 같은 조상들의 `translate` · `scale` · `rotate`가 `'none'` (ii) `truck-board` 안 모든 자손 상자(판 기준) left · top · width · height % 3 === 0(`Math.round(v * 100) / 100`) · `stamp`가 있으면 폭 · 높이 % 3 === 0. 어긋난 것을 `{ t, name, el: tag.class·testid, prop, value }`로 모아 돌려준다 → `toEqual([])`. 함께 돌려준 `{ 이름: 잰 순간 수 }`에서 그 화면에 있어야 할 이름(① `hm-arrive` · `hm-shut-up` · `hm-bubble` · `hm-breathe` / ④ `hm-breathe` / ⑤ `hm-mag` · `hm-pan` · `hm-bar` / ⑥ `hm-count` · `hm-stamp` · `hm-breathe` / 퇴근 `hm-shut-down` · `hm-drive` · `hm-smoke` · `hm-post`)이 모두 있고 각 수가 그 step 수 이상.
  - 모든 이름에서 `steps === true`.
- 동작 줄이기 `CAREER-40 AC-6 reduced motion shows the last picture at once`: `emulateMedia({ reducedMotion: 'reduce' })` → ① · ④ · ⑤ · ⑥ · 퇴근 · 버튼 누르는 중 `getAnimations().length === 0` · ① `shutter[data-shutter=up]` 높이 0 · ⑥ `appraised-shown` 첫 확인부터 `한정선 23개` · `stamp` 보임 · 퇴근 첫 확인부터 `truck` · `smoke` 숨음 · `post-sign` · `closed-sign` 보임.
- 단계: 1. 쓴다. 2. `e2e`. 3. 커밋: `CAREER-40: motion e2e`
- 검사 명령: `e2e`
- 끝난 상태: 새 실패가 이 파일.

## T9 [P] — AC-7 전당표 · AC-4 카드 폭 (빨강) · 순서 3
- 담당: test-writer
- 파일: `e2e/share-card.spec.js` — **파일 끝에 새 테스트만 더한다**(위 `fakeShare` · `reveal` · `press` · `shared`를 쓴다. 이미 있는 테스트 줄은 T10 표 말고 안 고침)
- AC: AC-7 · AC-4(카드) · plan A2 '카드 자리표'(좌표는 테스트에 글자로 적음 — 구현을 import하지 않음)
- 돕는 함수(`expect` 없음): `pixelsOf(page, bytes)` → 페이지에서 `createImageBitmap(new Blob([bytes]))` → 1080×1350 캔버스 → `getImageData` 를 `Uint8ClampedArray`로 돌려줌 · `near(px, hex, tol)`.
  - `CAREER-40 AC-7 the card is a pawn ticket`: `ok(30)` · 내 값 `23` → 카드 1080×1350 · 이름 `how-much-card.jpg` · 차양 · 점선 · 나무 칸 · 꼬리표 · 도장 · 아저씨 얼굴 점(plan 표 그대로, ±32).
  - `CAREER-40 AC-7 my number is on the card, the uncle's is not`: 같은 사진 · 내 값 `23`에서 `mochi` `30` · `3` · `23`의 카드 바이트가 모두 같음 · 내 값 `24` 카드와는 다름 · `안 팔아`와도 다름.
  - `CAREER-40 AC-1 0023 and 23 leave the same` (**K7 짝**): 같은 사진 · `ok(30)` · 내 값 `'0023'`과 `'23'`을 따로 쳐서 감정 · 카드 → 두 요청 URL이 같고(`myPrice=ten`) 두 카드 바이트가 같다 · 요청 URL에 `0023` 0번.
  - `CAREER-40 AC-4 한정선 9999개 stays inside the wood box`: 내 값 `9999` → 내 값 띠에서 `#ffd27a`(±48) 가장 오른쪽 x ≤ 924 · 오른쪽 테두리 띠 모두 `#2b1a0e`(±40) · 띠 안에 노란 픽셀이 1개 이상(그려졌음).
- 단계: 1. 쓴다. 2. `e2e`. 3. 커밋: `CAREER-40: pawn ticket card e2e`
- 검사 명령: `e2e`
- 끝난 상태: 새 실패가 이 네 테스트(+ T1의 이름 때문에 걷는 테스트).

<a id="t10"></a>
## T10 [P] — 이미 있는 테스트 옮기기 (A6 · AC-10) · 순서 3
- 담당: test-writer
- 파일(이 표 말고는 바꾸지 않는다): `app/tests/FirstFlow.test.jsx` · `ThreeScreens.test.jsx` · `ScreenHistory.test.jsx` · `connect.test.jsx` · `ShopSteps.test.jsx` · `ShopFaces.test.jsx` · `ShopFailure.test.jsx` · `ShopReveal.test.jsx` · `ShopHistory.test.jsx` · `ShopA11y.test.jsx` · `ShareCard.test.jsx` · `PixelMap.test.jsx` · `e2e/first-flow.spec.js` · `daily-limit.spec.js` · `photo-upload.spec.js` · `connect-screen.spec.js` · `three-screens-history.spec.js` · `three-screens-view.spec.js` · `shop-history.spec.js` · `shop-requests.spec.js` · `shop-view.spec.js` · `shop-font.spec.js` · `shop-a11y.spec.js` · `share-card.spec.js`(위쪽 이미 있는 줄)
- AC: AC-10 · 원본 plan A6

**짝 종류** — plan A6 K1~K9 그대로.

**파일별**
| 파일 · 자리 | 짝 |
|---|---|
| 모든 파일의 `pickPrice('🍡 N개')` · `{ name: '🍡 N개' }` · `'🙅 안 팔아'` · `toHaveText('🍡 10개')`(눌린 칩 글자) | K1 |
| `appraised-price` · `my-price` · `getByText` · `findByText` · `queryByText`의 `모찌 N개` | K2 → `한정선 모찌 N개` |
| ShopReveal 표의 `🍡 × 10` · `` `🍡 × ${mochi}` `` · `` `모찌 ${mochi}개` `` | K2 (`한정선 10개` · `` `한정선 ${mochi}개` `` · `` `한정선 모찌 ${mochi}개` ``) |
| FirstFlow `PRICES` 상수 · 'AC-3 four price buttons…' | K3 — `priceGroup().getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'))`의 글자가 `['1개','10개','100개','777개','안 팔아']` · 마지막 누른 하나만 `true` |
| ThreeScreens · ShopSteps · ScreenHistory의 눌림 표(`'🍡 1개': 'false'` …) | K3 (`1개` · `10개` · `100개` · `777개` · `안 팔아` 다섯 키) |
| ThreeScreens `['price', () => pickPrice('🍡 100개'), … 'hundred' …]` · `my-price … '모찌 100개'` | K1 · K2 (`100개` → 여전히 `hundred`) |
| ShopFaces '%s shows %s' 의 `shop-item` 4개(`vase` …) | K4 |
| shop-view 'CAREER-35 AC-9 pixels stay on whole cells' | **K8 — `emulateMedia`를 넣지 않는다.** `uncle` 폭 % 40 · 조상 `transform` · `crispEdges` 세 줄(194~196행)은 **안 고침**. 고치는 줄: 197~198행 `shop-item` 폭 % 12 → K4(`truck-board` 자손 상자가 판 기준 % 3 === 0인 목록이 모두 0이고 1개 이상) · 207행 `pickPrice` K1 · 209행 `모찌 3개` → `한정선 모찌 3개` K2 |
| PixelMap `cellsOfSvg`의 정규식 | K9 (`/M(\d+) (\d+)h(\d+)v1h-\3z/g`로 풀어 `n`칸 펼침. '남는 글자 · 같은 칸 두 번이면 던짐'은 그대로) |
| FirstFlow 'AC-5 no free-text field…' **④ 줄(135행)만** | **K7** — plan A6 'K7 — 다시 짬'의 1~5 그대로 이 테스트 안에 넣는다: (1) `[...container.querySelectorAll(FREE_TEXT)]` `toEqual([priceInput()])` (2) 그 칸 `type` `text` · `inputMode` `numeric` · `pattern` `[0-9]*` · `form` `null` · `name` `''` (3) `['자유글', '23abc', '<b>zz</b>', '１２', '🍡7', 'x'.repeat(500)]` 하나씩 쳐서 `감정 받기!` 꺼짐 · 누름 · 칸에서 Enter → `appraise` 0번 (4) 같은 글마다 칸을 뺀 복제본 `textContent` · 모든 속성 값에 0번 · `localStorage` · `sessionStorage` 길이 0 · `location.href` 처음과 같음 (5) 그 뒤 지금 흐름(136행 `pickPrice` → K1 `10개`). `FREE_TEXT` 상수 · ①②③⑤⑥ 줄(128 · 130 · 133 · 139 · 142행)은 **안 고침**. 짝을 이루는 새 테스트: T2 `only the number leaves the price field` · T9 `0023 and 23 leave the same` |
| e2e first-flow 32행(①) · 79행(⑥) `FREE_TEXT` | **안 고침** — 숫자 칸이 없는 화면(지난 판에서 K7에 잘못 넣었음) |
| ShopFaces 'CAREER-35 AC-4 daily_limit has no uncle' (105~110행) | **안 고침** — `closed-sign`이 끝 그림에 남는 기둥 팻말 첫 줄에 있고 글자 `오늘 영업 끝` 그대로(plan A2 '퇴근 E' (다)) |
| share-card.spec.js `toSubmit`의 `price = '🍡 10개'` 및 위쪽 `take` · `fresh` · `reveal` 이름 | K1 |
| shop-view 'AC-2 chosen chip shows ▶'의 `🍡 10개` · `🍡 1개` | K1 |
| 퇴근 문구(`OFF_DUTY_TEXT` · `contractText('daily_limit')`) · `closed-sign` `오늘 영업 끝` · `가게에 들어가기` | **안 고침**(원본에서 읽거나 글자가 그대로) |

- 옮기지 않음: `App.test.jsx` · `appraise.test.js`(`myPrice: 'ten'`은 어댑터 약속 그대로) · `photo.test.js` · `FontBuild.test.js` · `e2e/playwright.config.js` · `photo-fixtures.js` · `guard-8787.js`
- 단계
  1. 표대로 고친다. `expect`가 든 돕는 함수를 새로 만들지 않는다.
  2. `unit` · `e2e` → 고친 테스트는 '`10개` · `textbox` 못 찾음' 등 F 전 이유로 실패(안 고친 테스트는 그대로).
  3. 아래 확인 명령 → 파일마다 `names same` · `expect` `main <= 지금`.
  4. `expect`가 든 `-` 줄을 모두 위 짝(K1~K8)에 대 보고 PR에 붙일 글로 남긴다.
  5. 커밋: `CAREER-40: move existing tests to hanjeong and price field`
- 확인 명령:
  ```
  bash -c 'for f in app/tests/FirstFlow.test.jsx app/tests/ThreeScreens.test.jsx app/tests/ScreenHistory.test.jsx app/tests/connect.test.jsx app/tests/ShopSteps.test.jsx app/tests/ShopFaces.test.jsx app/tests/ShopFailure.test.jsx app/tests/ShopReveal.test.jsx app/tests/ShopHistory.test.jsx app/tests/ShopA11y.test.jsx app/tests/ShareCard.test.jsx app/tests/PixelMap.test.jsx e2e/first-flow.spec.js e2e/daily-limit.spec.js e2e/photo-upload.spec.js e2e/connect-screen.spec.js e2e/three-screens-history.spec.js e2e/three-screens-view.spec.js e2e/shop-history.spec.js e2e/shop-requests.spec.js e2e/shop-view.spec.js e2e/shop-font.spec.js e2e/shop-a11y.spec.js e2e/share-card.spec.js; do echo "== $f"; re="[\x27\`][^\x27\`]*(AC-[0-9]|CAREER-[0-9])[^\x27\`]*[\x27\`]"; diff <(git show "origin/main:$f" | grep -oE "$re" | sort) <(grep -oE "$re" "$f" | grep -v "CAREER-40" | sort) && echo "names same"; echo "expect $(git show "origin/main:$f" | grep -c "expect(") -> $(grep -c "expect(" "$f")"; git diff -U0 origin/main -- "$f" | grep -E "^-.*expect"; done; git grep -nE "\.skip\(|test\.only|it\.only" -- app/tests e2e/*.js'
  ```
- K7 · K8 확인 명령(지금 단언이 그대로 남았나):
  ```
  git diff -U0 origin/main -- e2e/shop-view.spec.js | grep -E '^-.*(% 40|transformed|crispedges|emulateMedia)'; echo "K8 removed-lines above (expect none)"; git diff -U0 origin/main -- e2e/shop-view.spec.js | grep -E '^\+.*emulateMedia'; echo "K8 added emulateMedia above (expect none)"; git diff -U0 origin/main -- app/tests/FirstFlow.test.jsx | grep -E '^-.*FREE_TEXT'; echo "K7 removed FREE_TEXT lines above (expect exactly the step-4 line)"; git diff --stat origin/main -- e2e/first-flow.spec.js app/tests/ShopFaces.test.jsx
  ```
- 끝난 상태: 위 2 · 3 · 4 그대로 · 마지막 `git grep` 출력 없음 · K8 두 줄 출력 없음 · K7 지운 줄은 `// ④` 한 줄뿐 · `first-flow.spec.js` · `ShopFaces.test.jsx`는 위 표에 있는 짝(K1~K4) 줄만 바뀌고 `FREE_TEXT` · `closed-sign` 줄은 안 바뀜.

---

## F1 — 숫자 칸 · 글자 · id 표 (초록: AC-1 · AC-2 · 퇴근 글자) · 순서 4
- 담당: frontend-dev
- 파일: `app/src/options.js` · `app/src/App.jsx` · `app/src/shop.css`(숫자 칸 부분만)
- AC: AC-1 · AC-2 · AC-8(글자) · 원본 plan A5 · A3
- 단계
  1. `options.js`: `MY_PRICE` · `priceIdOf` · `PRICE_TEXT`(`empty` = `한정선 몇 개에 넘길지 불러 주세요. 값만 궁금하면 ‘안 팔아’도 돼요.` — 굽은 따옴표 그대로 · `bad` = `1부터 9999까지 정수만 넣을 수 있어요.` · `label`) · A3 표의 `STEPS` · `THINKING_LINE` · `NOTICE_DOOR` · `NOTICE_THINKING` · `OFF_DUTY_TEXT`(contracts §5 글자 그대로). `PRICES`는 F2까지 남긴다(`shareCard.js`가 씀).
  2. `App.jsx`: `myPrice` → `mine` 상태 · plan A5 상태 표 · 마크업 · `submit`이 `priceIdOf(sent)`를 넘기고 `sent`를 기억.
  3. `shop.css`: 숫자 칸 · −/+(`.sq`, 높이 48 이상) · 칸 글자 16px 이상 · 빠른 버튼 다섯이 375에서 **한 줄**(간격 · 안쪽 여백 3의 배수).
  4. 숫자 칸은 `<form>` 밖 · `name` 없음 · 친 글을 안내 문구나 다른 곳에 비추지 않음 · ⑤로 가면 칸이 사라짐(K7 묶음 2 · 4 · 5).
  5. `unit` → `PriceInput` · `PriceQuery` · 퇴근 글자 · FirstFlow 'AC-5 no free-text field…' 테스트 통과. 6. 커밋: `CAREER-40: price number field`
- 검사 명령: `unit`
- 끝난 상태: lint 0 · 실패 이름에 `CAREER-40 AC-1`(단 `only the number leaves the price field`는 ⑥ 한정선 · `makeCard(photo, mine)`이 필요해 F2에서 초록) · `AC-2` · `CAREER-27 AC-9` · `AC-5 no free-text field` 없음.

## F2 — ⑥ 한정선 · 보낸 값 붙이기 (초록: AC-3 · AC-4 화면) · 순서 5
- 담당: frontend-dev
- 파일: `app/src/App.jsx` · `app/src/options.js` · `app/src/ShareRow.jsx` · `app/src/shareCard.js`(내 값 한 줄만) · `app/src/shop.css`
- AC: AC-3 · AC-4(⑥ · ④)
- 단계
  1. `result.mine` · ⑥ 값 한 줄 `[한정선 그림] 한정선 N개`(그림은 시안 Result의 12×10 svg를 path로, `aria-hidden`) · `my-*` · `compare-line`(`result.mine`) · `stamp` 자리(`aria-hidden`, 움직임은 F4) · `white-space: nowrap`.
  2. `ShareRow`에 `mine`을 넘기고 `makeCard(photo, mine)` · 카드의 내 값 줄을 `한정선 N개`로(모양은 F5). `PRICES` 지움.
  3. `unit` · `e2e` → `PawnReveal` · `OldUnit` · `pawn-fit` 통과. **④ · ⑥이 548을 넘으면 값을 정하지 말고 멈춘다**(plan A4 예산 · (가) (나)).
  4. 커밋: `CAREER-40: hanjeong values on the reveal`
- 검사 명령: `unit` 다음 `e2e`
- 끝난 상태: 실패 이름에 `CAREER-40 AC-3` · `AC-4 9999 against` · `AC-4 9999 is fully` · `AC-1 only the number leaves` 없음.

## F3 — 트럭 장면 · 퇴근 (초록: AC-5 · AC-8) · 순서 6
- 담당: frontend-dev
- 파일: `app/src/truck.js` (새로) · `app/src/Shop.jsx` · `app/src/Pixel.jsx` · `app/src/App.jsx`(`Shop`에 `mode` · `night` · `big` 넘김만) · `app/src/shop.css`
- AC: AC-5 · AC-8 · 원본 plan A2
- 단계
  1. `truck.js`: 시안 `Scene.dc.html` 155~215줄을 **손으로 고치지 않고** `truckLayers(night)`로 옮긴다.
  2. `Shop.jsx`: plan A2 표식 표 · 판 390×300 · 보통 장면 180(위 66 자름) · 간판 글자 · 말풍선. 퇴근(plan A2 '퇴근 E'): `truck`에 `data-truck="gone"`(그 밖은 `here`) · 셔터 · 셔터 팻말(장식) · 연기는 `truck` 안 · 기둥 팻말 `post-sign`은 `truck` 밖, 첫 줄 `closed-sign` `오늘 영업 끝` / 둘째 줄 `내일 또 와요`(⑨-1 자리). 물건 · 선반 · 나무 벽 · 옛 `.closed` 팻말과 그 CSS(`rotate`) 지움. `memo`.
  2-1. `shop.css`: `[data-truck=gone]` · `smoke`는 `visibility: hidden`(움직임 없이도 끝 모습). 판은 `overflow: hidden`.
  3. `Pixel.jsx`: 이어진 조각 path. 눈 덮개는 `base` · `happy`에서만.
  4. `unit` · `e2e` → `PawnScene` · `pawn-scene` · `PixelMap`(옮긴 것) · `ShopFaces` 통과.
  5. 커밋: `CAREER-40: mobile pawnshop truck scene`
- 검사 명령: `unit` 다음 `e2e`
- 끝난 상태: 실패 이름에 `CAREER-40 AC-5` · `AC-8` 없음.

## F4 — 움직임 A~F (초록: AC-6) · 순서 7
- 담당: frontend-dev
- 파일: `app/src/shop.css` · `app/src/countUp.js` (새로) · `app/src/App.jsx` · `app/src/Shop.jsx`(클래스만)
- AC: AC-6 · 원본 plan A2 '움직임 규칙'(이름 · 시간 표)
- 단계
  1. 모든 keyframes를 `@media (prefers-reduced-motion: no-preference)` 안에. `forwards` · `both` 없음. 거리 · 높이 3의 배수. **`transform` · `translate` · `scale` · `rotate`를 쓰지 않는다** — 자리는 `left` · `top`, 크기는 `width` · `height` · `margin`(plan A2 '움직임 규칙' 표 그대로). F 누르기를 위해 `.btn` · `.chip` · `.sq`에 `position: relative`.
  2. 퇴근 E: `hm-shut-down` · `hm-drive`(지연 1.8s `backwards`, 키프레임 `visibility: visible`) · `hm-smoke`(지연 1.8s, fill 없음) · `hm-post`(3.96s `visibility: hidden`) — plan A2 '퇴근 E' 표의 때 그대로.
  3. `countUp.js`의 `useCountUp` → ⑥ 큰 값 글자.
  4. `e2e` → `pawn-motion` · `shop-a11y`의 'nothing moves with reduced motion' · **`shop-view`의 'CAREER-35 AC-9 pixels stay on whole cells'**(이제 움직이는 중에 돈다) 통과. 통과가 안 되면 테스트가 아니라 움직임을 고친다.
  5. 커밋: `CAREER-40: stepped motion for arrive, reveal and leave`
- 검사 명령: `unit` 다음 `e2e` 다음 `grep -rnE '(^|[^-a-zA-Z])(transform|translate|scale|rotate)\s*:|translate[XYZ3]?\(|scale[XYZ3]?\(|rotate[XYZ3]?\(' app/src --include='*.css' --include='*.jsx' --include='countUp.js'; echo "transform grep above (expect none)"`
- 끝난 상태: 실패 이름에 `CAREER-40 AC-6` · `CAREER-40 AC-5 the CAREER-35 cell check` · `CAREER-35 AC-8` · `CAREER-35 AC-9` 없음 · transform grep 출력 없음(`text-transform`은 정규식이 거름).

## F5 — 전당표 카드 (초록: AC-7 · AC-4 카드) · 순서 8
- 담당: frontend-dev
- 파일: `app/src/shareCard.js` · `app/src/options.js`(`CARD`)
- AC: AC-7 · AC-4(카드) · 원본 plan A2 '카드 자리표'
- 단계
  1. 자리표대로 그린다. `mochi` · `line`을 받지 않는다. 사진은 `preparePhoto` 결과만(ADR-0010). 내 값 글자는 `measureText`가 612를 넘으면 6px씩 줄임.
  2. `e2e` → `share-card.spec.js` 전부 통과(CAREER-34 · 36 · 37 · 40).
  3. 커밋: `CAREER-40: pawn ticket share card`
- 검사 명령: `e2e`
- 끝난 상태: `share-card.spec.js` 실패 0.

## F6 — 375 맞춤 · 전체 검사 · 무게 (초록: 나머지 · AC-9) · 순서 9
- 담당: frontend-dev
- 파일: `app/src/shop.css` (필요할 때만)
- AC: AC-4 · AC-9 · AC-10
- 단계
  1. CAREER-35 `shop-view` · `three-screens-view` · CAREER-34 'AC-8 in view'가 통과하는지 본다. **값을 바꿔야만 통과되면 멈추고** plan A4 (가) (나)를 들고 알린다.
  2. 무게(CAREER-35 tasks F6 4단계와 같은 방법): `npm --prefix app run build && for f in app/dist/index.html app/dist/assets/*; do printf '%s raw=%s gz=%s\n' "$f" "$(wc -c <"$f")" "$(gzip -c "$f" | wc -c)"; done | tee /dev/stderr | awk -F'raw=' '{split($2,a," "); s+=a[1]} END {print "raw total=" s}'` → **raw total ≤ 1,000,000**. 넘으면 멈춘다. 명령과 숫자를 PR '비용·남용 영향' 칸에.
  3. 커밋(고친 게 있을 때만): `CAREER-40: fit pawnshop screens in 375x548`
- 검사 명령: `bash -c 'for n in lint test build e2e api; do echo "== $n"; bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)"; echo "exit=$?"; done'; git status --porcelain app e2e`
- 끝난 상태: 모두 `exit=0` · 통과 수 0 아님 · `[guard-8787] 받은 요청 0개` · `git status`에 `node_modules` · `dist` · `test-results` 없음.

## H0 — 화면 찍기를 사용자가 시안과 본다 · 순서 10
- 담당: **사용자** (frontend-dev가 파일을 건넴)
- 파일: 없음 (`e2e/test-results/**` 아래, 커밋하지 않음)
- AC: AC-5 · AC-7 그림 · plan A3 '시안과 다르게 한 곳' · A4
- 단계: 1. frontend-dev가 `shop-view`의 `CAREER-35 Q9 shots`(11장)와 `share-card`의 `CAREER-34 H0 shots` 경로를 보고한다. 2. 사용자가 `mockup-v3/` 시안(캔버스 artifact)과 나란히 본다. 실패 4가지 · busy는 이 눈 확인이 대신한다(A4). 3. 고칠 값이 있으면 plan을 고치고 F를 다시 돌린다.
- 검사 명령: `find e2e/test-results -name '*.png' | wc -l`
- 끝난 상태: 사용자가 '이대로' 또는 고칠 곳을 말했다.

## P1 — PR · 순서 11
- 담당: frontend-dev(검사 · PR 열기) · reviewer · 사용자(머지)
- 파일: 없음 (PR 본문 — `.github/pull_request_template.md`)
- AC: AC-10 · 전부(대조표)
- 단계
  1. F6 검사 명령을 다시 돌려 출력 그대로 보고.
  2. T10 확인 명령 결과와 `-` 줄 짝을 PR '결정' 칸 아래에 붙인다.
  3. `git diff --stat origin/main -- api infra e2e/playwright.config.js pipeline.config.json app/vite.config.js app/eslint.config.js app/tests/App.test.jsx app/src/appraise.js app/src/photo.js specs/CAREER-40-pawnshop-concept/mockup-v3 docs/adr` → 빈 줄.
  4. `git diff origin/main -- contracts` → plan C0 · C1 · C2 줄만.
  5. 제목 `CAREER-40: mobile pawnshop with hanjeong and typed price`. 칸:
     - 결정: plan A5 표(자릿수) · 빠른 버튼 눌림 규칙 · 그림 div 방식 · 움직임 이름 표 · 카드 자리표 · `makeCard(photo, mine)`(ADR-0010 본문 인자 이름과 다름) · A1 답 · T10 짝
     - 범위 변경: **CAREER-41 `api/` 작업 때 `myPrice`를 요청에서 빼기(spec Q1 (c))** · 쓰지 않는 물건 지도 `I` · `Item` 지우기
     - 새 의존성: 없음
     - 비용·남용 영향: spec 그대로 + F6 무게 표 + "AC-11은 머지 · 배포 뒤 이 칸에 덧붙임"
     - spec AC-1~11 ✔/✘ 대조(AC-11은 '머지 뒤 H1')
- 검사 명령: `gh pr checks --watch`
- 끝난 상태: 필수 검사 모두 통과(`reviewer/gate` 포함) · 3단계 빈 줄.

## H1 — iPhone 확인 (AC-11) · 머지 · 배포 뒤
- 담당: **사용자** (배포 `docs/runbook/배포.md` §3, 로그 §5, 상한 §8)
- 파일: 없음 (PR '비용·남용 영향' 칸에 덧붙임)
- AC: AC-11 (a)~(f)
- 단계: spec AC-11 '할 때' 그대로. (a)에서 버튼 눌림(F)이 iOS에서 보이는지도 본다(plan A2 '확인 못 함'). (e)는 runbook §5 로그에서 `appraise` 줄 수 · `bad_my_price` 0줄 · `attempts`.
- 검사 명령: runbook §5 로그 보기 명령
- 끝난 상태: (a)~(f) 모두 ✔이고 PR 칸에 적혀 있다. (b) · (c)가 ✘면 완료가 아니다.

## R1 — runbook 글자 · H1 뒤
- 담당: release-ops
- 파일: `docs/runbook/배포.md` §6-2(161행) · §8(187행)
- AC: 없음 (spec Q3 · plan 'contracts 고친 줄' 끝)
- 단계: 1. 161행 `아저씨가 바로 🚶퇴근이다`를 `퇴근 문구가 바로 보이고, 셔터를 내린 트럭이 떠나 빈 길 · 기둥 팻말이 남는다`로, 187행 `🚶퇴근`을 `빈 길 · 기둥 팻말 · 퇴근 문구`로 바꾼다. 문구 글자는 runbook에 베끼지 않는다(원본 contracts §5). 다른 줄은 바꾸지 않는다. `배포-증거-점검표.md`는 그날의 기록이라 고치지 않는다. 2. 커밋: `CAREER-40: runbook off-duty wording`
- 검사 명령: `grep -n '🚶\|퇴근했어요\|출근해요' docs/runbook/배포.md`
- 끝난 상태: 출력 없음.

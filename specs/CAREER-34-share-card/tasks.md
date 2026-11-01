[CAREER-34](https://culonculon98.atlassian.net/browse/CAREER-34) · spec: [spec.md](spec.md) · plan: [plan.md](plan.md) · ADR: [0010](../../docs/adr/0010-share-card-drawn-without-value.md)

상태: 승인됨 (2026-11-01)

- 방식: **맡긴다**. 브랜치 `CAREER-34-share-card` 하나. 순서: **U1 → T1~T9 → F1 → F2 → F3 → F4 → F5 → H0 → P1 → (머지 · 배포 뒤) H1 → 시간이 남으면 D**
  - 테스트 커밋(T)이 모두 구현 커밋(F)보다 먼저다. T2~T9는 한 파일에 쓰므로 [P]가 없다. F도 같은 파일들을 고치므로 [P]가 없다.
- **U1 전에는 만들지 않는다**(CLAUDE.md §4).
- 명령은 **저장소 루트**에서. 세션 보고에는 출력 그대로, PR '검사 결과' 칸에는 CI 링크만.
- 이름 · 코드 모양의 원본: [plan](plan.md) A1 '코드 모양' · A2 표 · A4 '공유 창 흉내'.
- 테스트가 실패하면 **느슨하게 고치지 않는다.** 화면을 고치거나 멈춘다. 이미 있는 테스트 · `e2e/shop-steps.js` · `app/tests/shop-steps.jsx` · `e2e/playwright.config.js`는 고치지 않는다. 설정을 바꿔야 한다는 결론이 나오면 역할은 훅에 막히므로 PR에 사유를 적고 사용자가 고친다.
- 공통 고정값: 대사는 `shop-steps.js`의 `LINE`(숫자 없음) · 태그 `🎁 선물` · 파일 이름 `how-much-card.jpg` · 카드 1080×1350.
- 공통 검사: `unit` = `npm --prefix app run lint && { npm --prefix app test; echo "unit exit=$?"; }` / `e2e` = `bash -c "$(jq -r '.checks.app.e2e' pipeline.config.json)"; echo "e2e exit=$?"`

## 11/8까지 — 꼭 / 미룸
| | 무엇 | 언제까지(목표) |
|---|---|---|
| **꼭** | U1 | 11/2 |
| **꼭** | T1~T9 (AC-1~8 빨강) | 11/3 |
| **꼭** | F1~F5 (AC-1~8 초록) | 11/4 |
| **꼭** | H0 · P1 (AC-10) · 사용자 머지 | 11/5 |
| **꼭** | 배포 · H1 (AC-9) | **늦어도 11/6** (11/7은 고칠 여유) |
| 미룸 | D1 · D2 · D3 | 시간이 남으면. 11/8 전에 끝나지 않으면 **하지 않는다** |

- 날짜는 어림이다. **11/6에 AC-9까지 못 가면 AC를 줄이지 말고 사용자에게 알린다.** 줄일 후보(사용자 결정, spec을 고침): AC-6 ④⑤ '저장으로 잇기' → 문구만.

---

## U1 — 사용자 승인 · 순서 1
- 담당: **사용자** (글 고침은 architect 세션)
- 파일: `specs/CAREER-34-share-card/plan.md` · `tasks.md` · `docs/adr/0010-share-card-drawn-without-value.md`
- AC: 만들기 시작 조건 · AC-7 ② 문구
- 단계
  1. plan '사용자가 정할 것' 1~4를 고른다. (4는 H0로 미뤄도 된다)
  2. architect 세션이 답을 plan에 적고 고른 문구를 '코드 모양' 옆에 적으며 plan · tasks `승인됨`, ADR-0010 `확정`으로 바꾼다.
  3. 커밋: `CAREER-34: share card plan and ADR-0010`
- 검사 명령: `grep -m1 -H '^상태' specs/CAREER-34-share-card/plan.md specs/CAREER-34-share-card/tasks.md; grep -m1 -H '^- 상태' docs/adr/0010-share-card-drawn-without-value.md; git diff --stat origin/main -- contracts`
- 끝난 상태: 세 줄이 `승인됨` / `확정` · contracts diff 빈 줄 · plan에 문구 두 개가 적혀 있다.

---

## T1 — AC-1 공유 버튼 자리 단위 테스트 (빨강) · 순서 2
- 담당: test-writer
- 파일: `app/tests/ShareCard.test.jsx` (새로)
- AC: AC-1
- 머리: `vi.mock('../src/appraise.js', …)`. `app/tests/shop-steps.jsx`의 `renderApp` · `walkToPrice` · `pickPrice` · `submit` · `reject` · `hold` · `back` · `enter` · `resetHistory`. `share` 흉내는 넣지 않는다(jsdom에서 그리기가 실패해도 이름은 '공유').
- 테스트 (이름 앞머리 `CAREER-34 AC-1 share button only on the reveal`, 뒤에 경우 이름)
  - ⑥: `getAllByRole('button', { name: '공유', exact: true })` 1개.
  - ① · ② · ③ · ④ · ⑤(`hold`): `queryByRole('button', { name: /공유/ })` null. ⑤ `queryAllByRole('button')` 0개.
  - ⑥ → `back()` → ④: 없음.
  - ⑤ → `back()` → 바쁨 ④: 없음.
  - `test.each` `refused` · `person_limit` · `unavailable` · 코드 없음 · `daily_limit` · `invalid_input`(②): 없음.
- 단계: 1. 쓴다. 2. `unit` → 이 파일의 ⑥ 경우만 실패하고 이유가 '공유'를 못 찾음(없음을 보는 경우는 이미 통과). 3. 커밋: `CAREER-34: share button placement tests`
- 검사 명령: `unit`
- 끝난 상태: lint 0 · 새 실패는 ⑥ 경우 하나 · 이유가 위와 같다.

## T2 — AC-2 파일 하나를 공유 창으로 (빨강) · 순서 3
- 담당: test-writer
- 파일: `e2e/share-card.spec.js` (새로)
- AC: AC-2 · plan A4
- 돕는 함수(이 파일 안, `expect` 넣지 않음)
  - `fakeShare(page, mode)` — `goto` 전 `addInitScript`. 먼저 `delete Navigator.prototype.share` · `canShare`. `HTMLCanvasElement.prototype.toBlob`을 감싸 `window.__toBlobs`를 센다. `mode`: `ok`(끝남) · `hold`(끝나지 않음) · `abort` · `notallowed` · `other` · `none`(둘 다 없음) · `nocanshare`(`share`만) · `cantshare`(`canShare` false).
    - `canShare(d)`: `__share.order`에 `'canShare'`, 파일 개수 기록.
    - `share(d)`: **동기로 먼저** `order`에 `'share'` · `keys: Object.keys(d)` · `active: navigator.userActivation.isActive` · `toBlobs: window.__toBlobs`를 기록한 뒤 파일 `name` · `type` · base64 · `createImageBitmap`의 가로 · 세로를 기록한다. 그다음 `mode`대로 끝난다. **기록이 끝난 뒤 끝나게** 한다(`hold`는 기록만).
  - `shareOf(page)` = `getByRole('button', { name: '공유', exact: true })`. `reveal(page, { price = '🍡 10개', file = png })`: `page.goto('/')` → `document.fonts.ready` → `enter` → `photoInput.setInputFiles(file)` → `next` → `🎁 선물` → `next` → `pickPrice` → `submitOf.click` → `getByTestId('mascot-line')` 기다림. 답(`routeQueue`)은 부르는 쪽이 먼저 건다. 다시 부르면 새로 시작이다(init script는 유지됨).
  - `shared(page)` → `expect.poll`로 기록을 기다려 `{ ...record, bytes: Buffer }`.
- 테스트 `CAREER-34 AC-2 share passes one image file`
  - `hold`: 누르기 직전 `__toBlobs`를 읽고 누른다 → `order`가 `['canShare', 'share']`로 시작 · `share` 1번 · `active === true` · **`toBlobs`가 누르기 직전과 같음**(눌렀을 때 그리지 않음) · `keys`가 `['files']` · 파일 1개 · `type`이 `image/`로 시작 · 가로 · 세로 > 0 · 내려받기 0(`page.on('download')`).
  - `CAREER-34 AC-2 share passes one image file — double press`: `hold` · `shareOf(page).dblclick()` → 잠시 뒤에도 `share` 1번.
- 단계: 1. 쓴다. 2. `e2e` → 새 실패가 이 파일 · 이유가 '공유'를 못 찾음. 3. 커밋: `CAREER-34: share sheet e2e`
- 검사 명령: `e2e`
- 끝난 상태: `exit` 0 아님 · 이유가 위와 같음 · 출력에 `[guard-8787] 받은 요청 0개`.

## T3 — AC-3 값이 바이트에 영향 없음 (빨강) · 순서 3
- 담당: test-writer
- 파일: `e2e/share-card.spec.js`
- AC: AC-3
- 테스트 `CAREER-34 AC-3 card bytes ignore mochi and compare line`: `fakeShare(page, 'hold')` · `routeQueue(page, [ok(30), ok(3), ok(10), ok(30), ok(3)])` · 같은 `LINE`. `reveal`을 차례로 불러 ① `🍡 10개` + 30 · 3 · 10 ② `🙅 안 팔아` + 30 · 3의 파일을 받는다.
  - ① 세 `bytes`가 `Buffer.equals`로 같고 ② 두 `bytes`가 같으며 파일 이름이 모두 같다. ①과 ②는 다르다(내 값이 정말 들어감).
  - `name`과 `JSON.stringify(keys)`에 `30`이 없다.
- 단계: 1. 쓴다. 2. `e2e`. 3. 커밋: `CAREER-34: card ignores mochi e2e`
- 검사 명령: `e2e`
- 끝난 상태: 새 실패가 이 테스트.

## T4 — AC-4 지금 결과의 내용 (빨강) · 순서 3
- 담당: test-writer
- 파일: `e2e/share-card.spec.js`
- AC: AC-4
- 준비: 다른 사진은 `makeFixtures(browser).F3`(800×600 PNG). 답은 모두 `ok(30)`. 태그는 모두 `🎁 선물`.
- 테스트 `CAREER-34 AC-4 card shows only the current result`
  - `ㄷ1` 새로 시작 `png` + `🍡 1개`. `ㄷ2` 새로 시작 F3 + `🍡 100개`.
  - `ㄱ` `png` + `🍡 10개` → ⑥ → `page.goBack()` → `🍡 1개` → `submitOf` → ⑥ → 파일이 `ㄷ1`과 같다.
  - `ㄴ` `png` + `🍡 10개` → ⑥ → `다른 물건 꺼내기` → F3 → `next` → `🎁 선물` → `next` → `🍡 100개` → `submitOf` → 파일이 `ㄷ2`와 같다.
  - 다름: `png` + `🍡 1개` ≠ `png` + `🍡 10개`(내 값) · `png` + `🍡 100개` ≠ `ㄷ2`(사진).
- 단계: 1. 쓴다. 2. `e2e`. 3. 커밋: `CAREER-34: card shows current result e2e`
- 검사 명령: `e2e`
- 끝난 상태: 새 실패가 이 테스트.

## T5 — AC-5 위치 정보 없음 (빨강) · 순서 3
- 담당: test-writer
- 파일: `e2e/share-card.spec.js`
- AC: AC-5
- 테스트 `CAREER-34 AC-5 card has no location data`: `makeFixtures(browser).F1`로 `reveal` → 공유 → `jpegInfo(bytes)`가 `isJpeg: true` · `hasExif: false` · 1080×1350. `bytes.includes(F1.buffer.subarray(0, 4096))` false · `bytes.includes(Buffer.from('how-much\0'))` false(F1 EXIF 글자).
- 단계: 1. 쓴다. 2. `e2e`. 3. 커밋: `CAREER-34: card location data e2e`
- 검사 명령: `e2e`
- 끝난 상태: 새 실패가 이 테스트.

## T6 — AC-6 저장으로 넘어감 (빨강) · 순서 3
- 담당: test-writer
- 파일: `e2e/share-card.spec.js`
- AC: AC-6 · plan A2
- `for` `none` · `nocanshare` · `cantshare`: `CAREER-34 AC-6 falls back to download — ${mode}`: ⑥ → `shareOf` 누름 → 내려받기 1번 → 버튼(`share-button`) 글자 `저장` · `share-note` 없음.
- `for` `notallowed` · `other`: `CAREER-34 AC-6 falls back to download — ${mode}`: 누름 → 내려받기 0 · `share-note` 보임 · `저장` → 다시 누름 → 내려받기 1번 · `share-note` 사라짐. 내려받은 파일과 `shared().bytes`가 같다.
- 모든 경우: `jpegInfo`가 `hasExif: false` · 파일 이름 `how-much-card.jpg` · `getByRole('region', { name: '감정 결과' })` 보임 · 값 창 그대로 · `location.pathname === '/'`.
- `none` · `nocanshare` · `cantshare`는 공유 파일이 없으므로, 같은 테스트에서 `const other = await page.context().newPage()`에 `fakeShare(other, 'hold')` · 같은 고른 것 · 같은 답으로 공유 파일을 받아 내려받은 파일과 바이트를 비교한다.
- 단계: 1. 쓴다. 2. `e2e`. 3. 커밋: `CAREER-34: download fallback e2e`
- 검사 명령: `e2e`
- 끝난 상태: 새 실패가 이 테스트들.

## T7 — AC-7 취소 · 그림 실패 · 글꼴 실패 (빨강) · 순서 3
- 담당: test-writer
- 파일: `e2e/share-card.spec.js`
- AC: AC-7
- 이름 앞머리 `CAREER-34 AC-7 cancel, draw failure and font failure stay on the reveal`
  - `— cancel`: `abort` → 내려받기 0 · `share-note` 0 · ⑥ · 글자 `공유` → 다시 누름 → `share` 2번.
  - `— draw failure`: **`toBlob`을 처음부터 바꾸지 않는다**(어댑터가 실패함). `routeQueue(page, ['hold', ok(30)])` → 요청 대기 `page.waitForRequest` → 누름 → 요청 뒤 `page.evaluate`로 `HTMLCanvasElement.prototype.toBlob = function (cb) { cb(null) }` → `q.release()` → ⑥ → `shareOf` 켜짐 기다려 누름 → `share` 0 · 내려받기 0 · `share-note`의 `role="alert"` 글자가 `options.js` 문구(U1) · `appraised-shown` · `다른 물건 꺼내기` 보임.
  - `— font failure`: `goto` 전 `page.route('**/*.woff2', (r) => r.abort())` → ⑥ → 누름 → `share` 1번 · `active === true`.
  - `— font held`: `page.route('**/*.woff2', () => {})`(응답 안 함) → ⑥(`document.fonts.ready`를 기다리지 않음) → 누름 → `share` 1번 · `active === true`.
- 단계: 1. 쓴다. 2. `e2e`. 3. 커밋: `CAREER-34: cancel and draw failure e2e`
- 검사 명령: `e2e`
- 끝난 상태: 새 실패가 이 테스트들.

## T8 — AC-8 요청 · 자리 · history · 초점 (빨강) · 순서 3
- 담당: test-writer
- 파일: `e2e/share-card.spec.js`
- AC: AC-8 · plan A3
- `test.describe` + `test.use({ viewport: { width: 375, height: 548 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })`. 대사는 `shop-view.spec.js`의 30자 값(그 파일에서 import하지 말고 같은 글자를 이 파일에 둔다). 모두 `document.fonts.ready` 뒤.
- `for` `ok`(공유) · `abort`(취소) · `none`(저장): `CAREER-34 AC-8 no requests — ${mode}`: 경우마다 테스트 하나(새 페이지 로드가 요청을 늘리므로 한 페이지에서 잇지 않는다). `goto` 전 `page.context().on('request')`로 전부 기록(`blob:` · `data:` 뺌) · `countPosts`. ⑥ `mascot-line`이 보이는 **그 순간** 수를 잰다(그리기 중 파일 요청도 잡힘) → 버튼이 켜지면 누름 → 공유 기록 또는 내려받기를 기다림 → 잰 뒤로 늘어난 요청 0개 · `POST /api/appraise` 1번.
- `CAREER-34 AC-8 in view`: `toBeInViewport({ ratio: 1 })` — `값 공개` 그룹 · `appraised-shown` · `compare-line` · `share-button` · `다른 물건 꺼내기`. `share-button` 높이 ≥ 44. 이어서 T7 draw failure 방법으로 `share-note`가 뜬 뒤 그 문구 · 두 버튼. `notallowed`의 `share-note` · 두 버튼도 같게.
- `CAREER-34 AC-8 history`: 공유(`ok`) · 취소(`abort`) · 저장(`none`) 각각 전후 `history.length` · `history.state` 같음. 이어서 `page.goBack()` → ④ · 가격 칩 `aria-pressed="true"` 그대로 → `page.goForward()` → `감정 결과` 0개. (새로 시작) 공유 뒤 `다른 물건 꺼내기` → ② · 미리보기 없음 · `다음` 꺼짐.
- `CAREER-34 AC-8 focus`: ⑥ 도착 `getByRole('region', { name: '감정 결과' })` `toBeFocused`, 버튼이 켜진 뒤에도 그대로. 공유 · 취소 · 저장(글자가 `저장`으로 바뀐 뒤 포함) 뒤 `getByTestId('share-button')` `toBeFocused`. ⑥에서 `page.locator('canvas, img')` 0개 · `uncle` `aria-hidden="true"`.
- 단계: 1. 쓴다. 2. `e2e`. 3. 커밋: `CAREER-34: reveal stays intact e2e`
- 검사 명령: `e2e`
- 끝난 상태: 새 실패가 이 테스트들.

## T9 — 눈으로 볼 카드 파일 · 순서 3
- 담당: test-writer
- 파일: `e2e/share-card.spec.js`
- AC: 없음 (plan A1 '또렷함' · A3, tasks H0)
- `CAREER-34 H0 shots`: T8의 `test.describe`(375×548) 안에 둔다. 확인 없이 `testInfo.outputPath`로 5개를 저장한다.
  - 카드: `card-portrait.jpg`(`F2` — 방향 6, 세로로 보임 · `🍡 10개`) · `card-landscape.jpg`(F1 · `🙅 안 팔아`) · `card-fallback.jpg`(`page.context().newPage()`에 `**/*.woff2` abort).
  - 화면(30자 대사): `reveal.png` · `reveal-note.png`(`notallowed`로 누른 뒤 문구가 떠 있을 때).
- 단계: 1. 쓴다. 2. `e2e`. 3. 커밋: `CAREER-34: card shots for review`
- 검사 명령: `e2e`
- 끝난 상태: 새 실패가 이 테스트 · 다른 파일은 그대로 통과.

---

## F1 — 버튼 자리 (초록: AC-1) · 순서 4
- 담당: frontend-dev
- 파일: `app/src/ShareRow.jsx` (새로) · `app/src/App.jsx` · `app/src/options.js` · `app/src/shop.css`
- AC: AC-1 · plan A3
- 단계
  1. `ShareRow`를 plan 코드 모양대로 만들되 이 단계에서 `makeCard` 자리는 `Promise.reject(new Error('not yet'))`를 쓴다.
  2. `App.jsx` 249행 교체 · `result`를 넘기지 않는다. `.btn-row`를 더한다. `options.js`에 `CARD` · `SHARE_TEXT`(U1 문구).
  3. `unit` → `ShareCard` 통과 · 이미 있는 단위 테스트 통과.
  4. 커밋: `CAREER-34: share button on the reveal`
- 검사 명령: `unit`
- 끝난 상태: lint 0 · 단위 전부 통과.

## F2 — 카드 그리기 · 공유 (초록: AC-2 · AC-3 · AC-4 · AC-5) · 순서 5
- 담당: frontend-dev
- 파일: `app/src/shareCard.js` (새로) · `app/src/ShareRow.jsx`
- AC: AC-2~5 · plan A1 '카드 구성'
- 단계
  1. plan A1 표대로 `makeCard`. 글자는 `Math.round`한 왼쪽 좌표로. 도트는 칸당 8px `fillRect`. `createImageBitmap`의 인자는 `preparePhoto`가 돌려준 `jpeg`뿐. 쓴 비트맵은 `close()`. 캔버스는 DOM에 붙이지 않는다.
  2. `ShareRow`의 임시 reject를 `makeCard(photo, myPrice)`로 바꾼다.
  3. `e2e` → AC-2 · 3 · 4 · 5 통과.
  4. 커밋: `CAREER-34: draw the share card without the value`
- 검사 명령: `unit` 다음 `e2e`
- 끝난 상태: 실패 이름에 `CAREER-34 AC-2` · `AC-3` · `AC-4` · `AC-5` 없음 · `grep -n 'createImageBitmap(' app/src/shareCard.js`가 `jpeg` 한 줄.

## F3 — 저장 (초록: AC-6) · 순서 6
- 담당: frontend-dev
- 파일: `app/src/shareCard.js` · `app/src/ShareRow.jsx`
- AC: AC-6 · plan A2
- 단계: 1. `saveCard` · `saving` 분기 · 거부 처리. 2. `e2e` → AC-6 통과. 3. 커밋: `CAREER-34: save the card when sharing is unavailable`
- 검사 명령: `e2e`
- 끝난 상태: 실패 이름에 `CAREER-34 AC-6` 없음.

## F4 — 취소 · 실패 (초록: AC-7) · 순서 7
- 담당: frontend-dev
- 파일: `app/src/ShareRow.jsx` · `app/src/shareCard.js`
- AC: AC-7
- 단계: 1. `AbortError` 조용히 끝남 · `'failed'` 문구 · `fontReady` 상한 1,500ms · `sheetOpen`. 2. `e2e` → AC-7 통과. 3. 커밋: `CAREER-34: cancel and draw failure stay on the reveal`
- 검사 명령: `e2e`
- 끝난 상태: 실패 이름에 `CAREER-34 AC-7` 없음.

## F5 — 자리 · 무게 (초록: AC-8) · 순서 8
- 담당: frontend-dev
- 파일: `app/src/shop.css` · `app/src/ShareRow.jsx`(필요할 때만)
- AC: AC-8 · plan A3 · 무게
- 단계
  1. `e2e` → AC-8 통과. **AC-8 '자리'가 ⑥의 다른 값을 바꿔야만 통과되면 값을 정하지 말고 멈춘다.** 문구가 두 줄이 되어 넘치면 U1 문구를 고치도록 알린다.
  2. 크기 표: `npm --prefix app run build && for f in app/dist/index.html app/dist/assets/*; do printf '%s raw=%s gz=%s\n' "$f" "$(wc -c <"$f")" "$(gzip -c "$f" | wc -c)"; done`. **raw 합이 1,000,000을 넘으면 멈추고 표를 들고 알린다.**
  3. 커밋(바뀐 것이 있을 때만): `CAREER-34: keep the reveal within 548px`
- 검사 명령: `bash -c 'for n in lint test build e2e; do echo "== $n"; bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)" || exit 1; done'; git status --porcelain app e2e`
- 끝난 상태: 종료 코드 0 · 통과 수 0 아님 · `[guard-8787] 받은 요청 0개` · 크기 표 합 ≤ 1,000,000 · `git status`에 `node_modules` · `dist` · `test-results` 없음.

---

## H0 — 카드와 ⑥을 사용자가 본다 · 순서 9
- 담당: **사용자** (frontend-dev가 파일 경로를 건넴)
- 파일: 없음 (`e2e/test-results/**/` 아래 5개, 커밋하지 않음)
- AC: AC-9 전 단계 · plan A1 '또렷함' · A3 · 정할 것 4
- 단계
  1. frontend-dev가 `CAREER-34 H0 shots` 결과 경로를 보고한다.
  2. 사용자가 본다: 글자 · 도트가 또렷한가, 값 자리가 `🍡 × ?`인가, 세로 사진이 안 누웠나, 글꼴 실패 카드가 읽히나, ⑥의 반 폭 버튼 둘이 괜찮은가.
  3. 고칠 값을 말하면 frontend-dev가 plan A1 표 · 상수를 그 값으로 고치고 F5 검사를 다시 돌린다(글 고침은 architect). 나란히가 싫으면 AC-8 '자리'를 맞출 길을 먼저 묻는다(plan A3 표).
- 검사 명령: `find e2e/test-results -path '*H0*' \( -name '*.jpg' -o -name '*.png' \) | wc -l` → 5
- 끝난 상태: 사용자가 '이대로' 또는 고칠 값을 말했다.

## P1 — 전체 검사 · 고의 고침 · PR (AC-10) · 순서 10
- 담당: frontend-dev(검사 · 고의 고침 · PR) · reviewer · 사용자(머지)
- 파일: 없음 (PR 본문 — `.github/pull_request_template.md`)
- AC: AC-10 · 전부(대조표)
- 단계
  1. `bash -c 'for n in lint test e2e build api; do echo "== $n"; bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)"; echo "exit=$?"; done'` → 모두 `exit=0` · 통과 수 0 아님. 출력 그대로 보고.
  2. **고의 고침 ㄱ**(커밋하지 않음): `App.jsx`가 `ShareRow`에 `mochi={result.mochi}`를 넘기고, `ShareRow`가 `makeCard(photo, myPrice, mochi)`로, `shareCard.js`가 `🍡 × ?` 대신 `🍡 × ${mochi}`를 그리게 고친다 → `(cd e2e && npx playwright test share-card.spec.js -g 'CAREER-34 AC-3'); echo "exit=$?"` → **빨강 · 출력 그대로 보고** → `git restore app/src`.
  3. **고의 고침 ㄴ**: 같은 길로 `shareCard.js`가 값 창에 `compareLine(mine.mochi, mochi).text`를 더 그리게 고친다 → 같은 명령 → **빨강 · 출력 그대로 보고** → `git restore app/src`.
  4. `git status --porcelain app e2e` → 빈 줄. `git diff --stat origin/main -- api infra contracts e2e/playwright.config.js pipeline.config.json app/package.json app/package-lock.json` → 빈 줄. `git diff --name-status origin/main -- app/tests e2e` → `A app/tests/ShareCard.test.jsx` · `A e2e/share-card.spec.js`뿐(지운 · 고친 테스트 없음).
  5. 제목 `CAREER-34: share card with the value hidden`. 칸:
     - 결정: ADR-0010 · JPEG 1080×1350 · 미리 그리기 · 버튼 나란히 · 첫 글자 '공유' · 문구 · 크기 표
     - 범위 변경: 없음 / 새 의존성: 없음
     - 비용·남용 영향: spec 그대로 + 크기 표 + "AC-9는 머지 · 배포 뒤 이 칸에 덧붙임"
     - spec AC-1~10 ✔/✘ 대조(AC-9는 '머지 뒤 H1')
- 검사 명령: `gh pr checks --watch`
- 끝난 상태: 필수 검사 모두 통과(`reviewer/gate` 포함) · 4단계 그대로 · 고의 고침 두 빨강 출력이 세션 보고에 있다.

## H1 — iPhone 16e · 카톡 (AC-9) · 머지 · 배포 뒤 · 늦어도 11/6
- 담당: **사용자** (배포 `docs/runbook/배포.md` §3, 로그 §5)
- 파일: 없음 (PR '비용·남용 영향' 칸에 덧붙임)
- AC: AC-9 (a)~(g)
- 단계
  1. spec AC-9 '할 때' 그대로.
  2. 함께 본다(AC가 아니라 plan 확인, ✘ 아님): ⑥에서 '공유'가 켜지기까지 느낌 · 카톡에서 돌아와 **'공유'를 한 번 더 누르면 공유 창이 다시 뜨는가**(plan 실패 시나리오 7) · 글자 · 이모지 번짐.
  3. 머지 뒤 CLAUDE.md §11의 '공유 카드 방식'을 지운다(spec '머지 뒤' — 사용자와 앞 세션).
- 검사 명령: runbook §5 로그 보기 명령으로 공유 전후 `appraise` 줄 수
- 끝난 상태: (a)~(g) 모두 ✔이고 PR 칸에 적혀 있다.

---

## 시간이 남으면 — 미룰 것 (하나씩 따로, 없어도 AC-1~10이 선다)
11/8 전에 시간이 끝나면 **하지 않고 끝낸다.** 각각 **빨강(test-writer) → 초록(frontend-dev)**, 검사 명령은 `e2e`, 끝난 상태는 그 테스트 통과 · 나머지 그대로다.

| 차례 | 무엇 | 언제 | 파일 | 커밋 |
|---|---|---|---|---|
| D1 | 카드에 선반 물건 4개 더하기(`pixels.js` `I` · `PI`, spec U1 '가장 아까운 항목') | **사용자가 하자고 할 때만** — spec U1은 뺌으로 정함 | `app/src/shareCard.js` | `CAREER-34: shelf items on the card` |
| D2 | `share`가 안 끝나 다시 누름이 막히는 경우 풀기 | H1에서 실제로 보일 때만 (`visibilitychange`로 `sheetOpen` 풀기) | `app/src/ShareRow.jsx` · `e2e/share-card.spec.js` | `CAREER-34: release share guard on return` |
| D3 | 처음부터 '공유'/'저장' 글자 나누기 | 사용자가 정할 것 3에서 원할 때만 | `app/src/ShareRow.jsx` · `app/tests/ShareCard.test.jsx` · `e2e/share-card.spec.js` | `CAREER-34: split share and save labels` |

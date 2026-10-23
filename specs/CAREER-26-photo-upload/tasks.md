[CAREER-26](https://culonculon98.atlassian.net/browse/CAREER-26) · spec: [spec.md](spec.md) · plan: [plan.md](plan.md) · 약속: [contracts/appraise.md](../../contracts/appraise.md) §5·§6 · [contracts/appraise-http.md](../../contracts/appraise-http.md) · 결정: [ADR-0003](../../docs/adr/0003-photo-redraw-in-browser-adapter.md)

상태: 승인됨 (2026-10-23 — 사용자: plan S1~S5 추천안대로)

- 브랜치: `CAREER-26-photo-upload` 하나. 순서: **U1 → (T1 ∥ T2) → T3 → A1 → T4 → P1**, **J1은 U1 뒤 아무 때나 [P]**
  - T1·T2는 [P]: 파일이 겹치지 않고 서로 기대지 않는다(둘 다 test-writer — 한 세션에서 차례로 해도 된다).
  - A1은 T3 뒤: AC-10 재료(`f1-prepared.jpg`)를 T3이 통과시킨 e2e가 만든다. A1은 `api/`(guard, `human_only`)라 **앞 세션(사용자와 함께)**이 같은 브랜치에 커밋한다.
  - T4는 A1 뒤: AC-12가 api 테스트까지 함께 돌린다.
- **U1 전에는 아무것도 만들지 않는다**(CLAUDE.md §4 — contracts 확정 전). plan의 S1~S3 답에 따라 T1·T3의 표가 바뀔 수 있다.
- 모든 명령은 **저장소 루트**에서. `cd e2e`가 들어간 명령은 `bash -c '…'`로. 세션 보고에는 출력 그대로, PR '검사 결과' 칸에는 CI 링크만.
- 이름(testid·내보내기·시험 사진)의 원본: plan '테스트와 구현 사이의 약속'·'시험 사진'. 값의 원본: contracts/appraise.md §5·§6, appraise-http.md §2·§8.

---

## U1 — plan·contracts·ADR 승인 · 순서 1
- 담당: **사용자** (architect가 고쳐 둠)
- 파일: `specs/CAREER-26-photo-upload/plan.md` · `tasks.md` · `contracts/appraise.md` · `docs/adr/0003-photo-redraw-in-browser-adapter.md` (승인·커밋만)
- AC: 만들기 시작 조건(CLAUDE.md §4)
- 단계
  1. plan '사용자 승인이 필요한 것' S1~S5를 고른다. 추천과 다르면 architect에게 알려 plan·contracts §5·§6·이 tasks(T1·T3)를 고치게 한다.
  2. 상태 줄을 바꾼다: contracts/appraise.md 맨 위 '10/23 … (승인 대기)' → '10/23 CAREER-26 고침 (사용자 승인)' · §5 '(CAREER-26 — 제안 …)' · §6 제목 '— 제안' · `TARGET_PHOTO_BYTES` 칸의 '(승인 대기 …)'를 지움 · plan·tasks → `승인됨 (2026-MM-DD …)` · ADR-0003 → `확정`.
  3. 커밋: `CAREER-26: photo upload plan, contract and ADR-0003`
- 검사 명령: `grep -m1 -H '상태' specs/CAREER-26-photo-upload/plan.md specs/CAREER-26-photo-upload/tasks.md docs/adr/0003-*.md; grep -c '승인 대기\|— 제안' contracts/appraise.md`
- 끝난 상태: 세 줄이 '승인됨'·'승인됨'·'확정', 마지막 줄 `0`.

## J1 — 화면 연결 스토리 제안 댓글 · [P] (U1 뒤)
- 담당: architect (Jira 댓글만)
- 파일: 없음 (Jira CAREER-26 댓글)
- AC: spec 열린 질문 7 (plan S4)
- 단계
  1. S4가 승인되면 plan '질문 7 답'의 댓글 초안을 CAREER-26에 단다(`addCommentToJiraIssue`). 스토리를 만들거나 상태를 바꾸지 않는다.
  2. 세션 보고에 댓글 링크를 적는다.
- 검사 명령: `getJiraIssue CAREER-26 fields=comment`로 마지막 댓글 첫 줄이 `[architect 제안] 결정 A의`인지 본다.
- 끝난 상태: 댓글 1개가 달렸다(S4를 버렸으면 이 작업은 '건너뜀'으로 끝).

## T1 — 단위 테스트 (빨강) · 순서 2 · [P]
- 담당: test-writer
- 파일: `app/tests/photo.test.js`(새로) · `app/tests/appraise.test.js`(다시 씀) · `app/tests/FirstFlow.test.jsx`(더함)
- AC: AC-1 · AC-4(크기 계산) · AC-5(2)(요청 1개) · AC-6 · AC-7, 그리고 CAREER-22 AC-9(부르는 곳 하나 — 남김)
- 공통: CAREER-22 tasks T1 '공통 규칙' 그대로(vitest에서 import · `process`·`Buffer`·`__dirname` 금지 · 테스트 이름에 AC 번호).
- `app/tests/photo.test.js` (node)
  - `fitWithin(w, h, 1024)` 표: `4000×3000 → 1024×768` · `3000×4000 → 768×1024` · `800×600 → 800×600`(AC-4 키우지 않음) · `1024×1024 → 그대로` · `1025×1 → 1024×1`(최소 1) · `1200×800 → 1024×683`.
  - 값: `MAX_EDGE_PX === 1024`, `MAX_PHOTO_BYTES === 1_000_000`. 그리고 `readFileSync(new URL('../../contracts/appraise-http.md', import.meta.url), 'utf8')`의 §8 표 `MAX_PHOTO_EDGE_PX`·`MAX_PHOTO_BYTES` 줄의 숫자(쉼표 지움)와 같다. `TARGET_PHOTO_BYTES`·`JPEG_QUALITIES`도 contracts/appraise.md §6 표와 같다.
- `app/tests/appraise.test.js` (node) — `vi.mock('../src/photo.js', …)`로 `preparePhoto`를 `vi.fn()`(기본: `new Blob([Uint8Array.of(0xff,0xd8,0xff,0xd9)], { type: 'image/jpeg' })`을 돌려줌), `vi.stubGlobal('fetch', vi.fn())`.
  - 요청 모양: `appraise({ photo: new File(['원본'], 'a.png', { type: 'image/png' }), myPrice: 'ten', tags: ['how-1', 'now-2'] })` → `fetch` **1번**, 주소 `/api/appraise?myPrice=ten&tags=how-1&tags=now-2`, `method: 'POST'`, `headers['Content-Type'] === 'image/jpeg'`, `body`가 `preparePhoto`가 돌려준 **그 Blob**(고른 File이 아님 — AC-5(3)), `preparePhoto`가 고른 File로 1번 불림.
  - 응답 표(`test.each`) — `fetch`가 돌려줄 `new Response(본문, { status })` → 결과:
    | 상태 · 본문 | 결과 |
    |---|---|
    | 200 `{"mochi":10,"line":"흠"}` | `{ mochi: 10, line: '흠' }`, `Object.keys` 둘 |
    | 200 `{"mochi":10,"line":"흠","x":1}` · 200 `{"mochi":-1,"line":"흠"}` · 200 `{"mochi":1.5,"line":"흠"}` · 200 `{"mochi":1,"line":"  "}` | 거부 `code: 'unavailable'` |
    | 400 `{"code":"invalid_input"}` · 422 `{"code":"refused"}` · 429 `{"code":"daily_limit"}` · 503 `{"code":"unavailable"}` | 그 코드 |
    | 404 `<html>` · 400 `{"code":"nope"}` · 200 `not json` | `unavailable` |
    | `fetch`가 `TypeError`로 거부 | `unavailable` |
  - AC-6: `preparePhoto`가 거부 → `appraise`가 `code: 'invalid_input'`으로 거부, **`fetch` 0번**.
  - 남김: CAREER-22 AC-9 '부르는 곳 하나'(파일 읽기) 테스트. 지움: `FAKE_DELAY_MS`·고정 결과 테스트(결정 M — contracts §6 바뀜).
- `app/tests/FirstFlow.test.jsx` (jsdom) — 이미 있는 `vi.mock('../src/appraise.js')` 꼴로
  - AC-7: `appraise`가 `Object.assign(new Error('x'), { code: 'invalid_input' })`로 거부 → 아저씨 `대기`, `getByTestId('appraise-error')` 글자 = contracts/appraise.md §5 `invalid_input` 문구, '감정 받기' 활성 → 다른 File을 고르면 안내가 사라짐 → 다시 누름 → `appraise` 호출 2번.
  - S1(D): `code: 'unavailable'` · `'refused'` · `'daily_limit'` · 코드 없는 `Error` → 각각 아저씨 `대기` + §5 문구(`daily_limit`·코드 없음은 `unavailable` 문구). (S1에서 A를 고르면 이 줄은 빼고 U1 뒤 architect가 고친다)
- 단계
  1. 세 파일을 쓴다.
  2. 검사 명령 → lint 통과, test **실패**. 실패 이유가 `../src/photo.js` 모듈 없음 · `fetch` 0번 · `appraise-error` 없음이어야 한다(문법 오류면 고친다). `App.test.jsx`·CAREER-22 FirstFlow 테스트는 통과로 남는다.
  3. 커밋: `CAREER-26: photo prep and adapter unit tests`
- 검사 명령: `npm --prefix app run lint && { npm --prefix app test; echo "exit=$?"; }`
- 끝난 상태: lint 0, test `exit`가 0이 아니고 위 이유뿐.

## T2 — e2e 시험 사진과 흐름 (빨강) · 순서 2 · [P]
- 담당: test-writer
- 파일: `e2e/photo-fixtures.js`(새로) · `e2e/photo-upload.spec.js`(새로) · `e2e/first-flow.spec.js`(고침)
- AC: AC-1~AC-7, AC-12의 바탕 (CAREER-22 AC-10 → 이 스펙 AC-5, 결정 M)
- `e2e/photo-fixtures.js`
  - `makeFixtures(browser)` → `{ F1, F2, F3, F4 }` 각각 `{ name, mimeType, buffer }`. `browser.newPage()` → `page.setContent('<canvas>')` → `page.evaluate`로 plan '시험 사진' 표대로 그려 `toBlob` → base64로 돌려받아 `Buffer` → 닫기. F1·F2는 `insertExif(jpeg, { orientation, gps })`로 SOI(`FF D8`) **바로 뒤**에 APP1 `Exif\0\0` + TIFF(`II*\0`, IFD0 오프셋 8) 끼움 — IFD0 항목: `0x010F` Make · `orientation`이면 `0x0112` SHORT 값 · `gps`면 `0x8825` LONG → GPS IFD(`0x0001` 'N' · `0x0002` RATIONAL×3 · `0x0003` 'E' · `0x0004` RATIONAL×3). 항목은 태그 번호 오름차순.
  - `jpegInfo(buf)` → `{ isJpeg, width, height, hasExif }`: `FF D8 FF`로 시작하는가 · SOS 전까지 마커를 걸으며 APP1이 `Exif\0\0`로 시작하면 `hasExif` · 첫 SOF(`C0`~`CF`, `C4`·`C8`·`CC` 빼고)의 높이·너비. 길이가 끝을 넘으면 던진다.
  - `isPng(buf)`: 8바이트 서명.
- `e2e/photo-upload.spec.js` — `test.beforeAll`에서 `makeFixtures`. 테스트마다 `page.route((url) => url.pathname === '/api/appraise', …)`로 본문(`route.request().postDataBuffer()`)과 헤더를 모으고 plan의 성공 응답을 `fulfill`(AC-7은 거절 응답). 흐름은 `goto('/')` → `getByLabel('사진 고르기').setInputFiles(F)` → `🍡 10개` → '감정 받기'.
  - AC-1 (F1): 모인 요청 1개, `Content-Type` `image/jpeg`, `jpegInfo` → `isJpeg`, `max(w,h) <= 1024`, `|h − round(w × 3000/4000)| <= 1`, 길이 `<= 1_000_000`. 보낸 바이트를 `fs.writeFileSync(testInfo.outputPath('f1-prepared.jpg'), body)`(A1 재료).
  - AC-2 (F1): 같은 본문 `hasExif === false`. 그리고 F1 원본은 `hasExif === true`(시험 사진이 맞게 만들어졌는지 — 빠지면 거짓 초록).
  - AC-3 (F2): 미리보기 `img`의 `naturalHeight > naturalWidth`(먼저 확인) → 보낸 것 `height > width`, `hasExif === false`.
  - AC-4 (F3): 보낸 것 `isJpeg`, `max(w,h) === 800`, `hasExif === false`, 길이 `<= 1_000_000`.
  - AC-5 (F1, 한 흐름): `page.context().on('request')`를 `goto` 전에 → 결과 카드(`region` '감정 결과')까지 → (1) `http://127.0.0.1:5199/`·`blob:`·`data:`로 시작하지 않는 URL `[]` (2) 경로 `/api/appraise` 요청 정확히 1개 (3) 본문이 F1 원본을 담은(`body.includes(F1.buffer)`) 요청 `[]` (4) 본문 있는 요청은 그 1개뿐.
  - AC-6 (F4): 고름 → '감정 받기'가 켜져 있으면 누름 → `getByTestId('appraise-error')` 글자 = contracts/appraise.md §5 `invalid_input` 문구 → 서버 입구 요청 0개(문구가 보인 **뒤에** 셈).
  - AC-7 (F1, 거절 응답): 누름 → 아저씨 `대기`(`갸웃` 아님), `appraise-error` = `invalid_input` 문구 → F3을 고름 → '감정 받기' 활성 → 누름 → 서버 입구 요청 합 2개.
  - `waitForTimeout`·`test.only` 금지. 실패 메시지에 값이 보이게 배열·숫자를 그대로 `expect`.
- `e2e/first-flow.spec.js`: 테스트 1의 `goto` 전에 같은 `page.route`로 성공 응답을 더한다. 끝의 'AC-10' 두 줄을 'AC-5(결정 M)'로 바꿔, 본문 있는 요청은 경로 `/api/appraise` 하나뿐인지 본다(밖으로 간 요청 0개 줄은 그대로).
- 단계
  1. 세 파일을 쓴다.
  2. 검사 명령 → `--list`에 새 테스트 7개(+ 기존 2개), 실행은 **실패**. 이유가 '서버 입구 요청 0개'(지금 화면은 가짜라 보내지 않음) · `appraise-error` 없음이어야 한다. 설정 오류·시험 사진 만들기 오류면 고친다. AC-2의 'F1 원본 `hasExif === true`'는 지금도 **통과**해야 한다(시험 사진 확인).
  3. 커밋: `CAREER-26: photo upload e2e tests`
- 검사 명령: `bash -c 'cd e2e && npm ci && npx playwright install chromium && npx playwright test --list && { npx playwright test; echo "exit=$?"; }'`
- 끝난 상태: `--list` 9 tests, `exit` 0 아님, 위 이유뿐, `git status --porcelain e2e`에 `test-results`가 없다.

## T3 — 사진 다시 그리기 · 어댑터 · 실패 화면 (초록) · 순서 3
- 담당: frontend-dev
- 파일: `app/src/photo.js`(새로) · `app/src/appraise.js`(바꿈) · `app/src/options.js`(`ERROR_TEXT` 더함) · `app/src/App.jsx`(고침)
- AC: AC-1~AC-7 (T1·T2 통과), AC-12 첫 절반
- 원본: plan '보내는 흐름'·'테스트와 구현 사이의 약속' · contracts/appraise.md §5·§6 · appraise-http.md §2·§5 · ADR-0003
- 단계
  1. `photo.js`: contracts §6 값 넷을 이름 있는 내보내기로. `fitWithin` · `preparePhoto(file)` = plan 단계 1~5. `createImageBitmap`에 `{ imageOrientation: 'from-image' }`를 **꼭** 넘긴다. `toBlob`은 Promise로 감싼다. 새 의존성을 넣지 않는다(ADR-0003).
  2. `appraise.js`: 가짜를 지운다. `preparePhoto`가 거부하면 `Object.assign(new Error('photo'), { code: 'invalid_input' })`로 거부(보내지 않음) → `fetch` 한 번 → 단계 7(응답 검사). 오류 객체에 사진·응답 본문을 담지 않는다. `console.*` 금지.
  3. `options.js`: `ERROR_TEXT = { invalid_input, refused, unavailable }` — contracts §5 문구를 그대로 옮김.
  4. `App.jsx`: `submit`을 `try/catch`로(plan '보내는 흐름' 아래 줄). 상태 `error`(코드나 `null`). 안내는 `<p role="alert" data-testid="appraise-error">`. `pickFile`·`submit` 시작에서 `error`를 `null`로. `appraise`를 부르는 곳은 여전히 한 곳.
  5. 검사 명령을 돌린다. 실패하면 **테스트를 고치지 않고** 화면을 고친다. 테스트가 plan·contracts와 어긋나 보이면 멈추고 보고한다.
  6. 흔들림: `bash -c 'cd e2e && npx playwright test --repeat-each=5'` → 45개 모두 통과.
  7. 커밋: `CAREER-26: photo redraw and appraise adapter`
- 검사 명령:
  ```
  for n in lint test build e2e api; do echo "== $n"; bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)" || exit 1; done; grep -rnE 'fetch\(|XMLHttpRequest|sendBeacon|WebSocket' app/src; git status --porcelain app e2e
  ```
- 끝난 상태: 종료 코드 0 · test·e2e 통과 수가 0이 아님(e2e `9 passed`) · `grep` 결과가 `app/src/appraise.js` **한 줄** · `git status`에 `node_modules`·`dist`·`test-results` 없음 · `e2e/test-results/**/f1-prepared.jpg`가 생김(A1 재료).

## A1 — 서버 쪽 확인 테스트 (AC-8~11 · 13) · 순서 4
- 담당: **앞 세션(사용자와 함께)** — `api/`는 `human_only`(guard)
- 파일: `api/tests/fixtures/f1-prepared.jpg`(새로) · `api/tests/helpers.js`(`withGpsExif` 하나) · `api/tests/photo-upload.test.js`(새로). **`api/src/`는 고치지 않는다.**
- AC: AC-8 · AC-9 · AC-10 · AC-11(a)(b) · AC-13
- 원본: contracts/appraise-http.md §2·§3·§5 · CAREER-25 plan '요청 한 건의 흐름'(`reason` 이름)
- 단계
  1. 재료: `bash -c 'cd e2e && npx playwright test photo-upload --grep "AC-1"'` → `mkdir -p api/tests/fixtures && cp "$(find e2e/test-results -name f1-prepared.jpg | head -1)" api/tests/fixtures/f1-prepared.jpg`. 눈으로: 무늬 그림뿐(사람·위치 없음).
  2. `helpers.js`: `export function withGpsExif(bytes)` → `FF D8` + 이미 있는 `exifApp1({ gps: true })` + `bytes`의 SOI 뒤 전부(`Uint8Array`).
  3. `photo-upload.test.js` — `createServer({ send, log, memo: createMemo({ maxEntries: 0 }) })`를 `listen(0, '127.0.0.1')`, 가짜 `send`는 `converseReply('{"grade":3,"line":"흠"}')`를 돌려주는 `vi.fn()`, 로그는 `collectLog()`. 테스트 이름에 `CAREER-26 AC-n`.
     - `beforeAll`: `mkdtempSync(join(tmpdir(), 'c26-'))`를 만들고 `process.env.TMPDIR`·`TMP`·`TEMP`를 그 폴더로(옛 값은 쥐어 둠).
     - AC-8: `makeJpeg({ totalBytes: MAX_PHOTO_BYTES + 1 })` → 400 `{"code":"invalid_input"}`, `send` 0, 로그 `reason: 'too_large'` / `totalBytes: MAX_PHOTO_BYTES` → 200, `send` 1. (`MAX_PHOTO_BYTES`는 config import — 숫자를 적지 않음)
     - AC-9: (a) 빈 본문 + `image/jpeg` → `empty_body` (b) `TEXT_BYTES` + `image/jpeg` → `not_jpeg` (c) `PNG_BYTES` + `image/jpeg` → `not_jpeg` (d) 본문·`Content-Type` 없음 → `bad_content_type` — 넷 다 400 `invalid_input`, `send` 0.
     - AC-10: `f1-prepared.jpg` → 200, 키 `mochi`·`line`, `send` **정확히 1**.
     - AC-13: `withGpsExif(f1)` → 400, `send` 0, 로그 `reason: 'gps_present'`(크기·형식 이유가 아님). 같은 테스트 안에서 `f1` 그대로 → 200(GPS만 다름을 함께 확인).
     - AC-11 `afterAll`: (a) mkdtemp 폴더 `readdirSync` 길이 0 → 폴더 지우고 환경변수 되돌림 (b) 이 파일이 보낸 사진 전부(`f1` · `withGpsExif(f1)` · AC-8 둘 · AC-9 셋)의 `Buffer.from(x).toString('base64').slice(0, 32)`가 모은 로그 전체에 0번.
  4. `npm --prefix api test` 전체. **처음부터 초록이 정상이다** — CAREER-25가 만든 동작을 CAREER-26 AC 이름으로 고정하는 테스트다. 하나라도 빨강이면 `api/src`를 고치지 말고 멈춰 사용자와 정한다(특히 AC-10 — Chromium JPEG를 서버가 거절하면 contracts 문제).
  5. 커밋: `CAREER-26: photo upload server checks`
- 검사 명령: `npm --prefix api test; echo "exit=$?"; grep -rnE "node:fs|from 'fs'|writeFile|createWriteStream|mkdtemp" api/src | wc -l; git status --porcelain --untracked-files=all api`
- 끝난 상태: `exit=0`(통과 수에 새 파일 테스트 포함) · `0`(서버 코드에 파일 쓰기 없음 — AC-11(a) 정적 확인) · 커밋 뒤 `git status` 빈 줄(테스트가 `api/`에 파일을 남기지 않음).

## T4 — 일부러 빼고 e2e가 잡는지 (AC-12) · 순서 5
- 담당: frontend-dev
- 파일: `app/src/appraise.js` (잠깐 바꿨다 되돌림 — 커밋하지 않음)
- AC: AC-12
- 단계
  1. 저장소 루트에서 `for n in lint test build e2e api; do echo "== $n"; bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)"; echo "exit=$?"; done` → 모두 `exit=0`, e2e `9 passed`, test·api 통과 수 0 아님. 출력 그대로 보고.
  2. 줄이기·지우기를 뺀다: `appraise.js`에서 `fetch`의 `body`를 `input.photo`(원본)로, `preparePhoto` 부르기를 지운다 → `bash -c "$(jq -r '.checks.app.e2e' pipeline.config.json)"; echo "exit=$?"` → `exit` 0 아님, 실패한 테스트에 AC-1·AC-2·AC-5가 들어 있다. 출력 그대로 보고.
  3. `git restore app/src/appraise.js` → 1의 e2e를 다시 → `exit=0`, `git diff --stat app/src` 빈 줄.
- 검사 명령: `bash -c "$(jq -r '.checks.app.e2e' pipeline.config.json)"; echo "exit=$?"; git diff --stat app/src`
- 끝난 상태: 1·3 `exit=0`, 2 `exit` 0 아님, diff 없음. 커밋 없음.

## P1 — PR과 CI · 순서 6
- 담당: frontend-dev(PR 열기) · reviewer · 사용자(머지)
- 파일: 없음 (PR 본문 — `.github/pull_request_template.md`)
- AC: 전부(대조표), AC-11(c)
- 단계
  1. 제목 `CAREER-26: photo redraw before upload`.
  2. 칸
     - 결정: ADR-0003 링크 · `JPEG_QUALITIES` · `toBlob`(OffscreenCanvas 아님) · 시험 사진을 코드로 만듦 · api 테스트 새 파일 · S1~S3에서 사용자가 고른 것
     - 범위 변경: S1에서 D를 골랐다면 "spec '안 할 것'의 AI 실패 화면 일부(unavailable·refused 문구, 갸웃 끝내기)를 이번에 함 — 연결 전 dev 404로 갸웃에서 멈추지 않게" · 화면 연결 새 스토리 제안(J1 링크). 아니면 "없음"
     - 새 의존성: 없음
     - 비용·남용 영향: spec 그대로 + "AI 호출 0(가짜 자리·로컬). 머지 뒤 `npm run dev`에서는 프록시가 없어 `unavailable` 문구가 나온다(연결 스토리)"
     - spec AC-1~13 ✔/✘ 대조. AC-11(c)는 reviewer가 `git diff --stat main -- infra` 빈 줄로 확인. AC-12는 T4 출력이 세션 보고에 있음을 적는다
     - '검사 결과' 칸은 CI 링크만
  3. CI `checks / app` 요약에 `통과: app.lint`·`app.test`·`app.e2e`·`app.build`·`app.api`.
- 검사 명령: `gh pr checks --watch; git diff --stat origin/main -- infra`
- 끝난 상태: 필수 검사 모두 통과, `infra` diff 빈 줄, `reviewer/gate` 통과.

---

## AC ↔ 작업
| AC | 테스트 | 통과시키는 곳 | 그 밖 |
|---|---|---|---|
| AC-1 | T2 (e2e) · T1 `fitWithin` | T3 | |
| AC-2 | T2 | T3 | 서버 두 겹째: AC-13 |
| AC-3 | T2 (F2) | T3 | |
| AC-4 | T2 (F3) · T1 | T3 | |
| AC-5 | T2 (photo-upload · first-flow) · T1 요청 1번·Blob | T3 | CAREER-22 AC-10 대신(결정 M) |
| AC-6 | T2 (F4) · T1 | T3 | 문구: plan S2 |
| AC-7 | T2 · T1 FirstFlow | T3 | 범위: plan S1 |
| AC-8 | A1 | CAREER-25 서버(그대로) | |
| AC-9 | A1 | CAREER-25 서버 | |
| AC-10 | A1 (브라우저 결과 파일) | T3 + CAREER-25 서버 | 재료: T3 e2e |
| AC-11 | A1 (a)(b) | CAREER-25 서버 | (c) P1 reviewer |
| AC-12 | — | — | T4 |
| AC-13 | A1 (F5) | CAREER-25 서버 | |

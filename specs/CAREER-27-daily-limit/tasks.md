[CAREER-27](https://culonculon98.atlassian.net/browse/CAREER-27) · spec: [spec.md](spec.md) · plan: [plan.md](plan.md) · 약속: [contracts/appraise-http.md](../../contracts/appraise-http.md) §5·§8 · [contracts/appraise.md](../../contracts/appraise.md) §5 · 결정: [ADR-0004](../../docs/adr/0004-daily-call-count-in-one-json-file.md)

상태: 승인됨 (2026-10-23 — 사용자: plan D1~D6 추천안대로)

- 브랜치: `CAREER-27-daily-limit` 하나. 순서: **U1 → (G1 ∥ T1 ∥ T2) → G2 (G1 뒤) · F1 (T1·T2 뒤) → P1 (G2·F1 뒤)**
  - [P] = 파일이 겹치지 않고 서로 기대지 않는다. G1·G2는 `api/`(guard, `human_only`)라 **앞 세션(사용자와 함께)**이 같은 브랜치에 커밋한다. T1·T2는 test-writer 한 세션에서 차례로 해도 된다. 같은 worktree에서 두 세션이 동시에 커밋하지 않는다.
  - 테스트 커밋(G1 · T1 · T2)이 구현 커밋(G2 · F1)보다 먼저다 — reviewer가 커밋 순서로 본다.
- **U1 전에는 아무것도 만들지 않는다**(CLAUDE.md §4 — contracts 확정 전). D1 문구가 바뀌면 T1·T2·F1은 contracts/appraise.md §5에 적힌 글자를 그대로 쓴다.
- 모든 명령은 **저장소 루트**에서. `cd e2e`가 들어간 명령은 `bash -c '…'`로. 세션 보고에는 출력 그대로, PR '검사 결과' 칸에는 CI 링크만.
- 이름의 원본: plan 'A1 답'(`createDailyLimit` · `take` · 오류 둘 · `reason` 다섯) · '요청 한 건의 흐름'(로그 `day`·`dayUsed`) · '화면 (AC-9)'(`off` · `data-testid="off-duty"` · `OFF_DUTY_TEXT`). 값의 원본: contracts/appraise-http.md §8 · appraise.md §5.
- 진짜 Bedrock은 어느 작업에서도 부르지 않는다. `npm --prefix api run eval`·`npm --prefix api start`를 돌리지 않는다.

---

## U1 — plan·contracts·ADR 승인 · 순서 1
- 담당: **사용자** (architect가 고쳐 둠)
- 파일: `specs/CAREER-27-daily-limit/plan.md` · `tasks.md` · `contracts/appraise-http.md` · `contracts/appraise.md` · `docs/adr/0004-daily-call-count-in-one-json-file.md` (승인·커밋만)
- AC: 만들기 시작 조건(CLAUDE.md §4) · AC-11(contracts는 정한 곳만)
- 단계
  1. plan '사용자 승인이 필요한 것' D1~D6을 고른다. 추천과 다르면 architect에게 알려 plan·contracts·ADR·이 tasks를 고치게 한다(D1이 다르면 appraise.md §5 `daily_limit` 줄의 따옴표 안 글자만 바뀐다).
  2. 상태 줄을 바꾼다: 두 contracts 맨 위 '(승인 대기 …)' → '(사용자 승인)' · appraise-http.md §5 '하루 상한' 제목 · §8 `DAILY_CALL_LIMIT`·`USAGE_FILE` 칸 · appraise.md §5 표 줄과 '화면 처리' 줄의 '승인 대기' 글귀를 지움 · plan·tasks → `승인됨 (2026-MM-DD …)` · ADR-0004 → `확정 (날짜 — 사용자 승인)`.
  3. 커밋: `CAREER-27: daily limit plan, contracts and ADR-0004`
- 검사 명령: `grep -m1 -H '상태' specs/CAREER-27-daily-limit/plan.md specs/CAREER-27-daily-limit/tasks.md docs/adr/0004-*.md; grep -c '승인 대기' contracts/appraise-http.md contracts/appraise.md`
- 끝난 상태: 세 줄이 '승인됨'·'승인됨'·'확정', 두 파일 모두 `:0`.

## G1 — 서버 테스트 (빨강) · 순서 2 · [P]
- 담당: **앞 세션(사용자와 함께)** — `api/`는 `human_only`(guard)
- 파일: `api/tests/temp-daily-limit.js`(새로) · `api/tests/daily-limit.test.js`(새로) · `api/tests/bedrock.test.js`(더함). **이미 있는 다른 테스트·`helpers.js`·`api/src`는 이 작업에서 고치지 않는다**(G2에서) — 그래야 빨강 이유가 새 테스트뿐이다.
- AC: AC-1 ~ AC-8
- 원본: plan 'A1 답' · 'A4 답' · '요청 한 건의 흐름' · contracts/appraise-http.md §5 '하루 상한' · §8
- `api/tests/temp-daily-limit.js`: `tempDailyLimit({ limit = 1000, now = () => Date.parse('2026-11-08T12:00:00+09:00') } = {})` → `dir = mkdtempSync(join(tmpdir(), 'c27-'))`, `file = join(dir, 'var', 'usage.json')`, `{ dailyLimit: createDailyLimit({ file, limit, now }), file, dir, read: () => existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null, cleanup: () => rmSync(dir, { recursive: true, force: true }) }`.
- `api/tests/daily-limit.test.js` — 테스트 이름에 `CAREER-27 AC-n`. 서버는 `createServer({ send: (...a) => send(...a), log, memo, dailyLimit })`를 `listen`(helpers). 사진은 서로 다르게 `makeJpeg({ width: 100 + i })`. 가짜 성공은 `converseReply('{"grade":3,"line":"흠"}')`. `vi.useFakeTimers()`는 쓰지 않는다(시계는 `now`로만).
  - **단위**
    - `dayOf`: `2026-11-08T23:59:59.999+09:00` → `2026-11-08` · `2026-11-09T00:00:00.000+09:00` → `2026-11-09` · `2026-11-08T14:59:59.999Z` → `2026-11-08` · `2026-11-08T15:00:00.000Z` → `2026-11-09`.
    - AC-5 잘못된 상한: `limit` `-1` · `1.5` · `NaN` · `'3'` · `undefined` → `TypeError`. `0`·`3`은 만들어지고 **파일·폴더를 만들지 않는다**(`existsSync(dir/var)` 거짓). `createServer({ send, log })`(셈 없음) → `TypeError`.
    - `take()`: 파일 없음 → `{ day: '2026-11-08', used: 1 }` · 파일 글자가 정확히 `{"day":"2026-11-08","used":1}\n` → 한 번 더 → `used 2` → 상한 2에서 또 → `DailyLimitError`, `reason 'limit_reached'`, `used 2`, 파일 그대로.
    - A4(1): `take()`가 돌려준 값에 `then`이 없다(Promise 아님).
    - 날짜: 파일 `{"day":"2026-11-07","used":300}` · 오늘 11-08 → `used 1`, 파일 `day` 11-08. 파일 `{"day":"2026-11-09","used":2}`(시계보다 뒤) · 상한 2 → `limit_reached`, 파일 그대로.
    - 상한 0 → `DailyLimitError` `reason 'limit_zero'`, 폴더·파일 없음.
    - 깨짐(`test.each`): `''` · `'{'` · `'null'` · `'[]'` · `{"day":"2026-11-08"}` · `{"day":"2026-11-08","used":-1}` · `…"used":1.5}` · `{"day":"x","used":1}` · `{"day":"2026-11-08","used":1,"x":0}` → `UsageStoreError` `reason 'usage_store_corrupt'`, 파일 글자 그대로.
    - 못 읽음: `file` 자리에 폴더를 만듦 → `usage_store_read`. 못 씀: `file + '.tmp'` 자리에 폴더를 만듦 → `usage_store_write`, `file` 글자 그대로(root로 돌려도 되게 권한 대신 폴더를 쓴다).
  - **HTTP** (기억 끔 `createMemo({ maxEntries: 0 })`, AC-6만 켬)
    - AC-1: 상한 3, 4장 차례로 → 200 ×3 · 4번째 429, 본문 **글자 그대로** `{"code":"daily_limit"}`, `content-type` `application/json; charset=utf-8`, `cache-control` `no-store`, `retry-after` 없음 · `send` 3. 가짜 `send` 안에서 `read().used`가 그때까지 불린 수와 같다(보내기 **전에** 썼다 — AC-7 바탕).
    - AC-2: 상한 2, `send`가 늘 `ThrottlingException`(이름·`$metadata.httpStatusCode` 429) → 429 `daily_limit`, `send` 2 → `send`를 성공으로 바꾸고 다른 사진 → 429, `send` 그대로 2 · `read().used` 2. **이 테스트만 `{ timeout: 10_000 }`**(진짜 대기 1초 + 2초 — plan '버린 대안' 마지막 줄).
    - AC-3: plan 'A4 답' (2) 그대로 — `vi.waitFor`로 8건이 먼저 429인지 → 그때 `send` **정확히 2** · `used 2` → 풀어 줌 → 200 ×2 · 429 ×8 · `send` 2.
    - AC-4: 상한 1, `let t = Date.parse('2026-11-08T23:59:59.999+09:00')` · `now: () => t` → 200 → 다른 사진 429(`send` 1) → `t = Date.parse('2026-11-09T00:00:00.000+09:00')` → 또 다른 사진 200(`send` 2) · 파일 `{"day":"2026-11-09","used":1}`.
    - AC-5: (a) `api/src/*.js`를 읽어 `/DAILY_CALL_LIMIT\s*=/`이 `config.js`에서만 1번, `daily-limit.js`에 `300`이라는 글자 0번 (b) 상한 0 서버에 올바른 요청 3번 → 모두 429 · `send` 0 · 파일 없음 · 로그 `reason 'limit_zero'`.
    - AC-6: 상한 1, `createMemo({ maxEntries: 10 })` — (a) `PNG_BYTES` 5번(400) → 사진 A(태그 `how-1`) 200 · `send` 1 (b) A·`how-1` 다시 → 200, 본문이 (a)와 같음, `send` 1, 로그 `memo 'hit'`·`day null` (c) 사진 B → 429, `send` 1.
    - AC-7: (a) 상한 2로 성공 2번 → 같은 `file`로 `createDailyLimit`·`createServer`를 **새로** 만들고 다른 사진 → 429, 새 서버 `send` 0 (b) `writeFileSync(file, '{')` 뒤 새 서버 → 503 `{"code":"unavailable"}`, `send` 0, 로그 `reason 'usage_store_corrupt'` · `file` 자리 폴더 → `usage_store_read`.
    - AC-8: AC-1·AC-2·AC-6 테스트에서 모은 로그 — 요청 수 = 줄 수 · 모든 줄에 키 `day`·`dayUsed` · `daily_limit` 줄 `outcome 'daily_limit'`, `attempts` = 그 요청이 실제로 부른 `send` 수(AC-1 넷째 0 · AC-2 첫째 2 · 둘째 0) · 마지막으로 `dayUsed`가 `null`이 아닌 줄의 값 = 그날 `send` 합 · `PHOTO_MARK`의 글자·base64·hex 0번 · 테스트 시작에 넣은 가짜 `AWS_SECRET_ACCESS_KEY` 값 0번(CAREER-25 AC-6 꼴).
    - `afterEach`: `cleanup()`.
- `api/tests/bedrock.test.js` (이미 있는 가짜 시계 그대로): `callWithRetry(send, cmd, { beforeAttempt })` — (1) Throttling → 성공: `beforeAttempt` 2번, 매번 `send`보다 먼저(호출 차례 배열) (2) 두 번째 `beforeAttempt`가 `new Error('stop')`을 던짐 → 그 오류가 그대로(같은 객체) 올라오고 `err.attempts === 1`, `send` 1 (3) 대기 중 시간 제한 → `beforeAttempt` 1번뿐.
- 단계
  1. 세 파일을 쓴다.
  2. 검사 명령 → `exit` 0 아님. 실패가 `daily-limit.test.js`(모듈 `../src/daily-limit.js` 없음)와 `bedrock.test.js`의 새 3개(`beforeAttempt` 안 불림)뿐이어야 한다. 이미 있던 테스트는 모두 통과.
  3. 커밋: `CAREER-27: daily limit server tests`
- 검사 명령: `{ npm --prefix api test; echo "exit=$?"; }`
- 끝난 상태: `exit` 0 아님 · 실패 이유가 위 둘뿐 · `git status --porcelain api` 빈 줄.

## T1 — 화면 단위 테스트 (빨강) · 순서 2 · [P]
- 담당: test-writer
- 파일: `app/tests/FirstFlow.test.jsx` (한 줄 지우고 테스트 더함)
- AC: AC-9
- 원본: plan '화면 (AC-9)' · contracts/appraise.md §5 `daily_limit` 줄 · '`daily_limit` 화면 처리'
- 공통: 이 파일의 `vi.mock('../src/appraise.js')` · `renderApp` · `pickFile` · `pickPrice` · `submit` · `mascot` · `reject` 그대로. 테스트 이름에 `CAREER-27 AC-9`.
- 고침: `test.each`의 `['daily_limit', 'unavailable'],` 한 줄을 지운다(이제 틀린 기대). 나머지 세 줄은 그대로 — '다른 코드는 지금 그대로'를 이 줄들이 계속 본다.
- 더함
  1. `daily_limit` → `mascot()` 글자에 `🚶 퇴근` · `within(mascot()).getByTestId('off-duty').textContent === OFF_DUTY_TEXT` · `queryByTestId('appraise-error')` 없음 · `region '감정 결과'` 없음 · '감정 받기' 켜짐 → `appraise.mockReturnValue(new Promise(() => {}))` 누름 → `mascot()`에 `갸웃` · `off-duty` 없음 · `appraise` 2번.
  2. 퇴근 뒤 `pickFile(jpg())` → `mascot()`에 여전히 `🚶 퇴근` · `off-duty` 그대로 · '감정 받기' 켜짐.
  3. 퇴근 뒤 `appraise.mockResolvedValueOnce({ mochi: 10, line: '흠' })` 누름 → 결과 카드 · `mascot()`에 `도장` · `off-duty` 없음.
  4. 문구 원본: `readFileSync`로 `contracts/appraise.md`를 읽어 `` | `daily_limit` ``로 시작하는 줄의 첫 `"…"` 안 글자 === `OFF_DUTY_TEXT`(`import { OFF_DUTY_TEXT } from '../src/options.js'`). 경로는 `connect.test.jsx`가 contracts를 읽는 꼴 그대로.
- 단계
  1. 고치고 더한다.
  2. 검사 명령 → lint 통과, test **실패**. 실패가 새 테스트 4개뿐이고 이유가 `🚶 퇴근` 없음 · `OFF_DUTY_TEXT` `undefined`여야 한다.
  3. 커밋: `CAREER-27: off-duty screen unit tests`
- 검사 명령: `npm --prefix app run lint && { npm --prefix app test; echo "exit=$?"; }`
- 끝난 상태: lint 0 · `exit` 0 아님 · 위 이유뿐.

## T2 — e2e 퇴근 (빨강) · 순서 2 · [P]
- 담당: test-writer
- 파일: `e2e/daily-limit.spec.js` (새로). **`playwright.config.js`·`guard-8787.js`는 고치지 않는다.**
- AC: AC-10
- 원본: plan 'e2e (AC-10)' · `e2e/connect-screen.spec.js`(1×1 PNG · 흐름 꼴)
- 내용: 테스트 하나 `CAREER-27 AC-10 daily_limit shows off-duty and retry works`.
  - `goto` **전에** `page.route((url) => url.pathname === '/api/appraise', …)`: 첫 요청 → `fulfill({ status: 429, contentType: 'application/json; charset=utf-8', body: '{"code":"daily_limit"}' })` · 두 번째 → `await released` 뒤 `fulfill` 성공 `200 {"mochi":10,"line":"흠, 손때가 제법 묻었구먼"}`. `released`는 테스트가 쥔 `Promise`(`let release; const released = new Promise((r) => (release = r))`).
  - 흐름: `goto('/')` → `getByLabel('사진 고르기').setInputFiles(png)` → `🍡 10개` → '감정 받기'.
  - 기대: `getByRole('status', { name: '감정사 아저씨' })` `toContainText('🚶 퇴근')` · `getByTestId('off-duty')` `toHaveText(OFF_DUTY)` (`OFF_DUTY` = contracts/appraise.md §5 따옴표 안 글자를 파일 맨 위 상수로 — `connect-screen.spec.js`의 `UNAVAILABLE` 꼴) · `getByTestId('appraise-error')` `toHaveCount(0)` · `getByRole('region', { name: '감정 결과' })` `toHaveCount(0)` · '감정 받기' 켜짐 → 누름 → status `toContainText('갸웃')` · `off-duty` `toHaveCount(0)` → `release()` → 결과 카드 보임 · 가로챈 요청 수 2.
  - `waitForTimeout`·`test.only` 금지.
- 단계
  1. 파일을 쓴다.
  2. 검사 명령 → `--list`에 새 테스트 1개가 더해짐. 실행은 **실패** — 이 테스트 하나뿐이고 이유가 `🚶 퇴근` 없음(지금은 `대기` + `unavailable` 문구)이어야 한다. 출력에 `[guard-8787] 받은 요청 0개`.
  3. 커밋: `CAREER-27: off-duty e2e test`
- 검사 명령: `bash -c 'cd e2e && npm ci && npx playwright install chromium && npx playwright test --list && { npx playwright test; echo "exit=$?"; }'`
- 끝난 상태: `exit` 0 아님 · 실패 1개(이 테스트) · `받은 요청 0개` · `git status --porcelain e2e`에 `test-results` 없음.

## G2 — 하루 셈 구현 (초록) · 순서 3 (G1 뒤)
- 담당: **앞 세션(사용자와 함께)**
- 파일: `api/src/config.js` · `api/src/daily-limit.js`(새로) · `api/src/bedrock.js` · `api/src/server.js` · `api/eval/live.js` · `api/eval/run.js` · `api/.gitignore`(새로) · `api/tests/server.test.js` · `memo.test.js` · `photo-upload.test.js` · `live.test.js`(셈 넣기만)
- AC: AC-1 ~ AC-8 (G1 통과) · AC-11 일부
- 원본: plan 'A1 답' · '요청 한 건의 흐름' · '바뀌는 파일' · ADR-0004
- 단계
  1. `config.js`: `DAILY_CALL_LIMIT = 300` · `DAY_UTC_OFFSET_HOURS = 9` · `USAGE_FILE`(contracts §8 — 주석에 원본).
  2. `daily-limit.js`: plan 'A1 답' 표와 `take()` 약속 그대로. `readFileSync` · `mkdirSync({ recursive: true })` · `writeFileSync(tmp, json, { flush: true })` · `renameSync` — **모두 동기, 사이에 `await` 없음**. `ENOENT`만 '파일 없음 = 0', 그 밖의 읽기 오류는 `usage_store_read`. 오류 객체에 경로·파일 내용·원래 오류 메시지를 담지 않는다(`reason`만).
  3. `bedrock.js`: 루프에서 `attempts += 1` **바로 앞**에 `beforeAttempt?.()`. 던지면 `throw Object.assign(err, { attempts })`.
  4. `server.js`: `createServer`에서 `dailyLimit`이 없으면 `TypeError`. `askModel`이 `beforeAttempt: () => { const r = dailyLimit.take(); entry.day = r.day; entry.dayUsed = r.used; }`를 넘긴다. `DailyLimitError`면 `entry.day`·`entry.dayUsed`를 오류의 값으로. `toReply`: `DailyLimitError` → `Reply(429, 'daily_limit', err.reason)` · `UsageStoreError` → `Reply(503, 'unavailable', err.reason)`. `catch`의 `if (err instanceof UpstreamError) entry.attempts = err.attempts`를 `if (typeof err.attempts === 'number')`로. 로그 줄 처음 값에 `day: null, dayUsed: null`. `startServer`는 `createDailyLimit({ file: USAGE_FILE, limit: DAILY_CALL_LIMIT })`.
  5. 이미 있는 테스트: `createServer`/`runLive`를 부르는 곳(plan D4의 8곳)에 `dailyLimit`을 `tempDailyLimit()`으로 넣고 `afterAll`/`afterEach`에서 `cleanup()`. `photo-upload.test.js`는 **`beforeAll`에서 `TMPDIR`을 바꾸기 전에** 만든다(plan 실패 시나리오 13). 기대값은 고치지 않는다.
  6. `eval/live.js`: `runLive({ …, dailyLimit })` → `createServer`로. `eval/run.js`: `createDailyLimit({ file: USAGE_FILE, limit: DAILY_CALL_LIMIT })`를 넘김(D5). 이미 있는 `usage` 변수 이름과 헷갈리지 않게 새 변수는 `dailyLimit`.
  7. `api/.gitignore`: `var/`.
  8. 검사 명령. 실패하면 **테스트를 고치지 않고** `api/src`를 고친다. G1 테스트가 plan과 어긋나 보이면 멈추고 사용자와 정한다.
  9. 커밋: `CAREER-27: daily call limit with persisted count`
- 검사 명령:
  ```
  rm -rf api/var; bash -c "$(jq -r '.checks.app.api' pipeline.config.json)"; echo "exit=$?"; ls api/var 2>&1 | head -1; grep -rnE "DAILY_CALL_LIMIT\s*=" api/src; grep -rlE "node:fs|from 'fs'" api/src; grep -rn "send(" api/src | grep -v '^\s*//'; git status --porcelain --untracked-files=all api
  ```
- 끝난 상태: `exit=0`(통과 수에 `daily-limit.test.js` 포함) · `ls`가 '없음'(테스트가 진짜 셈 파일을 만들지 않음 — 실패 시나리오 1) · `DAILY_CALL_LIMIT =` 한 줄(`config.js`) · `node:fs` 파일 한 개(`api/src/daily-limit.js`) · `send(`가 `bedrock.js`의 `callWithRetry` 안 한 곳(+ `server.js`의 진짜 클라이언트 감싸기 줄) · 커밋 뒤 `git status` 빈 줄.

## F1 — 퇴근 화면 (초록) · 순서 3 (T1·T2 뒤)
- 담당: frontend-dev
- 파일: `app/src/App.jsx` · `app/src/options.js`
- AC: AC-9 · AC-10 (T1·T2 통과)
- 원본: plan '화면 (AC-9)' · contracts/appraise.md §5
- 단계
  1. `options.js`: `export const OFF_DUTY_TEXT = '<contracts/appraise.md §5 daily_limit 줄 따옴표 안 글자 그대로>'`. `ERROR_TEXT` 위 주석에서 'daily_limit … until CAREER-27'을 지우고 'daily_limit is not an error — see OFF_DUTY_TEXT'로.
  2. `App.jsx`: `MASCOT`에 `off: '🚶 퇴근'`. `catch`에서 `e.code === 'daily_limit'`이면 `setError(null)` · `setStatus('off')`, 아니면 지금 그대로. 아저씨 칸: `{MASCOT[status]}{status === 'off' && <p data-testid="off-duty">{OFF_DUTY_TEXT}</p>}`. 버튼 `disabled`: `!photo || !myPrice || !['idle', 'off'].includes(status)`. `pickFile`은 `status`를 건드리지 않는다(지금 그대로). `appraise`를 부르는 곳은 한 곳 그대로. 새 의존성 없음.
  3. 검사 명령. 실패하면 **테스트를 고치지 않고** 화면을 고친다.
  4. 흔들림: `bash -c 'cd e2e && npx playwright test daily-limit --repeat-each=5'` → 5개 모두 통과.
  5. 커밋: `CAREER-27: off-duty mascot state`
- 검사 명령:
  ```
  for n in lint test build e2e; do echo "== $n"; bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)" || exit 1; done; git status --porcelain app e2e
  ```
- 끝난 상태: 종료 코드 0 · test·e2e 통과 수가 0이 아님 · e2e 출력에 `[guard-8787] 받은 요청 0개` · `git status`에 `node_modules`·`dist`·`test-results` 없음.

## P1 — 전체 검사 · PR · 순서 4 (G2·F1 뒤)
- 담당: frontend-dev(검사·PR 열기) · reviewer · 사용자(머지)
- 파일: 없음 (PR 본문 — `.github/pull_request_template.md`)
- AC: AC-11 · 전부(대조표)
- 단계
  1. 저장소 루트에서 `for n in lint test e2e build api; do echo "== $n"; bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)"; echo "exit=$?"; done` → 모두 `exit=0`, 통과 수 0 아님. 출력 그대로 보고.
  2. 제목 `CAREER-27: daily Bedrock call limit and off-duty mascot`.
  3. 칸
     - 결정: ADR-0004 링크 · plan D1~D5에서 사용자가 고른 것 · `createServer`가 `dailyLimit`을 꼭 받음(기존 api 테스트 8곳 고친 이유) · `api/src`의 파일 쓰기 예외가 `daily-limit.js` 하나(사진 아님 — CAREER-26 정적 확인이 바뀜) · 퇴근 문구를 아저씨 status 칸 안에 둠
     - 범위 변경: "없음 (이 스토리). 배포 스토리에 더할 것 제안: ① 셈 파일의 배포 자리(코드 폴더 밖 — ADR-0004 위험) ② 사람별 요청 수 제한(spec U7) ③ 자격 증명 시작 점검(spec U9) — 반영은 사용자"
     - 새 의존성: 없음
     - 비용·남용 영향: spec '비용·남용 영향' 그대로 + "로컬 시험 실행도 하루 셈에 들어감(D5)"
     - spec AC-1~11 ✔/✘ 대조. AC-11의 'infra diff 0줄'은 reviewer가 `git diff --stat origin/main -- infra` 빈 줄로, 'contracts는 정한 곳만'은 `git diff origin/main -- contracts`가 plan 'A3 답'의 곳뿐인지로 본다
     - '검사 결과' 칸은 CI 링크만
  4. CI `checks / app` 요약에 `app.lint`·`app.test`·`app.e2e`·`app.build`·`app.api` 통과.
- 검사 명령: `gh pr checks --watch; git diff --stat origin/main -- infra; git diff --stat origin/main -- contracts docs/adr`
- 끝난 상태: 필수 검사 모두 통과(`reviewer/gate` 포함) · `infra` diff 빈 줄 · contracts·adr diff가 `appraise-http.md` · `appraise.md` · `0004-…` 셋뿐.

---

## AC ↔ 작업
| AC | 테스트 | 통과시키는 곳 | 그 밖 |
|---|---|---|---|
| AC-1 | G1 HTTP | G2 | 헤더·본문 글자 그대로 |
| AC-2 | G1 HTTP · `bedrock.test.js` | G2 | 문 자리: plan '버린 대안' |
| AC-3 | G1 단위(Promise 아님) · HTTP(A4) | G2 | |
| AC-4 | G1 단위 `dayOf` · HTTP | G2 | 시계 주입 `now` |
| AC-5 | G1 단위(잘못된 상한) · HTTP(상한 0 · grep) | G2 | 이름·자리: D3 |
| AC-6 | G1 HTTP | G2(문이 기억 뒤) | U5 |
| AC-7 | G1 단위(깨짐·못 읽음·못 씀) · HTTP | G2 | ADR-0004 |
| AC-8 | G1 HTTP(로그) | G2 | 필드: plan '요청 한 건의 흐름' |
| AC-9 | T1 | F1 | 문구: D1 |
| AC-10 | T2 | F1 | guard-8787 그대로 |
| AC-11 | — | — | P1 · U1(contracts) |

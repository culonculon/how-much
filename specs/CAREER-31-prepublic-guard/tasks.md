[CAREER-31](https://culonculon98.atlassian.net/browse/CAREER-31) · spec: [spec.md](spec.md) · plan: [plan.md](plan.md) · 약속: [contracts/appraise-http.md](../../contracts/appraise-http.md) §5·§8·§10 · [contracts/appraise.md](../../contracts/appraise.md) §5 · 결정: [ADR-0005](../../docs/adr/0005-usage-file-outside-code-folder.md) · [ADR-0006](../../docs/adr/0006-per-person-limit-in-server-memory.md)

상태: 승인됨 (2026-10-24 — 사용자 승인, plan D1~D9 '정해진 것')

- 브랜치: `CAREER-31-prepublic-guard` 하나. 순서: **U1 → (G1 ∥ T1) → G2 → G3 → G4 → G5 → G6 → G7 → G8 · F1 (T1 뒤) → P1 (G8·F1 뒤)**
  - G1~G8은 모두 `api/`(guard, `human_only`)라 **앞 세션(사용자와 함께)**이 차례로 커밋한다. `server.js`·이미 있는 테스트를 여러 작업이 고쳐서 G끼리는 [P]가 아니다. 짝마다 테스트 커밋(홀수)이 구현 커밋(짝수)보다 먼저다 — reviewer가 커밋 순서로 본다.
  - [P] = 파일이 겹치지 않고 서로 기대지 않는다: G1(`api/`)과 T1(`app/tests/`). 같은 worktree에서 두 세션이 동시에 커밋하지 않는다.
- **U1 전에는 아무것도 만들지 않는다**(CLAUDE.md §4 — contracts 확정 전). D2 문구·코드는 추천대로 정해졌다(10/24) — G·T·F는 contracts에 적힌 글자를 그대로 쓴다.
- 모든 명령은 **저장소 루트**에서. `cd`가 들어간 명령은 `bash -c '…'`로. 세션 보고에는 출력 그대로, PR '검사 결과' 칸에는 CI 링크만.
- 이름의 원본: plan 'A3 답'(`personOf` · `createPersonLimit` · `take` · `PersonLimitError` · `reason` 둘) · '요청 한 건의 흐름'(로그 `who` · `personMinute` · `personDay`) · 'A4 답'(`StartupError` · `startup_failed`) · 'A5 답'(`streamChunked` · `log_failed`). 값의 원본: contracts/appraise-http.md §8 · appraise.md §5.
- 진짜 Bedrock은 어느 작업에서도 부르지 않는다. `npm --prefix api run eval`을 돌리지 않는다. `npm --prefix api start`는 G6 마지막 단계(가짜 키로 뜨는지)에서만, 요청을 보내지 않고 바로 끈다.

---

## U1 — plan·contracts·ADR 승인 · 순서 1 — ✔ 끝남 (2026-10-24 사용자 승인 · 단계 1·2 반영. 단계 3 커밋은 사용자 몫)
- 담당: **사용자** (architect가 고쳐 둠)
- 파일: `specs/CAREER-31-prepublic-guard/plan.md` · `tasks.md` · `contracts/appraise-http.md` · `contracts/appraise.md` · `docs/adr/0005-usage-file-outside-code-folder.md` · `docs/adr/0006-per-person-limit-in-server-memory.md` · `docs/adr/0002-…`(49줄) · `docs/adr/0004-…`(상태 줄·위험 첫 줄) (승인·커밋만)
- AC: 만들기 시작 조건(CLAUDE.md §4) · AC-11 · AC-12(contracts는 정한 곳만)
- 단계
  1. ✔ (10/24 — D1~D7 추천대로, D8 아직 안 머지 → ADR-0002 49줄 초안 그대로, D9 모두 승인. plan '정해진 것') plan '사용자가 정할 것' D1~D9를 고른다. 추천과 다르면 architect에게 알려 plan·contracts·ADR·이 tasks를 고치게 한다(D2가 다르면 appraise.md §5 `person_limit` 줄의 코드·따옴표 안 글자와 appraise-http.md §5 표·'사람별 제한' 절의 코드 이름이 바뀐다. D1이 F면 ADR-0006·plan 'A3 답'을 다시 쓴다). D8 답을 ADR-0002 49줄에 맞춘다.
  2. ✔ (10/24) 상태 줄을 바꾼다: 두 contracts 맨 위 'CAREER-31 고침 (승인 대기 …)' → '(사용자 승인 — 날짜)' · 본문의 '승인 대기' 글귀를 지움 · plan·tasks → `승인됨 (2026-MM-DD …)` · ADR-0005·0006 → `확정 (날짜 — 사용자 승인)` · ADR-0002·0004의 '(CAREER-31 고침 제안 — 사용자 승인 전)' → '(CAREER-31 고침 — 날짜 사용자 승인)'.
  3. 커밋: `CAREER-31: prepublic guard plan, contracts and ADRs`
- 검사 명령: `grep -m1 -H '상태' specs/CAREER-31-prepublic-guard/plan.md specs/CAREER-31-prepublic-guard/tasks.md docs/adr/0005-*.md docs/adr/0006-*.md; grep -c '승인 대기' contracts/appraise-http.md contracts/appraise.md; grep -c '승인 전' docs/adr/0002-*.md docs/adr/0004-*.md`
- 끝난 상태: 네 줄이 '승인됨'·'승인됨'·'확정'·'확정', 네 파일 모두 `:0`.

## G1 — 사람별 제한 테스트 (빨강) · 순서 2 · [P]
- 담당: **앞 세션(사용자와 함께)** — `api/`는 `human_only`(guard)
- 파일: `api/tests/test-person-limit.js`(새로) · `api/tests/person-limit.test.js`(새로). **이미 있는 테스트·`api/src`는 이 작업에서 고치지 않는다**(G2에서) — 빨강 이유가 새 테스트뿐이어야 한다.
- AC: AC-1 ~ AC-4
- 원본: plan 'A2 답' · 'A3 답' · '요청 한 건의 흐름' · contracts/appraise-http.md §5 '사람별 제한' · §8
- `test-person-limit.js`: `testPersonLimit({ minuteLimit = 1000, dayLimit = 1000, windowMs = 60_000, maxEntries = 1000, now } = {})` → `createPersonLimit({ minuteLimit, windowMs, dayLimit, maxEntries, now })`.
- `person-limit.test.js` — 테스트 이름에 `CAREER-31 AC-n`. 시계는 `let t = Date.parse('2026-11-08T12:00:00+09:00')` · `now: () => t`를 사람별 셈과 하루 셈(`tempDailyLimit({ now })`)에 **같이** 넣는다. `vi.useFakeTimers()`는 쓰지 않는다. 서버는 `createServer({ send: (...a) => send(...a), log, memo, dailyLimit, personLimit })`를 `listen`(helpers). 사진은 서로 다르게 `makeJpeg({ width: 100 + i })`. 가짜 성공은 `converseReply('{"grade":3,"line":"흠"}')`. 사람 P = 헤더 `CloudFront-Viewer-Address: 203.0.113.7:40001`, Q = `198.51.100.9:50000`. `afterEach`에서 `cleanup()`·서버 닫기.
  - **단위 `personOf`** (`test.each`, 기대 `{ key, who }`)
    - `'203.0.113.7:40001'`·`'203.0.113.7:9'` → 둘 다 `{ key: '4:203.0.113.7', who: 'ip4' }` (포트를 버림)
    - `'2001:db8:0:1:aaaa::1:46532'`·`'2001:db8:0:1:ffff:ffff:ffff:ffff:1'` → 둘 다 `{ key: '6:2001:0db8:0000:0001', who: 'ip6' }` · `'2001:db8:0:2::1:46532'` → `'6:2001:0db8:0000:0002'`
    - `'::ffff:203.0.113.7:40001'` → `{ key: '4:203.0.113.7', who: 'ip4' }`
    - `undefined` → `{ key: '-', who: 'none' }` · `''`·`'203.0.113.7'`(포트 없음)·`'203.0.113.7:x'`·`'203.0.113.7:123456'`·`'evil:80'`·`'1.2.3.4:1, 5.6.7.8:2'`(헤더 둘) → `{ key: '-', who: 'bad' }`
  - **단위 `take`**
    - 잘못된 값: `minuteLimit`·`dayLimit`·`maxEntries`·`windowMs` 각각 `0`·`-1`·`1.5`·`NaN`·`'5'`·`undefined` → `TypeError`.
    - 창: 상한(분 3·하루 100) — 같은 `t`에 `take('a')` 3번 → `{ minuteUsed: 1..3 }` → 4번째 `PersonLimitError` `reason 'person_minute'`, `minuteUsed 3` · `take('b')` 통과 · `t += 59_999` → 여전히 `person_minute` · `t += 1`(정확히 60,000) → 통과 `minuteUsed 1`.
    - 막힌 요청은 안 셈: 위 4번째 뒤 `dayUsed` 3 그대로.
    - 하루: 분 100·하루 2 — 2번 → 3번째 `person_day` → `t = Date.parse('2026-11-08T23:59:59.999+09:00')` → `person_day` → `t = Date.parse('2026-11-09T00:00:00.000+09:00')` → 통과 `dayUsed 1`. 시계를 다시 `2026-11-08`로 돌림 → `dayUsed`는 이어서 2(뒤로 가도 새 하루 없음).
    - 둘 다 넘음 → `person_day`가 먼저.
    - 상한 개수: `maxEntries 2` — `a`·`b`·`a`(a를 최근으로) → `c` → `size() === 2`, `b`가 버려짐(`b`는 다시 `minuteUsed 1`), `a`는 이어짐.
    - `take`가 돌려준 값에 `then`이 없다(Promise 아님).
  - **HTTP** (기억 끔 `createMemo({ maxEntries: 0 })`, AC-1 (b)만 켬 `createMemo({ maxEntries: 10 })`. 사람별 상한 분 3 · 하루 1000)
    - AC-1 (a): P 4장 차례로 → 200 ×3 · 4번째 429, 본문 **글자 그대로** `{"code":"person_limit"}`, `content-type` `application/json; charset=utf-8`, `cache-control` `no-store`, `retry-after` 없음 · 그 요청 뒤 `send` 3 그대로 → Q 1장 200 · `t += 60_000` → P 200.
    - AC-1 (b): 새 서버, P가 **같은** 사진 4번 → 200 ×3(본문 셋이 같음) · 4번째 429 `person_limit` · `send` 합 1 · 로그 `memo` 차례 `miss`·`hit`·`hit`·`null`. 하루 셈 `dailyLimit`은 상한 300으로 만든다(`tempDailyLimit({ limit: 300 })`) — 따로 돈다.
    - AC-2: 분 3 · 하루 5 · 서울 `2026-11-08T09:00` — P가 서로 다른 사진 6장을 `t += 60_000`씩 띄워 → 200 ×5 · 6번째 429 · `t = …23:59:00+09:00` → 429 (그 두 요청에서 `send` 늘지 않음) · `t = 2026-11-09T00:00:00+09:00` → 200.
    - AC-2 배포 값: (a) `import * as C from '../src/config.js'` → `PERSON_MINUTE_LIMIT === 5` · `PERSON_WINDOW_MS === 60_000` · `PERSON_DAY_LIMIT === 50` · `PERSON_HEADER === 'cloudfront-viewer-address'` (b) `api/src/*.js`를 읽어 `/PERSON_(MINUTE|DAY)_LIMIT\s*=/`가 `config.js`에서만 각 1번 (c) `startServer({ port: 0, send, log, dailyLimit: tempDailyLimit().dailyLimit })`(사람별 셈을 **안** 줌 = 진짜 기본값)에 같은 헤더로 서로 다른 사진 6장 → 200 ×5 · 6번째 429 `person_limit`.
    - AC-3 (a): P의 IP 그대로, 포트(40001~40004)와 `X-Forwarded-For`(`1.1.1.${i}`)·`X-Real-IP`·`True-Client-IP`를 요청마다 바꿔 4장 → 4번째 429. (b) 헤더 없는 요청 4장 → 4번째 429(모두 한 사람 `-`), 로그 `who: 'none'` · 이어서 헤더가 `'garbage'`인 요청 → 429(같은 `-`), 로그 `who: 'bad'` · 이 다섯 요청에서 4번째부터 `send` 늘지 않음. (c) 사람을 가르는 값이 하나뿐: `api/src/*.js`에서 `x-forwarded-for`·`x-real-ip`·`true-client-ip`·`remoteAddress` 글자 0번(대소문자 무시).
    - AC-4: AC-1 (a)와 같은 흐름 뒤 → 셈 파일 `read().used === 3` · 로그 줄 수 = 요청 수 · 모든 줄에 키 `who`·`personMinute`·`personDay` · 4번째 줄 `outcome 'person_limit'`, `reason 'person_minute'`, `attempts 0`, `memo null`, `day null`, `who 'ip4'`, `personMinute 3` · 모든 줄 글자에 `203.0.113.7`·`203.0.113`·`PHOTO_MARK`(글자·base64·hex)·테스트 시작에 넣은 가짜 `AWS_SECRET_ACCESS_KEY` 값 0번.
    - 사람별 거절은 본문을 읽기 전: AC-1 (a)의 4번째에 1,000,000바이트 JPEG를 보내도 429가 오고 로그 `reason 'person_minute'`(크기·JPEG 검사 전에 끝남).
- 단계
  1. 두 파일을 쓴다.
  2. 검사 명령 → `exit` 0 아님. 실패가 `person-limit.test.js`(모듈 `../src/person-limit.js` 없음) 하나뿐이어야 한다. 이미 있던 테스트는 모두 통과.
  3. 커밋: `CAREER-31: per-person limit tests`
- 검사 명령: `{ npm --prefix api test; echo "exit=$?"; }; git status --porcelain api`
- 끝난 상태: `exit` 0 아님 · 실패 파일이 위 하나뿐 · `git status` 빈 줄.

## T1 — 화면 단위 테스트 (빨강) · 순서 2 · [P]
- 담당: test-writer
- 파일: `app/tests/FirstFlow.test.jsx` · `app/tests/appraise.test.js` (더함만)
- AC: AC-5
- 원본: plan '화면 (AC-5)' · contracts/appraise.md §5 `person_limit` 줄 · appraise-http.md §5
- `appraise.test.js`: 'AC-7 서버 거절 코드는 그대로' `test.each`에 `[429, 'person_limit']` 한 줄을 더한다.
- `FirstFlow.test.jsx` (테스트 이름에 `CAREER-31 AC-5`)
  1. 이 파일의 `ERROR_TEXT` 상수에 `person_limit: '<contracts/appraise.md §5 person_limit 줄 첫 따옴표 글자 그대로>'`를 더한다.
  2. 'AC-7 failure code %s …' `test.each`에 `['person_limit', 'person_limit']` 한 줄 — 갸웃이 끝나고(`대기`) `appraise-error` 글자가 그 문구 · 결과 카드 없음.
  3. 새 테스트: `person_limit` 뒤 `mascot()`에 `퇴근` 없음 · `queryByTestId('off-duty')` 없음 · '감정 받기' 켜짐 → `appraise.mockReturnValue(new Promise(() => {}))` 누름 → `mascot()`에 `갸웃` · `appraise-error` 없음 · `appraise` 2번.
  4. 문구 원본: `readFileSync`로 `contracts/appraise.md`를 읽어 `` | `person_limit` ``로 시작하는 줄의 첫 `"…"` 안 글자 === `ERROR_TEXT.person_limit`(`import { ERROR_TEXT } from '../src/options.js'` — 파일 안 상수와 이름이 겹치면 `as APP_ERROR_TEXT`) · 그 글자가 `[...s].length <= 30`. 경로는 'CAREER-27 AC-9 off-duty text matches …' 꼴 그대로.
- 단계
  1. 더한다.
  2. 검사 명령 → lint 통과, test **실패**. 실패가 새로 더한 것뿐이고 이유가 `unavailable` 문구가 보임(어댑터가 모르는 코드) · `ERROR_TEXT.person_limit` `undefined`여야 한다.
  3. 커밋: `CAREER-31: person limit screen unit tests`
- 검사 명령: `npm --prefix app run lint && { npm --prefix app test; echo "exit=$?"; }`
- 끝난 상태: lint 0 · `exit` 0 아님 · 위 이유뿐.

## G2 — 사람별 제한 구현 (초록) · 순서 3 (G1 뒤)
- 담당: **앞 세션(사용자와 함께)**
- 파일: `api/src/config.js` · `api/src/person-limit.js`(새로) · `api/src/server.js` · `api/eval/live.js` · `api/eval/run.js` · `api/tests/server.test.js` · `photo-upload.test.js` · `daily-limit.test.js` · `memo.test.js` · `live.test.js`(사람별 셈 넣기만)
- AC: AC-1 ~ AC-4 (G1 통과)
- 원본: plan 'A2 답' · 'A3 답' · '요청 한 건의 흐름' · ADR-0006
- 단계
  1. `config.js`: `PERSON_HEADER` · `PERSON_MINUTE_LIMIT = 5` · `PERSON_WINDOW_MS = 60_000` · `PERSON_DAY_LIMIT = 50` · `PERSON_MAX_ENTRIES = 10_000`(D4 승인값) — 주석에 contracts §8.
  2. `person-limit.js`: plan 'A3 답' 표와 `take` 약속 그대로. `isIP`(`node:net`) · `dayOf`(`./daily-limit.js`). IPv6 펼치기는 `::`를 0 묶음으로 채워 8묶음을 만든 뒤 앞 4묶음을 4자리 소문자로. `take`는 동기 — 사이에 `await` 없음. 오류 객체에 열쇠·주소를 담지 않는다(`reason`·셈 숫자만). 주석에도 읽지 않는 헤더 이름(`X-Forwarded-For` 등)을 쓰지 않는다 — G1 AC-3 (c)가 `api/src` 글자 전체에서 찾는다('다른 헤더는 읽지 않음, plan A2 답'처럼 적는다).
  3. `server.js`: `createServer`에서 `personLimit?.take`가 함수가 아니면 `TypeError`. `appraise()`에서 메서드 검사 **바로 뒤**: `const p = personOf(req.headers[PERSON_HEADER]); entry.who = p.who; const r = personLimit.take(p.key); entry.personMinute = r.minuteUsed; entry.personDay = r.dayUsed;`. `catch`에서 `PersonLimitError`면 `entry.personMinute`·`entry.personDay`를 오류의 값으로. `toReply`: `PersonLimitError` → `Reply(429, 'person_limit', err.reason)`. 로그 처음 값에 `who: null, personMinute: null, personDay: null`. `startServer`에 `personLimit = createPersonLimit({ minuteLimit: PERSON_MINUTE_LIMIT, windowMs: PERSON_WINDOW_MS, dayLimit: PERSON_DAY_LIMIT, maxEntries: PERSON_MAX_ENTRIES })` 기본 인자 → `createServer`로.
  4. 이미 있는 테스트: `createServer`/`runLive`를 부르는 곳(plan D6의 곳)에 `personLimit: testPersonLimit()`. 기대값은 고치지 않는다. `server.test.js`의 `startServer` 테스트는 기본값(진짜 5/50)으로 두어도 요청이 5번 이하인지 보고, 넘으면 `testPersonLimit()`을 넣는다.
  5. `eval/live.js`: `runLive({ …, personLimit })` → `createServer`로. `eval/run.js`: `createPersonLimit({ minuteLimit: 1000, windowMs: PERSON_WINDOW_MS, dayLimit: 1000, maxEntries: 1000 })`를 넘기고 그 줄 위에 주석 `// 시험 실행은 운영자 도구 — 사람별 제한은 넉넉히, 돈은 하루 상한이 막는다 (CAREER-31 D7)`.
  6. 검사 명령. 실패하면 **테스트를 고치지 않고** `api/src`를 고친다. G1 테스트가 plan과 어긋나 보이면 멈추고 사용자와 정한다.
  7. 커밋: `CAREER-31: per-person request limit before body read`
- 검사 명령:
  ```
  bash -c "$(jq -r '.checks.app.api' pipeline.config.json)"; echo "exit=$?"; grep -rnE "PERSON_(MINUTE|DAY)_LIMIT\s*=" api/src; grep -rniE "x-forwarded-for|x-real-ip|true-client-ip|remoteAddress" api/src; git status --porcelain --untracked-files=all api
  ```
- 끝난 상태: `exit=0`(통과 수에 `person-limit.test.js` 포함) · `=` 줄이 `config.js` 둘 · 두 번째 `grep` 0줄 · 커밋 뒤 `git status` 빈 줄.

## G3 — 셈 파일 자리 테스트 (빨강) · 순서 4 (G2 뒤)
- 담당: **앞 세션(사용자와 함께)**
- 파일: `api/tests/usage-location.test.js`(새로)
- AC: AC-6
- 원본: plan 'A1 답' · ADR-0005 · contracts §8 `USAGE_FILE`
- 내용 (테스트 이름에 `CAREER-31 AC-6`)
  - `beforeAll`: `home = mkdtempSync(join(tmpdir(), 'c31-home-'))` · `oldHome = process.env.HOME` · `process.env.HOME = home` · `apiDir = fileURLToPath(new URL('..', import.meta.url))` · 임시 폴더 `relA`·`relB`(`mkdtempSync(…'c31-rel-')`) 각각에 `cpSync(join(apiDir, 'src'), join(relX, 'api', 'src'), { recursive: true })`. `afterAll`: `HOME`을 `oldHome`으로 되돌리고 세 폴더를 지움.
  - 두 '배포'의 설정: `const A = await import(pathToFileURL(join(relA, 'api/src/config.js')).href)` · `const LA = await import(pathToFileURL(join(relA, 'api/src/daily-limit.js')).href)`, B도 같게.
  - (1) 자리: `A.USAGE_FILE === B.USAGE_FILE` · `A.USAGE_FILE === join(home, '.local', 'state', 'how-much', 'usage.json')` · `relA`·`relB`·`apiDir` 어느 것으로도 시작하지 않음.
  - (2) 이어짐: 서버 A = 원래 `createServer`(`../src/server.js`)에 `dailyLimit: LA.createDailyLimit({ file: A.USAGE_FILE, limit: 2, now })` · `personLimit: testPersonLimit()` · 기억 끔 → 사진 1 200 · 서버 닫음 → 서버 B = `LB.createDailyLimit({ file: B.USAGE_FILE, limit: 2, now })`로 → 사진 2 200 · 사진 3 429 `{"code":"daily_limit"}` · B의 `send` 1.
  - (3) 권한: 처음 만든 폴더 `statSync(dirname(file)).mode & 0o777 === 0o700` · 파일 `& 0o777 === 0o600`(`process.platform === 'win32'`이면 건너뜀).
  - (4) 못 쓰면: `HOME`을 **파일**로 만든 다른 임시 자리로 바꾸고 새로 복사·import한 설정으로 서버 → 사진 → 503 `{"code":"unavailable"}` · 로그 `reason`이 `usage_store_write` 또는 `usage_store_read` · `send` 0.
  - (5) 설정 한 곳: `api/src/*.js`를 읽어 `usage.json` 글자가 `config.js`에서만 1번 · `api/src`에 `process.env` 글자가 `server.js`의 `PORT` 줄 말고 0번.
- 단계
  1. 파일을 쓴다.
  2. 검사 명령 → 실패가 이 파일뿐이고 이유가 (1) `USAGE_FILE`이 복사 폴더 안(`…/api/var/usage.json`) · (3) 권한 다름이어야 한다.
  3. 커밋: `CAREER-31: usage file location tests`
- 검사 명령: `{ npm --prefix api test; echo "exit=$?"; }; git status --porcelain api`
- 끝난 상태: `exit` 0 아님 · 실패가 `usage-location.test.js`뿐 · `git status` 빈 줄.

## G4 — 셈 파일 자리 구현 (초록) · 순서 5 (G3 뒤)
- 담당: **앞 세션(사용자와 함께)**
- 파일: `api/src/config.js` · `api/src/daily-limit.js`
- AC: AC-6 (G3 통과)
- 원본: plan 'A1 답' · ADR-0005
- 단계
  1. `config.js`: `import { homedir } from 'node:os'` · `import { join } from 'node:path'` · `USAGE_FILE = join(homedir(), '.local', 'state', 'how-much', 'usage.json')` — 주석 `// 코드 폴더 밖 — 배포로 폴더를 바꿔도 셈이 이어진다(ADR-0005)`. `fileURLToPath` import가 더 안 쓰이면 지운다.
  2. `daily-limit.js`: `mkdirSync(dirname(file), { recursive: true, mode: 0o700 })` · `writeFileSync(tmp, …, { flush: true, mode: 0o600 })`. 그 밖은 고치지 않는다.
  3. 검사 명령. 실패하면 테스트를 고치지 않고 `api/src`를 고친다.
  4. 커밋: `CAREER-31: usage file outside code folder`
- 검사 명령:
  ```
  S="$HOME/.local/state/how-much/usage.json"; B=$(stat -f %m "$S" 2>/dev/null || stat -c %Y "$S" 2>/dev/null || echo none); bash -c "$(jq -r '.checks.app.api' pipeline.config.json)"; echo "exit=$?"; A=$(stat -f %m "$S" 2>/dev/null || stat -c %Y "$S" 2>/dev/null || echo none); echo "real usage file before=$B after=$A"; grep -rn "usage.json" api/src; git status --porcelain --untracked-files=all api
  ```
- 끝난 상태: `exit=0`(통과 수에 `usage-location.test.js` 포함) · `before`와 `after`가 같음(테스트가 진짜 셈 자리를 건드리지 않음 — plan 실패 시나리오 14) · `usage.json` 줄이 `config.js` 하나 · 커밋 뒤 `git status` 빈 줄.

## G5 — 자격 증명 시작 점검 테스트 (빨강) · 순서 6 (G4 뒤)
- 담당: **앞 세션(사용자와 함께)**
- 파일: `api/tests/startup.test.js`(새로)
- AC: AC-7
- 원본: plan 'A4 답'
- 먼저 확인(코드 쓰기 전): `node -e "import('@aws-sdk/client-bedrock-runtime').then(({BedrockRuntimeClient:C})=>console.log(typeof new C({region:'ap-northeast-2'}).config.credentials))"`를 `api/`에서 돌려 `function`인지 본다. 아니면 **멈추고** 사용자에게 알린다(plan 'A4 답' 마지막 줄).
- 내용 (테스트 이름에 `CAREER-31 AC-7`, 각 `{ timeout: 15_000 }`)
  - 돕는 함수 `run(env)`: `spawn(process.execPath, ['src/server.js'], { cwd: apiDir, env })` → stdout·stderr를 모으고, stdout에 `"evt":"listening"` 줄이 오면 `SIGTERM`. `{ code, signal, out, err }`를 돌려줌.
  - 공통 `env`: **새 객체** `{ PATH: process.env.PATH, HOME: <빈 임시 폴더>, AWS_CONFIG_FILE: join(home, 'none-config'), AWS_SHARED_CREDENTIALS_FILE: join(home, 'none-creds'), AWS_EC2_METADATA_DISABLED: 'true', PORT: '0' }` — 부모 `process.env`의 `AWS_*`를 물려받지 않는다.
  - (a) 없음: `code !== 0`(그리고 `null` 아님 — 스스로 끝남) · stdout에 `listening` 줄 없음 · `startup_failed` 줄 정확히 1개, `JSON.parse` 결과가 `{ evt: 'startup_failed', reason: 'no_credentials', error: <문자열> }`이고 키가 이 셋뿐 · 출력 전체에 임시 `HOME` 경로 글자 0번.
  - (b) 있음: 공통 `env` + `AWS_ACCESS_KEY_ID: 'AKIAHOWMUCHFAKEKEY02'` · `AWS_SECRET_ACCESS_KEY: 'howmuch-fake-secret-c31'` → `listening` 줄이 오고 `address === '127.0.0.1'` · 우리가 `SIGTERM`으로 끝냄 · 출력 전체에 두 가짜 값 0번 · 임시 `HOME` 아래에 아무것도 안 생김(`readdirSync(home)`이 `[]` — 시작이 셈 파일을 만들지 않음).
  - (c) Bedrock 0번: 두 경우 모두 요청을 보내지 않으므로 Bedrock 호출이 없다 — (a)는 포트가 없고 (b)는 `listening` 직후 끈다. 테스트 주석에 이 이유를 적는다.
- 단계
  1. 파일을 쓴다.
  2. 검사 명령 → 실패가 (a) 하나뿐이고 이유가 '`listening` 줄이 옴 · 종료 코드가 신호(`SIGTERM`)'여야 한다. (b)는 지금도 통과.
  3. 커밋: `CAREER-31: startup credential check tests`
- 검사 명령: `{ npm --prefix api test; echo "exit=$?"; }; git status --porcelain api`
- 끝난 상태: `exit` 0 아님 · 실패가 `startup.test.js`의 (a)뿐 · `git status` 빈 줄.

## G6 — 자격 증명 시작 점검 구현 (초록) · 순서 7 (G5 뒤)
- 담당: **앞 세션(사용자와 함께)**
- 파일: `api/src/server.js`
- AC: AC-7 (G5 통과)
- 원본: plan 'A4 답'
- 단계
  1. `export class StartupError extends Error` — `name 'StartupError'` · `reason` · `causeName`. 메시지에 원래 오류 메시지를 넣지 않는다.
  2. `startServer`: `send`가 없을 때만 `const client = makeBedrockClient(); try { await client.config.credentials(); } catch (err) { throw new StartupError('no_credentials', typeof err?.name === 'string' ? err.name : 'Unknown'); }` → 그 뒤 `realSend` · `listen`.
  3. 직접 실행 경로: `try { const server = await startServer(); … listening 줄 … } catch (err) { if (!(err instanceof StartupError)) throw err; console.log(JSON.stringify({ evt: 'startup_failed', reason: err.reason, error: err.causeName })); process.exitCode = 1; }` — `process.exit`을 쓰지 않는다.
  4. 검사 명령.
  5. 손 확인(요청 보내지 않음): `bash -c 'cd api && AWS_ACCESS_KEY_ID=x AWS_SECRET_ACCESS_KEY=y PORT=0 timeout 5 node src/server.js; echo "exit=$?"'` → `listening` 줄 뒤 `exit=124`(timeout이 끔).
  6. 커밋: `CAREER-31: refuse to start without AWS credentials`
- 검사 명령: `bash -c "$(jq -r '.checks.app.api' pipeline.config.json)"; echo "exit=$?"; git status --porcelain --untracked-files=all api`
- 끝난 상태: `exit=0`(통과 수에 `startup.test.js` 포함) · 커밋 뒤 `git status` 빈 줄.

## G7 — CAREER-25 리뷰 ①②③ 재현과 테스트 (빨강) · 순서 8 (G6 뒤)
- 담당: **앞 세션(사용자와 함께)**
- 파일: `api/tests/helpers.js`(더함) · `api/tests/server.test.js`(더함) · `api/tests/daily-limit.test.js`(맨 위 경고 모으기 · `afterAll` 하나 더함)
- AC: AC-8 · AC-9 · AC-10
- 원본: plan 'A5 답'
- 단계
  1. **AC-9 원인 찾기**: `NODE_OPTIONS=--trace-warnings npm --prefix api test -- daily-limit 2>&1 | grep -A15 MaxListenersExceededWarning`. 경고가 0번이면 `npm --prefix api test 2>&1 | grep -B2 -A15 MaxListenersExceededWarning`로 전체에서 찾는다. 그래도 0번이면 **멈추고** 사용자에게 알린다(재현 안 됨). 나오면 스택·대상 이름(`[AbortSignal]` 등)을 적어 둔다(이 커밋 메시지 본문 + PR '결정' 칸).
  2. `helpers.js`에 `streamChunked(url, { headers = {}, total, chunk = 64 * 1024 } = {})` → `Promise<{ status, text, complete, errors }>`: `http.request(url, { method: 'POST', headers, agent: false })`(`Content-Length` 없음 → chunked) · 응답을 기다리지 않고 바로 `total`바이트(앞 3바이트 `FF D8 FF`, 나머지 `0x5a`)를 `chunk`씩 쓴다(`drain` 기다림, `req.destroyed`면 멈춤) · 응답 `end`가 오면 `complete = true` · 응답 `aborted`/`error`나 소켓 `close`가 `end`보다 먼저면 `complete = false` · 요청 오류는 `errors`에 모으기만 · 요청과 응답이 모두 닫히면 끝.
  3. `server.test.js` — 테스트 이름에 `CAREER-31 AC-n`
     - AC-8: 'AC-2(f) 거절 뒤 남은 업로드' 안의 `own()`으로 서버 하나 → `for (let i = 0; i < 30; i++)` `streamChunked(`${base}/api/appraise?myPrice=ten`, { headers: { 'content-type': 'image/jpeg' }, total: 3_000_000 })` → 회차마다 `status === 400 && text === '{"code":"invalid_input"}' && complete`가 아니면 `bad.push({ i, status, text, complete })` → 끝에 `expect(bad).toEqual([])` · `send` 0 · 로그 30줄 모두 `reason 'too_large'`. `{ timeout: 60_000 }`.
     - AC-10: 서버 둘(기억 끔, `testPersonLimit()`, `tempDailyLimit()`) — 하나는 `log`가 정상, 하나는 `log: () => { throw new TypeError('HOWMUCH-LOG-SECRET'); }`. `const spy = vi.spyOn(process.stderr, 'write')` 뒤 둘에 같은 사진 → 상태·본문 같음 · `spy.mock.calls`의 글 중 `log_failed`가 든 줄 정확히 1개, `JSON.parse` 결과 `{ evt: 'log_failed', error: 'TypeError' }` · 모은 글 전체에 `HOWMUCH-LOG-SECRET`·`PHOTO_MARK`(글자·base64·hex)·`FAKE_SECRET` 0번 · `spy.mockRestore()`(`finally`).
  4. `daily-limit.test.js` 맨 위: `const warnings = []; process.on('warning', (w) => warnings.push(w.name));` · 맨 아래 `afterAll(async () => { await new Promise((r) => setImmediate(r)); expect(warnings.filter((n) => n === 'MaxListenersExceededWarning')).toEqual([]); })` — 이름 `CAREER-31 AC-9`는 주석으로.
  5. 검사 명령 → 실패가 AC-8(30번 중 1번 이상 — 0번이면 **멈춤**, plan 'A5 답') · AC-10(`log_failed` 줄 0개) · AC-9(`afterAll`)뿐이어야 한다.
  6. 커밋: `CAREER-31: chunked reject, listener warning and log failure tests` — 본문에 1단계의 경고 스택 요약.
- 검사 명령: `{ npm --prefix api test 2>&1 | tee /tmp/c31-g7.log; echo "exit=${PIPESTATUS[0]}"; } ; grep -c MaxListenersExceededWarning /tmp/c31-g7.log; git status --porcelain api` (`bash -c '…'`로)
- 끝난 상태: `exit` 0 아님 · 실패가 위 셋뿐 · 경고 수 1 이상 · `git status` 빈 줄.

## G8 — CAREER-25 리뷰 ①②③ 고침 (초록) · 순서 9 (G7 뒤)
- 담당: **앞 세션(사용자와 함께)**
- 파일: `api/src/server.js` · (AC-9 원인에 따라) `api/src/bedrock.js` 또는 원인이 된 테스트 헬퍼
- AC: AC-8 · AC-9 · AC-10 (G7 통과)
- 원본: plan 'A5 답'
- 단계
  1. AC-8 (`writeJson`의 버리기 길만): 헤더에 `'Content-Length': Buffer.byteLength(text)` · 한도를 넘으면 `stop(); req.pause(); res.end(); finished(res, () => req.socket.destroy());`(`import { finished } from 'node:stream'`). `req.complete`·`declared > REJECT_DRAIN_BYTES` 갈래는 그대로.
  2. AC-9: G7 1단계에서 찾은 곳의 리스너 수명을 맞춘다(붙인 곳에서 떼기 · 대상을 요청마다 따로). 원인이 테스트 코드면 테스트 쪽을 고치고 기대값은 그대로. 경고 끄기 금지(plan 실패 시나리오 19).
  3. AC-10: 로그 `catch {}`를 `catch (err) { try { process.stderr.write(`${JSON.stringify({ evt: 'log_failed', error: typeof err?.name === 'string' ? err.name : 'Unknown' })}\n`); } catch { /* 남길 곳이 없다 */ } }`로.
  4. 검사 명령. 실패하면 테스트를 고치지 않는다. AC-8이 고친 뒤에도 30번 중 실패하면 **멈추고** 사용자와 정한다(가설이 틀림 — plan '버린 것' lingering close를 다시 볼지).
  5. 흔들림: `bash -c 'for i in 1 2 3; do npm --prefix api test -- server.test.js -t "CAREER-31 AC-8" || exit 1; done'` → 3번 모두 통과.
  6. 커밋: `CAREER-31: complete reject response before closing, listener lifecycle, log failure notice`
- 검사 명령:
  ```
  bash -c 'npm --prefix api ci >/dev/null && { npm --prefix api test 2>&1 | tee /tmp/c31-g8.log; echo "exit=${PIPESTATUS[0]}"; }; echo "warnings=$(grep -c MaxListenersExceededWarning /tmp/c31-g8.log)"; grep -rnE "setMaxListeners|defaultMaxListeners|no-warnings|NODE_NO_WARNINGS|removeAllListeners\(.warning" api --include=*.js --include=package.json --exclude-dir=node_modules; git status --porcelain --untracked-files=all api'
  ```
- 끝난 상태: `exit=0` · `warnings=0` · `grep` 0줄 · 커밋 뒤 `git status` 빈 줄.

## F1 — `person_limit` 화면 (초록) · 순서 3 (T1 뒤 · U1 뒤)
- 담당: frontend-dev
- 파일: `app/src/appraise.js` · `app/src/options.js`
- AC: AC-5 (T1 통과)
- 원본: plan '화면 (AC-5)' · contracts/appraise.md §5
- 단계
  1. `appraise.js`: `CODES`에 `'person_limit'`. 맨 위 주석은 그대로.
  2. `options.js`: `ERROR_TEXT`에 `person_limit: '<contracts/appraise.md §5 person_limit 줄 따옴표 안 글자 그대로>'`.
  3. `App.jsx`는 고치지 않는다(plan '화면'). 새 의존성 없음.
  4. 검사 명령. 실패하면 **테스트를 고치지 않고** 화면을 고친다.
  5. 커밋: `CAREER-31: person limit notice`
- 검사 명령:
  ```
  for n in lint test build e2e; do echo "== $n"; bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)" || exit 1; done; git diff --stat HEAD~1 -- app/src/App.jsx; git status --porcelain app e2e
  ```
- 끝난 상태: 종료 코드 0 · test·e2e 통과 수 0 아님 · e2e 출력에 `[guard-8787] 받은 요청 0개` · `App.jsx` diff 빈 줄 · `git status`에 `node_modules`·`dist`·`test-results` 없음.

## P1 — 전체 검사 · PR · 순서 10 (G8·F1 뒤)
- 담당: frontend-dev(검사·PR 열기) · reviewer · 사용자(머지)
- 파일: 없음 (PR 본문 — `.github/pull_request_template.md`)
- AC: AC-11 · AC-12 · 전부(대조표)
- 단계
  1. 저장소 루트에서 `for n in lint test e2e build api; do echo "== $n"; bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)"; echo "exit=$?"; done` → 모두 `exit=0`, 통과 수 0 아님. 출력 그대로 보고.
  2. 제목 `CAREER-31: per-person limit, usage file location and startup check`
  3. 칸
     - 결정: ADR-0005·0006 링크 · ADR-0002 49줄 고침 · plan D1~D8에서 사용자가 고른 것 · `createServer`가 `personLimit`을 꼭 받음(이미 있는 테스트를 고친 이유) · 시험 실행은 사람별 제한 넉넉히(D7) · AC-9 원인(G7 1단계 스택 요약)과 고친 곳 · AC-8 고침(`Content-Length` + 응답이 나간 뒤 끊기)
     - 범위 변경: "없음 (이 스토리). CAREER-30에 더할 것 제안: plan '범위 밖 · CAREER-30에 넘길 것' 목록 — 반영은 사용자"
     - 새 의존성: 없음
     - 비용·남용 영향: spec '비용·남용 영향' 그대로 + "로컬 셈 파일 자리가 바뀌어 한 번 0에서 다시 시작 · 로컬 worktree들이 셈 하나를 나눠 씀(D3)"
     - spec AC-1~12 ✔/✘ 대조. AC-12 'contracts는 정한 곳만'은 reviewer가 `git diff origin/main -- contracts`가 plan 'A2 답' 마지막 줄의 곳뿐인지로, '밖에 열리는 것 없음'은 `git diff --stat origin/main -- infra .github` 빈 줄 · `HOST` 줄 그대로로 본다
     - '검사 결과' 칸은 CI 링크만
  4. CI `checks / app` 요약에 `app.lint`·`app.test`·`app.e2e`·`app.build`·`app.api` 통과.
- 검사 명령: `gh pr checks --watch; git diff --stat origin/main -- infra .github; git diff --stat origin/main -- contracts docs/adr; git diff origin/main -- api/src/config.js | grep -n HOST`
- 끝난 상태: 필수 검사 모두 통과(`reviewer/gate` 포함) · `infra`·`.github` diff 빈 줄 · contracts·adr diff가 `appraise-http.md` · `appraise.md` · `0002-…` · `0004-…` · `0005-…` · `0006-…`뿐 · `HOST` 줄 바뀜 없음.

---

## AC ↔ 작업
| AC | 테스트 | 통과시키는 곳 | 그 밖 |
|---|---|---|---|
| AC-1 | G1 HTTP (a)(b) | G2 | 문 자리: plan '고른 이유' |
| AC-2 | G1 단위 · HTTP · 배포 값 | G2 | 값: contracts §8 |
| AC-3 | G1 `personOf` · HTTP (a)(b)(c) | G2 | 값 하나: plan 'A2 답' |
| AC-4 | G1 HTTP | G2 | 로그 필드: plan '요청 한 건의 흐름' |
| AC-5 | T1 | F1 | 문구: D2 |
| AC-6 | G3 | G4 | ADR-0005 |
| AC-7 | G5 | G6 | plan 'A4 답' |
| AC-8 | G7 | G8 | plan 'A5 답' |
| AC-9 | G7(경고 모으기 · 표준 오류 `grep`) | G8 | 원인: G7 1단계 |
| AC-10 | G7 | G8 | |
| AC-11 | — | — | U1 · P1 (ADR-0005 · 0006 · 0002 고침) |
| AC-12 | — | — | P1 |

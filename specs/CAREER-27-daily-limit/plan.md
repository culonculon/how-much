[CAREER-27](https://culonculon98.atlassian.net/browse/CAREER-27) · spec: [spec.md](spec.md) · 작업: [tasks.md](tasks.md) · 약속: [contracts/appraise-http.md](../../contracts/appraise-http.md) §5·§8 · [contracts/appraise.md](../../contracts/appraise.md) §5 · 결정: [ADR-0004](../../docs/adr/0004-daily-call-count-in-one-json-file.md)

상태: 승인됨 (2026-10-23 — 사용자: D1~D6 모두 추천안대로. D1 퇴근 문구 B)

## 사용자 승인이 필요한 것 (모음)
| # | 무엇 | 추천 | 후보 · 근거 | 어디에 반영 |
|---|---|---|---|---|
| D1 | **퇴근 문구 (spec U8 (a))** — 상한에 걸렸을 때 '🚶 퇴근' 아래 보이는 한 줄. 다른 안내 문구와 같은 해요체(아저씨 말투는 §11 미정이라 쓰지 않음) | **B "아저씨 오늘 퇴근했어요. 밤 12시에 다시 출근해요."** — 언제 다시 되는지(U3 서울 00:00)를 알려 '내일'이 몇 시인지 헷갈리지 않는다. 퇴근·출근이 짝을 이룬다 | **A** "아저씨 오늘 퇴근했어요. 내일 다시 와 주세요." (spec 예시 — 가장 짧고 부드러움. 새벽 0시 30분에 보면 '내일'이 언제인지 흐림) / **C** "오늘 감정할 몫을 다 썼어요. 내일 다시 눌러 주세요." (이유를 곧이곧대로 — 운영 사정이 드러나고 캐릭터 맛이 없음). B의 약점: U3을 바꾸면 문구도 바꿔야 한다(시각이 글자에 들어감). 셋 다 '이미 감정한 사진은 상한 뒤에도 감정됨'(U5)을 말하지 않는다 — 말하면 길어지고, 그 경우 결과 카드가 바로 나오므로 문구가 틀려 보일 일이 없다 | contracts/appraise.md §5 · `app/src/options.js` · tasks T1·T2·F1 |
| D2 | **ADR-0004 확정 — 셈 파일의 자리·모양·쓰는 법** (spec A1) | **`api/var/usage.json` 한 파일, `{"day":"YYYY-MM-DD","used":N}`, Bedrock에 보내기 바로 전에 동기(sync)로 읽고 → 비교 → 임시 파일에 쓰고 fsync → 이름 바꾸기.** 파일이 없으면 0에서 시작, 깨졌거나 못 읽거나 못 쓰면 `unavailable`(U10) | 아래 'A1 답' · ADR-0004 '버린 대안'(메모리만 · 덧붙이기 로그 · 날짜별 파일 · 비동기 쓰기 + 메모리 셈 · 홈 폴더 · 환경변수 경로). **배포(EC2) 때 이 자리가 새 코드 폴더로 바뀌면 셈이 0이 된다** — 배포 스토리에서 자리를 다시 정한다(ADR '위험') | ADR-0004 · contracts/appraise-http.md §8 · tasks G1·G2 |
| D3 | **상한 설정의 이름·자리 (spec A2)** — 값은 U2(300)·U3(서울)로 정해짐 | **`api/src/config.js` 상수 `DAILY_CALL_LIMIT = 300` · `DAY_UTC_OFFSET_HOURS = 9`, 환경변수 없음.** 급히 막기 = 값을 0으로 고치고 서버를 다시 켬 | 환경변수 `DAILY_CALL_LIMIT`(기본 300): 코드를 안 고치고 바꿀 수 있지만 '값이 정해진 곳 한 곳'(AC-5)이 둘(기본값·환경)이 되고, 배포 환경에서 몰래 커지면 비용 상한이 조용히 풀린다 — `MEMO_MAX_ENTRIES`·`HOST`를 환경변수로 안 받는 것과 같은 이유 / `Intl` 시간대 이름 `'Asia/Seoul'`: 같은 결과지만 Node ICU 데이터에 기대고, 한국은 1988년 뒤 서머타임이 없어 고정 +9로 충분 | contracts §8 · tasks G1·G2 |
| D4 | **`createServer`가 하루 셈(`dailyLimit`)을 반드시 받게 — 그래서 이미 있는 api 테스트 8곳과 시험 실행 2파일을 고친다** | **필수로 한다(없으면 서버를 만들 때 오류).** 기본값을 두면 (가) 진짜 파일 기본값: 수백 개 api 테스트가 사용자 컴퓨터의 진짜 셈 파일을 올려 dev 서버가 퇴근한다 (나) '상한 없음' 기본값: 상한을 거치지 않는 호출 경로가 생긴다(CLAUDE.md §9) — `eval/live.js`가 진짜 `send`로 `createServer`를 부른다. 고칠 곳: `server.test.js` 2 · `memo.test.js` 1 · `photo-upload.test.js` 1 · `live.test.js` 4 · `eval/live.js` · `eval/run.js` | 바꾼 것만 바꾸기(CLAUDE.md §6)보다 '거치지 않는 길 없음'(§9)을 앞에 둔 선택이라 묻는다 | tasks G1·G2 |
| D5 | **시험 실행(`npm --prefix api run eval`)의 진짜 호출도 하루 상한에 센다** | **센다** — 진짜 돈이 드는 호출이고, 같은 파일(`api/var/usage.json`)을 쓴다. 한 번에 약 60건이라 상한 300 안. 상한에 닿으면 시험 실행은 그 자리에서 멈춘다(`daily_limit` 행 — 이미 있는 '실패 코드면 멈춤' 규칙) | 안 셈(시험 실행은 상한 없는 셈 객체): 개발 중 프롬프트를 여러 번 고쳐 돌릴 때 막히지 않지만, 상한을 거치지 않는 진짜 호출 길이 생긴다(§9) | tasks G2 |
| D6 | contracts 고침(appraise-http.md §5·§8, appraise.md §5) · 이 plan · tasks 승인 | 승인 | — | 상태 줄 (tasks U1) |

## 접근 방법
하루 셈을 **Bedrock에 보내는 바로 그 자리**에 문 하나로 둔다. `callWithRetry`가 `send`를 부르기 직전(첫 시도와 재시도 모두)에 `beforeAttempt()`를 부르고, 서버는 여기에 `dailyLimit.take()`를 넣는다. `take()`는 **한 번에(동기로)** 셈 파일을 읽고 → 오늘 셈이 상한보다 작은지 보고 → 1을 올려 파일에 다 쓴 뒤에야 돌아온다. 그래서
- 기억 hit · `invalid_input`은 이 문까지 오지 않아 저절로 안 센다(U5 · AC-6)
- 재시도마다 문을 지나므로 재시도도 세고, 도중에 상한이면 다음 시도를 보내지 않는다(U1 · U6 · AC-2)
- 동기라 두 요청의 '읽기 → 비교 → 쓰기'가 섞이지 않는다(Node 한 스레드 — AC-3)
- 파일에 쓴 뒤에 보내므로 보낸 뒤 죽어도 셈을 잃지 않는다(U4 · AC-7 (a))

시계(`now`)와 셈 파일 자리(`file`)·상한(`limit`)은 `createDailyLimit({ file, limit, now })`로 밖에서 넣는다 — `send`·`memo`를 밖에서 넣는 CAREER-25의 꼴 그대로. 화면은 `daily_limit`을 받으면 아저씨 상태를 `off`(🚶 퇴근)로 바꾸고 그 안에 퇴근 문구를 보인다.

### 바뀌는 파일
| 파일 | 하는 일 | 누가 | AC |
|---|---|---|---|
| `api/src/config.js` (3줄 더함) | `DAILY_CALL_LIMIT = 300` · `DAY_UTC_OFFSET_HOURS = 9` · `USAGE_FILE`(= `fileURLToPath(new URL('../var/usage.json', import.meta.url))`) | 앞 세션 | 5 |
| `api/src/daily-limit.js` (새로) | `dayOf(ms)` · `createDailyLimit({ file, limit, now })` → `{ take() }` · `DailyLimitError` · `UsageStoreError`. `api/src`에서 `node:fs`를 쓰는 **유일한** 파일. 사진·요청을 받지 않는다(숫자와 날짜만) | 앞 세션 | 1~7 |
| `api/src/bedrock.js` (몇 줄) | `callWithRetry(…, { beforeAttempt })` — 매 `send` 바로 앞에서 부름. 던지면 `attempts`를 붙여 그대로 올림(삼키지 않음) | 앞 세션 | 1·2 |
| `api/src/server.js` (몇 줄) | `createServer({ send, log, memo, dailyLimit })` — `dailyLimit` 없으면 `TypeError`. `beforeAttempt`로 `take()`를 넣고 로그 `day`·`dayUsed`를 채움. `toReply`에 두 오류. `startServer`는 `createDailyLimit({ file: USAGE_FILE, limit: DAILY_CALL_LIMIT })`를 만든다 | 앞 세션 | 1~8 |
| `api/eval/live.js` · `api/eval/run.js` | `runLive({ …, dailyLimit })`를 `createServer`로 넘김. `run.js`는 `startServer`와 같은 진짜 셈(D5) | 앞 세션 | (D4·D5) |
| `api/.gitignore` (새로) | `var/` 한 줄 — 셈 파일을 커밋하지 않는다 | 앞 세션 | — |
| `api/tests/helpers.js` | `tempDailyLimit({ limit = 1000, now } = {})` → `{ dailyLimit, file, dir, read(), cleanup() }` — `mkdtempSync(join(tmpdir(), 'c27-'))` 안의 `usage.json` | 앞 세션 | — |
| `api/tests/daily-limit.test.js` (새로) | 단위(`dayOf` · `take` · 파일 모양 · 잘못된 상한) + HTTP로 AC-1~8 | 앞 세션 | 1~8 |
| `api/tests/server.test.js` · `memo.test.js` · `photo-upload.test.js` · `live.test.js` | `createServer`/`runLive`에 `dailyLimit: tempDailyLimit().dailyLimit`를 더하고 `afterAll`에서 지움 — **이것 말고는 고치지 않는다** | 앞 세션 | (D4) |
| `app/src/App.jsx` | 상태 `off` · `daily_limit`이면 `off` · '감정 받기'를 `idle`·`off`에서 누를 수 있게 · 아저씨 칸 안에 퇴근 문구 | frontend-dev | 9 |
| `app/src/options.js` | `OFF_DUTY_TEXT`(D1 글자 그대로) · 주석의 'until CAREER-27' 지움 | frontend-dev | 9 |
| `app/tests/daily-limit.test.jsx` (새로) · `app/tests/FirstFlow.test.jsx` (한 줄 지움) | AC-9 · 문구가 contracts 줄과 같은지 / `['daily_limit', 'unavailable']` 줄을 지움(이제 틀린 기대) | test-writer | 9 |
| `e2e/daily-limit.spec.js` (새로) | AC-10 — `page.route`로 429 → 퇴근 → 다시 누르면 갸웃 → 결과 카드 | test-writer | 10 |
| `contracts/appraise-http.md` · `contracts/appraise.md` · `docs/adr/0004-…` | 이 PR에서 architect가 고침(승인 대기) | architect | 11 |

- 건드리지 않는 것: `infra/` · `.github/` · `e2e/playwright.config.js` · `e2e/guard-8787.js` · `app/vite.config.js` · `app/src/appraise.js`(이미 `daily_limit` 코드를 그대로 넘김 — CAREER-26) · `pipeline.config.json`.

## 요청 한 건의 흐름 (CAREER-25 plan 표에 한 단계 더함)
| 단계 | 끝나는 경우 → `code` · `reason` |
|---|---|
| 경로 · 쿼리 · 헤더·크기 · JPEG | 그대로 (`invalid_input` · …) — **안 셈** |
| 기억 확인 | 그대로. `hit`이면 아래 문·Bedrock을 건너뜀 — **안 셈** |
| **하루 셈 문** (새로 — `send` 바로 앞, 시도마다) | `daily_limit`(429) · `limit_reached` / `limit_zero`(상한 0) — `unavailable`(503) · `usage_store_read` / `usage_store_corrupt` / `usage_store_write` |
| Bedrock · 모델 출력 · 기억에 넣기 · 등급 표 | 그대로 |

로그 1줄에 두 필드를 더한다(요청마다 1줄은 그대로, 응답 쓰기 전):
```
{"evt":"appraise","outcome":"ok","reason":null,"ms":1834,"attempts":1,"inputTokens":1520,"outputTokens":31,"grade":3,"memo":"miss","day":"2026-11-08","dayUsed":17}
{"evt":"appraise","outcome":"daily_limit","reason":"limit_reached","ms":1012,"attempts":2,"inputTokens":null,"outputTokens":null,"grade":null,"memo":"miss","day":"2026-11-08","dayUsed":300}
{"evt":"appraise","outcome":"ok","reason":null,"ms":2,"attempts":0,"inputTokens":null,"outputTokens":null,"grade":3,"memo":"hit","day":null,"dayUsed":null}
```
| 필드 | 뜻 |
|---|---|
| `day` | 이 요청이 하루 셈 문을 지났을 때 그 셈의 날짜(서울, `YYYY-MM-DD`). 문까지 안 왔거나(`invalid_input` · `hit`) 상한 0 · 셈 저장소 실패면 `null` |
| `dayUsed` | 그 문을 마지막으로 지난 뒤 그날 셈 — 성공한 `take`면 올린 뒤 값, 막혔으면 파일에 있던 값. `null`은 `day`와 같다. **그날 마지막 줄의 `dayUsed` = 그날 쓴 Bedrock 호출 수**(AC-8) |
| `attempts` | 그대로 — 이 요청에서 **실제로 보낸** `send` 수. 문이 막은 시도는 안 들어간다 |

- `daily_limit` 줄도 앞서 실패한 시도의 오류 이름(예: Throttling)은 남기지 않는다 — `reason`은 하나뿐이고, 왜 끝났는지(상한)가 더 중요하다. 필요하면 `attempts > 0`인 `daily_limit` 줄이 '재시도 도중 막힘'이다(일부러 건너뜀).
- 셈 파일 경로 · 파일 내용 · 오류 메시지는 로그에 넣지 않는다(오류는 `reason` 이름만, CAREER-25 그대로).

## A1 답: 셈 저장소 (ADR-0004)
| 무엇 | 정한 것 | 왜 |
|---|---|---|
| 자리 | `api/var/usage.json` (`USAGE_FILE`, config.js — `api/` 패키지 기준 상대 경로를 절대 경로로). `api/.gitignore`에 `var/` | 눈에 보이는 곳 · 저장소 밖 컴퓨터 전역 상태를 만들지 않음 · 세션이 쓰는 곳이 worktree 안. worktree마다 따로 센다(로컬뿐인 지금은 괜찮음 — spec 가정 2) |
| 모양 | `{"day":"2026-11-08","used":17}` + 줄바꿈. **키 정확히 둘**, `day`는 `/^\d{4}-\d{2}-\d{2}$/`, `used`는 0 이상 안전 정수 | 날짜와 셈만(U4). 다른 모양은 모두 '깨짐' — 고쳐 읽지 않는다 |
| 읽는 때 | `take()`마다(요청 시작이 아니라 **send 바로 앞마다**). 메모리에 셈을 들고 있지 않다 | 들고 있으면 '메모리와 파일이 어긋남'이 새로 생긴다. 같은 파일을 쓰는 다른 프로세스(시험 실행 D5)의 셈도 보인다. 파일은 50바이트라 읽기는 수십 µs |
| 쓰는 때 · 법 | 상한보다 작으면 `used + 1`을 **`writeFileSync(file + '.tmp', json, { flush: true })` → `renameSync(tmp, file)`** 하고 나서 돌아옴. 쓰기 전에 `mkdirSync(dirname(file), { recursive: true })`. 그 뒤에야 `send` | 이름 바꾸기는 같은 폴더 안에서 원자적 — 읽는 쪽은 옛 파일이나 새 파일만 본다(반쯤 쓴 파일 없음). `flush`(fsync)는 전원이 나가도 빈 파일이 남지 않게. 쓰기를 마친 뒤 보내므로 보낸 뒤 죽어도 셈이 남는다 |
| 동시 요청 | 읽기 → 비교 → 쓰기 → 이름 바꾸기를 **모두 동기 함수로, 사이에 `await` 없이**. `take()`는 Promise를 돌려주지 않는다 | Node는 한 스레드라 동기 구간 사이에 다른 요청이 끼지 못한다 → 잠금이 필요 없다. 이벤트 루프를 막는 시간은 쓰기 1번(≈ 1ms)이고 하루 최대 `DAILY_CALL_LIMIT`번 |
| 날짜가 바뀔 때 | 따로 비우지 않는다. 읽은 `day`가 오늘보다 **앞**이면 `used`를 0으로 보고 오늘 날짜로 쓴다. 오늘과 같거나 **뒤**(시계가 뒤로 감)면 그 파일의 날짜·셈을 그대로 쓴다 | 타이머·자정 작업이 없다. 시계가 자정을 넘어 뒤로 가도 상한이 새로 생기지 않는다(막는 쪽) |
| '오늘' | `dayOf(now())` = `new Date(ms + DAY_UTC_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10)` | U3 서울 00:00. 서머타임 없음(D3) |
| 파일이 없음(`ENOENT`) | 0에서 시작 — 첫 실행 | 첫 실행과 '누가 지움'을 가를 수 없다. 지우려면 서버 컴퓨터에 들어와야 하므로 받아들임(아래 실패 시나리오 4) |
| 못 읽음 · 깨짐 · 못 씀 | `UsageStoreError('usage_store_read' / 'usage_store_corrupt' / 'usage_store_write')` → 503 `unavailable`, 그 시도는 보내지 않음 | U10. 0으로 보고 통과시키지 않는다(reference §2) |
| 상한 0 | 파일을 열지도 만들지도 않고 `DailyLimitError('limit_zero')` | 급히 막는 스위치가 디스크 상태와 상관없이 늘 '퇴근'으로 듣는다(AC-5) |
| 서버를 만들 때 | `createDailyLimit`은 **`limit`만 검사**(0 이상 정수 아니면 `TypeError` — `MEMO_MAX_ENTRIES` 규칙). 파일은 건드리지 않는다 | AC-5 '잘못된 값이면 뜨지 않음' + AC-7 (b) '깨진 저장소로 서버를 **만들어** 부르면 `unavailable`'을 둘 다 지킨다 |
| 테스트에서 바꿔 끼우기 | `createDailyLimit({ file: <mkdtemp 안>, limit: 3, now: () => t })` → `createServer({ …, dailyLimit })`. 시계는 `let t = Date.parse('2026-11-08T23:59:59.999+09:00')`를 바꿔 옮긴다. 파일은 테스트가 직접 읽고(`read()`) 깨뜨린다(`writeFileSync(file, '{')`, 폴더로 바꾸기 등) | `vi.useFakeTimers()`를 쓰지 않는다 — HTTP 서버·재시도 대기와 섞이면 흔들린다. `now`만 바꾸면 날짜만 움직인다 |

`take()`의 약속
```
take() → { day, used }          // 셈을 1 올려 파일에 다 쓴 뒤. used = 올린 뒤 값
throws DailyLimitError { reason: 'limit_reached' | 'limit_zero', day, used }   // limit_zero면 day·used null
throws UsageStoreError { reason: 'usage_store_read' | 'usage_store_corrupt' | 'usage_store_write' }
```
`used >= limit`이면 막는다(상한을 300 → 100으로 내리고 다시 켜도 그날 이미 쓴 200으로 바로 막힘).

## A2 답: 설정 → D3
`DAILY_CALL_LIMIT` · `DAY_UTC_OFFSET_HOURS` · `USAGE_FILE` 셋 다 `api/src/config.js` 한 곳. `daily-limit.js`·`server.js`는 이름으로 읽기만 한다 — 테스트(AC-5)가 `grep -rnE "DAILY_CALL_LIMIT\s*=" api/src`의 결과가 config.js 한 줄인지 본다.

## A3 답: 로그 필드와 contracts 고칠 곳
- 로그: 위 '요청 한 건의 흐름' — `day` · `dayUsed`, `reason` 다섯 이름. 원본은 이 plan(CAREER-25와 같은 이유 — 읽는 쪽이 `api/` 안뿐).
- contracts/appraise-http.md: §5 `daily_limit` 줄 '나오나' → 나옴, `unavailable` 줄 '언제'에 셈 저장소 실패, §5 아래 '하루 상한' 규칙 6줄, §8 세 줄. 응답 모양·상태·헤더는 그대로(429는 처음부터 약속에 있었다).
- contracts/appraise.md: §5 `daily_limit` 줄의 문구 · '화면 처리' 문단의 `daily_limit` 부분.
- `Retry-After` 헤더를 붙이지 않는다 — spec AC-1이 '헤더는 §5 공통 헤더 그대로'이고, 화면은 헤더를 읽지 않는다.

## A4 답: AC-3을 흔들리지 않게 확인하는 법
1. **구조로**: 단위 테스트가 `take()`의 돌려준 값이 Promise가 아님(`expect(r).not.toBeInstanceOf(Promise)`, `typeof r.then === 'undefined'`)을 본다 — '읽기와 쓰기 사이에 끼어들 틈이 없다'를 모양으로 고정한다. 누가 `fs.promises`로 바꾸면 여기서 빨강.
2. **HTTP로**: 상한 2, 가짜 `send`가 부를 때마다 `new Promise((r) => held.push(r))`를 돌려준다(붙잡기). 서로 다른 사진 10장(`makeJpeg({ width: 100 + i })`)을 `Promise.allSettled`로 한꺼번에 보낸다.
   - `await vi.waitFor(() => expect(settled).toBe(8))` — 붙잡힌 2건 말고 8건이 먼저 `429 daily_limit`으로 돌아온다(잠자기·시간 재기 없음, 조건을 기다림)
   - 이때 `send` 호출 수가 **정확히 2** · 파일 `used` 2
   - `held.forEach((r) => r(converseReply('{"grade":3,"line":"흠"}')))` → 10건 모두 끝남 → 200이 2, 429가 8, `send` 2
   - 잘못 만든 비동기 구현(읽고 `await` 뒤 씀)은 10건이 모두 `used 0`을 읽어 `send`가 10번 불린다 → 빨강. 테스트가 그 실수를 실제로 가른다.
3. 기억은 끈다(`createMemo({ maxEntries: 0 })`) — 서로 다른 사진이라 상관없지만 섞임을 없앤다.

## 화면 (AC-9) — `daily_limit` → 퇴근
| 무엇 | 정한 것 |
|---|---|
| 상태 | `MASCOT`에 `off: '🚶 퇴근'`을 더한다(상태 셋: 갸웃·도장·퇴근 + 대기 — spec '상태 4번째 추가 안 함'은 아저씨 상태 이야기이고 '대기'는 이미 있다) |
| 문구 자리 | **아저씨 칸(`role="status"` `aria-label="감정사 아저씨"`) 안에** `<p data-testid="off-duty">{OFF_DUTY_TEXT}</p>`. 늘 있는 live region 안에서 글자가 바뀌므로 화면 읽기 도구가 '퇴근'과 문구를 함께 읽는다. 따로 `role="alert"`를 새로 만들면 '오류'처럼 끼어들고 status가 둘이 된다 |
| 실패 문구 | `daily_limit`이면 `error`를 `null`로 둔다 → `appraise-error` 없음 |
| 다시 누르기 | 버튼은 `status`가 `idle` 또는 `off`이고 사진·마음 가격이 있으면 켜진다. 누르면 `thinking`(갸웃) — 퇴근 문구는 `thinking`이 되면서 사라진다 |
| 다른 사진 고르기 | 퇴근은 그대로(아저씨는 여전히 퇴근 — 서버 상한은 사진과 상관없다). 실패 문구만 지운다(CAREER-26 그대로) |
| 그 밖의 코드 | `invalid_input` · `unavailable` · `refused` · 모르는 코드: 지금(CAREER-26) 그대로 |
| 브라우저 셈 | 없다(spec '안 할 것' · U8 (c)) |

## e2e (AC-10) — 진짜 서버를 부르지 않는 법
- `e2e/daily-limit.spec.js` 한 파일. `page.route((url) => url.pathname === '/api/appraise', …)` 를 `goto` **전에** 건다 — 요청이 Vite 프록시까지 가지 않는다.
  - 첫 요청: `fulfill({ status: 429, contentType: 'application/json; charset=utf-8', body: '{"code":"daily_limit"}' })`
  - 두 번째 요청: 테스트가 쥔 Promise(`release`)를 기다렸다가 성공 `200 {"mochi":10,"line":"흠, 손때가 제법 묻었구먼"}` — 그 사이에 '갸웃'을 본다(잠자기 없음)
- 그래도 놓친 요청은 이미 있는 `globalSetup: './guard-8787.js'`가 8787을 먼저 잡아 받는다 → 끝날 때 1개라도 있으면 실행 실패, 출력 `[guard-8787] 받은 요청 0개`가 AC-10의 증거. **e2e 설정·가짜 서버는 고치지 않는다.**
- 서버(`api/`)의 진짜 429 모양은 api 테스트(AC-1)가 보고, 화면은 그 모양을 흉내 낸 가로채기로 본다 — 둘 다 contracts §5 한 줄(`429` `{"code":"daily_limit"}`)에 묶인다.

## 신뢰 경계 (`strict_review_areas: guard`)
`들어온 곳 → 해석 → 검증 → 실제 동작` — CAREER-25 plan '신뢰 경계' 1~6은 그대로이고 하나를 더한다.
7. (새로) 하루 셈 파일(서버 컴퓨터 디스크) → `JSON.parse` → 키 둘·날짜 모양·안전 정수 검사(아니면 `usage_store_corrupt`) → **Bedrock 호출을 허락할지 결정**. 브라우저는 이 파일에 아무것도 넣지 못한다(요청에서 오는 값은 셈에 들어가지 않고, 쓰는 값은 `day`·`used` 숫자뿐). 파일을 고칠 수 있는 것은 서버 컴퓨터에 들어온 사람뿐이다.

**실제 동작: Bedrock 호출 (유일한 과금 동작) — CAREER-25 표에서 바뀐 줄**
| 항목 | 값 |
|---|---|
| 누가 허락하나 | 여전히 인증 없음 · `127.0.0.1`(결정 B). **더해서 하루 셈 문이 시도마다 허락한다** — 오늘 셈 < `DAILY_CALL_LIMIT`이고, 그 1을 파일에 다 쓴 뒤에만 |
| 바로 앞의 검증 | 경계 1·2 · 기억에 없음(경계 6) · **하루 셈 문(경계 7)** |
| 호출 수 최대 | 요청 1건에 3 · **하루 `DAILY_CALL_LIMIT`(300)** — 재시도 포함, 동시 요청 포함 |
| 남는 증거 | 로그 1줄에 `day` · `dayUsed` 더함. 셈 파일 자체(그날 셈) |
| 중간에 끊기면 | `take()`가 쓰기 전에 죽음 → 셈도 안 올랐고 보내지도 않음. 쓴 뒤 보내기 전에 죽음 → 1이 남는다(덜 쓰는 쪽). 보낸 뒤 죽음 → 셈이 이미 있다. 임시 파일만 쓰고 이름 바꾸기 전에 죽음 → 옛 파일 그대로, 보내지 않음. 남은 `usage.json.tmp`는 다음 쓰기가 덮는다 |
| 되돌리는 길 | 셈이 깨져 `unavailable`이 계속되면: 사람이 `api/var/usage.json`을 보고 고치거나 지운다(지우면 그날 셈이 0 — 그날 최대 2배까지 쓸 수 있음을 알고). 급히 막기: `DAILY_CALL_LIMIT = 0` 뒤 다시 켜기 |

## 실패 시나리오 (premortem) — 각각 막는 곳
1. **api 테스트가 진짜 셈 파일을 올림** → 사용자의 dev 서버가 이유 없이 퇴근, 테스트도 300번째부터 흔들림. → `createServer`가 `dailyLimit`을 꼭 받는다(D4), 테스트는 `tempDailyLimit()`. G2 검사가 테스트 뒤 `api/var`가 없는지 본다
2. **상한을 거치지 않는 진짜 호출 길** (시험 실행 · 새 진입점) → 기본값 없음(D4) + 시험 실행도 진짜 셈(D5). `beforeAttempt`가 `callWithRetry` 안 `send` 바로 앞이라 `send`를 부르는 다른 자리가 생기면 리뷰에서 보인다 — `grep -n "send(" api/src`가 `bedrock.js` 한 곳
3. **동시 요청이 셈을 같이 읽어 상한을 넘김** → 동기 `take()` + A4 테스트 둘
4. **셈 파일이 지워지거나 경로가 바뀌어 0이 됨**(worktree 지움 · 배포가 폴더를 바꿈) → 로컬은 받아들임. 배포에서는 이게 '재시작마다 상한 새로'와 같은 구멍이라 **배포 스토리에서 자리를 다시 정한다**(ADR-0004 위험). 로그 `dayUsed`가 갑자기 작아지면 보인다
5. **반쯤 쓴 파일 · 전원 끊김 뒤 빈 파일** → 임시 파일 + `flush` + 이름 바꾸기. 그래도 깨지면 `usage_store_corrupt` → `unavailable`(막는 쪽, 운영자가 로그로 앎). 폴더 fsync는 건너뜀(일부러 — 전원 끊김에 이름 바꾸기가 사라지면 옛 셈으로 돌아가 최대 몇 건 덜 셈, 받아들임)
6. **시계가 자정을 넘어 뒤로 감 / 앞으로 튐** → 뒤: 파일 날짜가 더 늦으면 그대로 씀(새 상한 안 생김). 앞: 그날이 새로 시작됨 — 시계가 틀린 컴퓨터는 막을 수 없다(건너뜀, 일부러)
7. **재시도 대기 중 시간 제한 · 브라우저 끊김** → 문은 `send` 바로 앞이라 대기 중 끝나면 세지도 보내지도 않는다(셈 = 보낸 수, 로그와 맞음)
8. **Throttling도 셈** → 청구되지 않는 시도를 셈 — 덜 쓰는 쪽으로 틀림(spec U1에서 받아들임)
9. **상한 뒤 홍수(파일 읽기·본문 읽기)** → 막힌 요청도 본문(≤ 1MB)·JPEG 검사·파일 읽기를 한다. 돈은 0, CPU·대역폭만 — 사람별 요청 수 제한(U7)이 배포에서 막는다. '닫힌 날을 메모리에 기억해 파일 읽기를 건너뛰기'는 본문 읽기에 비해 작은 이득이라 **넣지 않음**(일부러)
10. **화면이 퇴근 뒤 버튼을 꺼 버림 / 퇴근을 오류처럼 보임** → AC-9 테스트: 버튼 켜짐 · `appraise-error` 없음 · 다시 누르면 갸웃
11. **e2e가 8787로 새어 과금** → 가로채기를 `goto` 전에 + 이미 있는 guard-8787
12. **두 프로세스가 같은 파일**(dev 서버 + 시험 실행) → 매번 파일에서 읽어 서로의 셈을 본다. 두 동기 구간이 정확히 겹칠 때만 1건 놓칠 수 있다 — 잠금 파일은 죽으면 남아 영영 막으므로 넣지 않음(가정 2: 서버는 하나)
13. **`photo-upload.test.js`의 '임시 폴더가 비었나'(CAREER-26 AC-11 (a))가 셈 파일 때문에 깨짐** — 그 테스트는 `TMPDIR`을 자기 폴더로 바꾼다. → 그 파일에서는 `tempDailyLimit()`을 **`TMPDIR`을 바꾸기 전에** 만든다(G1에 적음). 그리고 CAREER-26 A1의 정적 확인('`api/src`에 `node:fs` 0')은 이제 `daily-limit.js` 한 파일로 바뀐다 — 그 파일은 사진을 받지 않는다(PR '결정' 칸에 적음)

## 고른 이유와 버린 대안 (나머지 — 셈 저장소는 ADR-0004)
| 결정 | 고른 것 | 버린 것 · 왜 아님 |
|---|---|---|
| 문 자리 | `callWithRetry` 안 `send` 바로 앞(`beforeAttempt`) | 요청 시작에서 1번 셈: 재시도가 새어 상한이 비용 상한이 아님(U1) / 시작할 때 3만큼 남았나 봄: 상한 근처 2건을 못 씀(U6 버린 후보) / 재시도 대기 **전에** 다음 시도를 셈: 대기 중 시간 제한이면 보내지 않은 1이 남아 셈과 로그 `attempts` 합이 어긋남 |
| 막힘을 알리는 법 | `take()`가 `DailyLimitError`를 던짐 → `callWithRetry`가 `attempts`를 붙여 올림 → `toReply`에서 429 | `take()`가 `false`를 돌려줌: `callWithRetry`가 상한을 알아야 해서 Bedrock 모듈에 비용 개념이 섞임 |
| 상한 0 | 파일 안 봄, `limit_zero` | 파일을 읽고 비교: 디스크가 고장 나면 급히 막기가 `unavailable`로 바뀐다 |
| 화면 문구 자리 | 아저씨 status 칸 안 | 따로 `role="alert"`: 오류가 아닌데 끼어들어 읽힘 / 따로 `role="status"`: status 둘 — 이미 있는 테스트가 이름으로 찾아 깨지진 않지만 읽기 도구에서 두 곳이 됨 |
| AC-2 HTTP 테스트 시간 | 진짜 시계(대기 1초 + 2초) · 그 테스트만 `{ timeout: 10_000 }` | 가짜 시계: HTTP 소켓과 섞여 흔들림 / 테스트용 대기값 주입: 서버에 테스트만 쓰는 손잡이가 생김. 대기 자체의 정확성은 이미 `bedrock.test.js`(가짜 시계)가 본다 — 여기에 `beforeAttempt` 단위 테스트도 가짜 시계로 더한다 |

## 범위 밖 (spec '안 할 것' 그대로, 더할 것 없음)
- 사람별 요청 수 제한(U7) · 자격 증명 시작 점검(U9) · 배포 · 셈 파일의 배포 자리 → 배포 스토리. Jira에 한 줄 더하는 일은 사용자 몫(spec U7).

[CAREER-29](https://culonculon98.atlassian.net/browse/CAREER-29) · spec: [spec.md](spec.md) · plan: [plan.md](plan.md) · 약속: [contracts/appraise-http.md](../../contracts/appraise-http.md) §1·§9 · [contracts/appraise.md](../../contracts/appraise.md) §5 (고치지 않음)

상태: 승인됨 (2026-10-23 — 사용자: plan P1~P4 추천안대로)

- 브랜치: `CAREER-29-connect-screen` 하나. 순서: **U1 → T1 → T2 → T3 → H1 → P1** (모두 차례로 — [P] 없음: T2는 T1의 테스트를, T3은 T2의 화면을, H1은 T3의 초록을 기다린다)
- **U1 전에는 아무것도 만들지 않는다**(CLAUDE.md §4). P1에서 b·c를 고르면 U1·T1·T3의 표시된 줄이 바뀐다.
- 모든 명령은 **저장소 루트**에서. `cd`가 들어간 명령은 `bash -c '…'`로. 세션 보고에는 출력 그대로, PR '검사 결과' 칸에는 CI 링크만.
- 이름·값의 원본: plan '이름과 값'. 문구 원본: contracts/appraise.md §5.
- **진짜 감정 서버(`api/`)는 H1에서 사용자만 띄운다.** 세션은 `npm --prefix api start`를 돌리지 않는다(AWS 자격 증명 — CLAUDE.md §6).

---

## U1 — plan 승인 · e2e 설정 한 줄 · 순서 1
- 담당: **사용자**
- 파일: `specs/CAREER-29-connect-screen/plan.md` · `tasks.md`(상태 줄) · `e2e/playwright.config.js`(P1 a일 때 한 줄 — config-protection 훅이 역할을 막아 사용자 몫)
- AC: 만들기 시작 조건 · AC-5의 바탕
- 단계
  1. plan P1~P4를 고른다. 추천과 다르면 architect에게 알려 plan·tasks를 고치게 한다.
  2. (P1 a) `e2e/playwright.config.js`의 `retries: 0,` 다음 줄에 `globalSetup: './guard-8787.js',`를 넣는다. 파일은 T1이 만든다 — **그 전까지 e2e는 '모듈 없음'으로 실패하는 것이 정상**.
     (P1 b) 대신 `pipeline.config.json` `checks.app.e2e`의 마지막 `npx playwright test`를 `node guard-8787.js npx playwright test`로. (P1 c) 이 단계 없음.
  3. plan·tasks 상태 줄 → `승인됨 (2026-MM-DD …)`.
  4. 커밋: `CAREER-29: connect screen plan and e2e port guard hook-up`
- 검사 명령: `grep -m1 -H '상태' specs/CAREER-29-connect-screen/plan.md specs/CAREER-29-connect-screen/tasks.md; grep -n 'globalSetup' e2e/playwright.config.js; git diff --stat HEAD~1 -- api infra contracts app`
- 끝난 상태: 두 줄 '승인됨' · (a) `globalSetup: './guard-8787.js',` 한 줄 · 마지막 명령 빈 줄.

## T1 — 가짜 서버와 테스트 (빨강) · 순서 2
- 담당: test-writer
- 파일: `e2e/guard-8787.js`(새로) · `e2e/connect-screen.spec.js`(새로) · `app/tests/connect.test.jsx`(새로). 기존 테스트 파일·설정은 고치지 않는다.
- AC: AC-2 · AC-3(자동 부분) · AC-4(`app/src`) · AC-5의 도구
- `e2e/guard-8787.js` (ESM, 의존성 없음 — `node:http`·`node:child_process`·`node:url`만)
  - `export async function startGuard()` → `127.0.0.1:8787`에 `listen`. `EADDRINUSE`면 plan '이름과 값'의 '포트가 차 있으면' 메시지로 거부. 요청마다 `seen.push(\`${req.method} ${req.url}\`)`, 본문은 `req.resume()`으로 버리고 `503` `Content-Type: application/json; charset=utf-8` `{"code":"unavailable"}`. 돌려주는 것 `{ seen, close }`(`close`는 열린 연결까지 닫고 Promise).
  - `export default async function globalSetup()` → `startGuard()` → **teardown 함수를 돌려준다**: `close()` 뒤 `console.log('[guard-8787] 받은 요청 ' + seen.length + '개')`, 1개 이상이면 plan의 '진짜 서버 자리로 간 요청 N개: …'(목록 포함)로 `throw`.
  - 명령 감싸기: 이 파일이 직접 실행되면(`process.argv[1] === fileURLToPath(import.meta.url)`) `startGuard()` → `spawnSync(argv[2], argv.slice(3), { stdio: 'inherit' })` → `close()` → 같은 한 줄을 찍고, 명령 종료 코드가 0이 아니면 그것, 받은 요청이 있으면 1, 아니면 0으로 끝낸다. 포트가 차 있으면 메시지 + 종료 코드 3.
- `e2e/connect-screen.spec.js` — 사진은 `first-flow.spec.js`의 1×1 PNG를 같은 꼴로 이 파일 안에 둔다(파일 공유하지 않음). 테스트 이름에 `CAREER-29 AC-n`.
  - AC-2: `goto('/')` → `getByText(REGION, { exact: true })` 보임 · `getByRole('button', { name: '감정 받기' })`가 `toHaveAccessibleDescription(REGION)` · `page.locator('#region-notice + button')`의 글자 `감정 받기` → 사진 고름 + `🍡 10개` → 누르기 **전에** 위 셋을 다시. `REGION`은 contracts/appraise.md §5 문구를 그대로 적은 상수.
  - AC-3: `page.route((url) => url.pathname === '/api/appraise', …)` — 첫 요청 `fulfill({ status: 500, contentType: 'text/plain', body: '' })`, 그다음 plan의 성공 응답. 사진 + `🍡 10개` → 누름 → `getByTestId('appraise-error')` 글자 = §5 `unavailable` 문구 그대로 · 아저씨(`role=status` '감정사 아저씨') `대기` · '감정 받기' 활성 → 다시 누름 → `region` '감정 결과' 보임 · `appraised-price` `/^모찌 (1|3|10|30|100)개$/` · `my-price` `모찌 10개` · 가로챈 요청 합 2개.
  - `waitForTimeout`·`test.only` 금지.
- `app/tests/connect.test.jsx` (`// @vitest-environment jsdom`, `FirstFlow.test.jsx`처럼 `vi.mock('../src/appraise.js')`)
  - AC-2: 그리자마자 `screen.getByText(REGION)` 있음 · `감정 받기` 버튼의 `aria-describedby` → `document.getElementById(그 값).textContent === REGION` · 버튼의 `previousElementSibling`이 그 요소 → 사진·가격을 고른 뒤 같은 확인.
  - AC-2(원본): `readFileSync(new URL('../../contracts/appraise.md', import.meta.url), 'utf8')`에서 `리전 안내`로 시작하는 줄의 큰따옴표 안 글자 === `REGION` === 화면 글자.
  - AC-4: `app/src`의 모든 `.js`·`.jsx`를 읽어 `/8787|127\.0\.0\.1|VITE_|import\.meta\.env/`가 0번(파일 이름과 줄을 `expect`에 보이게).
- 단계
  1. `guard-8787.js`를 쓰고 스스로 확인(아래 검사 명령 ①): 빈 명령은 0 · 8787로 한 번 부르면 1 · 포트가 차 있으면 3.
  2. (P1 a) 끝맺음 확인 — **커밋하지 않는** 임시 파일 `e2e/tmp-guard-miss.spec.js`: 테스트 하나가 Node에서 `await fetch('http://127.0.0.1:8787/miss').catch(() => {})` 하고 통과한다 → 검사 명령 ② → **종료 코드 0이 아니고** 출력에 `진짜 서버 자리로 간 요청 1개` → 임시 파일을 지운다. 종료 코드가 0이면(teardown 오류가 결과에 안 남음) 멈추고 보고한다(plan 실패 시나리오 2 → P1 b로).
  3. 두 테스트 파일을 쓴다.
  4. 검사 명령 ③ → lint 통과 · 단위·e2e **실패**. 실패 이유가 '리전 안내 없음'(AC-2)뿐이어야 한다. **AC-3·AC-4 테스트는 지금도 통과가 정상**(연결 뒤에도 그대로인지 보는 테스트). e2e 출력에 `[guard-8787] 받은 요청 0개`.
  5. 커밋: `CAREER-29: port guard and connect screen tests`
- 검사 명령
  ```
  ① node e2e/guard-8787.js true; echo "exit=$?"; node e2e/guard-8787.js node -e "fetch('http://127.0.0.1:8787/x').catch(()=>{})"; echo "exit=$?"; node -e "require('http').createServer().listen(8787,'127.0.0.1',()=>setTimeout(()=>process.exit(),3000))" & sleep 1; node e2e/guard-8787.js true; echo "exit=$?"; wait
  ② bash -c 'cd e2e && npx playwright test tmp-guard-miss'; echo "exit=$?"
  ③ npm --prefix app run lint && { npm --prefix app test; echo "exit=$?"; }; bash -c 'cd e2e && npm ci && npx playwright install chromium && npx playwright test --list && npx playwright test'; echo "exit=$?"; git status --porcelain e2e app
  ```
- 끝난 상태: ① `exit=0` · `exit=1`(받은 요청 1개) · `exit=3` / ② `exit` 0 아님 / ③ lint 0, test·e2e `exit` 0 아님(이유는 AC-2뿐), `--list`에 새 테스트 2개 + 기존 9개, `git status`에 `tmp-guard-miss`·`test-results` 없음.

## T2 — 프록시 · 리전 안내 (초록) · 순서 3
- 담당: frontend-dev
- 파일: `app/vite.config.js`(2줄) · `app/src/options.js`(`REGION_NOTICE` 한 줄) · `app/src/App.jsx`(안내 `<p>` + 버튼 `aria-describedby`)
- AC: AC-2 · AC-4 · AC-6(바꾼 곳만), AC-1·AC-3의 바탕
- 원본: plan '이름과 값' · contracts/appraise-http.md §1 · contracts/appraise.md §5
- 단계
  1. 훅 확인(U5 — plan 'U5 훅 확인'을 실제로): 검사 명령 ①. 둘 다 `exit=0`이 아니면 **쓰지 말고 멈춰** 출력을 보고한다(architect가 후보를 다시 낸다).
  2. `vite.config.js`: `defineConfig({ plugins: [react()], server: { proxy: { '/api/': 'http://127.0.0.1:8787' } }, preview: { proxy: {} } })`. **`plugins`는 그대로, `test:` 블록·`host`·`changeOrigin`을 넣지 않는다.**
  3. `options.js`: `export const REGION_NOTICE = '사진은 감정하는 동안 서울 밖 아시아 리전에서 처리될 수 있어요.'` (contracts §5 그대로, 주석 `// Source of truth: contracts/appraise.md §5`).
  4. `App.jsx`: '감정 받기' `<button>` **바로 앞**에 `<p id="region-notice">{REGION_NOTICE}</p>`(조건 없이), 버튼에 `aria-describedby="region-notice"`. `appraise.js`·`photo.js`는 고치지 않는다.
  5. 검사 명령 ② → 모두 통과. 실패하면 **테스트를 고치지 않고** 화면을 고친다. 테스트가 plan과 어긋나 보이면 멈추고 보고.
  6. 프록시 길 확인 — 검사 명령 ③ (진짜 서버 없이, 가짜 서버로): dev는 프록시를 **타고**(가짜 서버가 1개 받음 · `dev POST=503`), preview는 **안 탄다**(0개).
  7. 흔들림: `bash -c 'cd e2e && npx playwright test connect-screen --repeat-each=10'` → 20개 통과.
  8. 커밋: `CAREER-29: dev proxy and region notice`
- 검사 명령
  ```
  ① for h in block-outside-area.js\ frontend-dev vendor/ecc/config-protection.js; do echo '{"tool_input":{"file_path":"app/vite.config.js"},"cwd":"'"$PWD"'"}' | node .claude/hooks/$h >/dev/null; echo "$h exit=$?"; done
  ② for n in lint test e2e build api; do echo "== $n"; bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)" || exit 1; done; echo "dist hits: $(grep -rlE '8787|127\.0\.0\.1' app/dist | wc -l)"; echo "src 8787: $(grep -rn 8787 app/src | wc -l)"; git diff origin/main -- app/vite.config.js
  ③ for mode in dev preview; do node e2e/guard-8787.js bash -c "cd app && { if [ $mode = dev ]; then exec node_modules/.bin/vite --host 127.0.0.1 --port 5298 --strictPort; else exec node_modules/.bin/vite preview --host 127.0.0.1 --port 5298 --strictPort; fi; } >/dev/null 2>&1 & p=\$!; for i in \$(seq 40); do curl -s -o /dev/null http://127.0.0.1:5298/ && break; sleep 0.25; done; curl -s -o /dev/null -w '$mode POST=%{http_code}\n' -X POST -H 'Content-Type: image/jpeg' --data-binary x http://127.0.0.1:5298/api/appraise; kill \$p"; echo "$mode exit=$?"; done
  ```
- 끝난 상태: ① 둘 다 `exit=0` · ② 종료 코드 0, test·e2e 통과 수 0 아님(e2e `11 passed`), `dist hits: 0` · `src 8787: 0`, diff가 `server`·`preview` 두 줄 더함뿐 · ③ `dev POST=503` + `받은 요청 1개` + `dev exit=1`(가짜 서버가 받았으니 1이 정상), `preview POST=`(404 등 503 아님) + `받은 요청 0개` + `preview exit=0` · `git status`에 `dist`·`node_modules`·`test-results` 없음.

## T3 — 자동 테스트가 진짜 서버 자리를 안 부르는지 (AC-5) · 순서 4
- 담당: frontend-dev (T2와 같은 세션이어도 된다)
- 파일: `app/src/appraise.js` (단계 3에서 잠깐 바꿨다 되돌림 — 커밋하지 않음)
- AC: AC-5 · AC-6
- 단계
  1. 검사 명령 ① — 단위 테스트를 가짜 서버로 감싸 돌림 → `exit=0`, `받은 요청 0개`.
  2. 검사 명령 ② — e2e(P1 a: 설정의 가짜 서버가 띄워짐) → `exit=0`, `받은 요청 0개`. (P1 c면 `node e2e/guard-8787.js bash -c "$(jq -r '.checks.app.e2e' pipeline.config.json)"`로)
  3. 일부러 놓치기: `appraise.js`의 주소를 `` `/api/appraise/?${query}` ``(끝에 `/`)로 바꿔 e2e 가로채기(`pathname === '/api/appraise'`)를 빗나가게 한다 → 검사 명령 ② → `exit` 0 아님 · 출력에 `진짜 서버 자리로 간 요청` → `git restore app/src/appraise.js` → 검사 명령 ② 다시 `exit=0`.
  4. 출력 그대로 세션 보고에(PR '비용·남용 영향' 칸 재료).
- 검사 명령
  ```
  ① node e2e/guard-8787.js npm --prefix app test; echo "exit=$?"
  ② bash -c "$(jq -r '.checks.app.e2e' pipeline.config.json)"; echo "exit=$?"; git diff --stat app/src
  ```
- 끝난 상태: 1·2·3 끝 `exit=0` + `받은 요청 0개`, 3 중간 `exit` 0 아님, 마지막 `git diff --stat app/src` 빈 줄. 커밋 없음.

## H1 — 진짜 서버로 한 바퀴 (사람 확인 — AC-1 · AC-3 뒷부분) · 순서 5
- 담당: **사용자** (U1(a) — 자기 터미널, 자기 자격 증명)
- 파일: 없음 (결과는 PR '비용·남용 영향' 칸)
- AC: AC-1 · AC-2(눈으로) · AC-3(진짜 프록시 오류 + 서버 켠 뒤 다시 누르기)
- 단계 (plan P3 순서 — 감정 1건, Bedrock 최대 3번)
  1. 터미널 B: `npm --prefix app run dev` (`--host`를 붙이지 않는다 — plan 실패 시나리오 5). 8787에는 아무것도 띄우지 않은 채.
  2. 브라우저로 dev 주소 → 리전 안내가 '감정 받기' 바로 위에 보임(AC-2) → 물건 사진(jpg 또는 png) 1장 + 마음 가격 → 누르기 직전 안내 다시 봄 → 누름 → '갸웃'이 끝나 `대기` + "감정이 잘 안 됐어요. 잠시 뒤 '감정 받기'를 다시 눌러 주세요." (AC-3). 터미널 B에 Vite의 proxy 오류 줄이 보인다.
  3. 터미널 A: `AWS_PROFILE=<내 프로필> npm --prefix api start 2>&1 | tee /tmp/c29-api.log` → `{"evt":"listening",…"port":8787}`.
  4. **새로 고치지 않고 같은 화면에서** '감정 받기'를 다시 누름 → '갸웃' → '도장', 결과 카드에 `모찌 N개`(1·3·10·30·100 중 하나) · 고른 '내 값' · 30자 이하 대사(AC-1, AC-3 뒷부분).
  5. 터미널 A를 끈다(Ctrl-C) — **켜 둔 채 만들기 세션을 돌리지 않는다**(가짜 서버가 포트를 못 잡아 e2e가 실패한다 — plan 실패 시나리오 12).
  6. 검사 명령으로 로그를 센다 → PR '비용·남용 영향' 칸에 날짜 · 사진 종류 · `lines`·`ok`·`bedrock` 값을 적는다.
- 검사 명령: `jq -s '[.[] | select(.evt == "appraise")] | {lines: length, ok: (map(select(.outcome == "ok")) | length), bedrock: (map(.attempts) | add)}' /tmp/c29-api.log`
- 끝난 상태: `lines: 1` · `ok: 1` · `bedrock` 1~3 (U2의 5 이하). 결과 카드가 안 나오면 ✘ — 출력과 터미널 B 줄을 architect에게(프록시 열쇠·포트 문제일 수 있음, plan 실패 시나리오 10).

## P1 — PR과 CI · 순서 6
- 담당: frontend-dev(PR 열기) · reviewer · 사용자(H1 칸 채우기 · `vite.config.js` 줄 승인 · 머지)
- 파일: 없음 (PR 본문 — `.github/pull_request_template.md`)
- AC: 전부(대조표)
- 단계
  1. 제목 `CAREER-29: connect screen to local appraise server`.
  2. 칸
     - 결정: plan 'ADR' 줄의 다섯(프록시 열쇠 `'/api/'` · `preview.proxy` 끔 · 리전 안내 자리와 `aria-describedby` · `e2e/guard-8787.js`와 P1 선택 · AC-3 오류 모양 흉내). ADR 없음
     - 범위 변경: 없음 (P1 a의 `playwright.config.js` 한 줄은 사용자가 U1에서 넣음 — 그 커밋을 적는다)
     - 새 의존성: 없음
     - 비용·남용 영향: spec 그대로 + H1 결과(날짜 · jpg/png · `lines`·`ok`·`bedrock`) + T3 출력 요약(`받은 요청 0개` 둘) + "dev 서버를 `--host`로 열면 같은 네트워크에서 상한 없이 Bedrock — CAREER-27 전까지 하지 않음"
     - spec AC-1~6 ✔/✘ 대조. AC-1·AC-3 뒷부분은 H1, AC-5는 T3 출력, AC-6은 아래 diff
     - '검사 결과' 칸은 CI 링크만
  3. reviewer: `git diff --stat origin/main -- api infra contracts` 빈 줄 · `git diff origin/main -- app/vite.config.js`가 `server`·`preview` 두 줄뿐.
- 검사 명령: `gh pr checks --watch; git diff --stat origin/main -- api infra contracts; git diff origin/main -- app/vite.config.js`
- 끝난 상태: 필수 검사 모두 통과(CI `checks / app` 요약에 `통과: app.lint`·`app.test`·`app.e2e`·`app.build`·`app.api`) · 두 번째 명령 빈 줄 · 세 번째가 두 줄 더함뿐 · `reviewer/gate` 통과 · 사용자가 `vite.config.js` 줄을 승인.

---

## AC ↔ 작업
| AC | 테스트 | 통과시키는 곳 | 그 밖 |
|---|---|---|---|
| AC-1 | — | T2 (프록시) | H1 사람 확인 · T2 ③ 프록시 길(가짜 서버) |
| AC-2 | T1 단위(글자·원본·자리) · T1 e2e(보임·설명) | T2 | H1 눈으로 |
| AC-3 | T1 e2e(오류 모양 → 대기 → 다시 누름) | CAREER-26 그대로 | H1 진짜 프록시 오류 + 서버 켠 뒤 |
| AC-4 | T1 단위(`app/src`) | T2 | T2 ② `app/dist` grep |
| AC-5 | T1 가짜 서버 + 끝맺음 확인 | — | T3 ①② + 일부러 놓치기 |
| AC-6 | — | T2 | T2 ② · P1 diff |

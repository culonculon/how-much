[CAREER-24](https://culonculon98.atlassian.net/browse/CAREER-24) · spec: [spec.md](spec.md) · plan: [plan.md](plan.md)

상태: 승인됨 (2026-10-20)

- 브랜치: `CAREER-24-app-scaffold` 하나. 작업은 **차례로 T1 → T4 → T2 → T3 → T5** (번호가 아니라 이 순서). 각 작업이 앞 작업의 결과물을 쓰므로 [P](동시 진행) 작업은 없다.
- T4를 T2보다 먼저 하는 이유: `checks.app`이 채워져 있어야 frontend-dev 세션이 끝날 때 Stop 훅이 lint·test·build를 **실제로** 돌린다. TODO면 '건너뜀'으로 끝난다.
- 모든 명령은 **저장소 루트**에서 돌린다(CI와 같은 자리).
- 세션 보고에는 검사 출력을 **그대로** 붙인다.

---

## T1 — 첫 화면 테스트 쓰기 (빨강) · 순서 1
- 담당: test-writer
- 파일: `app/tests/App.test.jsx` (새로)
- AC: AC-3의 바탕
- 내용 (plan.md '테스트와 구현 사이의 약속'):
  ```jsx
  import { renderToString } from 'react-dom/server'
  import { expect, test } from 'vitest'
  import App from '../src/App.jsx'

  test('shows the app name', () => {
    expect(renderToString(<App />)).toContain('how-much')
  })
  ```
  - `vitest`에서 `test`·`expect`를 직접 import한다(전역 쓰지 않음 → ESLint 전역 설정이 필요 없다).
  - jsdom·Testing Library를 쓰지 않는다.
- 단계
  1. 위 파일을 쓴다.
  2. 아래 검사를 돌려 **실패**하는지 확인한다(아직 `app/package.json`이 없음 — 이게 지금의 빨강).
  3. 커밋: `CAREER-24: app name render test`
- 검사 명령: `test -f app/tests/App.test.jsx && npm --prefix app test; echo "exit=$?"`
- Stop 훅: 이때는 `checks.app`이 아직 TODO라서 훅의 app 검사는 **건너뜀**으로 끝난다. 정상이다 — 이 작업의 확인은 위 검사 명령으로 한다.
- 끝난 상태: 파일이 있고, 위 명령의 `exit`가 0이 아니다.

## T4 — `checks.app` 채우기 · 순서 2
- 담당: **사용자(앞 세션)** — 역할 쓰기 구역 밖(`pipeline.config.json`)
- 파일: `pipeline.config.json`의 `checks.app`
- AC: AC-2 (값 채우기. 종료 코드 0 확인은 앱이 생긴 뒤 T2에서)
- 단계
  1. plan.md의 제안 값으로 `lint`·`test`·`build`를 채운다. `e2e`는 `TODO` 그대로.
  2. 아래 검사 명령으로 세 값이 TODO가 아닌지 본다. 이 시점엔 앱이 없어서 명령을 **돌리면 실패하는 게 정상**이다 — 돌려 보지 않는다.
  3. 커밋: `CAREER-24: app check commands`
- 검사 명령: `jq -r '.checks.app | "lint: \(.lint)\ntest: \(.test)\nbuild: \(.build)\ne2e: \(.e2e)"' pipeline.config.json`
- 끝난 상태: lint·test·build 세 줄이 plan.md 값과 같고 TODO가 아니다. e2e만 TODO.

## T2 — 앱 뼈대 만들기 (초록) · 순서 3
- 담당: frontend-dev (단계 10만 **사용자**)
- 파일
  - 새로/남김: `app/package.json` · `app/package-lock.json` · `app/index.html` · `app/vite.config.js` · `app/eslint.config.js` · `app/.gitignore` · `app/src/main.jsx` · `app/src/App.jsx`
  - 지움: `app/public/` · `app/src/assets/` · `app/src/App.css` · `app/src/index.css` · `app/README.md`
- AC: AC-1 · AC-2(종료 코드 0) · AC-3(통과) · AC-4(a)(c) · AC-6
- 단계
  1. `node -v`를 적는다. 설치될 Vite가 요구하는 버전보다 낮으면 멈추고 보고한다.
  2. `npm create vite@latest app -- --template react` (자동 설치·rolldown 같은 질문이 나오면 '아니오'). T1 때문에 `app/`이 비어 있지 않다고 물으면 **'Ignore files and continue'**를 고른다 — 'Remove existing files'는 T1 테스트를 지운다(plan 실패 시나리오 10). 끝나면 `test -f app/tests/App.test.jsx`로 남아 있는지 본다.
  3. 위 '지움' 목록을 지운다. `main.jsx`에서 `index.css` import를, `App.jsx`에서 CSS·이미지 import를 뺀다.
  4. `App.jsx` → `export default function App() { return <h1>how-much</h1> }` 정도로.
  5. `index.html`의 파비콘 줄을 `<link rel="icon" href="data:,">`로 바꾸고, `<title>`을 `how-much`로.
  6. `npm --prefix app install -D vitest` — 템플릿 vite 메이저에 맞는 버전(peer 충돌이 나면 멈추고 보고).
  7. `app/package.json` 스크립트 `test`를 `vitest run`으로 더한다. `lint`(`eslint .`) · `build`(`vite build`)는 템플릿 그대로. `--passWithNoTests`는 쓰지 않는다.
  8. `eslint.config.js`·`vite.config.js`는 템플릿에서 **고치지 않는다**(만든 뒤에는 훅이 막는다).
  9. 아래 검사 명령을 돌린다.
  10. **AC-1 — 담당: 사용자.** 에이전트는 `npm --prefix app run dev`를 백그라운드로 켜고 **주소만** 보고한다(예: `http://localhost:5173/`). 사용자가 브라우저로 열어 "how-much"가 보이고 콘솔에 에러가 없는지 확인한다(e2e는 CAREER-22). 확인이 끝나면 dev 서버를 끈다.
  11. **AC-4(a)** `app/src/App.jsx`에 `const unusedValue = 1`(**소문자 이름**, plan 실패 시나리오 3) → `npm --prefix app run lint; echo "exit=$?"` → 0이 아님을 확인 → 되돌린다.
  12. **AC-4(c)** `app/src/App.jsx`에 문법 오류(예: 닫는 괄호 하나 지우기) → `npm --prefix app run build; echo "exit=$?"` → 0이 아님을 확인 → 되돌린다. 떨어진 새 파일에 넣지 않는다(plan 실패 시나리오 5).
  13. 11·12를 되돌린 뒤 검사 명령을 다시 돌리고, `git diff app/src`가 의도한 변경만 보여 주는지 본다. 되돌리지 않고 세션을 끝내면 Stop 훅이 실패로 잡는다.
  14. 커밋: `CAREER-24: vite react app scaffold`
- 검사 명령 (T4의 값을 CI처럼 루트에서 `bash -c`로 돌린 뒤, 결과물이 무시되는지 본다)
  ```
  for n in lint test build lint; do bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)" || exit 1; done \
    && git check-ignore -q app/node_modules app/dist && echo "ignored: ok" \
    && git status --porcelain app
  ```
  (lint를 build 뒤에 한 번 더 돌리는 건 `dist`를 검사하지 않는지 보려는 것 — plan 실패 시나리오 6)
- Stop 훅: T4 덕분에 세션을 끝낼 때 lint·test·build가 실제로 돈다.
- 끝난 상태: 검사 명령의 종료 코드가 0이고, test 출력에 `1 passed`가 있고, `git status`에 `node_modules`·`dist`가 없고, 11·12의 `exit`가 0이 아니고, 사용자가 단계 10을 확인했다.

## T3 — 테스트가 실패를 잡는지 확인 · 순서 4
- 담당: test-writer
- 파일: `app/tests/` (잠깐 넣었다 지우는 파일 하나 — 커밋하지 않음)
- AC: AC-3 · AC-4(b)
- 단계
  1. `npm --prefix app test`를 돌리고 출력에 통과 테스트 1개 이상이 있는지 본다(AC-3).
  2. `app/tests/fail.test.jsx`에 `test('always fails', () => { expect(1).toBe(2) })`(`vitest`에서 import) → `npm --prefix app test; echo "exit=$?"` → 0이 아님을 확인.
  3. 2의 파일을 지운다 → 1을 다시 돌려 통과하는지 본다. 지우지 않고 세션을 끝내면 Stop 훅이 실패로 잡는다.
- 검사 명령: `npm --prefix app test && git status --porcelain app/tests`
- 끝난 상태: 검사 명령의 종료 코드가 0, `git status`에 남은 파일 없음, 2의 `exit`가 0이 아니다. 커밋 없음(보고만).

## T5 — PR과 CI · 순서 5
- 담당: frontend-dev(PR 열기) · 사용자(머지)
- 파일: 없음(PR 본문 — `.github/pull_request_template.md` 틀)
- AC: AC-5 · AC-6(깨끗한 clone)
- 단계
  1. PR 제목 `CAREER-24: app scaffold with lint, test, build checks`.
  2. PR 칸: 결정(lint=템플릿 ESLint, 테스트=`renderToString`, lock 커밋·Node 고정 안 함) · 범위 변경 "없음" · 새 의존성(템플릿 의존성 + `vitest`, 버전 적기) · 비용·남용 영향 "없음". '검사 결과' 칸은 CI 링크만.
  3. CI `checks / app` 요약을 본다. `Cannot find module @rollup/rollup-linux-…`면 plan 실패 시나리오 7대로 lock을 다시 만든다.
- 검사 명령: `gh pr checks --watch` 뒤 CI `checks / app` 요약 확인
- 끝난 상태: 요약에 `통과: app.lint` · `통과: app.test` · `통과: app.build`가 있고, 이 셋 중 '건너뜀'은 없다(`app.e2e`는 '건너뜀'이 정상).

---

## AC ↔ 작업 (작업 순서대로)
| AC | 작업 |
|---|---|
| AC-1 | T2 단계 10 (사용자 확인) |
| AC-2 | T4 (값 채우기) → T2 검사 명령 (루트에서 종료 코드 0) |
| AC-3 | T1 (테스트) → T2 (통과) → T3 단계 1 (1개 이상 통과) |
| AC-4 (a)(c) / (b) | T2 단계 11·12 / T3 단계 2 |
| AC-5 | T5 |
| AC-6 | T2 검사 명령 · T5 (깨끗한 clone인 CI) |

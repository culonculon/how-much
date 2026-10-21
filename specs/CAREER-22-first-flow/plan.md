[CAREER-22](https://culonculon98.atlassian.net/browse/CAREER-22) · spec: [spec.md](spec.md) · 작업: [tasks.md](tasks.md) · 약속: [contracts/appraise.md](../../contracts/appraise.md)

상태: 승인됨 (2026-10-21)

## 접근 방법
화면 하나(`App.jsx`)에서 상태를 `idle → thinking → done` 순서로만 넘긴다. 감정은 `app/src/appraise.js`의 가짜 함수(800ms 뒤 늘 같은 값)가 맡는다. 단위 테스트는 jsdom과 Testing Library로 클릭을 확인하고, e2e는 `e2e/`의 독립 npm 패키지(Playwright)가 dev 서버를 직접 켜고 끝까지 한 번 돈다.

### 만들어지는 파일
| 파일 | 하는 일 | 담당 |
|---|---|---|
| `app/src/options.js` | 마음 가격 4개(id·버튼 글자·카드 글자), 태그 묶음 4개·태그 16개(id·이름) — contracts §2·§3 그대로 | frontend-dev |
| `app/src/appraise.js` | 가짜 감정 `appraise(input)` + `FAKE_DELAY_MS` — contracts §6 | frontend-dev |
| `app/src/App.jsx` | 첫 흐름 화면 전부(사진 · 마음 가격 · 태그 · 버튼 · 아저씨 자리 · 결과 카드). `<h1>how-much</h1>`는 남긴다(기존 테스트) | frontend-dev |
| `app/package.json` · `app/package-lock.json` | devDependencies에 `jsdom` · `@testing-library/react` · `@testing-library/dom` 추가 | frontend-dev |
| `app/tests/appraise.test.js` | AC-9 (모양 · 부르는 곳이 하나) | test-writer |
| `app/tests/FirstFlow.test.jsx` | AC-2 · 3 · 4 · 5 · 6 · 7(호출 1번) · 8 — jsdom | test-writer |
| `e2e/package.json` · `e2e/package-lock.json` | `@playwright/test` 하나, 스크립트 `test: playwright test`, `"type": "module"` | test-writer |
| `e2e/playwright.config.js` | 아래 '열린 질문 5' 값 그대로. **한 번에 맞게 쓴다** — 만든 뒤 고치기는 훅이 막는다 | test-writer |
| `e2e/first-flow.spec.js` | AC-1 · 3 · 4 · 5 · 6(a)(b) · 7 · 8 · 10을 한 흐름으로 지나는 테스트 1개 + AC-2 테스트 1개 | test-writer |
| `e2e/.gitignore` | `test-results/` · `playwright-report/` (`node_modules/`는 루트 `.gitignore`가 이미 막음) | test-writer |

`vite.config.js` · `eslint.config.js` · 기존 `app/tests/App.test.jsx`는 고치지 않는다.

### 테스트와 구현 사이의 약속 (앱 안 약속이라 contracts가 아니라 여기 적는다)
테스트는 아래 이름으로 요소를 찾는다. frontend-dev는 이 이름을 그대로 쓴다.

| 요소 | 모양 | 테스트가 찾는 법 |
|---|---|---|
| 사진 고르기 | `<label>사진 고르기 <input type="file" accept="image/png,image/jpeg"></label>` | `getByLabel(Text)('사진 고르기')` |
| 미리보기 | `<img alt="고른 사진 미리보기" src={blob URL}>` — `URL.createObjectURL`로 만들고, 바꿀 때 앞의 것을 `revokeObjectURL` | `getByRole('img', { name: '고른 사진 미리보기' })` |
| 잘못된 파일 안내 | `role="alert"`, 글자 `사진을 다시 골라 주세요 (jpg·png)` — `file.type`이 `image/jpeg`·`image/png`가 아니면 보이고, 고른 사진도 비운다 | `getByRole('alert')` 에 `다시 골라` |
| 마음 가격 | `role="group"` `aria-label="마음 가격"` 안에 `<button aria-pressed>` 4개. 글자는 contracts §2 '버튼 글자' 그대로 | 그룹 안 `getAllByRole('button')` · `{ name: '🍡 10개', exact: true }` |
| 사연 태그 | `role="group"` `aria-label="사연 태그"` 안에 묶음마다 `role="group"` `aria-label=<묶음 제목>` + 눈에 보이는 제목, 그 안에 `<button aria-pressed>` (글자 = 태그 이름) | 묶음 이름으로 그룹을 찾고 버튼 수 6·4·4·2 |
| 선택됨 표시 | `aria-pressed="true"` + 눈에 보이는 차이(테두리·배경 등, 색 하나만으로 구분하지 않음) | `aria-pressed` |
| 감정 받기 | `<button>감정 받기</button>`, `disabled` = 사진 없음 ∨ 마음 가격 없음 ∨ 상태가 `idle`이 아님 | `getByRole('button', { name: '감정 받기' })` |
| 아저씨 자리 | `role="status"` `aria-label="감정사 아저씨"`. 글자: `idle` → `대기`, `thinking` → `🔍 갸웃`, `done` → `🔨 도장` | 이름으로 찾고 `갸웃`/`도장` 글자 |
| 결과 카드 | `<section aria-label="감정 결과">` (`done`일 때만). 안에 `data-testid="appraised-price"` = `모찌 N개`, `data-testid="my-price"` = contracts §2 '카드 글자', `data-testid="mascot-line"` = `line` | 영역 이름 + testid |
| 자유 글 칸 | 없음. 태그도 체크박스가 아니라 버튼 | `textarea, input:not([type=file]), [contenteditable]:not([contenteditable=false])` 0개 |

- `appraise`는 **'감정 받기' 클릭 처리기 안에서만** 부른다. `useEffect`에서 부르지 않는다 — StrictMode가 개발 모드에서 effect를 두 번 돌려 호출이 2번이 된다(실패 시나리오 3).
- 넘기는 값: `{ photo, myPrice, tags }`, `tags`는 contracts 표 순서(누른 순서가 아님).

## 열린 질문 5 답: Playwright 설정·의존성 자리, dev 서버 켜는 쪽
**`e2e/`를 독립 npm 패키지로 둔다(전부 test-writer). dev 서버는 Playwright `webServer`가 켠다.**

`e2e/playwright.config.js` 값:
| 항목 | 값 | 이유 |
|---|---|---|
| `testDir` | `.` | |
| `projects` | chromium 하나 | 브라우저 설치를 가장 작게 |
| `webServer.command` | `npm --prefix ../app run dev -- --host 127.0.0.1 --port 5199 --strictPort` | 실행 위치는 설정 파일 폴더(`e2e/`) |
| `webServer.url` · `use.baseURL` | `http://127.0.0.1:5199` | `localhost`는 IPv4/IPv6가 엇갈릴 수 있어 숫자 주소로 고정 |
| `webServer.reuseExistingServer` | `false` | 5199에 다른 서버(다른 worktree 등)가 떠 있으면 **조용히 남의 앱을 검사하지 않고** 크게 실패한다 |
| `webServer.timeout` | `60_000` | |
| `retries` | `0` | 흔들림을 재시도로 가리지 않는다 |
| `forbidOnly` | `true` | `test.only`가 남아 테스트 일부만 도는 것을 막는다 |
| `reporter` | `list` | 출력 그대로 보고에 붙이기 쉽다 |
| `use.trace` | `retain-on-failure` | |

| 대안 | 왜 아님 |
|---|---|
| `@playwright/test`를 `app/`에 깔고 `app/playwright.config.js`에서 `testDir: '../e2e'` | `e2e/*.spec.js`의 `import '@playwright/test'`는 파일 위치에서 위로 올라가며 찾는다 → `app/node_modules`를 못 찾는다. 경로를 꼬아 넣어야 하고, 설정 파일 담당(frontend-dev)과 테스트 담당이 갈린다 |
| 루트 `package.json` (workspaces) | 루트는 어느 역할의 쓰기 구역도 아니라 사용자 몫이 되고, CI 설치 단계(`reusable-checks.yml`, 떼어 낼 구역)를 바꿔야 한다 |
| 사람이 dev 서버를 따로 켜 둠 | `checks.app.e2e` 하나로 끝나지 않는다(AC-11). CI에서 못 돈다 |

나쁜 점(받아들임): lock 파일이 둘(`app/`·`e2e/`)이 되고, `app`의 lint는 `e2e/`를 검사하지 않는다. `e2e/`에 lint를 거는 건 이번 범위 밖.

## 열린 질문 6 답: 가짜 감정의 시간·값
**800ms 기다린 뒤 늘 같은 값 `{ mochi: 3, line: '흠… 사연이 묻어 있구먼.' }`** (contracts §6).
- 값 고정: 입력과 상관없이 같다 → e2e·단위 테스트가 값을 따로 고정할 필요가 없다.
- 시간 고정
  - 단위 테스트: AC-7은 `vi.mock('../src/appraise.js')`로 직접 쥔 Promise를 돌려준다(시간과 상관없음). AC-9는 `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(FAKE_DELAY_MS)`.
  - e2e: '감정 받기' 클릭 → `🔍 갸웃` 확인 → `🔨 도장` 확인. 갸웃은 클릭과 같은 렌더에서 나오고 800ms 동안 남으므로 자동 기다림으로 넉넉히 잡힌다. `waitForTimeout`은 쓰지 않는다.
- 이 값은 되돌리기 쉽다(파일 하나의 상수). 흔들리면 `FAKE_DELAY_MS`만 키운다.

| 대안 | 왜 아님 |
|---|---|
| 무작위 값 | e2e 기대값이 흔들리고, 고정하려면 시드 주입 장치가 필요하다 |
| 마음 가격에 따라 다른 값 | 이를 요구하는 AC가 없다. 테스트할 표만 늘어난다 |
| 기다림을 환경변수(`VITE_*`)로 | 테스트용 설정 통로가 생기고, contracts에 환경변수가 늘어난다. 상수로 충분하다 |
| e2e에서 `page.clock`으로 시간 조종 | React 스케줄러·Vite 클라이언트 타이머까지 가짜가 되어 오히려 흔들릴 수 있다. 800ms 폭이면 필요 없다 |

## 열린 질문 7 답: 감정 함수 입력 모양과 실패
→ [contracts/appraise.md](../../contracts/appraise.md) §2 · §4 · §5.
- 입력 `{ photo: File, myPrice: 'one'|'ten'|'hundred'|'never', tags: string[] }`. 사진을 넘기는 이유: 진짜로 바꿔 끼울 때 화면 쪽을 고치지 않으려고. 가짜는 사진을 읽지 않는다.
- 마음 가격을 숫자(1·10·100)가 아니라 id로 둔 이유: '안 팔아'는 숫자가 아니고, 환율(붕어빵 등)을 바꿔도 id가 그대로 남는다.
- 태그는 이름이 아니라 id(`how-1` 등): 이름을 다듬어도 서버 허용 목록과 기록이 깨지지 않는다.
- 실패는 `Error` + `code`(`daily_limit` · `invalid_input` · `unavailable`)로 거부한다. 이번엔 화면 처리를 만들지 않는다(가짜는 실패하지 않음).

## 열린 질문 4: e2e를 CI `checks / app`에서도 돌릴까 — 선택지와 추천 (정하는 건 사용자·infra-dev)
**먼저 알아 둘 것:** CI(`reusable-checks.yml`)는 `checks.app`에서 `TODO`가 아닌 명령을 **전부** 돌린다. 그래서 `checks.app.e2e`를 채우는 순간 CI에서도 e2e가 돈다. 질문 4는 '돌릴까'보다는 **'채울 값을 무엇으로 할까'**를 묻는 질문이다. 값에 브라우저 설치가 빠져 있으면 `checks / app`(필수 검사)가 실패해 머지가 막힌다.

| 선택지 | `checks.app.e2e` 값 | 좋은 점 | 나쁜 점 |
|---|---|---|---|
| **A (추천)** CI에서도 돈다 — 설치를 명령에 넣음 | `cd e2e && npm ci && npx playwright install --with-deps chromium && npx playwright test` | CI 파일을 안 고친다. PR마다 흐름이 실제로 확인된다. 로컬과 CI가 같은 명령이다 | CI `checks / app`이 브라우저 받기만큼 느려진다(캐시 없음). 실제 시간은 첫 PR CI에서 본다. Stop 훅도 이 명령을 돌린다(로컬은 첫 설치 뒤 브라우저 단계가 거의 바로 끝난다) |
| B 로컬만 — 명령 안에서 CI를 건너뜀 | `if [ -n "$CI" ]; then echo 'e2e: CI에서 건너뜀'; else cd e2e && npm ci && npx playwright install chromium && npx playwright test; fi` | CI가 빠르다 | CI 요약에 '통과: app.e2e'로 찍혀 **안 돈 검사가 통과로 보인다**. PR이 흐름을 깨도 CI가 못 잡는다 |
| C 따로 CI 일 + 브라우저 캐시 | `pipeline.config.json`에 '로컬만' 목록 등을 더하고 `reusable-checks.yml`(떼어 낼 구역)을 고침 | 빠르고 정직하다 | infra-dev 작업 + 필수 검사 이름이 바뀔 수 있다. 이 스토리 범위 밖 |

- 추천 **A**. 이유: 파일을 하나도 더 고치지 않고, 막는 쪽으로 실패한다. 느려지면 그때 C를 따로 스토리로 낸다.
- A에서 확인할 것(tasks U2): `--with-deps`는 Linux에서 `sudo apt-get`으로 시스템 라이브러리를 깐다(GitHub 러너는 비밀번호 없는 sudo). macOS에서는 시스템 패키지를 깔지 않는 것으로 알고 있지만 **확인하지 않았다** — U2에서 실제로 돌려 본다. 로컬이 Linux면 sudo를 물을 수 있다.
- B를 고르면 spec AC-11은 그대로 충족된다(로컬 실행만 요구). 다만 위 '통과로 보임'을 PR '결정' 칸에 적는다.

## 고른 이유와 버린 대안 (나머지)
| 결정 | 고른 것 | 버린 것 · 왜 아님 |
|---|---|---|
| 단위 테스트 DOM | `jsdom` + `@testing-library/react`(+ peer `@testing-library/dom`) | `happy-dom`: 더 빠르지만 Testing Library 문서·예제가 jsdom 기준이다. `@testing-library/user-event`: 의존성 하나 더 — 클릭·파일 고르기만 있어 `fireEvent`로 충분하다 |
| jsdom 켜는 법 | 테스트 파일 맨 위 `// @vitest-environment jsdom` | `vite.config.js`에 `test.environment` 넣기: frontend-dev 파일을 고쳐야 해서 test-writer가 먼저 못 한다 |
| 화면 나누기 | `App.jsx` 하나 + 데이터(`options.js`) + 감정(`appraise.js`) | 버튼·태그·카드 컴포넌트 파일 여러 개: 화면 하나, 다시 쓰는 곳 없음. 커지면 그때 나눈다 |
| 미리보기 | `URL.createObjectURL` (blob URL) | `FileReader` data URL: 사진 전체를 문자열로 복사한다. blob URL은 브라우저 안 참조라 AC-10에도 맞다 |
| 파일 종류 확인 | `file.type`이 `image/jpeg`·`image/png`인지 + `accept` 속성 | `accept`만: 파일 창에서 '모든 파일'을 고르거나 Playwright `setInputFiles`면 그냥 들어온다(AC-2) |
| 결과 뒤 버튼 | `done`이면 '감정 받기' 계속 비활성 | 다시 감정하기는 spec '안 할 것' |

## 실패 시나리오 (premortem) — 각각 막는 곳
1. **e2e가 남의 dev 서버를 검사** (다른 worktree가 같은 포트 사용) → `reuseExistingServer: false` + `--strictPort` → 포트가 차 있으면 시작부터 실패한다. 두 worktree가 동시에 e2e를 돌리면 하나는 실패한다 — 받아들임(다시 돌리면 된다).
2. **e2e 0개 통과로 끝남** → Playwright는 테스트가 없으면 `No tests found`로 종료 코드 1이다. `forbidOnly: true`. tasks T2에서 `--list`로 1개 이상인지 본다.
3. **감정이 두 번 불림** → 클릭 처리기에서만 부르고, `status !== 'idle'`이면 버튼을 비활성으로 둔다. 단위 테스트는 `<StrictMode>`로 감싸 렌더하고 연달아 두 번 클릭한다.
4. **jsdom에 `URL.createObjectURL`이 없음** → 단위 테스트가 `URL.createObjectURL = vi.fn(() => 'blob:test')`, `URL.revokeObjectURL = vi.fn()`을 직접 넣는다(tasks T1).
5. **Testing Library 자동 정리가 안 됨** → vitest `globals`를 안 켜서 자동 `afterEach(cleanup)`이 걸리지 않는다. 테스트 파일에서 `afterEach(cleanup)`을 직접 건다. 안 하면 렌더가 쌓여 `getBy*`가 '여러 개'로 실패한다(크게 실패라 조용히 지나가진 않음).
6. **app lint가 테스트 파일에서 실패** → ESLint 전역이 `globals.browser`뿐이다. `app/tests/`에서 `process`·`Buffer`·`__dirname`을 쓰지 않는다. 파일 읽기는 `import { readFileSync, readdirSync } from 'node:fs'` + `new URL('../src/', import.meta.url)`.
7. **진짜 어댑터로 바꾼 뒤 실패하면 '갸웃'에서 멈춤** → 이번엔 가짜가 실패하지 않아 처리하지 않는다(spec 질문 7). contracts §5에 '바꿔 끼우는 스토리가 거부 처리를 같이 만든다'고 적었다.
8. **AC-10이 놓치는 요청** → `page`가 아니라 `context.on('request')`로 모은다. 허용: 출처가 `http://127.0.0.1:5199`인 것과 `blob:`·`data:`. 사진: 본문이 있는 요청(`request.postDataBuffer() !== null`)이 0개 — '사진을 담았나'보다 엄격하다(이 앱은 본문 있는 요청을 보낼 일이 없다). Vite HMR 웹소켓은 같은 출처라 문제없다.
9. **`playwright.config.js`를 고칠 수 없음** → 훅이 이미 있는 Playwright 설정 고치기를 막는다. 위 표 값을 처음 쓸 때 한 번에 맞게 쓴다. 틀렸으면 멈추고 사용자에게 알린다.
10. **Stop 훅 120초 초과** → 첫 브라우저 받기가 길 수 있다. 사용자가 U2에서 한 번 미리 받아 둔다. 그 뒤 e2e 명령은 `npm ci`(의존성 1개) + 테스트 몇 초다.
11. **태그 이름이 '설계 메모'와 다름** → 설계 메모가 저장소에 없다. 사용자가 contracts §3에 채우고(U1), 테스트와 화면 모두 그 표를 그대로 옮긴다.
- 건너뛴 것: 데이터 손실·동시 요청·외부 API 느림 — 저장도 네트워크 호출도 없다. 큰 사진: 미리보기는 blob URL이라 복사가 없다. 크기 상한은 업로드 스토리로 넘긴다.

## contracts
**새로: [contracts/appraise.md](../../contracts/appraise.md)** — 감정 자리의 입력·출력·실패 모양, 마음 가격 id, 태그 id. 앱↔인프라 값(Terraform outputs·환경변수)은 이번에 없다. `VITE_*`도 쓰지 않는다.

## ADR
**없음.** 이번 결정은 모두 되돌리기 쉽다(파일 자리, 상수, 테스트 도구). 감정 함수 모양은 아직 쓰는 쪽(서버·저장된 데이터)이 없어서 contracts 문서로 충분하다. `api/`가 이 모양을 받기 시작할 때(되돌리기 어려워질 때) ADR로 남긴다.

## 신뢰 경계
해당 없음 — `strict_review_areas`(guard)를 건드리지 않고, AI 호출·과금·저장·네트워크가 없다. 사진은 브라우저 밖으로 나가지 않는다(AC-10이 확인). 나중 경계 메모는 contracts §7.

## 범위 밖 (spec '안 할 것' 그대로 + 이번에 생긴 것)
- 감정 거부 처리 화면(contracts §5) — 진짜 어댑터 스토리
- `e2e/` lint, e2e CI 캐시(질문 4의 C)

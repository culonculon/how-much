[CAREER-29](https://culonculon98.atlassian.net/browse/CAREER-29) · spec: [spec.md](spec.md) · 작업: [tasks.md](tasks.md) · 약속: [contracts/appraise-http.md](../../contracts/appraise-http.md) §1·§9 · [contracts/appraise.md](../../contracts/appraise.md) §5 (둘 다 **고치지 않음**) · ADR: 없음 (아래 'ADR')

상태: 승인됨 (2026-10-23 — 사용자: P1~P4 모두 추천안대로. P1 a — globalSetup 한 줄은 사용자 허락으로 앞 세션(Claude)이 넣음)

## 사용자 승인이 필요한 것 (모음)
| # | 무엇 | 추천 | 후보 · 근거 | 어디에 반영 |
|---|---|---|---|---|
| P1 | **e2e가 진짜 서버 자리(8787)로 가는 것을 늘 막을지, 어디서 막을지** (A3) — AC-5는 '가짜 서버를 띄운 상태에서 한 번' 재는 조건이다. 하지만 위험(사용자 컴퓨터에서 api가 떠 있는데 e2e가 돌면 과금)은 앞으로 e2e를 돌릴 때마다 생긴다. Stop 훅(⑥)이 frontend-dev 세션이 끝날 때마다 `checks.app.e2e`를 사용자 컴퓨터에서 돌린다 | **a: `e2e/playwright.config.js`에 `globalSetup: './guard-8787.js',` 한 줄을 사용자가 직접 넣는다.** e2e를 어떻게 돌리든(Stop 훅 · CI · `--repeat-each` · 손으로) 8787을 가짜 서버가 먼저 잡는다. 진짜 서버가 떠 있으면 테스트를 시작하지 않고, 8787로 요청이 1개라도 가면 실행이 실패한다 | b `pipeline.config.json`의 `checks.app.e2e` 끝을 `node guard-8787.js npx playwright test`로 사용자가 바꿈: Stop 훅·CI는 막지만 손으로 돌리는 `npx playwright test`·`--repeat-each`는 못 막는다 / c 늘 막지 않음(T3에서 한 번 재기만): AC-5는 만족하지만 다음 스토리부터 위험이 그대로 남는다. a·b 모두 **사용자만 고칠 수 있는 파일**이다(a는 config-protection 훅, b는 파이프라인 파일). a는 테스트를 **조이는** 변경이지 느슨하게 하는 것이 아니다 | tasks U1 · T1 · T3 |
| P2 | **`vite preview`에 프록시가 따라가지 않게 하는 한 줄** — Vite는 `preview.proxy`를 따로 적지 않으면 `server.proxy`를 그대로 쓴다. 프록시만 넣으면 spec '안 할 것'의 'vite preview에 프록시 두기'가 저절로 생긴다 | **`preview: { proxy: {} }`를 함께 넣고**, AC-6의 'dev 서버 프록시 설정뿐'에 이 줄을 포함한다(프록시를 dev에만 두기 위한 줄이라서) | 안 넣음: AC-6 글자는 지키지만 '안 할 것'을 어긴다 / 함수 꼴 `defineConfig(({ isPreview }) => …)`: 같은 효과인데 파일 모양이 더 바뀐다. 완료 조건을 바꾸는 것이 아니라 AC-6을 읽는 법을 정하는 일이라 여기서 묻는다 | plan '바뀌는 파일' · tasks T2 |
| P3 | 사람 확인(AC-1·AC-3 뒷부분) 순서 — U1(a)·U2 그대로 | **서버를 끈 채 dev → 한 번 누름(AC-3, Bedrock 0) → 사용자가 api를 켬 → 같은 화면에서 다시 누름(AC-1, 감정 1건 = Bedrock 최대 3번)**. 합계 3번 이하로 U2의 5건 안 | 켠 채 먼저 AC-1, 끄고 AC-3, 다시 켜고 AC-3 뒷부분: 감정 2건(최대 6번)으로 U2를 넘을 수 있다 | tasks H1 |
| P4 | 이 plan · tasks 승인 (contracts·ADR 변경 없음) | 승인 | — | 상태 줄 |

- spec U1~U5는 10/23에 정해졌다 — 다시 묻지 않는다. U5는 아래 'U5 — 훅 확인'으로 닫는다(**막히지 않음**, 그래서 새 후보 없음).

## 접근 방법
고칠 곳은 세 군데뿐이다. (1) `app/vite.config.js`에 **dev 서버 프록시** `'/api/'` → `http://127.0.0.1:8787` 한 줄(+ P2의 preview 끄기 한 줄). 브라우저와 어댑터는 지금처럼 같은 출처 상대 경로 `/api/appraise`만 부르므로 `app/src/appraise.js`는 고치지 않는다(contracts/appraise-http.md §1·§9). (2) 화면에 **리전 안내 문구**를 '감정 받기' 버튼 바로 앞에 늘 보이게 두고, 버튼의 `aria-describedby`로 묶는다(A2). (3) **8787을 지키는 가짜 서버** `e2e/guard-8787.js` — e2e가 가로채기를 놓쳐 프록시를 타고 진짜 서버로 가는 일을 포트에서 잡는다(A3·P1). 서버가 꺼졌을 때(AC-3)의 화면은 CAREER-26 실패 처리 그대로이므로 새 코드는 없고, e2e가 **Vite 프록시가 내는 오류 응답 모양**을 흉내 내어 자동으로 보고(A1), 진짜 프록시 오류는 사용자가 한 번 눈으로 본다(H1).

### 바뀌는 파일
| 파일 | 하는 일 | 담당 | AC |
|---|---|---|---|
| `app/vite.config.js` (2줄 더함) | `server: { proxy: { '/api/': 'http://127.0.0.1:8787' } }` · `preview: { proxy: {} }`(P2). `plugins`·그 밖은 그대로, `test:` 블록 넣지 않음 | frontend-dev (PR에서 사용자가 이 줄 승인 — U5) | 1 · 3 · 4 · 6 |
| `app/src/options.js` (한 줄 더함) | `REGION_NOTICE` — contracts/appraise.md §5 '리전 안내' 문구를 그대로 옮김 | frontend-dev | 2 |
| `app/src/App.jsx` (몇 줄) | '감정 받기' 버튼 **바로 앞**에 `<p id="region-notice">{REGION_NOTICE}</p>`(늘 그림, 조건 없음) · 버튼에 `aria-describedby="region-notice"` | frontend-dev | 2 |
| `app/tests/connect.test.jsx` (새로, jsdom) | AC-2: 첫 화면·고른 뒤 문구 그대로 · 버튼 설명 = 문구 · 버튼 바로 앞 형제 · 문구가 contracts 줄과 같음(파일을 읽어 비교) / AC-4: `app/src`에 `8787`·`127.0.0.1`·`VITE_`·`import.meta.env` 0번 | test-writer | 2 · 4 |
| `e2e/guard-8787.js` (새로) | 가짜 서버: `127.0.0.1:8787`을 잡고 받은 요청을 센다(응답은 `503 {"code":"unavailable"}`). 이미 무언가 떠 있으면 시작하지 않고 실패. 두 쓰임 — Playwright `globalSetup`(기본 내보내기, 끝낼 때 1개라도 받았으면 실패) · 명령 감싸기(`node e2e/guard-8787.js <명령…>`) | test-writer | 5 |
| `e2e/connect-screen.spec.js` (새로) | AC-2(진짜 브라우저에서 보임 · 접근 가능한 설명) · AC-3(프록시 오류 모양 → `대기` + `unavailable` 문구 → 다시 누르면 결과 카드) | test-writer | 2 · 3 |
| `e2e/playwright.config.js` (한 줄 — P1 a일 때만) | `globalSetup: './guard-8787.js',` | **사용자** (config-protection 훅이 역할을 막음) | 5 |

- 고치지 않는 것: `app/src/appraise.js` · `app/src/photo.js` · `api/` · `infra/` · `contracts/` · `.github/` · lint·vitest 설정 · 기존 e2e·단위 테스트 파일.
- 나누지 않은 것: 가짜 서버는 한 파일(~40줄)에 두 쓰임. 설정용과 명령용을 나누면 '세는 법'이 둘이 된다.

### 이름과 값 (테스트와 구현 사이의 약속 — 원본)
| 무엇 | 약속 |
|---|---|
| 리전 안내 요소 | `<p id="region-notice">` — 글자는 contracts/appraise.md §5 '리전 안내' 따옴표 안 **그대로**: `사진은 감정하는 동안 서울 밖 아시아 리전에서 처리될 수 있어요.` |
| '감정 버튼 근처'의 뜻 (A2) | ① 안내가 '감정 받기' 버튼의 **바로 앞 형제 요소**(`#region-notice + button` 이 그 버튼) ② 버튼의 `aria-describedby="region-notice"` → 접근 가능한 설명 = 문구(화면 읽기 도구가 버튼에 닿을 때 함께 읽음) ③ 사진·가격을 고르기 전과 뒤 모두 보임(조건부 렌더 없음 → 사진이 나가기 전에 늘 먼저 보인다) |
| 프록시 | 열쇠 `'/api/'`(끝 `/` 포함 — `/apifoo` 같은 경로는 넘기지 않음), 대상 `'http://127.0.0.1:8787'`(문자열 하나, `changeOrigin`·`rewrite` 없음 — 서버는 같은 경로 `/api/appraise`를 받는다) |
| 프록시 오류 흉내 (AC-3 e2e) | `page.route(url.pathname === '/api/appraise')` 첫 번째 → `fulfill({ status: 500, contentType: 'text/plain', body: '' })`, 두 번째 → 성공 `200 {"mochi":10,"line":"흠, 손때가 제법 묻었구먼"}`(CAREER-26 plan 그대로) |
| 가짜 서버 | 주소 `127.0.0.1:8787` · 모든 요청에 `503` `{"code":"unavailable"}` · 받은 것을 `METHOD 경로`로 모음 · 포트가 차 있으면 메시지 `[guard-8787] 8787에 이미 무언가 떠 있다(진짜 감정 서버?) — 끄고 다시 돌린다` · 끝낼 때 받은 요청이 있으면 `[guard-8787] 진짜 서버 자리로 간 요청 N개: …` |

## 열린 질문 답 (spec 'architect 몫')
### A1 — AC-3 자동 확인 → **e2e로 '프록시 오류 모양'을 흉내 낸다. 8787에는 아무것도 보내지 않는다**
- 서버가 꺼져 있을 때 Vite 프록시는 연결이 거부되면 `500`, 빈 `text/plain`을 낸다(Vite 소스의 proxy 오류 처리 — **Vite 8에서 직접 확인하지 않음**, H1에서 사용자가 눈으로 본다). 어댑터에게는 'JSON 아님' → `unavailable`(appraise-http.md §5 어댑터 규칙)이고, 이 규칙 자체는 CAREER-26 단위 테스트(`404 <html>`·`200 not json`·네트워크 오류)가 이미 본다.
- 그래서 e2e는 **브라우저에서 같은 모양을 가로채 돌려주고**, 화면이 `대기` · `unavailable` 문구 그대로 · 버튼 다시 켜짐 → 다시 누르면 결과 카드(같은 화면에서)를 본다. 요청이 프록시에 닿지 않으니 8787이 비었는지 보장할 필요가 없다.
- 버린 것: (가) 가로채기 없이 진짜 프록시로 보내 '8787이 비었음'에 기댐 — 사용자 컴퓨터에서 api가 떠 있으면 바로 과금, 그리고 P1의 가짜 서버가 8787을 잡고 있으면 '비어 있음'이 아니다 / (나) 가짜 서버가 연결을 끊어 '꺼짐'을 흉내 — AC-5의 '받은 요청 0개'와 부딪힌다(셀지 말지 예외가 생김) / (다) 사람 확인만 — AC-3의 화면 부분은 자동으로 볼 수 있는데 사람에게 미루는 것.
- 남는 빈 곳(일부러): '진짜 Vite 프록시가 꺼진 서버에 대해 정말 JSON 아닌 응답을 바로 주는가'는 H1 사람 확인 한 번뿐이다. 다음 Vite 판에서 바뀌어도 어댑터 규칙상 `unavailable`이 되므로(멈추지 않음) 자동 테스트를 더 두지 않는다. 단 프록시가 **응답 없이 매달리는** 경우는 어댑터에 시간 제한이 없어 '갸웃'에 머문다 → 실패 시나리오 3.

### A2 — 리전 안내 자리와 확인 → 위 '이름과 값'의 ①②③
- `data-testid`를 따로 두지 않는다. 테스트는 글자(`getByText(…, { exact: true })`)와 버튼의 접근 가능한 설명으로 찾는다(test-writer 규칙의 순서 — 역할·글자 먼저). `id`는 `aria-describedby`에 필요해서 둔다.
- '근처'를 픽셀 거리로 재지 않는다: 지금 화면은 블록 요소를 위아래로 쌓기만 하므로 바로 앞 형제면 눈으로도 바로 위다. 픽셀 검사는 글꼴·창 크기에 흔들린다.
- 버린 것: 결과 카드 안에 둠 — 사진이 나간 뒤에야 보인다(AC-2 '나가기 전에') / 첫 화면 맨 위 — 버튼에서 멀어 '감정 버튼 근처'(contracts §5)가 아니다 / 사진을 고른 뒤에만 보임 — AC-2 '첫 화면'에서 안 보인다.

### A3 — AC-5 가짜 서버 → **`e2e/guard-8787.js` 하나. e2e는 Playwright `globalSetup`으로(P1 a), 단위 테스트는 명령 감싸기로. CI에서도 돈다(P1 a면 저절로)**
- 누가 띄우나: e2e — Playwright가 `globalSetup`으로 테스트 전에 띄우고 끝에 센다(P1 a). 단위 테스트 — `node e2e/guard-8787.js npm --prefix app test`로 감싸 한 번 잰다(T3 단계, 세션 보고에 출력 그대로). vitest는 Vite dev 서버를 띄우지 않아 프록시가 없고(`server.proxy`는 vitest에 쓰이지 않음), `fetch`는 모두 가짜로 바뀌어 있으며, `app/src`에 `8787`이 0번(AC-4 테스트)이라 늘 붙여 둘 까닭이 약하다 — 그래서 감싸기는 한 번 재는 데만 쓴다.
- CI: P1 a면 `checks.app.e2e`가 그대로 가짜 서버를 띄운다(CI 러너의 8787은 비어 있음). 단위 테스트 감싸기는 CI에 넣지 않는다(위 이유).
- 가짜 서버가 **503 `unavailable`을 답하는** 이유: 가로채기를 놓친 테스트가 매달리지 않고 곧바로 실패 문구로 시끄럽게 실패한다. 진짜 서버 응답처럼 200을 주면 놓친 테스트가 초록이 될 수 있다.
- 포트가 차 있으면 **시작하지 않는** 이유: 그때 8787에 있는 것은 진짜 서버일 가능성이 가장 크다. 다른 포트로 피하면 프록시는 여전히 진짜 서버로 간다.
- P1에서 b를 고르면: `globalSetup` 줄 대신 사용자가 `checks.app.e2e`의 `npx playwright test`를 `node guard-8787.js npx playwright test`로 바꾼다(tasks U1 b). c면 e2e도 T3에서 감싸 한 번만 잰다.
- 버린 것: 테스트마다 `/api/**`를 끊는 Playwright 공통 고정물(`test.extend`) — 기존 spec 파일의 import를 모두 바꿔야 하고, 새 파일이 그것을 잊으면 지키지 못하며, 브라우저 밖(`request` 고정물)에서 가는 요청은 못 본다 / 일꾼(worker)마다 가짜 서버 — 일꾼이 둘 이상이면 포트가 부딪힌다.

### U5 — 훅 확인 → **frontend-dev는 `app/vite.config.js`를 쓸 수 있다 (막히지 않음)**
코드를 읽어 판단했다(architect 세션에는 명령 도구가 없어 훅을 직접 돌리지 못했다 — T2 단계 1에서 frontend-dev가 실제로 돌려 확인).
| 훅 | 판단 | 근거 |
|---|---|---|
| ③ `block-outside-area.js frontend-dev` | 통과 | 상대 경로 `app/vite.config.js`가 `app_config`(`app/*`)에 걸리고, `roles.frontend-dev.writes`에 `app_config`가 있으며, `human_only`(guard·reference·readme)가 아니고, 파이프라인 파일(`.claude/**`·`pipeline.config.json`·`CLAUDE.md`)도 아니다 |
| ④ `vendor/ecc/config-protection.js` | 통과 | 막는 이름은 lint·prettier 등 + how-much가 더한 `vitest.config.*`·`playwright.config.*`·`.gitleaks.toml`·`.trivyignore` + `.github/workflows/` 폴더뿐. `vite.config.js`는 ECC 원본이 일부러 뺐다(파일 주석 '평범한 작업') |
| ⑥ `stop-check.js frontend-dev` | 통과 + 검사 | ③과 같은 판단으로 구역 밖이 아니다. `app_config`가 바뀌었으니 `checks.app` 다섯(lint·test·e2e·build·api)을 돈다 |
- 그래서 훅이 지켜 주지 않는 것: 같은 파일에 `test:` 블록(vitest 설정)을 넣어 느슨하게 하는 일. 이것은 U5대로 **사용자가 PR에서 그 줄만 보고 승인**하고, reviewer가 AC-6(`git diff origin/main -- app/vite.config.js`가 `server`·`preview` 두 줄뿐)으로 본다. 훅에 `vite.config.js`를 더하자는 제안은 하지 않는다 — 더하면 frontend-dev가 이 일을 못 한다.
- 반대로 `e2e/playwright.config.js`는 ④가 test-writer·frontend-dev를 **막는다**(이미 있는 `playwright.config.*`). 그래서 P1 a의 한 줄은 사용자 몫이다.

## 고른 이유와 버린 대안
| 결정 | 고른 것 | 버린 것 · 왜 아님 |
|---|---|---|
| 1 서버에 닿는 길 | Vite dev 프록시(contracts §1 그대로) | CORS + 절대 주소 · `VITE_API_URL`: contracts §1·§9가 막았고, 빌드에 주소가 남는다(AC-4) |
| 2 프록시 열쇠 | `'/api/'` 문자열 | `'/api'`: `/api`로 시작하는 다른 경로(`/apix`)도 넘긴다 / 정규식: 필요 없는 일반성 |
| 3 preview | `preview: { proxy: {} }`로 끔 (P2) | 위 P2 |
| 4 dev 서버 묶는 곳 | 그대로(Vite 기본 `localhost`, 루프백) — 설정에 `host`를 적지 않음 | `server.host: '127.0.0.1'` 명시: 명령줄 `--host`가 어차피 덮어써 지켜 주지 못하고 AC-6의 '프록시뿐'을 넘는다. 위험은 실패 시나리오 5로 |
| 5 8787 지키기 | 포트를 먼저 잡는 가짜 서버 (A3) | 위 A3 |
| 6 AC-3 자동 | 오류 모양 흉내 (A1) | 위 A1 |
| 7 안내 문구 원본 | `options.js` 한 줄 + 테스트가 contracts 파일 줄과 비교 | 테스트에만 글자 복사: contracts가 바뀌면 화면·테스트가 같이 낡아도 모른다 |
- 모두 되돌리기 쉬움(설정 2줄 · 화면 몇 줄 · 테스트 파일) → ADR 없음, PR '결정' 칸에 적는다.

## 신뢰 경계 (`strict_review_areas: guard` — 이번엔 `api/`를 고치지 않지만, 화면에서 과금 동작으로 가는 **새 길**이 생기므로 그린다)
`들어온 곳 → 해석 → 검증 → 실제 동작`
1. 브라우저 '감정 받기' → 어댑터(CAREER-26, 다시 그린 JPEG 한 번) → **Vite dev 프록시(새로)** — 검증 없이 그대로 넘김 → `api/` 입구(CAREER-25 검사 전부: 쿼리 표·`Content-Type`·크기·JPEG·GPS·픽셀) → Bedrock 호출(과금)
2. 같은 컴퓨터의 다른 프로그램 → `127.0.0.1:5173/api/…` → 프록시 → `api/` — 이미 `127.0.0.1:8787`에 직접 닿을 수 있던 것과 같다(새 노출 아님)
3. 같은 네트워크의 다른 기기 → dev 서버가 루프백에만 묶여 있으면 닿지 않음. `--host`로 열면 **비용 상한 없이 Bedrock**(결정 B와 부딪힘) → '안 할 것' · 실패 시나리오 5
4. 자동 테스트 → 가로채기(`page.route`) → 놓치면 프록시 → **가짜 서버가 8787을 먼저 잡아** 진짜 서버로 못 감(A3)

**실제 동작: 화면에서 진짜 Bedrock 호출 (이번 스토리에서 새로 생긴 길, 로컬만)**
| 항목 | 값 |
|---|---|
| 누가 허락하나 | 사용자가 직접 자기 자격 증명으로 `api/`를 띄운 때만(U1 a) + '감정 받기' 한 번. 세션은 api를 띄우지 않는다 |
| 바로 앞의 검증 | `api/` 입구 검사(contracts/appraise-http.md §2·§3) — 프록시는 검증하지 않는다(믿지 않아도 됨, 서버가 다 본다) |
| 입력 최대 | 본문 `MAX_PHOTO_BYTES` 1,000,000 · 긴 변 1024px(서버가 셈) |
| 출력 최대 | `{mochi, line}` · `line` ≤ 30자 · 모델 출력 120토큰 |
| 남는 증거 | `api/` 표준 출력 JSON 한 줄(`evt: appraise` · `outcome` · `attempts`=Bedrock 호출 수). 프록시·브라우저는 남기지 않음 |
| 호출 수 상한 | 아직 없음(CAREER-27). 요청 1건당 Bedrock 최대 3번(`MAX_RETRIES` 2), 같은 사진·태그는 기억으로 0번. 이번 스토리 합계는 P3대로 3번 이하 |
| 중간에 끊기면 | 저장하는 것이 없어 되돌릴 것 없음. 탭을 닫으면 프록시가 연결을 끊고 서버는 `client_closed`로 멈춘다(CAREER-25) — **프록시를 거쳐서도 끊김이 전해지는지는 확인하지 않음**(건너뜀, 아래) |

## 실패 시나리오 (premortem) — 각각 막는 곳
1. **e2e가 가로채기를 놓쳐 진짜 서버로 감(과금)** → 가짜 서버가 8787을 먼저 잡음(P1 a: 늘 · b: 검사 명령에서) · 진짜 서버가 떠 있으면 e2e가 시작조차 안 함 · T3 단계 '일부러 놓치기'로 실제로 실패하는지 본다
2. **가짜 서버를 끝낼 때의 실패가 실행 결과에 안 남음**(teardown 오류가 종료 코드에 반영 안 되는 판) → T3 '일부러 놓치기'에서 종료 코드가 0이 아님을 확인. 0이면 멈추고 보고 → P1 b로 바꾼다
3. **프록시가 응답 없이 매달려 '갸웃'에서 멈춤**(서버가 켜졌는데 멈춘 경우 등) → 서버가 20초 시간 제한(`TIMEOUT_MS`)으로 `unavailable`을 준다. 서버 자체가 멈춘 경우는 지킴 없음 — 어댑터 시간 제한은 spec '안 할 것'(결정 J). 사용자가 새로 고침
4. **빌드에 서버 주소가 남음** → 주소는 `vite.config.js`에만(빌드 결과에 들어가지 않음). AC-4: 단위 테스트(`app/src`) + T2 검사 명령(`app/dist` grep)
5. **누가 `npm run dev -- --host`로 열어 같은 네트워크에서 상한 없이 Bedrock** → 이번엔 '안 할 것'·U3으로 막고 H1 단계에 적는다. 설정으로 막지 않는다(고른 이유 4). CAREER-27 비용 상한 전까지의 위험으로 PR '비용·남용 영향'에 남긴다
6. **`vite preview`가 프록시를 물려받음** → P2 한 줄 + T2 확인(가짜 서버 + preview로 POST → 받은 요청 0)
7. **리전 문구가 contracts와 한 글자 다름**(복사 실수·나중 고침) → 단위 테스트가 contracts 파일의 그 줄을 읽어 화면 글자와 비교
8. **`aria-describedby`가 가리키는 id가 없음**(이름 바꿈) → 단위·e2e가 버튼의 설명 글자를 본다(빈 설명이면 실패)
9. **기존 테스트가 깨짐** — 버튼에 설명이 붙어도 이름(`감정 받기`)은 그대로, 안내 `<p>`는 `role="alert"`가 아님(기존 `getByRole('alert')` 테스트와 안 겹침). 깨지면 멈추고 보고(테스트를 고치지 않음)
10. **프록시 열쇠 오타로 dev에서 404 → `unavailable`만 보임** → 자동 테스트는 가로채므로 못 잡는다. H1 사람 확인이 잡는다(결과 카드가 안 나오면 ✘)
11. **사람 확인 중 Bedrock이 U2(5건)를 넘음** → P3 순서(감정 1건) · 같은 사진 다시 누르면 기억으로 0번 · H1이 로그로 `attempts` 합을 센다
12. **사용자가 api를 켠 채 frontend-dev 세션이 끝나 Stop 훅이 e2e를 돌림** → P1 a·b면 가짜 서버가 포트를 못 잡아 e2e가 실패하고 '8787에 이미 무언가' 메시지 → 세션이 돌려보내짐(과금 없음). H1 단계 끝에 'api를 끈다'를 둔다
- 건너뛴 것(일부러): 프록시를 거친 연결 끊김이 서버 `client_closed`까지 가는지 — 로컬 한 사람 확인용이고 비용은 요청 1건(≤3번)으로 묶임. 배포 스토리(CloudFront)에서 다시 본다. Safari·휴대폰 — U3대로 배포 스토리. `PORT`를 바꿔 띄운 서버 — spec 가정 1.

## contracts
- **고치지 않음**: [contracts/appraise-http.md](../../contracts/appraise-http.md) — §1(로컬 Vite dev 프록시 `/api` → `127.0.0.1:8787`, CORS 없음)·§9(`VITE_*` 없음) 그대로 만든다. 프록시 열쇠 `'/api/'`는 §1의 `/api`를 좁힌 구현일 뿐 약속(경로 `POST /api/appraise` 하나)은 같다.
- **고치지 않음**: [contracts/appraise.md](../../contracts/appraise.md) — §5 리전 안내 문구·자리('감정 버튼 근처')를 그대로 쓴다. 자리를 어떻게 확인하는지는 이 plan '이름과 값'이 원본이다.
- Terraform outputs · 환경변수: 없음.

## ADR
- 없음 — 이번 결정은 모두 되돌리기 쉽다(위 '고른 이유' 끝 줄). PR '결정' 칸: 프록시 열쇠 `'/api/'` · `preview.proxy` 끔(P2) · 리전 안내 자리와 `aria-describedby` · 가짜 서버(`e2e/guard-8787.js`)와 P1에서 고른 것 · AC-3을 오류 모양 흉내로 자동 확인.

## 범위 밖 (spec '안 할 것' 그대로)
- api 배포 · CloudFront `/api/*` · 비용 상한 · 퇴근 · 어댑터 시간 제한·재시도 · CORS · `VITE_*` · dev 서버를 네트워크에 열기 · 휴대폰 확인 · 문구·말투 바꾸기 · 11/8 범위 밖 기능.

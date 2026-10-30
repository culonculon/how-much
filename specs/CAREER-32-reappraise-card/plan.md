[CAREER-32](https://culonculon98.atlassian.net/browse/CAREER-32) · spec: [spec.md](spec.md) · 작업: [tasks.md](tasks.md) · 약속: [contracts/appraise.md](../../contracts/appraise.md) §5(바꾸지 않음) · 결정: [ADR-0008](../../docs/adr/0008-screens-without-url-change.md)(제안)

상태: 승인됨 (2026-10-31)
<!-- 앞 방향(한 페이지 + 스크롤)의 plan.md.old · tasks.md.old는 따르지 않는다. 가져온 사실: 지금 상태 흐름(App.jsx), first-flow.spec.js 67~68줄 메모, 375×548 화면 크기 근거, e2e '화면을 내린 상태' 만드는 법 -->

## 한 줄
`app/src/App.jsx`(+ `options.js` 문구 한 줄)만 고친다. 화면 상태 `screen`(`input` · `thinking` · `result`)으로 셋 중 하나만 그리고, 주소는 언제나 `/`, history는 '감정 받기'를 누를 때 한 칸만 쌓는다. 라우터 · 새 의존성 · `api/` · `infra/` · contracts 변경 없음.

## A1 — 화면 바꾸는 법 · 주소 · 초점 · history (ADR-0008)
| 무엇 | 정한 것 | 버린 것 · 왜 아님 |
|---|---|---|
| 바꾸는 법 | **라우터 없이 React 상태 `screen` + History API 직접**(`pushState` · `popstate`) | react-router: 새 의존성, 주소↔화면을 맞춰 주는 일이 바로 막아야 할 일(ADR-0008 대안 1) |
| 주소 모양 | **언제나 `/`** — `pushState(state, '')`에 주소를 주지 않는다. 그래서 nginx `try_files … =404`가 늘 `/`만 받는다 → `infra/` 그대로 | `/result`: 배포에서만 404, nginx 변경 필요 / `#result`: 첫 화면에서 지우는 코드 · 공유 주소처럼 보임(대안 2·3) |
| history 쌓기 | '감정 받기' 클릭 처리 안에서 **`await` 전에** `if (history.state?.howMuch !== 'out') history.pushState({ howMuch: 'out' }, '')`. '다시 감정'은 history를 건드리지 않는다(그 칸에 머문 채 입력 화면) | '다시 감정'에서 `history.back()`: 뒤로 가기가 비동기라 바로 '감정 받기'를 누르면 늦게 온 `popstate`가 새 갸웃을 지운다 / 매번 `pushState`: 다시 감정할수록 '뒤로'를 그만큼 눌러야 앱을 떠난다 |
| `popstate` | **언제나** 요청 번호를 올리고(가던 답 버림) 입력 화면으로(`toInput()`). 어느 칸으로 왔는지 보지 않는다 | 칸마다 화면을 기억해 되살리기: '앞으로'로 옛 결과가 나온다(AC-5 ③) |
| 결과 | 앱 몫 history는 늘 `[입력 칸, out 칸]` 두 칸 이하. 결과에서 '뒤로' → 입력(AC-5 ①④). 한 번 더 '뒤로' → 앱 밖. '앞으로' → out 칸이지만 `popstate`라 입력 그대로(③). 새로고침 · 바로 열기 → 새 앱이라 빈 입력(⑥) — `history.state`는 읽어서 그리지 않는다 | — |
| 입력 화면 그리기 | 화면은 **조건부로 그린다**(안 보이는 화면은 DOM에 없음). 모든 상태(`photo` · `previewUrl` · `myPrice` · `tags` · `error` · `status`)는 **`App`에 그대로** 둔다 → 입력 화면이 다시 떠도 미리보기 · `aria-pressed`가 남는다. 미리보기 `img`(`alt="고른 사진 미리보기"`)는 지금처럼 파일 칸 바로 뒤 — 파일 칸이 '선택된 파일 없음'으로 보여도 바로 아래 미리보기로 안다 | `hidden`으로 감추기: 테스트마다 '없음'의 뜻(DOM vs 접근성 트리)이 갈린다 / 상태를 화면 컴포넌트로 옮기기: 화면이 내려갈 때 사진 · `blob:` 주소가 사라진다 |
| 초점(AC-1) | 화면이 **바뀔 때만**(처음 그릴 때 · StrictMode 두 번 실행은 아님 — 앞 `screen`을 ref로 비교) `useLayoutEffect`에서 `focus({ preventScroll: true })`. 대상 — 갸웃: 아저씨 칸 · 결과 성공: 카드 `section` · 결과 실패: `appraise-error` · 결과 퇴근: 아저씨 칸 · 입력: '감정 받기'(켜져 있으면), 꺼져 있으면(U10) 기다림 안내 문구. 대상에는 `tabIndex={-1}`(버튼 빼고) | 늘 아저씨 칸: 입력으로 돌아온 키보드 사용자가 태그 16개를 지나야 '감정 받기'에 닿는다 / 새 제목(`h2`) 두기: 새 글자 · 꾸미기(spec 안 할 것) |
| 읽어 주기 알림 | 갸웃 · 퇴근: 아저씨 칸 `role="status"`(그대로) + 초점. 실패: `role="alert"`(그대로) + 초점. 성공: 카드에 초점 → 영역 이름 '감정 결과'와 세 줄을 읽음. 새 `aria-live`는 없다 | 카드에 `aria-live`: 새로 생기는 요소의 알림은 VoiceOver가 자주 놓친다 |
| 맨 위부터(AC-4) | 같은 `useLayoutEffect`에서 `document.documentElement.scrollTop = 0`(그리기 전에) | `window.scrollTo(0, 0)`: jsdom이 'Not implemented' 오류를 찍어 이미 있는 테스트 출력이 시끄러워진다 / 결과 칸으로 `scrollIntoView`: 화면이 짧아 위가 낫고, 아저씨 칸도 함께 보인다 / 부드러운 스크롤: e2e 위치 재기가 흔들림 |
| U10 (b) 이유 알리기 | 입력 화면에서 앞 요청이 끝나지 않았으면(`busy`) '감정 받기' **뒤에** `<p id="busy-note" tabIndex={-1}>{BUSY_TEXT}</p>`를 두고 버튼 `aria-describedby="region-notice busy-note"`. `busy`가 아니면 지금처럼 `"region-notice"` 하나. 글자: **"앞 감정을 마무리하는 중이에요. 끝나면 다시 누를 수 있어요."**(`options.js` `BUSY_TEXT`) — 사용자 확정 (2026-10-31) | 버튼 글자 바꾸기('기다리는 중…'): 테스트가 버튼을 '감정 받기' 이름으로 찾는다(AC-5 ⑤) / 안내를 버튼 앞에: `connect.test.jsx`의 '안내가 버튼 바로 앞 형제' 확인이 깨진다 |

### 상태 흐름
`status`(아저씨: `idle` · `thinking` · `done` · `off`) · `error`는 지금 그대로 두고 `screen` · `busy` · 요청 번호 `reqRef`를 더한다.

| 지금 | 일 | 다음 `screen` / `status` | 그 밖 |
|---|---|---|---|
| input | '감정 받기'(사진·값 있음, `!busy`) | thinking / thinking | `error` 지움 · `busy=true` · `id=++reqRef` · 위 history 규칙 |
| thinking | 성공 (`id === reqRef`) | result / done | `result` 넣음 |
| thinking | `daily_limit` | result / off | `error` 없음 |
| thinking | 그 밖 실패 | result / idle | `error` = 코드(모르면 `unavailable`) |
| thinking | 답(성공·실패 모두) `id !== reqRef` | 그대로 | **버림**(U10 b) |
| 어디서든 | 답이 옴 | — | `finally`에서 `busy=false` |
| result | '다시 감정' | input / `off`면 `off`, 아니면 `idle` | `error` 그대로(U9 a) · history 그대로 |
| 어디서든 | `popstate` | input / 위와 같음 | `reqRef++` · `error` 그대로 |
| input | 사진 고르기 | 그대로 | `error` 지움 · `off` 그대로(contracts §5) — 지금 코드 그대로 |

코드 모양(frontend-dev는 이대로 쓴다, 이름 고정):
```js
const [screen, setScreen] = useState('input') // 'input' | 'thinking' | 'result'
const [busy, setBusy] = useState(false)
const reqRef = useRef(0)
const toInput = () => { setScreen('input'); setStatus((s) => (s === 'off' ? 'off' : 'idle')) } // U9 (a), U4

async function submit() {
  if (history.state?.howMuch !== 'out') history.pushState({ howMuch: 'out' }, '') // before await: needs user activation
  const id = ++reqRef.current
  setError(null); setStatus('thinking'); setScreen('thinking'); setBusy(true)
  try {
    const r = await appraise({ photo, myPrice, tags: ALL_TAG_IDS.filter((t) => tags.includes(t)) })
    if (id !== reqRef.current) return
    setResult(r); setStatus('done')
  } catch (e) {
    if (id !== reqRef.current) return
    if (e.code === 'daily_limit') setStatus('off')
    else { setError(e.code in ERROR_TEXT ? e.code : 'unavailable'); setStatus('idle') }
  } finally {
    setBusy(false)
  }
  if (id === reqRef.current) setScreen('result')   // ← return 뒤에는 오지 않음
}

useEffect(() => {
  const onPop = () => { reqRef.current++; toInput() }
  window.addEventListener('popstate', onPop)
  return () => window.removeEventListener('popstate', onPop)
}, [])

const prevScreen = useRef(screen)
useLayoutEffect(() => {
  if (prevScreen.current === screen) return
  prevScreen.current = screen
  document.documentElement.scrollTop = 0 // jsdom has no window.scrollTo
  const target = screen === 'thinking' ? mascotRef.current
    : screen === 'result' ? (cardRef.current ?? errorRef.current ?? mascotRef.current)
    : submitRef.current && !submitRef.current.disabled ? submitRef.current : busyRef.current
  target?.focus({ preventScroll: true })
}, [screen])
```
- `setScreen('result')`는 `try` 안 각 갈래에 넣어도 된다 — 뜻은 '`id === reqRef`일 때만'이다.
- `history` · `window` · `document`는 **처리 함수와 effect 안에서만** 읽는다(`App.test.jsx`가 `renderToString`으로 window 없이 그린다).
- 버튼 `disabled={!photo || !myPrice || busy}`.

### 그리는 차례 (요소 순서 고정)
- 늘: `h1` · 아저씨 칸(`role="status"` `aria-label="감정사 아저씨"` `tabIndex={-1}`, 퇴근이면 안에 `off-duty`)
- input: 파일 칸 · `fileError` · `appraise-error`(있으면) · 미리보기 · 마음 가격 · 사연 태그 · `#region-notice` · '감정 받기' · `#busy-note`(busy일 때) — 지금 순서 그대로, 끝에 하나 더함
- thinking: 위 '늘'만. **버튼 0개**
- result: 카드(`done`, `tabIndex={-1}`) 또는 `appraise-error`(`tabIndex={-1}`) 또는 없음(퇴근) → '다시 감정' 버튼(`type="button"`)

### 신뢰 경계
`strict_review_areas`(guard = `api/`)를 건드리지 않으므로 신뢰 경계 절은 없다. AI 호출 길은 그대로 `appraise.js → POST /api/appraise → 서버 막기`다. 다시 누를 수 있게 되는 것뿐이고 횟수는 서버가 센다(CLAUDE.md §9).

## A2 — AC-4 · AC-5 화면 크기 · 브라우저
| 무엇 | 정한 것 | 왜 |
|---|---|---|
| 크기 | **375 × 548 CSS px**, `deviceScaleFactor: 2` · `isMobile: true` · `hasTouch: true` — **새 테스트 파일 맨 위 `test.use(…)`** | 지금 iOS가 도는 가장 작은 iPhone(SE 2·3세대, 375×667)에서 상태줄 · Safari 주소창 · 도구 막대를 뺀 높이를 어림한 값. 여기서 보이면 큰 iPhone에서도 보인다. **확인 못 함**: 548은 기기에서 잰 값이 아니다 — AC-6 (a)가 진짜 기기로 본다. `index.html`에 `width=device-width`가 있어 폭이 375로 잡힌다 |
| 브라우저 | **chromium**(지금 `playwright.config.js` 프로젝트 하나) | Linux Playwright WebKit은 iOS Safari 주소창 · 도구 막대를 흉내 내지 않아 위치 확인에 더해 주는 것이 없다. Safari 확인은 AC-6 사람 확인 몫 |
| `devices['iPhone …']` 안 씀 | 그 안 `defaultBrowserType: 'webkit'` 때문에 WebKit을 띄우려다 CI(chromium만 설치)에서 실패 | 숫자를 직접 적는다 |
| 설정 바꾸기 | **필요 없음.** `e2e/playwright.config.js` · `checks.app.e2e` 그대로 → 넘길 사람 없음 | — |
| '화면을 내린 상태' | 누르기 전마다 `button.evaluate((el) => el.scrollIntoView({ block: 'end' }))` 뒤 `window.scrollY > 0` 확인. 누른 뒤에는 스크롤 · `scrollIntoViewIfNeeded` · `hover` · `tap` 금지, 기다리기는 `expect`만 | 버튼을 맨 아래 끝에 둬야 '고치기 전 = 카드가 화면 밖'(빨강이 참) |
| '보인다' | `await expect(loc).toBeInViewport({ ratio: 1 })` — 이 확인은 스크롤하지 않는다(`@playwright/test` ^1.64) | 위 · 아래 끝이 모두 화면 안 |

## A3 — `api/` · `infra/` · contracts
- **바꿀 일 없음.** 요청 · 응답 · 코드 · 문구 그대로. 주소가 `/` 하나라 nginx · CloudFront 그대로.
- contracts/appraise.md §5 '화면 처리'와 맞는지: "사진·선택은 그대로 두어 '감정 받기'를 다시 누를 수 있다" → '다시 감정' 뒤 입력 화면에서 그대로(AC-3 ②). "다른 사진을 고르거나 다시 누르면 문구를 지운다" · "누르면 갸웃 · 퇴근 문구 사라짐" · "다른 사진을 골라도 퇴근은 그대로" → 위 상태 흐름 그대로. 고칠 줄 없음.
- 그래서 spec '비용·남용 영향' · AC-7은 고치지 않는다.

## A4 — 옮길 테스트 · 줄지 않았음을 보이는 법
목록과 줄 단위 짝은 [tasks.md T6](tasks.md#t6). 요약:

| 파일 | 옮김? | 왜 |
|---|---|---|
| `app/tests/FirstFlow.test.jsx` | **예** — 'AC-7 thinking state…'(갸웃에 버튼 없음) · 'AC-7 invalid_input…' · CAREER-27 AC-9 셋 · CAREER-31 AC-5 하나 | 결과(실패·퇴근) 화면에 '감정 받기' · 사진 칸이 없다 |
| `app/tests/connect.test.jsx` | **아니오** | 입력 화면만 본다. 안내가 버튼 바로 앞 · `aria-describedby="region-notice"`는 위 '그리는 차례'로 지킨다. 빨강이면 테스트가 아니라 화면을 고친다 |
| `app/tests/App.test.jsx` | 아니오 | `renderToString` — render 안에서 `window`를 안 읽으면 그대로 |
| `e2e/first-flow.spec.js` | **예** — 68줄 하나 | 갸웃 화면에 버튼이 없어 `toBeDisabled()`가 기다리다 실패. → `toHaveCount(0)`(누를 수 없음 = 같은 확인). 옛 메모의 '67~68줄 흔들림'은 이제 없다: 갸웃 · 결과 화면 모두 버튼 0개라 68줄이 어느 쪽에서도 참 |
| `e2e/connect-screen.spec.js` | **예** — 'CAREER-29 AC-3' | 실패 화면에서 `submit` |
| `e2e/daily-limit.spec.js` | **예** | 퇴근 화면에서 `submit` |
| `e2e/photo-upload.spec.js` | **예** — 'AC-7' 하나 | 실패 화면에서 사진 고르기. AC-1~6은 그대로(AC-6은 실패 화면에 문구가 그대로 있음) |

줄지 않았음을 보이는 법(AC-7, tasks P1에서 돌려 PR에 붙임):
1. **지운 줄**: `git diff -U0 origin/main -- <위 5개 파일>`의 `-` 줄이 tasks T6 짝 표의 '지움' 칸과 글자 하나까지 같다(FirstFlow 3줄 · first-flow 1줄).
2. **바꿔 넣은 확인**: 지운 `expect` 2줄마다 같은 테스트 안에 짝 표의 `expect`가 있다.
3. **테스트 이름**: 파일마다 `^(test|\]\))\(`로 시작하는 줄이 main과 같다.
4. **`expect` 수**: 파일마다 `expect(` 개수가 main 이상.
5. **더한 줄**: `+` 줄이 짝 표의 '더함' 칸(`again` 돕는 함수 · '다시 감정' 누르기 · `const button`)뿐.

## 실패 시나리오 (premortem)
| # | 언제 깨지나 | 어떻게 알아채나 | 막는 것 |
|---|---|---|---|
| 1 | `pushState`를 `await` 뒤에 부름 → 사용자 동작 없는 항목이라 Chrome · Safari가 '뒤로'에서 건너뜀 → 결과에서 '뒤로'가 앱을 떠남 | AC-5 ① e2e | 코드 모양: 클릭 처리 첫 줄 |
| 2 | 갸웃 중 '뒤로' 뒤 늦은 답이 입력 화면을 결과로 바꿈 · 퇴근으로 바꿈 | AC-5 ⑤ e2e · T5 단위 | `reqRef` 비교. 늦은 `daily_limit`도 버린다(U10 b 그대로) — 다시 누르면 서버가 또 알려 준다 |
| 3 | 상태를 화면 컴포넌트 안으로 옮겨 입력 화면이 내려갈 때 사진 · 미리보기 · `blob:` 주소가 사라짐 | AC-2 ① 미리보기 확인 | 상태는 `App`에. `revokeObjectURL` effect도 `App`에 그대로 |
| 4 | render 중 `window` · `history`를 읽어 `App.test.jsx`(node, window 없음)가 죽음 | `npm test` 빨강 | 처리 함수 · effect 안에서만 |
| 5 | 처음 열 때 · StrictMode 두 번 실행에서 초점을 뺏음 | AC-5 ⑥ · T1 처음 화면 `activeElement === body` | 앞 `screen` ref 비교 |
| 6 | 안내 문구를 버튼 앞에 두거나 `aria-describedby`를 늘 둘로 둠 → `connect.test.jsx` · `connect-screen.spec.js` 빨강 | `npm test` · e2e | busy일 때만 둘, 문구는 버튼 뒤 |
| 7 | 누가 화면에 경로 주소를 더함 → 로컬은 되고 배포에서만 404 | T5 e2e: 모든 화면에서 `pathname === '/'` · `hash === ''` | ADR-0008 |
| 8 | e2e가 고치기 전에도 초록(페이지가 짧아 카드가 원래 화면 안) → 빨강 확인이 거짓 | T4 단계 2 | `scrollY > 0` 확인 · 빨강 이유가 `toBeInViewport`인지 봄. 아니면 멈춤 |
| 9 | iOS Safari 도구 막대가 카드 아래 끝 · '다시 감정'을 가림(548은 어림값) | AC-6 (a) 사진 | 결과 화면이 짧아 위에 붙음. 가려지면 AC-6 ✘ → 세션이 값 바꾸지 않고 멈춤 |
| 10 | 빠른 두 번 탭으로 요청 둘 | AC-1 단위(같은 버튼 두 번) | 첫 클릭에서 버튼이 DOM에서 빠짐 + `busy` |
| 11 | `first-flow.spec.js` 67줄 `갸웃` 잡기 흔들림(전부터 있던 것 — 응답이 빠르면 갸웃이 짧음) | CI 가끔 빨강 | 이번에 손대지 않는다. 흔들리면 느슨하게 고치지 말고 멈추고 알린다 |
| 건너뜀 | `popstate`로 입력에 돌아올 때 브라우저가 옛 스크롤 위치를 되살림(`scrollRestoration`) — 입력 화면 위치는 AC가 아니고, 결과 화면은 history로 오지 않음 · 브라우저 쪽 로그 없음(앱에 로그가 원래 없음 — 서버 로그가 AC-6 (d)로 본다) · '다시 감정' 뒤 '뒤로' 한 번이 겉으로 아무것도 안 바뀜(ADR-0008 '나빠지는 것') | — | 일부러 건너뜀 |

## 바뀌는 파일
| 파일 | 하는 일 | 누가 | AC |
|---|---|---|---|
| `app/src/App.jsx` | `screen` · `busy` · `reqRef` · `toInput` · history · 초점/스크롤 effect · 화면별 그리기 · '다시 감정' | frontend-dev | 1~5 |
| `app/src/options.js` | `BUSY_TEXT` 한 줄(주석: `CAREER-32 plan A1 — not in contracts`) | frontend-dev | 5 |
| `app/tests/ThreeScreens.test.jsx` (새로) | AC-1 · AC-2 · AC-3 단위 | test-writer | 1·2·3 |
| `app/tests/ScreenHistory.test.jsx` (새로) | AC-5 ⑤ · A1 초점 · `popstate` 단위 | test-writer | 5 |
| `e2e/three-screens-view.spec.js` (새로) | AC-4 | test-writer | 4 |
| `e2e/three-screens-history.spec.js` (새로) | AC-5 | test-writer | 5 |
| 이미 있는 테스트 5개 | A4 옮기기 | test-writer | 7 |
| `docs/adr/0008-screens-without-url-change.md` (새로, 이 세션) | A1 주소 · history | architect | — |

- 건드리지 않는 것: `appraise.js` · `photo.js` · `main.jsx` · `connect.test.jsx` · `App.test.jsx` · `appraise.test.js` · `photo.test.js` · `e2e/playwright.config.js` · `photo-fixtures.js` · `guard-8787.js` · `api/` · `infra/` · `contracts/` · `pipeline.config.json`
- **새 의존성: 없음** (라우터를 넣지 않으므로 크기 · 이유를 적을 것도 없다)

## 사용자가 정할 것
1. 이 plan(A1~A4) · ADR-0008(제안 → 확정) 승인. contracts는 바뀌지 않는다
2. U10 (b) 안내 글자 `BUSY_TEXT` — "앞 감정을 마무리하는 중이에요. 끝나면 다시 누를 수 있어요." 그대로 — 사용자 확정 (2026-10-31)

## spec에 대한 메모 (고칠 필요는 없음 — 사용자 판단)
- 가정 6 끝의 "(AC-6)"은 지금 번호로 AC-7이다(완료 조건이 아니라 tasks에 영향 없음)
- AC-5 ③ "①에 이어"는 ①의 '뒤로' 바로 뒤로도, 두 번째 결과 뒤로도 읽힌다. 이 plan은 둘 다 맞으므로 tasks T5가 두 읽기를 모두 확인한다

## AC ↔ 작업
| AC | 빨강 | 초록 | 그 밖 |
|---|---|---|---|
| AC-1 | T1 | F1 | A1 초점 |
| AC-2 | T2 | F2 | — |
| AC-3 | T3 | F1 | U9 (a) |
| AC-4 | T4 | F3 (F1의 `scrollTop`으로 먼저 초록일 수 있음) | A2 |
| AC-5 | T5 | F4 | ADR-0008 · U10 (b) |
| AC-6 | — | — | H1 (사람 · 머지 · 배포 뒤) |
| AC-7 | T6 | F1 | P1 (A4 확인 명령) |

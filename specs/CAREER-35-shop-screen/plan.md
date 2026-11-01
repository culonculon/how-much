[CAREER-35](https://culonculon98.atlassian.net/browse/CAREER-35) · spec: [spec.md](spec.md) · 작업: [tasks.md](tasks.md) · 시안: [mockup-v3.html](mockup-v3.html) · 약속: [contracts/appraise.md](../../contracts/appraise.md) §5(표정 줄만, 아래 후보) · 결정: [ADR-0009](../../docs/adr/0009-six-steps-history-ladder.md)(확정)

상태: 승인됨 (2026-11-01)
<!-- 이 글을 쓴 세션은 코드 · 빌드 · 네트워크를 돌리지 않았다(읽기와 grep만). '확인 못 함'은 그 뜻이다. -->

## 한 줄
화면 상태 `view`로 6단계 중 하나만 그리고, 표정 · 물건은 시안 지도를 옮긴 데이터에서 SVG로 그리며, 갈무리는 파일을 복사해 넣는다. 주소는 `/`, 라우터 · 새 의존성 · `api/` · `infra/` 변경 없음. 앞 task만으로 AC-1~13이 서고, 움직임은 뒤쪽 task(D1~D6)로 뗀다.

## A1 — 화면 · history · 초점 · 표정 읽기 (ADR-0009)
| 무엇 | 정한 것 | 버린 것 · 왜 아님 |
|---|---|---|
| 화면 상태 | `view`: `door` · `photo` · `tags` · `price` · `thinking` · `result`. 실패 · 퇴근은 `result` + `status` · `error`(지금과 같은 뜻). 화면은 조건부로 그리고 고른 것은 전부 `App`에 둔다 | `hidden`으로 감추기: '없음'의 뜻이 테스트마다 갈린다(CAREER-32 A1 그대로) |
| history | 칸에 깊이 숫자만 적는다. `{ howMuch: n }`, door=0 · photo=1 · tags=2 · price=3 · thinking/result=4. 가려는 깊이가 지금 칸보다 클 때만 클릭 안에서 `pushState` | 칸에 화면 이름 적기 · `history.go` · 늘 push: ADR-0009 대안 1~3 |
| `popstate` | 칸 숫자가 **줄었을 때만** `reqRef++` 후 앞 화면으로. 그대로이거나 늘면(앞으로) 화면을 안 바꾼다 | '앞으로'로 앞 단계 되살리기: 옛 결과 · 사진 없는 화면을 따로 막아야 한다 |
| 앞 화면 | `photo→door` · `tags→photo` · `price→tags` · `thinking→price` · `result→price` · `door→door` | — |
| 표정 읽기(AC-4) | `<svg data-testid="uncle" data-face="base">`. daily_limit에는 이 요소가 없다. 장면은 `data-testid="shop-scene"` `data-scene="day|night"`, 물건은 `data-testid="shop-item"` `data-item`, 계산대 `data-testid="shop-counter"`, 팻말 `data-testid="closed-sign"`. 화면 단위 · e2e가 같은 방법으로 읽는다 | 표정을 글자로 숨겨 두기: AT에 읽혀 AC-8과 부딪친다 / 스크린샷 대조: CI 글꼴 · 환경에 흔들린다 |

### 코드 모양 (frontend-dev는 이대로 쓴다, 이름 고정)
```js
const DEPTH = { door: 0, photo: 1, tags: 2, price: 3, thinking: 4, result: 4 }
const PREV = { door: 'door', photo: 'door', tags: 'photo', price: 'tags', thinking: 'price', result: 'price' }
const entryOf = (state) => (Number.isInteger(state?.howMuch) ? state.howMuch : 0) // old tabs hold { howMuch: 'out' }

// Call only from click handlers: pushState needs user activation (ADR-0009).
function advance(next) {
  if (DEPTH[next] > entryRef.current) {
    entryRef.current = DEPTH[next]
    history.pushState({ howMuch: DEPTH[next] }, '')
  }
  setView(next)
}

useEffect(() => {
  entryRef.current = entryOf(history.state)
  const onPop = (e) => {
    const entry = entryOf(e.state)
    const back = entry < entryRef.current
    entryRef.current = entry
    if (!back) return
    reqRef.current++
    setView((v) => PREV[v])
    setStatus((s) => (s === 'off' ? 'off' : 'idle'))
  }
  window.addEventListener('popstate', onPop)
  return () => window.removeEventListener('popstate', onPop)
}, [])

function faceOf(view, status, error) {
  if (view === 'door') return 'happy'
  if (view === 'thinking') return 'think'
  if (view !== 'result') return 'base'
  if (status === 'done') return 'happy'
  if (status === 'off') return null // no uncle: dark shop
  return { refused: 'frown', person_limit: 'sleepy' }[error] ?? 'sweat'
}
```
- `submit`은 CAREER-32 모양 그대로이고 첫 줄만 `advance('thinking')`(**`await` 전**)이다. `busy` · `finally` · R1 초점 처리는 그대로 둔다.
- `history` · `window` · `document`는 처리 함수와 effect 안에서만 읽는다(`App.test.jsx`가 window 없이 그린다).

### 상태 흐름
| 지금 | 일 | 다음 `view` / `status` | 그 밖 |
|---|---|---|---|
| door | '가게에 들어가기' | `advance('photo')` | — |
| photo | '다음 ▶' (`photo` 있음) | `advance('tags')` | — |
| tags | '다음 ▶' (태그 0개 가능) | `advance('price')` | — |
| price | '감정 받기!' (`photo && myPrice && !busy`) | `advance('thinking')` / thinking | `error` 지움 · `busy=true` · `id=++reqRef` |
| thinking | 성공 (`id === reqRef`) | result / done | — |
| thinking | `daily_limit` | result / off | — |
| thinking | `invalid_input` | **photo** / idle | `error='invalid_input'`, history는 건드리지 않음 |
| thinking | 그 밖 실패 | result / idle | `error` = 코드(모르면 `unavailable`) |
| thinking | 답 `id !== reqRef` | 그대로 | 버림. `finally`에서 `busy=false` |
| result(refused) | '사진 다시 꺼내기' | photo / idle | 고른 것 · 문구 그대로 |
| result(unavailable · person_limit) | 버튼 | price / idle | 고른 것 · 문구 그대로 |
| result(off) | '내일 다시 오기' | price / off | 고른 것 · 퇴근 문구 그대로 |
| result(done) | '다른 물건 꺼내기' | photo / idle | `photo` · `previewUrl` · `fileError` · `myPrice` · `tags` · `result` · `error` 모두 비움 |
| 어디서든 | `popstate`로 칸이 줄어듦 | `PREV[view]` / off면 off, 아니면 idle | `reqRef++` · `error` 그대로(Q2 '남긴다') |
| photo | 사진 고르기 | 그대로 | `error` 지움 · `off` 그대로(contracts §5) |

버튼은 `setView`만 부르고 history를 건드리지 않는다. 칸이 남는 쪽(칸 ≥ 깊이)이라 다음 '뒤로'도 제대로 동작한다. '다른 물건 꺼내기'도 칸을 더 쌓지 않으므로 몇 번을 해도 칸은 5개를 넘지 않는다.

### 초점 · 이름표 (AC-8, Q3 A)
`useLayoutEffect`가 `view`가 **바뀔 때만** `scrollTop = 0` 뒤 `focus({ preventScroll: true })`를 한다(CAREER-32의 앞 값 ref 그대로, 앞 `view`도 ref에 둔다).

| 도착 | 초점 | 이름표 |
|---|---|---|
| door · photo · tags · price (앞 화면이 아래 줄이 아닐 때) | 대사 창 | 대사 창 `role="group"` `aria-label` = `가게 문` · `물건 꺼내기` · `사연 말하기` · `내 값 부르기`, `tabIndex={-1}`, `aria-describedby="step-line"`(대사 글) |
| price (앞 화면이 thinking · result) | '감정 받기!', 꺼져 있으면 `#busy-note` | CAREER-32 그대로. 지금 테스트 'popstate on a result … focus on submit' · R1이 이것을 본다 |
| photo (앞 화면이 thinking = invalid_input) | `appraise-error` | AC-8 '실패는 appraise-error' |
| thinking | `role="status"` `aria-label="감정사 아저씨"` 칸 | 칸 안에 대사, 막대는 `role="progressbar"` `aria-label="감정 중"`(`aria-valuenow` 없음 = 끝을 모름, AC-1 숫자 없음) |
| result(done) | `section[aria-label="감정 결과"]` | 그 안에 대사 창 `role="group"` `aria-label="값 공개"`와 값 창. `mascot-line`은 이 영역 안 |
| result(실패) | `appraise-error` | — |
| result(off) | `role="status"` 칸 | 칸 안에 `off-duty`(contracts §5 그대로) |

- `role="status"` 칸은 어느 화면에나 늘 있고 비어 있을 수 있다(라이브 영역은 미리 있어야 읽힌다). 비었을 때는 `.win` 모양을 주지 않는다. ④에 남은 퇴근 문구도 이 칸 안이다.
- **그리는 글자 규칙**: `▶` · `▼` · `_` · `◀` · `↻` · `⚠` · `▲` · `=`는 `<span aria-hidden="true">`로 싼다. 문구에는 `<br>`을 넣지 않는다(`appraise-error` · `off-duty`의 `textContent`가 글자 그대로여야 함). 줄바꿈은 폭에 맡긴다. `mascot-line` 안에 `▼`를 넣지 않는다.
- **고른 칩 `▶`**: 칩 안에 빈 `<span class="chip-mark" aria-hidden="true">`를 두고 `[aria-pressed="true"] .chip-mark::before { content: "▶\FE0E " }`로 그린다. 시안의 `.chip.on::before`는 AT에 읽히고, 글자를 DOM에 넣으면 칩 `textContent`를 보는 지금 테스트가 깨진다. `\FE0E`는 iOS가 `▶` · `◀`를 이모지로 그리지 않게 한다. 버튼 안 `▶` · `◀`에도 같게 붙인다.
- **값 모양(가정 4)**: `<p class="price"><span aria-hidden="true" data-testid="appraised-shown">🍡 × 30</span><span class="sr-only" data-testid="appraised-price">모찌 30개</span></p>`. 내 값도 `my-shown` · `my-price`로 같고, `never`는 둘 다 `안 팔아`다. 그래서 `textContent`를 보는 지금 `expect`가 그대로 산다. `.price`에 `position: relative`를 줘 `sr-only`가 값 영역 안에 머문다(AC-11 `toBeInViewport`).
- **리전 안내 자리**: DOM은 지금처럼 `#region-notice` 바로 뒤가 '감정 받기!'다(`connect.test.jsx` · `#region-notice + button`). 시안은 안내가 버튼 아래이므로 `display: flex; flex-direction: column`인 칸에서 CSS `order`로 아래에 보낸다. 읽는 차례는 안내 → 버튼으로 남는다.
- **사진 칸**: `<input type="file" aria-label="사진 고르기">`을 눈에만 숨기고 `<label class="win drop">`에 시안의 `[ 📷 사진 꺼내기 ]`를 `aria-hidden`으로 보인다. 지금 테스트 `getByLabelText('사진 고르기')`와 AC-1 표현이 그대로다. 사진을 고르면 그 자리에 미리보기(`alt="고른 사진 미리보기"`). 초점 링은 `label:focus-within`.
- **제목**: `<h1>how-much</h1>`은 늘 둔다. ①에서는 `.sign`(`text-transform: uppercase`로 `HOW-MUCH`), 다른 화면에서는 `.sr-only`다. `App.test.jsx`가 소문자 `how-much`를 찾는다.
- `index.html` `lang="en"` → `lang="ko"`. 이대로면 VoiceOver가 한국어를 영어로 읽는다(AC-8).

### 글자의 원본 (`app/src/options.js`에 더함)
`PRICES`에 `mochi`(1 · 10 · 100 · `null`). 대사 · 버튼 · 비교 글자는 시안과 spec Q7 그대로 옮긴다. 비교는 `{ mark, text }`로 두어 `mark`만 `aria-hidden`이다(`compare-line`의 `textContent`는 `▼ 아저씨는 좀 짜게 봤다`).

| 화면 | 글자 |
|---|---|
| ① | `동네 감정소` / `값은 아저씨 마음대로` · 버튼 `▶ 가게에 들어가기_` (이름 `가게에 들어가기`) |
| ② ③ ④ | `어서 오게. 뭘 가져왔나?` / `꺼내 보게.` · `흠, 이건 어쩌다 자네 손에 왔나?` · `자네는 이걸 얼마로 치나?` · 앞에 `감정사`(`.who`) · 끝에 `▼` · 버튼 `다음 ▶`(이름 `다음`) · `감정 받기!` |
| ⑤ | `🔍 어디 보자… 흐음…` |
| ⑥ | `아저씨 감정가` · `내가 부른 값` · `다른 물건 꺼내기` · 비교 네 줄 |
| 실패 | refused `◀ 사진 다시 꺼내기` · unavailable `↻ 다시 감정 받기` + `고른 사진·사연·값은 그대로 남아 있어요` · person_limit `조금 뒤에 다시` · daily_limit `내일 다시 오기`(뒤 둘은 `.fade`지만 눌린다, Q8) · 팻말 `오늘 영업 끝` |

`↻ 다시 감정 받기`의 이름이 `감정 받기`를 포함하므로 **e2e는 `{ name: '감정 받기!', exact: true }`로 찾는다**.

### 신뢰 경계
`strict_review_areas`(guard)를 건드리지 않으므로 절을 두지 않는다. AI 호출 길은 그대로 `appraise.js → POST /api/appraise → 서버 막기`이고 `appraise`를 부르는 곳은 `App.jsx` 한 곳이다. 서버 `line`은 React 글자로만 그린다(`dangerouslySetInnerHTML` 없음).

## A2 — 도트 그림
| 후보 | 장단 | |
|---|---|---|
| 색마다 `<path>` 하나 (`M16 2h1v1h-1z…`) | 요소가 표정 하나에 약 20개로 줄어 React 비교 · 그리기 비용이 낮다. 테스트가 경로를 풀어야 한다 | **고름** |
| 칸마다 `<rect>` (시안 그대로) | 맞대기가 가장 쉽다. 표정 하나에 요소 약 1,000개(어림). 느리면 어차피 바꿔야 한다 | 버림 |
| 같은 색 가로줄을 묶은 `<rect>` | 요소 약 250개(어림). 코드 · 테스트가 가장 복잡하다 | 버림 |

- **파일**: `app/src/pixels.js`(시안의 `U` · `I` · `PU` · `PI`를 이름 그대로 복사) · `app/src/Pixel.jsx`(`Uncle` · `Item`, `memo`). `<svg viewBox shape-rendering="crispEdges" aria-hidden="true">`.
- **다시 그리는 비용**: `Uncle`은 `memo`라 표정이 바뀔 때만 다시 그린다(②③④는 그대로). 물건은 입력값이 없어 처음 한 번만 그린다. 장면 요소를 같은 자리에 두어 단계를 넘겨도 다시 만들지 않는다.
- **칸이 흐려지지 않게**: 크기는 칸 수의 정수배(표정 120 · 200 = 3 · 5배, 물건 36 = 3배)이고 가운데 맞춤은 flex로 한다. 시안의 `translateX(-50%)`는 쓰지 않는다(375px에서 반 픽셀에 걸려 흐려질 수 있음). e2e가 `width % 40 === 0` · `transform === 'none'`을 본다.
- **시안과 맞대기(AC-9)**: `app/tests/PixelMap.test.jsx`가 `../specs/CAREER-35-shop-screen/mockup-v3.html`을 읽어 끝 `<script>`에서 네 값을 꺼낸다. ① `pixels.js`와 값이 같다 ② 표정 6개 · 물건 4개를 실제로 그려 `<path>`를 풀면 칸마다 색이 지도와 같고, `.` 칸에는 아무것도 없다 ③ 크기가 40×40 · 12×10 · 12×9다 ④ 지도의 글자가 모두 팔레트에 있다(시안의 `draw`는 없는 글자를 말없이 건너뛴다). 이 세션의 grep으로는 지도 줄이 모두 12칸 또는 40칸이고 팔레트 밖 글자가 없다.
- **iPhone에서 느린지 보는 법**: 자동 검사로 두지 않는다(기기 값은 CI에 없다). AC-12를 마친 뒤 tasks H1에서 Mac Safari 웹 인스펙터로 iPhone에 붙어 ② → ③ 단계 넘김과 ⑤ 표정 바뀜을 콘솔에서 잰다. 기준은 **200ms 이하**(INP '좋음' 기준을 빌림). 넘겨도 AC ✘는 아니고 PR에 적고 알린다. 그때 줄일 곳은 CSS이지 그림 방식이 아닐 가능성이 크다.

## A3 — 갈무리
| 후보 | 장단 | |
|---|---|---|
| 파일 복사 `app/src/fonts/Galmuri11.woff2` | 새 의존성 0. 쓰는 파일만 들어간다. 저장소에 바이너리 하나가 는다. 판 올리기는 손으로 | **추천** |
| npm `galmuri` + `import 'galmuri/dist/galmuri.css'` | 판 관리가 쉽다. 다른 글꼴도 빌드에 딸려 들어가고 `font-display`를 우리가 못 정한다. 라이선스는 어차피 따로 복사한다. 새 의존성 | 버림 |

- **넣는 법**: `npm pack galmuri@2.39.3`(시안과 같은 판, 설치 스크립트가 돌지 않음)을 빈 임시 폴더에 풀어 파일만 복사한다. `shop.css`에 `@font-face { font-family: 'Galmuri11'; src: url('./fonts/Galmuri11.woff2') format('woff2'); font-display: swap }`. Vite가 해시 이름으로 내보낸다. **확인 못 함**: 묶음 안 파일 이름 · 크기(이 세션은 네트워크를 쓰지 않음, 시안 링크가 `dist/galmuri.css`까지만 보여 줌). 이름이 다르면 F6에서 멈춘다.
- **라이선스**: `app/public/licenses/Galmuri-OFL.txt`. Vite가 그대로 `dist/`에 복사하고 `deploy.yml`의 `tar -C app/dist .`에 함께 들어간다. `?url` import는 쓰지 않는다(작으면 data URL로 들어가 파일이 안 남을 수 있음). **`app/public/`은 `pipeline.config.json` 어느 구역에도 없다.** 훅은 통과하지만 구역표에 없으니 사용자가 그대로 둘지 `ui`에 더할지 정한다(사용자가 정할 것 5).
- **글자 범위**: 파일을 **줄이지 않는다.** 서버 `line`이 AI가 쓴 임의의 한글(30자 이하)이라 화면 글자만 남기면 대사가 깨진다. 직접 줄이는 일은 OFL의 Reserved Font Name 조항도 봐야 한다(묶음의 라이선스 글에서 확인). 글꼴에 없는 글자는 `"Apple SD Gothic Neo", monospace`로 넘어가고 이모지도 시스템 글꼴이다. Regular 한 벌만 넣고 `font-synthesis: none`을 준다. 시안 ⑥ 비교 줄의 `<b>`는 색만 남아 시안보다 조금 얇다.
- **글꼴이 늦을 때(AC-10)**: `font-display: swap`. `toBeVisible`은 글자가 투명해도 통과하므로, e2e는 글꼴 응답을 붙잡은 채 `FontFace.display === 'swap'`과 글자 박스 · 버튼 누르기를 함께 본다.
- **크기 재기**: F6에서 `app/dist` 파일마다 raw · gzip 바이트를 찍는다(압축이 걸리는지 확인 못 함 — 나쁜 쪽은 raw). 그 전에 **기준선을 사용자가 정한다**(사용자가 정할 것 3). 넘으면 F6에서 멈춘다.
- **새 의존성**: 파일 복사면 없음. 사용자가 npm을 고르면 PR '결정' · '새 의존성' 칸에 이름 · 이유 · 크기를 적는다.

### 배포 nginx가 `.woff2`를 맞는 종류로 내보내나 (저장소에서 본 것)
| 무엇 | 사실 | 근거 |
|---|---|---|
| how-much 설정 | `location /`에 `types` · `default_type`이 없다. **v1 `nginx.conf`의 `http` 블록에서 물려받는다** | `infra/deploy/how-much-nginx.conf` |
| v1 `nginx.conf` | 저장소에 없다(`dnf install -y nginx`가 깐 것, nginx 1.30.5) | `specs/CAREER-30-deploy/i0-facts.md` I-1 · I-11 |
| `mime.types`가 적용되는가 | **적용된다고 추론함.** 화면이 iPhone에서 실제로 떴고(10/29), `type="module"` 스크립트는 JS 종류가 아니면 브라우저가 막는다 | `docs/runbook/배포-증거-점검표.md` 33행 |
| 그 안에 `woff2` 줄이 있는가 | **확인 못 함 — U1에서 서버 읽기 막힘, H1에서 확인.** 없으면 `application/octet-stream`(패키지 기본값일 것)으로 나간다 | 서버에서만 볼 수 있음 |
| 파일이 닿는가 | 닿는다. `try_files $uri`가 `/assets/*.woff2` · `/licenses/*.txt`를 내주고 CloudFront `/*`가 GET을 넘긴다. 로컬 Vite는 이 길을 대신하지 못한다 | contracts/deploy.md §3 |

- **판단**: `infra/`는 **안 바꿔도 될 가능성이 크다.** 내가 아는 한 브라우저는 글꼴을 `Content-Type`으로 막지 않아 종류가 틀려도 글꼴은 뜬다(이 세션에서 시험하지 못함). U1에서는 서버 읽기가 막혀 못 봤으므로(사용자 답 4), H1에서 밖 주소 응답과 실제 글꼴을 본다.
- **`infra/`를 바꿔야 한다면(사용자 결정 · 함께 하는 구역 · 이 PR 밖)**: `location ~* \.woff2$ { types {} default_type font/woff2; try_files $uri =404; }`를 더하고 `setup-host.sh`를 다시 돌린다. **server 블록에 `types { font/woff2 woff2; }`를 쓰면 안 된다.** 물려받은 표 전체를 덮어써 `.js`가 깨지고 화면이 안 뜬다. AC-13이 이 PR의 `infra/` diff를 금지하므로 PR을 따로 내고, 머지 뒤에 사용자가 적용한다.

## A4 — 옮길 테스트 · 줄지 않았음을 보이는 법
파일별 짝 표는 [tasks.md T11](tasks.md#t11). 요약:

| 파일 | 왜 옮기나 |
|---|---|
| `app/tests/FirstFlow.test.jsx` | 첫 화면에서 바로 고름 · 글자(갸웃 · 도장 · 대기 · 퇴근) · '다시 감정' |
| `app/tests/ThreeScreens.test.jsx` | 위와 같음 + `expectChosen`이 한 화면 전제 |
| `app/tests/ScreenHistory.test.jsx` | 위와 같음 + `{ howMuch: 'out' }` |
| `app/tests/connect.test.jsx` | ④까지 걸어가야 안내가 보임 |
| `e2e/first-flow.spec.js` · `connect-screen.spec.js` · `daily-limit.spec.js` · `photo-upload.spec.js` | 걸어가기 · 글자 · 버튼 이름 |
| `e2e/three-screens-history.spec.js` | 위와 같음 + 뒤로 칸 수 |
| `e2e/three-screens-view.spec.js` | 위와 같음 + `press`의 `scrollY > 0` 전제(④는 이제 스크롤이 없음) |

- **spec이 꼽은 10개 밖**: `App.test.jsx`는 코드를 안 고친다. 다만 간판을 대문자 글자로 쓰면 깨져 위 '제목'으로 지킨다.
- **돕는 함수**: 걸어가기만 `app/tests/shop-steps.jsx` · `e2e/shop-steps.js`로 뺀다. **`expect`가 든 돕는 함수는 옮기지 않는다**(파일별 `expect` 수 비교가 흐려짐).
- **'다시 감정'의 뜻 나누기(Q2 · Q8)**: ⑥에서 고른 것을 남기는 길은 이제 '뒤로'다. 지금 테스트의 `again()`은 ⑥에서 '뒤로', 실패 · 퇴근에서 코드별 버튼이 된다. '다른 물건 꺼내기'(비움)는 새 테스트 T4 몫이다.
- **Playwright 설정**: **바꿀 일 없음.** 크기는 파일마다 `test.use`로 준다(CAREER-32 A2 그대로), 프로젝트 chromium 하나로 충분하다. 바꿔야 한다는 결론이 나오면 test-writer · frontend-dev는 훅에 막히므로 멈추고 사용자에게 알린다(`e2e/playwright.config.js`는 사용자가 고침).
- **runbook**: `docs/runbook/배포.md` **§6-2(161행) · §8(187행)**의 `🚶퇴근` 글자는 release-ops 몫이다(tasks R1). spec은 §8만 꼽았지만 §6-2에도 있다. 증거 점검표는 그날의 기록이라 고치지 않는다.

줄지 않았음을 보이는 법(AC-13, T11 · P1에서 돌려 PR에 붙임):
1. **이름**: 파일마다 `AC-숫자` · `CAREER-숫자`가 든 따옴표 글자를 뽑아 정렬한 목록이 main과 같다.
2. **`expect` 수**: 파일마다 `expect(` 개수가 main 이상이다.
3. **지운 줄**: `git diff -U0 origin/main`의 `-` 줄 가운데 `expect`가 든 줄은 모두 T11 짝 표의 어느 줄(짝 종류 K3 · K4 · K6)에 해당한다.
4. **글자 원본**: §5 문구는 지금처럼 `contracts/appraise.md` · `options.js`에서 읽는 그대로다.

## A5 — 375px에서의 크기
시안 270px을 그대로 1.39배 하면 ①의 장면(300 → 416px)만으로 548px을 넘는다. 그래서 **세로를 먼저 나누고** 글자는 읽기 좋은 값으로 정한다.

| 요소 | 시안(270) | 375 | 이유 |
|---|---|---|---|
| 장면 높이 (보통 / 큰) | 180 / 300 | **180 / 340** | 아래 예산. 큰 장면은 ① · ⑤ |
| 아저씨 (보통 / 큰) | 104 / 150 | **120 / 200** (3 · 5배) | 폭 비율이 시안과 비슷(32% · 53%, 시안 39% · 56%). 정수배 |
| 물건 | 30폭 | **36폭** (3배) | 정수배 |
| 대사 창 글자 | 12 | **14** · 줄 간격 1.5 | 위 칸 `감정사`는 12 |
| 칩 글자 / **칩 높이** | 11 / 약 27 | **12 / 44** | 애플 권장값. 칩 16개가 5px 간격으로 붙어 있어 잘못 눌리기 쉽다. AC-2의 24는 그대로 최소 조건이고, 44는 e2e가 따로 본다 |
| 묶음 제목 · 안내 | 11 · 10 | **12 · 12** | 10px은 iPhone에서 너무 작다 |
| 버튼 | 15 · 약 40 | **16 · 48** | — |
| 값 | 24 | **24** | 줄 예산 |
| 폭 | — | `#root { max-width: 430px; margin: auto }` | 데스크톱에서 늘어나지 않게 |

그 밖의 위치 값(선반 · 팻말 · 계산대 등)은 시안 CSS를 그대로 쓴다.

**세로 예산(계산값, 재지 않음. 통과 기준은 AC-11 e2e)**: 548 기준

| 화면 | 합 | 여유 |
|---|---|---|
| ① | 499 | 49 |
| ④ (칩 한 줄) | 443 | 105 |
| ④ + 문구 또는 바쁨 안내 | 505 | 43 |
| ⑤ | 463 | 85 |
| ⑥ (`line` 30자 = 2줄) | 489 | 59 |
| 실패 · 퇴근 | 약 360 | 약 190 |
| ② · ③ | 약 520 · 약 800 | ③은 내려도 됨(AC-11) |

- ③은 칩 7줄 · 묶음 제목 4개로 약 1.5화면이다. 44px의 값이고, 32px로 낮춰도 약 670으로 스크롤은 남는다.
- **크게 달라지는 곳(사용자에게 보임, tasks H0)**: 칩이 시안보다 굵다 · 사연 단계가 길다 · 보통 장면의 아저씨가 폭 비율로 시안보다 작다. 44와 14가 마음에 안 들면 H0에서 값만 바꾼다. AC는 그대로다.
- **확인 못 함**: Galmuri11의 권장 크기가 12px로 기억하지만 묶음 README에서 보지 못했다. 14px에서 칸이 뭉개져 보이면 H0에서 12 또는 16으로 바꾼다.

## contracts §5 고칠 문장 후보 (Q6 — 사용자 확인 뒤 U1에서 고침)
문구 · 코드 · `role` · `data-testid`는 그대로다. 표정 줄만 바꾼다. **테스트가 이 글을 파싱하므로** 표 줄의 첫 큰따옴표는 계속 문구여야 하고(`contractText`), §5 리전 안내 줄보다 앞에 `리전 안내`라는 글자를 더하면 안 된다(`connect.test.jsx`).

| 줄 | 지금 | 후보 |
|---|---|---|
| 표 `daily_limit` | `아저씨 '퇴근' 상태 \`🚶 퇴근\` (CLAUDE.md §9) · 문구 "…"` | `아저씨 없는 어두운 가게 · '오늘 영업 끝' 팻말 (CLAUDE.md §9 · CAREER-35) · 문구 "…"` (뒤는 그대로) |
| 화면 처리 CAREER-26 | `거부되면 아저씨 '갸웃'을 끝내고(\`대기\`) 위 표의 문구를` | `거부되면 감정 중 표정을 끝내고(코드별 표정은 아래 '표정 · 장면') 위 표의 문구를` |
| `person_limit` 화면 처리 | `위 '화면 처리' 그대로 — 아저씨 \`대기\`, 표의 문구를 \`appraise-error\`로. 퇴근(\`🚶 퇴근\`·\`off-duty\`)이 아니다. 새 아저씨 상태는 없다. 브라우저는…` | `위 '화면 처리' 그대로 — 아저씨 졸림 표정, 표의 문구를 \`appraise-error\`로. 퇴근(어두운 가게·\`off-duty\`)이 아니다. 브라우저는…` |
| `daily_limit` 화면 처리 | `아저씨 칸(…)을 \`🚶 퇴근\`으로 바꾸고 **그 칸 안에** … — 누르면 '갸웃'이 되고 퇴근 문구는 사라진다.` | `가게를 어둡게 하고 아저씨를 그리지 않으며, 아저씨 칸(…) **안에** … — 누르면 감정 중 표정이 되고 퇴근 문구는 사라진다.` (나머지 그대로) |
| 새 줄 (`person_limit` 줄 앞) | — | `- **표정 · 장면 (CAREER-35 — 2026-11-01 사용자 승인, ADR-0009)**: refused 찡그림 · unavailable(코드 없음 포함) 식은땀 · person_limit 졸림 · invalid_input 기본 · daily_limit 아저씨 없음. 그림은 장식이고 뜻은 위 문구로 전한다.` |
| 머리 '상태' 줄 끝 | — | `· **11/1 CAREER-35 고침 (사용자 승인 — CAREER-35 plan)**: §5 표정 줄만. 문구 · 코드 · role · data-testid는 바뀌지 않음` |

표의 `unavailable` 문구 안 `'감정 받기'`와 실제 버튼 `감정 받기!`의 작은 차이는 문구를 안 바꾸는 약속대로 둔다.

## 실패 시나리오 (premortem)
| # | 언제 깨지나 | 어떻게 알아채나 | 막는 것 |
|---|---|---|---|
| 1 | `pushState`를 `await` 뒤나 effect에서 부름 → ⑥에서 '뒤로'가 앱을 떠남 | AC-7 e2e | `advance()` 한 곳 · `submit` 첫 줄 |
| 2 | 새로고침 뒤 옛 칸이 사진 없는 ③ · ④를 띄움 | AC-7 e2e(새로고침 뒤 뒤로 · 앞으로) | 칸 내용으로 화면을 만들지 않음 |
| 3 | '다른 물건 꺼내기'에서 칸을 쌓아 ②에서 '뒤로'가 ④로 감 | AC-7 '한 단계씩' + T4 | 버튼은 history를 안 건드림 · `PREV` 표 |
| 4 | ⑤에서 '뒤로' 뒤 늦은 답이 ④를 덮음 · 버튼이 안 풀림 | AC-5 ④(그때 눌러 다시 감정까지) | `reqRef` · `finally` |
| 5 | 옛 판 탭의 `{ howMuch: 'out' }` → 숫자 비교가 깨져 '뒤로'가 멈춤 | T6 한 건 | `entryOf` |
| 6 | `▶` · `▼` · `_`가 VoiceOver에 읽힘 · 문구에 `<br>`을 넣어 글자가 달라짐 · CSS `::before`가 이름에 들어감 | AC-8 이름 · AC-5 `textContent` · T7 e2e | '그리는 글자 규칙' |
| 7 | iOS가 `▶`을 이모지로 그림(로컬 chromium에서는 안 보임) | H1 사용자 눈 | `\FE0E` |
| 8 | 지도 복사 중 한 칸 틀림 · 그리는 코드가 칸을 건너뜀 | AC-9 ① ② | 시안에서 읽어 맞댐 |
| 9 | `translateX`로 반 픽셀 → 칸이 흐려짐 | T10 `transform` 확인 · H1 눈 | flex 가운데 · 정수배 |
| 10 | 긴 `line`(30자) · 바쁨 + 안내에서 548을 넘음 | AC-11을 30자 대사 · 바쁨 · ④에 남은 문구로 잼 | 세로 예산 |
| 11 | 글꼴을 기다리는 동안 글자가 안 보임, `toBeVisible`은 통과 | T9 `display === 'swap'` | 우리 `@font-face` |
| 12 | 글꼴이 커서 LTE에서 느림 | F6 크기 표 · H1 | 기준선 넘으면 멈춤. 글자는 swap으로 먼저 보임 |
| 13 | 배포 응답이 `octet-stream`이거나 글꼴이 안 뜸(Vite로는 안 보임) | H1 `curl` · 눈 (U1 서버 읽기는 막힘) | A3 표 · 바꾸면 따로 PR |
| 14 | CI에 이모지 글꼴이 달라 칩이 줄바꿈되어 AC-11이 CI에서만 빨강 | PR CI | ④ 칩 여유 24px 이상 · 빨강이면 느슨하게 고치지 않고 멈춤 |
| 15 | 테스트 옮기다 확인이 사라짐 | A4 방법 1~3 | T11 짝 표 |
| 16 | CAREER-34가 ⑥을 같이 고쳐 충돌 | 머지 때 | Q11: 이 스토리 먼저 |
| 건너뜀 | Safari에서 다른 사이트로 나갔다 돌아올 때의 뒤로/앞으로 캐시(화면이 그대로 복원되어 AC를 어기지 않음) · 흐린 버튼의 글자 대비(Q8에서 시안대로 정함) · ① 도착 후 '뒤로' 헛눌림 최대 4번(ADR-0009 받아들임) · 화면 쪽 오류 로그(원래 없고 서버 로그가 AC-12 (d)로 봄) · 앞으로로 앞 단계 되살리기(ADR-0009) | — | 일부러 건너뜀 |

## 바뀌는 파일
| 파일 | 하는 일 | 누가 | AC |
|---|---|---|---|
| `app/src/App.jsx` | `view` · history · 초점 · 화면별 그리기 | frontend-dev | 1~8 |
| `app/src/options.js` | 대사 · 버튼 · 비교 글자 · `PRICES.mochi` | frontend-dev | 1·6 |
| `app/src/pixels.js` · `app/src/Pixel.jsx` (새로) | 지도 · `Uncle` · `Item` | frontend-dev | 4·9 |
| `app/src/Shop.jsx` (새로) | 장면(벽 · 선반 · 물건 · 간판 · 계산대 · 팻말) | frontend-dev | 4 |
| `app/src/shop.css` (새로, `main.jsx`에서 import) | 모든 모양 · `@font-face` · A5 값 | frontend-dev | 2·10·11 |
| `app/src/main.jsx` · `app/index.html` | css import 한 줄 · `lang="ko"` | frontend-dev | 8·10 |
| `app/src/fonts/Galmuri11.woff2` · `app/public/licenses/Galmuri-OFL.txt` (새로) | 글꼴 · 라이선스 | frontend-dev | 10 |
| `app/tests/shop-steps.jsx` · `e2e/shop-steps.js` (새로) | 걸어가기 돕는 함수 | test-writer | — |
| `app/tests/Shop*.test.jsx` · `PixelMap.test.jsx` · `FontBuild.test.js` (새로) | AC-1·2·4·5·6·8·9·10 | test-writer | 표 아래 |
| `e2e/shop-*.spec.js` (새로) | AC-2 · 3 · 7 · 8 · 10 · 11 · 화면 찍기 | test-writer | 표 아래 |
| 이미 있는 테스트 10개 | A4 옮기기 | test-writer | 13 |
| `contracts/appraise.md` | §5 표정 줄 (U1, 후보대로) | architect · 사용자 확인 | 13 |
| `docs/adr/0009-…` · `0008-…` 상태 | 대체 | architect · 사용자 승인 | — |
| `docs/runbook/배포.md` | §6-2 · §8 글자 | release-ops | — |

- 건드리지 않는 것: `appraise.js` · `photo.js` · `App.test.jsx` · `appraise.test.js` · `photo.test.js` · `e2e/playwright.config.js` · `photo-fixtures.js` · `guard-8787.js` · `vite.config.js` · `eslint.config.js` · `mockup-v3.html` · `api/` · `infra/` · `pipeline.config.json` · CLAUDE.md
- **새 의존성: 없음**(파일 복사 추천 기준).

## 사용자가 정할 것
1. 이 plan · ADR-0009(제안 → 확정) · **contracts §5 후보** 승인. 함께 볼 판단 둘: ⑤ · ⑥ · 실패에서 ④로 돌아오면 초점은 대사 창이 아니라 CAREER-32처럼 '감정 받기!'(Q3 'CAREER-32 그대로'로 읽음) · ①로 내려온 뒤 '뒤로' 헛눌림 최대 4번(ADR-0009)
2. 갈무리 넣는 법: **파일 복사(추천, 새 의존성 0)** / npm
3. **무게 기준선(LTE 첫 화면, 재기 전에)** — 첫 화면 전송 합계(html · js · css · 글꼴, 압축이 안 걸린다고 보고). 시간은 LTE 10Mbps 가정의 전송 시간만이다
   - **A 1MB 이하(추천, 약 0.8초)**: 글꼴을 통째로 쓰는 전제에서 현실적이고, swap이라 글자는 그 전에 보인다
   - B 500KB 이하(약 0.4초): 글꼴 크기에 따라 못 맞출 수 있고, 그러면 글꼴 줄이기(라이선스 확인)가 일이 된다
   - C 기준 없이 잰 값만 PR에 적는다
4. **서버에서 한 번 봐 주세요**(읽기만): `sudo nginx -T 2>/dev/null | grep -nE 'mime.types|default_type|woff2'`. `woff2`가 없어도 `infra/`는 바로 바꾸지 않고 H1에서 글꼴이 뜨는지 본 뒤 정하는 것을 추천합니다(A3)
5. `app/public/`이 구역표에 없습니다. **그대로 둠(추천, 라이선스 한 파일뿐)** / `pipeline.config.json` `ui`에 더함(사용자만 고칠 수 있음)
6. A5 값(칩 44 · 대사 14 등)은 H0 화면 찍기를 보고 정합니다
7. Q10(CLAUDE.md §1)은 사용자가 고칩니다. 이 plan과 상관없이 진행됩니다

### 사용자 답 (2026-11-01)
1. plan · ADR-0009 · contracts §5 후보 **승인**. 함께 볼 판단 둘(④로 돌아오면 초점은 '감정 받기!' · ①에서 '뒤로' 헛눌림 최대 4번)도 그대로 받아들임
2. 갈무리: **파일 복사**(새 의존성 0)
3. 무게 기준선: **A — LTE 첫 화면 전송 합계 1MB 이하 = 1,000,000바이트 이하**(사용자 2026-11-01, F6 판정 기준)
4. 서버 nginx `.woff2`: **확인 못 함 — U1에서 서버 읽기 막힘, H1에서 확인**(사용자가 나중에 위 명령을 돌리거나 H1에서 글꼴이 뜨는지 본다). `infra/`는 바꾸지 않음
5. `app/public/`: 구역표에 더하지 않고 **그대로 둠**
6. A5 값: H0 화면 찍기를 보고 정함 (그대로)
7. CLAUDE.md §1: 사용자가 고침 (그대로)

## spec에 대한 메모 (spec을 고칠 필요는 없음 — 사용자 판단)
- **CAREER-29 테스트 이름 'region notice is visible before picking a photo' · 'shows before and after picking'**: AC-1대로면 안내는 ④에서만 보여 **사진을 고른 뒤**다. CAREER-29 AC-2의 뜻인 '사진이 나가기 전에 먼저 보인다'는 지켜진다. 다만 AC-13이 이름을 못 바꾸게 하므로 이름과 내용이 어긋난다. 이 plan은 이름을 두고 ④에서 **가격을 고르기 전** · 고른 뒤를 보며, 주석으로 이유를 적는다. 같은 까닭으로 'three screens' · 'at most one entry' 이름도 남는다
- **Q5 끝 차례의 '두구두구'**: Q1 A(바로 ⑥)와 AC-6이 어긋나고 AC-8 · AC-11 시험도 늘어난다. D6은 시간이 남아도 사용자 결정 없이 만들지 않는다
- **AC-2 '화면 단위 테스트'**: 칩 높이와 CSS로 그린 `▶`는 jsdom이 볼 수 없어 e2e로 본다. 뜻은 같다
- **A4의 runbook**: spec은 §8만 적었지만 §6-2에도 같은 글자가 있어 R1에 함께 넣었다

## AC ↔ 작업
| AC | 빨강 | 초록 | 그 밖 |
|---|---|---|---|
| AC-1 · AC-2 | T1 · T10(높이 · `▶`) | F1 | — |
| AC-3 | T2 | F2 | — |
| AC-4 | T3 | F5 | — |
| AC-5 | T4 | F3 | — |
| AC-6 | T5 | F4 | — |
| AC-7 | T6 | F2 | ADR-0009 |
| AC-8 | T7 | F1 | — |
| AC-9 | T8 | F5 | — |
| AC-10 | T9 | F6 | U1 ②③④, H1 |
| AC-11 | T10 | F7 | H0 |
| AC-12 | — | — | H1 (사람 · 머지 · 배포 뒤) |
| AC-13 | T11 | F1~F7 | P1 |
| Q5 미룰 것 | D1~D6 각각 | 〃 | 없어도 위 AC가 모두 선다 |

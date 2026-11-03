[CAREER-37](https://culonculon98.atlassian.net/browse/CAREER-37) · spec: [spec.md](spec.md) · 결정: 새 ADR 없음(A1) · 약속: contracts 바꾸지 않음

상태: 승인됨 (2026-11-03)
<!-- 이 글을 쓴 세션은 셸이 없어 코드 · 테스트 · 브라우저를 돌리지 않았다(읽기와 grep만). 아래 명령은 앞 세션 · 만들기 세션이 돌린다. iOS · 카톡 동작은 사용자의 시험 페이지 답(Q1)뿐이고 이 세션이 본 적은 없다. -->

## 한 줄
`ShareRow.jsx`의 공유 인자 한 줄을 `{ files: [card], url: location.origin + '/' }`로 바꾼다. `canShare`도 **같은 객체**로 묻고, false면 지금처럼 저장한다(U1 (a)). 카드 그림 · 저장 · 서버 · 인프라 · contracts · Playwright 설정은 그대로다. 새 의존성 없음.

## 고른 것 — 왜 이 모양인가
| 뼈대 | 지켜 주는 것 | 왜 |
|---|---|---|
| `data`를 **한 번** 만들어 `canShare(data)`와 `share(data)`에 같은 객체를 넘긴다 | AC-1 '같은 키·값으로 먼저 물음' · AC-3 ④ | 두 번 만들면 어긋날 수 있다. 같은 객체면 어긋날 길이 없다 |
| 키 차례는 `files` → `url` | AC-1 `keys`가 `['files', 'url']` (`toEqual`은 차례를 본다) | 객체 리터럴의 쓴 차례가 `Object.keys` 차례다 |
| 주소는 그 자리에서 `location.origin + '/'` (상수 · 설정 · 도우미 함수 없음) | AC-2 · U2 (a) | 카드 글자(`shareCard.js` 65행 `location.host`)와 원본이 같다. 한 곳에서만 쓰므로 `options.js`로 빼지 않는다 |
| 저장 분기 조건은 그대로 — 넘길 것 전체로 `canShare`가 false면 저장 | AC-3 ①~④ · U1 (a) | 갈래가 늘지 않는다. CAREER-34 AC-6 · CAREER-36 저장 규칙과 그대로 맞는다 |
| `press()` 안에 `await`가 늘지 않는다 | AC-1 `userActivation` · `toBlob` 수 | 더하는 것은 글자 하나다. 그림은 지금처럼 ⑥ 도착 때 미리 그린다 |

### 버린 대안 (한 줄씩)
- `url`을 `options.js` 상수로: U2 (b) — 원본이 둘이 되고 테스트 서버 주소와 어긋난다
- `url`을 `VITE_` 환경변수 · `contracts/deploy.md`로: U2 (c) — contracts · CI를 건드린다. 도메인을 정할 때(11/8 뒤) 다시 볼 후보
- `canShare({ files })`만 묻고 `share`에 `url`을 더해 넘김: AC-1 '같은 키·값' 위반. `url`을 못 받는 기기에서 `share`가 거부돼 ⑤⑥ 문구로 빠진다
- false면 `files`만으로 다시 묻기: U1 (b) — 사용자가 고르지 않음, 주소가 조용히 빠진다
- `new URL('/', location.href).href`: 결과는 같지만 spec · AC-1이 `location.origin + '/'`로 적혀 있어 글자 그대로 쓴다

## architect 몫 (spec A1~A3)
### A1 새 ADR — **만들지 않는다**. PR '결정' 칸에 적는다
- ADR-0009는 "주소는 언제나 `/`", "주소로 화면을 열 수 없다 — 공유 카드가 주소를 쓰려면 대체해야 한다"(42행)이다. 넘기는 주소가 `/` 하나이고 받은 사람은 ① 가게 문에서 시작하므로 **주소로 화면을 여는 일이 없다** → 대체하지 않는다.
- ADR-0010(카드는 값 없이 브라우저에서 그림)은 `share` 인자를 정하지 않았고 카드 그림도 그대로다 → 대체하지 않는다.
- 되돌리기: `ShareRow.jsx` 한 줄 + 테스트 한 줄. 데이터 · 공개 API · 설정을 남기지 않으므로 '되돌리기 어려운 결정'이 아니다.
- PR '결정' 칸에 적을 것: "`share`에 `url: location.origin + '/'` 더함(U2 (a)) · 넘길 것 전체로 `canShare`, false면 저장(U1 (a)) · `text` · `title` 없음(11/3 결정 B) · ADR-0009 · 0010 그대로(plan A1)".

### A2 CAREER-34 spec AC-2 줄 — **메모 한 줄을 단다** (이 세션에서 함)
- `specs/CAREER-34-share-card/spec.md` AC-2의 "`text` · `url` · `title` 없음" 줄 **아래에** 메모 한 줄을 더했다. 원래 줄은 고치지 않는다(CAREER-34 때 기록으로 남김).
- 왜: CAREER-34 spec만 읽는 사람(reviewer · 다음 세션)이 "`url` 없음"을 지금 규칙으로 읽고 CAREER-37을 되돌릴 위험이 있다. 그대로 두는 안은 이 위험을 남기고, 원래 줄을 고치는 안은 승인된 spec의 기록을 바꾼다. 메모가 둘 다 피한다.

### A3 가짜 `canShare`가 기록할 것 — test-writer에게 넘기는 모양
`e2e/share-card.spec.js`의 `fakeShare` 안. **이미 있는 줄은 고치지 않고 줄만 더한다**(AC-6: diff의 `-` 줄이 CAREER-34 AC-2 단언 하나뿐이게).

| 어디 | 더하는 것 | 왜 |
|---|---|---|
| `const rec = …` 다음 줄 | `rec.can = []` 와 `let lastCan = null` | `canFiles`는 그대로 둔다(CAREER-34 AC-2 172행이 씀) |
| `canShare` 함수 맨 앞 | `lastCan = d` · `rec.can.push({ keys: Object.keys(d ?? {}), nfiles: d?.files?.length ?? 0, url: d?.url ?? null })` | 키 · 파일 개수 · 주소를 글자로 남긴다(`page.evaluate`로 꺼낼 수 있는 값만) |
| `canShare`의 `return mode !== 'cantshare'` **앞 줄** | `if (mode === 'cantshareurl' && d && 'url' in d) return false` | AC-3 ④: `url`이 든 인자에만 false, `files`만이면 true |
| `share`의 `const entry = {…}` 다음 줄 | `entry.url = d.url ?? null` · `entry.sameFile = !!d.files?.[0] && d.files[0] === lastCan?.files?.[0]` | `File`은 꺼낼 수 없으므로 '같은 파일 객체로 물었나'를 브라우저 안에서 참/거짓으로 남긴다 |
| 14행 mode 주석 아래 | `// CAREER-37: cantshareurl — canShare false only when url is in the data` 한 줄 | 모드 목록 |

AC-1 테스트가 보는 것: `can[0].keys`가 `s.keys`와 같음 · `can[0].url === s.url` · `can[0].nfiles === 1` · `s.sameFile === true`. 이 넷이 "같은 키·값"이다.

## 실패 시나리오 (premortem)
| # | 언제 깨지나 | 어떻게 알아채나 | 막는 것 |
|---|---|---|---|
| 1 | 키 차례가 `url` → `files`로 쓰임 | AC-1 `keys` 빨강 | 코드 모양 · 차례를 plan에 고정 |
| 2 | `canShare`는 `{files}`, `share`는 `{files,url}`로 따로 만듦 | AC-1 `can[0].keys` · AC-3 ④(현재 코드면 `share`가 불림) | `data` 한 번 만들기 |
| 3 | 누군가 false일 때 `files`만으로 다시 물음 | AC-3 ④ `can` 길이 1 · `share` 0 | U1 (a) · spec '안 할 것' |
| 4 | 쿼리 · `#` · `text`가 붙음 | AC-1 · AC-7 ㄱㄴㄷ 고의 고침 | 주소는 `origin + '/'` 글자 그대로 |
| 5 | 주소를 코드에 박음 | AC-2 `grep cloudfront.net` 0개 · AC-1 주소가 테스트 서버와 다름 | U2 (a) |
| 6 | **iOS · 카톡이 주소나 그림을 버림 / 한 메시지로 합침** | 테스트로는 못 봄 → AC-8 (c)(d) | 막을 길 없음. ✘면 spec Q1 '안 되면'대로 멈추고 사용자에게 알림(C로 바꾸기는 사용자가 고름) |
| 7 | 카톡 미리보기가 `/`를 받아 감 | AC-8 (e) — 정적 응답, `appraise` 줄 그대로 | 첫 화면은 감정을 부르지 않음(이미 그럼) |
| 8 | 받은 사람이 카톡 안 브라우저로 열어 다르게 보임 | AC-8 (d)(f)에 적음 | 가정 3: ① 화면이 보이면 됨 |
| 9 | 기존 테스트가 `keys`에 `url`이 생겨 다른 곳에서 깨짐 | `checks.app` | grep: `keys`를 보는 곳은 AC-2 175행 · AC-3 219행(`'30'` 없음만 봄 — 통과) 둘뿐 |

- **건너뜀(일부러)**: `location.origin`이 `"null"`인 경우(file:// · 샌드박스 — 배포 길이 아님) · `canShare`가 `url` 때문에 false가 되는 기기 측정(spec U1: 표준상 드묾, 그러면 저장으로 가서 지금과 같음) · 공유 창이 끝나지 않는 iOS 문제(CAREER-34 D2 그대로, 이 스토리가 바꾸지 않음) · Android · 다른 앱(spec 범위 밖).
- **신뢰 경계**: `strict_review_areas`(guard = `api/`)를 건드리지 않으므로 절을 두지 않는다. 앱이 새로 내보내는 값은 공개된 첫 화면 주소 하나이고, 결과 · 사진 · 고른 것은 담지 않는다.

## 바뀌는 파일 / 바뀌지 않는 파일
| 파일 | 하는 일 | 누가 | AC |
|---|---|---|---|
| `app/src/ShareRow.jsx` | 29행 `data`에 `url` 더함 + 주석 한 줄 | frontend-dev | 1 · 2 · 3 |
| `e2e/share-card.spec.js` | `fakeShare`에 줄 더함(A3) · CAREER-34 AC-2 단언 한 줄 · 새 테스트 2개(+연타 1) | test-writer | 1 · 3 · 6 |
| `specs/CAREER-34-share-card/spec.md` | AC-2 아래 메모 한 줄 (A2) | architect — **이 세션에서 끝남** | — |
| `specs/CAREER-37-share-link/plan.md` | 이 글 | architect | — |

- **바꾸지 않는다**: `api/` · `infra/` · `contracts/` · `app/src/shareCard.js` · `app/src/options.js` · `app/src/App.jsx` · `app/tests/**`(`ShareCard.test.jsx` 포함) · `e2e/shop-steps.js` · `e2e/playwright.config.js` · `app/package.json` · `index.html` · `.github/` · `docs/adr/`
- **contracts**: 바꿀 것 없음. 앱과 인프라가 주고받는 값(outputs · 환경변수)이 늘지 않는다 — 주소는 페이지에서 읽는다. 이 '바꿀 것 없음'을 승인받는다.
- **새 의존성: 없음.**

## 코드 모양 (frontend-dev는 이대로 쓴다)
```jsx
// app/src/ShareRow.jsx press() — 29행만 바뀐다
    // The site's front page only — no result, query or hash (ADR-0009, CAREER-37). Same source as the card text.
    const data = { files: [card], url: location.origin + '/' }
```
30행 이후(`canShare?.(data)` · `share(data)` · 저장 · 거부 · 취소)는 그대로다.

## 작업 (순서대로 · [P] 없음 — T는 한 파일, F는 T 뒤)
- 브랜치 `CAREER-37-share-link`. 테스트 커밋(T)이 구현 커밋(F)보다 먼저다. **U1 전에는 만들지 않는다.**
- 명령은 **저장소 루트**에서. 세션 보고에는 출력 그대로, PR '검사 결과' 칸에는 CI 링크만.
- 테스트가 실패하면 느슨하게 고치지 않는다. 이미 있는 테스트는 CAREER-34 AC-2 175행 말고 고치지 않는다.
- 공통 검사(이 세션은 셸이 없어 돌리지 않음 — 앞 세션 · 만들기 세션이 돌린다)
  - `unit` = `npm --prefix app run lint && { npm --prefix app test; echo "unit exit=$?"; }`
  - `e2e` = `bash -c "$(jq -r '.checks.app.e2e' pipeline.config.json)"; echo "e2e exit=$?"`
  - `share` = `(cd e2e && npx playwright test share-card.spec.js); echo "share exit=$?"` (빠른 확인용, `e2e`를 한 번 돌려 설치가 끝난 뒤)

### U1 — 사용자 승인 · 순서 1
- 담당: **사용자** (글 고침은 architect)
- 파일: `specs/CAREER-37-share-link/plan.md`
- 단계: 1. 이 plan과 'contracts 바꿀 것 없음'을 승인한다. 2. architect가 상태를 `승인됨 (날짜)`로 바꾼다. 3. 커밋(앞 세션): `CAREER-37: share link plan`
- 검사 명령: `grep -m1 -H '^상태' specs/CAREER-37-share-link/plan.md; git diff --stat origin/main -- contracts docs/adr`
- 끝난 상태: `승인됨` · contracts · adr diff 빈 줄.

### T1 — AC-1 카드와 주소를 함께 · AC-6 기존 단언 (빨강) · 순서 2
- 담당: test-writer
- 파일: `e2e/share-card.spec.js`
- AC: AC-1 · AC-6 · plan A3
- 단계
  1. `fakeShare`에 A3 표의 줄을 **더한다**(이미 있는 줄은 그대로).
  2. 175행을 `expect(s.keys).toEqual(['files', 'url']) // CAREER-37: the site url is shared too`로 바꾼다. 이 테스트의 다른 줄은 그대로.
  3. T2 블록 뒤에 `CAREER-37 AC-1 share passes the card and the site url`(`hold`, 이미 있는 `reveal` · `press` · `shared` 사용):
     - `order.slice(0, 2)`가 `['canShare', 'share']` · `share` 1번
     - `can[0].keys`가 `s.keys`와 같음 · `can[0].url === s.url` · `can[0].nfiles === 1` · `s.sameFile === true`
     - `s.keys`가 `['files', 'url']`
     - `const origin = await page.evaluate(() => location.origin)`, `s.url === origin + '/'`. `const u = new URL(s.url)`: `u.pathname === '/'` · `u.search === ''` · `u.hash === ''` · `u.host === await page.evaluate(() => location.host)`
     - `s.nfiles === 1` · `s.name === CARD_NAME` · `s.type === 'image/jpeg'` · `s.width > 0` · `s.height > 0`
     - `s.active === true` · `s.toBlobs === before` · 내려받기 0
  4. `CAREER-37 AC-1 share passes the card and the site url — double press`: `hold` · `dblclick` · `shared` · `flush` → `shareCount === 1`.
  5. `share` 돌림 → 빨강 확인. 6. 커밋: `CAREER-37: site url share e2e`
- 검사 명령: `share`
- 끝난 상태: 실패는 정확히 `CAREER-34 AC-2 share passes one image file`와 `CAREER-37 AC-1 share passes the card and the site url` 둘, 이유는 둘 다 `keys`(`['files']`를 받음). `— double press` 둘은 통과(지금도 1번이라 맞음). 나머지 그대로 통과.

### T2 — AC-3 ④ `url`과 함께는 못 받으면 저장 (빨강) · 순서 3
- 담당: test-writer
- 파일: `e2e/share-card.spec.js`
- AC: AC-3 ④ (①②③⑤⑥⑦은 CAREER-34 AC-6 · AC-7 테스트가 그대로 봄)
- 단계
  1. CAREER-34 AC-6 블록 뒤에 `CAREER-37 AC-3 falls back to download when files with url cannot be shared`(`cantshareurl`). CAREER-34 AC-6 ①②③ 테스트와 같은 모양:
     - 같은 클릭에서 내려받기 1번(`flush` 뒤에도 1번) · `share-button` 글자 `저장` · `share-note` 0개
     - `shareCount === 0` · `can`의 길이 1이고 `can[0].keys`가 `['files', 'url']` (files만으로 다시 묻지 않음 · url만 보내지 않음)
     - `stays(page, download, bytes)` · 다른 탭(`hold`, 같은 고른 것 · 답)의 공유 파일과 바이트가 같다
  2. `share` 돌림 → 빨강 확인. 3. 커밋: `CAREER-37: files with url fallback e2e`
- 검사 명령: `share`
- 끝난 상태: 새 실패가 이 테스트 하나 더(이유: 지금 코드는 `{files}`로 묻고 true를 받아 `share`가 불림 → 내려받기 이벤트를 못 받음). T1의 두 실패는 그대로.

### F1 — 주소 더하기 (초록: AC-1 · AC-2 · AC-3) · 순서 4
- 담당: frontend-dev
- 파일: `app/src/ShareRow.jsx`
- AC: AC-1~3 · plan '코드 모양'
- 단계: 1. 29행을 코드 모양대로 바꾼다(주석 한 줄 포함). 2. `unit` 다음 `share`. 3. 커밋: `CAREER-37: share the site url with the card`
- 검사 명령: `unit` 다음 `share`, 그리고 `grep -rn 'cloudfront.net' app/src; echo "grep exit=$?"`
- 끝난 상태: lint 0 · 단위 전부 통과 · `share` 실패 0 · grep 출력 없음 · `grep exit=1`.

### P1 — 전체 검사 · 고의 고침 · PR (AC-4~7) · 순서 5
- 담당: frontend-dev(검사 · 고의 고침 · PR) · reviewer · 사용자(머지)
- 파일: 없음 (PR 본문 — `.github/pull_request_template.md`)
- 단계
  1. `bash -c 'for n in lint test e2e build api; do echo "== $n"; bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)"; echo "exit=$?"; done'` → 모두 `exit=0` · 통과 수 0 아님 · 출력에 `[guard-8787] 받은 요청 0개`. 출력 그대로 보고.
  2. 고의 고침(커밋하지 않음) — 각각 `ShareRow.jsx` 29행만 바꾸고 `(cd e2e && npx playwright test share-card.spec.js -g 'CAREER-37 AC-1'); echo "exit=$?"` → **빨강 · 출력 그대로 보고** → `git restore app/src/ShareRow.jsx`
     - ㄱ `const data = { files: [card] }`
     - ㄴ `const data = { files: [card], url: location.origin + '/', text: 'how-much' }`
     - ㄷ `const data = { files: [card], url: location.origin + '/?from=card' }`
  3. diff 확인 — 모두 출력 그대로:
     - `git status --porcelain app e2e` → 빈 줄
     - `git diff --stat origin/main -- api infra contracts app/src/shareCard.js app/tests e2e/shop-steps.js e2e/playwright.config.js app/package.json pipeline.config.json` → 빈 줄
     - `git diff --name-status origin/main -- app e2e` → `M app/src/ShareRow.jsx` · `M e2e/share-card.spec.js` 둘뿐
     - `git diff -U0 origin/main -- e2e/share-card.spec.js | grep '^-[^-]'` → `expect(s.keys).toEqual(['files'])` 한 줄뿐 (AC-6)
     - `git diff origin/main -- e2e/share-card.spec.js | grep -nE '^\+.*(\.skip|toContain)'` → 출력 없음
  4. PR 제목 `CAREER-37: share the site url with the card`. 칸:
     - 결정: plan A1의 문장 그대로(새 ADR 없음 · U1 (a) · U2 (a) · `text` · `title` 없음 · ADR-0009 · 0010 그대로)
     - 범위 변경: 없음 / 새 의존성: 없음
     - 비용·남용 영향: spec 그대로 + "AC-8은 머지 · 배포 뒤 이 칸에 덧붙임"
     - spec AC-1~8 ✔/✘ 대조(AC-8은 '머지 뒤 H1')
- 검사 명령: `gh pr checks --watch`
- 끝난 상태: 필수 검사 모두 통과(`reviewer/gate` 포함) · 3단계 그대로 · ㄱㄴㄷ 빨강 출력이 세션 보고에 있다.

### H1 — iPhone 16e · 카톡 (AC-8) · 머지 · 배포 뒤
- 담당: **사용자** (배포 `docs/runbook/배포.md` §3, 로그 §5)
- 파일: 없음 (PR '비용·남용 영향' 칸에 덧붙임 · spec Q1 아래 한 줄은 spec-writer 또는 architect)
- 단계: spec AC-8 '할 때' 그대로. (c) 또는 (d)가 ✘면 멈추고 spec Q1 '안 되면'대로 사용자가 고른다.
- 검사 명령: runbook §5 로그 보기 명령으로 '공유' 전과 (d) 뒤 `appraise` 줄 수
- 끝난 상태: (a)~(f) 모두 ✔이고 PR 칸에 적혀 있다.

## AC ↔ 작업
| AC | 빨강 | 초록 | 그 밖 |
|---|---|---|---|
| AC-1 | T1 | F1 | P1 ㄱㄴㄷ |
| AC-2 | T1(`host` · `origin`) | F1 | F1 grep · reviewer diff |
| AC-3 | T2(④) · 이미 있는 CAREER-34 AC-6 · AC-7 | F1 | — |
| AC-4 · AC-5 | 이미 있는 테스트(고치지 않음) | — | P1 1 · 3 |
| AC-6 | T1 2단계 | — | P1 3 |
| AC-7 | — | — | P1 |
| AC-8 | — | — | H1 |

## 사용자가 정할 것
1. 이 plan 승인 · contracts '바꿀 것 없음' 승인.
2. A1(새 ADR 없음) · A2(CAREER-34 spec에 메모 한 줄 — 이미 달았음, 싫으면 지움) · A3(가짜 기록 모양) — 다르게 원하면 알려 주세요.

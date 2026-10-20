[CAREER-24](https://culonculon98.atlassian.net/browse/CAREER-24) · spec: [spec.md](spec.md) · 작업: [tasks.md](tasks.md)

상태: 승인됨 (2026-10-20)

## 접근 방법
Vite 공식 템플릿(`create-vite`, `react` JS 템플릿)으로 `app/`을 만들고, 화면 하나("how-much")만 남기도록 덜어 낸다. 템플릿에 없는 건 `vitest` 하나만 더한다.

### 만들어지는 파일 (끝난 뒤 `app/`의 모습)
| 파일 | 하는 일 | 담당 |
|---|---|---|
| `app/package.json` | 스크립트 `dev` · `lint` · `test` · `build` · `preview`, 의존성 | frontend-dev |
| `app/package-lock.json` | 의존성 고정 → CI가 `npm ci`로 설치 | frontend-dev |
| `app/index.html` | 진입 HTML. 파비콘은 `<link rel="icon" href="data:,">` (아래 '실패 시나리오' 4) | frontend-dev |
| `app/vite.config.js` | 템플릿 그대로(plugin-react). vitest도 이 파일을 읽는다 — 따로 vitest 설정 파일을 만들지 않는다 | frontend-dev |
| `app/eslint.config.js` | 템플릿 그대로. 만든 뒤에는 훅이 고치기를 막으니 한 번에 맞게 | frontend-dev |
| `app/.gitignore` | 템플릿 그대로(`dist` 포함) | frontend-dev |
| `app/src/main.jsx` | 템플릿 그대로(StrictMode + `#root`에 렌더) | frontend-dev |
| `app/src/App.jsx` | `export default function App`, `<h1>how-much</h1>`만 | frontend-dev |
| `app/tests/App.test.jsx` | `react-dom/server`의 `renderToString(<App />)`에 "how-much"가 있는지 | test-writer |

지우는 템플릿 파일: `app/public/`(통째로 — frontend-dev 쓰기 구역 밖), `app/src/assets/`, `app/src/App.css`, `app/src/index.css`, `app/README.md`.

### 테스트와 구현 사이의 약속 (contracts 아님 — 앱 안 약속이라 여기 적는다)
- `app/src/App.jsx`는 기본 내보내기 `App`이고, 화면에 글자 `how-much`가 있다.
- 테스트는 jsdom·Testing Library 없이 `renderToString`으로 확인한다(vitest 기본 node 환경). 화면 상호작용 테스트가 필요해지는 CAREER-22에서 jsdom을 넣을지 다시 정한다.

### 앱 스크립트 이름 (AC-2: plan에서 정함)
| `app/package.json` 스크립트 | 값 |
|---|---|
| `lint` | `eslint .` (템플릿 그대로) |
| `test` | `vitest run` — `vitest`만 쓰면 터미널에서 감시 모드로 멈춰 Stop 훅 검사가 끝나지 않는다. `--passWithNoTests`는 붙이지 않는다(AC-3) |
| `build` | `vite build` (템플릿 그대로) |

`pipeline.config.json`의 `checks.app`에 사용자가 넣을 값(제안 — CI가 쓰는 `npm ci --prefix app`와 같은 꼴):
```
"lint":  "npm --prefix app run lint",
"test":  "npm --prefix app test",
"build": "npm --prefix app run build",
"e2e":   "TODO"
```

## 열린 질문 4 답: Node 버전 · lock 파일 · `npm ci`
- **lock 파일: 쓴다.** `app/package-lock.json`을 커밋한다. CI는 이미 lock이 있으면 `npm ci`로 바꿔 탄다(`reusable-checks.yml`) — CI 쪽 고칠 것 없음.
- **Node 버전: 이번에는 고정하지 않는다.** CI는 `lts/*` 그대로 둔다. `package.json`에 `engines`도 넣지 않는다(npm은 경고만 하고 막지 않아서 효과가 없다).
- 이유: 고정하려면 떼어 낼 구역인 `reusable-checks.yml`에 `node-version-file` 입력을 더해야 해서(infra-dev, ci 구역) 뼈대 스토리 범위를 넘는다. lts가 바뀌어 깨지면 CI가 **실패로** 알려 준다(조용히 지나가지 않는다).
- 지켜볼 점: Node 26이 10월 하순에 LTS가 되면서 `lts/*`가 24 → 26으로 바뀔 수 있다. CI가 그 때문에 깨지면 그때 `.nvmrc` + `node-version-file`을 별도 스토리로 낸다.

## 고른 이유와 버린 대안
되돌리기 쉬운 결정들이라 ADR은 쓰지 않는다(아래 'ADR' 참고). 대안은 한 줄씩.

| 결정 | 고른 것 | 버린 것 · 왜 아님 |
|---|---|---|
| 뼈대 만드는 법 | `create-vite` react 템플릿 + 덜어 내기 | 손으로 처음부터: 파일 수는 같은데 ESLint flat config를 직접 짜야 하고, 만든 뒤 고치기는 훅이 막아 한 번 틀리면 비싸다 |
| lint | 템플릿 ESLint(flat config, `js.configs.recommended` → `no-unused-vars` 에러) | Biome·oxlint: 새 도구를 배우는 비용, 템플릿 기본에서 벗어남. 지금 얻는 것이 없다 |
| 테스트 렌더 | `react-dom/server` `renderToString` (새 의존성 0) | jsdom + Testing Library: 의존성 2~3개 + 환경 설정. 클릭 같은 상호작용이 없는 지금은 쓸 데가 없다 → CAREER-22에서 |
| vitest 설정 | `vite.config.js` 함께 쓰기 | `vitest.config.js` 따로: 파일 하나 더, 만든 뒤에는 훅이 고치기를 막는다 |
| Node 고정 | 안 함(`lts/*`) | `.nvmrc` + CI 입력: ci 구역까지 번진다. 위 참고 |

## 실패 시나리오 (premortem) — 각각 막는 곳
1. **테스트 0개인데 통과** → vitest는 테스트 파일이 없으면 종료 코드 1이 기본이다. `--passWithNoTests`를 쓰지 않는 것으로 막는다. 테스트 파일 이름은 `*.test.jsx`여야 기본 include에 잡힌다.
2. **`test`가 끝나지 않음** → `vitest`(감시 모드) 대신 `vitest run`.
3. **AC-4(a)가 안 잡힘** → 템플릿 규칙이 `varsIgnorePattern: '^[A-Z_]'`라서 `FOO`·`_x` 같은 이름은 안 쓰여도 통과한다. 확인할 때는 **소문자 이름**(`const unusedValue = 1`)을 쓴다. 규칙은 그대로 둔다(React 컴포넌트 import 오탐을 막는 템플릿 기본).
4. **AC-1 콘솔 에러** → `public/`을 지우면 `/vite.svg` 파비콘이 404로 콘솔 에러가 난다. `<link rel="icon" href="data:,">`로 요청 자체를 없앤다.
5. **AC-4(c)가 안 잡힘** → `vite build`는 import로 이어진 파일만 묶는다. 문법 오류는 `App.jsx`나 `main.jsx`에 넣어야 한다(따로 떨어진 새 파일이면 build가 통과해 버린다).
6. **lint가 build 결과를 검사** → 템플릿의 `globalIgnores(['dist'])`가 막는다. T2 검사는 build 뒤에 lint를 한 번 더 돌려 확인한다.
7. **CI에서만 `npm ci` 실패 (macOS에서 만든 lock에 linux용 rollup/esbuild 바이너리가 빠짐 — npm 선택 의존성 버그)** → CI에서 `Cannot find module @rollup/rollup-linux-…`가 나오면 `app/node_modules`와 lock을 지우고 `npm install`로 lock을 새로 만든다.
8. **vitest와 vite 메이저 버전이 안 맞음** → npm이 peer 충돌로 설치를 멈춘다(크게 실패). 템플릿의 vite 메이저에 맞는 vitest 버전을 고른다.
9. **`app/public/` 쓰기가 막힘** → frontend-dev 쓰기 구역은 `app/*`(바로 아래)와 `app/src/**`뿐. `create-vite`가 만든 `app/public/`은 지우고 쓰지 않는다.
10. **뼈대를 만들다 T1 테스트가 지워짐** → T1이 `app/tests/`를 먼저 만들어서 `create-vite`가 "폴더가 비어 있지 않음"을 묻는다. 'Ignore files and continue'만 고르고, 끝나면 테스트 파일이 남았는지 확인한다(tasks T2 단계 2).
- 건너뛴 것: 동시 실행·데이터 손실·외부 API — 이 스토리엔 입구도 저장소도 없다.

## contracts
**바뀌는 것 없음.** 이 스토리는 앱↔인프라 사이에 주고받는 값(Terraform outputs·환경변수)을 만들지 않는다. `contracts/`는 손대지 않는다. Vite 환경변수(`VITE_*`)도 쓰지 않는다.

## ADR
**없음.** 스택(Vite + React JS, vitest)은 CLAUDE.md에서 이미 정해졌고, 이번 결정(lint 도구, 테스트 렌더 방식, Node 고정 안 함)은 모두 되돌리기 쉽다. PR '결정' 칸에 한 줄씩 적는다. 사용자가 lock/Node 정책을 ADR로 남기길 원하면 `docs/adr/0001-…`로 쓴다.

## 신뢰 경계
해당 없음 — `strict_review_areas`(guard)를 건드리지 않고, 입력·AI 호출·과금·저장이 없다.

## 범위 밖 (spec '안 할 것' 그대로 + 이번에 생긴 것)
- jsdom · Testing Library · Playwright — CAREER-22
- Node 버전 고정(`.nvmrc`, CI 입력) — 필요해지면 별도 스토리

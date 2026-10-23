[CAREER-26](https://culonculon98.atlassian.net/browse/CAREER-26) · spec: [spec.md](spec.md) · 작업: [tasks.md](tasks.md) · 약속: [contracts/appraise.md](../../contracts/appraise.md)(고침 제안) · [contracts/appraise-http.md](../../contracts/appraise-http.md)(고치지 않음) · 결정: [ADR-0003](../../docs/adr/0003-photo-redraw-in-browser-adapter.md)(제안)

상태: 승인됨 (2026-10-23 — 사용자: S1~S5 모두 추천안대로)

## 사용자 승인이 필요한 것 (모음)
| # | 무엇 | 추천 | 후보 · 근거 | 어디에 반영 |
|---|---|---|---|---|
| S1 | **두 머지 사이 실패 화면 범위** (범위 변경) — 이번 스토리부터 화면이 진짜로 `fetch`를 한다. 화면 연결(Vite 프록시)은 다음 스토리라 그 사이 `npm run dev`에서 누르면 Vite가 404 → 어댑터 `unavailable`이 된다. `invalid_input`만 처리하면 '갸웃'에서 영원히 멈춘다(CAREER-22 plan 실패 시나리오 7) | **D: 모든 실패에서 '갸웃'을 끝내고 contracts/appraise.md §5의 문구(이미 10/21 사용자가 고른 것)를 보인다.** `daily_limit`은 아직 서버가 내지 않으니 `unavailable` 문구로(퇴근은 CAREER-27) | A `invalid_input`만(spec 그대로): 다른 실패는 갸웃에서 멈춤 / B 다른 실패는 조용히 '대기'로: 실패를 숨긴다 / C 모두 `invalid_input` 문구: 틀린 안내. D는 A보다 표 한 줄씩(3줄) 더 쓰는 정도. spec '안 할 것'의 'AI 실패 화면'과 겹치므로 PR '범위 변경' 칸에 적고, 연결 스토리는 리전 안내·프록시·진짜 서버 확인만 남는다 | plan '보내는 흐름' · contracts/appraise.md §5 · tasks T1·T3 |
| S2 | **읽을 수 없는 사진(AC-6) 안내 문구** (결정 L) | **a: `invalid_input` 문구 그대로** "사진이나 선택을 다시 골라 주세요." — 어댑터가 사진을 못 읽으면 보내지 않고 `invalid_input`으로 거부한다. 실패 길 하나, 새 코드 없음 | b 따로: "이 사진은 열 수 없어요. 다른 사진을 골라 주세요." — 실패 코드를 하나 더(예: `bad_photo`) 두거나 `error.reason`으로 가려야 해서 §5 '코드 넷'이 바뀐다 / c 고를 때 검사해 지금 있는 "사진을 다시 골라 주세요 (jpg·png)" 재사용 — 줄이기를 화면(App)으로 끌어내야 해 '보내는 곳 한 곳' 성질이 깨진다(아래 '고른 이유' 1) | contracts/appraise.md §5·§6 |
| S3 | **브라우저 목표 바이트 `TARGET_PHOTO_BYTES`** (10/21 결정 G '약 250KB'의 정확한 값과 뜻) | **250,000 바이트, '목표'이지 상한이 아님** — 품질 사다리에서 이 아래가 나오면 거기서 멈추고, 끝까지 넘으면 가장 작은 것을 `MAX_PHOTO_BYTES`(1,000,000) 이하일 때 보낸다 | 262,144(이진 256KiB): 서버 상한이 십진(1,000,000)이라 단위가 섞인다 / '목표를 상한처럼'(넘으면 안 보냄): 무늬가 많은 사진이 정상인데 거절된다. 바이트는 Nova 이미지 토큰(=비용)을 정하지 않는다(픽셀이 정함 — 1024px로 묶여 있음). 그래서 비용 영향은 요청 크기·속도뿐 | contracts/appraise.md §6 |
| S4 | **화면 연결 스토리 새로 만들기** (spec 질문 7) | 새 스토리 하나 제안 — 아래 '질문 7 답'의 범위. Jira 댓글로 올린다(만들기는 사용자) | 이 스토리에 넣기: spec '안 할 것'과 결정 A를 어김 / CAREER-27에 넣기: 비용 상한과 화면 연결은 리뷰어가 따로 판단할 일 | Jira CAREER-26 댓글(승인 뒤 architect) |
| S5 | contracts/appraise.md 고침과 ADR-0003 | 이 plan대로 승인 | — | 상태 줄 '확정' |

- spec의 열린 질문 6·8·10·11은 **CAREER-25에서 이미 사용자가 정해 확정된 contracts로 닫혔다** — 다시 묻지 않는다(아래 '열린 질문 답'). 값을 바꾸지 않는다.

## 접근 방법
사진 처리는 **감정 어댑터 `app/src/appraise.js` 한 곳**에서 한다. 화면(App)은 지금처럼 고른 `File`을 `appraise({ photo, myPrice, tags })`에 넘기고, 어댑터가 `preparePhoto(file)`(새 `app/src/photo.js`)로 **브라우저 기본 기능만으로 다시 그린 JPEG**를 만든 뒤 contracts/appraise-http.md 그대로 `POST /api/appraise`에 **한 번** 보낸다. 다시 그리기(`createImageBitmap` + `<canvas>` + `toBlob('image/jpeg')`)는 픽셀만 옮기므로 EXIF(GPS 포함)가 통째로 빠지고, `imageOrientation: 'from-image'`로 방향을 픽셀에 굽는다. 서버(`api/`)는 CAREER-25가 이미 크기·형식·GPS·픽셀을 거절하므로 **고치지 않고**, spec AC 이름으로 테스트만 더한다 — 그중 AC-10·13은 브라우저가 실제로 만든 파일로 본다. e2e는 `page.route`로 서버 입구를 가로채 보낸 바이트를 읽는다(결정 A — 진짜 서버에 연결하지 않음).

### 만들어지는 파일
| 파일 | 하는 일 | 담당 | AC |
|---|---|---|---|
| `app/src/photo.js` (새로) | 값 `MAX_EDGE_PX` 1024 · `MAX_PHOTO_BYTES` 1,000,000 · `TARGET_PHOTO_BYTES` · `JPEG_QUALITIES` (원본 contracts) · `fitWithin(width, height, maxEdge)` → `{ width, height }`(키우지 않음) · `preparePhoto(file)` → `Promise<Blob>`(image/jpeg) 또는 거부 | frontend-dev | 1~4 · 6 |
| `app/src/appraise.js` (바꿈 — 가짜를 지움) | `appraise(input)`: `preparePhoto` → 실패면 `invalid_input`(보내지 않음) → `fetch` 한 번 → appraise-http.md §5 '어댑터 규칙'으로 `{ mochi, line }` 또는 `Error{code}` | frontend-dev | 1~7 |
| `app/src/options.js` (한 덩어리 더함) | `ERROR_TEXT` — contracts/appraise.md §5 문구를 코드별로 옮김 | frontend-dev | 6 · 7 |
| `app/src/App.jsx` (고침) | `submit`에 `try/catch` — 실패면 `status: 'idle'` + 안내. 새로 고르거나 다시 누르면 안내를 지운다 | frontend-dev | 6 · 7 |
| `app/tests/photo.test.js` (새로) | `fitWithin` 표 · 값이 contracts와 같은지(파일을 읽어 비교) | test-writer | 1 · 4 |
| `app/tests/appraise.test.js` (다시 씀) | `fetch` 가짜 · `photo.js` 가짜로 요청 모양 · 응답 → 결과/코드 표 · 준비 실패면 `fetch` 0번 · '부르는 곳 하나'(CAREER-22 AC-9)는 남김 | test-writer | 5 · 6 · 7 |
| `app/tests/FirstFlow.test.jsx` (더함) | 거부되면 갸웃 끝 · 안내 · 다시 누르면 두 번째 호출 | test-writer | 7 |
| `e2e/photo-fixtures.js` (새로) | F1~F4를 **테스트 때 만든다**(브라우저 canvas로 그림 → EXIF 조각을 바이트로 끼움) · `jpegInfo(bytes)` → `{ isJpeg, width, height, hasExif }`(마커 걷기) | test-writer | 1~6 |
| `e2e/photo-upload.spec.js` (새로) | AC-1~7. 서버 입구는 `page.route`로 가로챔. AC-1 테스트가 보낸 바이트를 `testInfo.outputPath('f1-prepared.jpg')`에 쓴다(A1의 재료) | test-writer | 1~7 |
| `e2e/first-flow.spec.js` (고침) | 서버 입구 가로채기(성공 응답)를 더하고, CAREER-22 AC-10 확인('본문 있는 요청 0개')을 AC-5 규칙(본문 있는 요청은 서버 입구 1개뿐)으로 바꿈 — 결정 M | test-writer | 5 |
| `api/tests/photo-upload.test.js` (새로) | AC-8 · 9 · 10 · 11(a)(b) · 13 — 가짜 `send`로 호출 수 | 앞 세션 | 8~11 · 13 |
| `api/tests/helpers.js` (도우미 하나) | `withGpsExif(jpegBytes)` — SOI 바로 뒤에 GPS 포인터가 든 APP1 Exif를 끼움(F5) | 앞 세션 | 13 |
| `api/tests/fixtures/f1-prepared.jpg` (새로) | F1을 브라우저가 줄이고 지운 결과(e2e 출력에서 복사) | 앞 세션 | 10 · 13 |

- 고치지 않는 것: `api/src/**`(서버 동작은 그대로 — 테스트가 하나라도 실패하면 멈추고 사용자와 정함) · `contracts/appraise-http.md` · `vite.config.js`(프록시는 연결 스토리) · `infra/`(AC-11(c)) · lint·vitest·playwright 설정.
- 나누지 않은 것: 다시 그리기·품질 사다리는 `photo.js` 한 파일(~40줄). JPEG 마커 읽기는 e2e(`photo-fixtures.js`)와 api(`src/jpeg.js`)에 따로 있다 — 패키지가 다르고 e2e 쪽은 테스트용 읽기라 엮지 않는다.

### 보내는 흐름 (`appraise(input)` 한 번)
| 단계 | 끝나는 경우 → 거부 `code` |
|---|---|
| 1 그리기: `createImageBitmap(photo, { imageOrientation: 'from-image' })` | 못 읽음(F4) → `invalid_input` · **`fetch` 0번** |
| 2 크기: `fitWithin(bitmap.width, bitmap.height, MAX_EDGE_PX)` — `scale = min(1, 1024 / 긴 변)`, 각 변 `max(1, round(변 × scale))` | — |
| 3 캔버스: 그 크기 `<canvas>`, **흰색으로 칠한 뒤** `drawImage`(`imageSmoothingQuality = 'high'`), `bitmap.close()` | — |
| 4 굽기: `JPEG_QUALITIES` 차례로 `toBlob(cb, 'image/jpeg', q)` — 처음으로 `≤ TARGET_PHOTO_BYTES`인 것에서 멈춤. 모두 넘으면 마지막(가장 작은) 것 | `toBlob`이 `null` → `invalid_input` · `fetch` 0번 |
| 5 상한: 고른 Blob이 `> MAX_PHOTO_BYTES` | `invalid_input` · `fetch` 0번 |
| 6 보내기: `fetch('/api/appraise?' + URLSearchParams([['myPrice', …], ...tags.map(t => ['tags', t])]), { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob })` — **다시 시도하지 않음**(다시 누르기는 사용자 몫, 결정 J) | 네트워크 오류 → `unavailable` |
| 7 응답(믿지 않음): `res.ok`이고 본문 키가 정확히 `mochi`·`line`, `mochi` 0 이상 정수, `line` 공백만이 아님 → 성공. 아니면 본문 `code`가 넷(`invalid_input`·`refused`·`unavailable`·`daily_limit`) 중 하나면 그 코드, 그 밖(JSON 아님 등) → `unavailable` | 위 |

- 화면(App): `try { … status 'done' } catch (e) { error = ERROR_TEXT에 있는 e.code면 그것, 아니면 'unavailable'; status 'idle' }` (S1 추천 D). 사진·마음 가격은 그대로 두므로 버튼이 다시 켜진다(결정 J). 다른 사진을 고르거나 다시 누르면 안내를 지운다.
- 브라우저는 로그를 남기지 않는다(`console.*`로 사진·응답을 찍지 않음).

### 테스트와 구현 사이의 약속 (이름의 원본)
| 무엇 | 약속 |
|---|---|
| 실패 안내 | `role="alert"` + `data-testid="appraise-error"`, 글자는 contracts/appraise.md §5 문구 **그대로**(옮겨 적음). 지금 있는 고르기 경고(`사진을 다시 골라 주세요 (jpg·png)`, `role="alert"`)와는 testid로 가린다 |
| 아저씨 | 지금 그대로 `role="status"` `aria-label="감정사 아저씨"`. 실패 뒤 글자 `대기` |
| 서버 입구 요청 | 경로 `/api/appraise`(같은 출처 `http://127.0.0.1:5199`), POST, `Content-Type: image/jpeg`, 본문 = JPEG 바이트. e2e 가로채기는 `page.route((url) => url.pathname === '/api/appraise', …)` |
| e2e 성공 응답 | `200` `{"mochi":10,"line":"흠, 손때가 제법 묻었구먼"}`(contracts/appraise-http.md §4 예시) |
| e2e 거절 응답 | `400` `{"code":"invalid_input"}` · `Content-Type: application/json; charset=utf-8` |
| `photo.js` 내보내기 | `MAX_EDGE_PX` · `MAX_PHOTO_BYTES` · `TARGET_PHOTO_BYTES` · `JPEG_QUALITIES` · `fitWithin` · `preparePhoto` |

### 시험 사진 (test-writer가 테스트 때 만든다 — 파일을 저장소에 두지 않음, F1-prepared만 예외)
| 이름 | 만드는 법 | 확인 |
|---|---|---|
| F1 | 브라우저 canvas 4000×3000에 그라디언트 + 격자를 그려 `toBlob('image/jpeg', 0.9)` → SOI 바로 뒤에 APP1 Exif(IFD0: Make + GPS 포인터 `0x8825` → GPS IFD 위도·경도) 끼움 | `jpegInfo`가 `hasExif: true`, 4000×3000 |
| F2 | canvas **1200×800**(가로)에 위쪽 절반 빨강 · 아래 절반 파랑 → JPEG → APP1 Exif(IFD0: Orientation `0x0112` = 6) | 미리보기 `<img>`의 `naturalHeight > naturalWidth` |
| F3 | canvas 800×600 `toBlob('image/png')`, 일부를 투명하게 | PNG 서명 |
| F4 | `Buffer.from('이건 사진이 아니에요')`, 이름 `broken.jpg`, `image/jpeg` | — **잘린 JPEG는 쓰지 않는다**: Chromium이 잘린 JPEG를 반쯤 그려 내므로 '못 읽음'이 되지 않을 수 있다(실패 시나리오 9) |
| F5 | api 테스트에서 `withGpsExif(f1-prepared.jpg)` | 원본과 GPS APP1만 다름 |

## 열린 질문 답 (spec '열린 질문')
### 질문 4 — 줄인 뒤에도 클 때 → 품질 사다리 3단, 그래도 B를 넘으면 보내지 않고 안내
- `JPEG_QUALITIES = [0.85, 0.7, 0.55]` (architect — 되돌리기 쉬움, PR '결정' 칸). 1024×768 보통 사진은 0.85에서 150~250KB로 첫 단에 끝난다. 굽기는 최대 3번(1024px라 한 번에 수십 ms).
- 끝까지 `TARGET_PHOTO_BYTES`를 넘어도 `MAX_PHOTO_BYTES` 이하면 보낸다(S3). 넘으면 `invalid_input` — 1024px JPEG 0.55가 1MB를 넘는 일은 거의 노이즈 사진뿐이다.
- 버린 것: 픽셀을 더 줄이기(예: 768px) — 결정 F(1024px)를 사진마다 다르게 만든다 / 무한 반복(품질을 계속 낮춤) — 끝이 없고 화질이 망가진다 / 바로 안내(사다리 없음) — 목표 250KB를 거의 못 지킨다.

### 질문 6 — 서버가 픽셀도 보나 → **닫힘: 본다** (10/21 사용자 승인, contracts/appraise-http.md §3-4 `too_many_pixels`)
- 이번 스토리는 그대로 따른다. 브라우저가 1024px로 맞추므로 정상 흐름엔 영향이 없다. 이번 api 테스트에 따로 더하지 않는다(CAREER-25 `jpeg.test.js`·`server.test.js`가 1024/1025 경계를 본다).

### 질문 7 — 화면을 진짜 서버에 연결하는 일 → **새 스토리 제안 (S4)**
- 범위 후보: (1) `app/vite.config.js`에 `/api` → `http://127.0.0.1:8787` 프록시(contracts/appraise-http.md §1 — vitest 설정이 같은 파일이라 사람이 보고 승인, CAREER-25 plan 실패 시나리오 20) (2) 리전 안내 문구(contracts/appraise.md §5) (3) 로컬에서 진짜 `api/` 서버 + 화면으로 한 바퀴(사용자가 눈으로, Bedrock 호출 몇 건) (4) S1에서 A를 고르면 `unavailable`·`refused` 화면도 여기.
- 차례: **CAREER-26 머지 → 연결 스토리 → CAREER-27(비용 상한) → 배포**. 연결은 로컬뿐이라 비용 상한보다 먼저 와도 된다(결정 B — 공개 안 함).
- Jira 댓글 초안(승인 뒤 architect가 CAREER-26에 단다 — 이 세션에서는 Atlassian 도구 권한이 없어 달지 못했다):
  > [architect 제안] 결정 A의 '화면을 진짜 서버에 연결하기'를 새 스토리로 두면 좋겠습니다. 범위: Vite dev 프록시 `/api` → 127.0.0.1:8787 · 리전 안내 문구 · 로컬 진짜 서버로 한 바퀴 확인(필요하면 unavailable·refused 화면). 차례: CAREER-26 머지 뒤, CAREER-27 전. 만들지 여부와 번호는 사용자가 정합니다.

### 질문 8 — api/ 테스트 위치·명령 → **닫힘** (CAREER-25 질문 4, 10/21 사용자 확정)
- 위치 `api/tests/`, 도구 vitest, 명령 `checks.app.api`(`npm --prefix api ci && npm --prefix api test`) — 이미 `pipeline.config.json`에 있다. CI `checks / app`이 돌린다. 이번 테스트 파일 `api/tests/photo-upload.test.js`는 같은 명령에 저절로 들어간다.

### 질문 10 — 서버 거절 모양 → **닫힘: 하나** (contracts/appraise-http.md §5 확정)
- 크기·형식·GPS·픽셀 모두 `400 {"code":"invalid_input"}` 하나. 이유는 서버 로그 `reason`(`too_large`·`empty_body`·`bad_content_type`·`not_jpeg`·`malformed_jpeg`·`gps_present`·`too_many_pixels`)에만. 화면은 `invalid_input` 하나로 보고 문구는 10/21 사용자가 고른 "사진이나 선택을 다시 골라 주세요."(appraise.md §5). 나누지 않는 이유: 브라우저를 거친 사진은 어느 거절에도 걸리지 않아야 정상이고, 걸린다면 사용자가 할 일은 어차피 '다시 고르기' 하나다. 이유를 응답에 담으면 우회 시도에 힌트만 준다.
- 브라우저 쪽 '읽을 수 없음'(AC-6) 문구만 S2로 묻는다.

### 질문 11 — B의 정확한 바이트 수 → **닫힘: 1,000,000** (contracts/appraise-http.md §2 · §8 `MAX_PHOTO_BYTES`, 10/21)
- AC-8 경계: 정확히 1,000,000은 통과, 1,000,001은 거절.

## 고른 이유와 버린 대안
| 결정 | 고른 것 | 버린 것 · 왜 아님 |
|---|---|---|
| 1 사진을 처리하는 자리 (ADR-0003) | **어댑터 안**(`appraise.js`가 `preparePhoto`를 부르고 바로 보냄). `fetch`가 있는 유일한 파일이 지우기도 한다 → 지우지 않은 사진이 나갈 다른 길이 없다(AC-5(3)·AC-12) | 고를 때 App에서 준비해 Blob을 넘김: 미리보기·이른 오류가 좋지만 contracts §2 `photo` 모양이 바뀌고, 어댑터가 받은 것이 지워졌는지 다시 확인해야 한다 / 별도 업로드 모듈: 보내는 곳이 둘이 된다 |
| 2 다시 그리기 도구 (ADR-0003) | 브라우저 기본 `createImageBitmap` + `<canvas>` `toBlob` (의존성 0 — CLAUDE.md §8 단계 3) | `browser-image-compression` 등: 같은 canvas를 감싼 것뿐인 의존성 / EXIF 바이트만 잘라 내기(piexifjs 등): 줄이기를 못 하고 방향 정보까지 지우면 AC-3이 깨진다 / `OffscreenCanvas.convertToBlob`: 같지만 오래된 Safari에 없다(되돌리기 쉬움) |
| 3 서버가 지우고 진행 | 안 함 — 거절만(결정 I, spec '안 할 것') | GPS가 든 원본이 기기를 떠난다 |
| 4 투명 PNG | JPEG로 굽기 전 흰색 바탕 | 그냥 그리기: 투명 부분이 검게 나와 감정이 달라진다 |
| 5 실패 코드 | 새 코드 없음 — 브라우저 쪽 실패도 `invalid_input`/`unavailable` | `bad_photo` 추가: §5 '넷'과 서버 표가 어긋나고, 할 일(다시 고르기)이 같다 (S2 b) |
| 6 시험 사진 | 테스트 때 브라우저로 만들고 EXIF 조각을 바이트로 끼움 | exiftool로 만든 이진 파일 커밋: 도구가 사용자 컴퓨터에만 있고 F1(4000px)이 수 MB / 사람 사진: 공개 저장소에 맞지 않음 |
| 7 AC-10 재료 | e2e가 실제로 보낸 바이트를 파일로 남기고 앞 세션이 `api/tests/fixtures/`로 복사 | api 도우미 `makeJpeg`로 대신: '브라우저가 만든 것을 서버가 받는가'라는 AC-10의 뜻(Chromium이 붙이는 APP0·ICC 등)을 못 본다 / e2e가 `api/`에 직접 씀: 쓰기 구역 밖 |
| 8 api 테스트 | 새 파일 하나에 CAREER-26 AC 이름으로(일부는 CAREER-25 테스트와 겹침) | 겹치는 것은 CAREER-25 테스트를 가리키기만: reviewer가 AC마다 증거를 따로 찾아야 한다. 겹침은 5개 남짓 |

## 신뢰 경계 (`strict_review_areas: guard` — api/ 테스트를 더하므로)
`들어온 곳 → 해석 → 검증 → 실제 동작`
1. 사용자가 고른 파일 → `accept`·`file.type`(jpg·png, 지금 그대로 — 이름표일 뿐) → 브라우저 디코더 `createImageBitmap`(못 읽으면 `invalid_input`, 보내지 않음) → 픽셀만 canvas로 → **EXIF·XMP·꼬리 데이터는 건너가지 못함**
2. canvas JPEG → 크기 `≤ MAX_PHOTO_BYTES`(브라우저, 편의일 뿐) → `POST /api/appraise`(같은 출처) → 서버가 다시 전부 본다(contracts/appraise-http.md §2·§3, CAREER-25 plan 신뢰 경계 2) → (나중) Bedrock 호출(과금). 브라우저 검사는 믿지 않는다 — F5(AC-13)·AC-8·9가 브라우저를 거치지 않은 요청을 서버가 막는지 본다
3. 서버 응답 → 어댑터가 모양 검사(§5 어댑터 규칙, 빈 성공 없음) → `line`은 React 글자로만 그림(기본 이스케이프)
4. 쿼리 `myPrice`·`tags` → 화면 표의 id만 → 서버가 다시 표로 검사(CAREER-25 경계 1)

**실제 동작: 사진을 브라우저 밖으로 보내기 (이번 스토리에서 새로 생김)**
| 항목 | 값 |
|---|---|
| 누가 허락하나 | 사용자가 '감정 받기'를 누름. 누른 뒤 `status: 'thinking'` 동안 버튼이 꺼져 한 번만(AC-5(2)) |
| 바로 앞의 검증 | 다시 그리기 성공 · 긴 변 ≤ 1024 · JPEG · 크기 ≤ 1,000,000 |
| 입력 최대 | 고른 파일 크기는 묶지 않는다(아래 '건너뛴 것') · 보내는 본문 ≤ 1,000,000 바이트 |
| 출력 최대 | 서버 응답 JSON(우리 서버, `line` ≤ 30자). `res.json()` 크기는 묶지 않는다 — 같은 출처 우리 서버뿐 |
| 남는 증거 | 서버 로그 1줄(CAREER-25). 브라우저는 남기지 않음 |
| 중간에 끊기면 | 브라우저·서버 어디에도 저장하는 것이 없어 되돌릴 것이 없다(AC-11). 탭을 닫으면 요청이 끊기고 서버는 `client_closed`로 Bedrock을 멈춘다(CAREER-25) |
| 비용 | 이번엔 0(가짜 AI 자리 · 로컬). 연결 뒤 호출당 비용은 픽셀(1024px)로 묶임 |

## 실패 시나리오 (premortem) — 각각 막는 곳
1. **방향이 무시되어 세로 사진이 눕혀 감** → `imageOrientation: 'from-image'`를 명시(기본값에 기대지 않음). AC-3 e2e(F2: 1200×800 + Orientation 6 → 보낸 것 세로)
2. **EXIF가 남음**(다른 브라우저 인코더가 메타데이터를 붙임) → canvas는 픽셀만 굽는다. AC-2 e2e가 APP1 `Exif`를 바이트로 찾는다. 서버도 GPS를 거절(AC-13)
3. **원본이 다른 길로 나감**(누가 `input.photo`를 그대로 `body`에) → `fetch`는 어댑터 한 곳. AC-5(3)이 F1 원본 바이트가 든 요청 0개를 보고, AC-12가 일부러 빼고 e2e가 빨강인지 본다
4. **'갸웃'에서 멈춤**(거부를 처리 안 함 · 연결 전 dev 404) → `submit`의 `catch`가 모든 거부에서 `idle`로(S1). 코드가 표에 없으면 `unavailable` 문구
5. **두 번 눌려 요청 2개** → 지금처럼 `thinking` 동안 버튼 꺼짐. 준비(그리기·굽기)도 `thinking` 안에서. AC-5(2) e2e가 서버 입구 요청 정확히 1개
6. **투명 PNG가 검은 사진으로** → 흰 바탕 칠하기(고른 이유 4). 검사는 하지 않는다(눈으로 — 감정 정확도 문제이지 안전 문제가 아님)
7. **`toBlob`이 `null`**(캔버스가 너무 큼·메모리) → `invalid_input`, 보내지 않음. 1024px 캔버스라 드묾
8. **아주 큰 사진(수만 px)을 그리다 탭이 버벅이거나 실패** → 실패면 `invalid_input`. 고른 파일 크기 상한은 두지 않는다(건너뜀 — 아래)
9. **F4를 '잘린 JPEG'로 만들면 Chromium이 반쯤 그려 보내 AC-6이 흔들림** → F4는 글자 바이트로 정함(시험 사진 표)
10. **e2e 가로채기가 안 걸려 Vite로 감** → 경로 함수 `url.pathname === '/api/appraise'`. 안 걸리면 404 → `unavailable` 문구가 보여 AC-1~5가 시끄럽게 실패한다(조용한 통과 없음)
11. **jsdom에 canvas·`createImageBitmap`이 없어 단위 테스트가 거짓 초록/빨강** → 단위 테스트는 `photo.js`를 가짜로 바꾸고 `fitWithin`만 진짜로 본다. 다시 그리기는 e2e(Chromium)만 본다
12. **기존 테스트가 깨짐**: `app/tests/appraise.test.js`(가짜 800ms·고정 값), `e2e/first-flow.spec.js`(본문 요청 0개 · 가로채기 없음) → T1·T2에서 함께 고친다(결정 M). `FirstFlow.test.jsx`는 `appraise`를 가짜로 바꾸므로 그대로
13. **AC-10 재료(f1-prepared.jpg)가 낡음** — `photo.js`를 고친 뒤 다시 안 뽑음 → tasks A1에 다시 뽑는 명령. reviewer는 `photo.js`가 바뀐 PR에서 이 파일도 바뀌었는지 본다
14. **서버 결과 기억 때문에 api 테스트가 섞임**(같은 사진을 여러 번) → `createServer({ memo: createMemo({ maxEntries: 0 }) })`(CAREER-25 실패 시나리오 23과 같음)
15. **AC-11(a) 임시 폴더 검사가 다른 세션의 임시 파일로 흔들림** → 테스트 안에서 `mkdtemp`로 만든 빈 폴더를 `TMPDIR`·`TMP`·`TEMP`로 돌려 놓고 그 폴더만 본다 + 검사 명령에서 `git status --porcelain --untracked-files=all api`
16. **`fetch` 응답 모양이 이상해도 빈 성공** → 성공은 키 둘·형 검사를 모두 지나야. 아니면 `unavailable`(단위 테스트 표)
- 건너뛴 것(일부러): 고른 파일 크기 상한(예: 50MB) — 값이 하나 더 생기고, 큰 파일은 디코더가 실패하거나 느릴 뿐 밖으로 나가는 것은 없다. 공개 뒤 문제가 보이면 그때. Chromium 밖 브라우저(Safari·Firefox)의 방향·EXIF 동작 — e2e는 Chromium만(CAREER-22 설정 그대로), 연결 스토리에서 사용자가 휴대폰으로 한 번 본다. 업로드 중 다른 사진 고르기 — 지금도 결과는 누른 때의 사진 것이다(바꾸지 않음).

## contracts
- **고침 제안: [contracts/appraise.md](../../contracts/appraise.md)** (상태 '확정 + 10/23 고침 제안 (승인 대기)')
  - §2 `photo` 줄: '가짜는 읽지 않는다' → 어댑터가 §6대로 다시 그린 JPEG만 보낸다. 고른 `File` 그대로는 어디로도 보내지 않는다
  - §5: '이번 화면은 거부를 처리하지 않는다' → 거부되면 갸웃을 끝내고 문구를 보인다(S1 D) · 읽을 수 없는 사진은 `invalid_input`(S2 a)
  - §6: '가짜 함수'를 '보내는 법(CAREER-26)'으로 바꿈 — 단계 · 값(`MAX_EDGE_PX` · `MAX_PHOTO_BYTES`는 appraise-http.md가 원본 · `TARGET_PHOTO_BYTES`(S3) · `JPEG_QUALITIES`) · 네트워크는 `/api/appraise`에 한 번. `FAKE_DELAY_MS`는 없어진다
  - 바꾸지 않음: §1 자리·내보내기 · §2 입력 모양(`photo: File` jpg·png) · §3 태그 · §4 성공 모양 · §5 코드 넷과 문구
- **고치지 않음: [contracts/appraise-http.md](../../contracts/appraise-http.md)** — 새 입구 없음. 브라우저가 보내는 것은 §2·§3 그대로이고, 서버 값(§8)도 그대로다
- Terraform outputs · 환경변수: 없음 (`VITE_*` 없음 — 상대 경로만)

## ADR
- **[ADR-0003](../../docs/adr/0003-photo-redraw-in-browser-adapter.md) (제안)** — 사진은 감정 어댑터 안에서 브라우저 기본 기능으로 다시 그려(EXIF 전부 지움 · 1024px · JPEG) 보내고, 서버는 고치지 않고 거절만 한다. 무엇이 기기를 떠나는지를 정하는 결정이라 되돌리기 어렵다(공개 뒤엔 개인 정보 약속).
- PR '결정' 칸(되돌리기 쉬움): `JPEG_QUALITIES` 값 · `HTMLCanvasElement.toBlob`(OffscreenCanvas 아님) · 시험 사진을 코드로 만들기 · api 테스트를 새 파일로.

## 범위 밖 (spec '안 할 것' 그대로 + 이번에 생긴 것)
- Vite 프록시 · 리전 안내 · 진짜 서버로 돌려 보기 → 연결 스토리(S4). 그래서 이 스토리 머지 뒤 `npm run dev`에서 '감정 받기'를 누르면 결과 카드 대신 `unavailable` 문구가 나오는 것이 정상이다(PR 본문에 적는다) — 화면 배포는 아직 없다(CAREER-22·24 '안 할 것')
- 공유 카드·편집·진행 막대·webp/HEIC

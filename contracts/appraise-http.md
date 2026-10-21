# 감정 서버 입구 약속 — `POST /api/appraise`

- Refs: CAREER-25 · CAREER-26 · 상태: **확정** (2026-10-21 — 사용자 승인, 사용자 답 1~13 반영)
- 근거: [specs/CAREER-25-real-appraise/plan.md](../specs/CAREER-25-real-appraise/plan.md) · 결정 E~I (CAREER-25 spec '정해진 것')
- 이 문서는 **브라우저(감정 어댑터) ↔ 서버(`api/`)** 사이 약속이다. 서버는 CAREER-25가, 사진을 보내는 쪽은 CAREER-26이, 어댑터는 화면 연결 스토리(결정 A)가 만든다. 화면 쪽 함수 모양은 [appraise.md](appraise.md)가 원본이고, 이 문서는 그 아래 HTTP 모양만 정한다.
- CAREER-26 spec과 대조(10/21, 앞 세션이 읽음): AC-1(1024px로 줄여 보냄)은 §3-4와, AC-5(서버 입구로만 한 번)는 §1 같은 출처 `/api/appraise`와, AC-7(서버 거절을 `invalid_input`으로 봄)은 §5 400과 맞다. AC-9(a)(d)는 아래 §2 마지막 줄로 대응한다.

## 1. 자리
| 무엇 | 값 |
|---|---|
| 경로 | `POST /api/appraise` (이 경로 하나뿐) |
| 로컬 주소 | `http://127.0.0.1:8787` — 서버는 `127.0.0.1`에만 묶는다(결정 B: 공개하지 않음). 포트는 환경변수 `PORT`로 바꿀 수 있다(§9) |
| 브라우저에서 | 같은 출처로만 부른다: 로컬은 Vite dev 서버 프록시(`/api` → `http://127.0.0.1:8787`), 나중엔 CloudFront `/api/*`. **CORS 헤더를 내지 않는다** — 다른 출처의 브라우저 요청은 브라우저가 막는다 |

## 2. 요청
```
POST /api/appraise?myPrice=ten&tags=how-1&tags=now-2
Content-Type: image/jpeg
Content-Length: 183204

<JPEG 바이트 그대로>
```
| 무엇 | 약속 |
|---|---|
| `myPrice` (쿼리) | 꼭 1번. 값은 appraise.md §2 id(`one`·`ten`·`hundred`·`never`) 중 하나 |
| `tags` (쿼리) | 0~16번 되풀이(`tags=a&tags=b`). 값은 appraise.md §3 태그 id. 중복 없음. 순서는 상관없다(서버는 표 순서로 다시 줄 세운다) |
| 다른 쿼리 키 | 없어야 한다. 있으면 `invalid_input` |
| `Content-Type` | 정확히 `image/jpeg` (`; ` 뒤 매개변수 없음) |
| 본문 | 사진 바이트 그대로. base64·JSON·multipart가 아니다. 1바이트 이상, 최대 `MAX_PHOTO_BYTES` |
| `MAX_PHOTO_BYTES` | **1,000,000 바이트** (십진 1MB) — 이 값과 **같으면 통과, 1바이트라도 넘으면 거절** |

- 크기는 `Content-Length`를 믿지 않고 **실제로 읽은 바이트**로 센다. 읽는 중 상한을 넘으면 그 자리에서 읽기를 멈춘다(메모리에 다 올리지 않음). `Content-Length`가 상한보다 크면 본문을 읽지 않고 거절한다.
- 브라우저 쪽(CAREER-26)은 `fetch(url, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: jpegBlob })` 꼴로 보낸다. 쿼리는 `URLSearchParams`로 만든다.
- 이 약속에는 '사진 칸'이 따로 없다(본문이 곧 사진). 그래서 **본문이 비었거나 `Content-Type`이 `image/jpeg`가 아니면 `invalid_input`**이다 — CAREER-26 AC-9(a)(d)('사진 칸이 없는 요청' 등)는 이것으로 대응한다.

## 3. 서버가 받는 JPEG
아래를 **모두** 만족해야 Bedrock을 부른다. 하나라도 아니면 `invalid_input`이고 Bedrock 호출은 0번이다.
1. 첫 3바이트가 `FF D8 FF` (확장자·`Content-Type`만 믿지 않는다 — PNG 바이트에 `image/jpeg`를 붙여도 거절)
2. SOI부터 SOS(`FF DA`)까지 마커를 차례로 읽을 수 있다 — 세그먼트 길이가 파일 끝을 넘거나 마커가 깨지면 거절(막는 쪽으로 실패)
3. **위치 정보가 없다**
   - APP1 `Exif\0\0` 세그먼트의 IFD0에 GPS 포인터 태그(`0x8825`)가 없다. 포인터가 있으면 내용과 상관없이 거절
   - APP1 XMP(`http://ns.adobe.com/xap/1.0/\0`) 세그먼트에 `GPSLatitude`·`GPSLongitude` 글자가 없다
   - GPS가 없는 다른 EXIF(촬영 시각·카메라 이름 등)는 통과한다
4. **긴 변이 `MAX_PHOTO_EDGE_PX`(1024px) 이하다** (10/21 사용자 승인 — 범위 추가, spec AC-2 조건은 앞 세션이 더함)
   - SOS 전에 나오는 첫 SOF 세그먼트(`FF C0`~`FF CF` 중 `C4`·`C8`·`CC` 제외)의 높이(2바이트)·너비(2바이트)로 판단한다. 그림은 풀지 않는다
   - `max(가로, 세로) <= 1024`면 통과, 1025 이상이면 거절. SOF가 없거나 가로·세로가 0이면 깨진 JPEG로 거절
   - 이유: 1MB 안에서도 픽셀이 크면 이미지 입력 토큰(=비용)이 커진다. CAREER-26이 1024px로 줄여 보내므로 정상 흐름엔 영향이 없다
- 서버가 **하지 않는 것**: 줄이기·형식 바꾸기·EXIF 지우기(받거나 거절만 한다). 그림을 실제로 풀어 보는 일(풀리지 않는 JPEG는 Bedrock이 `ValidationException`을 내고 `unavailable`이 된다)

## 4. 응답 — 성공
```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Cache-Control: no-store

{"mochi":10,"line":"흠, 손때가 제법 묻었구먼"}
```
- 키는 `mochi`·`line` **둘뿐**이다(appraise.md §4)
- `mochi`: §6 표의 값 중 하나(0 이상 정수)
- `line`: 공백만이 아니고, 줄바꿈·제어 문자가 없고, **30자 이하** — 30자 = 코드 포인트 수 `[...line].length <= 30`
- 등급(1~5)은 브라우저로 보내지 않는다. 서버 안에서 표로 `mochi`를 정하는 데만 쓴다(결정 E)

## 5. 응답 — 실패
본문은 언제나 `{"code":"<code>"}` 하나뿐이다(이유·스택·모델 출력을 담지 않는다 — 이유는 서버 로그에만).

| `code` | HTTP | 언제 | 이번(CAREER-25)에 나오나 |
|---|---|---|---|
| `invalid_input` | 400 | §2·§3을 어김. 경로가 다르면 404, 메서드가 POST가 아니면 405 — 본문은 모두 `{"code":"invalid_input"}` | 나옴 |
| `refused` | 422 | 모델이 이 사진의 감정을 거절함(§7) | 나옴 |
| `unavailable` | 503 (예상 못 한 서버 오류는 500) | Bedrock 실패(재시도 뒤)·시간 제한·모델 출력이 §7 모양이 아님 | 나옴 |
| `daily_limit` | 429 | 하루 상한(CAREER-27) | 안 나옴 |

- 공통 헤더: `Content-Type: application/json; charset=utf-8` · `Cache-Control: no-store`
- **어댑터 규칙**(화면 연결 스토리): HTTP 상태가 아니라 본문 `code`로 가른다. 본문이 JSON이 아니거나, `code`가 위 넷이 아니거나, 성공 본문이 §4 모양이 아니거나, 네트워크가 끊기면 → `unavailable`. 빈 성공으로 바꾸지 않는다

## 6. 등급 5단계와 서버 표 (결정 E — 표 A 확정)
- 표는 `api/` 안 **한 곳**에만 둔다(AC-1). 값은 서로 달라야 하고 등급이 오를수록 커야 한다 — 시험 실행이 `mochi`로 등급을 거꾸로 찾는다
- 모델은 **물건 자체의 값**만 등급으로 매긴다. 추억(사연)은 사용자 몫('내 값')이라 등급에 넣지 않는다. **모델에 `myPrice`를 보내지 않는다**

| 등급 | 뜻 (프롬프트에 그대로 들어감) | `mochi` |
|---|---|---|
| 1 | 흔함 — 어디서나 쉽게 구하는 물건 | 1 |
| 2 | 쓸 만함 — 흔하지만 상태가 좋거나 쓸모가 분명함 | 3 |
| 3 | 괜찮음 — 사고 싶어 할 사람이 꽤 있음 | 10 |
| 4 | 귀함 — 구하기 어렵거나 오래 아낄 만함 | 30 |
| 5 | 보물 — 아주 드물거나 누구나 탐낼 만함 | 100 |

- 고른 이유: '내 값' 버튼(1·10·100)과 같은 눈금에 그 사이 값이 하나씩 있어 '추억 프리미엄'이 대부분 0이 아니게 나온다.

## 7. 모델 출력 약속 (서버 안 — 시험 세트도 이 모양을 본다)
모델이 돌려주는 글은 아래 둘 중 **정확히 하나**의 JSON 객체여야 한다. 앞뒤 공백과 ```` ```json … ``` ```` 울타리 한 겹만 벗겨 준다.
```
{"grade": 3, "line": "흠, 손때가 제법 묻었구먼"}     ← 감정
{"refuse": true}                                    ← 거절
```
- `grade`: 정수 1~5 (`3.0`이 아닌 `Number.isInteger`, 문자열 `"3"`은 아님) · `line`: §4 규칙 · 다른 키 없음
- 모델 글 길이 상한 `MAX_OUTPUT_CHARS`(500자) — 넘으면 읽지 않고 `unavailable`. 모델 요청의 `maxTokens` = `MAX_OUTPUT_TOKENS`(120), 응답이 `max_tokens`로 끊겼으면 `unavailable`
- 그 밖의 모든 모양 → `unavailable` (빈 성공·기본값으로 바꾸지 않는다)

## 8. 서버 설정 값 (`api/src/config.js` 한 곳)
| 이름 | 값 | 쓰는 곳 |
|---|---|---|
| `MODEL_ID` | `apac.amazon.nova-pro-v1:0` | Bedrock Converse |
| `AWS_REGION` | `ap-northeast-2` (환경변수가 아니라 상수 — `apac.` 프로필이 이 리전 기준) | Bedrock 클라이언트 |
| `MAX_PHOTO_BYTES` | 1,000,000 | §2 |
| `MAX_PHOTO_EDGE_PX` | 1,024 | §3-4 |
| `TIMEOUT_MS` | 20,000 — 요청 1건 전체(재시도·대기 포함) | AC-5 |
| `MAX_RETRIES` | 2 — Bedrock 호출은 최대 `1 + MAX_RETRIES` = 3번 | AC-4 |
| `RETRY_BACKOFF_MS` | `[1000, 2000]` (흔들기 없음) | AC-4 |
| `MAX_OUTPUT_TOKENS` | 120 | §7 |
| `MAX_OUTPUT_CHARS` | 500 | §7 · AC-3(f) |
| `TEMPERATURE` | 0 | 같은 사진 같은 등급(결정 K) |
| `LINE_MAX_CHARS` | 30 | §4 |

## 9. 환경변수
| 이름 | 누가 읽나 | 값 |
|---|---|---|
| `PORT` | `api/` | 없으면 8787 |
| `AWS_PROFILE` | AWS SDK 기본 자격 증명 사슬 | 로컬 시험 실행만 `terraform-admin`(결정 C). 코드에 적지 않는다. EC2에서는 쓰지 않음(인스턴스 역할) |
- `VITE_*`는 없다. 브라우저는 상대 경로 `/api/appraise`만 쓴다
- Bedrock 엔드포인트 주소 변수는 없다 — EC2에서는 VPC 엔드포인트 private DNS가 기본 주소를 가로챈다(ADR-0002)

## 10. 나중에 인프라가 맞출 것 (배포 스토리 — 이번엔 만들지 않음, 결정 B)
- CloudFront `/api/*` 동작: POST 허용, 캐시 안 함, 원본으로 **쿼리 문자열 전부**와 `Content-Type` 헤더를 넘김, 원본 응답 시간 제한 ≥ `TIMEOUT_MS` + 5초
- EC2 보안 그룹 → bedrock-runtime 엔드포인트 443 (ADR-0002, `culonculon/aws-infra-portfolio`)

## 11. 바꾸는 법
- 이 문서를 바꾸면 서버(`api/`)·사진 보내는 쪽(CAREER-26)·어댑터를 같은 PR이나 차례로 이어진 PR에서 맞춘다. 확정 뒤 바꾸려면 architect가 고치고 사용자가 승인한다

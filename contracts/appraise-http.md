# 감정 서버 입구 약속 — `POST /api/appraise`

- Refs: CAREER-25 · CAREER-26 · 상태: **확정** (2026-10-22 — 사용자 승인. 10/21 확정본 + 10/22: §8 `TOP_K`(승인됨) · 결과 기억 — §4 동작 한 줄 · §8 `MEMO_MAX_ENTRIES` · 10/22 거절 뒤 남은 업로드(사용자 승인) — §2 동작 한 줄 · §8 `REJECT_DRAIN_BYTES`. 요청·응답 모양·HTTP 상태·헤더는 바뀌지 않음) · **10/23 CAREER-27 고침 (사용자 승인 — CAREER-27 plan D6)**: §5 `daily_limit`·`unavailable` 줄 · §5 '하루 상한' 절 · §8 세 줄. 요청·응답 모양·HTTP 상태·헤더는 바뀌지 않음(429는 처음부터 약속에 있었다) · **10/24 CAREER-31 고침 (사용자 승인 — 2026-10-24, CAREER-31 plan D2·D3·D4·D5·D9)**: §5 `person_limit` 줄 · 어댑터 규칙 '다섯' · §5 '사람별 제한' 절 · §8 `USAGE_FILE` 바꿈과 사람별 다섯 줄 · §8 아래 두 줄(`personLimit` · 자격 증명 시작 점검) · §10 네 줄. 요청 모양·성공 응답은 바뀌지 않음, 실패 코드 하나 더함 · **10/26 CAREER-31 고침 (사용자 승인 — 2026-10-26, CAREER-31 plan D10·D11·D12)**: §2 '본문을 다 읽기 전에 거절하면'의 한도 넘음 동작 · §8 `REJECT_LINGER_MS`. 요청·응답 모양·HTTP 상태는 바뀌지 않음(chunked로 보낸 요청의 거절 응답에 `Content-Length`가 붙음)
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

- 크기는 `Content-Length`를 믿지 않고 **실제로 읽은 바이트**로 센다. 읽는 중 상한을 넘으면 그 자리에서 모으기를 멈춘다(메모리에 다 올리지 않음).
- **본문을 다 읽기 전에 거절하면**(크기뿐 아니라 쿼리·`Content-Type`·경로·메서드 거절도 같음): 서버는 응답(400·404·405, 본문 `{"code":"invalid_input"}`)의 헤더와 본문을 먼저 쓰고, 남은 본문을 `REJECT_DRAIN_BYTES`(§8)까지 읽어 버린 뒤 응답을 끝낸다. 한도를 넘으면 더 읽지 않고 `REJECT_LINGER_MS`(§8) 뒤 연결을 끊는다. 본문을 `Content-Length` 없이(chunked) 보냈으면 거절 응답에 `Content-Length`를 붙여 응답이 먼저 끝난다 — 보내는 쪽은 그 뒤 업로드를 멈춰도 된다. `Content-Length`가 처음부터 그 한도보다 크면 읽지 않고 응답을 끝내고 닫는다 — 이때 보내는 쪽은 쓰기 오류를 볼 수 있다. 응답 모양·상태는 그대로다.
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
- **같은 사진·같은 태그면 같은 응답이다** (10/22, CAREER-25 결정 1·2): 사진 바이트가 같고 태그 묶음이 같으면(순서 상관없음, `myPrice`는 상관없음) 서버가 기억한 응답(성공 본문 또는 422 `refused`)을 다시 준다. 응답 모양·상태·헤더는 기억에서 왔든 아니든 **똑같고**, 기억에서 왔음을 알리는 헤더는 없다. 실패(`invalid_input` · `unavailable`)는 기억하지 않으므로 다시 보내면 새로 처리한다(화면 결정 J '다시 누르기'는 그대로 뜻이 있다). 서버를 다시 켜면 잊는다. 열쇠·개수 상한·로그는 서버 안 약속 — [plan '열린 질문 8 답'](../specs/CAREER-25-real-appraise/plan.md)

## 5. 응답 — 실패
본문은 언제나 `{"code":"<code>"}` 하나뿐이다(이유·스택·모델 출력을 담지 않는다 — 이유는 서버 로그에만).

| `code` | HTTP | 언제 | 이번(CAREER-25)에 나오나 |
|---|---|---|---|
| `invalid_input` | 400 | §2·§3을 어김. 경로가 다르면 404, 메서드가 POST가 아니면 405 — 본문은 모두 `{"code":"invalid_input"}` | 나옴 |
| `refused` | 422 | 모델이 이 사진의 감정을 거절함(§7) | 나옴 |
| `unavailable` | 503 (예상 못 한 서버 오류는 500) | Bedrock 실패(재시도 뒤)·시간 제한·모델 출력이 §7 모양이 아님 · 하루 셈 저장소를 읽거나 쓰지 못함(CAREER-27 — 아래 '하루 상한') | 나옴 |
| `daily_limit` | 429 | 하루 상한(CAREER-27 — 아래 '하루 상한') | 나옴 (CAREER-27부터) |
| `person_limit` | 429 | 같은 사람이 너무 자주 보냄(CAREER-31 — 아래 '사람별 제한') (코드 이름·상태 CAREER-31 plan D2 — 10/24 사용자 승인) | 나옴 (CAREER-31부터) |

- 공통 헤더: `Content-Type: application/json; charset=utf-8` · `Cache-Control: no-store`
- **어댑터 규칙**(화면 연결 스토리): HTTP 상태가 아니라 본문 `code`로 가른다. 본문이 JSON이 아니거나, `code`가 위 다섯이 아니거나, 성공 본문이 §4 모양이 아니거나, 네트워크가 끊기면 → `unavailable`. 빈 성공으로 바꾸지 않는다

### 하루 상한 (CAREER-27 — 10/23 사용자 승인. 서버 안 동작·로그·셈 파일의 원본은 [CAREER-27 plan](../specs/CAREER-27-daily-limit/plan.md) · [ADR-0004](../docs/adr/0004-daily-call-count-in-one-json-file.md))
- 세는 것: 그날 서버가 Bedrock에 **보낸 시도 수**(재시도·실패 포함). 시도마다 보내기 바로 전에 센다 — 셈이 `DAILY_CALL_LIMIT`(§8)에 닿았으면 그 시도를 보내지 않고 `daily_limit`. 재시도 도중이어도 남은 시도를 보내지 않고 그 요청을 `daily_limit`으로 끝낸다. 동시에 몰린 요청도 합쳐 상한을 넘지 않는다
- '하루': 서울 시간 00:00(UTC+9, `DAY_UTC_OFFSET_HOURS`)에 새로 시작한다
- 세지 않는 것: `invalid_input`으로 끝난 요청, §4 '같은 사진·같은 태그'로 기억에서 꺼낸 응답 — **상한에 닿은 뒤에도 기억에 있는 사진·태그는 200/422를 그대로 받는다**
- 서버를 다시 켜도 그날 셈은 이어진다. 셈 저장소를 읽거나 쓰지 못하면(깨짐 포함) 보내지 않고 503 `unavailable`이다 — 0으로 보고 통과시키지 않는다
- `DAILY_CALL_LIMIT`이 0이면 올바른 요청은 모두(기억 hit 빼고) `daily_limit`이다 — 급히 막는 스위치
- 응답 헤더는 위 공통 헤더뿐이다(`Retry-After` 없음). 본문은 정확히 `{"code":"daily_limit"}`

### 사람별 제한 (CAREER-31 — 10/24 사용자 승인. 값 1분 5번·하루 50번·서버에서 세기는 10/24 사용자 결정 U2·U3. 서버 안 동작·로그의 원본은 [CAREER-31 plan](../specs/CAREER-31-prepublic-guard/plan.md) 'A2 답'·'A3 답' · [ADR-0006](../docs/adr/0006-per-person-limit-in-server-memory.md))
- **사람을 가르는 값은 `CloudFront-Viewer-Address` 요청 헤더 하나뿐이다**(`PERSON_HEADER`, §8). 모양 `<IP>:<포트>`(IPv6는 대괄호 없음). 서버는 마지막 `:` 뒤 포트를 버린다. `X-Forwarded-For` 등 다른 헤더와 연결의 소켓 주소는 읽지 않는다
- 같은 사람: IPv4는 주소가 같으면, IPv6는 앞 64비트(/64)가 같으면(plan D5 — 10/24 사용자 승인). IPv4를 담은 IPv6(`::ffff:a.b.c.d`)는 그 IPv4로 본다
- 헤더가 없거나 모양이 틀리면(헤더가 둘이라 이어 붙여진 경우 포함) **그런 요청은 모두 한 사람**으로 센다 — 사람별 제한을 거치지 않는 길은 없다. 로컬(Vite 프록시)은 헤더가 없어 늘 이 '한 사람'이다
- 세는 것: 경로·메서드(§1)를 지난 **모든 요청** — `invalid_input`으로 끝날 요청, §4 기억에서 꺼낼 요청, `daily_limit`에 걸릴 요청도 센다. 404·405는 세지 않는다. **사람별 제한에 걸린 요청은 세지 않는다**
- 한도: 최근 `PERSON_WINDOW_MS`(60초) 안에 `PERSON_MINUTE_LIMIT`(5)번 — 미끄러지는 창, 정확히 60초 전 요청은 창 밖 · 그날(서울 00:00 시작, `DAY_UTC_OFFSET_HOURS`) `PERSON_DAY_LIMIT`(50)번. 이미 그만큼 셌으면 그 요청은 `person_limit`
- 확인은 **본문을 읽기 전**이다. 걸리면 Bedrock·하루 셈(위 '하루 상한')에 닿지 않고, 남은 본문은 §2 '본문을 다 읽기 전에 거절하면'대로 버린다. 하루 상한과는 따로 돈다
- 응답 헤더는 위 공통 헤더뿐이다(`Retry-After` 없음). 본문은 정확히 `{"code":"person_limit"}` (plan D2 — 10/24 사용자 승인)
- 사람별 셈은 서버 메모리에 있다 — **서버를 다시 켜면 모두 비워진다**(1분·하루 몫 모두) (plan D1 — 10/24 사용자 승인). 기억하는 사람 수는 `PERSON_MAX_ENTRIES`(§8)이고, 넘으면 가장 오래 안 온 사람부터 잊는다(그 사람은 셈이 새로 찬다)
- 접속 주소는 로그·응답 어디에도 남기지 않는다(해시도 남기지 않음)

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
| `TOP_K` | 1 (Nova `additionalModelRequestFields.inferenceConfig.topK`) — 10/22 사용자 승인: E3에서 온도 0만으로는 같은 사진 등급이 흔들림 | 같은 사진 같은 등급(결정 K) |
| `LINE_MAX_CHARS` | 30 | §4 |
| `MEMO_MAX_ENTRIES` | **10,000** (10/22 사용자 승인) (항목 하나 약 0.4KB → 약 4MB). 넘으면 가장 오래 안 쓴(LRU) 것부터 버림. **0이면 기억 끔**. 음수·소수·숫자 아님은 서버를 만들 때 오류 | §4 '같은 사진·같은 태그' · CAREER-25 AC-17 |
| `REJECT_DRAIN_BYTES` | **2,000,000** (10/22 사용자 승인) — 거절 뒤 남은 본문을 읽어 버리는 한도, 넘으면 끊음. 값·이유의 원본은 [plan '거절 뒤 남은 업로드'](../specs/CAREER-25-real-appraise/plan.md) | §2 거절 뒤 남은 업로드 |
| `REJECT_LINGER_MS` | **1,000** (CAREER-31 plan D11 — 10/26 사용자 승인) — 한도를 넘은 거절 연결을 끊기 전 붙잡는 시간, 그동안 읽지 않음. 값·이유의 원본은 [CAREER-31 plan 'A5 답'](../specs/CAREER-31-prepublic-guard/plan.md) | §2 거절 뒤 남은 업로드 |
| `DAILY_CALL_LIMIT` | **300** (10/23 사용자 결정 U2 · 이름·자리 CAREER-27 plan D3 승인) — 하루 Bedrock 시도 수 상한. **0이면 급히 막기**. 음수·소수·숫자 아님은 서버를 만들 때 오류(`MEMO_MAX_ENTRIES`와 같은 규칙). 환경변수 없음 | §5 '하루 상한' |
| `DAY_UTC_OFFSET_HOURS` | **9** (서울, 서머타임 없음 — 10/23 U3) | §5 '하루 상한' |
| `USAGE_FILE` | **`~/.local/state/how-much/usage.json`** (CAREER-31 plan D3 — 10/24 사용자 승인) — 서버를 돌리는 사용자의 홈 기준(`os.homedir()`), **코드 폴더 밖**이라 배포로 `api/`를 바꿔 넣어도 셈이 이어진다. 환경변수 없음. 처음 만들 때 폴더 `0700` · 파일 `0600`. 자리는 [ADR-0005](../docs/adr/0005-usage-file-outside-code-folder.md), 모양·쓰는 법은 [ADR-0004](../docs/adr/0004-daily-call-count-in-one-json-file.md). (옛 값 `api/var/usage.json` — CAREER-27) | §5 '하루 상한' |
| `PERSON_HEADER` | `cloudfront-viewer-address` (Node가 소문자로 받는 이름) — 사람을 가르는 유일한 값 | §5 '사람별 제한' |
| `PERSON_MINUTE_LIMIT` | **5** (10/24 사용자 결정 U2) — 1 이상 정수, 아니면 서버를 만들 때 오류. 0을 '끔'으로 쓰지 않는다(급히 막기는 `DAILY_CALL_LIMIT` 0 하나) | §5 '사람별 제한' |
| `PERSON_WINDOW_MS` | **60,000** (1분 — U2) | §5 '사람별 제한' |
| `PERSON_DAY_LIMIT` | **50** (10/24 사용자 결정 U2) — 규칙은 `PERSON_MINUTE_LIMIT`과 같음 | §5 '사람별 제한' |
| `PERSON_MAX_ENTRIES` | **10,000** (CAREER-31 plan D4 — 10/24 사용자 승인) (사람 하나 약 0.3KB → 약 3MB). 넘으면 가장 오래 안 온 사람부터 잊음 | §5 '사람별 제한' |

- 기억 켜기/끄기는 `MEMO_MAX_ENTRIES` 하나로만 정한다(환경변수 없음). 테스트·시험 실행은 서버 인스턴스에 작은 상한·0을 따로 넣는다 — 방법과 열쇠 모양, 로그 필드 `memo`(값 `null`·`off`·`hit`·`miss`·`raced`), 열쇠 해시를 로그에 남기지 않는 것은 [plan '요청 한 건의 흐름'·'열린 질문 8 답'](../specs/CAREER-25-real-appraise/plan.md)이 원본이다
- 하루 셈도 같은 방식으로 넣는다: 서버 인스턴스는 `createServer({ dailyLimit })`로 셈을 **꼭** 받는다(기본값 없음 — 상한을 거치지 않는 서버를 만들 수 없게). 진짜 서버·시험 실행은 위 세 값으로, 테스트는 임시 폴더·작은 상한·가짜 시계로 만든다. 로그 필드 `day`·`dayUsed`와 `reason` 이름은 [CAREER-27 plan '요청 한 건의 흐름'](../specs/CAREER-27-daily-limit/plan.md)이 원본이다
- 사람별 셈도 같은 방식이다(CAREER-31 plan D6 — 10/24 사용자 승인): 서버 인스턴스는 `createServer({ personLimit })`로 **꼭** 받는다(기본값 없음). 진짜 서버는 위 사람별 값으로, 테스트는 작은 상한·가짜 시계로, 시험 실행은 넉넉한 값(plan D7 — 돈은 하루 상한이 막음)으로 만든다. 로그 필드 `who`·`personMinute`·`personDay`와 `reason`(`person_day`·`person_minute`)은 [CAREER-31 plan '요청 한 건의 흐름'](../specs/CAREER-31-prepublic-guard/plan.md)이 원본이다
- 진짜 Bedrock 클라이언트로 뜨는 서버는 `listen` 전에 AWS 자격 증명 사슬을 한 번 풀어 보고, 못 풀면 포트를 열지 않고 종료 코드 1로 끝난다(CAREER-31 plan 'A4 답'). Bedrock은 부르지 않는다

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
- (CAREER-31 — 10/24 사용자 승인, 맞추는 일은 CAREER-30) CloudFront `/api/*` 원본 요청 정책에 **`CloudFront-Viewer-Address` 헤더**를 넣는다. 브라우저가 같은 이름 헤더를 보내도 CloudFront 값으로 덮이는지 확인한다
- (CAREER-31) 원본(EC2)은 CloudFront에서만 닿게 한다 — 바로 오면 위 헤더를 꾸밀 수 있다(§5 '사람별 제한')
- (CAREER-31) CloudFront 오류 응답 사용자 지정으로 `/api/*`의 429·503을 바꾸지 않는다 — 화면은 본문 `code`로 가른다(§5 어댑터 규칙)
- (CAREER-31) 서버를 돌리는 사용자에게 다시 배포해도 남고 쓸 수 있는 홈이 있어야 한다 — `USAGE_FILE`(§8)이 그 아래다

## 11. 바꾸는 법
- 이 문서를 바꾸면 서버(`api/`)·사진 보내는 쪽(CAREER-26)·어댑터를 같은 PR이나 차례로 이어진 PR에서 맞춘다. 확정 뒤 바꾸려면 architect가 고치고 사용자가 승인한다

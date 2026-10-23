# 감정 함수 약속 — `appraise`

- Refs: CAREER-22 · CAREER-25 · CAREER-26 · 상태: **확정** (2026-10-21 — 사용자 승인, 태그 이름 채움 · CAREER-25 고침: §5 `refused` 추가와 화면 문구, 같은 날 승인) · **10/23 CAREER-26 고침 (사용자 승인) — §2 `photo` 줄 · §5 화면 처리 · §6 바꿈**. §1 자리 · §2 입력 모양 · §3 · §4 · §5 코드 넷과 문구는 바뀌지 않음
- 근거: [specs/CAREER-22-first-flow/plan.md](../specs/CAREER-22-first-flow/plan.md) '열린 질문 7' · [specs/CAREER-25-real-appraise/plan.md](../specs/CAREER-25-real-appraise/plan.md) '열린 질문 1 답' · [specs/CAREER-26-photo-upload/plan.md](../specs/CAREER-26-photo-upload/plan.md) · [ADR-0003](../docs/adr/0003-photo-redraw-in-browser-adapter.md)
- 이 문서는 **화면 ↔ 감정 자리** 사이 약속이다. CAREER-22에서는 가짜 함수가 이 자리에 있었고, CAREER-26부터 사진을 다시 그려 `POST /api/appraise`로 보내는 어댑터가 있다(§6). 진짜 서버에 닿게 하는 일(Vite 프록시 등)은 화면 연결 스토리다. 바꿔 끼워도 화면 쪽은 고치지 않아야 한다.
- HTTP 요청 모양(경로·사진 보내는 법·크기 상한·응답·실패 모양)은 [appraise-http.md](appraise-http.md)에 있다(CAREER-25에서 따로 뗌 — 이 문서는 화면 쪽 함수 모양만).

## 1. 자리
| 무엇 | 값 |
|---|---|
| 파일 | `app/src/appraise.js` |
| 내보내기 | `export async function appraise(input)` (이름 있는 내보내기 하나) |
| 부르는 곳 | 화면 안에서 **한 곳만** (AC-9). 다른 파일은 이 파일을 import하지 않는다(테스트 제외) |

## 2. 입력 — `input`
```js
{
  photo: File,        // 사용자가 고른 이미지 파일 (image/jpeg 또는 image/png)
  myPrice: 'one' | 'ten' | 'hundred' | 'never',
  tags: string[]      // 아래 태그 id. 0~16개, 중복 없음, 아래 표 순서
}
```
- `photo`: 어댑터는 §6대로 **다시 그린 JPEG만** 보낸다. 고른 `File` 그대로(원본 바이트)는 어디로도 보내지 않는다(CAREER-26 AC-5 — CAREER-22 AC-10을 대신함, 결정 M). 화면은 고른 `File`을 그대로 넘긴다(줄이기·지우기는 화면 몫이 아님 — ADR-0003).
- `myPrice`: 단위(모찌)가 들어가지 않은 id다 — 환율을 바꿔도 id는 그대로다.

| `myPrice` | 버튼 글자 | 결과 카드 '내 값' |
|---|---|---|
| `one` | `🍡 1개` | `모찌 1개` |
| `ten` | `🍡 10개` | `모찌 10개` |
| `hundred` | `🍡 100개` | `모찌 100개` |
| `never` | `🙅 안 팔아` | `안 팔아` |

## 3. 사연 태그 — id와 이름
- id는 `묶음-번호` 꼴이고 이름과 상관없이 고정된다(이름을 고쳐도 id는 그대로).
- 이름은 감정 사이트 설계 메모(10/17 사용자 결정)에서 옮김 — 10/21 사용자 확인.

| 묶음 id | 묶음 제목 | 태그 id | 태그 이름 |
|---|---|---|---|
| `how` | 어떻게 왔나 | `how-1` | 🎁 선물 |
| `how` | 어떻게 왔나 | `how-2` | 💸 첫 월급 |
| `how` | 어떻게 왔나 | `how-3` | 🛫 여행 |
| `how` | 어떻게 왔나 | `how-4` | 🥕 중고 득템 |
| `how` | 어떻게 왔나 | `how-5` | 🎰 뽑기·경품 |
| `how` | 어떻게 왔나 | `how-6` | 👵 물려받음 |
| `now` | 지금 상태 | `now-1` | 🗑️ 못 버림 |
| `now` | 지금 상태 | `now-2` | 📦 상자째 보관 |
| `now` | 지금 상태 | `now-3` | 🩹 고쳐 씀 |
| `now` | 지금 상태 | `now-4` | 🐾 반려동물이 씹음 |
| `feeling` | 마음 | `feeling-1` | 💔 전 애인 흔적 |
| `feeling` | 마음 | `feeling-2` | 🏆 인생템 |
| `feeling` | 마음 | `feeling-3` | 🤦 충동구매 후회 |
| `feeling` | 마음 | `feeling-4` | 🤷 그냥 좋아 |
| `brag` | 자랑 | `brag-1` | 🔥 지금은 못 구함 |
| `brag` | 자랑 | `brag-2` | 🧓 10년 넘음 |

## 4. 출력 — 성공
```js
Promise<{ mochi: number, line: string }>
```
- `mochi`: 0 이상 정수(`Number.isInteger(mochi) && mochi >= 0`)
- `line`: 공백만 있지 않은 문자열 (`line.trim() !== ''`)
- **다른 키는 없다**(AC-9). 진짜 어댑터는 서버 응답을 이 모양으로 검사하고, 아니면 아래 실패로 바꾼다 — 빈 성공으로 바꾸지 않는다(`docs/reference/` §4).

## 5. 출력 — 실패
- `Error`로 거부(reject)한다. `error.code`는 아래 넷 중 하나다.

| `code` | 뜻 | 화면 (그 스토리에서 만든다) · 문구(10/21 사용자 결정 L) |
|---|---|---|
| `daily_limit` | 하루 상한에 걸림 | 아저씨 '퇴근' 상태 (CLAUDE.md §9) |
| `invalid_input` | 서버가 입력을 거절(형식·크기·픽셀·모르는 태그 id) | "사진이나 선택을 다시 골라 주세요." |
| `unavailable` | 그 밖의 오류(네트워크·서버·AI 출력 형식 깨짐) | "감정이 잘 안 됐어요. 잠시 뒤 '감정 받기'를 다시 눌러 주세요." |
| `refused` | 아저씨가 이 사진의 감정을 거절함 (CAREER-25에서 더함) | "이 사진은 감정하지 않아요. 물건 사진으로 다시 골라 주세요." (결과 카드·공유 없음) |

- 리전 안내(감정 버튼 근처, 화면을 진짜 서버에 연결할 때 — ADR-0002): "사진은 감정하는 동안 서울 밖 아시아 리전에서 처리될 수 있어요."
- `refused`를 더한 이유(CAREER-25 plan '열린 질문 1 답'): 진짜 모델은 감정을 거절할 수 있는데 지금 모양으로는 가릴 수 없다. `mochi: 0` + 거절 대사로 하면 거절한 사진이 결과 카드(공유 대상)로 나가고, 성공에 표시 키를 더하면 §4 '다른 키는 없다'가 깨진다. 실패 코드 하나 더하기가 성공 모양을 그대로 두는 가장 작은 변경이다.

- **화면 처리 (CAREER-26, plan S1 · S2 — 10/23 사용자 승인)**: 거부되면 아저씨 '갸웃'을 끝내고(`대기`) 위 표의 문구를 `role="alert"` `data-testid="appraise-error"`로 보인다. 코드가 표에 없으면 `unavailable` 문구. `daily_limit`은 '퇴근'이 생기기 전(CAREER-27)까지 `unavailable` 문구. 사진·선택은 그대로 두어 '감정 받기'를 다시 누를 수 있다(결정 J). 다른 사진을 고르거나 다시 누르면 문구를 지운다.
- **브라우저 쪽 실패**: 사진을 읽거나 다시 그리지 못하면(§6 단계 1·4·5) 어댑터는 **보내지 않고** `invalid_input`으로 거부한다 — 화면 문구는 위 `invalid_input` 줄 그대로(CAREER-26 AC-6).

## 6. 보내는 법 (CAREER-26. 원본: ADR-0003 · CAREER-26 plan '보내는 흐름')
| 단계 | 약속 |
|---|---|
| 1 그리기 | `createImageBitmap(photo, { imageOrientation: 'from-image' })` — EXIF 방향을 픽셀에 굽는다. 못 읽으면 `invalid_input` |
| 2 크기 | 긴 변이 `MAX_EDGE_PX`보다 크면 비율을 지켜 긴 변 = `MAX_EDGE_PX`로 줄인다(각 변 `round`, 최소 1). 작으면 **키우지 않는다** |
| 3 캔버스 | 흰 바탕을 칠한 뒤 그린다(PNG 투명 부분) |
| 4 굽기 | `JPEG_QUALITIES` 차례로 `toBlob(…, 'image/jpeg', q)` — 처음으로 `TARGET_PHOTO_BYTES` 이하인 것에서 멈춘다. 모두 넘으면 마지막 것. `null`이면 `invalid_input` |
| 5 상한 | 그 JPEG가 `MAX_PHOTO_BYTES`를 넘으면 보내지 않고 `invalid_input` |
| 6 보내기 | [appraise-http.md](appraise-http.md) §2 그대로 `POST /api/appraise` **한 번**(다시 시도하지 않음). 네트워크 오류는 `unavailable` |
| 7 응답 | appraise-http.md §5 '어댑터 규칙' 그대로 — 성공은 §4 모양을 모두 지나야 하고, 아니면 본문 `code`, 그 밖은 `unavailable` |

| 값 (`app/src/photo.js` 한 곳) | 값 | 원본 |
|---|---|---|
| `MAX_EDGE_PX` | 1,024 | appraise-http.md §8 `MAX_PHOTO_EDGE_PX` (결정 F) |
| `MAX_PHOTO_BYTES` | 1,000,000 | appraise-http.md §8 (결정 G) |
| `TARGET_PHOTO_BYTES` | **250,000 — 목표이지 상한이 아님 (CAREER-26 plan S3, 10/23 사용자 승인)** | 결정 G '약 250KB' |
| `JPEG_QUALITIES` | `[0.85, 0.7, 0.55]` | CAREER-26 plan 질문 4 |

- 네트워크: `fetch`로 같은 출처 상대 경로 `/api/appraise`만, '감정 받기' 한 번에 한 번. `XMLHttpRequest`·`WebSocket`·`sendBeacon`을 쓰지 않는다. 브라우저 `console`에 사진·응답을 찍지 않는다.
- 가짜 함수(`FAKE_DELAY_MS`, 고정 결과)는 CAREER-26에서 없어진다. 화면 단위 테스트는 `appraise`를 가짜로 바꿔 끼운다(CAREER-22 그대로).

## 7. 나중의 신뢰 경계 (메모 — 이번엔 해당 없음)
- `api/`가 생기면 서버는 `myPrice`·`tags`를 위 표의 id 목록으로만 받는다(모르는 값 → `invalid_input`). 브라우저가 보낸 값은 믿지 않는다.
- 서버 쪽 검사 목록은 [appraise-http.md](appraise-http.md) §2·§3, 신뢰 경계 지도는 CAREER-25 plan '신뢰 경계'.

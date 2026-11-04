[CAREER-37](https://culonculon98.atlassian.net/browse/CAREER-37) 공유 카드에서 사이트로 — 카톡으로 받은 사람이 눌러서 how-much에 들어온다

상태: 승인됨 (2026-11-03)
<!-- 사용자가 읽고 승인하면 "상태: 승인됨 (YYYY-MM-DD)"로 바꾼다. architect는 '승인됨'일 때만 시작한다. -->

## 문제
⑥에서 '공유'로 카톡에 보낸 카드는 그림 한 장으로만 가서, 받은 사람이 how-much에 오려면 그림 속 `d2x05xzjhjvp9j.cloudfront.net`을 손으로 따라 쳐야 한다.

## 근거와 이 스펙이 둔 가정
- 근거: Jira CAREER-37(사용자가 옮겨 줌 — 이 세션은 Jira를 열지 않음) · 11/3 사용자 결정(길 ①의 B, 시험 페이지 https://culonculon.github.io/share-test/ 의 A·B·C·D 비교) · [CAREER-34 spec](../CAREER-34-share-card/spec.md) · [ADR-0010](../../docs/adr/0010-share-card-drawn-without-value.md) · [ADR-0009](../../docs/adr/0009-six-steps-history-ladder.md) · `app/src/ShareRow.jsx` · `app/src/shareCard.js` · `e2e/share-card.spec.js`(CAREER-34 · CAREER-36 테스트) · `app/tests/ShareCard.test.jsx`
- 정한 것(11/3): `navigator.share({ files: [카드 JPEG], url: 사이트 주소 })`. `text` · `title`은 넣지 않는다. 서버 · 인프라 · 카드 그림은 바꾸지 않는다
- 가정 1: 넘기는 주소는 **사이트 첫 화면 주소 하나**(`/`)다. 결과 · 고른 것을 담지 않고 쿼리 · `#`도 붙이지 않는다. 그래서 ADR-0009('주소는 언제나 `/`', '주소로 화면을 열지 않음')를 대체하지 않는다
- 가정 2: '받은 쪽'은 CAREER-34 가정 4와 같이 사용자의 iPhone 16e 카톡 **'나와의 채팅'**으로 본다. 다른 사람 휴대폰으로 봐야 한다면 AC-8을 고친다
- 가정 3: '한 번 눌러 첫 화면에 닿는다'는 카톡 안 브라우저든 Safari든 **① 가게 문 화면**('가게에 들어가기')이 보이면 된다. 어느 브라우저로 열렸는지는 AC-8 (g)에 적기만 한다
- 가정 4: 이 스토리는 CAREER-34 Jira A-1의 '링크 없음' 중 **사이트 첫 화면 링크만** 풀어 준다(결과를 담은 링크는 여전히 없음). 11/3 결정으로 보았다 — 맞는지는 열린 질문 Q2

## 완료 조건
<!-- AC-1~5는 Playwright(가짜 navigator.share — CAREER-34 fakeShare 방식), AC-6~7은 검사·diff, AC-8은 배포 뒤 사람이 iPhone 16e로. AC-1~7은 응답을 가짜로 바꾸므로 진짜 Bedrock 0번. -->
<!-- '사이트 주소' = 그 페이지의 `location.origin + '/'`. 테스트에서는 Playwright baseURL의 origin, 배포에서는 https://d2x05xzjhjvp9j.cloudfront.net/ 이다. '추천안 기준'이라 적힌 AC는 해당 U의 답이 다르면 승인 전에 고친다. -->
- AC-1 공유 창에 카드 그림과 사이트 주소를 함께 넘긴다
  - 주어진: Playwright. `navigator.share` · `navigator.canShare`를 가짜로 바꿔(받은 인자를 기록, `canShare`는 `true`) ⑥까지 간 상태
  - 할 때: '공유'를 누른다. (새로 시작) '공유'를 잇달아 2번 누른다
  - 그러면:
    - `canShare`가 **`share`에 넘긴 것과 같은 키·값**(`files` 1개 + `url`)으로 먼저 불리고, `share`가 1번 불린다. 잇달아 2번 눌러도 1번이다
    - `share` 인자의 키는 정확히 `files` · `url` 둘이다(`text` · `title` 없음)
    - `url`은 그 페이지의 `location.origin + '/'`와 글자까지 같다. `new URL(url)`의 `pathname`은 `/`, `search` · `hash`는 빈 글자다(가정 1)
    - `files`는 1개이고 이름 `how-much-card.jpg` · 형식 `image/jpeg`이며 그림으로 읽힌다
    - `share`가 불릴 때 `navigator.userActivation.isActive`가 `true`다. 눌렀을 때 새로 그리지 않는다(누르기 직전과 `toBlob` 수가 같음)
    - 내려받기는 일어나지 않는다
- AC-2 주소의 원본은 카드에 그리는 주소 글자와 같은 하나다 (추천안 기준: U2)
  - 주어진: 이 스토리의 PR diff
  - 할 때: `app/src/`에서 `cloudfront.net`을 찾고, 넘기는 `url`과 카드의 주소 글자가 어디서 오는지 본다
  - 그러면: `app/src/`에 `cloudfront.net` 글자가 0개다(주소를 코드에 박지 않음). `url`과 카드 글자(`shareCard.js`의 `location.host`)가 둘 다 지금 페이지의 `location`에서 온다. AC-1의 "`new URL(url).host`가 `location.host`와 같다"로 테스트에서도 본다
- AC-3 공유 창을 쓸 수 없으면 지금처럼 그림을 저장한다 (CAREER-34 AC-6 그대로 · 추천안 기준: U1)
  - 주어진: Playwright, ⑥. 경우마다 새로 시작 — ① `share` 없음 ② `canShare` 없음 ③ `canShare`가 늘 `false` ④ `canShare`가 `url`이 든 인자에만 `false`(`files`만이면 `true`) ⑤ `share`가 `NotAllowedError`로 거부 ⑥ 그 밖의 오류로 거부 ⑦ `AbortError`(취소)
  - 할 때: 버튼을 누른다. ⑤·⑥은 거부된 뒤 한 번 더 누른다
  - 그러면:
    - ①~④: `share`는 불리지 않고, 같은 클릭에서 내려받기가 1번 일어나며 버튼 글자는 '저장'이다. ④에서도 `files`만으로 다시 묻거나 `url`만 보내지 않는다(규칙 하나: "넘길 것 전체를 못 받으면 저장")
    - ⑤·⑥: 저절로 내려받지 않고 문구 `공유 창을 열지 못했어요. 저장을 눌러 주세요.` + '저장', 한 번 더 누르면 내려받기 1번
    - ⑦: 내려받기 · 문구 없음, 다시 누르면 `share`가 한 번 더 불린다
    - 내려받은 파일은 같은 감정의 공유 파일과 바이트가 같다. 저장 쪽은 주소를 따로 넘기지 않는다(카드 그림 속 주소 글자만 — 지금 그대로)
- AC-4 카드 그림은 바뀌지 않는다
  - 주어진: CAREER-34 AC-3 · AC-4 · AC-5 · AC-7 테스트와 CAREER-36 테스트 2개(`save double press downloads once` · `save again after the double press guard`)
  - 할 때: 이 스토리 뒤에 그대로 돌린다
  - 그러면: 모두 고치지 않은 채 통과한다(아저씨 값 가림 · 지금 결과만 · 위치 정보 없음 · 취소/그리기 실패/글꼴 실패 · 저장 연타 1번). `shareCard.js`는 diff에 없다
- AC-5 공유는 여전히 서버를 부르지 않고 ⑥ · 뒤로 · 초점을 망가뜨리지 않는다
  - 주어진: CAREER-34 AC-8 테스트(`no requests` · `in view` · `history` · `focus`, 375×548)
  - 할 때: 이 스토리 뒤에 그대로 돌린다
  - 그러면: 모두 고치지 않은 채 통과한다. 특히 `no requests`: ⑥ 뒤 공유 · 취소 · 저장을 해도 `POST /api/appraise`는 1번 그대로이고 다른 요청은 0개다(앱이 `url`을 스스로 불러오지 않음)
- AC-6 이미 있는 테스트는 한 줄만, 뜻을 밝히고 바꾼다
  - 주어진: 이 스토리의 PR diff
  - 할 때: `e2e/share-card.spec.js` · `app/tests/ShareCard.test.jsx`의 바뀐 곳을 본다
  - 그러면:
    - 바뀐 기존 단언은 CAREER-34 AC-2의 `expect(s.keys).toEqual(['files'])` 하나뿐이고, `['files', 'url']`로 바뀌며 옆에 `CAREER-37`이 적혀 있다. 가짜 `share`가 `url`을 기록하도록 더하는 것은 된다
    - 지운 테스트 · `skip` · 느슨해진 단언(예: `toEqual` → `toContain`)이 없다. 새 테스트 이름 앞머리는 `CAREER-37 AC-n`이다
- AC-7 검사가 통과하고, 바꾼 곳만 바뀌고, 새 테스트가 진짜로 잡는다
  - 주어진: AC-1~6을 만족한 PR
  - 할 때: 저장소 루트에서 `checks.app`(lint · test · e2e · build · api)을 돌리고 PR diff를 본다. 이어서 일부러 ㄱ `url`을 빼고 ㄴ `text`를 더하고 ㄷ `url`에 `?from=card`를 붙여 각각 e2e를 다시 돌린 뒤 되돌린다
  - 그러면: 처음에는 모두 종료 코드 0이고 통과 0개로 끝나지 않는다. ㄱ · ㄴ · ㄷ 모두 AC-1이 빨강이다(출력은 세션 보고에 그대로). diff에 `api/` · `infra/` · `contracts/` · `app/src/shareCard.js`가 없다. CI와 `reviewer/gate`가 통과한다
- AC-8 배포 뒤 iPhone 16e 카톡으로 보내고, 받은 쪽에서 한 번 눌러 들어온다 (Jira 완료 조건 · 사람 확인)
  - 주어진: 이 스토리를 main에 머지하고 `docs/runbook/배포.md` §3대로 배포한 https://d2x05xzjhjvp9j.cloudfront.net/ , 사용자의 iPhone 16e · iOS 26 Safari, 물건 사진 1장
  - 할 때: ①→⑥ 감정 1번 → '공유' → 공유 창에서 카카오톡 → '나와의 채팅'으로 보낸다(가정 2) → 카톡 대화에서 받은 것을 본다 → 주소(또는 주소 미리보기)를 **한 번** 누른다
  - 그러면:
    - (a) 공유 창이 오류 문구 없이 뜨고 카카오톡을 고를 수 있다
    - (b) 카톡 대화에 카드 그림이 보이고, 열면 지금 카드와 같다(아저씨 값 `🍡 × ?`로 가려짐 · 내가 부른 값 · 아래 주소 글자)
    - (c) 같은 대화에 그림과 **따로 온 두 번째 메시지**로 주소가 누를 수 있는 모양(파란 링크나 미리보기 상자)으로 보인다(Q1 답 — 시험 페이지에서 두 메시지로 감)
    - (d) 그것을 한 번 누르면 ① 가게 문 화면('가게에 들어가기')이 보인다(가정 3). 주소창 · 링크의 경로가 `/`이고 뒤에 붙은 것이 없다
    - (e) 서버 로그(runbook §5)의 `appraise` 줄이 '공유' 전과 (d) 뒤에 같다. Bedrock 시도는 이 확인을 다 합쳐 1번 이하(카드를 만들려는 감정 1번 · 약 3원)
    - (f) PR '비용·남용 영향' 칸에 적는다: 기기 · iOS · Safari 판 · 날짜, 그림과 주소가 **한 메시지인지 두 메시지인지**, 미리보기 상자가 있었는지와 그 제목 글자, (d)에서 열린 브라우저(카톡 안 / Safari), 대화를 찍은 화면 1장
  - (c) 또는 (d)가 ✘면(카톡이 주소를 버림 등) 이 스토리는 완료가 아니다 — 열린 질문 Q1의 '안 되면' 줄대로 사용자에게 알린다

### 테스트로 볼 수 있는 것 / iPhone 손으로만 볼 수 있는 것
| 무엇 | 테스트 (AC) | iPhone 손 확인 (AC-8) |
|---|---|---|
| `share`에 넘기는 키 · `url` 값 · 파일 | AC-1 (가짜 share의 기록) | — |
| 누른 동작 안에서 불림 | AC-1 `userActivation` (chromium) | (a) — Safari가 실제로 거절하지 않는지 |
| 공유 창 없음 · 거부 · 취소 때 저장 규칙 | AC-3 | — (iPhone Safari는 공유 창이 있음) |
| 카드 바이트 · 값 가림 · 위치 정보 | AC-4 | (b) 눈으로 |
| 앱이 서버를 더 부르지 않음 | AC-5 | (e) 서버 로그 |
| iOS 공유 창이 `files`+`url`을 카톡에 어떻게 건네는가(한/두 메시지, 주소를 버리는가) | **볼 수 없음** — 가짜 share는 운영체제와 카톡을 거치지 않는다 | (c) · (f) |
| 받은 쪽에서 눌러 첫 화면에 닿음 · 어느 브라우저로 열림 | **볼 수 없음** | (d) · (f) |

### 테스트 파일 · 이름
| AC | 파일 | 이름 앞머리 |
|---|---|---|
| AC-1 | `e2e/share-card.spec.js` (더함) | `CAREER-37 AC-1 share passes the card and the site url` |
| AC-3 | 〃 | `CAREER-37 AC-3 falls back to download when files with url cannot be shared` (④ 새 경우. ①②③⑤⑥⑦은 CAREER-34 AC-6 · AC-7 테스트가 본다) |
| AC-4 · AC-5 | 이미 있는 CAREER-34 · CAREER-36 테스트 | 고치지 않음 |
| AC-6 | 이미 있는 `CAREER-34 AC-2 share passes one image file` | 단언 한 줄만 (AC-6) |

- 걸어가기 · 가짜 공유는 이미 있는 `e2e/shop-steps.js` · `share-card.spec.js`의 `fakeShare`를 쓴다. `fakeShare`에 '`url`이 있으면 `canShare` false' 방식을 더하는 것은 된다
- `app/tests/ShareCard.test.jsx`(CAREER-34 AC-1, 버튼이 ⑥에만)는 고치지 않고 통과해야 한다

## 안 할 것
- `text` · `title` 넣기(11/3 결정 B — C · D는 고르지 않음)
- 결과 · 고른 것을 담은 링크, 쿼리 · `#` · 유입 꼬리표(`?from=` · UTM) — ADR-0009 그대로
- OG 이미지 · `index.html`의 미리보기 메타 꾸미기 · S3 · 서버 저장 · 새 입구 · 카카오 SDK(ADR-0010, CAREER-34 '안 할 것')
- 카드 그림 바꾸기(`shareCard.js`) — 주소 글자도 그대로
- 저장(내려받기) 쪽에 주소 붙이기 · '주소 복사' 버튼 · 클립보드
- `canShare`가 `url`과 함께는 못 받을 때 `files`만 · `url`만 보내는 둘째 길(U1 추천)
- 공유 · 유입 횟수 세기
- `api/` · `infra/` · `contracts/` 바꾸기
- Android · 다른 iPhone · 카톡 말고 다른 앱 확인 — 확인 기기는 iPhone 16e 1대
- Jira 고치기 · 상태 바꾸기 · 댓글

## 비용·남용 영향
- **AI 호출**: 늘지 않는다. 공유는 `share` 인자에 글자 하나(`url`)를 더할 뿐 Bedrock과 `POST /api/appraise`를 부르지 않는다
  - 확인 1 (테스트): AC-5 — CAREER-34 AC-8 `no requests`가 고치지 않은 채 통과(⑥ 뒤 `POST /api/appraise` 1번 그대로, 다른 요청 0개)
  - 확인 2 (배포 뒤): AC-8 (e) — `appraise` 로그 줄이 공유 전과 받은 쪽에서 누른 뒤에 같다. 첫 화면을 여는 것만으로는 감정이 일어나지 않는다
  - 확인 3 (diff): AC-7 — `api/` · `infra/` · `contracts/`가 없다
- **새 입구 · 저장 · 인프라**: 없음. 주소는 이미 있는 CloudFront 첫 화면이다
- **정적 요청**: 늘 수 있다(의도한 것). 받은 사람이 누르면 첫 화면 파일을 받고, 카톡이 미리보기를 만들려고 `/`를 한 번 받아 갈 수 있다. 둘 다 CloudFront 정적 응답이고 Bedrock과 무관하다
- **남용**: 받은 사람이 감정까지 하면 그것은 보통 감정 1번이며 이미 있는 사람별 제한 · 하루 상한(퇴근)을 그대로 거친다. 비용 막기를 건너뛰는 길은 생기지 않는다. 주소에 결과 · 사진이 없어 링크로 새는 것은 없다
- **확인 중 과금**: AC-1~7은 0번, AC-8은 1번 이하(약 3원)

## 열린 질문
### 사용자가 정할 것 — 담당: 사용자 · 때: 이 spec 확정(승인) 전
- **Q1 iPhone 카톡에서 B(그림+주소)가 어떻게 가나** (사용자 요청으로 남김)
  - 시험 페이지에서 B를 골랐지만, 그림과 주소가 한 메시지로 가는지 두 메시지로 가는지, 미리보기 상자가 생기는지, 카톡이 주소를 버리지는 않는지는 아직 받지 못했다
  - 답이 오면: AC-8 (c)의 '누를 수 있는 모양'을 그 모습으로 고쳐 적는다
  - **답(11/3, 사용자)**: 시험 페이지 B는 카톡에 **두 메시지**(그림 하나 · 주소 하나)로 갔다 → AC-8 (c)에 반영함
  - **AC-8 결과(11/3 배포 뒤, iPhone 16e · iOS 26 · 카톡 '나와의 채팅')**: 그림 하나 · 링크 미리보기 상자 하나(제목 'how-much' · '여기를 눌러 링크를 확인하세요.')로 **두 메시지** · 누르면 카톡 안 브라우저에서 ① 가게 문 화면 · 서버 로그 `appraise`는 카드를 만든 감정 1번뿐(Bedrock 1번) — 자세한 것은 PR #25 댓글
  - **안 되면**(주소가 버려짐 · 그림이 버려짐): B로는 Jira 완료 조건을 채울 수 없으므로 이 spec을 다시 연다. C(그림+주소+글)로 바꾸는 것은 '안 할 것'과 11/3 결정을 바꾸는 일이라 사용자가 고른다
- **Q2 CAREER-34 A-1 '링크 없음'을 첫 화면 링크만큼 푸는 것이 맞나** (가정 4)
  - CAREER-34 spec U1 표는 "`url`로 넘기는 것은 A-1 '링크 없음'과 맞닿아 넣지 않았다"고 적었고, 그 AC-2는 "`text` · `url` · `title` 없음"이다. 11/3 결정 B가 이것을 바꾼 것으로 보았다
  - **답(11/3, 사용자)**: 맞다 — 첫 화면 주소(`/`)만 푼다. 결과를 담은 링크는 여전히 없음
  - 맞다면: CAREER-34 Jira A-1은 사용자가 손볼지 정한다(이 세션은 Jira를 고치지 않음). CAREER-34 spec AC-2 줄에 'CAREER-37에서 `url` 더함' 메모를 다는 것은 architect가 plan 때 한다(아래 A2)
- **U1 `files`+`url`을 못 받는 기기에서 어떻게 하나** — AC-3은 (a) 추천대로 썼다 · **답(11/3, 사용자): (a)**

  | 후보 | 짚을 점 |
  |---|---|
  | **(a) 넘길 것 전체(`files`+`url`)로 `canShare`를 묻고, false면 지금처럼 저장 — 추천** | 규칙이 하나라 CAREER-34 AC-6 · CAREER-36의 '저장' 규칙과 그대로 맞는다. `canShare`는 `url`이 바른 주소면 `url` 때문에 false가 되지 않으므로(표준 동작), `files`만 되는 기기가 저장으로 밀리는 경우는 거의 없을 것으로 본다 — 실제로는 손으로 재지 않음 |
  | (b) false면 `files`만으로 다시 묻고 되면 지금처럼 그림만 보냄, 그것도 안 되면 저장 | (a)에서 밀릴 수 있는 기기에도 그림은 간다. 대신 갈래가 하나 늘고, 그 기기에서는 이 스토리의 목표(주소)가 조용히 빠진다. 아깝게 떨어진 후보 |
  | (c) false면 `url`만 보냄 | 카드가 빠져 Jira '카드 그림은 지금처럼 같이 간다'를 어긴다 |

- **U2 주소 값의 원본을 어디에 두나** — AC-2는 (a) 추천대로 썼다 · **답(11/3, 사용자): (a)**

  | 후보 | 짚을 점 |
  |---|---|
  | **(a) 지금 페이지의 `location.origin + '/'` — 추천** | 카드 주소 글자(`location.host`)와 같은 원본이라 둘이 어긋날 수 없다. 새 값 · 새 설정이 없고, 테스트(로컬 주소)와 배포에서 저절로 맞는다. 다른 주소(예: 나중의 도메인)로 들어온 사람은 그 주소를 보낸다 — 카드 글자도 같다 |
  | (b) `options.js`에 `https://d2x05xzjhjvp9j.cloudfront.net/` 상수 | 어디서 열어도 같은 주소를 보내지만, 카드 글자와 원본이 둘이 되고 도메인을 바꾸면 코드를 고쳐야 한다. 테스트에서 넘긴 주소가 테스트 서버가 아니게 된다 |
  | (c) 빌드 환경변수(`VITE_…`) · `contracts/deploy.md` | 원본은 하나가 되지만 `contracts/` · CI를 건드려 '서버·인프라 안 바꿈'과 맞닿는다. 도메인을 정할 때(11/8 뒤) 다시 볼 후보 |

### architect 몫 — 담당: architect · 때: plan에서, 만들기 전
- A1 이 스토리가 ADR을 새로 남길 결정인지 본다. 추천: ADR-0010(카드는 브라우저에서 그림)과 ADR-0009(주소는 `/`)를 둘 다 바꾸지 않으므로 새 ADR 없이 PR '결정' 칸에 U1 · U2 답을 적는다
- A2 CAREER-34 spec AC-2의 "`url` 없음" 줄에 CAREER-37을 가리키는 메모를 달지(Q2가 '맞다'일 때) · 그 줄을 그대로 두고 이 spec이 대신하는 것으로 할지 정한다
- A3 AC-1의 "`canShare`가 `share`와 같은 인자로 불림"을 가짜 `canShare`가 무엇을 기록해서 볼지(지금은 `files` 개수만 기록) — test-writer에게 넘길 모양을 정한다

### 머지 뒤
- ✔ (11/4 옮김) AC-8 결과(Q1의 실제 모습)를 이 spec의 Q1 아래에 한 줄로 옮긴다 — 담당: release-ops가 배포 확인 때 사용자에게 받아서, spec 쓰기 권한이 있는 spec-writer · architect가 적는다 · 때: 배포 확인 뒤

[CAREER-31](https://culonculon98.atlassian.net/browse/CAREER-31) · spec: [spec.md](spec.md) · 작업: [tasks.md](tasks.md) · 약속: [contracts/appraise-http.md](../../contracts/appraise-http.md) §5·§8·§10 · [contracts/appraise.md](../../contracts/appraise.md) §5 · 결정: [ADR-0005](../../docs/adr/0005-usage-file-outside-code-folder.md) · [ADR-0006](../../docs/adr/0006-per-person-limit-in-server-memory.md) (둘 다 확정)

상태: 승인됨 (2026-10-24 — 사용자 승인 D1~D9. contracts 두 곳 · ADR-0005·0006 · ADR-0002·0004 고침 함께 승인) · (2026-10-26 — 사용자 승인 D10~D12: 'A5 답 — AC-8' 다시 쓴 판 · contracts/appraise-http.md §2·§8 고침) · (2026-10-26 — 사용자 승인 D13 '가' · D14 넓히지 않음: G8에서 안 A를 넣어 본 결과 '읽기를 멈춘 뒤 들어오는 여분'. 'A5 답 — AC-8' 아래 '안 A 넣어 본 결과' 절 · contracts/appraise-http.md §2·§8 고침)

## 정해진 것 (10/26 사용자 — 읽기를 멈춘 뒤 들어오는 여분)
| # | 무엇 | 정한 것 (10/26 사용자) | 후보 · 근거 | 어디에 반영 |
|---|---|---|---|---|
| D13 | **한도를 넘어 읽기를 멈춘 뒤에도 서버 소켓에 더 들어오는 여분을 어떻게 다룰까**(실측: 한도를 넘은 뒤 서버가 받은 바이트가 `REJECT_DRAIN_BYTES`보다 113,145~162,288 많음 — 테스트 (5)의 여유 `SLACK` 100,000을 넘음) | **가** — 추천대로. 약속 글을 실제 동작에 맞게 고친다: '읽지 않음' → '더 처리하지 않고 읽기를 멈춤, 멈추기 전에 받아 둔 바이트는 들어올 수 있음'. (5)는 여유를 이름 붙은 값 `PAUSE_SLACK = 4 × 64KiB`(262,144)로 두고, **업로드를 3,000,000과 6,000,000 두 번** 보내 둘 다 같은 상한 안인지 본다(업로드 크기와 상관없이 묶여 있다는 것을 확인) | **가** (고름): 새 설정 값 없음. 공개 API(`req.pause()`)만 쓴다. 테스트 상한이 숫자 하나 커지지만, 업로드를 두 배로 늘려도 같은 상한 안이어야 해서 '끝없이 읽지 않음'은 지금보다 더 엄하게 본다. 약점: 여분 크기는 Node 판과 OS에 따라 다르다(이 저장소는 Node 판을 고정하지 않음). CI(Linux)에서 한 번 더 재 봐야 한다 / **나** 내부 API로 바로 멈추기(`req.socket._handle.readStop()`): 밑줄로 시작하는 비공개 API라 Node 판이 바뀌면 조용히 깨진다. 게다가 이미 libuv가 읽어 JS로 넘긴 덩어리는 되돌리지 못해서 여분이 줄어들 뿐 0이 되지 않는다. 그러니 `SLACK` 100,000 안에 든다는 보장도 없다 / **나′** 공개 API로 더 일찍 멈추기(셈을 `req.socket.bytesRead`로 하고 문턱을 `REJECT_DRAIN_BYTES − 여유`로 낮춤): 테스트 글자는 지킨다. 하지만 실제로 버리는 한도가 숨은 두 번째 값이 되고, 그 여유를 실측에 맞춰 정해야 한다. **코드를 테스트에 맞추는 일**이라 버린다 / **다** D10을 안 C로 바꾼다(코드는 그대로 두고 spec AC-8을 '받아들인 위험'으로): 약속 글은 '읽지 않음'을 지킨다. 대신 리뷰 ①이 닫히지 않고 G7 AC-8 테스트와 spec을 다시 써야 한다 | plan 'A5 답' · contracts/appraise-http.md §2·§8(아래 글 — 10/26 architect가 넣음) · tasks G8 단계 1 |
| D14 | **CAREER-25 '(2)'(쿼리 거절 · chunked 3,000,000)의 상한도 같이 넓힐까** — 같은 코드 길을 지나지만 지금은 통과(Node 클라이언트가 길이 붙은 응답을 받고 스스로 끊어서 여분이 생기기 전에 닫힌다) | **넓히지 않는다** — 추천대로. (1)~(4)는 지금 그대로 둔다. CI에서 (2)가 `bytesRead`로 실패하면 고치지 말고 **멈춘다**. 그때 같은 `PAUSE_SLACK`을 쓸지 다시 묻는다 | 넓힘: 미리 막는다. 하지만 실패한 적 없는 CAREER-25 테스트의 기대값을 바꾸게 되어 reviewer가 '테스트 느슨하게 고치기'로 볼 근거가 생긴다 / 그대로(추천): 바뀌는 테스트가 (5) 하나뿐이다. 흔들릴 위험은 G8 단계 1.5(3번 돌리기)와 CI에서 드러난다 | tasks G8 단계 1 |

**D13 '가' — contracts/appraise-http.md에 넣은 글** (10/26 architect가 넣고 맨 위 상태 줄에 날짜를 적었다)
- §2 33줄: "한도를 넘으면 더 읽지 않고 `REJECT_LINGER_MS`(§8) 뒤 연결을 끊는다." → "한도를 넘으면 서버는 본문을 더 처리하지 않고 읽기를 멈춘 뒤 `REJECT_LINGER_MS`(§8) 뒤 연결을 끊는다. 읽기를 멈추기 전에 받아 둔 바이트는 더 들어올 수 있다(Node·OS 읽기 단위 몇 번, 하나에 최대 64KiB). 한도를 넘은 연결에서 서버가 받는 바이트는 업로드 크기와 상관없이 `REJECT_DRAIN_BYTES` + 256KiB 아래다."
- §8 `REJECT_LINGER_MS` 줄: "그동안 읽지 않음" → "그동안 본문을 처리하지 않음(읽기 멈춤 — 멈추기 전 받은 여분은 §2)"

## 정해진 것 (10/26 사용자 — AC-8 다시)
| # | 무엇 | 정한 것 (10/26 사용자) | 후보 · 근거 | 어디에 반영 |
|---|---|---|---|---|
| D10 | **AC-8을 어떻게 지킬까** (자세한 것은 'A5 답 — AC-8') | **안 A** — 추천대로: `Content-Length` 없이(chunked) 올린 요청을 거절할 때만 응답에 `Content-Length`를 붙여 응답이 혼자 끝나게 하고, 한도를 넘으면 **더 읽지 않고 읽기만 멈춘 채** `REJECT_LINGER_MS` 뒤에 끊는다. `Content-Length`를 보낸 업로드(브라우저 앱)는 지금 그대로 | **안 B**: A에 더해 쓰기 쪽만 먼저 닫고(FIN) 그동안 더 읽어 버린다(Apache·nginx식 lingering close). 시간과 바이트, 새 값이 둘이 되고 `REJECT_DRAIN_BYTES`보다 더 읽게 되어 CAREER-25 (2)·(3) 상한을 다시 정해야 한다 / **안 C**: 코드는 그대로 두고 spec AC-8을 '받아들인 위험'으로 바꾼다(아래 글 제안). 새 값은 없지만 CAREER-25 리뷰 ①은 닫히지 않는다 | plan 'A5 답' · tasks G8 · (A·B면) contracts §2·§8 / (C면) spec AC-8 · G7 AC-8 테스트 |
| D11 | **`REJECT_LINGER_MS`** (안 A·B일 때 새로 생기는 남용 값, contracts §8 후보) — 한도를 넘은 chunked 거절 연결을 끊기 전에 붙잡아 두는 시간 | **1,000 ms** — 추천대로 | **500**: 같은 리전의 CloudFront나 로컬은 몇 ms 안에 읽으므로 충분하다. 다만 붙잡는 시간은 줄어들어도 실제 차이는 거의 없다 / **1,000 (추천)**: 받는 쪽이 1초 넘게 읽지 못할 때만 실패한다. 이미 커밋된 AC-8 테스트(시간 제한 60초)는 30번이 모두 붙잡혀도 30초라 안에 들어온다 / **2,000** (Apache가 쓰는 2초): 30번이 모두 붙잡히면 60초가 되어 이미 커밋된 테스트의 시간 제한에 닿는다 — 테스트를 고쳐야 한다. 이 값을 쓰는 동안 붙잡히는 것은 연결 하나(fd 하나와 커널 받기 버퍼)뿐이고, 서버가 더 읽는 바이트는 0이다(⚠ 10/26 실측: 멈추기 전 64KiB 덩어리 몇 개 — D13). 천천히 보내는 상대는 지금도 Node 기본 요청 시간 제한(`server.requestTimeout`, Node 18부터 기본 300초 — 이 저장소는 바꾸지 않음)까지 연결을 잡을 수 있으므로, 이 값 때문에 잡을 수 있는 시간이 늘어나지 않는다 | `api/src/config.js` · contracts §8 한 줄 · tasks G8 |
| D12 | contracts 고칠 글 (A일 때) · 이 plan · tasks G8 승인 | **승인** — 아래 두 줄을 architect가 contracts에 넣었다(10/26) | §2 '본문을 다 읽기 전에 거절하면'의 "한도를 넘으면 연결을 끊는다(응답은 이미 보냈다)" → "한도를 넘으면 더 읽지 않고 `REJECT_LINGER_MS`(§8) 뒤 연결을 끊는다. 본문을 `Content-Length` 없이(chunked) 보냈으면 거절 응답에 `Content-Length`를 붙여 응답이 먼저 끝난다 — 보내는 쪽은 그 뒤 업로드를 멈춰도 된다" · §8에 `REJECT_LINGER_MS` 한 줄(D11 값 · '한도를 넘은 거절 연결을 끊기 전 붙잡는 시간, 그동안 읽지 않음' · 원본 이 plan 'A5 답') | contracts/appraise-http.md §2·§8 · 상태 줄 |

## 정해진 것 (10/24 사용자)
| # | 무엇 | 정한 것 (10/24 사용자) | 후보 · 근거 | 어디에 반영 |
|---|---|---|---|---|
| D1 | **사람별 셈(1분 · 하루)을 어디에 둘까 (spec A3)** — 메모리면 서버를 다시 켤 때 모두 비워진다(하루 50번 몫 포함) | **M 메모리(Map 하나, 개수 상한 + 오래 안 쓴 것부터 버림)** — 추천대로. 다시 켜면 사람마다 1분 5번·하루 50번이 새로 찬다. 돈은 하루 상한 300(파일, 다시 켜도 이어짐)이 그대로 막는다 — 비워져서 생기는 손해는 '한 사람이 그날 몫을 더 쓸 수 있음'뿐이고, 그것도 300 안이다 | **F 파일 하나(셈 파일처럼)**: 다시 켜도 이어지지만, 사람별 셈은 **요청마다**(기억 hit·`invalid_input` 포함) 바뀌므로 요청마다 사람 수만큼 큰 파일을 동기로 다시 쓴다(1만 명 ≈ 600KB/요청) — 이벤트 루프를 막고, 파일 고장 때 '모두 막기'인지 '사람별만 끄기'인지 새 규칙이 필요하다 / **F2 날짜별 덧붙이기 기록 + 켤 때 다시 읽기**: 쓰기는 가볍지만 켤 때 읽기·반쯤 쓴 줄·지우기 규칙이 생겨 코드가 두세 배 / **F3 하루 몫만 파일, 1분 창은 메모리**: 되긴 하지만 F의 쓰기 문제가 그대로(하루 몫도 요청마다 바뀜). 메모리의 약점(다시 켜면 비워짐)은 '서버를 죽일 수 있는 사람'만 쓸 수 있고, 그 사람도 하루 상한은 못 넘는다 | ADR-0006 · contracts §5 '사람별 제한' 마지막 줄 · tasks G1·G2 |
| D2 | **사람별 제한에 걸렸을 때 새 실패 코드 · HTTP 상태 · 화면 문구 (spec U4 · AC-5)** | 코드 **`person_limit`** · HTTP **429** · 문구 **A "허허, 너무 자주 왔구먼. 좀 쉬었다 와."** (23자) — 추천대로 | **코드**: `person_limit`(고름 — `daily_limit`과 짝, 로그 `reason`은 `person_minute`/`person_day`로 1분·하루를 가름) / `too_often`(문구와 맞지만 '무엇의 상한'인지 안 보임) / `rate_limited`(흔한 이름이지만 하루 상한도 rate라 헷갈림). **HTTP**: 429(고름 — 표준 '요청이 너무 많음', `daily_limit`과 같고 화면은 본문 `code`로만 가름) / 403(거절이 영구처럼 읽힘) / 503(서버 고장과 섞임). `Retry-After`는 붙이지 않는다(`daily_limit`과 같음 · 화면은 헤더를 안 읽음). **문구**(아저씨 반말, 30자 안쪽, 퇴근·출근·오늘·밤 12시를 쓰지 않음): **A** "허허, 너무 자주 왔구먼. 좀 쉬었다 와." (23자 — 이유를 말하고, '얼마나 쉬라'를 말하지 않아 1분 막힘·하루 50번 막힘 둘 다에 틀리지 않음. '~구먼'은 감정 대사 말맛과 같음) / **B** "어이쿠, 숨 좀 돌리자. 조금 있다 다시 와." (25자 — 부드럽지만 '조금 있다'가 하루 50번에 막힌 사람에겐 틀림) / **C** "아저씨 눈 좀 쉬자. 이따 다시 보여 줘." (23자 — 캐릭터 맛이 가장 크지만 이유가 안 보이고 B와 같은 약점). 셋 다 하나의 코드로 1분·하루를 함께 덮는다 — 둘을 가르려면 코드가 둘이 되어야 해 spec U4('새 실패 코드' 하나)를 넘는다 | contracts/appraise-http.md §5 · appraise.md §5 · `app/src/options.js` · tasks T1·F1 |
| D3 | **셈 파일의 배포 자리 (spec A1 · AC-6)** — 되돌리기 어려운 쪽(배포 뒤 옮기면 그날 셈이 0)이라 묻는다 | **서버를 돌리는 사용자의 홈 아래 `~/.local/state/how-much/usage.json`** (`config.js`에서 `os.homedir()`로 한 번 계산, 환경변수 없음). 로컬·EC2가 같은 줄 하나. 처음 쓸 때 폴더 `0700`·파일 `0600`으로 만든다 — 추천대로 | 아래 'A1 답' · ADR-0005 '버린 대안'(환경변수 경로 · systemd `StateDirectory` · `/var/lib/how-much` 고정 · 코드 폴더 옆). 약점: 로컬에서 worktree 여러 개와 시험 실행이 **셈 하나를 나눠 쓴다**(지금은 worktree마다 따로) — 비용 상한의 뜻(이 컴퓨터가 하루에 쓰는 돈)에는 더 맞다. 지금 있는 `api/var/usage.json`은 버려져 로컬 셈이 한 번 0에서 다시 시작한다 | ADR-0005 · ADR-0004 상태 줄 · contracts §8 `USAGE_FILE` · tasks G3·G4 |
| D4 | **사람별 셈 개수 상한 `PERSON_MAX_ENTRIES`** (남용 한도 값 — CLAUDE.md §4) | **10,000** (항목 ≈ 0.3KB → 약 3MB). 넘으면 가장 오래 안 쓴 사람부터 버림 — 추천대로 | 1,000: 하루 방문자가 1천 명을 넘는 날 활발한 사람도 버려져 셈이 새로 찬다 / 100,000(약 30MB): 작은 EC2에서 눈에 띄게 쓰고, 1만 개가 넘는 주소를 돌리는 사람은 어차피 사람별 제한을 피한다(돈은 하루 상한이 막음) | contracts §8 · tasks G1·G2 |
| D5 | **IPv6는 앞 64비트(/64)를 한 사람으로 (spec U2 '같은 접속 주소'의 뜻 넓히기)** | **/64로 묶는다** — 추천대로. 집·휴대폰 하나가 보통 /64 하나를 받고, 그 안에서 주소를 마음대로 바꿀 수 있다 — 주소 그대로 세면 IPv6 한 사람이 주소만 바꿔 사람별 제한을 피한다. IPv4는 주소 그대로, IPv4를 담은 IPv6(`::ffff:1.2.3.4`)는 IPv4로 | 주소 그대로(U2 글자 그대로): 위 구멍 / /48: 회사·통신사 한 곳 전체가 한 사람이 될 수 있어 함께 걸림이 커진다 | contracts §5 '사람별 제한' · tasks G1·G2 |
| D6 | **`createServer`가 사람별 셈(`personLimit`)을 반드시 받게 — 그래서 이미 있는 api 테스트와 시험 실행을 고친다** | **필수(기본값 없음)** — 추천대로. CAREER-27 D4와 같은 이유. 고칠 곳: `server.test.js` 2 · `photo-upload.test.js` 1 · `daily-limit.test.js` 1(`start`) · `memo.test.js` 1 · `live.test.js` 4 · `eval/live.js` · `eval/run.js`. 테스트·시험 실행은 넉넉한 사람별 셈(`minute`·`day` 1,000)을 넣는다 | 기본값 = 진짜 값(5/50): 기본값이 있어도 이미 있는 테스트는 한 서버에 6번 넘게 보내므로(모두 '주소 없음' 한 사람) 어차피 고쳐야 한다. 필수로 두면 고칠 곳이 `TypeError`로 바로 드러난다 | tasks G2 |
| D7 | **시험 실행(`npm --prefix api run eval`)은 사람별 제한을 넉넉히(1,000)** | **넉넉히(1,000)** — 추천대로. 차례로 약 60건을 보내는 운영자 도구라 1분 5번이면 멈춘다. 돈은 하루 상한(D5 CAREER-27 그대로 진짜 셈)이 막는다 | 진짜 값(5/50): 시험 실행이 1분마다 멈춰 못 쓴다 / 시험 실행에 1분 대기 넣기: 60건에 12분 | tasks G2 |
| D8 | **확인 한 가지 — `aws-infra-portfolio`의 엔드포인트 PR(CAREER-25)이 이미 머지됐나?** | **아직 머지 안 됨**(10/24 사용자 확인: PR #2 OPEN · draft · mergedAt null) → ADR-0002 49줄은 초안 그대로 '아직 안 머지 → 배포 스토리(CAREER-30)에서 배포 직전에 머지'. 엔드포인트 요금은 아직 나가지 않는다 | 가정 1(머지 = apply). 이미 머지됐다면 그날부터 요금이 나가 끌지·둘지를 정해야 했다 — 해당 없음 | ADR-0002 · tasks U1 |
| D9 | contracts 고침(appraise-http.md §5·§8·§10, appraise.md §5) · ADR-0005·0006 · ADR-0002·0004 고침 · 이 plan · tasks 승인 | **모두 승인**(2026-10-24) | — | 상태 줄 (tasks U1) |

## 접근 방법
막을 것이 다섯 갈래라 **서로 따로 테스트되는 다섯 조각**으로 나누고, 모두 `api/` 안에서 끝낸다(화면은 문구 한 줄과 코드 하나).

1. **사람별 문**(AC-1~4) — 새 파일 `api/src/person-limit.js`. 요청이 우리 경로·메서드를 지나면 **본문을 읽기 전에** `CloudFront-Viewer-Address` 한 헤더로 사람 열쇠를 만들고, 메모리 셈에서 동기로 `take(key)`를 부른다. 걸리면 429 `person_limit`, 본문은 이미 있는 '거절 뒤 남은 업로드' 길로 버린다. 기억 hit·`invalid_input`·`daily_limit`으로 끝날 요청도 이 문을 먼저 지나므로 저절로 센다(U3). 하루 셈 문(CAREER-27)은 그대로 `send` 바로 앞에 있어 둘은 따로 돈다.
2. **셈 파일 자리**(AC-6) — `config.js`의 `USAGE_FILE` 한 줄만 홈 아래 상태 폴더로 바꾸고, 처음 만들 때 권한을 좁힌다. 쓰는 법(ADR-0004)은 그대로.
3. **자격 증명 시작 점검**(AC-7) — `startServer`가 진짜 Bedrock 클라이언트를 만들 때 `client.config.credentials()`(자격 증명 사슬 풀기 — Bedrock을 부르지 않음)를 `listen` **전에** 기다린다. 실패하면 이름만 든 로그 한 줄 + 종료 코드 1.
4. **CAREER-25 리뷰 ①②③**(AC-8~10) — (10/26 다시, D10 안 A — 사용자 승인) chunked 업로드를 거절할 때만 응답에 `Content-Length`를 붙이고, 한도를 넘으면 읽기를 멈춘 채 `REJECT_LINGER_MS` 뒤에 끊음 · 경고는 원인을 찾아 없앰 · 로그 실패를 표준 오류에 한 줄.
5. **기록**(AC-11) — ADR-0005(셈 파일 자리) · ADR-0006(사람별 제한) · ADR-0002 49줄 고침.

시계(`now`)·상한 값은 `createPersonLimit({ … , now })`로 밖에서 넣는다 — `send`·`memo`·`dailyLimit`과 같은 꼴.

### 바뀌는 파일
| 파일 | 하는 일 | 누가 | AC |
|---|---|---|---|
| `api/src/config.js` | 더함: `PERSON_HEADER = 'cloudfront-viewer-address'` · `PERSON_MINUTE_LIMIT = 5` · `PERSON_WINDOW_MS = 60_000` · `PERSON_DAY_LIMIT = 50` · `PERSON_MAX_ENTRIES = 10_000`(D4) · (10/26, D10 A·D11) `REJECT_LINGER_MS = 1_000`. 바꿈: `USAGE_FILE = join(homedir(), '.local', 'state', 'how-much', 'usage.json')`(D3) | 앞 세션 | 2·6·8 |
| `api/src/person-limit.js` (새로) | `personOf(headerValue)` → `{ key, who }` · `createPersonLimit({ minuteLimit, windowMs, dayLimit, maxEntries, now })` → `{ take(key), size() }` · `PersonLimitError`. 디스크·네트워크를 쓰지 않는다. `dayOf`는 `daily-limit.js`에서 가져온다(서울 날짜 정의 한 곳) | 앞 세션 | 1~4 |
| `api/src/daily-limit.js` (두 군데) | `mkdirSync(…, { recursive: true, mode: 0o700 })` · `writeFileSync(tmp, …, { flush: true, mode: 0o600 })` — 그 밖은 그대로 | 앞 세션 | 6 |
| `api/src/server.js` | `createServer({ …, personLimit })` 필수(D6) · 경로·메서드 뒤 사람별 문 · `toReply`에 `PersonLimitError` → 429 · 로그 필드 셋 · 로그 실패를 stderr 한 줄(AC-10) · `writeJson` 고침(AC-8 — 'A5 답' 안 A) · `startServer`에 자격 증명 점검과 `StartupError`(AC-7) · 직접 실행 경로에서 `StartupError`면 로그 한 줄 + `process.exitCode = 1` | 앞 세션 | 1~4·7·8·10 |
| `api/src/bedrock.js` | AC-9 원인이 여기라면 리스너 수명만 고친다(아래 'A5 답') — 원인이 다른 곳이면 건드리지 않는다 | 앞 세션 | 9 |
| `api/eval/live.js` · `api/eval/run.js` | `runLive({ …, personLimit })` → `createServer`. `run.js`는 넉넉한 사람별 셈(D7) | 앞 세션 | (D6·D7) |
| `api/tests/test-person-limit.js` (새로) | `testPersonLimit({ minuteLimit = 1000, dayLimit = 1000, windowMs = 60_000, maxEntries = 1000, now } = {})` → `createPersonLimit(…)` | 앞 세션 | — |
| `api/tests/person-limit.test.js` (새로) | 단위(`personOf` · `take` · 창 · 하루 · 상한 · 잘못된 값) + HTTP로 AC-1~4 + AC-2 배포 값 | 앞 세션 | 1~4 |
| `api/tests/usage-location.test.js` (새로) | AC-6 — `api/src`를 임시 폴더 둘에 복사해 각자의 `config.js`로 셈을 만들고 이어지는지 | 앞 세션 | 6 |
| `api/tests/startup.test.js` (새로) | AC-7 — `node src/server.js`를 자식 프로세스로, 자격 증명 없음/가짜 환경 | 앞 세션 | 7 |
| `api/tests/server.test.js` | 더함: AC-8(chunked 30번) · AC-10(로그 실패) · (10/26) 'AC-2(f)' (5) 붙잡는 시간 상한 지키는 테스트. 고침: `createServer`에 `personLimit`(D6) | 앞 세션 | 8·10 |
| `api/tests/helpers.js` | 더함: `streamChunked(url, { headers, total })` — 응답을 기다리지 않고 본문을 계속 올리며 응답 상태·본문·`complete`(응답 `end`가 끊김보다 먼저)를 모은다 | 앞 세션 | 8 |
| `api/tests/daily-limit.test.js` | 더함: 파일 맨 위 경고 모으기 + `afterAll`에서 `MaxListenersExceededWarning` 0개(AC-9). 고침: `start`에 `personLimit`(D6) | 앞 세션 | 9 |
| `api/tests/photo-upload.test.js` · `memo.test.js` · `live.test.js` | `personLimit: testPersonLimit()`를 더함 — **이것 말고는 고치지 않는다** | 앞 세션 | (D6) |
| `app/src/appraise.js` | `CODES`에 `'person_limit'` | frontend-dev | 5 |
| `app/src/options.js` | `ERROR_TEXT.person_limit = '<D2 글자 그대로>'` | frontend-dev | 5 |
| `app/tests/FirstFlow.test.jsx` · `app/tests/appraise.test.js` | AC-5 화면 · 어댑터가 `person_limit`을 그대로 넘기는지 · 문구가 contracts 줄과 같은지 | test-writer | 5 |
| `contracts/appraise-http.md` · `contracts/appraise.md` · `docs/adr/0005-…` · `0006-…` · `0002-…`(49줄) · `0004-…`(상태 줄·위험 첫 줄) | 이 PR에서 architect가 고침(10/24 사용자 승인) | architect | 11 |

- 건드리지 않는 것: `app/src/App.jsx`(`e.code in ERROR_TEXT`가 이미 새 코드를 오류 길로 보낸다 — 아래 '화면') · `e2e/` 전부 · `infra/` · `.github/` · `pipeline.config.json` · `api/.gitignore`(`var/` 줄은 남겨 둔다 — 옛 셈 파일이 커밋되지 않게) · `api/src/memo.js`·`input.js`·`jpeg.js`·`output.js`·`prompt.js`·`grades.js`.
- 새 의존성: 없음(`node:net` `isIP` · `node:os` `homedir`만. 10/26: 안 A는 `node:stream` `finished`를 쓰지 않는다).

## 요청 한 건의 흐름 (CAREER-27 표에 한 단계 더함)
| 단계 | 끝나는 경우 → `code` · `reason` |
|---|---|
| 경로 · 메서드 | 그대로 (`invalid_input` · `bad_path`/`bad_method`) — **사람별로 안 셈** |
| **사람별 문** (새로 — 본문 읽기 전, 요청마다 1번) | `person_limit`(429) · `person_day`(그날 몫 다 씀) / `person_minute`(최근 1분에 5번) |
| 쿼리 · 헤더·크기 · JPEG | 그대로 (`invalid_input` · …) — 사람별로는 **이미 셈**, 하루 셈은 안 셈 |
| 기억 확인 | 그대로. `hit`이면 하루 셈 문·Bedrock을 건너뜀 — 사람별로는 이미 셈 |
| 하루 셈 문 · Bedrock · 모델 출력 · 기억에 넣기 · 등급 표 | 그대로 (CAREER-27) |

로그 1줄에 세 필드를 더한다(요청마다 1줄은 그대로, 응답 쓰기 전):
```
{"evt":"appraise","outcome":"ok","reason":null,"ms":1834,"attempts":1,"inputTokens":1520,"outputTokens":31,"grade":3,"memo":"miss","day":"2026-11-08","dayUsed":17,"who":"ip4","personMinute":2,"personDay":9}
{"evt":"appraise","outcome":"person_limit","reason":"person_minute","ms":0,"attempts":0,"inputTokens":null,"outputTokens":null,"grade":null,"memo":null,"day":null,"dayUsed":null,"who":"ip4","personMinute":5,"personDay":12}
{"evt":"appraise","outcome":"invalid_input","reason":"bad_path","ms":0,"attempts":0,"inputTokens":null,"outputTokens":null,"grade":null,"memo":null,"day":null,"dayUsed":null,"who":null,"personMinute":null,"personDay":null}
```
| 필드 | 뜻 |
|---|---|
| `who` | 사람 열쇠를 **어떻게** 만들었나 — `"ip4"` · `"ip6"`(/64) · `"none"`(헤더 없음) · `"bad"`(헤더가 있는데 모양이 틀림). 문까지 안 왔으면 `null`. **주소·해시는 넣지 않는다**(A2 답) |
| `personMinute` | 그 사람의 최근 `PERSON_WINDOW_MS` 안 요청 수 — 통과면 이번 것을 넣은 뒤 값, 막혔으면 그때 값(막힌 요청은 안 넣음). 문까지 안 왔으면 `null` |
| `personDay` | 그 사람의 그날(서울) 요청 수 — 같은 규칙 |

- 운영에서 `who:"none"`이나 `"bad"`가 보이면 CloudFront 설정이 빠졌거나 누가 원본에 바로 온 것이다(CAREER-30이 막을 길). 로그만으로 알 수 있게 일부러 둘을 가른다.
- 거절 줄은 `outcome:"person_limit"`으로 '사람별 제한'임을 바로 안다(AC-4).

## A1 답: 배포 때 셈 파일 자리 → D3 · ADR-0005
| 무엇 | 정한 것 | 왜 |
|---|---|---|
| 자리 | `~/.local/state/how-much/usage.json` — `config.js`에서 `join(homedir(), '.local', 'state', 'how-much', 'usage.json')`. **환경변수 없음**(`HOME`은 OS가 넣는 값) | 코드 폴더를 통째로 바꿔 넣어도(배포 방식이 무엇이든) 남는다. 로컬·EC2가 같은 한 줄이라 '설정 한 곳'(AC-6) 그대로. 배포 방식은 CAREER-30이 정하므로, 그 방식에 기대지 않는 자리를 고른다 |
| 처음 만들 때 | 폴더가 없으면 `mkdirSync(dir, { recursive: true, mode: 0o700 })`, 파일은 `writeFileSync(tmp, …, { mode: 0o600 })` 뒤 이름 바꾸기 | 셈은 비밀은 아니지만, 같은 컴퓨터의 다른 사용자가 고쳐 상한을 새로 만들 수 없게. `mode`는 새로 만들 때만 걸리고(이미 있는 폴더는 그대로) umask가 더 좁힐 수는 있다 |
| 못 쓰면 | 지금 그대로 `usage_store_write`/`usage_store_read` → 503 `unavailable` (ADR-0004 · CAREER-27 U10) | 막는 쪽 |
| ADR-0004 | **고치지 않고 '자리'만 ADR-0005로 대체** — 모양(`{"day","used"}`)·동기 읽고 쓰기·원자적 이름 바꾸기는 ADR-0004가 계속 원본 | 결정 하나(자리)만 바뀌고 나머지는 그대로라, 통째 대체보다 범위가 정확하다. ADR-0004 상태 줄에 '자리는 0005로 대체됨'을 적었다 |
| 옛 파일 | `api/var/usage.json`은 읽지도 옮기지도 않는다 | 로컬뿐이라 한 번 0이 되는 것으로 끝(D3 약점). 옮기는 코드는 한 번 쓰고 버릴 코드 |
| EC2에서 맞출 것 | 서비스 사용자에게 **다시 배포해도 남는, 쓸 수 있는 홈**이 있어야 한다 — systemd `DynamicUser=`·`ProtectHome=` 같은 설정을 쓰면 안 된다 | CAREER-30에 넘김(아래 '범위 밖') |

## A2 답: 사람을 가르는 값 · 없을 때 · 로그 · 실패 코드
| 무엇 | 정한 것 | 왜 |
|---|---|---|
| 읽는 값 | **`CloudFront-Viewer-Address` 헤더 하나**(Node에서 `req.headers['cloudfront-viewer-address']`, 이름은 `PERSON_HEADER`). `X-Forwarded-For`·`X-Real-IP`·`True-Client-IP`·소켓 주소는 **읽지 않는다** | 이 헤더는 CloudFront가 붙인다(원본 요청 정책에 넣어야 함 — CAREER-30). `X-Forwarded-For`는 브라우저가 앞부분을 마음대로 넣을 수 있다. 소켓 주소는 배포에서 CloudFront 주소라 모두가 한 사람이 된다. 두 출처를 섞으면 '한 가지뿐'(AC-3)이 깨진다 |
| 모양 | `<IP>:<포트>` — IPv6는 대괄호 없이 `2001:db8::1:46532`. **마지막 `:` 뒤(포트)를 버린다.** 포트가 `/^\d{1,5}$/`가 아니거나 앞부분이 `net.isIP`로 4·6이 아니면 `"bad"` | 포트는 연결마다 바뀐다 — 버리지 않으면 요청마다 새 사람이 되어 제한이 영영 안 걸린다(실패 시나리오 1) |
| 열쇠 | IPv4 → `4:<주소>` · IPv6 → `6:<앞 4묶음, 0을 채워 펼친 소문자>`(/64, D5) · IPv4를 담은 IPv6(`::ffff:a.b.c.d`) → `4:a.b.c.d` · 헤더 없음 또는 `"bad"` → **`-` 하나(모두 한 사람)** | 헤더가 없을 때 소켓 주소로 넘어가지 않는다(값 한 가지). '주소 없음'끼리 한 사람이면 거치지 않는 길이 없고(AC-3 (b)), 배포에서 설정이 빠지면 모두가 1분 5번에 걸려 바로 드러난다(막는 쪽). 로컬 dev(Vite 프록시)는 헤더가 없어 개발자 한 명 = 한 사람 — 맞는 동작이다 |
| 같은 헤더가 둘 | Node가 `", "`로 이어 붙인다 → 모양이 틀려 `"bad"` → `-` | 따로 다루지 않는다(막는 쪽) |
| 로그 | **주소를 남기지 않는다** — 해시도 안 남김. `who`(만든 방법) · `personMinute` · `personDay`만 | IPv4 해시는 2³²개를 다 해 보면 풀려 주소를 남기는 것과 같다. 비밀 열쇠 해시(HMAC)는 풀리지 않지만 지금 그 값으로 할 일이 없다 — CAREER-25가 기억 열쇠 해시를 안 남긴 것과 같은 이유. 한 사람이 두드리는지 여부는 거절 줄의 `personDay`가 크게 오르는 것으로 보인다 |
| 실패 코드 · 상태 | D2(`person_limit` · 429 · `Retry-After` 없음 · 본문 정확히 `{"code":"person_limit"}`) | — |
| contracts 고칠 곳 | appraise-http.md: 맨 위 상태 · §5 표 한 줄 · 어댑터 규칙 '넷' → '다섯' · §5 아래 '사람별 제한' 절 · §8 여섯 줄(`USAGE_FILE` 바꿈, `PERSON_*` 다섯) · §8 아래 두 줄(`personLimit` 필수 · 자격 증명 시작 점검) · §10 네 줄. appraise.md: 맨 위 상태 · §5 '넷' → '다섯' · 표 한 줄 · '화면 처리'에 한 줄 | 응답 모양·성공 응답·다른 코드의 동작은 바뀌지 않는다 |

## A3 답: 사람별 셈의 모양
| 무엇 | 정한 것 | 왜 · 버린 것 |
|---|---|---|
| 자리 | 메모리 Map 하나(D1 — 10/24 사용자 승인) | D1 표 |
| 1분 창 | **미끄러지는 창** — 사람마다 최근 통과 시각을 최대 `minuteLimit`(5)개 배열로 든다. `now - t < windowMs`인 것만 남기고, 남은 개수가 5면 막음. 정확히 `windowMs` 전 것은 창 밖 | 고정 창(달력 분): 59초와 61초 사이에 10번이 된다 / 토큰 버킷: 같은 뜻을 소수 셈으로 — 테스트가 읽기 어렵다. 배열 5칸이라 메모리는 같다 |
| 하루 | 사람마다 `{ day, dayUsed }` — `day`는 `dayOf(now())`(CAREER-27의 서울 날짜 함수 그대로 import). 읽은 `day`가 오늘보다 앞이면 0에서. 같거나 뒤(시계가 뒤로 감)면 그대로 | ADR-0004와 같은 규칙(새 상한이 생기지 않는 쪽) |
| 확인 차례 | 하루 먼저(`person_day`), 그다음 1분(`person_minute`) | 둘 다 넘었으면 더 오래가는 이유를 남긴다 |
| 막힌 요청도 셀까 | **안 센다** — 막힌 요청은 배열·`dayUsed`에 넣지 않는다 | 세면 계속 두드리는 사람은 1분이 지나도 계속 막혀(미끄러지는 창이 계속 밀림) 벌을 주지만, 실수로 여러 번 누른 사람도 같이 묶인다. 돈과 상관없고(문 뒤에 Bedrock이 없음), 하루 50번 몫이 이미 상한이다 |
| 셀 요청 | 경로·메서드를 지난 **모든** 요청 — 쿼리·크기·JPEG가 틀린 것, 기억 hit, 하루 상한에 걸릴 것 포함 | U3 '입구에 들어온 요청'. 본문을 읽기 전이라 막힌 요청은 본문을 `REJECT_DRAIN_BYTES`까지만 버리며 읽는다 — 사람별 제한이 '상한 뒤 홍수'(CAREER-27 실패 시나리오 9)도 막는다. 404·405는 우리 입구가 아니라서 안 센다 |
| 오래된 주소 비우기 | 타이머 없음. `take`마다 그 사람을 지웠다 다시 넣어 Map 차례를 '최근'으로(LRU). 넣은 뒤 크기가 `maxEntries`를 넘으면 Map 첫 열쇠 하나를 버린다 | 날짜가 지난 항목은 다음에 오면 0으로 다시 시작하므로 따로 비울 필요가 없고, 개수 상한이 메모리를 묶는다. 버려진 사람은 셈이 새로 찬다 — 1만 개 넘는 주소를 쓰는 사람만 얻는 이득이고 돈은 하루 상한이 막는다 |
| 동시 요청 | `take`는 동기(사이에 `await` 없음, Promise 아님) | CAREER-27 A4와 같은 이유 — 잠금이 필요 없다 |
| 잘못된 값 | `minuteLimit`·`dayLimit`·`maxEntries`는 1 이상 안전 정수, `windowMs`는 1 이상 정수 — 아니면 만들 때 `TypeError`. **0을 '끔'으로 쓰지 않는다** | 급히 막는 스위치는 이미 `DAILY_CALL_LIMIT = 0` 하나다. 0 = 끔이면 '사람별 제한 없는 서버'가 설정 한 글자로 생긴다 |

`take`의 약속
```
personOf(headerValue) → { key: '4:203.0.113.7' | '6:2001:0db8:0000:0001' | '-', who: 'ip4' | 'ip6' | 'none' | 'bad' }
take(key) → { minuteUsed, dayUsed }   // 이번 것을 넣은 뒤 값
throws PersonLimitError { reason: 'person_day' | 'person_minute', minuteUsed, dayUsed }   // 넣지 않음
```

## A4 답: 자격 증명 시작 점검 (AC-7)
| 무엇 | 정한 것 | 왜 |
|---|---|---|
| 확인하는 법 | `startServer`에서 진짜 클라이언트를 만든 뒤 `await client.config.credentials()` — SDK가 쓰는 **바로 그 사슬**(환경변수 → `AWS_PROFILE`·공유 파일 → … → EC2 인스턴스 역할)을 한 번 푼다. Bedrock·STS를 부르지 않는다 | 로컬(`AWS_PROFILE`)·EC2(인스턴스 역할)가 같은 코드. 따로 `@aws-sdk/credential-providers`를 넣으면 새 의존성 + 'SDK가 실제로 쓰는 사슬'과 어긋날 수 있다. `sts:GetCallerIdentity`는 진짜 확인이지만 네트워크·권한이 하나 더 필요하다(지금 IAM은 `bedrock:InvokeModel` 하나) |
| 언제 | `listen` **전**. `send`를 밖에서 넣은 경우(테스트·`startServer({ send })`)는 진짜 클라이언트가 없으므로 점검도 없다 | 자격 증명이 필요한 건 진짜 클라이언트뿐 |
| 실패하면 | `StartupError('no_credentials', <원래 오류 이름>)`를 던진다. 직접 실행 경로가 받아 `{"evt":"startup_failed","reason":"no_credentials","error":"CredentialsProviderError"}` 한 줄(stdout, 다른 `evt` 줄과 같은 자리) → `process.exitCode = 1`로 끝(포트 안 염) | 메시지·경로·프로필 이름은 넣지 않는다(이름만 — CAREER-25 로그 규칙). `process.exit(1)`은 파이프로 나가는 stdout을 덜 쓰고 끝낼 수 있어 쓰지 않는다 |
| 테스트에서 바꾸는 법 | **자식 프로세스로 진짜 경로를 돈다**(`node src/server.js`). 없음: `env`를 새로 만들어 `PATH`·`HOME=<빈 임시 폴더>`·`AWS_CONFIG_FILE`/`AWS_SHARED_CREDENTIALS_FILE=<없는 경로>`·`AWS_EC2_METADATA_DISABLED=true`·`PORT=0`만 넣음(부모의 `AWS_*`를 물려받지 않음). 있음: 위 + 가짜 `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` | 함수 주입으로는 '포트를 안 열고 0 아닌 코드로 끝남'을 볼 수 없다. 자식 프로세스면 종료 코드·출력·포트를 그대로 본다. IMDS를 끄지 않으면 로컬에서 몇 초 기다림이 생겨 흔들린다 |
| 받아들이는 것 | 켤 때만 본다 — 켠 뒤 만료되면 지금처럼 그 요청이 `unavailable`(Bedrock `ExpiredToken` 등) | 주기 점검은 타이머·상태가 생긴다(건너뜀, 일부러) |

- G5 첫 단계에서 `client.config.credentials`가 함수인지 실제로 본다. 함수가 아니면(SDK 판이 다르면) 멈추고 알린다 — 다른 길을 고르는 일은 이 plan을 고쳐 다시 묻는다.

## A5 답: AC-8 · AC-9 원인과 흔들리지 않는 확인법
> 10/24 판은 코드만 읽고 세운 가설이었다. 10/26 지금: AC-8은 G7(커밋 `9dce0bd`)에서 재현됐고, AC-9·AC-10은 고쳐서 커밋했다(`7e93b26`). AC-8만 아래 '— AC-8 (10/26 다시)'로 바꿨다. D10~D12는 10/26 사용자 승인(안 A · `REJECT_LINGER_MS` 1,000 · contracts 글).

### AC-8 — chunked로 큰 사진 (10/26 다시 씀 · 10/26 사용자 승인 — 안 A)
**알게 된 것** (앞 세션이 Mac에서 돌린 결과, 브랜치 HEAD `7e93b26`)
| 판 | 결과 | 읽은 뜻 |
|---|---|---|
| 지금 코드 (G7 재현) | 30번 중 27번 실패. 매번 400과 `{"code":"invalid_input"}`은 받았지만 `complete=false` | 끝 표시(`0\r\n\r\n`)를 `res.end()`로 보내는 바로 그 순간에 `destroy`한다 |
| 시도 ① `Content-Length` + `finished(res)` 뒤 `destroy` | AC-8은 30번 중 1번 실패, 그 회차는 `status null`(응답을 하나도 못 받음). **CAREER-25 'AC-2(f) (1)' 두 개가 깨짐**(`finished=false`) | ⓐ 응답이 `Content-Length`로 먼저 끝나면 Node 클라이언트는 업로드를 마치기 전에 연결을 닫는다. 그래서 `Content-Length`를 **보낸** 업로드(브라우저 앱)에는 붙이면 안 된다. ⓑ `finished(res)`는 응답을 OS에 넘긴 시점일 뿐이다. 400 응답은 거절한 순간(약 1MB째)에 이미 나갔지만, Mac loopback은 버퍼가 커서 서버가 남은 1MB를 곧바로 읽어 치우므로 응답이 나간 뒤 끊기까지의 틈이 거의 없다 |
| 시도 ② `Content-Length` 없이 `pause` + `finished(res)` 뒤 `destroy` | 3번 돌려 21·18·12/30 실패(모두 400, `complete=false`). 이미 있는 테스트는 통과 | 끝 표시와 끊기가 여전히 붙어 있다. 게다가 `Connection: close` 응답은 Node가 `res.end()`가 끝나면 **스스로** 소켓을 닫는다(`destroySoon`). 그래서 `res.end()`를 부르는 한 '끝 표시 → 바로 닫기'는 우리 `destroy`가 없어도 일어난다 |

**뿌리**: 받는 쪽(클라이언트)이 아직 올리는 중일 때 서버가 소켓을 닫으면 OS는 FIN 대신 RST를 보낸다. RST를 받은 쪽 OS는 앱이 **아직 읽지 않은** 받은 데이터를 버린다. 그래서 '응답을 언제 보냈나'가 아니라 **'응답이 닿은 뒤 클라이언트가 읽을 시간이 있었나'**가 갈림길이다. 클라이언트가 계속 올리는 한, 시간을 두지 않는 고침은 확률만 줄일 뿐이다(시도 ①이 그랬다). 시간을 두지 않으려면 업로드를 끝까지 읽어야 하는데, 이는 `REJECT_DRAIN_BYTES`(CAREER-25 (2)·(3))와 부딪친다. 그러므로 AC-8을 글자 그대로 지키려면 **시간 값 하나가 꼭 필요하다**(D11).

**지킬 것 넷**: AC-8(chunked > 2MB에서 30번 모두 `complete`) · CAREER-25 (1)(`Content-Length` ≤ 2MB 업로드는 끝까지 올라가고 오류 없음) · (2)·(3)(서버가 읽는 바이트 `< REJECT_DRAIN_BYTES + 100,000`) · (4)(끊긴 뒤 다음 요청 200).

**후보 비교** (한 줄씩)
| 안 | 무엇 | AC-8 | (1) | (2)·(3) | 새 값 | 코드 |
|---|---|---|---|---|---|---|
| **A (고름 — D10)** | chunked 거절만 응답에 `Content-Length`를 붙인다. 한도를 넘으면 `res.end()`를 부르지 않고 **읽기만 멈춘 채** `REJECT_LINGER_MS` 뒤 `destroy`한다 | 응답은 거절한 순간 이미 '끝난' 상태로 나가고, 끊기는 적어도 그 시간만큼 뒤에 온다. 클라이언트가 1초 넘게 읽지 못할 때만 실패한다 | 그대로(`Content-Length`를 보낸 갈래는 바꾸지 않음) | 그대로 — 붙잡는 동안 **읽지 않는다**(더 읽는 바이트 0) ⚠ 10/26 실측: 0이 아님 — 64KiB 덩어리 몇 개가 더 들어온다(아래 '안 A 넣어 본 결과' · D13) | 시간 하나 | `writeJson` 10줄 안팎 |
| B | A + 쓰기 쪽만 먼저 닫고(`socket.end()`, FIN) 그동안 받은 것을 더 읽어 버림(Apache·nginx의 lingering close) | A와 같다. 클라이언트가 FIN을 보고 일찍 멈추므로 붙잡는 시간이 짧아진다 | 그대로 | **깨질 수 있다** — 더 읽는 바이트가 생겨 여유 100,000 안에 들거나 `REJECT_DRAIN_BYTES`의 뜻을 바꿔야 한다 | 시간 + 바이트 둘 | A보다 크고, HTTP가 쓰는 소켓의 쓰기 쪽을 직접 닫는다(Node 안쪽과 얽힘) |
| C | 코드는 바꾸지 않고 spec AC-8을 '받아들인 위험'으로 바꾼다(아래 글 제안) | 바뀐 AC로 지킨다 | 그대로 | 그대로 | 없음 | 없음. G7 AC-8 테스트만 바꾼다 |
- 버린 것: 시도 ①(실패가 남고 (1)을 깸) · 시도 ②(실패율 그대로) · 끝 표시만 소켓에 직접 쓰고(`socket.write('0\r\n\r\n')`) 붙잡기 — Node HTTP 계층 아래에서 응답 틀을 손으로 써야 하고, HTTP/1.0 상대에게는 틀린 바이트가 된다 / 한도 없이 끝까지 읽기 — (2)·(3)과 CAREER-25 실패 시나리오 36을 되살린다 / 끊지 않고 Node 기본 요청 시간 제한(300초)까지 두기 — 새 값은 없지만 AC-8 테스트가 회차마다 멈추고, 연결을 5분씩 잡게 된다.
- **A를 고른 이유**: 새 값이 시간 하나뿐이고, 그 값으로 서버가 더 읽는 바이트는 0이다(⚠ 10/26 실측으로 틀림 — 몇 덩어리, 업로드 크기와 상관없이 묶임. D13). 천천히 보내는 상대는 지금도 연결을 더 오래 잡을 수 있으므로 남용 길이 넓어지지 않는다. 브라우저 앱은 `Blob` 본문이라 늘 `Content-Length`를 보내므로(`app/src/appraise.js` `fetch(…, { body })`) 실제 사용자 길은 한 글자도 바뀌지 않는다. **C를 고르는 경우**: 새 값을 두기 싫고, 'chunked로 2MB 넘게 보내는 비브라우저 클라이언트가 400 대신 끊김을 볼 수 있음'을 받아들일 때. 실제 사용자에게 닿는 손해는 A와 C 모두 사실상 없다(사진은 1024px로 줄여 1MB 아래). 차이는 리뷰 ①을 닫느냐, 값 하나를 더 두느냐다.

**안 A — 정한 동작** (`writeJson`의 버리기 길만. `req.complete` 갈래와 `declared > REJECT_DRAIN_BYTES` 갈래는 그대로)
| 경우 | 동작 |
|---|---|
| 본문을 `Content-Length` 없이(chunked) 보냄 | 응답 헤더에 `'Content-Length': Buffer.byteLength(text)`를 더한다(`Connection: close`는 그대로). 본문을 `res.write(text)`로 쓰면 클라이언트 쪽에서는 응답이 끝난다. `res.end()`는 지금처럼 미룬다 |
| `Content-Length` ≤ 한도를 보냄 (브라우저 앱 · CAREER-25 (1)·(4)) | **지금 그대로**(chunked 응답, 다 읽으면 `res.end()`) — 시도 ①의 (1) 깨짐을 피한다 |
| 버리며 읽다가 본문이 끝남(`req` `end`) | 지금 그대로 `res.end()` → Node가 다 읽은 소켓을 정상으로 닫는다 |
| 버리며 읽다가 `REJECT_DRAIN_BYTES`를 넘음 (실제로는 chunked만 여기 온다 — `Content-Length`를 보낸 본문은 Node 파서가 그 길이에서 자른다) | 리스너를 떼고(`stop()`), `req.pause()`(더 읽지 않음), `const t = setTimeout(() => req.socket.destroy(), REJECT_LINGER_MS)`, `req.socket.once('close', () => clearTimeout(t))`. **`res.end()`는 부르지 않는다** — 부르면 Node가 곧바로 소켓을 닫아(시도 ②) RST 경주가 되살아난다. 이 이유를 주석으로 남긴다 |
| 붙잡는 동안 클라이언트가 끊음 | 소켓 `close` → 타이머를 지운다. 로그는 더 남기지 않는다(CAREER-25 '로그는 그대로') |
- 사람별 거절(429 `person_limit`)도 같은 `writeJson` 길을 지나므로 같은 동작을 받는다(실패 시나리오 12).
- 붙잡는 소켓은 그 뒤 다시 쓰이지 않는다(`Connection: close`). 그래서 `once('close')` 리스너가 keep-alive 소켓에 쌓이지 않는다(AC-9와 부딪치지 않음).

**확인법**
- AC-8: G7에서 이미 커밋한 테스트를 그대로 쓴다(30번, 시간 제한 60초 — 고치지 않는다). 한도를 넘어 붙잡히는 회차는 그 회차가 `REJECT_LINGER_MS`만큼 길어진다. 1,000이면 가장 나쁠 때 30초다.
- CAREER-25 'AC-2(f)' (1)~(4): 그대로 통과해야 한다. 하나라도 깨지면 멈춘다.
- **새 지키는 테스트 (5)** (⚠ `bytesRead` 상한은 D13 '가'(10/26 승인)로 `+ PAUSE_SLACK`, 업로드 3,000,000·6,000,000 두 회차로 바뀜 — '안 A 넣어 본 결과') — 붙잡는 시간에 상한이 있는지 본다(타이머가 안 걸리는 고장은 Node 기본 300초까지 연결을 조용히 잡는다): `net.connect`로 chunked 요청 헤더를 보내고, 응답은 읽지 않은 채(`pause()`) 64KiB씩 3,000,000바이트를 쓴다 → 서버 쪽 소켓(`own()`의 `sockets`)이 연결부터 `close`까지 `REJECT_LINGER_MS + 3,000` ms 안에 끝난다 · `bytesRead < REJECT_DRAIN_BYTES + SLACK` · 로그 1줄 `too_large` · `send` 0. 지금 코드에서도 초록이다(지키는 테스트) — 구현 커밋보다 먼저 커밋한다.

**안 A 넣어 본 결과 — 읽기를 멈춘 뒤 들어오는 여분 (10/26 G8 · 앞 세션 Mac 실측 → 10/26 사용자 승인 D13 '가' · D14 넓히지 않음)**
| 무엇 | 결과 |
|---|---|
| 넣은 코드 | stash `c31-g8-linger-wip` — chunked 거절 응답에 `Content-Length` · 한도를 넘으면 `stop(); req.pause(); req.socket.pause(); setTimeout(destroy, REJECT_LINGER_MS)` · `close`에서 `clearTimeout` · `res.end()` 안 부름 |
| CAREER-31 AC-8 (30번) | 3번 돌려 모두 통과 |
| CAREER-25 'AC-2(f)' (1)~(4) | 모두 통과 · 경고 0 |
| (5) 시간 | 약 1,010ms(< `REJECT_LINGER_MS` + 3,000) 통과 |
| (5) `bytesRead < REJECT_DRAIN_BYTES + SLACK`(2,100,000) | **실패**. `req.pause()`만: 2,162,288 · `req.socket.pause()` 더함: 2,145,895 / 2,129,511 / 2,121,319 / 2,113,145 |

**읽은 뜻** (Node 소스와 실측으로 미룬 것 — 이 세션은 돌려 보지 않았다)
- `req.pause()`는 '더 넘기지 말라'는 신호일 뿐, 소켓 읽기를 그 자리에서 멈추지 않는다. Node HTTP 서버는 본문을 `req`에 밀어 넣다가 `req`의 버퍼가 차야(`push`가 `false`) 소켓 읽기를 멈춘다. 그래서 멈추기 전에 ① 한도를 넘긴 그 덩어리 ② `req` 버퍼가 찰 때까지 들어온 덩어리 ③ libuv가 이미 읽은 덩어리가 더 들어온다. 하나는 최대 64KiB다. 실측한 한도 위 여분(113~162KB, 헤더 포함)은 64KiB 두세 개와 맞는다.
- **끝없이 늘지는 않는다**: 소켓 읽기가 멈추면 남은 업로드는 커널 받기 버퍼에 쌓이고, 그것이 차면 TCP 창이 닫혀 보내는 쪽이 멈춘다. 커널 버퍼는 앱이 읽은 바이트가 아니고(`bytesRead`에 안 셈) 끊을 때 버려진다. 실측에서 3,000,000을 보내도 2.17M 아래에서 멈췄다. 다만 업로드 크기를 바꿔 본 적은 없어서, D13 '가'의 테스트가 6,000,000으로 이것을 확인한다.
- 옛 코드(바로 `destroy`)에 여분이 없던 이유는 한도를 넘는 순간 소켓을 없애서다. 그런데 바로 그 동작이 AC-8 실패(RST가 응답을 지움)의 원인이었다. **붙잡아 두면서 공개 API로 '그 순간부터 0바이트'를 지킬 길은 없다.**

**왜 '테스트를 맞추려고 고치는 것'이 아닌가**
1. 틀린 것은 약속 글이다. contracts §2·§8과 D11·'A5 답'의 '그동안 읽지 않음 / 더 읽는 바이트 0'은 architect가 Node 동작을 확인하지 않고 쓴 글이다(10/26 D12). 실제로 공개 API가 줄 수 있는 것은 '본문을 더 처리하지 않고 읽기를 멈춤, 멈추기 전 몇 덩어리는 들어옴'이다. (5)의 `bytesRead` 줄은 그 지나치게 강한 글을 `SLACK`(CAREER-25 '(2)·(3)'의 여유 — 바로 끊을 때를 생각한 값)과 함께 그대로 옮긴 것이다.
2. 테스트가 지키려던 성질은 그대로 남고 더 엄해진다. (5)의 목적은 '붙잡는 동안 남은 업로드를 다 읽지 않음 · 시간에 상한이 있음'(실패 시나리오 21·23)이다. 고친 상한(`REJECT_DRAIN_BYTES` + 100,000 + 262,144 = 2,362,144)도 업로드를 다 읽는 고장(3,000,000 · 6,000,000)과 확실히 갈린다. 거기에 업로드 6,000,000 회차를 더해 '업로드 크기와 상관없이 묶임'을 새로 본다. 시간 조건은 바꾸지 않는다.
3. 숫자는 실측값에 맞춘 것이 아니라 동작에서 끌어냈다. 64KiB 덩어리 넷(위 ①②③ + 한 개 여유)이다. 실측 최대(2,162,288)와는 약 200KB 떨어져 있다. 이름 붙은 값으로 두고 이 절을 원본으로 적는다.
4. 돈·남용 쪽 손해는 없다. 연결 하나에 한 번, 최대 수백 KB를 더 받을 뿐이다(EC2 들어오는 전송은 요금이 없음). 받은 바이트는 버리고 처리하지 않는다. Bedrock·하루 셈과도 상관없다.

**architect가 정한 것 (되돌리기 쉬움 — 묻지 않음)**
- `req.socket.pause()`는 **넣지 않는다**(plan 'A5 답' 정한 동작 그대로 `req.pause()`만). 비교한 것이 `req.pause()`만 쓴 1번과 함께 쓴 4번뿐이라 차이가 흔들림과 갈리지 않는다. HTTP 서버가 흐름을 쥔 소켓을 직접 멈추면 Node 안쪽과 얽힌다. 둘 다 새 상한 안이다. G8 단계 1.5에서 (5)가 새 상한을 넘으면 그때 다시 본다.
- 테스트 상한은 `PAUSE_SLACK`이라는 테스트 파일 안의 상수로 둔다(`config.js`가 아님 — 서버 설정이 아니라 측정 여유다). 주석: `// 읽기를 멈추기 전 받아 둘 수 있는 덩어리 4개(64KiB씩) — 원본 CAREER-31 plan 'A5 답 · 안 A 넣어 본 결과'`.
- 실패 시나리오 27: (새로) **Node 판·OS가 바뀌어 여분이 `PAUSE_SLACK`을 넘음**(이 저장소는 Node 판을 고정하지 않음) → CI(Linux)에서 (5)가 빨강이 되어 드러난다(조용히 넘어가지 않음). 그때 값을 바꾸지 말고 멈춰서 실측값을 들고 묻는다.

**안 C를 고를 때의 spec AC-8 글 (제안 — spec은 사용자 승인 몫)**
> - AC-8 `Content-Length` 없이 큰 사진을 올려도 돈과 서버가 버틴다 (CAREER-25 리뷰 ① — 받아들인 위험)
>   - 주어진: `api/` 테스트, `Content-Length` 없이(chunked) 보내는 클라이언트
>   - 할 때: `REJECT_DRAIN_BYTES`(2,000,000)를 넘는 본문을 끝까지 보내기를 30번 차례로 한다
>   - 그러면: 회차마다 클라이언트가 받는 것은 HTTP 400과 `{"code":"invalid_input"}`, 또는 연결 끊김 가운데 하나다(다른 상태·본문은 0번). Bedrock 호출은 0번이다. 서버가 읽은 바이트는 회차마다 `REJECT_DRAIN_BYTES` + 100,000 아래다. 이어서 보낸 정상 요청은 200이다. 끊김은 받아들인 위험으로 appraise-http.md §2에 적는다(브라우저 앱은 늘 `Content-Length`를 보낸다)
- C일 때 바뀌는 곳: spec AC-8 · G7의 AC-8 테스트(테스트 커밋을 새로 한다) · contracts §2 한 줄('chunked로 한도를 넘으면 보내는 쪽은 응답 대신 끊김을 볼 수 있다') · G8 단계 1은 '코드 고치지 않음'. 새 값은 없다.

### AC-9 — `MaxListenersExceededWarning`
- **가설(후보)**: 경고는 한 이벤트 대상(EventEmitter/AbortSignal/소켓)에 같은 이름의 리스너가 11개 넘게 붙을 때 난다. 코드에서 리스너를 붙이는 곳은 `bedrock.js`의 `signal.addEventListener('abort')`(시도마다가 아니라 요청마다 1개, `finally`에서 뗌) · `server.js`의 `res.on('close')`(요청마다) · `writeJson`의 `req.on/once`뿐이다 — 읽기로는 쌓이는 곳이 보이지 않는다. 그래서 (a) 동시 10건 테스트의 `fetch`(undici)가 한 연결·한 신호에 붙이는 것 (b) 재시도 대기 중 `deadline`/`sleep` 경주 (c) 테스트 헬퍼 중 하나일 수 있다.
- **찾는 법**(G7 첫 단계): `NODE_OPTIONS=--trace-warnings npm --prefix api test -- daily-limit 2>&1 | grep -A15 MaxListenersExceededWarning` — 경고 줄 아래 스택이 **어느 대상에 어느 이름으로** 붙였는지 보여 준다. 그 스택과 대상 이름(`[AbortSignal]`·`[Socket]` 등)을 G7 커밋 메시지 본문과 PR '결정' 칸에 적는다.
- **고침 규칙**: 리스너를 **붙인 곳에서 뗀다**(수명 맞추기) 또는 붙는 대상을 요청마다 따로 둔다. 원인이 테스트 코드(헬퍼·`fetch` 쓰는 법)면 테스트를 고친다 — 이때도 테스트의 기대값은 고치지 않는다. `setMaxListeners`·`events.defaultMaxListeners`·`--no-warnings`·`NODE_NO_WARNINGS`·`process.removeAllListeners('warning')`는 쓰지 않는다(G8 검사 명령이 `grep`으로 본다).
- **확인법(둘)**: ① `daily-limit.test.js` 맨 위에서 `process.on('warning', (w) => warnings.push(w.name))`, `afterAll`에서 `await new Promise((r) => setImmediate(r))` 뒤 `expect(warnings.filter((n) => n === 'MaxListenersExceededWarning')).toEqual([])` — 같은 파일 안에서 결정적으로 빨강/초록(vitest 기본 `forks` 풀이라 그 파일의 프로세스 경고를 잡는다). ② 전체 `checks.app.api`의 표준 오류를 파일로 받아 `grep -c MaxListenersExceededWarning` = 0(AC-9 글자 그대로).

### AC-10 — 로그 실패
- 지금 `try { log(…) } catch {}`가 **조용히 삼킨다**. 고침: `catch (err)`에서 `process.stderr.write(JSON.stringify({ evt: 'log_failed', error: err?.name ?? 'Unknown' }) + '\n')`, 그 줄도 `try`로 감싼다(표준 오류마저 못 쓰면 남길 곳이 없다 — 받아들임). 응답은 그대로 보낸다.
- 확인법: `log`가 `new TypeError('HOWMUCH-LOG-SECRET')`를 던지게 한 서버 → 같은 사진을 정상 로그 서버와 실패 로그 서버에 보내 상태·본문이 같은지 · `vi.spyOn(process.stderr, 'write')`로 모은 글 중 `log_failed` 줄이 정확히 1개이고 `{"evt":"log_failed","error":"TypeError"}`인지 · 모은 글 전체에 `HOWMUCH-LOG-SECRET`·`PHOTO_MARK`(글자·base64·hex)·가짜 비밀값이 0번인지.

## 화면 (AC-5) — `person_limit` → 오류 문구
| 무엇 | 정한 것 |
|---|---|
| 상태 | 새 아저씨 상태를 만들지 않는다(11/8 범위 밖 '상태 추가'). 지금 오류 길(CAREER-26) 그대로 — 아저씨 `대기`, `role="alert"` `data-testid="appraise-error"`에 D2 문구 |
| 바꿀 곳 | `appraise.js` `CODES`에 `'person_limit'` 하나(지금은 모르는 코드라 `unavailable`이 된다 — 이게 AC-5 빨강의 이유) · `options.js` `ERROR_TEXT.person_limit` 한 줄. `App.jsx`는 `e.code in ERROR_TEXT`로 이미 새 코드를 받는다 — 고치지 않는다 |
| 다시 누르기 | 그대로 — 사진·선택이 남고 '감정 받기'가 켜져 있다(결정 J). 브라우저는 횟수를 세거나 막지 않는다(CLAUDE.md §9) |
| 다른 코드 | `daily_limit`(퇴근) · `invalid_input` · `unavailable` · `refused`: 이미 있는 테스트가 그대로 본다 |
| e2e | 새로 만들지 않는다 — spec AC-5가 화면 단위 테스트이고, 응답 모양(429 + 본문 `code`)은 `daily_limit` e2e가 이미 같은 길을 본다. 이미 있는 e2e는 AC-12에서 그대로 돈다 |

## 신뢰 경계 (`strict_review_areas: guard`)
`들어온 곳 → 해석 → 검증 → 실제 동작` — CAREER-25 plan '신뢰 경계' 1~6, CAREER-27 7은 그대로이고 둘을 더한다.
8. (새로) `CloudFront-Viewer-Address` 헤더 → 마지막 `:`에서 포트 떼기 → `net.isIP` 4·6, IPv6는 /64·IPv4 담은 IPv6는 IPv4로, 아니면 `-` → **사람별 셈에서 통과를 허락할지 결정**(Bedrock은 그 뒤 경계 1·2·6·7을 다 지나야 함). 배포에서 이 헤더는 CloudFront가 넣는 값으로 믿는다 — 브라우저가 원본에 바로 와서 꾸미는 길을 막는 일은 CAREER-30(spec 남는 위험 (d)). 이 스토리는 서버가 **그 값 하나만** 읽는 것까지(AC-3).
9. (새로) 서버를 돌리는 사용자의 홈(`HOME`) → `os.homedir()` → (검증 없음 — OS가 넣는 값) → 셈 파일 자리. 홈이 없거나 못 쓰면 경계 7의 `usage_store_*`로 막힌다.

**실제 동작: Bedrock 호출 (유일한 과금 동작) — CAREER-27 표에서 바뀐 줄**
| 항목 | 값 |
|---|---|
| 누가 허락하나 | 여전히 인증 없음. **더해서 사람별 문이 요청마다 허락한다**(그 사람의 최근 1분 < 5 · 그날 < 50) → 그 뒤 하루 셈 문이 시도마다(CAREER-27) |
| 바로 앞의 검증 | 경계 8 · 1 · 2 · 6 · 7 |
| 호출 수 최대 | 요청 1건에 3 · 하루 `DAILY_CALL_LIMIT`(300) · **한 사람이 하루 요청 50건**(기억 hit 포함 — Bedrock 시도로는 최대 150) |
| 남는 증거 | 로그 1줄에 `who` · `personMinute` · `personDay` 더함. 주소는 남기지 않음 |
| 중간에 끊기면 | 사람별 셈은 메모리 — 다시 켜면 비워진다(D1). `take`는 동기라 반쯤 쓴 셈이 없다. 셈 파일은 CAREER-27 그대로 |
| 되돌리는 길 | 사람별 제한이 정상 사용자를 막으면: 서버를 다시 켜면 모두 비워진다(메모리일 때). 값을 바꾸려면 `config.js` 한 곳 + contracts §8 |

**시작할 때(새로)**: 진짜 Bedrock 클라이언트를 만드는 서버는 자격 증명 사슬을 풀지 못하면 포트를 열지 않는다(AC-7). 로그에는 오류 이름만.

## 실패 시나리오 (premortem) — 각각 막는 곳
1. **포트까지 열쇠에 넣음 → 요청마다 새 사람, 제한이 안 걸림** → `personOf`가 마지막 `:` 뒤를 버림. G1 AC-3 테스트가 같은 IP·다른 포트 4번 → 4번째 거절을 본다
2. **브라우저가 `X-Forwarded-For` 등으로 사람을 바꿈** → 그 헤더들을 읽지 않음. AC-3 (a)
3. **원본에 바로 와서 `CloudFront-Viewer-Address`를 꾸밈** → 이 스토리 밖(CAREER-30: 원본은 CloudFront에서만 닿게 · CloudFront가 브라우저가 보낸 같은 이름 헤더를 덮어쓰는지 확인). 그래도 돈은 하루 상한이 막는다
4. **IPv6 한 사람이 주소를 돌림** → /64(D5). IPv4 담은 IPv6를 /64로 묶으면 IPv4 사용자 전체가 한 사람이 된다 → IPv4로 바꿔 셈(G1 단위 테스트)
5. **사람별 셈이 끝없이 커짐**(주소를 돌리는 사람) → `PERSON_MAX_ENTRIES` + LRU(D4). G1 단위 테스트가 상한 2에서 셋째 사람이 들어오면 첫째가 버려지는지 본다
6. **사람별 문이 기억 뒤에 있어 기억 hit을 안 셈**(U3 어김) → 문은 본문 읽기 전. AC-1 (b) 테스트(같은 사진 4번 → 4번째 거절, `send` 1)
7. **막힌 요청이 하루 셈을 씀** → 문이 `send` 훨씬 앞이라 하루 셈 문까지 못 감. AC-4(셈 파일 `used` 3)
8. **이미 있는 테스트·시험 실행이 6번째 요청부터 429**(모두 '주소 없음' 한 사람) → `personLimit` 필수 + `testPersonLimit()`(D6) · 시험 실행 넉넉히(D7)
9. **헤더가 빠진 배포에서 모두가 한 사람** → 1분 5번에 바로 걸려 드러남 + 로그 `who:"none"`. 받아들임(막는 쪽). CAREER-30 확인 항목
10. **통신사 주소를 나눠 쓰는 사람끼리 함께 걸림** → 받아들임(U2)
11. **다시 켜면 사람별 셈이 비워짐** → D1에서 받아들임(10/24). 하루 상한은 이어짐
12. **사람별 거절이 본문을 읽기 전 응답 → 큰 chunked 업로드에서 클라이언트가 응답을 못 받음** → AC-8 고침이 같은 `writeJson` 길을 고친다
13. **홈이 없거나 못 씀(EC2 서비스 사용자 설정)** → `usage_store_*` → 모든 감정 `unavailable`(막는 쪽, 크게 드러남). CAREER-30에 '쓸 수 있는 홈' 확인을 넘김
14. **로컬 worktree 여럿이 셈 하나를 나눠 씀** → D3 약점으로 적음. 테스트는 `tempDailyLimit()`만 쓰고 진짜 자리를 건드리지 않는다 — G4 검사 명령이 테스트 앞뒤로 `~/.local/state/how-much/usage.json`의 수정 시각이 같은지 본다
15. **AC-6 테스트가 `HOME`을 바꾼 채 다른 테스트에 새어 진짜 셈 자리가 바뀜** → 그 파일 안에서만 바꾸고 `afterAll`에서 되돌린다. vitest `forks`라 파일마다 프로세스가 따로다
16. **자격 증명 점검이 로컬에서 IMDS를 기다리며 몇 초 멈춤** → 진짜 실행에서는 받아들임(자격 증명이 없을 때만). 테스트는 `AWS_EC2_METADATA_DISABLED=true`
17. **점검 실패 로그에 프로필 이름·경로·키가 샘** → 오류 **이름**만. AC-7 테스트가 가짜 키·임시 경로 글자 0번을 본다
18. **`process.exit(1)`로 실패 줄이 잘림** → `process.exitCode = 1`. 남은 핸들이 있어 안 끝나면 테스트가 시간 제한(15초)으로 빨강
19. **AC-9를 경고 끄기로 맞춤** → G8 검사의 `grep`(`setMaxListeners` · `defaultMaxListeners` · `no-warnings` · `NODE_NO_WARNINGS` · `removeAllListeners('warning')`)이 `api/`에서 0줄
20. **로그 실패를 알리는 줄에 오류 메시지(사진·값이 들었을 수 있음)가 샘** → 이름만. AC-10 테스트가 메시지 글자 0번을 본다
21. **AC-8 고침이 `REJECT_DRAIN_BYTES` 상한을 깸**(끊기를 미루다 더 읽음) → 한도를 넘는 순간 `req.pause()`와 리스너 떼기를 먼저. 이미 있는 '(2)·(3)' 테스트(`bytesRead < REJECT_DRAIN_BYTES + 100_000`)가 그대로 본다. (10/26 실측) 붙잡는 갈래는 멈추기 전 덩어리 몇 개가 더 들어온다 → (5)가 `+ PAUSE_SLACK` 상한과 업로드 6,000,000 회차로 '묶여 있음'을 본다(D13 '가' — 10/26 승인)
27. (10/26) **Node 판·OS가 바뀌어 멈추기 전 여분이 `PAUSE_SLACK`을 넘음** → CI에서 (5)가 빨강. 값을 바꾸지 않고 멈춘다('안 A 넣어 본 결과')
22. **CloudFront가 429·503을 자기 오류 페이지로 바꿔 화면이 `unavailable`만 봄** → CAREER-30 확인 항목(오류 응답 사용자 지정 안 함)
23. (10/26) **붙잡기 타이머가 안 걸리거나 안 풀려 연결이 Node 기본 300초까지 남음**(조용한 고장) → 지키는 테스트 'AC-2(f) (5)'가 `REJECT_LINGER_MS + 3초` 안에 끊기는지 본다
24. (10/26) **`res.end()`를 불러 Node가 스스로 닫아 RST 경주가 되살아남**(시도 ②) → 한도를 넘은 갈래에서 `res.end()`를 부르지 않는다. 이유를 주석으로 남긴다. AC-8이 본다
25. (10/26) **`Content-Length`를 보낸 업로드에도 길이 붙은 응답을 줘서 업로드가 중간에 끊김**(시도 ①) → chunked 갈래에만 붙인다. CAREER-25 (1)이 본다
26. (10/26) **chunked로 큰 업로드를 여럿 동시에 보내 연결을 잡아 둠** → 하나에 `REJECT_LINGER_MS`까지, 그동안 읽지 않는다. 같은 사람의 6번째 연결은 사람별 429다(그 응답도 같은 길). 천천히 보내는 상대는 지금도 더 오래 잡을 수 있으므로 받아들인다
- (10/26) 실패 시나리오 12는 'A5 답 — AC-8' 안 A가 맡는다(사람별 거절도 같은 `writeJson` 길)
- 건너뛴 것(일부러): 사람별 셈의 주기 비우기(LRU로 충분) · 자격 증명 주기 점검 · 여러 서버가 사람별 셈 나누기(가정 2) · 사람별 셈 파일 저장(D1 메모리).

## 고른 이유와 버린 대안 (나머지 — 셈 파일 자리는 ADR-0005, 사람별 제한은 ADR-0006)
| 결정 | 고른 것 | 버린 것 · 왜 아님 |
|---|---|---|
| 사람별 문 자리 | 경로·메서드 뒤, 쿼리·본문 앞 | 기억 뒤: hit을 못 셈(U3) / `send` 앞(하루 셈 문 옆): 기억 hit·`invalid_input`을 못 세고, 본문(≤1MB)을 다 읽은 뒤라 홍수를 못 줄임 / 경로 앞: 404·405까지 셈 — 우리 입구가 아님 |
| 새 모듈 | `person-limit.js` 하나(사람 열쇠 + 셈) | `daily-limit.js`에 더하기: 하나는 파일·하루 상한, 하나는 메모리·사람 — 바뀌는 이유가 다르다 / 열쇠 만들기를 따로 파일로: 30줄 남짓이라 나누는 이득이 없다 |
| `dayOf` | `daily-limit.js`에서 import | 복사: '서울 00:00' 정의가 둘이 된다 |
| AC-7 테스트 | 자식 프로세스 | `startServer`에 `checkCredentials` 주입만: 종료 코드·포트를 못 본다. 주입 손잡이는 만들지 않는다(테스트만 쓰는 손잡이) |
| AC-6 테스트 | `api/src`를 임시 폴더 둘에 복사 → 각 `config.js`·`daily-limit.js`를 import(의존성 없는 두 파일) → 원래 `server.js`의 `createServer`에 넣음 | 복사본 `server.js`까지 import: 임시 폴더에 `node_modules`가 없어 AWS SDK를 못 찾는다(링크를 걸면 되지만 테스트가 커짐) |
| 화면 문구 자리 | 이미 있는 오류 길 | 퇴근처럼 아저씨 칸 안: 새 상태가 아니면 아저씨 칸에 넣을 까닭이 없고 '상태 추가'에 가까워진다 |

## 범위 밖 · CAREER-30에 넘길 것 (PR '범위 변경' 칸에 제안으로)
- CloudFront 원본 요청 정책에 `CloudFront-Viewer-Address` 넣기 · 브라우저가 보낸 같은 이름 헤더를 CloudFront가 덮어쓰는지 확인 · 원본(EC2)은 CloudFront에서만 닿게 · 429·503을 오류 페이지로 바꾸지 않기(contracts §10에 적음)
- EC2 서비스 사용자에게 다시 배포해도 남는 쓸 수 있는 홈(`DynamicUser`·`ProtectHome` 안 씀) · 인스턴스 역할로 자격 증명 사슬이 풀리는지(시작 로그에 `startup_failed`가 없는지)
- 엔드포인트 PR(`aws-infra-portfolio` #2, 10/24 아직 안 머지) 머지 — CAREER-30에서 배포 직전에(D8)
- spec '안 할 것' 그대로: 배포 · 인프라 · WAF · DB · 로그인 · 브라우저 셈 · 값(300·재시도·사진) 바꾸기

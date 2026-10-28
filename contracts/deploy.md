# 배포 약속 — `api/` 서버 · 화면 ↔ v1 인프라(`aws-infra-portfolio`)

- Refs: CAREER-30 · 상태: **승인됨 (2026-10-28 — 사용자 승인 D1~D12, 14:10 D1을 나로 바꿈)** (초안 2판 — 2026-10-28 architect, I0 사실 반영). 인프라 사실의 근거는 [specs/CAREER-30-deploy/i0-facts.md](../specs/CAREER-30-deploy/i0-facts.md)다(`aws-infra-portfolio` main `1ea4bf2` · PR #2 `bf5d8cf`). `<…>`는 그 저장소 리소스가 생긴 뒤 id로 채운다. D1은 '나'만 남겼다(14:10 사용자 결정 — 있는 nginx가 `/api/`를 넘김). '가'(두 번째 VPC origin · `HOST`)는 쓰지 않는다
- **정한 것**: §4 80 규칙 출처는 그대로(plan D13 '가' — 2026-10-28 14:35 사용자). **아직 사용자 몫 하나**: §6 `client_max_body_size` 값(상한 값 — CLAUDE.md §4). 정해지기 전에는 그 줄을 '추천'으로 읽는다
- 근거: [specs/CAREER-30-deploy/plan.md](../specs/CAREER-30-deploy/plan.md) D1~D12 · [ADR-0007](../docs/adr/0007-api-deploy-cloudfront-vpc-origin-systemd.md)(확정 2026-10-28) · [appraise-http.md](appraise-http.md) §8·§10
- 이 문서는 **how-much 코드(`api/`·`app/`)와 배포 스크립트(`infra/deploy/`) ↔ `aws-infra-portfolio`의 리소스** 사이 약속이다. 한쪽 이름을 바꾸면 다른 쪽을 같은 날 맞춘다(ADR-0002)
- 값(상한·요금·IAM 범위)은 여기서 새로 정하지 않는다. plan D 표에서 사용자가 고른 것을 옮긴다

## 1. 서버 컴퓨터 안 (`infra/deploy/`가 맞춤)
v1 EC2: AL2023 · **arm64** · `t4g.small` · IMDSv2만 · 공인 IP 없음 · 나가는 길 없음(S3 게이트웨이 엔드포인트로 AL2023 꾸러미 저장소만) — I-3·I-4

| 무엇 | 값 | 누가 쓰나 |
|---|---|---|
| 서비스 이름 | `how-much-api` (systemd 단위 `how-much-api.service`) | 스크립트 · 런북 |
| 서비스 사용자 | `howmuch` (시스템 사용자, 셸 없음) | 단위 `User=` |
| 홈 | `/home/howmuch` — **배포가 지우거나 바꾸지 않는다** | `os.homedir()` → `USAGE_FILE` |
| 셈 파일 | `/home/howmuch/.local/state/how-much/usage.json` (appraise-http.md §8 `USAGE_FILE` 그대로 · 폴더 `0700` · 파일 `0600` · 서버가 처음 셀 때 만든다) | `api/` |
| `api/` 코드 | `/opt/how-much/api/releases/<sha>/` (주인 `root`, 읽기만) · `/opt/how-much/api/current` → 지금 판 · 최근 3판 | 단위 `WorkingDirectory=` |
| 화면 | `/opt/how-much/app/releases/<sha>/` (`app/dist` 내용) · `/opt/how-much/app/current` · 최근 3판 · `api/`와 **같은 sha** | nginx `root` |
| 실행 | `<node 경로> src/server.js` — Node 22. 경로는 I-4 확인 뒤(`dnf` `nodejs22` 꾸러미 또는 nodejs.org `linux-arm64` tar) | 단위 `ExecStart=` |
| 환경변수 | **주지 않는다** — `Environment=` 줄 없음. 서버는 `127.0.0.1:8787` 고정(D1 '나' — `HOST` 없음 · `PORT` 안 줌, 기본 8787). **`AWS_*`도 주지 않는다** — 자격 증명은 인스턴스 역할 `portfolio-web`(PR #2) | 단위 파일 |
| 쓰지 않는 설정 | `DynamicUser=` · `ProtectHome=` · `ProtectSystem=strict` (CAREER-31 넘겨받은 것) | — |
| 다시 켜기 | `Restart=on-failure` · `RestartSec=2` · `WantedBy=multi-user.target` | — |
| 로그 | 표준 출력 1줄씩 → journald(`Storage=persistent` · `SystemMaxUse=200M`). `journalctl -u how-much-api -o cat` | 런북 |
| nginx | v1 `user_data`가 깐 nginx(이미 있음 — I-1). how-much 설정은 `/etc/nginx/conf.d/how-much.conf` 하나: 80에서 화면 `root /opt/how-much/app/current` + `location /api/` → `http://127.0.0.1:8787` (넘김 약속은 §6). 꾸러미 폴더 `/usr/share/nginx/html`은 쓰지 않는다 | `setup-host.sh` |
| `user_data` | **건드리지 않는다** — `user_data_replace_on_change = true`(I-5)라 바꾸면 서버가 교체된다 | — |

## 2. 묶음과 올리는 길 (plan D3·D4)
| 무엇 | 값 |
|---|---|
| 묶음 | `api-<sha>.tar.gz`(`src/` · `package.json` · `package-lock.json` · `node_modules/` — `npm ci --omit=dev`) · `app-<sha>.tar.gz`(`app/dist/` 내용) · `SHA256SUMS` |
| 올리는 것 | 늘 main의 커밋 하나(sha). 화면과 `api/`가 같은 sha |
| 운영 길 | **EC2 Instance Connect Endpoint** `<EIC 엔드포인트 id>` → 인스턴스 `<instance id>` tcp 22 · OS 사용자 `ec2-user` · 키는 `SendSSHPublicKey`로 잠깐 |
| 보내는 자리 | 서버 `/var/tmp/how-much-deploy/<sha>/` (EIC 터널 `scp`) — 풀고 나면 지운다 |
| 서버에서 도는 것 | `sudo /opt/how-much/bin/install-release.sh <sha>` — `sha256sum -c` · 풀기 · `current` 둘 바꾸기 · 재시작 · 확인(§4). 실패하면 앞 판으로 |
| 그 뒤 | CloudFront 무효화 `/*` (배포 `<distribution id>`) |
| GitHub 저장소 변수 (how-much) | `AWS_DEPLOY_ROLE_ARN` · `DEPLOY_INSTANCE_ID` · `EIC_ENDPOINT_ID` · `CF_DISTRIBUTION_ID` — 비밀값이 아니라 변수다(ARN·id는 비밀이 아님). **비밀값은 0개** |
| 배포 역할 (D5) | `aws-infra-portfolio` `bootstrap/how-much.tf` · 신뢰 = how-much `environment:production` · 권한 = `OpenTunnel`(그 EIC) · `SendSSHPublicKey`(그 인스턴스, `ec2-user`) · `CreateInvalidation`(그 배포). S3 권한 없음 |
| S3 | 쓰지 않는다. S3 게이트웨이 엔드포인트 정책(AL2023 저장소만)은 그대로 둔다 |

## 3. CloudFront (`aws-infra-portfolio` `infra/cdn.tf` — appraise-http.md §10을 맞춤)
| 무엇 | 값 |
|---|---|
| 배포 | v1 배포 `<distribution id>` 그대로(spec U9) |
| 기본 동작 `/*` | **바꾸지 않는다** — VPC origin `portfolio-web` → EC2 80(nginx → 화면) · GET·HEAD · `Managed-CachingOptimized` · `default_root_object = index.html` (I-1) |
| `/api/*` 동작 → 원본 | 있는 VPC origin `portfolio-web` → EC2 80 → nginx `location /api/` → `127.0.0.1:8787` (§6). **새 VPC origin 없음 · 원본 설정 바꾸지 않음** (D1 '나') |
| 허용 메서드 | `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE` (POST가 들어가는 묶음) |
| 캐시 | 관리형 `CachingDisabled` |
| 원본 요청 정책 | 사용자 지정 — 쿼리 문자열 **전부** · 헤더 **`Content-Type` · `CloudFront-Viewer-Address`** 둘 · 쿠키 없음 |
| 원본 응답 시간 제한 | 30초 (≥ `TIMEOUT_MS` 20초 + 5초). `/api/*`가 v1 원본 `portfolio-web`을 같이 쓰므로 **그 원본의 값에 기댄다** — 지금 `cdn.tf`에 적힌 값이 없어 기본 30초다(i0-facts I0′ I-13). PR-C에서 바꾸지 않는다. 누가 그 원본 값을 25초 아래로 줄이면 이 약속이 깨진다(plan 실패 시나리오 25). nginx 쪽 25초(§6)가 이보다 짧아야 한다 |
| 오류 응답 사용자 지정 | 0개 — 지금도 없다(I-1). 더하지 않는다 |

## 4. 들어오는 길 (AC-3) — EC2 보안 그룹 `portfolio-web` `<sg id>`
| 무엇 | 값 |
|---|---|
| tcp 80 (있음) | 출처 = CloudFront 관리형 접두사 목록 `com.amazonaws.global.cloudfront.origin-facing` 하나 (I-2). **`/api/*`도 이 규칙 하나로 들어온다** — 서버로 들어오는 길은 이것뿐이다. 출처를 `CloudFront-VPCOrigins-Service-SG`로 좁힐지는 plan D13(사용자 몫, 추천 '그대로')이다. 정해지기 전에는 바꾸지 않는다 |
| tcp 8787 | **규칙 없음** (D1 '나'). 서버는 `127.0.0.1`에만 묶이고, 같은 컴퓨터의 nginx만 이 포트에 닿는다 |
| tcp 22 | 출처 = EIC 엔드포인트 보안 그룹 하나 |
| 새 보안 그룹을 인스턴스에 붙이기 | 하지 않는다 — 있는 그룹에 규칙만 더한다(교체 위험 — plan 실패 시나리오 2) |
| 공인 IP · 밖으로 가는 경로 | 없음 (I-3) |
| 배포 확인 (서버 안) | `curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: image/jpeg' --data-binary x http://127.0.0.1:8787/api/appraise` → `400` · 로그 `reason` `bad_my_price` · Bedrock 0 · `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/` → `200` · `listening` 줄 `address` `127.0.0.1`. nginx를 거친 길은 첫 배포 뒤 한 번 §6 확인(tasks D1 단계 5) |

## 5. 운영 명령 (런북의 원본은 `docs/runbook/배포.md` — 여기는 이름만 약속)
- 들어가기: EIC로 `ec2-user` (명령째는 런북)
- 로그: `sudo journalctl -u how-much-api -o cat --since '<시각>'`
- 급히 막기: `sudo systemctl stop how-much-api` / `DAILY_CALL_LIMIT = 0` 커밋 → 배포
- 되돌리기: `sudo /opt/how-much/bin/install-release.sh --rollback` (링크 둘을 앞 판으로 + 재시작)
- AC-7 (a): `sudo -u howmuch`로 셈 파일의 `used`를 임시 파일 + `mv`로 바꾼다(서버와 같은 법 — ADR-0004). 바꾸기 전 값을 먼저 적어 둔다

## 6. nginx `/api/` 넘김 (D1 '나' — appraise-http.md를 지키는 약속)
`/etc/nginx/conf.d/how-much.conf`의 80 server 블록 안 `location /api/` 하나다. nginx는 **통로**로만 쓴다. 계약(appraise-http.md §2 거절 뒤 남은 업로드 · §5 본문 JSON · §5 사람별 제한)은 서버(`api/`)가 지키고, nginx는 그것을 바꾸지 않아야 한다. 아래 '기대 동작'이 nginx 위에서 실제로 맞는지는 **확인 못 함**이다. 로컬·CI에서 시험할 길이 없어 tasks D1 단계 5에서 처음 본다(Bedrock 0). 줄 이름은 nginx 지시어고, 값의 원본은 오른쪽 칸이다.

| 무엇 | 약속 | 왜 · 원본 | 확인 (tasks D1 단계 5) |
|---|---|---|---|
| 넘기는 곳 | `proxy_pass http://127.0.0.1:8787;` — **뒤에 경로를 붙이지 않는다** | 요청 경로·쿼리를 바꾸지 않고 넘긴다. 서버는 경로 `/api/appraise` 하나와 쿼리를 그대로 본다(appraise-http §1·§2) | (a) |
| 넘김 HTTP 판 | `proxy_http_version 1.1` | 요청 본문 버퍼링을 끈 채 chunked 본문을 흘려 넘기려면 1.1이 필요하다(nginx 문서 `proxy_request_buffering` — 1.0이면 버퍼링을 끄지 못함) | (c) |
| 요청 본문 버퍼링 | `proxy_request_buffering off` | 본문을 다 받기 전에 서버로 흘려 넘긴다. 그래야 서버가 본문 전에 거절하고(쿼리·`Content-Type`·크기·사람별 제한), 남은 본문을 §2대로 버리거나 끊는다 — CAREER-25·31 동작을 서버 코드가 그대로 맡는다. **확인 못 함**: 서버가 본문을 다 받기 전에 낸 응답을 nginx가 그때 클라이언트에 넘기는지 · 서버가 끊었을 때(한도 넘음) nginx가 클라이언트에 무엇을 내는지 | (b)(c) |
| 응답 버퍼링 | `proxy_buffering off` | 서버 응답을 받는 대로 넘긴다. 거절 응답은 '헤더·본문을 먼저 쓰고 남은 본문을 버린 뒤 끝냄'이라, nginx가 응답 끝을 기다리지 않게 한다. **확인 못 함**: 이 줄이 없을 때와 무엇이 다른지 | (b)(c) |
| 본문 상한 | `client_max_body_size` — **값은 사용자 확인 전**(상한 값 — CLAUDE.md §4). **추천 `3m`**(= 3,145,728바이트). 하한: 서버가 한 연결에서 받는 최대보다 커야 한다 — `REJECT_DRAIN_BYTES` 2,000,000 + 256KiB = 2,262,144(appraise-http §2). 그래야 nginx가 서버보다 먼저 거절하지 않는다. 다른 후보: `0`(nginx는 세지 않고 서버만 센다 — 대신 서버가 끊기 전까지 nginx는 얼마든 받는다). `MAX_PHOTO_BYTES`(1,000,000) 아래는 안 됨(받을 사진을 nginx가 거절) | 이 값을 넘으면 nginx가 직접 413을 낸다 → 아래 오류 바꾸기로 400 `invalid_input`. 서버 기준으로도 '처음부터 `REJECT_DRAIN_BYTES`보다 큼'이라 거절될 요청이다 | (d) |
| 서버 응답 가로채기 | `proxy_intercept_errors off` (nginx 기본값이지만 적어 둔다) | 서버가 낸 400·404·405·422·429·503·500 JSON을 그대로 넘긴다 — appraise-http §10 '429·503을 바꾸지 않는다' · §5 어댑터 규칙 | (a)(b)(f) |
| nginx가 직접 내는 오류 | `error_page`로 바꾼다. **413 → 400** 본문 `{"code":"invalid_input"}` · **500 502 503 504 → 503** 본문 `{"code":"unavailable"}`. 두 경우 모두 헤더 `Content-Type: application/json; charset=utf-8` · `Cache-Control: no-store` | appraise-http §5 '본문은 언제나 `{"code":…}`' · 공통 헤더. 502 = 서버 꺼짐·재시작 중(ADR-0007 '재시작 몇 초', 급히 막기 `systemctl stop`) · 504 = 아래 시간 제한. **확인 못 함**: 바꾼 응답에 붙는 헤더의 실제 모양 | (d)(e) — `-i`로 헤더까지 |
| 넘길 헤더 | 요청 헤더를 **지우거나 바꾸지 않는다** — 특히 `CloudFront-Viewer-Address`(ADR-0006 사람 구분)와 `Content-Type`(§2). `proxy_set_header`로 이 둘을 건드리지 않는다. `X-Forwarded-For`·`X-Real-IP`를 더하지 않는다(서버는 읽지 않음 — appraise-http §5) | 지우면 모두 `-` 한 사람이 된다(plan 실패 시나리오 3) | (f) |
| 시간 제한 | `proxy_read_timeout 25s` | 서버의 요청 1건 전체 `TIMEOUT_MS` 20초 + 5초(appraise-http §10 '≥ `TIMEOUT_MS` + 5초'). CloudFront 원본 응답 시간 제한 30초(§3)보다 짧아야 한다 — 서버가 멈추면 CloudFront HTML 504보다 nginx JSON 503이 먼저 나간다. 다른 시간 줄(`client_body_timeout` 등)은 nginx 기본값 그대로다 — 그 값이 이 길에 맞는지는 확인 못 함 | (e)는 꺼짐만 봄 — 25초 넘김은 시험하지 않음(받아들임) |
| 로그 | 이 location에서 `access_log off` | appraise-http §5 '접속 주소는 로그 어디에도 남기지 않는다'. CloudFront가 원본에 붙이는 헤더나 v1 기본 로그 형식이 보는 사람 주소를 적는지는 확인 못 함 → 아예 끈다. 요청 기록의 원본은 서버 로그 1줄(journald, §1)이다. `error_log`에 무엇이 남는지는 확인 못 함 | (g) |

- **남는 것 (받아들임)**: nginx가 location을 고르기 전에 거절하는 요청이 있다(머리말이 너무 큼 · 깨진 요청 등). 이런 요청은 위 `error_page`를 거치지 않고 nginx 기본 HTML로 나갈 수 있다. 서버에 닿지 않으므로 돈은 0이고, 어댑터는 JSON이 아니면 `unavailable`로 본다(appraise-http §5 어댑터 규칙). 앱이 보내는 요청이 여기 걸리는지는 확인 못 함.
- **대비**: D1 단계 5에서 하나라도 기대와 다르면 I3(공개)으로 가지 않는다. 먼저 이 표 안에서 nginx 줄을 고쳐 다시 본다. 이 표로 맞출 수 없어 계약 글(appraise-http §2·§5)을 바꿔야 하면 architect가 고칠 글을 내고 사용자가 승인한다. 예: `proxy_request_buffering on`으로 nginx가 본문을 다 받은 뒤 넘기면, §2의 '서버가 받는 바이트' 약속이 'nginx가 받는 바이트 ≤ `client_max_body_size`'로 바뀐다.

## 7. 바꾸는 법
- 이 문서를 바꾸면 `infra/deploy/` · `.github/workflows/deploy.yml` · `aws-infra-portfolio`의 해당 리소스를 같은 날 맞춘다. 확정 뒤 바꾸려면 architect가 고치고 사용자가 승인한다

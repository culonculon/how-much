# 배포 약속 — `api/` 서버 · 화면 ↔ v1 인프라(`aws-infra-portfolio`)

- Refs: CAREER-30 · 상태: **승인됨 (2026-10-28 — 사용자 승인 D1~D12, D1은 I-12 조건부)** (초안 2판 — 2026-10-28 architect, I0 사실 반영). 인프라 사실의 근거는 [specs/CAREER-30-deploy/i0-facts.md](../specs/CAREER-30-deploy/i0-facts.md)다(`aws-infra-portfolio` main `1ea4bf2` · PR #2 `bf5d8cf`). `<…>`는 그 저장소 리소스가 생긴 뒤 id로 채운다. D1은 '가'만 남겼고, '나'는 "I-12가 안 되면" 주석으로 둔다
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
| 환경변수 | `HOST=0.0.0.0` (I-12가 안 되면 — D1 '나': 주지 않음, 127.0.0.1) · `PORT` 안 줌(기본 8787). **`AWS_*`를 주지 않는다** — 자격 증명은 인스턴스 역할 `portfolio-web`(PR #2) | 단위 `Environment=` |
| 쓰지 않는 설정 | `DynamicUser=` · `ProtectHome=` · `ProtectSystem=strict` (CAREER-31 넘겨받은 것) | — |
| 다시 켜기 | `Restart=on-failure` · `RestartSec=2` · `WantedBy=multi-user.target` | — |
| 로그 | 표준 출력 1줄씩 → journald(`Storage=persistent` · `SystemMaxUse=200M`). `journalctl -u how-much-api -o cat` | 런북 |
| nginx | v1 `user_data`가 깐 nginx(이미 있음 — I-1). how-much 설정은 `/etc/nginx/conf.d/how-much.conf` 하나: 80에서 `root /opt/how-much/app/current` (I-12가 안 되면 — D1 '나': `location /api/` → `http://127.0.0.1:8787`, 헤더 `CloudFront-Viewer-Address`·`Content-Type`을 지우지 않음). 꾸러미 폴더 `/usr/share/nginx/html`은 쓰지 않는다 | `setup-host.sh` |
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
| `/api/*` 동작 → 원본 | 새 VPC origin `<이름>` → 같은 EC2 http 8787 (I-12가 안 되면 — D1 '나': 있는 VPC origin `portfolio-web` → 80 → nginx → `127.0.0.1:8787`) |
| 허용 메서드 | `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE` (POST가 들어가는 묶음) |
| 캐시 | 관리형 `CachingDisabled` |
| 원본 요청 정책 | 사용자 지정 — 쿼리 문자열 **전부** · 헤더 **`Content-Type` · `CloudFront-Viewer-Address`** 둘 · 쿠키 없음 |
| 원본 응답 시간 제한 | 30초 (≥ `TIMEOUT_MS` 20초 + 5초). 설정 자리는 I-13(확인 못 함). D1 '나'면 v1 원본과 같은 값이 된다 |
| 오류 응답 사용자 지정 | 0개 — 지금도 없다(I-1). 더하지 않는다 |

## 4. 들어오는 길 (AC-3) — EC2 보안 그룹 `portfolio-web` `<sg id>`
| 무엇 | 값 |
|---|---|
| tcp 80 (있음) | 출처 = CloudFront 관리형 접두사 목록 `com.amazonaws.global.cloudfront.origin-facing` 하나 (I-2, 바꾸지 않음) |
| tcp 8787 (D1 '가'만) | 출처 = 같은 접두사 목록 하나. `0.0.0.0/0` · `::/0` · 다른 출처 없음. D1 '나'면 이 규칙이 없다 |
| tcp 22 | 출처 = EIC 엔드포인트 보안 그룹 하나 |
| 새 보안 그룹을 인스턴스에 붙이기 | 하지 않는다 — 있는 그룹에 규칙만 더한다(교체 위험 — plan 실패 시나리오 2) |
| 공인 IP · 밖으로 가는 경로 | 없음 (I-3) |
| 배포 확인 (서버 안) | `curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: image/jpeg' --data-binary x http://127.0.0.1:8787/api/appraise` → `400` · 로그 `reason` `bad_my_price` · Bedrock 0 · `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/` → `200` · (D1 '가') `listening` 줄 `address` `0.0.0.0` |

## 5. 운영 명령 (런북의 원본은 `docs/runbook/배포.md` — 여기는 이름만 약속)
- 들어가기: EIC로 `ec2-user` (명령째는 런북)
- 로그: `sudo journalctl -u how-much-api -o cat --since '<시각>'`
- 급히 막기: `sudo systemctl stop how-much-api` / `DAILY_CALL_LIMIT = 0` 커밋 → 배포
- 되돌리기: `sudo /opt/how-much/bin/install-release.sh --rollback` (링크 둘을 앞 판으로 + 재시작)
- AC-7 (a): `sudo -u howmuch`로 셈 파일의 `used`를 임시 파일 + `mv`로 바꾼다(서버와 같은 법 — ADR-0004). 바꾸기 전 값을 먼저 적어 둔다

## 6. 바꾸는 법
- 이 문서를 바꾸면 `infra/deploy/` · `.github/workflows/deploy.yml` · `aws-infra-portfolio`의 해당 리소스를 같은 날 맞춘다. 확정 뒤 바꾸려면 architect가 고치고 사용자가 승인한다

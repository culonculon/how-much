[CAREER-30](https://culonculon98.atlassian.net/browse/CAREER-30) · spec: [spec.md](spec.md) · 작업: [tasks.md](tasks.md) · 인프라 사실: [i0-facts.md](i0-facts.md) · 약속: [contracts/deploy.md](../../contracts/deploy.md) (새로, 승인됨 2026-10-28) · [contracts/appraise-http.md](../../contracts/appraise-http.md) §1·§10 (아래 'contracts 고칠 곳' — D1 '나' 글을 넣음) · 결정: [ADR-0007](../../docs/adr/0007-api-deploy-cloudfront-vpc-origin-systemd.md) (**확정 2026-10-28**) · 앞 스토리 [CAREER-31 plan](../CAREER-31-prepublic-guard/plan.md) '범위 밖 · CAREER-30에 넘길 것'

상태: **승인됨 (2026-10-28 — 사용자 승인 D1~D12, 14:10 D1을 나로 바꿈)** (초안 2판 — 2026-10-28 architect, I0 사실 반영). 인프라 사실은 앞 세션이 2026-10-28 13:50에 `aws-infra-portfolio` main `1ea4bf2` · PR #2 브랜치 `bf5d8cf` · PR #2 plan CI 로그로 확인했다([i0-facts.md](i0-facts.md)). architect는 그 저장소를 직접 읽지 않았고 사실 파일만 옮겼다. 아직 모르는 것은 아래 I 표에 '확인 못 함'으로 남겼고, 짐작으로 채우지 않았다. 요금 숫자는 AWS 요금표를 열어 보지 못한 **어림**이다. 승인 전에 사용자가 요금표로 확인한다.

## 먼저 알릴 것
1. **멈출 일은 없다.** I-6에서 PR #2의 '변경 1'은 `aws_instance.web` 제자리 변경(인스턴스 프로필 붙이기)이고 교체가 아니다. 다만 그 CI는 10/24 전에 돌았으므로 머지 전에 plan을 다시 본다(I1).
2. **I0 때문에 추천이 바뀌었다** — 아래 'I0 뒤 바뀐 추천' 표. 크게 바뀐 것은 세 가지다.
   - (가) 나가는 길이 없다 → 운영 길은 SSM이 아니라 **EC2 Instance Connect Endpoint(EIC)**다. 코드는 S3를 거치지 않고 **EIC 터널로 바로 보낸다**. S3 엔드포인트 정책과 인스턴스 역할은 건드리지 않는다.
   - (나) 지금 기본 동작은 EC2 nginx가 내는 **nginx 기본 페이지**다 → 화면을 **같은 EC2의 nginx가 내준다**. 새 버킷·OAC·기본 동작 변경이 모두 없어진다.
   - (다) `user_data_replace_on_change = true`다 → `user_data`를 한 글자라도 바꾸면 서버가 교체된다. D7은 `prevent_destroy`와 'user_data를 건드리지 않음'으로 한다.
3. **spec과 조금 어긋나는 곳 하나 — 사용자 확인이 필요하다(D12).** AC-2는 인프라 PR의 "CI 결과"로 fmt·validate·trivy를 본다. 그런데 사실은 이렇다.
   - 배포 역할을 둘 `bootstrap/`은 CI 밖이고 사용자가 로컬에서 apply한다(I-7·I-8).
   - 그 저장소의 PR CI(`plan.yml`)는 plan만 돌리고, fmt·trivy를 PR에서 돌리는지는 확인하지 못했다(I-7).
   - AC를 바꾸지 않고, 증거를 '세션이 돌린 검사 출력 + 사용자가 붙인 plan 요약'으로 채우는 안을 추천한다. 받아들일지는 사용자가 정한다.
4. **spec이 적지 않았지만 AC-4에 꼭 필요한 일 하나: 화면을 밖 주소에 올리는 일(D6).**
   - 서버가 `127.0.0.1`에만 묶여 있는 문제(D2)는 D1 '나'(14:10)라 생기지 않는다. 같은 컴퓨터의 nginx가 루프백으로 넘기므로 `api/`는 고칠 일이 없다.
6. **(14:10 새로) 사용자가 정할 것이 하나 더 있다 — D13.** 80 규칙의 출처를 VPC origin 서비스 보안 그룹으로 좁힐지 정해야 한다. v1에도 영향이 있다. 또 nginx 본문 상한 값(contracts/deploy.md §6)도 사용자 확인 전이다.
5. spec '비용·남용 영향'의 "그 밖 … 금액은 architect가 적는다"는 아래 D 표의 '월 요금' 칸이 답이다. 승인된 spec 글은 고치지 않았다.

## 사용자가 정할 것 (D1~D13)
| # | 무엇 | 추천 | 다른 후보 · 그 후보를 고르면 달라지는 것 | 월 요금 (어림, 확인 못 함) | 반영 |
|---|---|---|---|---|---|
| D1 | **CloudFront → `api/` 서버 길 · 서버에 바로 오는 길 막기 (A1 · AC-3)** | **사용자 결정 (2026-10-28 14:10): '나'** (14:05 '가'에서 바꿈 — 이유는 옆 칸 '가'). **나: 이미 있는 v1 nginx(80)가 `location /api/`를 `http://127.0.0.1:8787`로 넘긴다.** CloudFront `/api/*`는 이미 있는 VPC origin `portfolio-web`(80)을 쓴다. 들어오는 길은 이미 있는 80 규칙뿐이다(출처 = CloudFront 관리형 접두사 목록 `com.amazonaws.global.cloudfront.origin-facing` — I-2). **새 VPC origin · 8787 보안 그룹 규칙 · `api/` 고침(D2·G1·G2)이 모두 없다.** 8787은 서버가 `127.0.0.1`에만 묶이므로 루프백에서만 닿는다. 대신 계약의 일부가 nginx 설정 안으로 들어간다 — 본문 상한 · 요청·응답 버퍼링 · nginx가 직접 내는 오류의 본문 · 넘길 헤더 · 시간 제한. 이것을 contracts/deploy.md §6에 약속으로 적는다. 그 설정이 약속을 지키는지는 **서버 위에서만 안다**(로컬·CI에서 시험할 길이 없음 — 실패 시나리오 23). 그래서 tasks D1 단계 5에서 Bedrock 0번으로 확인한다. nginx 본문 상한 값은 아직 사용자 확인 전이다(deploy.md §6) | **가 (14:05 결정, 14:10 버림): 같은 EC2에 VPC origin 하나 더(http 8787) + 8787 규칙(접두사 목록) + 환경변수 `HOST`** — 서버가 계약을 중간층 없이 지키고 `api/` 테스트로 잡힌다. 하지만 D2 `HOST`가 CAREER-31 테스트 'AC-6 (5) 설정 한 곳 — 환경변수는 PORT 줄뿐'과 부딪혔다. 사용자는 테스트를 고치는 대신 `api/`를 바꾸지 않는 길을 골랐다(HOST 테스트·구현 커밋은 지움). I-12도 문서로는 부분 확인뿐이었다 / 80 규칙 출처를 **VPC origin 서비스 보안 그룹**으로 좁히기 → **D13** (v1에도 영향) / ~~ALB~~: I-2에서 ALB가 없고 VPC origin이 이미 있음 — 새 고정 요금만 생김. 버림 / ~~EC2 공인 IP~~: v1을 프라이빗에서 꺼냄. 버림 | 0 (CloudFront 요청·전송 요금만) | S1(nginx 설정) · PR-C(`/api/*` 동작 → 원본 `portfolio-web`) · ADR-0007 · contracts/deploy.md §1·§3·§4·§6 · appraise-http.md §1 |
| D2 | **서버가 듣는 주소 (`api/` 고침 — spec 가정 4)** | **해당 없음 — D1 나** (2026-10-28 14:10). `api/`는 `127.0.0.1` 고정 그대로이고, nginx가 같은 컴퓨터 안에서 루프백으로 넘긴다. `api/` 고침 0 | (14:05 추천 '가': 환경변수 `HOST`, 없으면 `127.0.0.1` — D1 '가'와 함께 버림, 커밋 지움) / ~~`HOST` 상수를 `0.0.0.0`으로~~: 로컬 dev 서버도 같은 와이파이에 열림(CAREER-29 U3). 버림 | 0 | — |
| D3 | **서버 컴퓨터에 닿는 운영 길 (A6 — 서버 준비 · 배포 · 로그 · AC-7 (a))** | **EC2 Instance Connect Endpoint(EIC)** — v1 VPC에 하나와 그 보안 그룹. EC2 보안 그룹 `portfolio-web`은 **tcp 22를 EIC 보안 그룹에서만** 받는다. 인터넷 주소 범위에서 오는 규칙이 아니므로 AC-3과 부딪히지 않는다. 키는 `ec2-instance-connect:SendSSHPublicKey`로 잠깐 밀어 넣는다(인스턴스가 IMDS에서 읽으므로 나가는 길이 필요 없음). **조건: I-4 남은 것(그 AMI에 sshd·`ec2-instance-connect` 꾸러미가 있는가, `ec2-user`의 sudo)** | **SSM + 인터페이스 엔드포인트 3개(ssm·ssmmessages·ec2messages)**: 들어오는 포트가 0이고 명령 기록이 남는다. 대신 요금이 생기고, PR #2 역할에 `AmazonSSMManagedInstanceCore`(IAM)가 필요하며, SSM 에이전트가 있는지는 확인 못 함. **EIC가 안 되면(I-4) 이것이 대안이다.** / ~~SSM(나가는 길로)~~: I-3에서 나가는 길이 없음 — 쓸 수 없음 / ~~NAT 게이트웨이~~: 요금이 가장 크고 ADR-0002가 피한 길. 버림 / ~~배스천 + SSH~~: 인스턴스·키 관리가 생김. 버림 | EIC: 0 · SSM 엔드포인트 3개: 약 $21~30 | PR-B · contracts/deploy.md §2·§4 · 런북 |
| D4 | **누가 · 어떻게 코드를 올리나 (A1)** | **가: how-much의 GitHub Actions 수동 실행(`workflow_dispatch`) `deploy`.** main의 커밋만 받는다. 순서: OIDC 배포 역할 → **EIC 터널로 묶음(화면 + `api/`)을 `scp`** → `ssh`로 `sudo install-release.sh <sha>` → CloudFront 무효화. GitHub 환경 `production`에 '사용자 승인 필요'를 걸어 사용자가 누를 때만 돈다. AC-6에서 같은 방법으로 한 번 더 쓴다 | **나: 사용자가 로컬에서 같은 스크립트를 자기 자격 증명과 EIC로** — 배포 역할·`bootstrap` 변경·워크플로가 없어 약 1~1.5일 줄고 D12 문제도 사라진다. 대신 배포가 사용자 컴퓨터·관리자 자격 증명에 기대고, 배포한 커밋이 main인지 아무도 보지 않는다. **11/8이 빠듯하면 빼는 첫 후보.** / ~~묶음을 S3에 두고 EC2가 받기~~ (2판 전 추천): I-3에서 S3 게이트웨이 엔드포인트 정책이 AL2023 꾸러미 저장소 `GetObject`만 허용한다. 받으려면 (1) 그 정책을 넓히고 (2) 인스턴스 역할에 `s3:GetObject`를 더하고(IAM) (3) 버킷을 새로 만들어야 한다. EIC 터널이 이미 바이트를 나르는데 길을 하나 더 내는 셈이라 버림 | 0 (IAM·Actions 무료 범위) | `.github/workflows/deploy.yml` · `infra/deploy/*` (infra-dev) · `bootstrap/how-much.tf`(배포 역할 — D5) |
| D5 | **배포 역할의 자리와 권한 (IAM — D4 '가'일 때)** | **자리: `aws-infra-portfolio` `bootstrap/how-much.tf`** — plan 역할과 같은 OIDC 공급자를 쓰고, **CI 밖이라 사용자가 로컬에서 apply**한다(I-7·I-8). 신뢰: how-much 저장소 · `environment:production` 주체만. 권한: `ec2-instance-connect:OpenTunnel`(그 EIC 엔드포인트 하나) · `ec2-instance-connect:SendSSHPublicKey`(그 인스턴스 하나, OS 사용자 `ec2-user`만) · `cloudfront:CreateInvalidation`(그 배포 하나). `Resource`에 `*` 없음. S3 권한 없음. 조건 키(OS 사용자·원격 포트 22)를 어떻게 거는지는 확인 못 함 — I2′에서 문서로 확인 | 넓게(`EC2InstanceConnect` 관리형 정책 등): 쓰기 쉽다. 하지만 이 역할이 곧 '서버에서 sudo로 아무 코드나 돌리는 권한'이라 좁혀야 한다(신뢰 경계 ⑫) / `infra/`(CI apply)에 두기: 그러면 역할이 PR CI로 검사된다. 다만 I-8 주석('apply 역할은 나중에 따로')과 how-much 역할을 `bootstrap`에 모아 둔 지금 구조와 어긋난다 | 0 | `bootstrap/how-much.tf` (사용자 로컬 plan·apply) |
| D6 | **화면(`app/dist`)을 둘 곳 (spec 밖이지만 AC-4에 필요)** | **라: 같은 EC2의 nginx가 `/opt/how-much/app/current`를 내준다.** 기본 동작(`/*` → VPC origin `portfolio-web` 80, GET·HEAD, `Managed-CachingOptimized`, `default_root_object = index.html`)은 **한 글자도 안 바뀐다**(I-1). 화면 코드도 그대로다(어댑터가 `/api/appraise` 절대 경로). 지금 그 자리에 있는 nginx 기본 페이지는 사라진다. 배포마다 무효화 `/*`(캐시된 옛 `index.html`). nginx 설정은 `/etc/nginx/conf.d/how-much.conf` 하나 — 꾸러미 폴더(`/usr/share/nginx/html`)에 두지 않는다(꾸러미 업데이트가 덮음) | **가: 기본 동작을 how-much 화면 S3 버킷(OAC)으로** (2판 전 추천): 화면이 서버 컴퓨터와 떨어진다. 대신 버킷·OAC·버킷 정책·기본 동작 원본 바꾸기·배포 역할 S3 쓰기가 더 들고, 서버가 멈추면 어차피 감정이 안 되니 떨어진 이득이 작다. 버림 / **나: `/how-much/*` 아래**: v1 nginx 기본 페이지를 남겨야 할 때만. `app/vite.config.js`에 `base`(F1)와 동작 하나가 더 든다 / ~~새 CloudFront 배포~~: U9와 어긋남. 버림 | 0 (CloudFront 무효화는 경로 `/*` 1개) | `infra/deploy/how-much-nginx.conf` · S1 · (나면) F1 |
| D7 | **서버 컴퓨터 교체 막기 (A2 · AC-2)** | **`aws_instance.web`에 `lifecycle { prevent_destroy = true }`만** 걸고, **`user_data`는 이 스토리에서 한 글자도 바꾸지 않는다**(서버 준비는 운영 길 D3로). I-5에 따라 `user_data_replace_on_change = true`이므로, 누가 `user_data`나 고정 AMI를 바꾸면 plan이 교체를 만든다. 그러면 `prevent_destroy` 때문에 **CI plan이 오류로 멈춘다**(크게 실패). 알아 둘 것: 이 줄이 있으면 그 저장소에서 `terraform destroy`(v1 내리기)도 막힌다. 내리려면 먼저 이 줄을 지우는 PR이 필요하다 | **`ignore_changes = [user_data]`도 더함**: 교체는 안 생기지만 `user_data`를 고쳐도 **조용히 아무 일도 안 일어난다**. v1 쪽에서 고친 사람이 반영됐다고 믿게 된다. 버림 추천 / `ignore_changes = [ami]`: AMI가 data source가 아니라 고정 값이라(I-5) 저절로 생기는 교체가 없다. 필요 없음 / 막지 않고 PR마다 plan을 사람이 읽음: 놓치면 셈 파일·홈이 사라진다 | 0 | PR-B · AC-2 |
| D8 | **서버 로그 자리 (A6)** | **journald** — `api/`는 지금처럼 표준 출력에 1줄씩 쓰고 systemd가 받는다. 사용자는 D3 길로 `sudo journalctl -u how-much-api -o cat --since …`. `/etc/systemd/journald.conf.d/how-much.conf`에 `Storage=persistent` · `SystemMaxUse=200M` | **CloudWatch Logs 에이전트**: 콘솔에서 보기 좋다. 하지만 나가는 길이 없어(I-3) logs 인터페이스 엔드포인트와 IAM `logs:*`, 에이전트 설치가 더 든다 | journald: 0 · CloudWatch: 엔드포인트 약 $7~10 + 수집 | `infra/deploy/setup-host.sh` · 런북 |
| D9 | **머지 차례와 요금 시작 시각 (AC-1)** | **PR #2(plan 다시 확인 → 머지 = 엔드포인트 요금 시작) → PR-B(EIC · 22 규칙 · `prevent_destroy` — 아직 밖에 안 열림) ∥ bootstrap 배포 역할(사용자 로컬 apply) → how-much PR-1 머지 → 서버 준비·첫 배포·서버 안 확인(nginx 넘김 확인 포함, Bedrock 0) → PR-C(CloudFront `/api/*` = 공개 시각)**. CAREER-31은 이미 10/28 13:21 main(머지 커밋 `ef17df3`)에 들어갔으므로 AC-1 '뒤에'는 저절로 맞다. D6 '라'면 **첫 배포 순간부터 화면이 밖 주소에 보인다.** 감정은 PR-C 전까지 안 된다(기본 동작이 POST를 받지 않음). 그래서 첫 배포와 PR-C를 같은 날 잇는다 | PR #2와 PR-B를 하나로: 머지는 한 번이지만 이미 리뷰한 PR #2가 다시 커진다. / PR-B·PR-C를 하나로: 서버가 뜨기 전에 밖에 열린다 | 엔드포인트 요금은 PR #2 머지부터 — PR-B가 준비된 날 머지 | tasks 차례 |
| D10 | **상태 확인(health) 입구 (A8)** | **만들지 않는다.** VPC origin은 원본 상태 검사를 하지 않는다. 배포 뒤 확인은 서버 안에서 `curl`로 **Bedrock을 안 부르는 거절 요청**(400 `invalid_input`)을 보내 한다. 새 입구가 없으니 새 남용 면도 없다 | 만든다(`GET /api/health`): ALB가 없어(I-2) 필요가 없다 | 0 | — |
| D11 | contracts/deploy.md · appraise-http.md 고칠 글(아래) · ADR-0007 · 이 plan · tasks 승인 | 승인 | — | — | U1 |
| D12 | **CI가 없는 인프라 변경의 AC-2 증거 (spec AC-2 "그 CI 결과")** | `bootstrap/` 변경(D5)과, PR CI가 fmt·trivy를 돌리지 않는 경우의 PR-B·PR-C는 이렇게 증거를 남긴다. 앞 세션이 그 저장소에서 `terraform fmt -check` · `terraform validate`(`init -backend=false`) · `trivy config`를 돌려 **출력 그대로**를 PR 설명에 붙인다. `bootstrap` plan은 **사용자가 로컬에서** 돌리고 요약(`Plan: …`)을 붙인다(세션은 plan을 돌리지 않음 — CLAUDE.md §6). AC 글은 바꾸지 않는다 | **D4 '나'를 고름** → `bootstrap` 변경 자체가 없다. / **spec AC-2 글을 고침**(증거를 'CI 결과 또는 붙인 출력'으로): spec 바꾸기라 사용자 몫 | 0 | tasks I2′·I2·I3 |
| D13 | **(정함 — 2026-10-28 14:35 사용자: '가' 그대로) 80 규칙의 출처를 좁힐지 (AC-3 · v1에도 영향)** | **가: 지금은 그대로 둔다(CloudFront 관리형 접두사 목록 — i0-facts 'Option 1'). 좁히는 일은 11/8 뒤 따로 한다.** AC-3은 이미 두 사실로 맞는다 — 공인 주소가 없고, 사설 주소에는 우리 계정의 VPC origin만 닿는다(A1 답 '남는 것'). 이 규칙은 v1 화면도 쓰는 80 규칙이다. 그 저장소는 머지가 곧 apply라(I-7) 잘못되면 v1·how-much 화면이 함께 끊긴다. 되돌리기는 PR 하나로 되지만, 끊기는 쪽 위험이 좁히는 이득보다 크다고 본다 | **나: 80 규칙 출처를 `CloudFront-VPCOrigins-Service-SG`로 바꾼다(i0-facts I0′ 'Option 2') — PR-B에 넣음.** 사실 파일 말로는 "더 제한적이라 우리 CloudFront 배포로만 좁힘"이고, 규칙 한 줄로 '우리 VPC origin만'이 보인다. 대신 v1 80 규칙을 바꾼다. 바꾸는 동안 끊김이 생기는지와, 서비스가 만든 그 보안 그룹을 Terraform에서 어떻게 가리키는지는 확인 못 함 — 고르면 PR-B 전에 앞 세션이 문서로 확인한다 / **다: 두 규칙을 다 둠(접두사 목록 + 서비스 보안 그룹)**: 규칙은 합쳐지므로 넓은 쪽(접두사 목록)이 그대로 남아 좁혀지지 않는다. 버림 | 0 | (나) PR-B · contracts/deploy.md §4 · A1 답 AC-3 확인 1 |

### I0 뒤 바뀐 추천 (2판 전 → 지금 · 왜)
| D | 2판 전 추천 | 지금 | 왜 바꿨나 (근거 I) | 버린 것 |
|---|---|---|---|---|
| D1 | 새 VPC origin + 8787 출처 = VPC origin 보안 그룹 | 있는 VPC origin은 그대로 + 8787용 VPC origin 하나 더 · 출처 = CloudFront 접두사 목록 | VPC origin·IGW가 이미 있음(I-2·I-9). v1 80 규칙이 접두사 목록 방식(I-2) | VPC origin 보안 그룹 출처 → 대안으로 남김(방식 통일·Terraform에서 가리키는 법 확인 못 함) |
| D1 대안 '나' | nginx 버림(오류 HTML · 버퍼링 · 새 꾸러미) | '나'로 다시 올림(I-12 안 되면 첫 대안) | nginx가 이미 깔려 있어 '새 꾸러미' 이유는 사라짐(I-1). 나머지 두 이유는 '우리가 새로 쓰는 넘김 설정이 계약을 지키는지 서버 위에서만 안다'로 남음 | — |
| D1 (14:10) | '가'(VPC origin 8787 + `HOST`) — 14:05 사용자 결정 | **'나'(있는 nginx가 `/api/` 넘김) — 14:10 사용자 결정** | `HOST`가 CAREER-31 테스트 'AC-6 (5) 환경변수는 PORT 줄뿐'과 부딪힘 → 사용자가 `api/`를 바꾸지 않는 길을 고름. 버렸던 두 이유(오류 HTML · 버퍼링)는 contracts/deploy.md §6 약속과 D1 단계 5 서버 위 확인으로 막는다 | '가' · D2 · G1·G2 · 8787 규칙 · 두 번째 VPC origin |
| D3 | 나가는 길이 있으면 SSM, 없으면 EIC | EIC | 나가는 길 없음 · SSM 엔드포인트 없음 · SSM 권한 없음(I-3·I-4) | SSM(나가는 길) — 쓸 수 없음 |
| D4 | 묶음을 S3에 올리고 EC2가 받음 | EIC 터널로 `scp` | S3 엔드포인트 정책이 AL2023 저장소만 허용(I-3), 인스턴스 역할에 S3 권한 없음(I-4) | S3 묶음 버킷 — 엔드포인트 정책·IAM·버킷이 더 듦 |
| D5 | 자리 미정(I-8 뒤) | `bootstrap/how-much.tf`, 사용자 로컬 apply · S3 권한 빠짐 · EIC 권한 | I-8 · D4 바뀜 | — |
| D6 | 기본 동작을 S3(OAC)로 | 같은 EC2 nginx | 기본 동작이 이미 EC2 nginx이고 v1 화면이 따로 없음(I-1) | S3+OAC — 리소스 넷이 더 들고 이득이 작음 |
| D7 | `prevent_destroy` + (I-5에 따라) `ignore_changes = [ami, user_data]` | `prevent_destroy`만 + `user_data` 안 건드림 | AMI 고정(I-5) → `ami` 무시 필요 없음. `user_data` 무시는 조용히 실패하는 쪽 | `ignore_changes` |
| D8 | CloudWatch 대안: 엔드포인트 '나가는 길 없으면' | 엔드포인트가 꼭 듦 | I-3 | — |
| D10 | ALB면 검사 필요할 수 있음 | ALB 없음 | I-2 | — |
| 크기·위험 | I-3·I-9가 가장 큰 흔들림 | I-4 남은 것 · I-12 · Node 꾸러미 | 아래 '크기' | — |

## 인프라 사실 (I0 — [i0-facts.md](i0-facts.md))
| # | 무엇 | 사실 | 이 plan에서 |
|---|---|---|---|
| I-1 | 기본 동작이 내주는 것 · 오류 응답 사용자 지정 | **확인함:** `infra/cdn.tf` `default_cache_behavior` → origin `portfolio-web`(VPC origin → EC2 http 80, `http-only`) · `allowed_methods = ["GET","HEAD"]` · `Managed-CachingOptimized` · `default_root_object = "index.html"`. **`custom_error_response` 없음.** EC2에서 도는 것은 `user_data`의 nginx뿐이라 **nginx 기본 페이지**가 나간다(v1 화면 없음). `ordered_cache_behavior` · origin_request_policy · WAF 없음 | D6 '라' · PR-C에서 오류 응답을 지울 일이 없음(더하지도 않음) |
| I-2 | CloudFront가 EC2에 닿는 길 | **확인함:** `aws_cloudfront_vpc_origin.web`(arn = `aws_instance.web.arn`, http_port 80). ALB·공인 IP 없음. 보안 그룹 `portfolio-web` 들어오기 = **CloudFront 관리형 접두사 목록 `com.amazonaws.global.cloudfront.origin-facing`에서 tcp 80만**(VPC origin 보안 그룹 참조 아님). 8787 규칙 없음 | D1 |
| I-3 | 밖으로 나가는 길 · 엔드포인트 | **확인함:** 나가는 길 없음(NAT·공인 IP 없음, `map_public_ip_on_launch = false`, 라우팅 표에 0.0.0.0/0 없음). S3 **게이트웨이** 엔드포인트 하나, 정책 = `s3:GetObject` on `arn:aws:s3:::al2023-repos-ap-northeast-2-de612dc2/*`만. 보안 그룹 나가기 = S3 접두사 목록 443만(+ PR #2가 bedrock 엔드포인트 SG 443). SSM 인터페이스 엔드포인트 없음 | D3 EIC · D4 S3 버림 · D8 · Node는 `dnf`(AL2023 저장소)로 받을 수 있는 길만 있음 |
| I-4 | OS·CPU · 에이전트 · 역할 | **확인함(코드):** AMI `ami-0d8d71a28c118c486` = AL2023 · kernel 6.12 · **arm64** · `t4g.small` · IMDSv2만. main에는 인스턴스 역할 없음. PR #2가 역할 `portfolio-web`(인라인 `invoke-nova-pro`만)과 인스턴스 프로필을 붙임. `AmazonSSMManagedInstanceCore` 없음. **확인 못 함:** 그 AMI에 sshd·`ec2-instance-connect`·SSM 에이전트가 있는가 · `ec2-user`의 sudo · `dnf`로 `nodejs22`를 받을 수 있는가와 그 실행 파일 경로 | D3 조건 · Node 런타임 · 묶음은 CPU와 무관(아래 '정한 것') |
| I-5 | AMI · user_data · lifecycle | **확인함:** AMI는 locals 고정 값("바꿀 때는 PR로 교체 — 서버는 새로 만들어짐"). **`user_data` 인라인 + `user_data_replace_on_change = true`.** `lifecycle` 블록 없음 | D7 |
| I-6 | PR #2 '변경 1' | **확인함:** CI run 39705483346 — `Plan: 7 to add, 1 to change, 0 to destroy.` · 변경 1 = **`aws_instance.web will be updated in-place`**(iam_instance_profile). 교체 아님. 그 실행은 10/24 전 → **머지 전 plan을 다시 본다** | I1 · AC-1·AC-2 |
| I-7 | 그 저장소 CI | **확인함:** `deploy.yml` — main에 `push`(paths `infra/**`·`deploy.yml`) → `infra/`에서 init·fmt -check·validate·plan·**apply 전체**(루트 하나). `plan.yml` — PR에서 `infra/**` plan만(`AWS_PLAN_ROLE_ARN`). **`bootstrap/`은 CI 밖, 사용자가 로컬 state로 apply.** **확인 못 함:** PR CI에서 fmt·validate·trivy를 따로 돌리는가(사실 파일에 '`plan`만') | 폴더별로 나눌 일 없음(PR-B·PR-C 둘 다 `infra/`) · D12 |
| I-8 | 배포 역할 자리 | **확인함:** `bootstrap/how-much.tf`에 how-much용은 state 버킷 + plan 역할(`github-actions-how-much-plan`, sub `…:pull_request`, ReadOnlyAccess)뿐. 주석 "apply 역할은 나중에 따로". 같은 파일에 배포 역할을 둘 수 있음(apply는 사용자 로컬) | D5 · D12 |
| I-9 | 인터넷 게이트웨이 | **확인함:** `network.tf` `aws_internet_gateway.main`(주석 "VPC 오리진 요구 사항"). VPC origin은 이미 쓰는 중 | D1 '가'·'나' 모두 가능 |
| I-10 | `CloudFront-Viewer-Address`를 브라우저가 꾸밀 수 있나 | **확인 못 함** — 코드로는 알 수 없음 → 배포 뒤 '꾸민 헤더' 확인(V1 단계 2, Bedrock 0) | AC-3 · 실패 시나리오 3 |
| I-11 | (새로) 지금 v1 주소가 실제로 nginx를 내주나 — 접두사 목록 규칙으로 VPC origin이 닿는지 | **확인함(10/28 13:58 앞 세션, 읽기만)**: `curl -sI https://d2x05xzjhjvp9j.cloudfront.net/` → `HTTP/2 200` · `server: nginx/1.30.5` · `x-cache: RefreshHit from cloudfront`. `aws cloudfront list-vpc-origins` → `portfolio-web` `Deployed` 하나 | D1 가의 8787 규칙을 같은 방식(접두사 목록)으로 써도 되는 근거가 됨 |
| I-12 | (새로) 같은 EC2 ARN을 가리키는 VPC origin을 하나 더 만들 수 있나(포트 다르게) | **해당 없음 — D1 '나'(14:10).** 두 번째 VPC origin을 만들지 않는다. (I0′ 문서 확인은 부분 확인이었다 — i0-facts) | D2·G1·G2 해당 없음 · PR-B에 VPC origin·8787 규칙 없음 |
| I-13 | (새로) VPC origin을 쓰는 원본의 **응답 시간 제한**을 어디에 두나 · `portfolio-web`의 지금 값 | **확인함(10/28 14:10 앞 세션, AWS 문서 — i0-facts I0′)**: 원본마다 Response timeout 1~120초(기본 30) · Keep-alive 1~300초 · Connection 1~10초. 지금 cdn.tf origin에는 시간 값 없음 → 기본 30초 | contracts §3 '30초'. D1 '나'면 v1 원본과 같은 원본이라 값이 기본 동작에도 걸림 |

## 접근 방법
서버 한 대(가정 3)의 **루트 디스크에 남는 상태(홈의 셈 파일)를 지키면서, 코드만 바꿔 끼우는** 배포다. 서버 준비와 코드 올리기는 모두 EIC 길로 하고, `user_data`와 AMI는 건드리지 않는다.

1. **열기 전 준비 (인프라 — 밖에 아무것도 안 열림)**: PR #2(엔드포인트·IAM)를 plan을 다시 보고 머지한다. PR-B로 EIC와 22 규칙(D3) · `prevent_destroy`(D7)를 만든다(D1 '나' — VPC origin·8787 규칙 없음). 배포 역할(D4·D5)은 `bootstrap/`에 사용자가 로컬 apply한다. 모두 `aws-infra-portfolio`(결정 D)다 — `infra/`는 머지 = apply = 사용자, `bootstrap/`은 사용자 로컬 apply.
2. **서버 준비 (한 번)**: 사용자가 EIC로 들어가 `setup-host.sh`를 돌린다 — `howmuch` 사용자·홈 · `/opt/how-much/{api,app}` · systemd 단위 · nginx 설정(화면 + `/api/` 넘김 — contracts/deploy.md §6) · journald 설정 · Node 22. 첫 배포 뒤 nginx 넘김이 계약을 지키는지 서버 위에서 확인한다(tasks D1 단계 5 — Bedrock 0).
3. **코드 올리기 (배포마다 같은 길 — AC-6)**: 순서는 이렇다. 끝까지 가면 성공이고, 중간 실패는 단계 5에서 처리한다.
   1. `deploy` 워크플로가 main 커밋으로 `api-<sha>.tar.gz` · `app-<sha>.tar.gz` · `SHA256SUMS`를 만든다.
   2. EIC 터널로 서버의 `/var/tmp/how-much-deploy/<sha>/`에 보낸다.
   3. `sudo install-release.sh <sha>`가 `sha256sum -c` → 판 폴더 둘에 풀기 → `current` 링크 둘을 원자적으로 바꾸기(`mv -T`) → `systemctl restart how-much-api`까지 한다.
   4. 확인: 5초 안에 `listening` 줄이 나온다 · 서버 안 `curl` 거절 요청이 400이다(Bedrock 0) · `curl http://127.0.0.1/`이 200이다.
   5. 하나라도 실패하면 링크를 앞 판으로 되돌리고 재시작한 뒤 실패로 끝낸다. 성공하면 CloudFront 무효화 `/*`로 끝낸다. 어느 경우에도 홈(셈 파일)은 건드리지 않는다.
4. **열기 (맨 끝)**: PR-C로 CloudFront `/api/*` 동작(contracts §3)을 연다. 이 머지 시각이 '공개' 시각이다(AC-1). 화면은 3에서 이미 보인다(D9).
5. **밖에서 확인 (사람)**: 꾸민 헤더(AC-3) → AC-4 → AC-5 → AC-6 → AC-7 차례로 하고, 사이에 1분 넘게 둔다. Bedrock 최대 9번.
6. **런북 (release-ops)**: 배포·되돌리기·로그·급히 막기·엔드포인트 요금 멈추기·AC-7 확인법 · 증거 점검표.

### 바뀌는 파일 (how-much)
| 파일 | 하는 일 | 누가 | AC |
|---|---|---|---|
| `api/` (전부) | **고치지 않음 — D1 '나'**(D2 해당 없음 · `127.0.0.1` 고정 그대로) | — | — |
| `infra/deploy/setup-host.sh` · `install-release.sh` · `how-much-api.service` · `how-much-nginx.conf` (새로) | 위 '접근 방법' 2·3 · nginx는 화면(D6 '라') + `/api/` 넘김(D1 '나', contracts/deploy.md §6) · 단위 파일에 `Environment=HOST` 줄 없음 | infra-dev (함께) | 2·3·4·6·8 |
| `.github/workflows/deploy.yml` (새로) | `workflow_dispatch` · `environment: production` · `concurrency: deploy` · OIDC · 묶음 → EIC `scp` → `install-release.sh` → 무효화 · 출력을 잡 요약에 — D4 '가'일 때 | infra-dev (함께) | 1·4·6 |
| `app/vite.config.js` | `base: '/how-much/'` — **D6 '나'일 때만** | frontend-dev | 4 |
| `contracts/deploy.md` (새로) · `contracts/appraise-http.md` · `docs/adr/0007-…` | U1에서 승인 · appraise-http.md는 승인 뒤 고침 | architect | — |
| `docs/runbook/배포.md` (새로) · `배포-증거-점검표.md` | AC-8 | release-ops | 8 |

- 건드리지 않는 것: `api/` 전부(D1 '나') · `app/src` · `e2e/` · `infra/*.tf`(how-much Terraform — 결정 D) · `pipeline.config.json` · `.github/workflows/reusable-*` · `ci.yml`.
- 새 의존성: 없음(`api/`·`app/`). EC2에 Node 22(꾸러미 또는 공식 tar — I-4).

### 바뀌는 것 (`aws-infra-portfolio` — 결정 D, 이 저장소 밖)
| 변경 | 무엇 (파일은 사실 파일에서 안 것만) | 밖에 열림? | 검사 · apply | 요금 |
|---|---|---|---|---|
| PR #2 (있음, draft) | bedrock-runtime 엔드포인트 · 보안 그룹 · EC2 역할·인스턴스 프로필(`aws_instance.web` 제자리 변경) — 설명에 plan 요약과 '변경 1' | 아니오 | PR CI plan(다시 돌림) · 머지 = apply | 엔드포인트 월 $7~10 시작 |
| PR-B (새로) | `aws_ec2_instance_connect_endpoint` + 그 보안 그룹 · `portfolio-web` 보안 그룹에 22(출처 EIC SG) · `aws_instance.web`에 `prevent_destroy`. VPC origin·8787 규칙은 없다(D1 '나'). 80 규칙은 D13 '나'를 고를 때만 바꾼다. **인스턴스에 새 보안 그룹을 붙이지 않고 있는 그룹에 규칙만 더한다** · `user_data` 0줄 변경 | 아니오(CloudFront 동작이 아직 안 가리킴) | PR CI plan + D12 · 머지 = apply | 0 (D 표) |
| `bootstrap/how-much.tf` (새로 더함) | 배포 역할(D5) — D4 '가'일 때 | 아니오 | **CI 밖** — D12 · 사용자 로컬 plan·apply | 0 |
| PR-C (새로) | `infra/cdn.tf`에 `ordered_cache_behavior` `/api/*`(contracts §3, 원본 = 있는 `portfolio-web`) · 사용자 지정 원본 요청 정책. 원본·VPC origin은 바꾸지 않는다(D1 '나') | **예 — 공개 시각** | PR CI plan + D12 · 머지 = apply | CloudFront 요청 요금만 |

## A1 답: 배포 방식 — D1·D2·D3·D4·D6·D9 · ADR-0007
- **코드 올리는 길**: D4 — main 커밋만, 사용자가 누를 때만. EIC 터널로 묶음을 보내고, 판 폴더 + 링크 바꾸기 + 재시작으로 끝낸다. **다시 켜지는 법**: systemd `Restart=on-failure`. 컴퓨터를 다시 켜면 `WantedBy=multi-user.target`로 뜬다.
- **CloudFront `/api/*`가 어디서 생기나**: `aws-infra-portfolio` PR-C(`infra/cdn.tf` — I-1에서 그 파일에 배포가 있음을 확인함). 설정은 contracts/deploy.md §3이고 appraise-http.md §10을 전부 담는다.
  - 메서드 7개 허용(POST 포함) · 관리형 캐시 정책 `CachingDisabled`.
  - 원본 요청 정책은 사용자 지정: **쿼리 문자열 전부 + 헤더 `Content-Type` · `CloudFront-Viewer-Address`**.
  - 원본은 이미 있는 VPC origin `portfolio-web`(80 → nginx → `127.0.0.1:8787`)이다(D1 '나'). 그 원본의 응답 시간 제한은 `cdn.tf`에 적혀 있지 않아 기본 30초다(i0-facts I0′ I-13). PR-C에서 바꾸지 않는다. nginx 쪽 시간 제한은 이보다 짧게 둔다(contracts/deploy.md §6).
  - 오류 응답 사용자 지정은 없음 — 지금도 0개(I-1)이고 더하지 않는다. nginx가 직접 내는 오류는 nginx 안에서 JSON으로 바꾼다(deploy.md §6).
- **PR #2 말고 필요한 변경과 요금**: 위 표. 추천대로면 **새 고정 요금은 PR #2의 엔드포인트 하나(월 $7~10)뿐**이다. EIC가 안 돼 SSM 엔드포인트로 가면 월 약 $21~30이 더해진다(D3).
- **AC-3 확인 방법** (V1 단계 1·2 — 사용자가 읽기 전용으로 돌리고 출력을 PR에):
  1. 보안 그룹: `aws ec2 describe-security-groups --group-ids <portfolio-web SG> --query "SecurityGroups[].IpPermissions"`. 기대하는 출력은 넷이다.
     - 80 규칙: `PrefixListIds`가 CloudFront origin-facing 목록 하나뿐 · `IpRanges`·`Ipv6Ranges`는 빈 목록. (D13 '나'를 고르면 `UserIdGroupPairs`가 VPC origin 서비스 보안 그룹 하나뿐)
     - 8787 규칙은 **없다**. 서버는 루프백에만 묶인다 — tasks D1 단계 2 `listening` 줄 `address` `127.0.0.1`.
     - 22 규칙: `UserIdGroupPairs`가 EIC 보안 그룹 하나뿐.
     - `IpProtocol == "-1"` 규칙이 없다.
     - `0.0.0.0/0`·`::/0`이 0번.
  2. 공인 주소 없음: `aws ec2 describe-instances --instance-ids <ID> --query "Reservations[].Instances[].[PublicIpAddress, NetworkInterfaces[].Association.PublicIp]"` → `null`·빈 목록(I-3을 배포 뒤에 다시 봄).
  3. 꾸민 헤더(I-10): 밖에서 `curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Content-Type: image/jpeg' -H 'CloudFront-Viewer-Address: garbage' --data-binary 'x' 'https://<밖 주소>/api/appraise'`.
     - 기대: 응답 `400`, 서버 로그 그 줄의 `who`가 `"ip4"` 또는 `"ip6"`(CloudFront가 덮어씀)이고 `"bad"`가 아님.
     - `myPrice`가 없어 `invalid_input`으로 끝나므로 **Bedrock 0번**이다.
  4. plan에서: PR-B·PR-C plan 출력에 `0.0.0.0/0`·`::/0`이 들어오는 규칙으로 0번.
  - 남는 것(받아들임 — 사용자 확인): 접두사 목록은 'CloudFront 전체'를 뜻한다. 그래도 EC2에 공인 주소가 없어 사설 주소에는 **우리 계정이 만든 VPC origin**으로만 닿는다. 이 출처를 규칙 자체로 좁힐지는 **D13**(사용자 몫)이다. 22번(EIC)은 서버 포트가 아니고 IAM으로 열린다 — 운영자 길이다. 들어오는 길은 80(nginx) 하나뿐이고, 서버 포트 8787에는 같은 컴퓨터 안에서만 닿는다.

## A2 답: 셈 파일 자리 처음 만들기 · 교체 막기/알아채기 (AC-2 · AC-6)
| 무엇 | 정한 것 |
|---|---|
| 처음 만들기 | `setup-host.sh`가 `howmuch` 사용자와 **홈만** 만든다. `~/.local/state/how-much/`와 `usage.json`은 **서버가 처음 셀 때 스스로** `0700`/`0600`으로 만든다(CAREER-31 G4 코드 그대로) |
| 확인 | 첫 감정(AC-4) 뒤 `sudo stat -c '%U %a %n' /home/howmuch/.local/state/how-much /home/howmuch/.local/state/how-much/usage.json` → `howmuch 700 …` · `howmuch 600 …` · `systemctl show how-much-api -p User -p DynamicUser -p ProtectHome` → `User=howmuch` · `DynamicUser=no` · `ProtectHome=no` |
| 다시 배포해도 남음 | `install-release.sh`는 `/opt/how-much/` 아래와 `/var/tmp/how-much-deploy/`만 바꾼다. 홈 경로를 지우는 줄이 0줄이다(S1 검사 `grep`). AC-6이 실제로 본다(`dayUsed`가 이어짐) |
| 교체 막기 | D7 `prevent_destroy` · `user_data` 안 건드림 · 인스턴스에 새 보안 그룹을 붙이지 않음(있는 그룹에 규칙만) — 교체 plan은 CI에서 오류 |
| 교체 알아채기 | PR #2 · PR-B · PR-C 설명에 plan 요약과 `grep -nE 'aws_instance\..*(must be replaced|will be destroyed)'` 결과(0줄)를 적는다. PR-B·PR-C diff에 `user_data` 줄 0. 배포 뒤 로그의 `dayUsed`가 같은 날 줄어들면 셈이 사라진 것이다 |
| 남는 위험 | 루트 디스크(EBS) 고장이나 손으로 인스턴스를 끝내면 셈이 사라진다 → 받아들임. 최대 손해는 그날 상한이 한 번 더 생기는 것(하루 900원 어림) |

## A6 답: 로그 읽는 길 · 서버 컴퓨터에 들어가는 길
- **로그**: D8 journald. 사용자가 EIC로 `sudo journalctl -u how-much-api -o cat --since '<시각>' | grep '"evt":"appraise"'`. 로그 줄에는 주소·비밀값이 없다. 붙이기 전에 `grep -cE 'AKIA|aws_secret|cloudfront-viewer-address'`가 0인지 본다.
- **서버 컴퓨터에 들어가는 길이 있다 → AC-7은 (a)**: EIC로 `sudo -u howmuch` 명령을 돌린다. 셈 파일은 서버와 같은 법(임시 파일에 쓰고 `mv`)으로 고친다. 서버가 `take()`마다 파일을 다시 읽으므로 재시작이 필요 없다(ADR-0004). 명령은 contracts/deploy.md §5 · 런북에 둔다.
- 새 IAM: 사용자 자신이 EIC를 쓰는 권한(`OpenTunnel`·`SendSSHPublicKey`) — 사용자의 관리자 자격 증명에 이미 있으면 새로 만들 것이 없다. 세션은 이 길을 쓰지 않는다(CLAUDE.md §6).
- **EIC도 SSM도 안 되면**(I-4 남은 것이 '없음') 서버에 들어갈 길이 없다. 그러면 서버 준비 자체를 못 한다. `user_data`로 하면 교체가 일어나 AC-2와 부딪힌다 → **멈추고 사용자에게 묻는다**(실패 시나리오 17).

## A8 답: 상태 확인 입구 → D10 '만들지 않는다'
- 배포 스크립트는 서버 안에서 `curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: image/jpeg' --data-binary x http://127.0.0.1:8787/api/appraise`로 확인한다.
  - 기대: `400`, 로그에 그 줄 `outcome` `invalid_input` · `reason` `bad_my_price`. `myPrice`가 없으니 Bedrock은 0번이다.
  - 헤더가 없어 사람 `-`로 1번 센다. 실제 사용자는 헤더가 있으므로 겹치지 않는다.
- D1 '나'라 `listening` 줄의 `address`가 `127.0.0.1`인지도 본다(8787은 루프백만 — AC-3). nginx를 거친 길은 첫 배포 뒤 한 번 확인한다(tasks D1 단계 5).

## CAREER-31에서 넘겨받은 것 셋
| # | 넘겨받은 것 | 여기서 | 확인 |
|---|---|---|---|
| 1 | CloudFront가 `CloudFront-Viewer-Address`를 원본에 넘김 · 브라우저가 보낸 같은 이름을 덮어씀 | PR-C 원본 요청 정책. nginx는 그 헤더를 지우거나 바꾸지 않고 그대로 넘긴다(contracts/deploy.md §6) | tasks D1 단계 5 (f) · AC-3 확인 3 · AC-5 · 로그에 `who:"none"`/`"bad"` 0줄 |
| 2 | 다시 배포해도 남는 홈 · `DynamicUser`·`ProtectHome` 안 씀 | 서비스 사용자·systemd 단위 · A2 | A2 '확인' · AC-6 |
| 3 | PR #2만으로는 밖에서 안 닿음 | D1·D3·D4·PR-B·PR-C | AC-3 · AC-4 |
| (+) | 인스턴스 역할로 자격 증명 사슬이 풀림 · 429·503을 오류 페이지로 안 바꿈 | `install-release.sh`가 `listening`을 기다림 · 오류 응답 사용자 지정 0(I-1) · nginx는 서버가 낸 응답을 가로채지 않음(deploy.md §6) | 배포 출력 · tasks D1 단계 5 · AC-5·AC-7 |

## 신뢰 경계 (`strict_review_areas: guard` — D1 '나'라 `api/`는 고치지 않음)
CAREER-25 ①~⑥ · CAREER-27 ⑦ · CAREER-31 ⑧⑨는 그대로다. 아래를 더한다.
10. 해당 없음 — D1 '나'(`HOST` 없음 · 서버는 `127.0.0.1` 고정).
11. (새로) 인터넷 → CloudFront(`/api/*` 동작, `CloudFront-Viewer-Address`를 CloudFront가 씀) → VPC origin `portfolio-web` 80 → EC2 보안 그룹(출처 = CloudFront 접두사 목록 — D13, 공인 주소 없음) → nginx `location /api/`(헤더 그대로 · 본문을 흘려 넘김 · nginx 자체 오류는 JSON — contracts/deploy.md §6) → 루프백 8787 → 경계 ⑧(사람별) … Bedrock. **사람 구분 값의 믿음은 이 경계가 지켜질 때만 맞다.** 공인 IP나 다른 출처 규칙이 생기면 ⑧이 꾸밀 수 있는 값이 된다.
12. (새로) GitHub `deploy` 실행(사용자 승인) → OIDC 역할(D5, `bootstrap`) → EIC `OpenTunnel` + `SendSSHPublicKey`(`ec2-user`) → `scp` 묶음(`SHA256SUMS`) → `sudo install-release.sh` → **서버에서 돌 코드**. 이 역할은 사실상 '서버 root + 비용·남용 막기를 지운 코드도 올릴 수 있는 권한'이다 → main 커밋만 · `environment: production` 승인 · 엔드포인트 하나·인스턴스 하나·OS 사용자 하나로 좁힌다.

**실제 동작: Bedrock 호출 (유일한 과금 동작) — 바뀐 줄만**
| 항목 | 값 |
|---|---|
| 누가 허락하나 | 그대로(사람별 문 → 하루 셈 문). 더해서 **밖에서 오는 요청은 CloudFront를 거쳐야만** 문에 닿는다(⑪) |
| 바로 앞의 검증 | 그대로 |
| 입력·출력 최대 | 그대로(사진 1,000,000바이트 · 출력 120토큰). CloudFront 쪽 본문 상한은 두지 않는다. nginx 본문 상한은 서버가 한 연결에서 읽는 최대(`REJECT_DRAIN_BYTES` + 256KiB)보다 커야 한다 — 그래야 서버가 먼저 센다(contracts/deploy.md §6, 값은 사용자 확인 전) |
| 남는 증거 | journald의 로그 1줄(D8) · 배포는 GitHub Actions 실행 기록. EIC 사용이 CloudTrail에 남는지는 확인 못 함 |
| 중간에 끊기면 | 배포 중에 끊기면: 링크를 바꾸기 전이면 앞 판이 그대로다. 바꾼 뒤 재시작이 실패하면 스크립트가 앞 판으로 되돌린다. 셈 파일은 배포가 건드리지 않는다 |
| 되돌리는 길 | 급히 막는 길은 셋이다. ① `sudo systemctl stop how-much-api`(바로 — nginx가 JSON 503 `unavailable`을 냄(deploy.md §6), 퇴근이 아님) ② `DAILY_CALL_LIMIT = 0` 커밋 → 배포(퇴근 화면, 몇 분) ③ PR-C 되돌리기. 엔드포인트 요금 멈추기는 PR #2 되돌리기 머지(사용자)다 |

## 실패 시나리오 (premortem) — 각각 막는 곳
1. **v1 EC2가 교체돼 홈·셈 파일이 사라짐** — `user_data_replace_on_change = true`(I-5)이므로 `user_data` 한 글자나 AMI 값이 바뀌면 교체된다 → D7 `prevent_destroy`로 plan이 오류가 난다 · PR diff에 `user_data` 0줄 · plan `grep` 0줄
2. **인스턴스에 새 보안 그룹을 붙이다가 교체** — 인스턴스가 `security_groups`(이름) 인자를 쓰면 바꿀 때 교체될 수 있다(어느 인자인지 확인 못 함) → 있는 그룹 `portfolio-web`에 규칙만 더한다 · `prevent_destroy`가 마지막 그물
3. **원본 요청 정책에 `CloudFront-Viewer-Address`를 빠뜨림** → 모두가 `-` 한 사람이 된다(막는 쪽이라 돈은 안 샘). 로그 `who:"none"`으로 드러난다
4. **CloudFront가 브라우저가 보낸 같은 이름 헤더를 넘김**(I-10) → 사람별 제한을 피한다(돈은 하루 상한이 막음). AC-3 확인 3에서 `bad`가 나오면 **멈추고** CloudFront Function 안을 묻는다
5. ~~(D1 '가') `HOST`를 빠뜨려 루프백에만 묶임~~ → 해당 없음 — D1 '나'(루프백이 맞는 값이다)
6. **배포 스크립트가 홈을 지우거나 덮음** → `/opt/how-much/`·`/var/tmp/how-much-deploy/` 밖에 쓰는 줄이 없게 한다. 검사 `grep`
7. **배포 둘이 겹침** → `concurrency: deploy` · `flock /run/how-much-deploy.lock`
8. **재시작 되풀이** → 5초 안에 `listening`이 없으면 앞 판으로 되돌린다
9. **원본 응답 시간 제한이 25초보다 짧음** — 어디에 두는지 확인 못 함(I-13) → 재시도가 긴 요청이 504를 받는다(돈은 맞음). PR-C에서 30초로 적고 plan에서 확인한다
10. **Node 판이 22 아래이거나 `nodejs22` 꾸러미가 없음**(I-4) → `setup-host.sh`가 `node --version`을 보고 멈춘다. 꾸러미가 없으면 nodejs.org `linux-arm64` tar를 `SHASUMS256.txt`로 확인해 묶음과 함께 보낸다(+0.5일). **CPU가 arm64다** — x86 tar를 보내면 시작 실패로 크게 드러난다
11. **디스크가 참** → 판 3개씩만 남김 · journald `SystemMaxUse` · `/var/tmp/how-much-deploy/<sha>`를 풀고 나서 지움
12. **배포 역할이 넓어 다른 인스턴스에도 키를 밀어 넣음** → D5 좁힘. 역할이 `bootstrap`(CI 밖)이라 reviewer가 보지 못할 수 있다 → D12 출력과 정책 글을 그 PR 설명에 붙인다
13. **로그를 PR에 붙이다 비밀값·주소가 샘** → 로그 줄에 원래 없음 + 붙이기 전 `grep`
14. **엔드포인트가 PR #2 머지부터 놀며 요금을 냄** → D9
15. **확인 중 Bedrock 호출이 10번을 넘음** → '확인 중 과금'. 넘을 것 같으면 멈추고 묻는다
16. **AC-5에서 기억이 비어 Bedrock이 불림** → AC-5를 AC-6(재배포 = 기억 비움) **앞에** 한다
17. **(새로) 서버에 들어갈 길이 없음** — sshd·`ec2-instance-connect` 꾸러미나 SSM 에이전트가 그 AMI에 없음(I-4 확인 못 함) → 서버 준비를 할 수 없다. I0′ 단계 2(AMI 이름 — 표준/최소)로 먼저 보고, 없으면 **멈추고 묻는다**(`user_data` 고치기는 교체 → AC-2)
18. ~~(새로) 두 번째 VPC origin을 만들 수 없는데 PR-B를 머지~~ → 해당 없음 — D1 '나'(두 번째 VPC origin 없음)
19. **(새로, D6 '라') CloudFront 캐시가 옛 화면(nginx 기본 페이지·앞 판 `index.html`)을 냄** → 배포마다 무효화 `/*`. 무효화가 실패하면 배포를 실패로 표시한다(서버는 새 판이고, 다시 누르면 무효화만 다시 됨)
20. **(새로, D6 '라') 첫 배포부터 PR-C까지 화면만 보이고 감정은 안 됨** → 같은 날 잇는다(D9). 그 사이 '감정 받기'는 CloudFront가 POST를 거절해 화면 `unavailable`이 된다 — 돈은 0
21. **(새로) 꾸러미 업데이트가 화면을 덮음** → 화면을 `/usr/share/nginx/html`이 아니라 `/opt/how-much/app/current`에 둔다
22. **(새로) GitHub 러너에서 EIC 터널이 안 열림**(권한 조건 틀림) → 묶음이 안 가므로 앞 판이 그대로다(안전 쪽). 잡이 실패로 드러난다
23. **(14:10 새로 · D1 '나') nginx 넘김 설정이 계약을 깨는데, 그것을 서버 위에서만 안다** — `api/` 테스트·CI는 nginx를 거치지 않으므로 아래를 못 잡는다.
    - nginx가 413·502·504를 자기 HTML로 낸다 → appraise-http.md §5 '본문은 언제나 `{"code":…}`'가 깨진다(어댑터는 `unavailable`로 보므로 돈은 안 샘).
    - 요청 본문 버퍼링이 CAREER-25·31 '거절 뒤 남은 업로드' 동작을 바꾼다 — 브라우저가 400 대신 네트워크 오류를 보거나, 서버의 끊기가 클라이언트에 닿지 않는다.
    - `CloudFront-Viewer-Address`를 지운다 → 모두 `-` 한 사람(실패 시나리오 3과 같음).
    - nginx 접근 로그에 보는 사람 주소가 남는다(appraise-http.md §5 '접속 주소는 로그 어디에도').
    - 막는 곳: contracts/deploy.md §6 약속 · S1 검사 `grep` · **tasks D1 단계 5에서 서버 위 확인(Bedrock 0)** — 거절 뒤 남은 업로드(길이 있음·chunked) · api 꺼짐 → JSON 503 · nginx 상한 넘음 → JSON 400 · 헤더 넘김 · 로그 · 밖에서 한 번 더(V1 단계 2). 하나라도 다르면 I3(공개)으로 가지 않는다. 계약 글을 바꿔야 맞출 수 있으면 architect가 글을 내고 사용자가 승인한다
24. **(14:10 새로 · D1 '나') how-much server 블록이 v1 `nginx.conf`의 기본 server 블록과 겹침** — 예를 들어 둘 다 `default_server`면 `nginx -t`가 실패하거나 기본 페이지가 나간다. v1 `nginx.conf` 내용은 확인 못 함 → tasks D1 단계 1 `nginx -t` · 단계 6 화면 확인
25. **(14:10 새로 · D1 '나') `/api/*`의 원본 응답 시간 제한이 v1 원본과 하나로 묶임** — 누가 v1 쪽에서 `portfolio-web` 원본 시간 값을 25초 아래로 줄이면, 재시도가 긴 요청이 CloudFront 504를 받는다(돈은 맞음) → contracts/deploy.md §3에 그 값에 기대고 있다고 적는다 · PR-C에서 원본을 건드리지 않는다
- 일부러 건너뛴 것: 서버 여러 대 · 무중단 배포 · EBS 스냅샷 · CloudFront WAF(U3 버림) · 원본 비밀 헤더(공인 주소가 없어 필요 없음) · **SSH 호스트 키 고정**(터널이 AWS 인증으로 그 인스턴스 하나에만 열림 — 받아들임).

## 확인 중 과금 (U6 — 10건 이하)
| 단계 | Bedrock 시도 (보통 / 재시도를 다 쓰면) |
|---|---|
| 배포 뒤 서버 안 확인 · nginx 넘김 확인(tasks D1 단계 5) · AC-3 꾸민 헤더 · 밖에서 거절 뒤 남은 업로드(V1 단계 2) | 0 / 0 (`invalid_input` · api 꺼짐은 서버에 안 닿음) |
| AC-4 | 1 / 3 |
| AC-5 (같은 사진·태그 — 기억) | 0 / 0 |
| AC-6 (첫 감정 = AC-4 감정 · 재배포 · 다른 사진 1번) | 1 / 3 |
| AC-7 (a) (퇴근 0 · 되돌린 뒤 새 사진 1번) | 1 / 3 |
| 합 | **3 / 9** |

## contracts 고칠 곳 (U1 승인 뒤 architect가 넣음 — 14:10 D1 '나' 글로 넣음)
- ~~D1 '가'일 때~~ — 14:05에 §1 `HOST` 글 · §9 `HOST` 줄을 넣었다가, 14:10 사용자 결정으로 아래 '나' 글로 바꿨다(§9 `HOST` 줄은 지움)
- **D1 '나' (넣음)**: §1 '로컬 주소' 줄은 `127.0.0.1` 고정 그대로 두고 "배포에서는 같은 컴퓨터의 nginx가 `/api/`를 이 주소로 넘김(contracts/deploy.md §3·§6)"만 더한다. §9는 원래대로(`PORT`·`AWS_PROFILE`) 둔다.
- **둘 다**
  - §10 맨 위에 "(CAREER-30에서 맞춤 — contracts/deploy.md §3·§4)"를 표시한다. 줄은 지우지 않는다.
  - 맨 위 상태 줄에 'CAREER-30 고침 (사용자 승인 — 날짜)'을 적는다.

## 크기 · 11/8까지
| 묶음 | 어림 (일) | 누가 |
|---|---|---|
| I0 사실(끝남) · I0′ 남은 확인(I-4·I-11·I-12·I-13) · plan 고침 · U1 승인 | 0.5 | 앞 세션 + 사용자 · architect |
| G1·G2 `HOST` | 0 — 해당 없음(D1 '나') | — |
| S1 스크립트·단위·nginx 설정(화면 + `/api/` 넘김) · S2 워크플로(EIC `scp`) | 1.5~2 | infra-dev (함께) |
| PR #2 다시 plan·머지 · PR-B · `bootstrap` 배포 역할(사용자 로컬) · PR-C | 2~2.5 | 앞 세션 + 사용자 |
| 서버 준비 · 첫 배포 · nginx 넘김 확인(D1 단계 5) · V1 확인(AC-3~7) | 1~1.5 | 사용자 (+ 앞 세션이 로그 읽기) |
| R1 런북·점검표 · P2 | 0.5~1 | release-ops |
| **합** | **5.5~7.5 작업일** (D1 '나' — G 빠지고 nginx 확인이 더해짐) | |
- **11/8에 든다. 여유는 2~3일.** 오늘(10/28)부터 11/8까지 달력으로 12일이다. 그래도 **남은 사용자 결정(D13 · nginx 본문 상한 값)이 10/30까지 와야 한다.**
- 2판 전보다 S3 버킷 둘·OAC·기본 동작 변경·S3 엔드포인트 정책이 빠졌다. 대신 nginx 설정 하나와 `bootstrap` 로컬 apply가 더해졌다.
- **가장 큰 흔들림**
  - ① I-4 남은 것: 들어갈 길이 없으면 멈춘다. SSM 엔드포인트로 가면 +0.5일과 월 요금이 든다.
  - ② (D1 '나') nginx 넘김이 계약을 지키는지 서버 위에서만 안다(실패 시나리오 23). D1 단계 5에서 어긋나면 설정을 고쳐 다시 본다(+0.5일). 계약 글을 바꿔야 하면 사용자 승인을 기다리므로 그만큼 공개가 늦어진다.
  - ③ `nodejs22` 꾸러미가 없음: tar를 묶음에 넣는다, +0.5일.
- **안 되면 뺄 후보 (AC는 그대로 지킴)**
  - ① D4 '나'(사용자 로컬 스크립트 + EIC): 워크플로·배포 역할·`bootstrap` 변경이 빠져 약 1~1.5일 줄고 D12도 사라진다. 대신 신뢰 경계 ⑫가 사용자 관리자 자격 증명이 된다.
  - ② D8 journald 영구 저장 설정.
  - **AC를 빼는 것은 spec 바꾸기라 사용자 몫이다.**

## 고른 이유와 버린 대안 (나머지 — 배포 구조는 ADR-0007)
| 결정 | 고른 것 | 버린 것 · 왜 아님 |
|---|---|---|
| 코드 자리 | 판 폴더 + `current` 링크 (`/opt/how-much/api/` · `/opt/how-much/app/`, 같은 sha) | 한 폴더에 덮어쓰기: 반쯤 쓴 판으로 뜰 수 있고 되돌리기가 '다시 배포'뿐 / 컨테이너: 홈을 볼륨으로 따로 매야 하고 Docker·이미지 저장소가 더 듦(나가는 길도 없음) |
| 서버 쪽 설치 | 묶음에 `node_modules`까지(CI ubuntu에서 `npm ci --omit=dev`) | EC2에서 `npm ci`: 나가는 길이 없음(I-3). `api/` 의존성 `@aws-sdk/client-bedrock-runtime`은 순수 JS라 x86 러너에서 묶어도 arm64에서 돈다 — 네이티브 모듈이 생기면 이 줄을 다시 본다 |
| 묶음 보내기 | EIC 터널 `scp` → `/var/tmp/how-much-deploy/<sha>/` | S3 버킷: 엔드포인트 정책·인스턴스 역할 IAM·버킷이 더 듦(I-3·I-4) |
| 처음 설정 | EIC로 `setup-host.sh` 한 번 | `user_data`: `user_data_replace_on_change = true`(I-5) → 교체 = AC-2 위반 / AMI 굽기: 교체가 곧 배포 |
| 화면 내주기 | 같은 EC2 nginx, 기본 동작 그대로 · 무효화 `/*` | S3+OAC: 리소스가 넷 더 들고 이득이 작음(D6) |
| 화면 올리기 | 같은 `deploy` 실행·같은 sha | 따로: 화면과 서버 판이 어긋날 수 있음 |
| 서버 안 확인 | 거절 요청(Bedrock 0) + `curl http://127.0.0.1/` 200 | 진짜 사진: 배포마다 돈이 들고 하루 셈을 씀 |
| SSH 사용자 | `ec2-user`(AL2023 기본 — sudo는 I-4에서 확인 못 함)로 들어가 `sudo` | 배포 전용 OS 사용자: `user_data` 없이 만들려면 `setup-host.sh`가 sudoers를 고쳐야 하고, 결국 같은 root 권한이라 좁혀지지 않음 |

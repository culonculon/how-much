[CAREER-30](https://culonculon98.atlassian.net/browse/CAREER-30) · spec: [spec.md](spec.md) · plan: [plan.md](plan.md) · 인프라 사실: [i0-facts.md](i0-facts.md) · 약속: [contracts/deploy.md](../../contracts/deploy.md) · [contracts/appraise-http.md](../../contracts/appraise-http.md) §1·§9·§10 · 결정: [ADR-0007](../../docs/adr/0007-api-deploy-cloudfront-vpc-origin-systemd.md) (확정 2026-10-28)

상태: **승인됨 (2026-10-28 — 사용자 승인 D1~D12, D1은 I-12 조건부)** (초안 2판 — 2026-10-28 architect, I0 사실 반영). I0′과 U1 승인이 끝나기 전에는 아무것도 만들지 않는다(CLAUDE.md §4 — contracts 확정 전).

## 공통 규칙
- **저장소는 둘이다.**
  - **how-much** 브랜치 `CAREER-30-deploy`: PR-1(코드·스크립트·워크플로 — 배포 전에 머지) · PR-2(런북·증거 — 확인 뒤).
  - **`aws-infra-portfolio`**: PR #2(있음) · PR-B · PR-C는 `infra/`이고 **머지 = apply = 요금**이다. 배포 역할은 `bootstrap/`이고 **CI 밖이라 사용자가 로컬에서 apply**한다. 머지와 apply는 사용자만 한다.
- **차례**: **I0(끝남) → I0′ → U1 → (G1\* ∥ S1 ∥ F1\*) → G2\* → S2 → P1(PR-1 머지)**. 인프라는 **I1(PR #2) → I2(PR-B) ∥ I2′(bootstrap)**로 간다. P1·I2·I2′ 셋 다 끝나면 **D1 서버 준비·첫 배포 → 같은 날 I3(PR-C = 공개) → V1 밖 확인 → R1 → P2**.
  - \* G1·G2는 plan D1 '가'일 때만, F1은 D6 '나'일 때만 한다. 해당 없으면 '해당 없음'으로 적는다.
  - [P] = 파일이 겹치지 않고 서로 기대지 않음: G1(`api/tests/`) · S1(`infra/deploy/`) · F1(`app/vite.config.js`). I2·I2′은 다른 폴더라 함께 갈 수 있지만 **둘 다 I1 머지 뒤**다.
- **담당 표기**: **앞 세션** = 사용자와 함께 쓰는 세션(`api/`는 `human_only`) · **함께(앞 세션 + 사용자)** = 인프라 · release-ops = 런북.
- **어느 세션도 해서는 안 되는 것**: 어느 저장소에서도 `terraform apply` · `destroy`를 돌리지 않는다. `terraform plan`은 `infra/`는 CI에서만, `bootstrap/`은 사용자 로컬에서만 돈다. 세션은 로컬 AWS 자격 증명을 쓰지 않는다 — `aws …` 명령과 EIC 접속은 모두 **사용자가** 하고 출력을 붙인다.
- **명령과 보고**: 모든 명령은 저장소 루트에서 돌린다. `cd`가 들어간 명령은 `bash -c '…'`로. 세션 보고에는 출력 그대로, PR '검사 결과' 칸에는 CI 링크만 넣는다(CI가 없는 검사는 plan D12대로 출력 그대로).
- **과금**: 진짜 Bedrock은 V1에서만 부르고, 합 10번 이하로 한다(보통 3, 최대 9).

---

## I0 — 인프라 사실 채우기 (읽기만) · 순서 1 · **끝남 (2026-10-28 13:50, 앞 세션)**
- 담당: 함께(앞 세션 + 사용자) · architect가 plan을 고침(2판)
- 파일: `specs/CAREER-30-deploy/i0-facts.md` · `plan.md` '인프라 사실' 표
- 결과: I-1~I-9 '확인함' · I-4 일부와 I-10 '확인 못 함' · I-6 교체 아님(멈춤 없음). 갈린 곳 1~5를 plan D 표·contracts/deploy.md·ADR-0007·이 파일에 반영했다
- 검사 명령: `grep -n '^| I-' specs/CAREER-30-deploy/plan.md | grep -c '확인함'; grep -n '^| I-' specs/CAREER-30-deploy/plan.md | grep '확인 못 함' | cut -c1-40`
- 끝난 상태: 첫 줄 9 이상(I-1~I-9) · 둘째 출력이 I-4 · I-7(일부만 모름) · I-10 · I-11 · I-12 · I-13뿐

## I0′ — 남은 인프라 사실 (읽기만 · 요금 0) · 순서 2 (U1 전)
- 담당: **사용자**(명령) + 앞 세션(문서 확인 · 결과 적기) · architect가 결과로 plan을 고침
- 파일: `specs/CAREER-30-deploy/i0-facts.md`(앞 세션이 더함) · `plan.md` I-4·I-11·I-12·I-13 칸(architect)
- AC: D1·D3 고르기의 재료 · AC-3
- 단계
  1. I-11 — 사용자: `curl -sI https://<v1 CloudFront 주소>/ | grep -iE '^(HTTP|server|x-cache)'` → `200` · `server: nginx`면 접두사 목록 규칙으로 VPC origin이 닿는다
  2. I-4 — 사용자: `aws ec2 describe-images --image-ids ami-0d8d71a28c118c486 --query 'Images[].[Name,Description]' --output text` → 이름으로 표준/최소 AMI를 가른다. 앞 세션이 그 AMI 종류에 sshd·`ec2-instance-connect`·SSM 에이전트·`ec2-user` sudo가 있는지 AWS 문서에서 찾아 링크와 함께 적는다. `nodejs22` 꾸러미가 AL2023 저장소에 있는지와 실행 파일 이름도 문서에서 찾는다(서버 안 확인은 D1 단계 1)
  3. I-12 — 앞 세션: 같은 EC2 ARN에 VPC origin을 둘(포트 다르게) 만들 수 있는지 AWS 문서·할당량에서 찾아 링크와 함께 적는다
  4. I-13 — 앞 세션: `aws-infra-portfolio` `infra/cdn.tf`에서 `origin_read_timeout`·`vpc_origin_config` 줄을 읽기만 하고(`grep -n 'origin_read_timeout\|vpc_origin_config\|keepalive' infra/cdn.tf`), VPC origin 원본의 응답 시간 제한을 어디에 두는지 문서에서 찾는다
  5. 앞 세션: 그 저장소 PR CI(`plan.yml`)가 fmt·validate·trivy를 돌리는지 `grep -nE 'fmt|validate|trivy' .github/workflows/plan.yml`로 본다(I-7 남은 것 · D12)
  6. architect: 결과로 plan I 칸을 '확인함: …'으로 고치고, 갈리면(I-11 실패 · I-12 안 됨 · I-4 둘 다 없음) D 표 추천을 고친다. **I-4가 'EIC도 SSM도 안 됨'이면 멈추고 사용자에게 알린다**(plan A6)
- 검사 명령: `grep -n '^| I-1[123] \|^| I-4 ' specs/CAREER-30-deploy/plan.md | cut -c1-200`
- 끝난 상태: I-11·I-12·I-13 칸이 '확인함:'(근거 링크·출력)이거나, 끝내 모르면 '확인 못 함' + 그때 쓸 대안이 적혀 있다

## U1 — plan · contracts · ADR 승인 · 순서 3 · **끝남 (2026-10-28 14:05)**
- 담당: **사용자** (architect가 고쳐 둠)
- 파일: `specs/CAREER-30-deploy/plan.md` · `tasks.md` · `contracts/deploy.md` · `docs/adr/0007-api-deploy-cloudfront-vpc-origin-systemd.md` · (승인 뒤) `contracts/appraise-http.md` §1·§9·§10·맨 위 상태
- AC: 만들기 시작 조건
- 단계
  1. 사용자가 plan D1~D12를 고른다. 추천과 다르면 architect에게 알려 plan·contracts·ADR·이 tasks를 고치게 한다
  2. architect가 contracts를 맞춘다.
     - plan 'contracts 고칠 곳'(고른 D1에 맞는 쪽)을 appraise-http.md에 넣는다.
     - contracts/deploy.md의 `{D1 가 | 나}`를 한쪽만 남긴다.
     - `<…>`는 I2·I2′ 머지 뒤 id로 채운다(인프라 id는 비밀이 아님).
  3. 상태 줄을 바꾼다: plan·tasks → `승인됨 (날짜 — …)` · deploy.md → `승인됨 (날짜 — …)` · ADR-0007 → `확정 (날짜 — 사용자 승인)`
  4. 커밋: `CAREER-30: deploy plan, contracts and ADR`
- 검사 명령: `grep -m1 -H '상태' specs/CAREER-30-deploy/plan.md specs/CAREER-30-deploy/tasks.md contracts/deploy.md docs/adr/0007-*.md; grep -c '{D1' contracts/deploy.md; grep -c 'CAREER-30 고침' contracts/appraise-http.md`
- 끝난 상태: 네 줄이 승인됨·승인됨·확정·확정 · deploy.md의 `{D1` 0개 · appraise-http.md 1 이상. (`<…>` id는 I2·I2′ 뒤 — D1 단계 0에서 채움)

## G1 — `HOST` 테스트 (빨강) · 순서 4 · [P] · **D1 '가'일 때만**
- 담당: **앞 세션** (`api/`는 `human_only`)
- 파일: `api/tests/startup.test.js` (더함만)
- AC: AC-3·AC-4의 앞 조건(plan D2)
- 원본: plan D2 · contracts/appraise-http.md §1·§9(U1에서 고친 글)
- 내용 (테스트 이름 `CAREER-30 HOST`. 이미 있는 `run(env)` 돕는 함수 · 공통 `env` · 가짜 키를 그대로 쓰고, 각각 `{ timeout: 15_000 }`)
  - (a) `HOST` 없음 → `listening` 줄 `address === '127.0.0.1'`
  - (b) `HOST: '0.0.0.0'` → `address === '0.0.0.0'`
  - (c) `HOST: 'example.com'` · `HOST: ''` 각각 → `listening` 없음 · `startup_failed` 줄 정확히 1개 `{ evt: 'startup_failed', reason: 'bad_host', error: 'InvalidHost' }` · 종료 코드 0 아님(신호 아님)
  - (d) (c)에서 가짜 키를 **빼도** 같은 `bad_host` — 주소 검사가 자격 증명 점검보다 먼저
- 단계: 1. 더한다 2. 검사 명령 → 실패가 (b)(c)(d)뿐 3. 커밋 `CAREER-30: listen host tests`
- 검사 명령: `{ npm --prefix api test; echo "exit=$?"; }; git status --porcelain api`
- 끝난 상태: `exit` 0 아님 · 실패가 위 셋뿐 · `git status` 빈 줄

## G2 — `HOST` 구현 (초록) · 순서 5 (G1 뒤) · **D1 '가'일 때만**
- 담당: **앞 세션**
- 파일: `api/src/config.js` · `api/src/server.js`
- 단계
  1. `config.js`: `HOST` → `DEFAULT_HOST = '127.0.0.1'`, 주석 `// 로컬은 늘 이 값. 배포는 systemd 단위가 HOST를 준다(contracts/deploy.md §1 · CAREER-30 D2)`
  2. `server.js`
     - `import { isIP } from 'node:net'`를 더한다.
     - `startServer({ host = process.env.HOST ?? DEFAULT_HOST, … })`로 받는다.
     - 맨 앞에 `if (isIP(host) === 0) throw new StartupError('bad_host', 'InvalidHost');`를 둔다.
     - `listen(port, host, …)`로 바꾼다.
     - 맨 위 주석 '127.0.0.1에만 묶는다'를 '`HOST`(없으면 127.0.0.1)'로 바꾼다.
  3. 검사 명령. 실패하면 테스트를 고치지 않고 `api/src`를 고친다
  4. 커밋: `CAREER-30: listen host from environment`
- 검사 명령: `bash -c "$(jq -r '.checks.app.api' pipeline.config.json)"; echo "exit=$?"; grep -rn "process.env" api/src; git status --porcelain --untracked-files=all api`
- 끝난 상태: `exit=0` · `process.env` 줄이 `server.js`의 `PORT`·`HOST` 둘뿐 · 커밋 뒤 `git status` 빈 줄

## S1 — 서버 준비·배포 스크립트·nginx 설정 · 순서 4 · [P]
- 담당: **함께(앞 세션 + 사용자)** — 구역 `infra`(infra-dev)
- 파일: `infra/deploy/setup-host.sh` · `infra/deploy/install-release.sh` · `infra/deploy/how-much-api.service` · `infra/deploy/how-much-nginx.conf` (새로)
- AC: AC-2(홈·`user_data` 안 건드림) · AC-4(화면) · AC-6(같은 방법으로 다시 배포) · AC-8 재료
- 원본: plan '접근 방법' 2·3 · '고른 이유' · contracts/deploy.md §1·§2·§4
- 단계
  1. `how-much-api.service`: contracts/deploy.md §1 값 그대로(D1에 따라 `Environment=HOST=0.0.0.0` 있음/없음). `DynamicUser`·`ProtectHome`·`ProtectSystem=strict`는 넣지 않는다
  2. `how-much-nginx.conf`: 80 · `root /opt/how-much/app/current` · `index index.html`. D1 '나'면 `location /api/ { proxy_pass http://127.0.0.1:8787; }`와 본문 상한 ≥ 1,000,000바이트를 더하고, 헤더는 지우지 않는다. v1 기본 server 블록과 겹치는지는 서버에서 `nginx -t`로 본다(D1 단계 1)
  3. `setup-host.sh`(한 번 실행, 다시 돌려도 같은 결과): 줄마다 하는 일은 이렇다.
     - `set -euo pipefail`
     - `id howmuch || useradd --system --create-home --home-dir /home/howmuch --shell /sbin/nologin howmuch`
     - `install -d -o root -g root -m 0755 /opt/how-much/api/releases /opt/how-much/app/releases /opt/how-much/bin`
     - `install-release.sh`를 `/opt/how-much/bin/`에 둔다(주인 root, 0755). 스크립트를 바꾸면 이 파일을 다시 돌린다.
     - 단위 파일과 nginx 설정을 복사한 뒤 `nginx -t`로 확인한다.
     - journald 설정(plan D8)을 넣는다.
     - Node 22를 확인한다: `node --version`(또는 I0′에서 정한 실행 파일)이 `v22.`로 시작하지 않으면 `exit 1`. `uname -m`이 `aarch64`가 아니어도 `exit 1`.
     - 끝으로 `systemctl daemon-reload && systemctl enable how-much-api && systemctl reload nginx`.
     - **홈 아래를 만들거나 지우는 줄은 없다. `user_data`도 건드리지 않는다.**
  4. `install-release.sh <sha> | --rollback`: 하는 일은 차례대로 이렇다.
     - `flock /run/how-much-deploy.lock`으로 겹침을 막는다.
     - `/var/tmp/how-much-deploy/<sha>/`에서 `sha256sum -c SHA256SUMS`로 묶음을 확인한다.
     - `api-<sha>.tar.gz`는 `/opt/how-much/api/releases/<sha>`에, `app-<sha>.tar.gz`는 `/opt/how-much/app/releases/<sha>`에 푼다(주인 root).
     - 링크 둘을 각각 `ln -sfn` 임시 링크 → `mv -T`로 바꾼다.
     - `systemctl restart how-much-api`
     - 확인 셋: 5초 안에 `journalctl -u how-much-api -o cat --since <재시작 시각>`에 `"evt":"listening"` 줄이 있다(D1 '가'면 `"address":"0.0.0.0"`) · contracts/deploy.md §4 `curl` 둘이 `400`·`200`이다.
     - 하나라도 아니면 링크 둘을 앞 판으로 되돌리고 재시작한 뒤 `exit 1`.
     - 끝으로 최근 3판 밖을 지우고(`/opt/how-much/*/releases/` 안만) `/var/tmp/how-much-deploy/<sha>`를 지운다.
  5. 검사 명령
  6. 커밋: `CAREER-30: host setup, release scripts and nginx site`
- 검사 명령:
  ```
  bash -n infra/deploy/setup-host.sh && bash -n infra/deploy/install-release.sh && echo "syntax ok"; grep -nE 'DynamicUser|ProtectHome|ProtectSystem=strict' infra/deploy/how-much-api.service; grep -nE 'rm .*(/home|~|\$HOME)|/home/howmuch/\.local|user_data|/usr/share/nginx' infra/deploy/*; grep -nE 'rm -rf? ' infra/deploy/*.sh; for n in fmt validate scan; do bash -c "$(jq -r ".checks.infra.$n" pipeline.config.json)"; echo "$n exit=$?"; done; git status --porcelain infra
  ```
- 끝난 상태
  - `syntax ok`가 나온다.
  - 첫 두 `grep`이 0줄이다.
  - 셋째 `grep`(`rm`)의 줄이 모두 `/opt/how-much/` 또는 `/var/tmp/how-much-deploy/` 안이다.
  - fmt·validate·scan이 `exit=0`이다.
  - 커밋 뒤 `git status`가 빈 줄이다.
  - (EC2에서 실제로 도는지는 D1에서 본다 — 이 세션은 arm64 AL2023에서 돌려 보지 못함)

## F1 — 화면 경로 · 순서 4 · [P] · **D6 '나'일 때만**
- 담당: frontend-dev
- 파일: `app/vite.config.js`
- 단계: 1. `base: '/how-much/'` 한 줄 2. 검사 명령 3. 커밋 `CAREER-30: app base path`
- 검사 명령: `for n in lint test build e2e; do echo "== $n"; bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)" || exit 1; done; grep -c '/how-much/assets/' app/dist/index.html; git status --porcelain app e2e`
- 끝난 상태: 종료 코드 0 · `grep` 1 이상 · `git status`에 `dist` 없음. D6 '라'(추천)면 이 작업은 '해당 없음'으로 적는다

## S2 — 배포 워크플로 · 순서 6 (S1 뒤 · plan D4 '가'일 때)
- 담당: **함께(앞 세션 + 사용자)** — 구역 `ci`(infra-dev)
- 파일: `.github/workflows/deploy.yml` (새로)
- AC: AC-1(main만) · AC-6(같은 방법)
- 원본: plan D4·D5 · contracts/deploy.md §2
- 단계
  1. 머리 설정
     - `on: workflow_dispatch`이고, 첫 단계에서 `github.ref == 'refs/heads/main'`이 아니면 실패한다.
     - `environment: production` · `concurrency: { group: deploy, cancel-in-progress: false }` · `permissions: { id-token: write, contents: read }`
  2. 잡 단계, 차례대로
     1. checkout → `npm --prefix app ci && npm --prefix app run build` → `npm --prefix api ci --omit=dev`
     2. `api-<sha>.tar.gz` · `app-<sha>.tar.gz` · `SHA256SUMS`를 만든다.
     3. OIDC(`vars.AWS_DEPLOY_ROLE_ARN`)로 역할을 받는다.
     4. EIC(`vars.EIC_ENDPOINT_ID` · `vars.DEPLOY_INSTANCE_ID`, `ec2-user`)로 `scp`해 `/var/tmp/how-much-deploy/<sha>/`에 둔다.
     5. `ssh … sudo /opt/how-much/bin/install-release.sh <sha>`
     6. `aws cloudfront create-invalidation --distribution-id ${{ vars.CF_DISTRIBUTION_ID }} --paths '/*'`
     7. 스크립트 출력(로그 줄)을 `$GITHUB_STEP_SUMMARY`로 옮긴다.
  3. 검사 명령 · 커밋: `CAREER-30: manual deploy workflow`
- 검사 명령: `grep -nE 'workflow_dispatch|environment: production|concurrency|refs/heads/main|id-token: write|ec2-instance-connect|create-invalidation' .github/workflows/deploy.yml; grep -nE 'aws-access-key-id|aws-secret-access-key|secrets\.AWS|s3 (cp|sync)' .github/workflows/deploy.yml; git diff --stat origin/main -- .github/workflows/ci.yml .github/workflows/reusable-checks.yml; git status --porcelain .github`
- 끝난 상태: 첫 `grep`이 7종 모두 나옴 · 둘째 `grep` 0줄 · `ci.yml`·`reusable-*` diff 빈 줄 · 커밋 뒤 `git status` 빈 줄. (실제로 도는지는 D1 — main에 들어가야 수동 실행 버튼이 생긴다)

## P1 — how-much PR-1 · 순서 7 (G2\*·S1·S2·F1\* 뒤)
- 담당: 앞 세션(검사·PR 열기) · reviewer · **사용자(머지)**
- 파일: 없음 (PR 본문 — `.github/pull_request_template.md`)
- 단계
  1. `for n in lint test e2e build api; do echo "== $n"; bash -c "$(jq -r ".checks.app.$n" pipeline.config.json)"; echo "exit=$?"; done` · `for n in fmt validate scan; do bash -c "$(jq -r ".checks.infra.$n" pipeline.config.json)"; echo "exit=$?"; done` — 출력 그대로 보고
  2. 제목: `CAREER-30: release scripts, nginx site and deploy workflow` (D1 '가'면 앞에 `listen host, `)
  3. 칸
     - 결정: ADR-0007 · plan D1~D12에서 고른 것
     - 범위 변경: "화면을 밖 주소에 올리는 일(spec이 적지 않았으나 AC-4에 필요 — plan '먼저 알릴 것' 4) · v1 nginx 기본 페이지가 how-much 화면으로 바뀜"
     - 새 의존성: 없음(EC2에 Node 22)
     - 비용·남용 영향: plan D 표 '월 요금' · 신뢰 경계 ⑩⑪⑫ · 'PR-1 머지만으로는 아무것도 열리지 않음'
  4. spec AC ✔/✘ 대조 — 이 PR에서는 모두 '아직(배포 뒤 V1)'으로 적고 이유를 쓴다
- 검사 명령: `gh pr checks --watch; git diff --stat origin/main -- api/src contracts docs/adr infra .github app`
- 끝난 상태: 필수 검사 통과(`reviewer/gate` 포함) · `api/src` diff가 `config.js`·`server.js`뿐(D1 '나'면 0) · 사용자가 머지

## I1 — `aws-infra-portfolio` PR #2 정리와 머지 (요금 시작) · 순서 7 (U1 뒤 · plan D9: I2가 준비된 날)
- 담당: **함께(앞 세션 + 사용자)** · 머지 = **사용자**
- 파일: 그 저장소 PR #2 설명(코드는 바뀌면 안 됨 — 바꿔야 하면 멈추고 묻는다)
- AC: AC-1 · AC-2
- 단계
  1. **plan을 다시 돌린다** — 지금 CI(run 39705483346)는 10/24 전 실행이다(I-6). 사용자가 PR #2 CI를 다시 실행하거나 main을 받아 갱신한다
  2. 새 plan 출력에서 요약(`Plan: N to add, N to change, N to destroy`)과 바뀌는 리소스 줄을 옮긴다. '변경 1 = `aws_instance.web` 제자리 변경(iam_instance_profile) — 교체 아님'을 한 문단으로 PR 설명에 적는다. 숫자나 변경 대상이 I-6과 다르면 **멈추고 묻는다**
  3. fmt·validate·trivy: PR CI가 돌리지 않으면(I0′ 단계 5) 앞 세션이 그 저장소에서 돌려 출력을 붙인다(D12). 이번 PR이 바꾼 파일에서 HIGH·CRITICAL 0건이어야 한다
  4. draft 풀기 → **사용자가 읽고 머지**(= apply · 엔드포인트 요금 시작). 머지 시각을 적어 둔다
- 검사 명령 (그 저장소 루트, 읽기): `gh pr view 2 --json isDraft,state,mergedAt,body | jq '{isDraft,state,mergedAt,hasSummary:(.body|test("to add")),hasChange1:(.body|test("변경 1"))}'; gh pr checks 2`
- 끝난 상태: `hasSummary` · `hasChange1` true · 검사 통과 · 다시 돌린 plan에 `aws_instance` 교체·삭제 0줄 · `mergedAt`이 있음(사용자)

## I2 — `aws-infra-portfolio` PR-B: EIC · (D1 '가') VPC origin 8787 · 보안 그룹 규칙 · 교체 막기 · 순서 8 (I1 머지 뒤)
- 담당: **함께(앞 세션 + 사용자)** · IAM·요금은 plan D1·D3·D7에서 사용자가 고른 것만 · 머지 = **사용자**
- 파일: 그 저장소 `infra/` — `aws_instance.web`와 보안 그룹 `portfolio-web`이 있는 파일 · (D1 '가') `infra/cdn.tf`의 VPC origin 옆. how-much `infra/*.tf`는 건드리지 않는다(결정 D)
- AC: AC-2 · AC-3 · (밖에 아직 안 열림)
- 단계
  1. D3: `aws_ec2_instance_connect_endpoint`(v1 프라이빗 서브넷) + 그 보안 그룹(나가기 = `portfolio-web` 22만) · `portfolio-web`에 tcp 22 들어오기(출처 = EIC 보안 그룹)
  2. (D1 '가', I-12가 '됨'일 때) 같은 `aws_instance.web.arn`을 가리키는 `aws_cloudfront_vpc_origin` 하나 더(http 8787) · `portfolio-web`에 tcp 8787 들어오기(출처 = CloudFront 접두사 목록 — 80 규칙과 같은 방식). **CloudFront 동작은 이 PR에서 바꾸지 않는다**
  3. D7: `aws_instance.web`에 `lifecycle { prevent_destroy = true }`만. **`user_data`·AMI·인스턴스의 보안 그룹 목록은 바꾸지 않는다**
  4. CI plan · fmt·validate·trivy(D12). PR 설명에 plan 요약 + 아래 검사 결과
  5. **사용자가 머지** → 출력(EIC 엔드포인트 id·보안 그룹 id·VPC origin id)을 적는다
- 검사 명령 (그 저장소 CI plan 출력을 `plan.txt`로, diff는 그 저장소 루트에서): `grep -nE 'aws_instance\..*(must be replaced|will be destroyed)' plan.txt; grep -nE '"(0\.0\.0\.0/0|::/0)"' plan.txt; git diff origin/main -- infra | grep -nE '^[+-].*(user_data|ami *=|security_groups|vpc_security_group_ids)'`
- 끝난 상태: 첫 `grep` 0줄 · 둘째는 들어오는 규칙에 0줄(나가는 규칙은 따로 읽음) · 셋째 0줄 · fmt·validate 통과 · 새 trivy HIGH·CRITICAL 0 · 사용자가 머지

## I2′ — `aws-infra-portfolio` `bootstrap/` 배포 역할 · 순서 8 (I1 뒤 · I2와 함께) · **D4 '가'일 때만**
- 담당: **함께(앞 세션 + 사용자)** · IAM은 plan D5대로 · **plan·apply = 사용자 로컬**(CI 밖 — I-7)
- 파일: 그 저장소 `bootstrap/how-much.tf` (plan 역할 옆에 더함)
- AC: AC-1(main만 — 신뢰 조건) · AC-2(D12 증거)
- 단계
  1. 역할 `github-actions-how-much-deploy`(이름은 plan 역할에 맞춤): 신뢰 = 같은 OIDC 공급자 · `sub` = `repo:<owner>/how-much:environment:production` 하나
  2. 권한(인라인): `ec2-instance-connect:OpenTunnel` on 그 EIC 엔드포인트 ARN · `ec2-instance-connect:SendSSHPublicKey` on 그 인스턴스 ARN(OS 사용자 `ec2-user` 조건) · `cloudfront:CreateInvalidation` on 그 배포 ARN. 조건 키 이름은 AWS 문서에서 확인해 PR 설명에 링크한다(plan D5 '확인 못 함')
  3. 앞 세션: `bash -c 'cd bootstrap && terraform fmt -check && terraform init -backend=false -input=false && terraform validate && trivy config .'` — 출력 그대로 PR 설명에(D12)
  4. 사용자: 로컬 `terraform plan` 요약을 PR 설명에 → 머지 → 로컬 apply → 역할 ARN을 how-much 저장소 변수 `AWS_DEPLOY_ROLE_ARN`에 넣는다(`DEPLOY_INSTANCE_ID`·`EIC_ENDPOINT_ID`·`CF_DISTRIBUTION_ID`도)
- 검사 명령 (그 저장소 루트): `git diff origin/main -- bootstrap | grep -nE '"\*"|AdministratorAccess|FullAccess|s3:'; git diff origin/main -- bootstrap | grep -nE 'environment:production'`
- 끝난 상태: 첫 `grep` 0줄 · 둘째 1줄 이상 · 3의 출력이 통과 · 사용자 plan 요약에 `0 to destroy` · 사용자가 apply

## D1 — 서버 준비 · 첫 배포 · 서버 안 확인 (Bedrock 0) · 순서 9 (P1·I2·I2′ 뒤 · I3와 같은 날)
- 담당: **사용자**(실행) + 앞 세션(출력 읽기) + architect(contracts/deploy.md `<…>` 채우기)
- 파일: `contracts/deploy.md` `<…>`(architect) · 출력은 PR-2와 증거 점검표에
- AC: AC-2 · AC-6 재료 · (넘겨받은 것 2 · 자격 증명)
- 단계
  0. architect: I2·I2′ 출력의 id로 contracts/deploy.md `<…>`를 채운다
  1. 사용자가 EIC로 들어가 `rpm -q ec2-instance-connect nginx; uname -m; sudo -n true && echo sudo-ok`를 본다. `infra/deploy/`를 서버에 보내 `sudo bash setup-host.sh`를 돌리고 `id howmuch` · `systemctl is-enabled how-much-api` · `node --version` · `sudo nginx -t`를 확인한다. **들어갈 수 없으면 멈추고 묻는다**(plan 실패 시나리오 17)
  2. GitHub `deploy` 실행(main) → 사용자 승인 → 잡 요약에 다음 셋이 있어야 한다.
     - `listening` 줄 (D1 '가'면 `"address":"0.0.0.0"`)
     - `curl` `400`·`200`
     - 무효화 id
     - `startup_failed` 줄은 없어야 한다(인스턴스 역할로 자격 증명이 풀림).
  3. EIC로 `sudo journalctl -u how-much-api -o cat | tail -3` → 마지막 `appraise` 줄 `outcome invalid_input` · `reason bad_my_price` · `attempts 0`
  4. `systemctl show how-much-api -p User -p DynamicUser -p ProtectHome` → `User=howmuch` · `DynamicUser=no` · `ProtectHome=no`
  5. 밖에서 `curl -s https://<v1 주소>/ | grep -c '<div id="root"'` 1 — 화면이 보임(감정은 I3 전까지 안 됨 — plan 실패 시나리오 20)
- 검사 명령: 위 1~5 (사용자가 돌림 — 세션은 AWS 자격 증명을 쓰지 않음) · architect: `grep -c '<' contracts/deploy.md`
- 끝난 상태: 다섯 다 위 값 · Bedrock 0 · deploy.md의 `<` 0개. 하나라도 아니면 **I3(공개)으로 가지 않는다**

## I3 — `aws-infra-portfolio` PR-C: CloudFront `/api/*` = 공개 · 순서 10 (D1 뒤, 같은 날)
- 담당: **함께(앞 세션 + 사용자)** · 머지 = **사용자** (이 머지 시각이 공개 시각)
- 파일: 그 저장소 `infra/cdn.tf` (I-1에서 확인)
- AC: AC-1 · AC-2 · AC-3 · (넘겨받은 것 1)
- 단계
  1. contracts/deploy.md §3 그대로 바꾼다.
     - `ordered_cache_behavior` `/api/*`: 메서드 7 · `CachingDisabled` · 사용자 지정 원본 요청 정책(쿼리 전부 + `Content-Type` + `CloudFront-Viewer-Address`) · 원본 = D1대로 · 응답 시간 제한 30초(I-13 자리).
     - **기본 동작은 바꾸지 않는다.** 오류 응답 사용자 지정은 더하지 않는다.
  2. CI plan · fmt·validate·trivy(D12) · PR 설명에 plan 요약 · 'CAREER-31 머지 2026-10-28 13:21(`ef17df3`) 뒤'
  3. **사용자가 머지** → 머지 시각을 적는다
- 검사 명령 (CI plan 출력 `plan.txt`): `grep -nE 'aws_instance\..*(must be replaced|will be destroyed)' plan.txt; grep -niE 'cloudfront-viewer-address' plan.txt; grep -nE 'custom_error_response|error_code' plan.txt; git diff origin/main -- infra/cdn.tf | grep -nE '^[+-] *default_cache_behavior'`
- 끝난 상태: 첫째 0줄 · 둘째 1줄 이상 · 셋째 0줄 · 넷째 0줄 · 사용자가 머지

## V1 — 밖에서 확인 (사람 · Bedrock 보통 3, 최대 9) · 순서 11 (I3 뒤). 단계 사이 1분 넘게
- 담당: **사용자**(iPhone·명령) + 앞 세션(로그 읽기·PR 칸 채우기)
- 파일: 없음 (증거는 P2)
- AC: AC-3 ~ AC-7
- 단계
  1. **AC-3 보안 그룹·공인 IP**: plan 'A1 답' AC-3 확인 1·2 명령 → 출력 그대로
  2. **AC-3 꾸민 헤더**(Bedrock 0): 확인 3 `curl` → `400` · 로그 그 줄 `who` = `ip4`/`ip6`. `bad`면 **멈춘다**(plan 실패 시나리오 4)
  3. **AC-4**: iPhone Safari로 모바일 데이터에서 밖 주소를 연다.
     - 리전 안내 문구를 본다.
     - 카메라로 찍은 물건 사진 + 마음 가격(+ 태그 하나 — AC-5에서 그대로 씀)으로 '감정 받기'를 누른다.
     - 갸웃 → 도장 · 결과 카드 `모찌 N개`·내 값·대사를 본다.
     - 로그 `outcome ok` 1줄을 찾고 `dayUsed` 값을 적어 둔다.
     - 이어서 plan A2 '확인'의 `stat` 명령 → `howmuch 700` · `howmuch 600`
  4. **AC-5**(1분 넘게 뒤, Bedrock 0): 같은 사진·태그로 6번 → 1~5는 결과 카드(로그 `memo hit`) · 6번째는 "허허, 너무 자주 왔구먼. 좀 쉬었다 와." · 로그 `outcome person_limit` 1줄
  5. **AC-6**: 첫 감정은 단계 3이다(같은 서울 날짜).
     - GitHub `deploy`를 같은 main 커밋으로 한 번 더 돌린다(같은 방법).
     - 1분 넘게 뒤 다른 사진 1장으로 감정한다.
     - 로그 `dayUsed`가 단계 3 값보다 커야 한다.
  6. **AC-7 (a)**
     1. contracts/deploy.md §5로 `used` 값을 적어 둔 뒤 300으로 바꾼다.
     2. 새 사진으로 감정 → `🚶 퇴근` + 퇴근 문구 · 로그 `outcome daily_limit` `attempts 0`.
     3. `used`를 적어 둔 값으로 되돌린다.
     4. `grep -n 'DAILY_CALL_LIMIT =' /opt/how-much/api/current/src/config.js`가 `300`이다.
     5. 1분 넘게 뒤 새 사진 1장 → 결과 카드.
  7. 그날 마지막 `dayUsed` − 시작 전 값 = 이 확인의 Bedrock 시도 수다. 10을 넘을 것 같으면 단계 6 마지막 감정 전에 멈추고 묻는다
- 검사 명령 (사용자가 EIC로): `sudo journalctl -u how-much-api -o cat --since '<V1 시작 시각>' | grep '"evt":"appraise"' | tee v1.log; grep -cE '"who":"(none|bad)"' v1.log; grep -cE 'AKIA|aws_secret' v1.log`
- 끝난 상태: AC-3~7의 '그러면'이 모두 맞음 · `who none/bad` 0 · 비밀값 0 · Bedrock 시도 10 이하

## R1 — 런북 · 증거 점검표 · 순서 12 (V1 뒤)
- 담당: release-ops
- 파일: `docs/runbook/배포.md` (새로) · `docs/runbook/배포-증거-점검표.md`
- AC: AC-8
- 단계
  1. `배포.md`에 아래를 모두 **명령째** 적는다.
     - 들어가는 법: EIC 명령
     - 처음 한 번: `setup-host.sh`
     - 배포하는 법: S2 워크플로
     - 되돌리는 법: `install-release.sh --rollback` · 인프라 PR Revert
     - 로그 읽는 법: D8 명령
     - 급히 막는 법: `systemctl stop` · `DAILY_CALL_LIMIT = 0` 배포 · PR-C 되돌리기
     - 엔드포인트 요금 멈추기: PR #2 Revert 머지
     - AC-7 (a) 명령
     - 경고 두 줄: "`user_data`·AMI를 바꾸거나 서버를 교체하면 셈이 0이 된다(`prevent_destroy`)" · "v1을 내리려면 `prevent_destroy` 줄부터 지운다"
  2. 점검표: AC-1~7 증거 링크(PR #2·PR-B·bootstrap·PR-C 머지/apply 시각 · CAREER-31 `ef17df3` 13:21 · CI · plan 요약 · D12 출력 · V1 출력 · iPhone 화면). 비밀값 0
- 검사 명령: `grep -cE 'systemctl stop|DAILY_CALL_LIMIT|--rollback|journalctl|Revert|used|ec2-instance-connect|prevent_destroy' docs/runbook/배포.md; grep -c '\- \[ \]' docs/runbook/배포-증거-점검표.md; grep -rnE 'AKIA|aws_secret_access_key|BEGIN .*PRIVATE KEY' docs/runbook`
- 끝난 상태: 첫 `grep` 8 이상 · 빈 칸(`- [ ]`) 0 · 비밀값 `grep` 0줄

## P2 — how-much PR-2 · 순서 13 (R1 뒤)
- 담당: release-ops(검사·PR 열기) · reviewer · **사용자(머지)**
- 단계
  1. 제목 `CAREER-30: deploy runbook and evidence`
  2. 칸
     - 결정: 'PR-1과 같음 + V1에서 쓴 AC-7 방법 (a)'
     - 범위 변경: PR-1과 같음
     - 새 의존성: 없음
     - 비용·남용 영향: 기기(iPhone 모델)·브라우저(Safari 판)·날짜·**V1 Bedrock 시도 수** · 새 월 요금(실제 고른 D) · 공개 시각
  3. spec AC-1~8 ✔/✘ 대조 — ✘가 있으면 '완료'가 아니다
- 검사 명령: `gh pr checks --watch; git diff --stat origin/main`
- 끝난 상태: 필수 검사 통과 · diff가 `docs/runbook/`뿐 · AC-1~8 모두 ✔ · 사용자가 머지

---

## AC ↔ 작업
| AC | 만드는 곳 | 확인 |
|---|---|---|
| AC-1 | I1 · I3 (머지는 사용자) · S2·I2′(main·`environment:production`만) | I1·I3 머지 시각 > CAREER-31 `ef17df3`(10/28 13:21) · PR #2 설명 · R1 점검표 |
| AC-2 | I2(D7 · `user_data` 0줄) · S1(홈 안 건드림) · I2′(D12) | I1·I2·I3 plan `grep` · fmt·validate·trivy(CI 또는 D12 출력) · bootstrap 사용자 plan 요약 |
| AC-3 | I2(보안 그룹 · EIC) · I3(헤더) | V1 단계 1·2 |
| AC-4 | P1 · D1(화면·서버) · I3 · (F1) | V1 단계 3 |
| AC-5 | (CAREER-31 코드) · I3(헤더) | V1 단계 4 |
| AC-6 | S1 · S2 | V1 단계 5 |
| AC-7 | S1 · contracts/deploy.md §5 | V1 단계 6 |
| AC-8 | R1 | R1 검사 · P2 |

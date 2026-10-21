[CAREER-23](https://culonculon98.atlassian.net/browse/CAREER-23) · spec: [spec.md](spec.md) · plan: [plan.md](plan.md)

상태: 승인됨 (2026-10-21)

- 브랜치: `CAREER-23-infra-smoke` 하나. 작업은 **차례로 U1 → T1 → T2 → U2**. 각 작업이 앞 작업의 결과물을 쓰므로 [P] 작업은 없다.
- U1이 맨 앞인 이유: `checks.infra.validate`가 채워져 있어야 infra-dev 세션이 끝날 때 Stop 훅이 validate를 **실제로** 돌리고, PR의 첫 CI부터 '건너뜀'이 안 나온다(plan 실패 시나리오 1).
- 모든 명령은 **저장소 루트**에서 돌린다(CI와 같은 자리). 세션 보고에는 검사 출력을 **그대로** 붙인다.
- 누구도 `terraform apply` · `destroy` · `plan`을 로컬에서 돌리지 않는다. 로컬 AWS 자격 증명을 쓰지 않는다(validate는 자격 증명이 필요 없다).

---

## U1 — `checks.infra.validate` 채우기 · 순서 1
- 담당: **사용자(앞 세션)** — 역할 쓰기 구역 밖(`pipeline.config.json`)
- 파일: `pipeline.config.json`의 `checks.infra.validate`
- AC: AC-1
- 단계
  1. `"validate": "TODO"`를 `"validate": "terraform -chdir=infra init -backend=false -input=false && terraform -chdir=infra validate"`로 바꾼다. 다른 값은 건드리지 않는다.
  2. 아래 검사 명령을 돌린다. 이 시점엔 `infra/`가 없어서 명령 자체를 **돌리면 실패하는 게 정상**이다 — 돌려 보지 않는다.
  3. 커밋: `CAREER-23: infra validate check command`
- 검사 명령
  ```
  [ "$(jq -r '.checks.infra.validate' pipeline.config.json)" = 'terraform -chdir=infra init -backend=false -input=false && terraform -chdir=infra validate' ] && echo "validate: ok" && git diff HEAD~1 --stat
  ```
- 끝난 상태: `validate: ok`가 찍히고, diff에 `pipeline.config.json` 한 파일 한 줄만 바뀌었다.

## T1 — 최소 `infra/` 쓰기 · 순서 2
- 담당: infra-dev
- 파일 (모두 새로): `infra/terraform.tf` · `infra/providers.tf` · `infra/.gitignore` · `infra/.terraform.lock.hcl`
- AC: AC-2 · AC-3 · AC-5의 바탕 (로컬 확인. CI 확인은 T2)
- 참고: plan.md '열린 질문 3 답' · `.github/workflows/reusable-checks.yml`의 `infra` · `plan` 작업(고치지 않는다)
- 단계
  1. `terraform version`을 적는다. 1.13.0보다 낮거나 2.x면 멈추고 보고한다(plan 실패 시나리오 7). `trivy --version`도 적는다(없으면 "없음"으로 적고 계속 — CI가 AC-3을 확인한다).
  2. **빨강 확인**: 아래 검사 명령을 돌려 실패하는지 본다(`infra/`가 없음).
  3. `infra/terraform.tf`를 쓴다 — 아래 그대로:
     ```hcl
     terraform {
       required_version = "~> 1.13"

       required_providers {
         aws = {
           source  = "hashicorp/aws"
           version = "~> 6.0"
         }
       }

       backend "s3" {
         bucket       = "culonculon-how-much-tfstate"
         key          = "infra/terraform.tfstate"
         region       = "ap-northeast-2"
         encrypt      = true
         use_lockfile = true
       }
     }
     ```
  4. `infra/providers.tf`를 쓴다:
     ```hcl
     provider "aws" {
       region = "ap-northeast-2"
     }
     ```
  5. `infra/.gitignore`를 쓴다 (한 줄에 하나): `.terraform/` · `tfplan` · `plan.txt` · `*.tfstate` · `*.tfstate.*`
  6. `terraform -chdir=infra init -backend=false -input=false` → `.terraform.lock.hcl`이 생긴다. 출력의 `Installed hashicorp/aws v6.…` 줄을 적는다(PR '새 의존성' 칸에 쓴다). 6.x가 아니면 멈추고 보고한다.
  7. `terraform -chdir=infra providers lock -platform=linux_amd64 -platform=darwin_arm64 -platform=darwin_amd64` — CI(linux) 해시를 lock에 넣는다(plan 실패 시나리오 3).
  8. 아래 검사 명령을 돌려 통과하는지 본다. fmt가 실패하면 `terraform fmt infra`로 고치고 다시 돌린다(내용은 바꾸지 않는다).
  9. 커밋: `CAREER-23: minimal terraform root with s3 backend`
- 검사 명령 (U1의 값을 CI처럼 `bash -c`로 돌리고, AC-5와 커밋 대상을 본다)
  ```
  for n in fmt validate scan; do bash -c "$(jq -r ".checks.infra.$n" pipeline.config.json)" || exit 1; done \
    && ! grep -En '^[[:space:]]*(resource|module)[[:space:]]' infra/*.tf && echo "no resource/module: ok" \
    && grep -c 'h1:' infra/.terraform.lock.hcl \
    && git check-ignore -q infra/.terraform && echo "ignored: ok" \
    && git status --porcelain
  ```
  - `trivy`가 로컬에 없으면 scan이 127로 끝난다. 그때는 `for n in fmt validate`로 돌리고 보고에 "trivy 로컬 없음 — CI(T2)에서 확인"이라고 적는다.
- Stop 훅: U1 덕분에 fmt · validate · scan이 실제로 돈다(trivy가 없으면 훅이 알리기만 함).
- 끝난 상태: 검사 명령의 종료 코드가 0(또는 trivy만 없음), `Success! The configuration is valid.`가 있고, `h1:` 개수가 3 이상, `git status`에 `.terraform/`이 없다.

## T2 — PR과 CI · 순서 3
- 담당: infra-dev(PR 열기·CI 확인)
- 파일: 없음(PR 본문 — `.github/pull_request_template.md` 틀)
- AC: AC-2 · AC-3 · AC-4 · AC-5 (CI 화면 확인)
- 시작 전: 사용자가 '사용자에게 확인할 것' 1·2에 답했는지 본다. 답이 없으면 PR을 열지 말고 멈춘다.
- 단계
  1. PR 제목 `CAREER-23: minimal infra root for fmt, validate, plan, trivy`.
  2. PR 칸: 결정 — state key `infra/terraform.tfstate` · Terraform `~> 1.13` · aws `~> 6.0` + lock 커밋(ADR `docs/adr/0001-terraform-state-key-and-versions.md` 링크) / 범위 변경 "없음" / 새 의존성 — `hashicorp/aws` (T1 단계 6의 버전) / 비용·남용 영향 — spec '비용·남용 영향' 그대로. '검사 결과' 칸은 CI 링크만.
  3. `gh pr checks --watch`로 끝날 때까지 기다린다. 기다리는 동안 push하지 않는다(plan 실패 시나리오 5).
  4. 로그에서 확인할 줄을 뽑아 보고에 그대로 붙인다:
     ```
     run=$(gh run list --branch CAREER-23-infra-smoke --workflow ci --limit 1 --json databaseId -q '.[0].databaseId')
     gh run view "$run" --log | grep -E 'infra\.(fmt|validate) —|Success! The configuration|trivy|Total: |No changes\.|Error'
     ```
  5. 빨강이면 고치지 말고 실패 로그 줄을 보고한다. 특히 `AccessDenied` · `state lock` · 리전 오류는 사용자 몫(plan 실패 시나리오 2·4·5·9). `.github/workflows/`와 trivy 설정은 고치지 않는다.
- 검사 명령: 위 단계 3·4
- 끝난 상태: 로그에 `No changes.`와 trivy 결과(HIGH·CRITICAL 0건)가 있고, `checks / infra` · `checks / plan`이 초록이다. 요약 화면의 `- 통과: infra.fmt` · `- 통과: infra.validate` · `### terraform plan` 아래 `No changes.` · `건너뜀` 없음은 사용자가 U2에서 화면으로 본다(요약은 `gh` 로그에 안 나온다).

## U2 — 리뷰 · 화면 확인 · 머지 · 순서 4
- 담당: reviewer(`reviewer/gate`) → **사용자**(확인·머지)
- 파일: 없음
- AC: AC-2 · AC-4(요약 화면) · AC-5 · AC-6
- 단계
  1. reviewer 세션이 PR 칸·ADR을 보고 `reviewer/gate`를 남긴다.
  2. 사용자: `checks / infra` 요약에 `- 통과: infra.fmt` · `- 통과: infra.validate`가 있고 `건너뜀` 줄이 없는지(AC-2), `checks / plan` 요약에 `### terraform plan` 아래 `No changes.`가 있고 `건너뜀:`이 없는지(AC-4) 본다.
  3. 사용자: '바뀐 파일'이 `infra/` · `pipeline.config.json` · `specs/CAREER-23-infra-smoke/` · `docs/adr/0001-terraform-state-key-and-versions.md` 뿐인지 본다(AC-5).
  4. 필수 검사 6개가 초록이면 머지한다(AC-6).
- 검사 명령: `gh pr checks` (6개 모두 `pass`) → 머지 뒤 `gh pr view --json state -q .state` = `MERGED`
- 끝난 상태: PR이 Merged.

---

## AC ↔ 작업
| AC | 작업 |
|---|---|
| AC-1 | U1 |
| AC-2 | U1 → T1 검사 명령(로컬) → T2(CI 로그) → U2 단계 2(요약 화면) |
| AC-3 | T1 검사 명령(로컬, trivy 있으면) → T2 단계 4 |
| AC-4 | T2 단계 4 → U2 단계 2 |
| AC-5 | T1 검사 명령(`resource`·`module` 없음) → U2 단계 3 |
| AC-6 | U2 |

## 사용자에게 확인할 것 (PR 열기 전)
1. plan 역할의 `s3:GetObject`(와 `*.tflock` 쓰기·지우기)가 `culonculon-how-much-tfstate/*`처럼 버킷 전체에 걸려 있나, 특정 key로 묶여 있나? 묶여 있으면 `infra/terraform.tfstate`를 허용에 넣거나 key를 그 값에 맞춰야 한다.
   - 답함(10/21, 사용자와 확인 — aws-infra-portfolio `bootstrap/how-much.tf`): 버킷 전체 — GetObject `…/*`, Put·Delete `…/*.tflock`. 고칠 것 없음
2. 버킷 `culonculon-how-much-tfstate`의 리전이 `ap-northeast-2`이고, 버킷 정책이 SSE-KMS만 강제하지 않나(`encrypt = true`는 AES256)?
   - 답함(10/21, `aws s3api get-bucket-location` + 같은 파일): 리전 ap-northeast-2, 기본 암호화 AES256, KMS 강제 정책 없음
3. ~~ADR 0001을 이 PR에 넣을지~~ — 답함(10/21): (가). AC-5에 `docs/adr/`를 더했고 ADR 0001은 이 PR에 들어간다.

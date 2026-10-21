[CAREER-23](https://culonculon98.atlassian.net/browse/CAREER-23)

상태: 승인됨 (2026-10-21)
<!-- 사용자가 읽고 승인하면 "상태: 승인됨 (YYYY-MM-DD)"로 바꾼다. architect는 '승인됨'일 때만 시작한다. -->

## 문제
저장소에 `infra/`가 없어서 CI `checks / infra`와 `checks / plan`이 매번 '건너뜀'으로 통과했다. terraform fmt · validate · plan(OIDC 역할 · state 버킷) · trivy가 실제로 도는지 아무도 확인하지 않았고 `checks.infra.validate`도 아직 TODO다. 그래서 CAREER-23 완료 조건의 "CI 필수 검사 … terraform fmt/validate/plan · trivy"를 채웠다고 말할 수 없다.

> 이 스토리는 CAREER-23의 마지막 확인이다. CAREER-23 완료 조건 원문: 새 저장소에 역할 7개 · 역할별 훅 · CI 필수 검사(lint/test/build · terraform fmt/validate/plan · trivy · gitleaks) · 브랜치 규칙이 있고, 작은 시험 작업 하나가 spec → PR → 검사 통과 → 머지까지 한 번 돎.

정한 것 (10/21 사용자와 Claude가 정함):
- 최소 `infra/`: terraform 블록(aws provider, S3 backend — 버킷 `culonculon-how-much-tfstate`, `use_lockfile`) + provider 설정(리전 `ap-northeast-2`)만 둔다. 리소스는 0개라서 plan 결과는 "No changes"가 정상이다.
- validate 명령: `terraform -chdir=infra init -backend=false -input=false && terraform -chdir=infra validate`. `pipeline.config.json`은 사용자가 쓰는 구역이라 **사용자가 같은 PR에 넣는다**.

## 완료 조건
<!-- 모두 이 스토리 PR의 CI 실행(요약·로그)과 PR 화면에서 눈으로 확인한다. -->
- AC-1 validate 명령이 채워짐
  - 주어진: 이 스토리의 PR
  - 할 때: PR diff에서 `pipeline.config.json`을 볼 때
  - 그러면: `checks.infra.validate` 값이 `terraform -chdir=infra init -backend=false -input=false && terraform -chdir=infra validate`와 글자까지 같고, 더는 `TODO`가 아니다
- AC-2 fmt · validate가 실제로 돎
  - 주어진: PR에 `infra/*.tf`가 있고 AC-1이 반영됨
  - 할 때: PR의 CI에서 `checks / infra` 요약을 열 때
  - 그러면: `- 통과: infra.fmt`와 `- 통과: infra.validate` 두 줄이 있고, 이 요약에 `건너뜀`이 들어간 줄(`infra/*.tf 없음` · `(TODO)`)은 하나도 없다
- AC-3 trivy가 실제로 돎
  - 주어진: AC-2와 같은 CI 실행
  - 할 때: `checks / infra` 작업 로그의 단계 목록을 볼 때
  - 그러면: `aquasecurity/trivy-action` 단계가 '건너뜀'(skipped)이 아니라 실행돼 성공으로 표시되고, 로그에 `infra` 폴더를 config 검사한 결과가 찍혀 있다(HIGH·CRITICAL 0건)
- AC-4 plan이 OIDC 역할과 state 버킷으로 실제로 돎
  - 주어진: 같은 PR의 CI 실행
  - 할 때: `checks / plan` 요약을 열 때
  - 그러면: `### terraform plan` 제목 아래 `No changes.`로 시작하는 줄이 있고, `건너뜀:` 줄(`PR이 아님` · `infra/*.tf 없음` · `저장소 변수 AWS_PLAN_ROLE_ARN 없음`)은 없다
- AC-5 리소스 0개 · 앱 안 건드림
  - 주어진: 이 스토리의 PR
  - 할 때: PR의 '바뀐 파일' 목록과 `infra/*.tf` 내용을 볼 때
  - 그러면: 바뀐 파일은 `infra/` 아래 · `pipeline.config.json` · `specs/CAREER-23-infra-smoke/` 아래 · `docs/adr/` 아래(ADR 0001 — 10/21 사용자 결정 (가))뿐이고 `app/`은 없으며, `infra/*.tf`에 `resource` · `module` 블록이 없다
- AC-6 필수 검사 6개 통과 후 머지
  - 주어진: AC-1~5가 만족된 PR
  - 할 때: PR 화면의 검사 목록을 볼 때
  - 그러면: `checks / app` · `checks / infra` · `checks / plan` · `checks / gitleaks` · `checks / pr-title` · `reviewer/gate` 6개가 모두 초록(성공)이고, 사용자가 머지해 PR 상태가 'Merged'다

## 안 할 것
- `terraform apply` · `destroy` — 이 스토리에서는 누구도 돌리지 않는다
- AWS 리소스 추가(VPC · Lambda · 버킷 등). state 버킷과 OIDC plan 역할을 이 PR에서 만들거나 고치지 않는다(이미 있다고 본다 — 열린 질문 1·2)
- `app/` 변경
- CI 워크플로(`.github/workflows/`) · trivy 심각도 · '건너뜀이면 통과' 규칙 바꾸기
- AI를 어디서 부를지(A Lambda · B Bedrock · C NAT) 정하기 — 별도 ADR
- Jira 상태 바꾸기(자동화 몫)

## 비용·남용 영향
- AI 호출: 늘지 않음 · 새 입구(엔드포인트·업로드): 없음 · 새 인프라 리소스: 0개(plan "No changes")
- PR CI가 돌 때마다 state 버킷에 S3 요청 몇 건(state 읽기, `.tflock` 쓰기·지우기)이 생긴다. 금액은 무시할 수준

## 열린 질문
- 질문 1: 저장소 변수 `AWS_PLAN_ROLE_ARN`이 설정돼 있고, 그 역할이 이 저장소의 PR에서 OIDC로 맡을 수 있나? 없으면 `checks / plan`이 '건너뜀'으로 통과해 AC-4가 ✘가 된다 — 담당: 사용자 · 때: PR을 열기 전
  - 확인(10/21, 사용자 승인 때): 변수 있음(`arn:aws:iam::992382377553:role/github-actions-how-much-plan`), 신뢰 정책 subject가 how-much 저장소의 `pull_request` — aws-infra-portfolio `bootstrap/how-much.tf`
- 질문 2: plan 역할의 IAM 권한에 state 버킷 `culonculon-how-much-tfstate`의 읽기와 `use_lockfile`이 쓰는 `.tflock` 객체 쓰기·지우기(PutObject · DeleteObject)가 들어 있나? 없으면 CI plan이 잠금 단계에서 AccessDenied로 실패한다. 권한을 넓힐지, plan만 잠금 없이 돌릴지(CI 변경이라 이 스토리 범위 밖)는 사용자가 정한다 — 담당: 사용자(IAM은 사용자 결정) · 때: PR을 열기 전, 늦어도 첫 CI 실행이 실패했을 때
  - 확인(10/21, 사용자 승인 때): 들어 있음 — how-much state 버킷 `s3:ListBucket` · `s3:GetObject` · `*.tflock`에 `s3:PutObject`·`s3:DeleteObject` (같은 파일)
- 질문 3: S3 backend의 state `key` 이름과 Terraform·aws provider 버전 제약 — 담당: architect · 때: plan.md에서 (CI의 terraform 1.13.1은 `use_lockfile`을 지원한다)
  - 답(10/21, architect): key `infra/terraform.tfstate` · Terraform `~> 1.13` · aws `~> 6.0` + lock 파일 커밋 — [plan.md](plan.md) '열린 질문 3 답'

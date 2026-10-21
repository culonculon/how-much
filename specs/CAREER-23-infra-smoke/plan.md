[CAREER-23](https://culonculon98.atlassian.net/browse/CAREER-23) · spec: [spec.md](spec.md) · 작업: [tasks.md](tasks.md)

상태: 승인됨 (2026-10-21)

## 접근 방법
리소스 0개짜리 Terraform 루트 모듈 하나를 `infra/`에 두어, CI가 이미 가진 `checks / infra`(fmt · validate · trivy)와 `checks / plan`(OIDC · state 버킷)이 '건너뜀' 없이 실제로 돌게 한다. CI 워크플로는 고치지 않는다 — `infra/*.tf`가 생기고 `checks.infra.validate`가 채워지면 지금 워크플로가 그대로 돈다.

### 만들어지는 파일 (끝난 뒤 `infra/`의 모습)
| 파일 | 하는 일 | 담당 |
|---|---|---|
| `infra/terraform.tf` | `terraform` 블록 하나: `required_version` · `required_providers`(aws) · `backend "s3"` | infra-dev |
| `infra/providers.tf` | `provider "aws"` — `region`만 | infra-dev |
| `infra/.terraform.lock.hcl` | provider 버전·해시 고정. 커밋한다 (CI가 같은 provider를 받게) | infra-dev (`terraform` 명령이 만든다) |
| `infra/.gitignore` | `.terraform/` · `tfplan` · `plan.txt` · `*.tfstate` · `*.tfstate.*` | infra-dev |
| `pipeline.config.json` `checks.infra.validate` | spec이 정한 명령 그대로 | **사용자** |

- 파일을 둘로 나눈 이유: 이후 스토리가 `main.tf`·리소스 파일을 더해도 `terraform.tf`(버전·backend)는 거의 안 바뀐다. 더 나누지 않는다(변수·outputs 파일은 값이 생길 때).
- `infra/.gitignore`를 따로 두는 이유: 루트 `.gitignore`를 고치면 AC-5(바뀐 파일은 `infra/` · `pipeline.config.json` · spec 폴더 · `docs/adr/`뿐)가 깨진다.

## 열린 질문 3 답 (architect)
| 무엇 | 값 | 이유 |
|---|---|---|
| state `key` | `infra/terraform.tfstate` | 규칙: **key = 저장소 루트에서 본 루트 모듈 폴더 + `/terraform.tfstate`**. 버킷이 how-much 전용이라 앱 이름 접두사는 필요 없고, 나중에 루트 모듈이 늘어도(예: `infra/edge/`) 폴더만 보고 key를 안다 |
| Terraform | `required_version = "~> 1.13"` (= `>= 1.13.0, < 2.0.0`) | 바닥 = CI의 1.13.1과 같은 마이너 → 로컬 fmt·validate가 CI와 같은 결과. `use_lockfile`(1.10+)도 덮는다. 천장은 메이저만 막아 로컬에 1.14가 있어도 돈다 |
| aws provider | `source = "hashicorp/aws"`, `version = "~> 6.0"` (= `>= 6.0, < 7.0`) | 현재 메이저 안에서 마이너 업데이트는 받고, 메이저(깨지는 변경)는 사람이 올린다. 실제 버전은 `.terraform.lock.hcl`이 고정한다 |
| backend 나머지 | `bucket = "culonculon-how-much-tfstate"` · `region = "ap-northeast-2"` · `encrypt = true` · `use_lockfile = true` | bucket·region·lockfile은 spec이 정함. `encrypt`는 state·`.tflock`을 SSE(AES256)로 쓰게 하는 기본 안전값 |

state key는 리소스가 생긴 뒤 바꾸려면 사용자가 `terraform init -migrate-state`를 돌려야 하므로 ADR로 남긴다 — [ADR 0001](../../docs/adr/0001-terraform-state-key-and-versions.md).

## 고른 이유와 버린 대안
| 결정 | 고른 것 | 버린 것 · 왜 아님 |
|---|---|---|
| state key | `infra/terraform.tfstate` | `terraform.tfstate`(버킷 루트): 지금은 같지만 루트 모듈이 둘이 되는 순간 이름 규칙이 없다 · `how-much/terraform.tfstate`: 버킷 이름과 중복, 폴더와 안 맞음 · workspace(`env:/…`): 11/8엔 환경이 하나라 쓸 데 없음 |
| Terraform 제약 | `~> 1.13` | `= 1.13.1` 정확 고정: 로컬 세션마다 같은 패치를 깔아야 해서 Stop 훅이 버전 오류로 자주 막힘 · `>= 1.10`: 로컬 1.10~1.12와 CI 1.13의 fmt 차이가 생길 수 있음 |
| aws 제약 | `~> 6.0` + lock 파일 커밋 | 제약 없음: 새 메이저가 나오면 PR마다 다른 provider · `= 6.x.y` 정확 고정: lock 파일이 이미 그 일을 함, 갱신이 두 곳이 됨 |
| lock 파일 | 커밋, linux_amd64 · darwin_arm64 · darwin_amd64 해시 | 커밋 안 함: CI와 로컬이 다른 provider를 받을 수 있음 · 지금 플랫폼 해시만: CI(linux)에서 해시 불일치 위험(실패 시나리오 3) |

## 실패 시나리오 (premortem) — 각각 막는 곳 · 알아채는 법
1. **AC-2가 '건너뜀'으로 통과** — `checks.infra.validate`가 TODO인 채 PR이 열리면 `- 건너뜀: infra.validate (TODO)`가 찍히고 초록으로 끝난다(조용한 실패). → tasks U1을 infra-dev 작업보다 먼저 하고, T2 단계에서 요약에 `건너뜀`이 없는지 본다.
2. **plan이 init에서 AccessDenied** — plan 역할의 `s3:GetObject`가 특정 key로 묶여 있으면 `infra/terraform.tfstate`를 못 읽는다. → 사용자 확인 질문 1(PR 열기 전). CI `checks / plan`이 빨강으로 알려 준다.
3. **CI init에서 provider 해시 불일치** — macOS에서 만든 lock에 linux 해시가 없을 때. → T1에서 `terraform providers lock`으로 세 플랫폼 해시를 넣는다.
4. **버킷 리전이 `ap-northeast-2`가 아님** — init이 리전 오류로 실패(크게 실패). → 사용자 확인 질문 2. 고칠 곳은 `infra/terraform.tf`의 backend `region` 한 줄.
5. **남은 잠금(`.tflock`)으로 plan이 60초 뒤 실패** — `ci.yml`의 `cancel-in-progress` 때문에 plan 도중 새 push가 오면 작업이 끊길 수 있다. Terraform은 보통 중단 신호에 잠금을 풀지만 못 풀면 다음 plan이 `Error acquiring the state lock`으로 빨강. → infra-dev는 CI가 도는 동안 push를 몰아 하지 않는다. 남으면 **사용자가** 잠금 ID로 `terraform force-unlock` 하거나 `.tflock` 객체를 지운다(로컬 AWS 자격 증명을 에이전트가 쓰지 않으므로).
6. **`.terraform/`이 커밋됨** — provider 바이너리(수백 MB)가 PR에 들어감. → `infra/.gitignore` + T1 검사 명령의 `git status` 확인.
7. **로컬 Terraform이 1.13보다 낮음** — validate가 `Unsupported Terraform Core version`으로 실패(크게 실패, Stop 훅이 잡음). → T1 단계 1에서 버전을 먼저 본다.
8. **trivy가 HIGH·CRITICAL을 찾음** — 리소스가 없어 0건이 예상이지만 나오면 심각도·무시 목록을 고치지 않는다(spec '안 할 것'). 멈추고 보고한다.
9. **encrypt 헤더가 버킷 정책과 충돌** — 버킷 정책이 `aws:kms`만 허용하면 `.tflock` PutObject가 거부된다. → 사용자 확인 질문 2와 함께 본다. 첫 CI 빨강으로 드러난다.
- 건너뛴 것: 동시 apply(apply 없음) · 데이터 손실(state가 비어 있고 plan은 state를 쓰지 않음) · 비용 폭증(S3 요청 몇 건).

## contracts
**바뀌는 것 없음.** outputs도 환경변수도 만들지 않는다(리소스 0개). `contracts/`는 손대지 않는다. 앱↔인프라 값이 처음 생기는 스토리(AI 호출 위치 ADR 뒤)에서 contracts를 먼저 정한다.

## ADR
[`docs/adr/0001-terraform-state-key-and-versions.md`](../../docs/adr/0001-terraform-state-key-and-versions.md) — 확정(2026-10-21). 사용자가 (가)를 골라 AC-5에 `docs/adr/`를 더했고, ADR은 이 PR에 들어간다.
- 결정 요약: key = `<루트 모듈 폴더>/terraform.tfstate`(지금 `infra/terraform.tfstate`). Terraform `~> 1.13`, aws `~> 6.0` + `.terraform.lock.hcl` 커밋(3개 플랫폼 해시). 상황 · 버린 대안 · 결과는 ADR 본문에.

## 신뢰 경계
해당 없음 — `strict_review_areas`(guard)를 건드리지 않고, 입력·AI 호출·과금·저장 경로가 없다. 새로 생기는 권한 사용은 CI plan 역할(읽기 + `.tflock` 쓰기·지우기)뿐이고 이미 있는 역할이다.

## 범위 밖
- spec '안 할 것' 그대로. 이번에 생긴 것: `default_tags` · 변수·outputs 파일 · 루트 `.gitignore` 정리 — 리소스가 생기는 스토리에서.

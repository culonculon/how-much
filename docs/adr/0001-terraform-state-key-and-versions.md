# ADR-0001: Terraform state key 규칙과 버전 제약

- 날짜: 2026-10-21
- 상태: 확정
- 정한 사람: 함께 (architect 제안 · 사용자 승인 10/21)
- Refs: CAREER-23

## 상황
첫 Terraform 루트 모듈(`infra/`)을 만들면서 S3 backend의 state key와 Terraform·aws provider 버전 제약을 정해야 한다. key는 리소스가 생긴 뒤 바꾸려면 state 옮기기(`terraform init -migrate-state`, 사용자 몫)가 필요하고, 이후 루트 모듈이 따라 할 규칙이 된다. 버전 제약은 로컬 세션(Stop 훅의 fmt·validate)과 CI(Terraform 1.13.1)가 같은 결과를 내야 한다.

## 결정
state key = `<저장소 루트에서 본 루트 모듈 폴더>/terraform.tfstate` (지금 `infra/terraform.tfstate`). Terraform `required_version = "~> 1.13"`, aws provider `source = "hashicorp/aws"` · `version = "~> 6.0"`에 `.terraform.lock.hcl`을 커밋한다(linux_amd64 · darwin_arm64 · darwin_amd64 해시).

## 버린 대안
### 대안 1: state key `terraform.tfstate` (버킷 루트)
- 좋은 점: 가장 짧고, 지금은 결과가 같다
- 나쁜 점: 루트 모듈이 둘이 되는 순간 이름 규칙이 없다
- 왜 아님: 나중에 규칙을 세우려면 이 key부터 옮겨야 한다

### 대안 2: state key `how-much/terraform.tfstate`
- 좋은 점: 앱 이름이 key에 드러난다
- 나쁜 점: 버킷이 how-much 전용이라 버킷 이름과 중복되고, 폴더 구조와 안 맞는다
- 왜 아님: key만 보고 어느 루트 모듈인지 알 수 없다

### 대안 3: workspace (`env:/…`)
- 좋은 점: 환경마다 state를 나누는 기본 기능
- 나쁜 점: 11/8엔 환경이 하나라 쓸 데가 없다
- 왜 아님: 쓰지 않을 구조를 미리 들인다

### 대안 4: Terraform `= 1.13.1` 정확 고정
- 좋은 점: CI와 패치까지 같다
- 나쁜 점: 로컬 세션마다 같은 패치를 깔아야 한다
- 왜 아님: Stop 훅이 버전 오류로 자주 막힌다

### 대안 5: Terraform `>= 1.10`
- 좋은 점: `use_lockfile`(1.10+)만 맞추면 어떤 로컬에서도 돈다
- 나쁜 점: 로컬 1.10~1.12와 CI 1.13의 fmt 결과가 다를 수 있다
- 왜 아님: 로컬 통과 · CI 실패가 생긴다

### 대안 6: aws provider 제약 없음
- 좋은 점: 손댈 것이 없다
- 나쁜 점: 새 메이저가 나오면 PR마다 다른 provider를 받는다
- 왜 아님: 깨지는 변경이 사람 모르게 들어온다

### 대안 7: aws provider `= 6.x.y` 정확 고정
- 좋은 점: 버전이 `.tf`에 바로 보인다
- 나쁜 점: lock 파일이 이미 그 일을 해서 갱신할 곳이 두 군데가 된다
- 왜 아님: 중복

### 대안 8: lock 파일을 커밋하지 않음 / 지금 플랫폼 해시만 넣음
- 좋은 점: 파일 하나 덜 관리하거나, 명령 한 번 덜 돌린다
- 나쁜 점: 커밋 안 하면 CI와 로컬이 다른 provider를 받을 수 있고, macOS 해시만 있으면 CI(linux) init에서 해시 불일치가 난다
- 왜 아님: CI가 로컬과 같은 provider로 돈다는 보장이 깨진다

## 결과
### 좋아지는 것
- 폴더만 보고 state key를 안다(루트 모듈이 늘어도 예: `infra/edge/` → `infra/edge/terraform.tfstate`)
- CI와 로컬의 Terraform·provider 버전 차이가 작다

### 나빠지는 것
- 루트 모듈 폴더를 옮기거나 이름을 바꾸면 key도 옮겨야 한다

### 위험과 대비
- 폴더 이름을 바꾸는 PR은 state 옮기기(사용자 몫)를 같이 계획한다. plan 결과가 `No changes`가 아니라 '전부 새로 만들기'로 보이면 key가 바뀐 것이다
- 이 ADR이 다루는 결정과 근거는 [CAREER-23 plan.md](../../specs/CAREER-23-infra-smoke/plan.md)의 '열린 질문 3 답' · '고른 이유와 버린 대안'에 있다

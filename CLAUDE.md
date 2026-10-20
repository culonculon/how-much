# how-much — 공통 규칙 (모든 역할이 읽음)

> 2026-10-19 초안 → 10/20 사용자와 같이 읽고 고침. 200줄 안으로 유지한다. 여기에 값을 베끼지 말고 원본 위치만 적는다.

## 1. 이 프로젝트
- 사진을 올리고 내 마음 가격(모찌 1·10·100개·안 팔아)과 사연 태그를 고르면, 도트 감정사 아저씨가 AI로 "모찌 몇 개"를 매긴다. 결과 카드에 아저씨 값 vs 내 값(추억 프리미엄)을 보여 주고 공유한다.
- 이 저장소의 주인공은 **운영**이다: 요청 1건당 비용, 남용 막기, 그리고 이 저장소를 만드는 에이전트 파이프라인.
- 11/8 공개 범위: 위 흐름 + 아저씨 상태 3개(갸웃=AI 호출 중 · 도장=완료 · 퇴근=하루 상한) + 비용 상한 + 안전 최소한.
- 11/8 범위 밖: 상태 추가, 환율 교체, 자랑 벽, 친구 맞히기, 랭킹, 광고. 요청받아도 만들지 말고 PR의 '범위 변경' 칸에 제안만 한다.
- 스택: Vite + React(JavaScript) · 테스트 vitest + Playwright · 인프라 Terraform(AWS) · CI GitHub Actions(OIDC).

## 2. 원본은 어디에 (베끼지 말고 링크)
| 무엇 | 원본 |
|---|---|
| 무엇을 만들지 · 완료 조건 · 상태 | Jira 스토리 `CAREER-N` |
| 어떻게 만들지 | `specs/CAREER-N-slug/spec.md` · `plan.md` · `tasks.md` (spec.md 첫 줄 = Jira 링크) |
| 화면↔서버↔인프라 약속(API 모양, 환경변수, Terraform outputs) | `contracts/` |
| 코드·인프라 결정 | `docs/adr/NNNN-제목.md` (본문에 `Refs CAREER-N`) |
| 구역(경로) · 역할별 쓰기 구역 · 검사 명령 | `pipeline.config.json` |

## 3. 폴더와 누가 쓰나
- 경로와 담당의 원본은 `pipeline.config.json`의 `areas` · `roles` · `human_only`다. 아래는 읽기 쉽게 옮긴 요약.
  - `app/src/` 화면·감정 호출 어댑터 — frontend-dev
  - `app/tests/`, `e2e/` — test-writer
  - `api/` 서버 쪽 AI 호출, 비용·남용 막기 — **함께 한다(앞 세션)**, 역할은 쓰지 않음
  - `infra/` Terraform, `.github/` CI — infra-dev (함께 한다)
  - `specs/` — spec-writer, architect / `contracts/`, `docs/adr/` — architect
  - `docs/runbook/` — release-ops
  - `docs/reference/` 참고 메모 — **함께 한다(앞 세션)**
  - `README.md` — **사용자**
- `.claude/`(역할·훅·스킬)와 `.github/workflows/reusable-*`는 11/8 뒤 떼어 낼 구역이다. 여기에는 이 앱의 경로·이름·값을 적지 않고 `pipeline.config.json`의 이름(구역·역할)만 부른다.
- 맡은 구역 밖은 쓰지 않는다. 필요하면 멈추고 PR이나 보고에 "누가 무엇을 바꿔야 함"을 적는다. (훅이 막는다)

## 4. 일 방식
- **맡긴다**: 화면·감정 기능. 백그라운드 세션이 worktree에서 만들고 PR로 낸다.
- **함께 한다**: `api/`, `docs/reference/`, `infra/`, 파이프라인(`.claude/`, `.github/`). 사용자가 값·위치·막을 것을 정한다. 사용자 결정 없이 상한 값, 요금 관련 값, IAM 권한, 공개 범위를 정하지 않는다 — 후보와 근거를 보여 주고 묻는다.
- 단계는 차례로: spec → plan/tasks/contracts → 테스트 → 구현 → PR → 리뷰 → 사용자 머지.
- 만들기 세션은 동시에 2개까지. contracts가 확정되기 전에는 만들기를 시작하지 않는다.

## 5. 이름 규칙
- 브랜치·worktree: `CAREER-N-slug` (예: `CAREER-22-first-flow`)
- PR 제목: `CAREER-N: 요약`
- 커밋: `CAREER-N: English noun phrase` (예: `CAREER-22: price button component`). Co-Authored-By 줄을 넣지 않는다.
- 코드·식별자·커밋은 영어, spec·ADR·PR 설명은 한국어.

## 6. 끝났다고 말하기 전에
- `pipeline.config.json`의 `checks` 명령을 실제로 돌리고 세션 보고에는 **출력 그대로** 적는다. 돌리지 않은 검사를 통과했다고 쓰지 않는다. PR의 '검사 결과' 칸에는 CI 링크만 넣는다.
  - app: lint · test · build / infra: `terraform fmt -check` · `terraform validate` · trivy config
  - `terraform plan`은 세션에서 돌리지 않는다 — PR의 CI(OIDC)에서만 돈다. 로컬 AWS 자격 증명을 쓰지 않는다.
- spec.md의 완료 조건을 한 줄씩 대조해 ✔/✘로 적는다. ✘가 있으면 '완료'가 아니다.
- 바꾼 것만 바꾼다. 요청 밖 리팩터링·정리·이름 바꾸기를 섞지 않는다.

## 7. 결정과 범위 (기록 간극 막기)
- 스펙은 `specs/_template.md`, PR은 `.github/pull_request_template.md` 틀을 쓴다(`templates`).
- 작업 중 결정이 생기면(라이브러리, 구조, 값, 트레이드오프) `docs/adr/`에 남기거나, 권한이 없으면 PR '결정' 칸에 적는다. 결정이 없으면 "없음"이라고 쓴다.
- 범위가 바뀌면(완료 조건 추가·삭제, 새 기능) Jira를 직접 고치지 않는다. PR '범위 변경' 칸에 제안을 적는다. 반영은 사용자가 한다.
- Jira 상태를 바꾸지 않는다(자동화가 한다). Jira에 쓸 수 있는 건 spec-writer·architect의 댓글뿐이다.
- PR의 결정 · 범위 변경 · 새 의존성 · 비용·남용 영향 칸은 비우지 않는다(없으면 "없음"). reviewer는 칸이 비었거나, 결정이 있는데 ADR·'결정' 칸이 비었거나, 범위가 바뀌었는데 제안이 없으면 `reviewer/gate` 검사를 실패로 남긴다. 이 검사는 브랜치 규칙의 필수 검사라서 실패면 머지가 안 된다.

## 8. 코드를 쓰기 전에 (ponytail) — 만드는 역할만
- 대상: test-writer · frontend-dev · infra-dev, 그리고 함께 쓰는 앞 세션. spec-writer · architect · reviewer · release-ops는 이 칸을 따르지 않는다(reviewer는 `/ponytail-review` 결과를 '고치면 좋은 것'에만 적는다).
1. 꼭 있어야 하나? 아니면 만들지 않는다.
2. 표준 라이브러리로 되나? → 3. 브라우저·플랫폼 기본 기능으로 되나? → 4. 이미 있는 의존성으로 되나? → 5. 한 줄로 되나? → 6. 그래도 아니면 가장 작은 코드.
- 단, 신뢰 경계 검증 · 데이터 손실 처리 · 보안 · 접근성은 줄이지 않는다.
- 새 의존성은 넣어도 되지만 PR '결정' 칸에 이름과 이유를 한 줄 적는다.

## 9. 비용·안전 원칙
- AI 호출은 반드시 `api/`를 거치고, 비용·남용 막기를 거치지 않는 호출 경로를 만들지 않는다. 비용 상한은 서버 쪽에서 센다(브라우저에서 세지 않는다).
- 사진은 위치 정보(EXIF)를 지운 뒤 처리한다. 자유 글 입력은 받지 않는다(태그만).
- 하루 상한에 걸리면 에러 화면 대신 아저씨 '퇴근' 상태를 보여 준다.

## 10. 하지 않는 것 (훅·CI가 막지만 시도도 하지 않는다)
- `terraform apply`, `terraform destroy` — 사용자만, 머지 뒤에
- main에 직접 push, 강제 push, `--no-verify`
- 비밀값·`.env`·AWS 키 커밋, 로그에 비밀값 출력
- 맡은 구역 밖 쓰기, 다른 worktree 건드리기, 린터·테스트 설정을 느슨하게 고치기

## 11. 아직 안 정한 것 (정해지면 여기서 지우고 원본에)
- AI를 어디서 부를지: A Lambda · B Bedrock + VPC 엔드포인트 · C NAT 인스턴스 → 정해지면 ADR
- 공유 카드 방식 · 첫 환율 단위(모찌/붕어빵) · 아저씨 말투 · 안전 최소한의 범위
- 비용 상한·재시도 횟수 값 (방식은 `docs/reference/`, 값은 함께 쓸 때)
- 실제 명령(`npm run …`)은 저장소를 만든 뒤 `pipeline.config.json`의 `checks`에 채운다

# ADR-0002: AI 호출 구조 — 프라이빗 EC2 → bedrock-runtime VPC 엔드포인트 → Nova Pro

- 날짜: 2026-10-21
- 상태: 확정 (2026-10-21 — 사용자 승인. 버린 이유는 사용자 설계 메모 기준) · **(CAREER-31 고침 — 2026-10-24 사용자 승인)** '위험과 대비'의 '엔드포인트 놀림 요금' 줄
- 정한 사람: 사용자 (구조 B · 모델 · 결정 B·D) / architect가 글로 옮김
- Refs: CAREER-25 · CAREER-31(엔드포인트 놀림 요금 줄 고침)

## 상황
감정 아저씨가 진짜 AI로 값을 매기려면 서버가 AI를 불러야 하고, 호출 1건마다 돈이 든다(CLAUDE.md §9: AI 호출은 `api/`를 거치고 비용 상한은 서버에서 센다). 후보는 A Lambda · B Bedrock + VPC 엔드포인트 · C NAT 인스턴스였다(CLAUDE.md §11). v1 포트폴리오에 이미 프라이빗 서브넷의 EC2가 있고, 그 VPC·EC2는 how-much `infra/`가 아니라 `culonculon/aws-infra-portfolio` 저장소에 있다. 한 번 정하면 네트워크·IAM·배포 경로·비용 상한(CAREER-27)의 자리가 모두 이 위에 올라가서 되돌리기 어렵다.

## 결정
브라우저 → CloudFront → v1 프라이빗 EC2(`api/`) → `com.amazonaws.ap-northeast-2.bedrock-runtime` Interface VPC 엔드포인트(private DNS) → Amazon Nova Pro, 모델 id `apac.amazon.nova-pro-v1:0`(APAC 리전 간 추론 프로필). 엔드포인트·보안 그룹·EC2 IAM은 `culonculon/aws-infra-portfolio`에서 만들고(결정 D), 비용 상한(CAREER-27)이 들어가기 전에는 `api/`를 EC2에 배포하거나 CloudFront로 공개하지 않는다(결정 B — CAREER-25는 로컬 서버까지).

## 버린 대안
### 대안 1: A — Lambda에서 Bedrock 호출
- 좋은 점: 고정비가 0이고, 컨테이너 이미지로 올리면 빈 곳을 조금 채울 수 있다
- 나쁜 점: S3 직접 업로드·Lambda·그 권한 등 새 구성요소가 많다
- 왜 아님: v1(EC2)과 따로 서서 "v1 위에 얹는다"는 이 프로젝트 이야기에서 벗어난다

### 대안 2: C — NAT 인스턴스로 공용 Bedrock 엔드포인트에 나감
- 좋은 점: 월 $3~4로 싸다
- 나쁜 점: NAT 서버를 직접 패치·관리해야 하고, 그 하나가 죽으면 AI 감정이 멈춘다
- 왜 아님: 관리 부담과 단일 장애점에 더해, 관리형(엔드포인트)을 피한 "꼼수"로 보일 위험이 있다

### 대안 3: GPU 인스턴스에 모델을 직접 올림
- 왜 아님: g4dn.xlarge 서울 시간당 $0.647 — 켜 두면 월 약 $470, 끄면 첫 요청이 몇 분 걸리고, 작은 모델은 한국어 말맛이 약하다

### 대안 4: 서울 리전 단일 모델 id(리전 간 추론 없이)
- 좋은 점: 사진이 서울 밖으로 나가지 않는다
- 나쁜 점: Nova Pro를 서울에서 프로필 없이 직접 부를 수 있는지 이 문서에서 확인하지 않았다. 직접 부를 수 없다면 다른 모델을 골라야 한다
- 왜 아님: 사용자가 10/21 `apac.` 프로필을 고르고, 대신 화면에 리전 안내를 넣기로 했다

## 결과
### 좋아지는 것
- EC2에서 Bedrock까지 인터넷을 거치지 않는다. 엔드포인트 보안 그룹은 EC2 보안 그룹에서 오는 443만 받는다
- EC2 IAM은 `bedrock:InvokeModel` 하나를, 이 추론 프로필과 그 프로필이 보내는 리전의 Nova Pro 기반 모델 ARN(프로필 경유 조건 `bedrock:InferenceProfileArn`)에만 준다(`Resource`에 `*` 없음, CAREER-25 plan '열린 질문 7 답' — 10/21 사용자 확정)
- 모델 id는 `api/` 설정 한 곳에 있어 모델을 바꿔도 한 줄이다
- 감정 1건 약 3원(spec 10/21 사용자 결정). 재시도를 다 쓰면 최대 약 3원 × (1 + 재시도 횟수)

### 나빠지는 것
- `apac.` 프로필이라 사진이 서울 밖 아시아 리전에서 처리될 수 있다 → 화면을 진짜 서버에 연결할 때(CAREER-26 머지 뒤, 결정 A) 감정 버튼 근처에 안내 한 줄을 넣는다. 문구는 contracts/appraise.md §5(10/21 사용자 결정)
- Interface 엔드포인트는 쓰지 않아도 시간당 요금 × AZ 수가 나간다(apply한 순간부터). AZ는 v1 EC2가 있는 1개만(10/21 사용자 결정) — 그 AZ가 멈추면 EC2도 같이 멈추므로 잃는 것이 없다
- how-much 코드와 그 코드가 의존하는 네트워크·IAM이 서로 다른 저장소에 있어, 한쪽만 바뀌면 다른 쪽이 모른다

### 위험과 대비
- 공개 전 과금 사고: 비용 상한(CAREER-27) 전에는 배포·공개하지 않는다(결정 B). 로컬 서버는 `127.0.0.1`에만 묶는다
- 넓은 자격 증명: 시험 세트는 사용자 컴퓨터의 terraform-admin 자격 증명으로 손으로 돌린다(결정 C, CLAUDE.md §6의 이 시험 한정 예외). 시험 실행 명령은 로컬 서버에 HTTP로만 요청하고, 결과 파일·로그에 자격 증명을 남기지 않는다
- 저장소가 갈라져 생기는 어긋남: `culonculon/aws-infra-portfolio` PR 링크를 CAREER-25 PR 설명에 적고(AC-14), 배포 스토리에서 EC2 역할·보안 그룹 이름을 contracts에 옮긴다
- 엔드포인트 놀림 요금: **(CAREER-31 고침 — 2026-10-24 사용자 승인 · CAREER-31 plan D8)** `culonculon/aws-infra-portfolio`는 main에 머지하면 `deploy.yml`이 바로 apply한다 — 그 저장소에서는 **머지 = apply = 요금 시작**이다(CAREER-31 spec 가정 1). 그래서 엔드포인트 PR은 `api/`를 EC2에 배포하는 스토리(CAREER-30)에서 **배포 직전에 머지**한다. (옛 글: "PR은 지금 내고 머지하되 apply는 배포 스토리 때 사용자가 한다(10/21 사용자 결정)" — 그 저장소의 CI와 맞지 않아 고침. 10/24 사용자 확인: 엔드포인트 PR #2는 아직 머지 안 됨(OPEN · draft) — 요금은 아직 나가지 않았다)
- 프로필이 보내는 리전 목록이 바뀌면 IAM이 막아 `AccessDenied` → `unavailable`로 크게 실패한다. 목록은 Terraform data source로 읽어 다음 plan에 드러나게 한다

<!-- 틀 출처: ECC skills/architecture-decision-records (MIT, Affaan Mustafa) — Michael Nygard 형식을 옮김 -->

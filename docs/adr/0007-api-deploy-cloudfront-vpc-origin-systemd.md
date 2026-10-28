# ADR-0007: `api/` 배포 — CloudFront VPC origin → 프라이빗 v1 EC2의 systemd 서비스, EIC로 판 폴더를 바꿔 끼우고 홈의 셈 파일은 남긴다

- 날짜: 2026-10-28 (2판 — I0 인프라 사실 반영)
- 상태: **확정 (2026-10-28 — 사용자 승인, 14:10 D1 나)** — CAREER-30 plan D1·D3·D4·D6·D7 (D2 해당 없음). 인프라 사실의 근거는 [i0-facts.md](../../specs/CAREER-30-deploy/i0-facts.md)(앞 세션이 `aws-infra-portfolio` main `1ea4bf2` · PR #2 `bf5d8cf`에서 확인). 아직 모르는 것(plan I-4 남은 것 · I-10~I-13)에 따라 갈리는 곳은 '위험과 대비'에 적었다
- 정한 사람: 함께 (architect 제안 — 인프라·요금·IAM은 사용자가 고름)
- Refs: CAREER-30

## 상황
how-much는 로컬(`127.0.0.1`)에서만 돌고, 밖 주소는 v1 CloudFront를 그대로 쓴다(CAREER-30 U9). v1은 이미 CloudFront **VPC origin**으로 프라이빗 EC2(AL2023·arm64)의 nginx 80에 닿는다. 보안 그룹은 CloudFront 접두사 목록에서 80만 받고, 그 EC2에는 공인 IP도 밖으로 나가는 길도 없다(S3 게이트웨이 엔드포인트로 AL2023 꾸러미 저장소만). 하루 셈은 서비스 사용자 홈의 파일이라(ADR-0004·0005) 서버가 바뀌면 그날 상한이 새로 생긴다. 그런데 그 EC2는 `user_data_replace_on_change = true`라 `user_data` 한 글자에도 교체된다. 사람 구분은 `CloudFront-Viewer-Address` 하나라(ADR-0006) CloudFront를 거치지 않는 길이 있으면 꾸밀 수 있다.

## 결정
- **들어오는 길**: CloudFront `/api/*`는 v1이 이미 쓰는 VPC origin `portfolio-web`(80)으로 닿는다. 같은 EC2의 nginx가 `location /api/`를 `127.0.0.1:8787`로 넘긴다. 새 VPC origin과 새 보안 그룹 규칙은 없다. 넘김 설정은 계약(appraise-http.md §2·§5)을 바꾸지 않도록 [contracts/deploy.md](../../contracts/deploy.md) §6에 약속으로 둔다.
- **서버**: `howmuch` 사용자(진짜 홈)의 systemd 서비스로 돈다. 듣는 주소는 `127.0.0.1` 고정 그대로다(`api/` 고침 없음).
- **코드 올리기**: 서버 준비와 코드 올리기는 모두 **EC2 Instance Connect Endpoint**로 한다. main 커밋의 묶음을 EIC 터널로 보내 `releases/<sha>`에 풀고, `current` 링크를 바꾸고, 재시작한다. 홈과 `user_data`는 건드리지 않는다.
- **화면**: 같은 EC2의 nginx가 내준다. CloudFront 기본 동작은 그대로 둔다.
- **교체 막기**: v1 EC2에는 `prevent_destroy`를 걸어 교체 plan이 CI에서 멈추게 한다.
- **바꾼 일 (2026-10-28 14:10 사용자 결정)**: 14:05에는 '두 번째 VPC origin(8787) + 환경변수 `HOST`'(아래 대안 1)였다. 그런데 `HOST`가 CAREER-31 테스트 'AC-6 (5) 설정 한 곳 — 환경변수는 PORT 줄뿐'과 부딪혔다. 사용자는 테스트를 고치는 대신 `api/`를 바꾸지 않는 지금 길을 골랐다.

## 버린 대안
### 대안 1: 같은 EC2에 두 번째 VPC origin(http 8787) + 8787 규칙 + 환경변수 `HOST` (14:05 결정, 14:10 버림)
- 좋은 점: 서버가 계약(본문 JSON · 거절 뒤 업로드)을 중간층 없이 직접 지키고, 그 동작이 `api/` 테스트로 잡힌다. 원본 응답 시간 제한이 v1 원본과 따로다
- 나쁜 점: `api/`를 고쳐야 한다(`HOST`). 이것이 CAREER-31 'AC-6 (5) 환경변수는 PORT 줄뿐'과 부딪힌다. 서버 포트로 들어오는 규칙이 하나 더 생긴다. 같은 인스턴스에 VPC origin 둘이 되는지(plan I-12)는 문서로 부분 확인뿐이었다
- 왜 아님: 사용자가 CAREER-31 테스트를 고치지 않고 `api/`를 그대로 두기로 했다(14:10). 지금 길의 약점 — 시험되지 않는 nginx 설정 — 은 deploy.md §6 약속과 배포 뒤 서버 위 확인(CAREER-30 tasks D1 단계 5, Bedrock 0)으로 막는다

### 대안 2: ALB(공개) + CloudFront 접두사 목록
- 왜 아님: v1에 ALB가 없고 VPC origin이 이미 있다(I-2). 새 고정 요금(월 약 $16~25 어림)만 생긴다

### 대안 3: SSM으로 운영 · 묶음은 S3에서 받기 (1판 추천)
- 좋은 점: 들어오는 포트가 0이고 명령 기록이 남는다
- 나쁜 점: 나가는 길이 없어(I-3) SSM 인터페이스 엔드포인트 3개(월 약 $21~30 어림)와 `AmazonSSMManagedInstanceCore`(IAM)가 든다. S3에서 받으려면 'AL2023 저장소만'인 S3 엔드포인트 정책을 넓히고, 인스턴스 역할에 S3 권한을 더하고, 버킷을 새로 만들어야 한다
- 왜 아님: EIC 하나가 들어가는 길과 바이트 나르는 길을 요금 없이 함께 준다. EIC가 그 AMI에서 안 되면(I-4) SSM 엔드포인트가 대안이다

### 대안 4: 화면을 S3 버킷(OAC)으로, 기본 동작을 바꿈 (1판 추천)
- 좋은 점: 화면이 서버 컴퓨터와 떨어진다
- 나쁜 점: 버킷·OAC·버킷 정책·기본 동작 원본 변경·배포 역할 S3 쓰기가 더 든다
- 왜 아님: 기본 동작이 이미 같은 EC2 nginx를 가리키고 v1 화면이 따로 없다(I-1). 서버가 멈추면 감정도 안 되니 떨어진 이득이 작다

### 대안 5: 컨테이너(ECS·Docker)
- 왜 아님: 홈을 볼륨으로 따로 매야 하고(ADR-0005 위험) 이미지 저장소가 든다. 나가는 길도 없다

### 대안 6: `user_data`나 새 AMI로 배포 · 서버 준비
- 왜 아님: `user_data_replace_on_change = true`(I-5)라 곧 교체다 → 홈의 셈이 사라진다(AC-2)

### 대안 7: `ignore_changes = [user_data]`로 교체 막기
- 좋은 점: `user_data`를 바꿔도 교체되지 않는다
- 나쁜 점: 바꾼 것이 **조용히 무시된다**. 고친 사람은 반영됐다고 믿는다
- 왜 아님: `prevent_destroy`는 같은 경우에 plan을 오류로 멈춰 크게 실패한다

### 대안 8: `HOST` 상수를 `0.0.0.0`으로
- 왜 아님: 로컬 dev 서버도 같은 네트워크에 열린다(CAREER-29 U3). (14:10 뒤에는 대안 1과 함께 `HOST` 자체를 쓰지 않는다)

## 결과
### 좋아지는 것
- 새 고정 요금이 없다(엔드포인트 PR #2 빼고). 새 버킷도 없고 S3 엔드포인트 정책·인스턴스 역할도 그대로다
- CloudFront 기본 동작과 원본이 바뀌지 않는다 — `/api/*` 동작 하나만 더한다
- `api/`를 고치지 않고, 서버 포트로 들어오는 새 규칙도 없다(8787은 루프백만)
- 배포·되돌리기가 링크 바꾸기 + 재시작이고, 셈 파일은 배포와 상관없이 남는다. 서비스는 자기 코드를 고칠 수 없다(코드 주인 `root`)

### 나빠지는 것
- 재시작 몇 초 동안 `/api/*`가 nginx의 JSON 503 `unavailable`(deploy.md §6)을 낸다 — 무중단이 아니다
- 계약의 일부(본문 상한 · 요청·응답 버퍼링 · nginx가 직접 내는 오류의 본문 · 헤더 넘김 · 시간 제한)가 nginx 설정 안에 있다. 그 설정은 로컬·CI에서 시험되지 않고 **서버 위에서만** 확인된다
- `/api/*`의 원본 응답 시간 제한이 v1 원본 `portfolio-web`과 하나로 묶인다
- 재시작마다 사람별 셈·기억이 비워진다(ADR-0006 D1 그대로)
- 들어오는 출처가 'CloudFront 접두사 목록'이라, '우리 CloudFront뿐'은 규칙 한 줄이 아니라 '공인 주소 없음 + 사설 주소에는 우리 VPC origin만 닿음'의 두 사실로 성립한다
- 배포 역할(`bootstrap`, CI 밖)이 곧 'EC2에 `ec2-user`로 들어가 sudo하는 권한'이다
- v1 nginx 기본 페이지가 how-much 화면으로 바뀐다. `prevent_destroy` 때문에 v1을 `terraform destroy`로 내리려면 먼저 그 줄을 지워야 한다
- how-much 배포가 다른 저장소의 리소스 이름(contracts/deploy.md)에 기댄다

### 위험과 대비
- **v1 EC2 교체** → `prevent_destroy` · `user_data` 0줄 변경 · 있는 보안 그룹에 규칙만 더함 · PR마다 plan `grep`
- **nginx 넘김이 계약을 깸**(자기 HTML 오류 · 거절 뒤 업로드 동작이 바뀜 · 헤더를 지움 · 로그에 주소) → deploy.md §6 약속 · 첫 배포 뒤 서버 위 확인(CAREER-30 tasks D1 단계 5, Bedrock 0)과 밖에서 한 번 더(V1 단계 2). 다르면 공개하지 않는다. 계약 글을 바꿔야 하면 사용자 승인
- **들어오는 출처가 접두사 목록(CloudFront 전체)** → VPC origin 서비스 보안 그룹으로 좁힐지는 CAREER-30 plan D13(사용자 몫 — v1 80 규칙에도 영향)
- **그 AMI에 sshd·`ec2-instance-connect`가 없음(I-4)** → SSM 엔드포인트(대안 3)로 간다. 둘 다 안 되면 멈추고 사용자에게 묻는다
- **CloudFront가 브라우저가 보낸 `CloudFront-Viewer-Address`를 넘김(I-10)** → 배포 뒤 꾸민 헤더로 확인한다(Bedrock 0). 넘기면 멈추고 CloudFront Function 안을 묻는다
- **배포 역할이 넓음** → main 커밋만 · GitHub 환경 승인 · EIC 하나·인스턴스 하나·OS 사용자 하나로 좁힌다
- **서버가 여러 대가 됨** → 이 ADR과 ADR-0004·0005·0006을 함께 다시 본다

<!-- 틀 출처: ECC skills/architecture-decision-records (MIT, Affaan Mustafa) — Michael Nygard 형식을 옮김 -->

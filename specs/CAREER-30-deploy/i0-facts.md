# CAREER-30 I0 — 인프라 사실 (앞 세션이 2026-10-28 13:50 확인. 근거는 aws-infra-portfolio main 1ea4bf2 · PR #2 브랜치 bf5d8cf · PR #2 plan CI 로그)

- I-1 확인함: infra/cdn.tf `default_cache_behavior` → origin "portfolio-web"(VPC origin → EC2 http 80, `origin_protocol_policy = "http-only"`) · `allowed_methods = ["GET","HEAD"]` · 캐시 `Managed-CachingOptimized` · `default_root_object = "index.html"`. **오류 응답 사용자 지정(custom_error_response) 없음.** EC2에서 도는 것은 user_data의 `dnf install -y nginx; systemctl enable --now nginx` 뿐 → 기본 동작이 내주는 것은 **nginx 기본 페이지**(v1 화면이 따로 없음). ordered_cache_behavior 없음 · origin_request_policy 없음 · WAF 없음
- I-2 확인함: **CloudFront → EC2 길이 이미 있다 — `aws_cloudfront_vpc_origin.web`**(arn = aws_instance.web.arn, http_port 80). ALB 없음 · 공인 IP 없음. EC2 보안 그룹 `portfolio-web` 들어오기 = **CloudFront 관리형 접두사 목록 `com.amazonaws.global.cloudfront.origin-facing`에서 tcp 80만**(VPC origin 보안 그룹 참조가 아님). 8787 규칙 없음
- I-3 확인함: **밖으로 나가는 길 없음.** NAT 없음 · 공인 IP 없음(`map_public_ip_on_launch = false`) · 라우팅 표에 0.0.0.0/0 없음. 있는 것: S3 **게이트웨이** 엔드포인트 하나 — **정책이 `s3:GetObject` on `arn:aws:s3:::al2023-repos-ap-northeast-2-de612dc2/*`(AL2023 꾸러미 저장소)만** 허용. 보안 그룹 나가기 = S3 접두사 목록 443만(+ PR #2가 bedrock 엔드포인트 SG로 443 더함). **SSM용 인터페이스 엔드포인트(ssm·ssmmessages·ec2messages) 없음.** ⚠ 그래서 새 S3 버킷(묶음·화면)을 EC2가 받으려면 S3 엔드포인트 정책도 넓혀야 한다(D4 '가'의 'EC2가 S3에서 묶음 받기')
- I-4 확인함(코드): AMI 고정 `ami-0d8d71a28c118c486` = AL2023 · kernel 6.12 · **arm64**, `t4g.small`, IMDSv2만. **main에는 인스턴스 역할 없음**; PR #2가 역할 `portfolio-web`(인라인 `invoke-nova-pro`만)과 인스턴스 프로필을 붙임 — `AmazonSSMManagedInstanceCore` 없음. 확인 못 함: SSM 에이전트·`ec2-instance-connect` 꾸러미가 그 AMI에 있는지, dnf로 Node 22(`nodejs22`)를 받을 수 있는지(서버 안에서 봐야 함)
- I-5 확인함: AMI는 data source가 아니라 **고정 값**(locals, "바꿀 때는 PR로 교체 — 서버는 새로 만들어짐"). **`user_data` 인라인 + `user_data_replace_on_change = true`** → user_data를 한 글자라도 바꾸면 EC2 교체(셈 파일·홈 사라짐). `lifecycle` 블록 없음
- I-6 확인함: PR #2 plan CI(run 39705483346) — `Plan: 7 to add, 1 to change, 0 to destroy.` · '변경 1' = **`aws_instance.web will be updated in-place`**(iam_instance_profile 붙임). 교체 아님. (그 CI는 10/24 전 실행 — 머지 전에 다시 plan 확인)
- I-7 확인함: deploy.yml — `push` to main, paths `infra/**`·deploy.yml → `infra/`에서 init·fmt -check·validate·plan·**apply 전체**(루트 하나). plan.yml — PR에서 `infra/**` plan만(AWS_PLAN_ROLE_ARN). **bootstrap/은 CI 밖 — 사용자가 로컬 state로 apply**
- I-8 확인함: bootstrap/how-much.tf에 how-much용은 state 버킷 + **plan 역할(`github-actions-how-much-plan`, sub `...:pull_request`, ReadOnlyAccess)만**. 주석 "apply 역할은 나중에 따로". 같은 파일에 배포 역할을 둘 수 있으나 apply는 사용자 로컬(bootstrap)
- I-9 확인함: **인터넷 게이트웨이 있음**(network.tf `aws_internet_gateway.main`, 주석 "VPC 오리진 요구 사항"). VPC origin은 이미 쓰는 중
- I-10 확인 못 함: 코드로는 알 수 없음 → 배포 뒤 '꾸민 헤더' 확인 그대로

## 추천이 바뀔 수 있는 곳 (architect가 판단)
1. VPC origin·IGW·접두사 목록 들어오기가 **이미 있다** → D1은 새로 만들기보다 '있는 VPC origin을 쓴다'. 다만 지금 원본은 80(nginx). 후보: (a) 같은 VPC origin에 8787 원본 하나 더 / (b) **이미 있는 nginx가 `/api/`를 127.0.0.1:8787로 넘김** — 이 경우 `HOST` 고침(D2) 없이 루프백 그대로일 수 있음. 버린 이유(nginx 오류 HTML · 본문 버퍼링)가 '있는 nginx'에도 그대로인지 다시 봐 주세요(`proxy_request_buffering off` · `proxy_intercept_errors off` 등은 확인 못 함 — 짐작으로 쓰지 말 것). 보안 그룹이 'VPC origin SG'가 아니라 'CloudFront 접두사 목록'이라 AC-3('우리 CloudFront뿐')에 무엇이 남는지도
2. **나가는 길 없음 + S3 엔드포인트 정책이 AL2023 저장소만** → D3은 SSM(나가는 길 있음)이 아님. D4 '가'는 S3 엔드포인트 정책을 넓혀야 함(그 PR이 'S3로 가는 무료 지름길'의 정책을 바꾸는 일). 묶음을 EIC/SSH로 직접 밀어 넣는 안과 비교
3. **`user_data_replace_on_change = true`** → D7에 `ignore_changes = [user_data]`(또는 user_data를 절대 안 건드림)와 `prevent_destroy`가 필요. 서버 준비는 user_data가 아니라 운영 길로
4. 화면: v1 기본 동작은 nginx 기본 페이지 → D6 '가' 가능. 다른 후보: 화면 정적 파일을 같은 EC2 nginx가 내줌(새 버킷·OAC 없음) — 비교
5. 배포 역할은 bootstrap(사용자 로컬 apply)

- I-11 확인함(13:58): v1 주소 d2x05xzjhjvp9j.cloudfront.net → HTTP/2 200 · server: nginx/1.30.5 · VPC origin portfolio-web Deployed

## I0′ (앞 세션 10/28 14:10, AWS 문서 — 읽기만)
- I-4 (EIC 꾸러미) 확인함(문서): "If you launched your instance using one of the following AMIs, EC2 Instance Connect is pre-installed … AL2023 standard AMI" (EC2 사용 설명서 Install EC2 Instance Connect). 우리 AMI 이름 al2023-ami-2023.12.20260930.0-kernel-6.12-arm64 = standard(minimal 아님) → 미리 깔려 있음. 단 문서 기준 — 서버 안에서는 D1 단계에서 처음 봄. Node 22(dnf)는 여전히 확인 못 함
- I-12 부분 확인(문서): CloudFront 할당량에 "VPC origins per AWS account 25" · "Distributions associated with the same VPC origin 50"만 있고, 같은 리소스(EC2 ARN)에 VPC origin 하나만이라는 제한은 문서에 없음. 둘 만들 수 있다고 적은 글도 못 찾음 → PR-B plan/apply 때 실제로 확인(안 되면 D1 나)
- I-13 확인함(문서): 원본마다 Response timeout 1-120초(기본 30) · Keep-alive timeout(custom·VPC origin) 1-300초 · Connection timeout 1-10초. 지금 cdn.tf origin에는 시간 값을 안 적음 → 기본값
- 보안 그룹 문서(VPC origins): 들어오기 허용 방법 두 가지 — Option 1 CloudFront 관리형 접두사 목록 / Option 2 서비스가 만든 보안 그룹 CloudFront-VPCOrigins-Service-SG(VPC origin을 만든 뒤에만 가능, 더 제한적이라 우리 CloudFront 배포로만 좁힘). v1은 Option 1. → D1의 AC-3 위험(접두사 목록은 CloudFront 전체)을 Option 2로 줄일 수 있음 — architect 판단
- VPC origin은 IGW 필요(문서) — I-9와 맞음 · 서울(ap-northeast-2) 지원

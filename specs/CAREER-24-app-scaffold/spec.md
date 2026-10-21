[CAREER-24](https://culonculon98.atlassian.net/browse/CAREER-24)

상태: 승인됨 (2026-10-20)
<!-- 사용자가 읽고 승인하면 "상태: 승인됨 (YYYY-MM-DD)"로 바꾼다. architect는 '승인됨'일 때만 시작한다. -->

## 문제
`pipeline.config.json`의 `checks.app`가 모두 TODO이고 앱이 없어서, CI `checks / app`과 끝내기 전 검사가 '건너뜀'으로 통과한다 — 이대로면 다음 화면 PR(CAREER-22 등)이 lint·test·build를 한 번도 거치지 않고 머지될 수 있다.

## 완료 조건
- AC-1 앱이 뜬다
  - 주어진: 저장소를 새로 clone하고 앱 의존성을 설치한 상태
  - 할 때: 개발 서버를 켜고 브라우저로 연다
  - 그러면: 빈 화면이 아니라 "how-much" 글자가 보이고, 브라우저 콘솔에 에러가 없다
- AC-2 검사 명령이 채워졌다
  - 주어진: `pipeline.config.json`의 `checks.app`
  - 할 때: `lint` · `test` · `build` 값을 본다
  - 그러면: 셋 다 TODO가 아니고, 저장소 루트에서 그대로 돌리면 각각 종료 코드 0으로 끝난다 (CI가 루트에서 `bash -c`로 돌린다). 값은 사용자가 앞 세션에서 채운다 — 앱 쪽 스크립트 이름은 plan.md에서 정한다
- AC-3 테스트가 실제로 돈다
  - 주어진: `app/tests/`
  - 할 때: `checks.app.test`를 돌린다
  - 그러면: 출력에 통과한 테스트가 1개 이상 있다 (0개로 통과하지 않는다)
- AC-4 검사가 실패를 잡는다
  - 주어진: 앱이 AC-2를 만족하는 상태
  - 할 때: (a) `app/src/`에 쓰지 않는 변수를 하나 넣고 `lint`를 돌린다 (b) `app/tests/`에 항상 실패하는 테스트를 넣고 `test`를 돌린다 (c) `app/src/`에 문법 오류를 넣고 `build`를 돌린다
  - 그러면: 세 경우 모두 종료 코드가 0이 아니다 (확인 뒤 되돌리고, 결과는 세션 보고에 출력 그대로 적는다)
- AC-5 CI에서 건너뛰지 않는다
  - 주어진: 이 스토리의 PR
  - 할 때: CI `checks / app`이 끝난다
  - 그러면: 요약에 `통과: app.lint` · `통과: app.test` · `통과: app.build` 세 줄이 있고, 이 셋 중 '건너뜀'은 없다
- AC-6 만든 파일이 저장소를 더럽히지 않는다
  - 주어진: 의존성 설치와 build를 한 번 돌린 작업 폴더
  - 할 때: `git status`를 본다
  - 그러면: `node_modules`나 build 결과물 폴더가 추적되지 않은 파일로 나오지 않는다 (build 결과물은 `app/.gitignore`로 막는다 — 루트 `.gitignore`는 건드리지 않는다)

## 안 할 것
- 첫 흐름 화면(사진 올리기·마음 가격·사연 태그·결과 카드) — CAREER-22
- 아저씨 상태(갸웃·도장·퇴근), 도트 그림, 스타일 체계
- `api/` · AI 호출 · 감정 어댑터 — 가짜 감정 함수도 CAREER-22
- `infra/` · 배포 · 호스팅
- e2e(Playwright)와 `checks.app.e2e` — TODO로 두고 CAREER-22로 미룬다 (10/20 사용자 결정)
- TypeScript 전환, 라우터·상태 관리 라이브러리
- 루트 `.gitignore` 고치기

## 비용·남용 영향
없음 — AI 호출 없음, 새 입구(엔드포인트·업로드) 없음, 새 인프라 리소스 없음. (새 npm 의존성은 생기지만 그건 PR '새 의존성'·'결정' 칸에 적는다.)

## 정해진 것 (10/20 사용자 결정)
- 누가 무엇을 쓰나: `app/` 바로 아래 설정 파일(package.json · lock · Vite·lint 설정 · index.html · `app/.gitignore`)은 frontend-dev(`app_config` 구역, PR #4) · `app/src/`는 frontend-dev · `app/tests/`는 test-writer · `pipeline.config.json`의 `checks.app` 채우기는 사용자(앞 세션)
- e2e는 이번에 빼고 CAREER-22로 미룬다
- 뼈대(시작 화면 한 장 + 테스트 1개)는 에이전트가 만들고, CAREER-22 흐름도 그 위에서 에이전트 파이프라인으로 만든다(맡긴다 — 10/19 결정, 10/21 사용자 확인으로 이 줄 고침)

## 열린 질문
- 질문 4: Node 버전을 고정할지(CI는 지금 `lts/*`), lock 파일과 `npm ci`를 쓸지 — 담당: architect · 때: plan.md에서

# 판단 스킬 (2026-10-20 이직 칸, 사용자가 역할마다 정함)

## Senior-thinking-skills — 이 폴더에 고른 11개만 (MIT, songjiun10-collab)
- 출처 커밋: SOURCE-senior-thinking-skills · 라이선스: LICENSE-senior-thinking-skills
- 각 스킬은 SKILL.md(짧은 안내) + 모델별 파일. 실행 스크립트 없음. senior-engineer-mindset(라우터·훅)은 안 가져옴
- 역할 파일 frontmatter `skills:`로 시작할 때 실어 보냄

| 역할 | 스킬 |
|---|---|
| spec-writer | clarify-the-real-problem · verifiability-first · widen-the-solution-space |
| architect | premortem · weigh-tradeoffs · bite-sized-plan |
| test-writer | verifiability-first · premortem · verify-before-claiming (+ ponytail) |
| frontend-dev | verify-before-claiming (+ ponytail) |
| infra-dev | weigh-tradeoffs · search-first · verify-before-claiming · observability-and-instrumentation (+ ponytail) |
| reviewer | adversarial-review · verify-before-claiming · fresh-context-review · ponytail-review |
| release-ops | verify-before-claiming |

## ponytail — 플러그인으로 설치 (MIT, DietrichGebert, v5.3.2 확인)
- 수준 full. SubagentStart 훅이 규칙을 서브에이전트에 넣음 → `.claude/settings.json`의 `PONYTAIL_SUBAGENT_MATCHER`로 test-writer·frontend-dev·infra-dev에만
- 기록판(ledger) 켬: 매 턴 비용·토큰·턴 수를 `~/.config/ponytail/band/<프로젝트>.csv`에. 웹훅은 비움(밖으로 안 나감)
- reviewer는 `/ponytail-review` 결과를 '고치면 좋은 것'에만

## 데스크톱에서 확인할 것
- 플러그인으로 깔린 스킬의 이름이 `ponytail-review`인지 `ponytail:ponytail-review`인지 → reviewer.md `skills:`를 맞춤
- 역할 세션에서 `skills:`가 실제로 실리는지(시험 운행 때)
- ponytail 플러그인 설치 범위: 이 프로젝트만

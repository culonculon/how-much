# 판단 스킬 (2026-10-20 이직 칸, 사용자가 역할마다 정함)

## Senior-thinking-skills — 이 폴더에 고른 11개만 (MIT, songjiun10-collab)
- 출처 커밋: SOURCE-senior-thinking-skills · 라이선스: LICENSE-senior-thinking-skills
- 각 스킬은 SKILL.md(짧은 안내) + 모델별 파일. 실행 스크립트 없음. senior-engineer-mindset(라우터·훅)은 안 가져옴
- 역할 파일 frontmatter `skills:`가 목록. `claude --agent`에서는 스스로 안 실려서(10/21 확인) 훅 ⑧(`.claude/hooks/load-skills.js`)이 모델별 파일 본문을 넣는다
- 10/21 사용자 결정: 생각하는 역할 3개(spec-writer · architect · reviewer)에 싣는다. 만드는 역할 3개는 훅 ⑥ 검사에 맡긴다. release-ops는 훅 ⑥이 없어 verify-before-claiming을 남겨 둠(커밋 전 사용자 확인)

| 역할 | 스킬 |
|---|---|
| spec-writer | clarify-the-real-problem · verifiability-first · widen-the-solution-space |
| architect | premortem · weigh-tradeoffs · bite-sized-plan |
| test-writer | 없음 — 훅 ⑥ (+ ponytail) |
| frontend-dev | 없음 — 훅 ⑥ (+ ponytail) |
| infra-dev | 없음 — 훅 ⑥ (+ ponytail) |
| reviewer | adversarial-review · verify-before-claiming · fresh-context-review (+ 플러그인 ponytail-review는 필요할 때 부름) |
| release-ops | verify-before-claiming |

## ponytail — 플러그인으로 설치 (MIT, DietrichGebert, v5.3.2 확인)
- 수준 full. 플러그인 SessionStart는 역할을 안 봐서 `.claude/settings.json` env `PONYTAIL_DEFAULT_MODE=off`로 끄고, 훅 ⑧이 `PONYTAIL_SUBAGENT_MATCHER` 역할(test-writer·frontend-dev·infra-dev)에만 규칙 복사본(`.claude/hooks/vendor/ponytail/full.md`)을 넣는다(10/21)
- 기록판(ledger) 켬: 매 턴 비용·토큰·턴 수를 `~/.config/ponytail/band/<프로젝트>.csv`에. 웹훅은 비움(밖으로 안 나감)
- reviewer는 `/ponytail-review` 결과를 '고치면 좋은 것'에만

## 데스크톱에서 확인할 것
- 플러그인으로 깔린 스킬의 이름이 `ponytail-review`인지 `ponytail:ponytail-review`인지 → reviewer.md `skills:`를 맞춤
- 역할 세션에서 `skills:`가 실제로 실리는지(시험 운행 때)
- ponytail 플러그인 설치 범위: 이 프로젝트만

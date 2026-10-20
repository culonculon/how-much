# ECC에서 가져온 훅 (MIT)

- 출처: github.com/affaan-m/ECC v2.2.3, 커밋은 SOURCE_COMMIT. 저작권 표시는 LICENSE.
- 2026-10-20 이직 칸에서 사용자가 하나씩 정함. 통째 설치 X — 이 세 파일만.

| 파일 | 붙일 곳 | 하는 일 |
|---|---|---|
| block-no-verify.js + lib/shell-scan.js | 모든 역할 PreToolUse(Bash) | `--no-verify`·`core.hooksPath` 등 git 훅 우회 막기. `bash -c` 속도 잡음. shell-scan은 우리 apply·강제 push 막기 훅에서 재사용 |
| config-protection.js | frontend-dev · test-writer PreToolUse(Write/Edit) | 이미 있는 린터 설정 고치기 막기. **how-much 추가**: vitest.config · playwright.config · .gitleaks.toml · .trivyignore · .github/workflows/ 안 기존 파일. 새로 만드는 건 허용 |

- 고친 곳: config-protection.js의 `HOWMUCH_PROTECTED`, `HOWMUCH_PROTECTED_DIRS` 두 군데뿐.
- infra-dev는 .github/**를 써야 하므로 config-protection을 붙이지 않는다.
- 10/20 클라우드에서 node로 확인: vitest.config.js·기존 workflow 수정 → 막힘(2) / 일반 파일·새 workflow → 통과(0) / `git commit --no-verify`·`bash -c "…--no-verify"`·`-c core.hooksPath=` → 막힘(2)

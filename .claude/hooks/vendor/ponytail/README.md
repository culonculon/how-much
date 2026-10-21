# ponytail 규칙 복사본 (MIT, DietrichGebert/ponytail)

- 버전 5.3.2. `full.md`는 플러그인의 `getPonytailInstructions('full')` 출력을 그대로 저장한 것(2026-10-21). 고치지 않는다.
- 왜 복사했나: 플러그인 SessionStart 훅은 `agent_type`을 보지 않아 `--agent`로 연 모든 역할에 실린다.
  `.claude/settings.json` env `PONYTAIL_DEFAULT_MODE=off`로 끄고, 훅 ⑧(`load-skills.js`)이
  `PONYTAIL_SUBAGENT_MATCHER` 역할에만 이 파일을 넣는다(10/21 사용자 결정 (가)+(가-1)).
- 플러그인은 켜 둔다 — reviewer의 `ponytail:ponytail-review`와 기록판(ledger)은 플러그인 것을 쓴다.
- 플러그인을 올리면: 새 버전에서 같은 명령으로 `full.md`를 다시 만들고 이 줄의 버전을 바꾼다.
  `node -e "process.stdout.write(require('<플러그인 폴더>/hooks/ponytail-instructions').getPonytailInstructions('full'))" > full.md`
- 라이선스: `LICENSE`

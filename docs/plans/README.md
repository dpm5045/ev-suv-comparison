# Plans

Design plans for any change bigger than a small fix (CLAUDE.md, workflow rule 2).

1. Write the plan here as `docs/plans/<name>.md` on the feature branch, and commit it.
2. Have Codex critique it: `codex exec "Review docs/plans/<name>.md as a senior architect. Follow the Plan Review Rules in AGENTS.md. List problems by severity."` For large or risky changes (data format, pipelines, workflows), open a plan-only PR and comment `@codex review` instead, so the critique stays on GitHub.
3. Revise the plan, show the owner the critique and the changes, and wait for the go-ahead before building.

A plan should cover: the goal, the approach and why it fits the existing structure, what it changes (data format, workflows, validator, URLs), migration and rollback, and the tests that prove it works.

The remediation work of November 2026 predates this folder; its plan is `docs/BUILD-SPEC.md`.

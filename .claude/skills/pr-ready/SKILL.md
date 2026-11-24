---
name: pr-ready
description: Run the full pre-PR routine from CLAUDE.md - the check suite in order, a Codex review against master, and a report of findings - before opening a pull request.
disable-model-invocation: true
---

# Ready a branch for a pull request

Runs CLAUDE.md workflow steps 3 and 4. Opening the PR (step 5) stays a separate, deliberate step.

## 1. Preconditions

- `git branch --show-current` must not be `master`. If it is, stop and say so.
- `git status --short`: uncommitted changes are fine to check, but note them; the Codex review compares the branch against master, so commit the intended changes before step 3 or the review may miss them.

## 2. Check suite (in order, stop at the first failure)

```bash
npm run validate && npm run lint && npm run typecheck && npm run test:refresh && \
  npm run test:unit && npm run build && npm run test:output && npx playwright test
```

The `&&` chain stops at the first failure; don't split it into separate lines in one shell call (a later passing command would hide an earlier failure).

On a failure, report the command and the relevant output, and fix it if the cause is in this branch's change. After any fix, here or after the Codex review, rerun the **whole** chain: a fix for one check can break an earlier one. Report the branch ready only when the full chain has passed on the final code. Don't skip a step.

## 3. Generated files

`npm run build` and `npm run typecheck` (next typegen) can rewrite `AGENTS.md` and `next-env.d.ts`. Run `git diff --stat -- AGENTS.md next-env.d.ts`:
- If the branch did not mean to change a file and its diff is only the generated churn, restore it with `git checkout -- <file>`.
- If the branch edits `AGENTS.md` on purpose, don't restore it; show the diff and keep only the intended part.

Never restore a file without looking at its diff first.

## 4. Codex review

```bash
codex review --base master < /dev/null
```

The `< /dev/null` is required: without it Codex waits forever for input. Allow up to 10 minutes.

## 5. Report

- Each check: passed, or what failed and how it was fixed.
- Each Codex finding: fixed (how) or declined (why). Never silently drop one (CLAUDE.md rule 7); declined findings also go in the PR description.
- Anything left uncommitted.

Then stop. Open the PR only when asked, or as the next step of a task that already asked for one.

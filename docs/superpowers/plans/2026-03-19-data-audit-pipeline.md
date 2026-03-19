# Data Audit Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the `/refresh` skill to support autonomous mode (default) with `--interactive` flag for current behavior, update the GitHub Actions reminder workflow, then execute today's point-in-time audit.

**Architecture:** Two files are modified for Deliverable 1 (`.claude/commands/refresh.md` and `.github/workflows/monthly-data-refresh.yml`). Deliverable 2 uses existing skills in sequence — no new files.

**Tech Stack:** Markdown (Claude Code skill), YAML (GitHub Actions)

**Spec:** `docs/superpowers/specs/2026-03-19-data-audit-pipeline-design.md`

---

### Task 1: Update `/refresh` skill for autonomous mode

**Files:**
- Modify: `.claude/commands/refresh.md`

- [ ] **Step 1: Add mode toggle header**

Replace the current opening paragraph (the text before the first `---`) with:

```markdown
Run the full 5-phase data refresh for `lib/ev-data.json`. All research is done in-session using WebSearch/WebFetch.

## Mode

- **Default (no arguments):** Autonomous mode — run all 5 phases end-to-end without pausing. Apply changes as each phase completes. Present a single consolidated changelog at the end with one approve/reject decision.
- **`--interactive`:** Pause after each phase for individual approval (legacy behavior).

Check `$ARGUMENTS` for the `--interactive` flag. If present, follow the "Ask" prompts in each phase. If absent (default), skip all per-phase "Ask" prompts and continue to the next phase.

Process vehicles in batches of 3–4 to keep each phase manageable.

---
```

- [ ] **Step 2: Add conditional wording to per-phase approval gates**

In each of the 5 phases, find the "Ask:" lines by their text content (not line numbers — line numbers shift after Step 1) and replace each:

Phase 1: Replace `**Ask: "Apply pre-owned pricing updates?"** Only proceed after approval.` with:
```markdown
**Interactive mode only — Ask: "Apply pre-owned pricing updates?"** In autonomous mode, apply changes and continue.
```

Phase 2: Replace `**Ask: "Apply TBD resolutions?"** Only proceed after approval.` with:
```markdown
**Interactive mode only — Ask: "Apply TBD resolutions?"** In autonomous mode, apply changes and continue.
```

Phase 3: Replace `**Ask: "Apply spec corrections?"** Only proceed after approval.` with:
```markdown
**Interactive mode only — Ask: "Apply spec corrections?"** In autonomous mode, apply changes and continue.
```

Phase 4: Replace `**Ask: "Add any of these vehicles?"** If user approves, suggest using `/project:add-vehicle <name>` for a thorough addition, OR create skeleton entries with TBD fields for later filling.` with:
```markdown
**Interactive mode only — Ask: "Add any of these vehicles?"** In autonomous mode, log detected vehicles in the changelog but do NOT auto-add them (adding vehicles requires user judgment on trim selection). Continue to next phase.
```

Phase 5: Replace `**Ask: "Apply gap fills?"** Only proceed after approval.` with:
```markdown
**Interactive mode only — Ask: "Apply gap fills?"** In autonomous mode, apply changes and continue.
```

- [ ] **Step 3: Update Post-Phase Wrap-Up for autonomous mode**

Replace the Post-Phase Wrap-Up section (from `## Post-Phase Wrap-Up` through `**Ask: "Commit these changes?"**...`). Preserve the `---` separator and the Guardrails section that follows. New content:

```markdown
## Post-Phase Wrap-Up

After all 5 phases:

1. **Recalculate OTD values** for all entries:
   - `otd_new = (msrp + destination) * 1.06 + 905` (for entries where msrp is a number)
   - `otd_preowned`: parse `preowned_range`, apply `price * 1.06 + 905` to both low and high, format as `"$XX,XXX - $XX,XXX"`
   - Run: `node -e "import{recalculateAllOtd}from'./scripts/lib/otd-calculator.mjs';import{readFileSync,writeFileSync}from'fs';const d=JSON.parse(readFileSync('lib/ev-data.json','utf-8'));recalculateAllOtd(d);writeFileSync('lib/ev-data.json',JSON.stringify(d,null,2)+'\n');console.log('OTD recalculated')"`

2. **Update count totals** — sum each year column across `count_data` rows, update `count_totals`.

3. **Run validation** via `/project:validate` checks (or `node -e` with the validator).

4. **Present a consolidated changelog:**

```
=== Data Refresh Changelog — YYYY-MM-DD ===

Phase 1 — Pre-owned Pricing: N updates
Phase 2 — TBD Resolution: N fields resolved
Phase 3 — Spec Corrections: N corrections
Phase 4 — New Vehicles: N detected (not auto-added)
Phase 5 — Gap Filling: N fields filled

Post-processing:
  - OTD values recalculated
  - Count totals updated
  - Validation: X errors, Y warnings

[Full details tables for each phase below]
```

Include the detailed comparison tables from each phase below the summary.

All 5 phases are always listed, even if a phase found 0 changes.

5. **Ask: "Apply all changes and commit?"**
   - If approved: create a checkpoint commit with a descriptive message.
   - If rejected: run `git checkout -- lib/ev-data.json` to revert all changes.

**Error handling:** If a phase fails mid-way (network error, ambiguous data), skip that phase, note the failure in the changelog (e.g., "Phase 3 — Spec Corrections: SKIPPED (network error)"), and continue with remaining phases.
```

- [ ] **Step 4: Verify the updated skill reads correctly**

Read `.claude/commands/refresh.md` end-to-end and confirm:
- The mode toggle header is at the top
- All 5 phases have conditional approval gates
- Phase 4 (New Vehicles) does NOT auto-add in autonomous mode
- Post-Phase Wrap-Up has the consolidated changelog format
- Error handling is documented
- Guardrails section is unchanged

- [ ] **Step 5: Commit**

```bash
git add .claude/commands/refresh.md
git commit -m "feat: add autonomous mode to /refresh skill (default, --interactive for legacy)"
```

---

### Task 2: Update GitHub Actions workflow

**Files:**
- Modify: `.github/workflows/monthly-data-refresh.yml`

- [ ] **Step 1: Update workflow name and issue body**

Change line 1 from `name: EV Data Refresh Reminder` to:
```yaml
name: Bi-Weekly Data Refresh Reminder
```

Replace the issue body array (lines 25-38) with:
```javascript
body: [
  '## Time to refresh EV data',
  '',
  '### Pre-flight',
  'Run `/project:validate` to check current data state.',
  '',
  '### Refresh',
  'Run `/project:refresh` — this runs all 5 phases autonomously and presents a single changelog for review.',
  '',
  'If you need more control over individual phases, use `/project:refresh --interactive`.',
  '',
  '### Post-flight',
  'Review the changelog, approve changes, and the commit is created automatically.',
  '',
  '---',
  `*This issue auto-closes in 3 days. Created by [monthly-data-refresh.yml](../../.github/workflows/monthly-data-refresh.yml).*`,
].join('\n'),
```

- [ ] **Step 2: Verify the workflow YAML is valid**

Read the file and confirm:
- YAML structure is valid (indentation correct)
- Cron schedules unchanged (1st and 15th)
- `workflow_dispatch` still present
- Stale issue cleanup step unchanged

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/monthly-data-refresh.yml
git commit -m "ci: update data refresh reminder with autonomous mode instructions"
```

---

### Task 3: Execute point-in-time audit

This task uses existing skills in sequence. No files are created or modified by the plan — the skills handle all data changes.

- [ ] **Step 1: Run `/project:validate`** to establish baseline. Note any errors or warnings.

- [ ] **Step 2: Spot-check batch 1** — Run `/project:spot-check` on: Kia EV9, Hyundai IONIQ 9, Rivian R1S

- [ ] **Step 3: Spot-check batch 2** — Run `/project:spot-check` on: Tesla Model X, Tesla Model Y (3-Row), Volvo EX90

- [ ] **Step 4: Spot-check batch 3** — Run `/project:spot-check` on: Cadillac Escalade IQ, Lucid Gravity, Volkswagen ID. Buzz, VinFast VF9

- [ ] **Step 5: Run `/project:scan-watchlist`** to check watchlist and 2027 vehicles.

- [ ] **Step 6: Run `/project:update-pricing`** with scope "all" to catch pricing drift.

- [ ] **Step 7: Run `/project:validate`** again to confirm data integrity after all changes.

- [ ] **Step 8: Commit** — single checkpoint commit summarizing all audit findings and corrections.

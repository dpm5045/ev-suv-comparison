# Data Audit Pipeline Design

**Date:** 2026-03-19
**Status:** Approved

## Problem

Data accuracy is the app's most critical attribute. The dataset (140 trims, 17 vehicles) has no recurring validation cadence — updates are ad-hoc. A bi-weekly GitHub Actions reminder exists (`monthly-data-refresh.yml`) but the `/refresh` skill requires manual approval at each of 5 phases, making it friction-heavy. No full audit of the dataset has been performed against live sources.

## Solution

Two deliverables:

1. **Enhanced bi-weekly pipeline** — update `/refresh` to run autonomously with a single approval gate, and improve the GitHub Actions issue body
2. **Point-in-time audit** — one-time full sweep of all active vehicles today using existing skills

---

## Deliverable 1: Enhanced Bi-Weekly Pipeline

### Changes to `/refresh` skill

**Mode toggle:**
- **Default (no arguments):** Autonomous mode — all 5 phases run end-to-end without pausing. A single consolidated changelog is presented at the end with one approve/reject decision.
- **`/refresh --interactive`:** Preserves current behavior — pauses after each phase for individual approval.

**Consolidated changelog format:**

```
=== Data Refresh Changelog — YYYY-MM-DD ===

Phase 1 — Pre-owned Pricing: N updates
Phase 2 — TBD Resolution: N fields resolved
Phase 3 — Spec Corrections: N corrections
Phase 4 — New Vehicles: N detected
Phase 5 — Gap Filling: N fields filled

Post-processing:
  - OTD values recalculated
  - Count totals updated
  - Validation: X errors, Y warnings

[Full details tables for each phase below]

Apply all changes and commit? (y/n)
```

**Behavior in autonomous mode:**

Since `/refresh` is a Claude Code prompt skill (not a programmatic script), "autonomous mode" means Claude runs all 5 phases sequentially in conversation, applying changes to `lib/ev-data.json` as it goes (same as today), but without pausing for per-phase approval. The key difference is presentation — instead of asking after each phase, Claude accumulates a changelog in conversation context and presents it all at the end.

- Each phase runs its web research, applies changes to `ev-data.json`, and logs what changed
- After all 5 phases: run OTD recalculation (`scripts/lib/otd-calculator.mjs`) and update count totals
- Run `/validate` checks against the updated file on disk
- Present the full consolidated changelog
- On approval: commit the changes
- On rejection: `git checkout -- lib/ev-data.json` to revert all changes
- All 5 phases are always listed in the changelog, even if a phase found 0 changes (e.g., "Phase 4 — New Vehicles: 0 detected")

**Error handling:** If a phase fails mid-way (network error, ambiguous data), skip that phase, note the failure in the changelog, and continue with remaining phases. The changelog will clearly flag which phases completed and which were skipped, so the user can re-run individual phases ad-hoc if needed.

**No changes to:**
- Phase definitions (the 5 phases remain identical)
- Guardrails (protected fields, sync requirements)
- Individual skills (`/spot-check`, `/update-pricing`, `/validate`) — these remain available for ad-hoc use

### Changes to GitHub Actions workflow

Update `monthly-data-refresh.yml`:

1. Rename workflow from "EV Data Refresh Reminder" to "Bi-Weekly Data Refresh Reminder" (cosmetic, for clarity — it already runs on the 1st and 15th)
2. Update issue body to:

```markdown
## Time to refresh EV data

### Pre-flight
Run `/project:validate` to check current data state.

### Refresh
Run `/project:refresh` — this runs all 5 phases autonomously and presents a single changelog for review.

If you need more control over individual phases, use `/project:refresh --interactive`.

### Post-flight
Review the changelog, approve changes, and the commit is created automatically.

---
*This issue auto-closes in 3 days.*
```

---

## Deliverable 2: Point-in-Time Audit (2026-03-19)

A one-time procedure using existing skills in sequence. Not a new skill.

### Step 1: Structural validation
Run `/project:validate` to establish baseline. Fix any errors before proceeding.

### Step 2: Active vehicle spot-checks
Run `/project:spot-check` on each active vehicle (non-watchlist vehicles with current or past model year trims). As of 2026-03-19 these are: Kia EV9, Hyundai IONIQ 9, Rivian R1S, Tesla Model X, Tesla Model Y (3-Row), Volvo EX90, Cadillac Escalade IQ, Lucid Gravity, Volkswagen ID. Buzz, VinFast VF9.

Work in batches of 3-4 vehicles per round to keep each research session manageable. Full field-by-field comparison against OEM and EPA sources. Focus on high-value fields: MSRP, destination, range, HP, battery, charging, towing, pre-owned pricing.

### Step 3: Watchlist pulse check
Run `/project:scan-watchlist` to confirm watchlist and 2027 vehicles are still on track. Check for announcements, cancellations, or newly released specs.

### Step 4: Pre-owned pricing sweep
Run `/project:update-pricing` across all vehicles with a used market to catch pricing drift.

### Step 5: Post-audit validation
Run `/project:validate` again to confirm data integrity after all changes.

### Step 6: Commit
Single checkpoint commit summarizing all audit findings and corrections.

### Scoping
- Active vehicles: full depth (all fields verified against live sources)
- Watchlist vehicles: light check (still coming? key specs changed?)
- Work in batches of 3-4 vehicles per spot-check round

---

## What's NOT changing

- The 5-phase definitions in `/refresh` remain identical
- Individual skills (`/spot-check`, `/update-pricing`, `/validate`, `/scan-watchlist`) remain available for ad-hoc use between cycles
- Protected fields list unchanged
- GitHub Actions cron schedule unchanged (1st and 15th of each month)
- The `data-validator.mjs` and `otd-calculator.mjs` scripts unchanged

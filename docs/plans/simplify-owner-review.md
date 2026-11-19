# Plan: the owner's merge is the approval (simplify WP-F)

**Context:** a single-maintainer hobby site about three-row EVs. The owner's direction (2026-11-18): **no manual inputs**: no approval forms, no pasted hashes. The owner reads PR summaries and clicks Merge; that's all. This plan scales WP-F's approval machinery down to that, and keeps everything that runs automatically.

## Goal

Replace the "Approve data exception" workflow with a **"needs owner review" flag**:
- Sensitive changes no longer fail the `data-contract` check; they pass and are flagged for review.
- The owner's merge is the approval.
- Automated PRs carrying the flag never auto-merge (enforced when WP-I builds the bot flow).

## What stays (automatic, no input)

The `data-contract` check still **fails** on:
- invalid data (the schema: types, sentinels, third-row rules, counts, …);
- **an unsourced change**: any changed published value needs a full provenance record whose `value` matches, from an allowed domain, with a quote stating the value;
- rule files and data changed in the same PR;
- a deleted, legacy-edited or newly legacy provenance record (except a record removed along with a withdrawn value);
- reuse of a retired id, or a removal without its `retired-ids.json` entry;
- a growing known-violations baseline, or edits to the preowned table that break its agreement with `details`.

It still runs from the default branch (`pull_request_target`) and the base revision, and posts the `data-contract` status.

## What changes

1. **Approvals become review items.** Every place `validate-diff.mjs` now calls `need(...)` produces a **review item** instead of an error:
   - protected fields, availability, identity changes, row removals;
   - withdrawn values (to null, `TBD`, `N/A` or `No used market yet`);
   - range no longer an estimate;
   - schema version, other top-level content, the preowned table and baselines.

   A PR with review items **passes**, and the report lists them under "Needs the owner's review" with old → new and the source and quote, so the owner can read and merge.
2. **The flag.** The trusted workflow sets the status description to "Passed: N items need the owner's review", and adds the label **`needs-owner-review`** to the PR when there are review items (and removes it when there aren't). This needs `pull-requests: write` on the workflow token, which is used only for the label.
3. **Removed:** `.github/workflows/approve-data-exception.yml`, `scripts/schema/approvals.mjs`, the `--approvals` option, `proposal_sha256` binding to approvals, and their tests. The `hashes.mjs` functions stay (WP-I uses `patch_sha256`).
4. **Withdrawals and the no-market sentinel.** `No used market yet` joins `null`, `TBD` and `N/A` as a "blank" value: changing to it is a review item, not an evidence requirement. Step 3 normalizes 60 rows to it, so this matters.
5. **The preowned table can be removed.** The schema allows the top-level `preowned` key to be absent, and the type makes it optional. Removing it is a review item. `scripts/export-sheet.mjs` skips the table when absent. (Step 3 removes it.)
6. **Docs:** CLAUDE.md, AGENTS.md (code-review rule: a review item is not a failure), `.claude/commands/refresh.md` (agents never need approvals; sensitive changes are flagged), BUILD-SPEC and the WP-F plan (approvals are superseded), and the migration runbook.

## Bots (later, WP-I)

A bot PR that passes `build` and `data-contract` **with no review items** may auto-merge. One **with** review items waits for the owner. No other change to WP-I.

## Rollout

1. **This PR is rules-only**, so `data-contract` reports no data change, and it's merged by the owner. After merge, the `needs-owner-review` label is created automatically on first use.
2. **Next, the step 3 data PR:** sources where values are set (the Maybach seat count from mbusa.com); everything else is review items. The owner reads the summary and merges.

## Tests

- Update the contract tests: each former approval case now asserts a **review item** and **no error**, for protected cargo, seats, availability, identity, removal and withdrawals.
- Keep every failure case: unsourced, wrong domain, quote mismatch, rules and data together, and the rest.
- Add the no-market sentinel as a withdrawal, the preowned key removal, and a review-item count in the report.
- Delete the approval API tests.

## Out of scope

Everything else in WP-G to WP-K, which will be re-planned at the same simplified scale.

## Revisions after Codex's critique (2026-11-18)

| Codex finding | Change |
|---|---|
| P0: new rows could carry seat or cargo values with no review item, so a bot could auto-merge them | **Protected fields on a new row are review items too.** Every new row lists its seats, cargo and fold-flat values for the owner. Since any review item blocks a bot auto-merge (WP-I), automated writes to protected fields never land unseen. |
| P0: some review items said only "(previous)" / "(changed)", hiding the change (for example pricing assumptions) | **Review items show the actual values.** Top-level content (assumptions, glossary, sales figures, scope) is listed per changed entry or key with before → after, and so are the preowned table and baselines. |
| P1: converting the preowned-table checks to review items would let new or edited mismatches through | **While the table exists, a new or edited entry that matches no `details` row stays a hard failure.** Only removing the table, or removing an entry, is a review item. |
| P1: removing the table would leave a stale "Pre-owned" tab in the backup Claude Sheet | **`/sync-sheet` deletes the Pre-owned tab** when the export produces no Pre-owned CSV (`.claude/commands/sync-sheet.md`). |

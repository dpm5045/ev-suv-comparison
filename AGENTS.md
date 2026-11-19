# threerowev — review rules
Read CLAUDE.md for project context.

## Code Review Rules
- Treat any incorrect, missing, or unsourced vehicle spec as P0.
- Treat inconsistent units or implausible values as P1.
- Treat mobile layout breakage or a broken comparison table as P1.
- Flag duplicated logic and components that should be shared as P1.
- Flag changes that touch files unrelated to the PR's stated purpose.

### Data model (schema version 2)
- A source is a record in `lib/ev-data.provenance.json` keyed by the row's `id`, with `source_url`, `verified_on` and quoted `evidence`. A changed spec without one is P0.
- Every row has a unique, permanent `id`. Changing or reusing an `id`, or keying anything by `name` (seat variants share names), is P0.
- `availability` decides whether a trim is sold new; only `new` counts. Treat any code that infers "sold new" from a numeric `msrp` or a model year as P0.
- Sensitive changes (protected fields, availability, identity, removals, withdrawn values) are **flagged for the owner's review** by the `data-contract` check (label `needs-owner-review`); the owner's merge approves them. A flagged change is not a defect. Do flag one whose PR description doesn't explain it, or a bot PR that could auto-merge it.
- `msrp` is a number or null, never text ("N/A", "TBD"). `msrp_status` must fit `availability` (for example `historical` only on `used_only`). Showing a historical price as a current one is P0.
- `range_basis`: "EPA" may appear in generated text only for `epa` rows, which need a reviewed EPA mapping. A manufacturer estimate or an unverified range described as EPA is P0.
- Protected fields (`seats`, `cargo_behind_*`, `fold_flat`, `cargo_floor_width_in`) must not be changed by automation.

## Plan Review Rules
Files in docs/plans/ are design plans, not code. Review them as an architect:
- Does the approach fit the existing structure, or reinvent something that exists?
- What breaks: data format changes, existing workflows, the validator, published URLs?
- Missing steps: migration, rollback, tests that prove it works.
- Is there a simpler way to get the same outcome?
Treat a plan that could corrupt or misstate vehicle data as P0.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

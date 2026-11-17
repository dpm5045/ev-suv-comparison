# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# threerowev — build rules
## Stack
[framework, hosting, where the EV data lives]

## Workflow (always follow)
1. Never commit to main. Create a branch: feature/<short-name>.
2. For anything bigger than a small fix, write docs/plans/<name>.md first
   and stop for review before building.
3. Run `npm run validate` before opening a PR.
4. Open a PR with `gh pr create`. Summarize what changed and why.
5. After Codex reviews, read comments with `gh pr view --comments`,
   fix or reply to each, and push.

## Data rules
- Every spec value needs a source URL in the data file.
- Units: miles, inches, lbs, kWh. No mixing.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint 9 flat config (eslint.config.mjs); Next 16 has no `next lint`
npm run typecheck          # next typegen (route types) + tsc --noEmit
npm run test:unit          # Vitest unit tests for app/domain code (tests/unit)
npm run test:output        # After a build: checks generated FAQ, structured data and metadata (tests/output)
npm run validate # Data checks (also runs before every build)
npm run refresh:preowned   # Pre-owned repricing from CarGurus; dry run unless --apply
npm run refresh:watch      # EPA range check + manufacturer price-page watch; report only
npm run test:refresh       # Unit tests for scripts/refresh (node --test)
node scripts/refresh/fetch-page.mjs <url> [--grep re]   # Page as text, allowlisted sites; used by the data agent
node scripts/refresh/probe-sources.mjs                  # Which research sites answer from this machine
node scripts/export-sheet.mjs <dir>                     # CSV per table for the backup Claude Sheet (/sync-sheet)
```

`tests/unit` holds Vitest unit tests for app and domain code; `tests/e2e` holds the Playwright smoke suite. `.github/workflows/ci.yml` runs lint, type check, both test suites, the build and Playwright (against `next start`) on every PR and push to master. Use Node 22 (`.nvmrc`).

## Architecture

This is a **Next.js 16 App Router** app (React 19, TypeScript) focused on comparing 3-row AWD electric SUVs.

### Data flow

All vehicle data lives in **`lib/ev-data.json`** and is typed + exported via **`lib/data.ts`** as a single `DATA` object with four keys:
- `DATA.details` — array of `DetailRow` (one entry per trim)
- `DATA.counts` / `DATA.count_totals` — sales counts by model year
- `DATA.glossary` — field definitions
- `DATA.preowned` — pre-owned price rows
- `VEHICLE_CLASSES` — map of vehicle name → CSS class (for color-coded badges)

`lib/utils.ts` exports `fmtMoney` and `fmtNum`, which return `{ text, className }` objects used across all table/card rendering, and `fmtDate` for display dates.

### Component structure

Each former dashboard tab is a real route (thin server page with metadata wrapping a small client component in `components/pages/`):

```
app/
├── page.tsx            → HomeClient (OverviewTab — Speed Dating + chart teaser — and VehicleSummaryPanel)
├── news-radar/         → WatchListTab (arrivals, model-year news, departures)
├── comparison/         → ComparisonClient (ComparisonV2Tab + DetailPanel)
├── side-by-side/       → SideBySideTab
├── spec-select/        → SpecSelectClient (SpecSelectTab + DetailPanel)
├── glossary/           → GlossaryTab
├── market-insights/    → DataStories (four chart stories) + DataExplorer (scatter chart); the "Market Insights" tab
├── vehicles/[slug]/    → static per-vehicle page
└── compare/[slug]/     → static pairwise comparison page
```

Speed Dating ranking logic lives in `lib/speed-dating.ts` (scores only the trims that fit the chosen budget); chart data and headlines for the Market Insights tab live in `lib/data-stories.ts`. Old `/watch-list`, `/explore` and `/data` URLs redirect to `/news-radar` and `/market-insights`.

**Filter state is mostly URL-driven.** Most route clients read filter values from `useSearchParams()` and apply updates via `router.replace()` (no history entry per filter click); Side-by-Side uses `router.push()`, and the Market Insights Data Explorer keeps its filters in local state. Filters survive refresh and are shareable. Old `/?tab=X` URLs 301-redirect to the routes (see `redirects()` in `next.config.mjs`).

`DetailPanel` is controlled by local `detailIdx` state (index into `DATA.details`) since it doesn't need to be shareable.

### Responsive layout pattern

`ComparisonV2Tab` uses a dual-render pattern: a desktop `<table>` (`.cmp-table-view`) and a mobile card grid (`.cmp-card-view`). On mobile, a Cards/Table toggle button controls which is visible via CSS classes (`.cmp-table-forced` / `.cmp-card-hidden`). All styles are in `app/globals.css`.

### Runtime endpoints

Pages are statically generated, but the deployment is not purely static: `app/og/route.tsx` renders Open Graph images on the edge at request time. There is no API route (the old news proxy was removed).

## Data editing checklist

When modifying `lib/ev-data.json`, always verify:
- `details` and `preowned` arrays are in sync (matching `name`, matching `preowned_range`). Note `name` is **not unique**: seat variants of a trim (e.g. Model X 5/6/7-seat) share one name, so never use it alone as a key
- `count_data` row totals match actual detail entries per vehicle/year (the validator only checks `count_totals` against `count_data`, not against the rows; check this by hand)
- `count_totals` sums match `count_data` column sums
- Never store `otd_new` / `otd_preowned` in the JSON — they are computed at load in `lib/data.ts` (the validator errors if a stored OTD field appears)
- `VEHICLE_CLASSES` + `CLASS_THEMES` in `lib/vehicle-theme.ts` have entries for any new vehicle
- CSS class exists in `globals.css` for any new vehicle class (colors must match `CLASS_THEMES`)
- No hardcoded model/vehicle counts anywhere (always derive from DATA at runtime)
- `last_updated` (root-level key in `ev-data.json`) bumped to today's date on any data change — drives sitemap `lastModified`

### Pre-owned pricing and provenance

Pre-owned ranges are repriced by `scripts/refresh/preowned.mjs`, not by hand or by web research. It runs every Monday in GitHub Actions (`.github/workflows/preowned-refresh.yml`), which opens a data-only PR and merges it straight away. `scripts/refresh/watch.mjs` runs alongside it (`.github/workflows/data-watch.yml`): it checks stored ranges against the EPA vehicle file, corrects `range_mi` where EPA alone settles it (via an auto-merged PR), watches manufacturer pages for price changes, and commits what it last saw (`scripts/refresh/state/watch.json`) straight to the default branch; `vercel.json` skips the deploy for commits that only touch bookkeeping.

Whatever the scripts cannot settle goes to one open GitHub issue labelled `data-inbox`. `.github/workflows/data-agent.yml` runs Claude Code unattended on it every Monday after the watch, and does a full pass on the 1st of the month; its instructions are `.claude/commands/refresh-ci.md`. The agent only edits data files, and its PR is the one thing a person reviews; the workflow assigns it to the repo owner and requests their review. GitHub's cron is best effort, so every scheduled job runs off the hour and has a backup schedule a day later that runs only if the first never succeeded (`scripts/refresh/ran-since.sh`). Items it cannot settle go in `scripts/refresh/state/deferred.json`, which keeps them out of the inbox until their date (`needs_local` ones need a session on a home connection, because the source blocks cloud runners). The watch also tracks each model's headline MSRP on Car and Driver as a tripwire (a prompt to check the manufacturer). Car and Driver is a price source only for manufacturers that block automated requests (Tesla), from its per-trim specs pages; see "Prices when the manufacturer blocks automated requests" in `.claude/commands/refresh.md`. Rows whose range is knowingly a manufacturer estimate are listed in `scripts/refresh/accepted.json`. `lib/ev-data.provenance.json` holds the CarGurus baselines the script compares against (`preowned`) and per-row, per-field sources with a last-verified date (`fields`). The site does not import this file. See `.claude/commands/refresh.md` for the rules.

A browsable backup of every table (sources included) lives in the Claude Sheet "ThreeRowEV Data"; `/sync-sheet` refreshes it. The old Google Sheets sync is retired.

### Self-driving rank (computed at load)

`self_driving_tier` is what the car's system does today. `adas_hardware` / `adas_hardware_gen` / `adas_hardware_note` record the driver-assist hardware generation where it matters (Tesla HW3 vs HW4, Rivian Gen 1 vs Gen 2). `rankSelfDriving()` in `lib/data.ts` turns these into `self_driving_rank` (and `adas_downgraded`): older hardware with the same tier as that vehicle's current hardware ranks one tier lower. Every view (spec tables, Speed Dating, Data Explorer) ranks by `self_driving_rank`; `TIER_RANK` in `lib/data.ts` is the only tier ordering. Every detail row carries the three `adas_*` keys (null when not applicable); the validator checks them.

### OTD formula (computed at load, never stored)

`otd_new`, `otd_preowned`, `preowned_low`, and `preowned_high` are derived in `lib/data.ts` (`enrich()`) — the JSON stores only `msrp`, `destination`, and `preowned_range`:

```
otd_new      = (msrp + destination) * 1.06 + 905
otd_preowned = price * 1.06 + 905   (applied to both ends of preowned_range)
```

Assumptions (from `ev-data.json` → `assumptions` array): PA sales tax 6%, doc fee $422, title+reg $233, EV road-use fee $250. Total fees = $905. The constants live in `lib/data.ts` as `OTD_TAX_RATE` / `OTD_FIXED_FEES`.

### Protected fields

Never auto-modify these — they are intentionally set per seat configuration:
`seats`, `cargo_behind_3rd_cu_ft`, `cargo_behind_2nd_cu_ft`, `cargo_behind_1st_cu_ft`, `fold_flat`, `cargo_floor_width_in`

## Approved web sources for data research

When refreshing or auditing vehicle data, Claude is pre-approved to fetch from these sources without requiring per-site confirmation:

- **OEM sites**: rivian.com, tesla.com, kia.com, hyundaiusa.com, cadillac.com, mbusa.com, volvocars.com, lucidmotors.com, vw.com, subaru.com, toyota.com
- **Automotive reference**: edmunds.com, kbb.com, cars.com, caranddriver.com, truecar.com, carfax.com, carbuzz.com, insideevs.com, electrek.co, topspeed.com
- **Specs databases**: evkx.net, evspecifications.com, fueleconomy.gov
- **General reference**: en.wikipedia.org, usnews.com (cars section)

# Git workflow

IMPORTANT: Maintain clean git hygiene throughout the session.
Aim to create a checkpoint commit roughly every 30–60 minutes of active coding, or sooner when a meaningful milestone is completed.
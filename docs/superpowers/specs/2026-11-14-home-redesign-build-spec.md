# Home Redesign, Data Tab and News Radar — Build Spec

**Date**: 2026-11-14
**Purpose**: Rebuild the home page around Speed Dating, move all charts to a new Data tab with editorial-style chart stories, and rename the Watch List tab to News Radar.
**Who this is for**: the engineer or coding agent doing the build. You need no context beyond this file, the two mock files beside it, and the repo.

## How to work

- Read `CLAUDE.md` at the repo root first.
- Do the tasks in order. Each task is one commit. Do not combine tasks.
- After every task run the checks in "Verification". Do not move on while any check fails.
- Do not change anything this spec does not ask for. "Out of scope" at the end lists things to leave alone.
- If a task cannot be done as written (a file, function or class named here does not exist, or the change breaks something), stop and report what you found. Do not improvise a different design.
- Do not push. Commit locally only.

## The design mocks

Two mock files sit in `docs/superpowers/specs/2026-11-14-home-redesign-mock/`:

- `Main.dc.html` is the new home page.
- `Data.dc.html` is the new Data tab.

They are design files, not app code. Read them for layout, spacing, type sizes, colours and copy. Three things about them:

- Every style is inline and every colour is a hex value for the dark theme. In the app, use CSS classes in `app/globals.css` and the site's CSS variables instead (mapping below).
- The numbers and vehicle names in them are examples. In the app everything is computed from `DATA`.
- The hero image `src` is a canvas-only URL. In the app keep the existing `<picture>` element.

Colour mapping from the mocks to CSS variables:

| Mock hex | Use |
|---|---|
| `#0c0f14` | `var(--bg)` |
| `#151921` | `var(--surface)` |
| `#1c2230` | `var(--surface2)` |
| `#2a3347` | `var(--border)` |
| `#354059` | `var(--border-light)` |
| `#e8ecf4` | `var(--text)` |
| `#8b96ad`, `#a9b3c7`, `#c5cee0` | `var(--text-muted)` |
| `#5ba4f5` (`{{accent}}` in the mocks) | `var(--accent)` |
| `#fb923c` | `var(--orange)` |
| `#4ade80` | `var(--green)` |
| `#46536e` | new variable `--chart-muted` (Task 2) |

## Rules that apply to every task

- No hard-coded vehicle names, trim counts, prices or ranges in components. Derive them from `DATA` (`lib/data.ts`). The only exceptions are the editorial strings this spec places in `lib/data-stories.ts`.
- Do not edit `lib/ev-data.json`.
- Watch-list vehicles (`isWatchlistVehicle()` from `lib/data.ts`) are excluded from Speed Dating and from every chart.
- All styling goes in `app/globals.css` using CSS variables, so the light theme works. No new CSS files, CSS modules, Tailwind or dependencies. Do not use Chart.js for the new charts.
- Do not use `var(--text-dim)` for text smaller than 18px. Use `var(--text-muted)`.
- Interactive elements are real `<button>`, `<a>` or `<Link>` elements with a minimum height of 44px.
- Keep the existing reference implementation in mind: `components/tabs/WatchListTab.tsx` and the `wl-` block in `app/globals.css` show the card, type and spacing conventions.

---

## Task 1 — Rename Watch List to News Radar

The tab covers arrivals, model-year news and departures, so "Watch List" undersells it. Rename what users see. Do not rename code identifiers.

1. `components/DashboardNav.tsx`: change the tab to `{ id: 'watchlist', label: 'News Radar', href: '/news-radar' }`. Keep the id.
2. Move `app/watch-list/page.tsx` to `app/news-radar/page.tsx` (use `git mv`). In it set:
   - `title: 'News Radar — New, Upcoming & Discontinued 3-Row EVs'`
   - `description: 'Three-row electric SUVs on the way to the US, the latest model-year announcements, and the ones that have been discontinued.'`
   - `alternates: { canonical: \`${SITE_URL}/news-radar\` }`
3. `next.config.mjs`: the `redirects()` function returns an array built from `tabRoutes`. Append one more entry to the returned array: `{ source: '/watch-list', destination: '/news-radar', permanent: true }`.
4. `app/sitemap.ts`: change the `/watch-list` URL to `/news-radar`.
5. `app/vehicles/[slug]/page.tsx`: change `<Link href="/watch-list">Watch List →</Link>` to `<Link href="/news-radar">News Radar →</Link>`.
6. `tests/e2e/smoke.spec.ts`: in the watch-list test, go to `/news-radar` and expect the second tab's text to be `News Radar`. Add a test that `page.goto('/watch-list')` ends on a URL matching `/news-radar`.
7. `scripts/dev/screenshot-pages.cjs`: change `'/watch-list'` to `'/news-radar'`.
8. `CLAUDE.md`: nothing to change for this task.

Leave these names exactly as they are: `WATCHLIST_VEHICLES`, `isWatchlistVehicle`, `lib/watchlist.ts`, `WATCHLIST_META`, `components/tabs/WatchListTab.tsx`, the `TabId` value `'watchlist'`, and every `wl-` CSS class. Leave the page's own headline ("What's coming. What's changing. What's gone.") and section names unchanged.

**Done when.** The nav shows "News Radar" second; `/news-radar` renders the page; `/watch-list` redirects to it; the Lexus TZ vehicle page links to `/news-radar`.

---

## Task 2 — The Data tab

A new route `/data` that tells four chart stories, then offers the existing interactive explorer. It replaces `/explore` and takes over from the Market Insights section on the home page (the home page is changed in Task 4; do not touch `OverviewTab.tsx` in this task).

### 2a. Data helpers: `lib/data-stories.ts` (new file)

Pure functions, no React. Export the following.

**Shared definitions**

```ts
const dataYear = new Date(DATA.last_updated).getUTCFullYear()   // 2026 today
```

- **Base rows**: `DATA.details` rows whose `vehicle` is not a watch-list vehicle.
- **Recent rows**: base rows where `typeof msrp === 'number'` and `year >= dataYear - 1`.

**`trimsByYear(): { year: number; trims: number; models: number }[]`**
From `DATA.count_data`, excluding watch-list models. For each year key `y2021`, `y2022`, … up to and including `dataYear` (skip later years: the next model year is only partly announced and would look like a drop). `trims` is the column sum; `models` is the number of models whose count for that year is greater than 0.

**`priceRanges(): { vehicle: string; low: number; high: number }[]`**
From recent rows: per vehicle the minimum and maximum `msrp`. Sort ascending by `low`.

**`bestValueTrims(): { vehicle: string; year: number; trim: string; msrp: number; range: number; perMile: number }[]`**
From recent rows that also have a numeric `range_mi` greater than 0: per vehicle, the row with the lowest `msrp / range_mi`. `perMile` is that ratio rounded to a whole dollar. Sort ascending by `perMile`.

**Editorial constants** (the only hand-written chart copy; keep them together at the bottom of the file under a comment `// Editorial copy: review at each data refresh`)

```ts
export const PRICE_THRESHOLD = 65000
export const RANGE_BAND: [number, number] = [300, 335]
export const RANGE_STORY_HEADLINE = 'Between $50,000 and $90,000, range barely moves.'
export const CHOICE_STORY_NOTE = 'The jump came in 2024 and 2025, when Kia, Volvo, Cadillac and Volkswagen arrived.'
```

**Expected values with today's data** (use these to check your functions; they will change when the data does):

- `trimsByYear()`: trims 6, 6, 10, 23, 41, 46 and models 1, 2, 3, 4, 8, 11 for 2021–2026.
- `priceRanges()`: 13 vehicles; first is Tesla Model Y (3-Row) at 51,490; four vehicles have `low` under 65,000.
- `bestValueTrims()`: first is Tesla Model Y (3-Row) at $157 per mile; last is Volkswagen ID. Buzz at $299; nine of the 13 have `range` within 300–335.

### 2b. Chart components: `components/DataStories.tsx` (new file, `'use client'` not needed)

Build the four charts from plain elements and CSS, the way the mock does: bars are `<div>`s with percentage widths, the scatter plot is absolutely positioned dots in a `position: relative` box. No `<canvas>`, no chart library, no SVG.

Every story uses the same frame (see any story section in `Data.dc.html`):

```tsx
<section className="ds-story">
  <div className="ds-rule" />
  <div className="ds-kicker">1 · Choice</div>
  <h2 className="ds-headline">…</h2>
  <p className="ds-dek">…</p>
  <figure className="ds-figure" role="img" aria-label="…one sentence stating what the chart shows…">…</figure>
  <p className="ds-source">…</p>
</section>
```

Chart colour rule: marks are `var(--chart-muted)`; only the marks the headline talks about are `var(--accent)`. Text never takes a mark colour. Do not use per-vehicle brand colours in charts.

Give every mark a `title` attribute with its vehicle (or year) and value, so hovering shows it.

**Story 1 — Choice.** Two column charts side by side (they stack on narrow screens): "Trims on sale, by model year" and "Models on sale, by model year", from `trimsByYear()`. Value label above each column, year below, last column in accent.
- Headline (computed): `In {firstYear} there were {firstTrims} trims to choose from. Now there are {lastTrims}.` Write `firstTrims` as a word when it is under ten (six, not 6).
- Dek: if exactly one model was on sale in the first year, start with `In {firstYear} every one of them was a {that model}.` Then `CHOICE_STORY_NOTE`.
- Source: `Source: 3RowEV dataset. Counts US-market trims with three rows; announced models are on the News Radar.`

**Story 2 — Price.** One horizontal range bar per vehicle from `priceRanges()`, on a shared scale from $40k to the highest `high` rounded up to the next $10k. Axis ticks every $50k. Bars whose `low` is under `PRICE_THRESHOLD` are accent. A vehicle with one price gets a minimum bar width of 1.2%. Label to the right of each bar: `$55k–$74k`, or `$51k` for a single price. Put the chart in a box with `overflow-x: auto` and an inner `min-width: 620px`.
- Headline (computed): `Only {n} models start under $65,000.` with `n` as a word when under ten. Format the threshold from `PRICE_THRESHOLD`.
- Dek (computed): `Each bar runs from a model's cheapest trim to its most expensive. The {widest vehicle} alone spans ${spread rounded to $1,000}.`
- Source: `Source: 3RowEV dataset, model years {dataYear - 1}–{dataYear}. MSRP excludes destination. Highlighted: models starting under $65,000.`

**Story 3 — Range.** Scatter plot from `bestValueTrims()`: x is `msrp` from $40k to the highest value rounded up to the next $20k; y is `range` from 200 to 500 miles. Plot height 420px (320px under 768px wide). Horizontal grid lines every 50 miles, x ticks every $25k. A shaded horizontal band covers `RANGE_BAND`, labelled `300–335 miles`. Dots are 12px circles with a 2px ring in `var(--bg)`; dots with `range` of 400 or more are accent.
- Label these dots with the vehicle name: the three highest ranges, the lowest range, and the lowest `msrp`. Put the label to the right of the dot, or to the left when the dot is in the right-hand quarter of the plot.
- Headline: `RANGE_STORY_HEADLINE`.
- Dek (computed): `{count in band} of {total} models land between 300 and 335 miles whatever they cost. Only {count with range ≥ 400} break 400.` Use words for counts under ten, and capitalise the first.
- Source: `Vertical axis: rated range in miles. One dot per model, plotted at its best-value trim. Source: 3RowEV dataset, model years {dataYear - 1}–{dataYear}.`

**Story 4 — Value.** Horizontal bars from `bestValueTrims()`, one per vehicle, width `perMile / (max perMile × 1.07)`, value label `$157` after the bar. First and last bars are accent. Export this chart on its own as `CostPerMileChart` because the home page reuses it in Task 4.
- Headline (computed), exported as `costPerMileHeadline()`: `A mile of range costs ${best} in the {best vehicle}, and ${worst} in the {worst vehicle}.`
- Dek: `Sticker price per mile of rated range, each model's best-value trim.`
- Source: `Source: 3RowEV dataset, model years {dataYear - 1}–{dataYear}. MSRP excludes destination.`

### 2c. Styles

In `app/globals.css`:

- Add `--chart-muted: #46536e;` to `:root` and `--chart-muted: #b8b0a6;` to the `html[data-theme="light"]` block.
- Add a `/* ── Data stories ── */` block with the `ds-` classes. Take sizes from the mock: `ds-story` has `margin-top: 72px; border-top: 1px solid var(--border); padding-top: 28px` and stacks its children with a 14px gap; `ds-rule` is a 48×4px accent bar; `ds-kicker` is 12px uppercase mono, letter-spacing 0.14em, muted; `ds-headline` is 32px/1.15, weight 700, letter-spacing -0.02em (26px under 768px); `ds-dek` is 16px/1.55 muted; `ds-source` is 12px muted.
- The story column is narrower than the page: wrap the stories in `<div className="ds-column">` with `max-width: 880px; margin: 0 auto`.

### 2d. The page

Create `app/data/page.tsx` (server component):

- Metadata: `title: 'The 3-Row EV Market in Charts'`, `description: 'What the data says about choice, price and range in three-row electric SUVs, plus an interactive explorer for every trim.'`, canonical `/data`.
- `<Header activeTab="data" />`, then `<main className="main">` containing, in order:
  1. `<PageHeader eyebrow={\`Data · Updated ${formatted last_updated}\`} title="The three-row EV market, in four charts.">We spent a lot of evenings in spreadsheets so you don't have to. Here is what stood out, and then the whole dataset to poke at yourself.</PageHeader>` inside the `ds-column`.
  2. The four stories inside the `ds-column`.
  3. A section with `id="explore"`, heading "Explore it yourself", then the existing `<DataExplorer />` at full page width.
- In `components/DataExplorer.tsx`, replace its `<PageHeader …>` with a plain heading so the page has one `<h1>`: `<h2 className="ds-headline">Plot any two specs against each other.</h2>` followed by its existing intro sentence in a `<p className="ds-dek">`. Change nothing else in that file.

Then:

- `components/Header.tsx`: add `'data'` to the `TabId` union.
- `components/DashboardNav.tsx`: add `{ id: 'data', label: 'Data', href: '/data' }` to `TABS` between `comparison` and `glossary`.
- Delete `app/explore/page.tsx`. In `next.config.mjs` append `{ source: '/explore', destination: '/data', permanent: true }` to the redirects array.
- `components/Footer.tsx`: change the "Data Explorer" link to `<Link href="/data">Data</Link>`.
- `app/sitemap.ts`: change `/explore` to `/data`.
- `tests/e2e/smoke.spec.ts`: the explore test goes to `/data` and still expects a chart element inside `.explorer`. Add an assertion that the page contains the text `in four charts`.
- `scripts/dev/screenshot-pages.cjs`: change `'/explore'` to `'/data'`.

Format `last_updated` the way `WatchListTab.tsx` does in its `fmtDate` helper. Move that helper to `lib/utils.ts`, export it, and import it in both places.

**Done when.** `/data` shows the header, four stories and the working explorer; `/explore` redirects to `/data`; "Data" is in the nav between The Full Monty and Glossary and is highlighted on that page; both themes are legible; no chart overflows the page at 390px wide.

---

## Task 3 — Speed Dating logic

Move the ranking logic out of `components/tabs/OverviewTab.tsx` into a pure module and change three behaviours. No visual change in this task: `OverviewTab.tsx` keeps rendering what it renders today, using the new module.

### 3a. `lib/speed-dating.ts` (new file)

Move these from `OverviewTab.tsx` unchanged, and export them: `hasPreowned`, `PREFERENCE_OPTIONS`, `SELF_DRIVING_TIER_ORDER`, `selfDrivingOrdinal`, `VehicleScorable`, `extractMetric`, `normalizeScores`, `RankResult`, `computeRanks`, `formatRawMetric`. `OverviewTab.tsx` imports them from the new module.

Change `formatRawMetric` for `'storage'` to show one decimal when there is one: `${Number(value.toFixed(1))} cu ft`.

### 3b. New budget options

Replace the two bucket arrays (and export them from the module):

```ts
export const NEW_BUDGET_BUCKETS = [
  { id: 'under60', label: 'Under $60k', filter: (v: number) => v < 60000 },
  { id: '60to90', label: '$60k–$90k', filter: (v: number) => v >= 60000 && v <= 90000 },
  { id: '90plus', label: '$90k+', filter: (v: number) => v > 90000 },
  { id: 'all', label: 'Any price', filter: () => true },
] as const

export const PREOWNED_BUDGET_BUCKETS = [
  { id: 'under40', label: 'Under $40k', filter: (v: number) => v < 40000 },
  { id: 'under60', label: 'Under $60k', filter: (v: number) => v < 60000 },
  { id: '60plus', label: '$60k+', filter: (v: number) => v >= 60000 },
  { id: 'all', label: 'Any price', filter: () => true },
] as const
```

A budget id from an old shared link that is not in the active list (for example `40to55`) is treated as `all`. Normalise it once where `activeBudget` is computed.

### 3c. New defaults

Add and export:

```ts
export const SPEED_DATING_DEFAULTS = { condition: 'preowned', budget: 'under60', pref1: 'range', pref2: 'storage' } as const
```

In `OverviewTab.tsx`, the first-load effect currently defaults to New, All Prices and two random priorities. Change it to apply `SPEED_DATING_DEFAULTS` for whichever of the four values are missing from the URL. Remove `STARTER_PREFS` and the random shuffle. Replace the fallbacks `condition || 'new'` and `budget || 'all'` (both in the effect and where `activeCondition` / `activeBudget` are computed) with the defaults.

`handleCondition` keeps resetting the budget to `'all'` when the user switches condition.

### 3d. Score only what fits the budget

Today a vehicle that has any trim in budget is scored on its best trim across *all* trims, including ones far outside the budget. Fix it.

Add and export:

```ts
export interface SpeedDatingMatch extends VehicleScorable {
  trimCount: number           // rows in budget for this vehicle
  priceLow: number | null     // lowest price in budget: preowned_low when pre-owned, msrp when new
  priceHigh: number | null
  has6Seat: boolean
}

export function summarizeInBudget(rows: DetailRow[], isPreowned: boolean): SpeedDatingMatch[]
```

`rows` is the already-filtered list (condition, budget, six-seat filter applied, watch-list vehicles removed). Group by vehicle and compute every field **from those rows only**: `rangeHigh` (max numeric `range_mi`), `zeroTo60Best` (min numeric `zero_to_60_sec`), `cargo3High` and `cargo2High` (max numeric values), `dcChargeMin` (min numeric `dc_fast_charge_10_80_min`), `selfDrivingMax` (max `selfDrivingOrdinal`), plus the fields above. Use `null` where a vehicle has no numeric value.

In `OverviewTab.tsx`:

- Remove watch-list vehicles from `filteredDetails` (add `.filter((r) => !isWatchlistVehicle(r.vehicle))` at the start).
- Pass `summarizeInBudget(filteredDetails, isPreowned)` to `computeRanks` instead of the current `scorable` list.
- The existing results table keeps using `rawSummaries` for its displayed columns in this task. Only the ranking input changes.

**Expected result with today's data** for the defaults (pre-owned, under $60k, range then storage). Seven vehicles and 65 trims qualify. Match score is `Math.round(composite × 100)`:

| Rank | Vehicle | Score | Range in budget | Cargo behind 3rd row | Price from |
|---|---|---|---|---|---|
| 1 | Hyundai IONIQ 9 | 84 | 335 | 21.9 | $43,000 |
| 2 | Tesla Model X | 81 | 371 | 14.8 | $25,000 |
| 3 | Rivian R1S | 81 | 352 | 17.7 | $35,000 |
| 4 | Kia EV9 | 67 | 305 | 20.2 | $30,000 |
| 5 | Mercedes-Benz EQS SUV | 46 | 339 | 6.8 | $38,000 |
| 6 | Volvo EX90 | 40 | 300 | 11 | $56,000 |
| 7 | Volkswagen ID. Buzz | 31 | 234 | 18.6 | $42,000 |

Check this with a throwaway script or by loading `/` and reading the ranks. If your order or scores differ, your `summarizeInBudget` is wrong; do not adjust the scoring maths to match.

**Done when.** Opening `/` with no query string lands on Pre-Owned, Under $60k, Range (1) and Storage (2), with the ranking above; the old pre-owned link `/?condition=preowned&budget=40to55` shows "Any price" selected; the New condition still works.

---

## Task 4 — Rebuild the home page

Rebuild what `components/tabs/OverviewTab.tsx` renders to match `Main.dc.html`. Keep the component's props and the URL-driven filter behaviour exactly as they are (`components/pages/HomeClient.tsx` does not change).

### 4a. Remove

From `OverviewTab.tsx` delete: the six stat tiles and every `tilesFor…` function, `Tile`, `TILE_GENERATORS`; the "Speed Dating Results" table and its mobile accordion; the "How Is The Math Mathing?" card; `<ExploreTeaser />`; `<MarketInsights />`; and any helper left unused. Then delete `components/ExploreTeaser.tsx` and `components/MarketInsights.tsx` after confirming with a search that nothing else imports them.

Leave their CSS rules in `app/globals.css` (see Out of scope).

### 4b. Hero

Keep the existing `.overview-hero` two-column layout, the `<picture>` element with all its sources, and `onClick={toggleTheme}` on `.overview-hero-image` exactly as they are. Clicking the image is a deliberate hidden theme switch. Change only the text block:

- eyebrow (use the `page-eyebrow` class): `Let's go speed dating`
- `<h1 className="overview-hero-title">`: `Find your perfect 3-row EV.`
- `<p className="overview-hero-sub">`: `Shopping for a family hauler shouldn't take forty browser tabs. Answer three questions and we'll play matchmaker.`

Set `.overview-hero-image { border-radius: 20px; }` and raise `.overview-hero-sub` `max-width` to 460px.

### 4c. Layout

Below the hero, a two-column flex row that wraps (class `sd-layout`): the questions panel on the left (`flex: 1 1 320px; max-width: 380px`), results on the right (`flex: 999 1 560px; min-width: 0`). Below 768px the panel takes the full width and sits above the results.

### 4d. Questions panel (`sd-panel`)

A card (16px radius, 24px padding) with three numbered questions, each a small mono number, a 17px/600 label, and a row of pill buttons:

1. `New or pre-owned?` with pills `New` and `Pre-owned`.
2. `What's the budget?` with the active bucket list in its array order.
3. `What's most important?` with helper text `Pick two, in order. Your first pick counts for 60% of the score.` and one pill per `PREFERENCE_OPTIONS` entry.

Pills (`sd-pill`): 44px tall, fully rounded, 1px `var(--border-light)` border, transparent background. Selected pills in questions 1 and 2 (`sd-pill--on`): background and border `var(--text)`, text `var(--bg)`, weight 600. In question 3 the first pick (`sd-pill--first`) has an accent border, a background of `color-mix(in srgb, var(--accent) 16%, var(--surface))` and a 26px accent circle holding `1`; the second pick (`sd-pill--second`) is the same in `var(--orange)` with `2`. Set `aria-pressed` on every pill. Wire them to the existing `handleCondition`, `handleBudget` and `handlePref`.

Under the questions, separated by a top border:

- `{models} models and {trims} trims are still in the room.` where `models` is the number of ranked vehicles and `trims` is `filteredDetails.length`. Numbers in mono and `var(--text)`.
- A `<details className="sd-math">` whose `<summary>` is `How is the math mathing?` and whose body is the explanation the old math card used: `Each metric is normalized 0–1 across the vehicles in your budget.` followed by `Your first pick ({label}) counts 60%, your second ({label}) counts 40%.` or, with one pick, `Ranked by {label} only.` and, when six-seat is a pick, `Filtered to 6-seat vehicles only.`

### 4e. Results

Build the list from `summarizeInBudget(...)` sorted by rank (ties keep alphabetical order). For each match compute:

- `score = Math.round(composite × 100)`.
- For each effective pick, a bar: label from `PREFERENCE_OPTIONS`, value text from `formatRawMetric`, and a fill fraction. For range, storage and self-driving the fraction is `value / best value among the matches`. For 0–60 and charging speed (lower is better) it is `best value / value`. A missing value gives an empty bar and `—`.
- Price text: pre-owned `From $43k pre-owned` on the top card and `From $43k` elsewhere; new `$55k–$74k`, or `$51k` when low equals high.

The first pick's bars are `var(--accent)`; the second pick's are `var(--orange)`. Bar tracks are `var(--surface2)`.

**Top match card** (`sd-top`), the first match. Use `chartColor(vehicle, isLight)` from `lib/vehicle-theme.ts` with the `useIsLightTheme()` hook to tint it: `background: color-mix(in srgb, {color} 10%, var(--surface))` and `border-color: color-mix(in srgb, {color} 35%, var(--border))`, set as inline styles. 20px radius, 28px padding. Contents, as in the mock:
- a row with `#1`, the `<VehicleBadge>` (clicking it calls `onVehicleClick(vehicle)` when that prop is set; make it a `<button>`), and a green pill reading `It's a match`
- a one-sentence verdict, 24px/600, generated by these rules, using lower-case pick names (`range`, `storage`, `acceleration`, `charging speed`, `self-driving`):
  - best of all matches on both picks: `Leads the field on both of your picks.`
  - best on the first pick only: `The best {pick 1} in your budget.`
  - best on the second pick only: `The best {pick 2} of the bunch, with the {pick 1} to match.`
  - best on neither: `The best balance of {pick 1} and {pick 2} in your budget.`
  - one pick only: `The best {pick 1} in your budget.`
- the bars (8px tall)
- the price text and two links: `See trims` to `/vehicles/{toSlug(vehicle)}` and `Compare` to `/side-by-side?v1={encoded vehicle}`
- on the right, the score at 96px mono with the caption `match score`

**Runners-up.** If there is a second match, a heading `Also worth a second date` (20px/600) and a grid of cards for matches 2 and 3 (`sd-card`): rank, badge button, score at 36px mono, the bars (6px tall), price text and a `See trims` link.

**The rest.** If there are more than three matches, a card containing a table-like list (`sd-rest`) with the header `Still in the running` and one row per remaining match: rank, badge button, price text, then one bar-plus-value cell per effective pick. Put it in an `overflow-x: auto` box with an inner `min-width: 700px`. Under it, a 13px muted note: `Bars show each model against the best in your budget, counting only the trims that fit it.`

**No matches.** Show one card with `No trims match this {pre-owned price|budget} range.` and a pill button `Show any price` that calls `handleBudget('all')`.

### 4f. Chart teaser

Below the results, a section separated by a top border (`sd-teaser`, `margin-top: 96px; padding-top: 40px`), two columns that wrap:

- Left (`flex: 999 1 560px`): the story frame from Task 2 with kicker `Something we noticed`, headline `costPerMileHeadline()`, the dek and source lines from Story 4, and `<CostPerMileChart />`.
- Right (`flex: 1 1 260px; max-width: 340px`): a mono label `More in Data`, then three links to `/data`, each a 17px/600 line with a top border, using the three other story headlines (import the same headline builders the Data page uses, so the text always matches), then a pill link `Open Data` to `/data`.

### 4g. Styles

Add an `/* ── Speed Dating (home) ── */` block to `app/globals.css` with the `sd-` classes. Take sizes and spacing from `Main.dc.html`. Add phone rules to the existing `@media (max-width: 768px)` block that holds the `.overview-hero` rules: the score on the top card drops to 64px and the panel loses its `max-width`.

Update `tests/e2e/smoke.spec.ts`: read the existing "home renders overview" test and change what it looks for to content the new page has (the `h1` text `Find your perfect 3-row EV.` and the text `It's a match`). Do not delete the test or reduce it to a status check.

**Done when.** `/` matches the mock at 1440px in both themes; with no query string the top card is the Hyundai IONIQ 9 with a score of 84 and the bars read 335 mi and 21.9 cu ft; switching to New and Any price changes the results and the URL; picking a third priority replaces the first as it does today; the hero image still toggles the theme; nothing overflows at 390px; `components/MarketInsights.tsx` and `components/ExploreTeaser.tsx` are gone.

---

## Task 5 — Keep the docs in step

1. `CLAUDE.md`, "Component structure" list: add `app/data/` (DataStories + DataExplorer) and `app/news-radar/` (WatchListTab), remove `explore/`, and note that `lib/speed-dating.ts` holds the ranking logic and `lib/data-stories.ts` the chart data.
2. `.claude/commands/refresh.md`, "Post-Phase Wrap-Up": add a step after "Bump `last_updated`": `Review the editorial copy at the bottom of lib/data-stories.ts (headline, band and threshold constants) and lib/watchlist.ts against the refreshed data; update any line the new numbers contradict.`
3. `app/tech-stack/page.tsx`: its route list mentions `/explore`. Change that line to `/data`.

---

## Verification

Run after every task, from the repo root:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

All three must finish with no errors. The data validator's warnings about pre-release vehicles are expected.

Then check visually. This needs Google Chrome installed:

```bash
npx next start -p 3917 &
node scripts/dev/screenshot-pages.cjs /tmp/3rowev-shots
pkill -f "next start -p 3917"
```

Every line it prints must end in `ok`. Open the `-desk`, `-phone` and `-light` screenshots for the pages your task touched and compare them with the mock and the task's "Done when" list. The script captures only the top 2,000px of each page; for anything lower, take your own capture.

Run the smoke tests against the production build with installed Chrome. The repo's Playwright config expects a bundled Chromium that fails to download on this machine, and running it starts a dev server that overwrites the production build, so use a throwaway config outside the repo instead:

```js
// /tmp/pw-chrome.config.cjs
module.exports = {
  testDir: '<absolute path to the repo>/tests/e2e',
  timeout: 30000,
  use: { baseURL: 'http://localhost:3917', viewport: { width: 1280, height: 900 }, channel: 'chrome' },
}
```

```bash
npm run build && npx next start -p 3917 &
npx playwright test -c /tmp/pw-chrome.config.cjs
pkill -f "next start -p 3917"
```

All tests must pass. If Chrome is not available, say so in your report and list which "Done when" items you could not check. Do not claim a visual result you did not see.

## Commits

One commit per task, in order, with messages like `Rename Watch List tab to News Radar`. End each commit message with the attribution line your session is configured to use. Do not push.

## Final report

When finished, report:

- which tasks are done, with commit hashes
- for each task, which "Done when" items you verified and how (build output, probe, screenshot, or not verified)
- anything you could not do as written, and why
- anything you changed that this spec did not ask for (there should be nothing)

## Out of scope

- `lib/ev-data.json` and any vehicle data
- The News Radar page's content, layout and section names
- Spec & Select, Side-by-Side, The Full Monty, Glossary, About, vehicle and compare pages (apart from the one link in Task 1)
- The inside of `components/DataExplorer.tsx` apart from its heading
- Removing the now-unused CSS for the old home page (`.overview-stat*`, `.math-*`, `.glance-*`, `.insight-*`, `.mi-*`, `.explore-teaser*`). Leave it; list it in your report as a follow-up
- Showing the model year of the qualifying trim on match cards
- A tooltip library, animation, or chart interactions beyond the `title` attribute
- Renaming code identifiers that contain "watchlist"

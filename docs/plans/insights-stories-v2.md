# Plan: Market Insights v2 (fix three headlines, add three stories)

**Context:** a review of `lib/ev-data.json` against the Market Insights page and the home-page teaser (2026-11-23) found that three headlines rest on data choices a reader would not guess, and that the page has nothing for pre-owned buyers, nothing on depreciation and nothing on how usable the third row is. This plan fixes the first and adds the second.

All numbers below come from the data as of `last_updated` 2026-11-19. They are illustrations: every headline stays computed from `DATA` at build time, as today.

## Goal

1. **Choice story counts trims, not seat layouts.** "In 2021 there were six trims" is two Model X trims in three seat layouts.
2. **Value stories compare like with like: cars with an adult-size third row.** The home-page headline ("A mile of range costs $157 in the Tesla Model Y (3-Row)") features a car with 26.5" of third-row legroom, which the dataset's own note calls child-sized.
3. **Value stories compare AWD trims.** The site is about AWD SUVs, but the best-value trim for the IONIQ 9, EV9 and ID. Buzz is the RWD one.
4. **New story: the used market**: cost per mile of range, new vs pre-owned.
5. **New story: what a car keeps**: estimated pre-owned price as a share of original MSRP, by model year.
6. **New story: the third row**: third-row legroom against cargo space behind the third row.

## Approach: one comparison set, defined once

Items 2 and 3 are the same idea: the charts should compare the cars the site is about. Add one function in `lib/data-stories.ts`:

```ts
/** The set every Market Insights chart compares: AWD, adult-size third row. */
export function inComparisonSet(r: DetailRow): boolean
```

- **AWD:** `r.drivetrain.startsWith('AWD')` (covers `AWD` and `AWD (dual motor)`).
- **Adult-size third row:** `third_row_legroom_in` is a number ≥ `MIN_THIRD_ROW_LEGROOM_IN` (28, in the editorial block with the other thresholds). A row with no published legroom (VinFast VF9) stays in and is footnoted "legroom not published". A row whose third row is `N/A` (Maybach, 5 seats) is already out.

`recentRows()` and every story builder take this filter. Each chart's source line names what was left out, computed, not hand-written: "Leaves out RWD trims and the Tesla Model Y (3-Row), whose third row has 26.5 in of legroom."

This fits the existing structure: `data-stories.ts` is already the one place story data and headlines are derived, with thresholds in its editorial block. No data format change.

**What it changes on the page (today's data):**

| Story | Today | After |
|---|---|---|
| Price | "Only six models start under $65,000." | "Only four models start under $65,000." (Model Y L, IONIQ 9, VF9, EV9) |
| Value / home teaser | "$157 in the Tesla Model Y (3-Row), $288 in the Mercedes-Benz EQS SUV" | "$191 in the Tesla Model Y L, $299 in the Volkswagen ID. Buzz" |
| Range | best-value dots include RWD trims | AWD dots only; `RANGE_BAND` re-checked against the new dots |

**Not changed:** Speed Dating, the comparison tables and the Data Explorer keep showing RWD and the Model Y (3-Row), because those are real cars a shopper can buy. Only the market stories narrow. (Whether Speed Dating should flag a child-size third row is a separate question for the owner.)

## 1. Choice story: count trims

Count distinct trims per model year from `DATA.details`, not `count_data`. A trim is `vehicle | year | trim` with any `(N-seat)` suffix removed: Model X seat variants already share a `trim`, and Rivian's are written `Premium (7-seat)` / `Premium (6-seat)`.

- Today's series: 2, 4, 8, 21, 32, 41 trims (was 6, 6, 10, 23, 41, 45); models unchanged (1, 2, 3, 4, 8, 11).
- Headline: "In 2021 there were two trims to choose from. Now there are 41."
- Chart title: "Trims offered, by model year" (2021 cars are not on sale today). Source line: "Seat layouts of the same trim count once."
- The choice story stays on the full set (all drivetrains): it is about how much the market grew, not a like-for-like price comparison.
- `count_data` is unchanged and still validated; it just stops feeding this chart.

## 2. New story: the used market

**Headline (computed):** "A used Kia EV9 costs $118 per mile of range. New, it's $226."

**Chart:** a dumbbell per model: a hollow dot for its best new cost per mile, a filled dot for its best pre-owned cost per mile, joined by a line. Sorted by used cost. Models with no new price (Tesla Model X, discontinued) show the used dot only, labelled "no longer sold new".

**Calculation:** per model, over comparison-set rows with a parseable `preowned_range`, the lowest `midpoint(preowned_low, preowned_high) / range_mi`. The midpoint, not the low end, so one cheap outlier listing does not set the headline. New side reuses `bestValueTrims()`.

**Caveat in the source line:** "Pre-owned prices are estimated ranges for each trim, refreshed weekly from CarGurus market averages; range is when new, before battery wear."

## 3. New story: what a car keeps

**Headline (computed):** for the model with the longest history, e.g. "A three-year-old Rivian R1S keeps about half its sticker price."

**Chart:** small multiples, one per model with at least two model years of data: x = model year (oldest left), y = estimated used price as % of original MSRP, 0–100%. Models with one year show as a single labelled dot in a strip below. Today: Rivian R1S has 5 years (50% → 87%), Mercedes EQS SUV 3 (41% → 81%), EV9 2, and the rest 1.

**Calculation:** per `vehicle, year`, the median over rows of `midpoint(preowned_range) / msrp`, using rows where `msrp` is a number and `msrp_status` is not `unknown`.

**Framing:** this is a cross-section (today's prices for each model year), not a curve over time. The dek says so: "What each model year sells for today, as a share of what it cost new." We store no price history, so a true over-time curve is out of scope.

**Data prerequisite:** 40 priced used rows have no MSRP: every Tesla Model X year (2021–2026), Kia EV9 2024 (7) and 2025 (2), Rivian R1S 2026 (1). Without them the story has no Model X, which has the longest history. Step 0 below backfills them as **sourced `historical` MSRPs** under the data rules. The story ships with whatever is backfilled; a model with no MSRPs is simply absent.

## 4. New story: the third row

**Headline (computed):** e.g. "The ID. Buzz has the most third-row legroom, by ten inches. The EQS SUV has the least cargo space behind it."

**Chart:** a scatter, one dot per model (its newest on-sale trim with both values): x = third-row legroom (in), y = cargo behind the third row (cu ft). A dashed vertical rule at `MIN_THIRD_ROW_LEGROOM_IN` labelled "adult-size". Models missing a value are listed under the chart ("Not published: VinFast VF9 legroom").

This story uses **all on-sale models**, including the Model Y (3-Row), since it is the chart that explains the comparison-set rule.

## Shared build details

- Charts stay plain elements sized with percentages, as in `DataStories.tsx` (no chart library, server-rendered, themed through CSS variables). The dumbbell, small multiples and scatter reuse `.ds-*` classes; new classes go in `app/globals.css`.
- Colour rule unchanged: marks `--chart-muted`, only marks a headline talks about are `--accent`.
- Page order: Choice, Price, Range, Value, **Used, Keeps, Third row**. Page title becomes "The three-row EV market, in seven charts." (computed from the number of stories, not hard-coded).
- Home-page teaser: unchanged layout; its headline changes with item 2. Add the used-market headline to the "More in Market Insights" links.
- Every new headline and dek is a function of `DATA`; no hard-coded counts or names (CLAUDE.md).
- Text in numeric fields (`"TBD"`, `"N/A"`) is treated as missing by every builder (`typeof x === 'number'`), as today.

## Step 0: data PR (before the stories ship)

A separate, data-only PR, following the data rules (a provenance record per value, `msrp_status: historical`, no change without a source):

1. Backfill historical MSRP and destination for the 40 rows above. Sources: manufacturer archive pages where available, otherwise the approved reference sites (Car and Driver per-trim specs for Tesla, per `.claude/commands/refresh.md`).
2. Check the Tesla Model Y (3-Row)'s `availability: new` is still true. It no longer drives a headline after this plan, but it still appears in Speed Dating and price tables.

Changing `availability` is the owner's decision; the PR only proposes it.

## Tests

`tests/unit/data-stories.test.ts` (new), against small fixture rows, not live data:

- trim counting: Model X 5/6/7-seat variants count once; Rivian `(7-seat)`/`(6-seat)` count once; distinct trims count separately.
- `inComparisonSet`: RWD out; legroom 26.5 out; legroom null in; `AWD (dual motor)` in.
- used story: midpoint used; `"No used market yet"` skipped; a model with no new price still appears, flagged.
- depreciation: `msrp_status: unknown` skipped; median per vehicle-year; single-year models routed to the strip.
- third row: `"N/A"` and null go to the "not published" list.
- every headline function returns a sentence with no `NaN`, `undefined` or `Infinity` for the live data.

`tests/output/generated-pages.test.ts`: Market Insights renders seven stories and the page title matches the story count.

Playwright: Market Insights smoke test checks the new story headings are visible at phone width with no horizontal scroll.

## Rollout and rollback

1. Step 0 data PR (owner reviews, merges).
2. Code PR: items 1–3 (fixes), then items 4–6 (stories), in one branch with separate commits so either half can be reverted.
3. Rollback is a revert of the code PR. No data format change, no URL change, no validator change.

## Out of scope

- The data-quality items from the same review (L2 time consistency, `charging_type` cleanup, text in numeric fields, provenance for older spec fields, EPA range mapping). Each deserves its own plan.
- Changing Speed Dating or the comparison tables.
- A price-over-time history store.

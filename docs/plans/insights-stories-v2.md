# Plan: Market Insights v2 (fix three headlines, add three stories)

**Context:** a review of `lib/ev-data.json` against the Market Insights page and the home-page teaser (2026-11-23) found that three headlines rest on data choices a reader would not guess, and that the page has nothing for pre-owned buyers, nothing on depreciation and nothing on how usable the third row is. This plan fixes the first and adds the second.

All numbers below come from the data as of `last_updated` 2026-11-19. They are illustrations: every headline stays computed from `DATA` at build time, as today. A preview of every proposed chart, drawn with this data, is the artifact "Market Insights v2 Preview".

## Goal

1. **Choice story counts trims, not seat layouts**, and says it is about model years, not cars on sale today.
2. **Value stories compare cars with a 28-inch-plus third row.** The home-page headline ("A mile of range costs $157 in the Tesla Model Y (3-Row)") features a car with 26.5" of third-row legroom, which the dataset's own note calls child-sized.
3. **Value stories compare AWD trims.** The site is about AWD SUVs, but the best-value trim for the IONIQ 9, EV9 and ID. Buzz is the RWD one.
4. **New story: the used market**: cost per mile of range, new vs pre-owned.
5. **New story: what a car keeps**: estimated used price as a share of a sourced original MSRP, by model year. **Gated on sourced MSRPs (see "Open decision").**
6. **New story: the third row**: third-row legroom against cargo space behind the third row.

## Which rows each story uses

| Story | Rows | Rule |
|---|---|---|
| Choice | Historical offerings | Watch-list vehicles out (as today); model years ≤ the data year (as today); `availability` in `new` or `used_only` (an `announced` or `needs_review` row was never offered) |
| Price, Range, Value, Used | **The comparison set** (below) | `inComparisonSet(r)` |
| Keeps | Comparison set, plus a sourced original MSRP | See story 5 |
| Third row | Every on-sale model, including the Model Y (3-Row) | This is the chart that explains the cutoff |

**The comparison set**, one function in `lib/data-stories.ts`:

```ts
/** AWD, with a published third-row legroom of at least MIN_THIRD_ROW_LEGROOM_IN. */
export function inComparisonSet(r: DetailRow): boolean
```

- **AWD:** `r.drivetrain.startsWith('AWD')` (covers `AWD` and `AWD (dual motor)`).
- **Third row:** `third_row_legroom_in` is a number ≥ `MIN_THIRD_ROW_LEGROOM_IN` (28, in the editorial block with the other thresholds). Unknown legroom (null: VinFast VF9) is **out**, because we can't say it meets the cutoff. `"N/A"` (no third row in that configuration, e.g. the 5-seat Maybach) is out.
- **Wording:** charts call this "AWD trims with at least 28 in of third-row legroom", never "adult-size": the cutoff is our line, not a fit test. Each chart's source line lists, computed, what was left out and why ("RWD trims; Tesla Model Y (3-Row), 26.5 in; VinFast VF9, legroom not published").

This fits the existing structure: `data-stories.ts` is already the one place story data and headlines are derived, with thresholds in its editorial block. No data format change.

**What changes on the page (today's data):**

| Story | Today | After |
|---|---|---|
| Price | "Only six models start under $65,000." | "Only three models start under $65,000." (Model Y L, IONIQ 9, EV9; the VF9 drops out on unknown legroom) |
| Value / home teaser | "$157 in the Tesla Model Y (3-Row), $288 in the Mercedes-Benz EQS SUV" | "$191 in the Tesla Model Y L, $299 in the Volkswagen ID. Buzz" |
| Range | best-value dots include RWD trims | comparison-set dots only; `RANGE_BAND` re-checked against them |

**Not changed:** Speed Dating, the comparison tables and the Data Explorer keep showing RWD, the Model Y (3-Row) and the VF9, because those are real cars a shopper can buy.

## Empty and thin data (every story)

Each story builder returns `null` when it has too little to say, and `DataStories` skips a `null` story:

- Price, Range, Value: fewer than 2 models in the comparison set.
- Used: no model with both a new and a used figure.
- Keeps: no model with 2 or more eligible model years.
- Third row: fewer than 3 models with both values.

Builders never call `reduce()` without a seed or index `[0]` on a list that can be empty (fixes the existing `priceDek` and `bestValueTrims()[0]` assumptions). The page title counts the rendered stories ("…in six charts" when Keeps is skipped). The home teaser falls back to the first non-null of Value, Used.

## 1. Choice story: count trims, by model year

Count distinct trims per model year from `DATA.details` with the rules in the table above. A trim is `vehicle | year | trim` with any `(N-seat)` suffix removed: Model X seat variants already share a `trim`, and Rivian's are written `Premium (7-seat)` / `Premium (6-seat)`.

- Today's series: 2, 4, 8, 21, 32, 41 trims (was 6, 6, 10, 23, 41, 45); models 1, 2, 3, 4, 8, 11.
- Headline names the model years, since 25 of the 45 model-year-2026 rows are now used-only: "Model year 2021 offered two trims. Model year 2026 offered 41."
- Chart title: "Trims offered, by model year". Source line: "Seat layouts of the same trim count once. Includes trims no longer sold new."
- Headline, dek and chart come from one aggregation function, so the dek's "in 2021 every one of them was a Tesla Model X" uses the same population. `count_data` is unchanged and still validated; it just stops feeding this chart.

## 2. New story: the used market

**Headline (computed):** "The best-value used Kia EV9 costs $118 per mile of range. The best-value new one, $226." The model named is the one with the largest gap among models with both figures.

**Chart:** a dumbbell per model: a hollow dot for its best eligible new trim, a filled dot for its best eligible used trim, joined by a line. Sorted by used cost. The tooltip names both trims, since they differ. Legend: "Best new trim", "Best used trim".

**Calculation:**
- Used: per model, over comparison-set rows with a parseable `preowned_range`, the lowest `midpoint(preowned_low, preowned_high) / range_mi`. The midpoint, so one cheap listing does not set the headline.
- New: reuses `bestValueTrims()`.
- **Missing new figure:** decided from `availability` across the model's rows, not from the missing dot. If no row of the model is `new`, label "no longer sold new" (Tesla Model X today). If some row is `new` but none qualifies (no price, no range, outside the comparison set), label "no new trim in this comparison".

**Source line:** "Used prices are estimated ranges for each trim, refreshed weekly from CarGurus market averages. Range is the rating when new, before any battery wear."

## 3. New story: what a car keeps

**Headline (computed):** for the model with the most eligible model years, e.g. "A 2022 Rivian R1S sells for about half its original sticker price."

**Chart:** small multiples, one per model with 2 or more eligible model years: x = model year, y = estimated used price as % of original MSRP. The y-axis runs 0–100% and extends to the next 25% when any value exceeds 100% (a used price above MSRP is valid and must not be clipped). Each panel shows `n` trims per point. Models with one eligible year show as dots in a strip below.

**Observation unit:** a distinct trim (seat layouts collapsed as in story 1, taking the layouts' shared values), so a trim sold in three seat layouts counts once. Per `vehicle, year`, the median over trims of `midpoint(preowned_range) / msrp`.

**Eligible MSRP (the denominator), strictly:** `msrp_status` is `historical` or `current`, **and** the row has a non-legacy provenance record for `msrp` in `lib/ev-data.provenance.json` whose `value` equals the stored `msrp` and whose evidence quotes the base MSRP for that model year and trim (destination separate). A record that merely exists is not enough: some older records cite other sites or record a withdrawn (null) price. `current` is allowed because a current-model-year price is that year's original MSRP. `announced` and `unknown` are out.

This needs the site build to read one fact from the provenance file (which `msrp` rows have a record). `data-stories.ts` imports it at build time, server-only; the file is not shipped to the browser. That changes the CLAUDE.md line "The site does not import this file": the docs change with it.

**Framing:** a cross-section (today's prices for each model year), not a curve over time. Dek: "What each model year sells for today, as a share of what it cost new." The source line gives coverage: "Based on N of M used trims; the rest have no sourced original MSRP."

### Decision (owner, 2026-11-23): Option A

The owner chose Option A. The first backfill (branch `chore/msrp-sources-eqs-ex90`, 2026-11-24) sourced the Mercedes EQS SUV 2023 and 2025 and the Volvo EX90 2025 from the makers' press releases. Tesla Model X is deferred: Car and Driver quotes destination-inclusive prices and no allowed page states the destination fee. With that PR merged, Keeps renders one panel (EQS SUV, 2023 and 2025) and a strip (EX90 2025, ID. Buzz 2025).

#### Options considered

Today only **4** of the 63 rows with a used price and an MSRP have an MSRP source (ID. Buzz 2025). The source policy allows MSRP only from the maker's own site (plus Car and Driver for Tesla). Makers rarely keep old model-year price pages, so under today's policy the Keeps story would likely **not render at all**.

- **Option A (recommended):** ship stories 1–4 and 6 now; build Keeps but leave it hidden by the thin-data rule until Step 0 sources enough MSRPs. No policy change.
- **Option B:** widen `source-policy.json` so a **`historical`** MSRP may also come from a press source's dated per-trim spec page (Car and Driver, Edmunds), keeping `current` MSRPs maker-only. Larger change to the data contract; needs its own plan.

## 4. New story: the third row

**Headline (computed), scoped to what is plotted:** "Of the models we plot, the ID. Buzz has the most third-row legroom, 8.9 in more than the next. The EQS SUV has the least cargo space behind its third row."

**Chart:** a scatter, one dot per model: x = third-row legroom (in), y = cargo behind the third row (cu ft). A dashed vertical rule labelled "28 in cutoff used in the other charts".

**Which trim per model (deterministic):** the newest model year with an `availability: new` row; within it, the rows with numeric legroom and cargo; of those, the lowest MSRP, ties broken by `id`. A model with no such row is listed under the chart, split into "Not published" (null) and "No third row" (`"N/A"`).

## Shared build details

- Charts stay plain elements sized with percentages, as in `DataStories.tsx` (no chart library, server-rendered, themed through CSS variables). The dumbbell, small multiples and scatter reuse `.ds-*` classes; new classes go in `app/globals.css`. The hover text in the preview becomes `title` attributes, as on the current charts.
- Colour rule unchanged: marks `--chart-muted`, only marks a headline talks about are `--accent`.
- Page order: Choice, Price, Range, Value, Used, Keeps, Third row.
- Home teaser: layout unchanged; its headline changes with item 2. Add the Used headline to the "More in Market Insights" links.
- Every headline and dek is a function of `DATA`; no hard-coded counts or names (CLAUDE.md).
- Text in numeric fields (`"TBD"`, `"N/A"`) is treated as missing (`typeof x === 'number'`), except where the third-row story distinguishes `"N/A"`.

## Step 0: data PR (opportunistic, separate)

A data-only PR under the data rules and `source-policy.json` (no source, no change):

1. Add historical MSRP and destination, with provenance, for the 40 rows with a used price and no MSRP (every Tesla Model X year, Kia EV9 2024 and 2025, Rivian R1S 2026), and add MSRP provenance for existing `historical` MSRPs, **only where an allowed source exists**: the maker's own site, or Car and Driver per-trim specs for Tesla. Evidence must quote base MSRP and destination separately; a combined price is not split by hand. Anything without an allowed source stays as it is.
2. Check that each changed row still displays right: the historical-MSRP formatter in `lib/spec-fields.ts`, and the destination field, on the vehicle, comparison and side-by-side pages.
3. Check the Tesla Model Y (3-Row)'s `availability: new` is still true. Changing availability is the owner's decision; the PR only proposes it.

**Rollback:** revert the data PR. `data-contract` treats the reverted values as withdrawals, which are review items, so the revert passes and waits for the owner's merge. A single wrong value is corrected with a sourced fix PR.

## Tests

`tests/unit/data-stories.test.ts` (new), against small fixture rows, not live data:

- **Trim counting:** Model X 5/6/7-seat variants count once; Rivian `(7-seat)`/`(6-seat)` count once; distinct trims count separately; `announced` rows, watch-list vehicles and future model years are left out; headline and dek agree.
- **`inComparisonSet`:** RWD out; legroom 26.5 out; legroom null out; `"N/A"` out; `AWD (dual motor)` in; 28 exactly in.
- **Used:** midpoint used; `"No used market yet"` skipped; a model with no `new` rows is labelled "no longer sold new"; a model with `new` rows that don't qualify is labelled "no new trim in this comparison".
- **Keeps:** `msrp_status` `unknown` and `announced` skipped; a row with no MSRP provenance skipped; seat layouts count once; a value over 100% extends the axis; coverage counts N of M are right; single-year models go to the strip.
- **Third row:** null and `"N/A"` go to the right lists; the trim choice is deterministic (lowest MSRP, then `id`).
- **Empty data:** every builder returns `null` with zero eligible rows, and Used returns `null` with no matched pair; no `NaN`, `undefined` or `Infinity` in any headline for the live data.

`tests/output/generated-pages.test.ts`: the number in the page title equals the number of rendered stories.

Playwright: Market Insights shows every rendered story's headline at phone width with no horizontal scroll.

## Rollout and rollback

1. Code PR: items 1–3 (fixes), then items 4–6 (stories), in one branch with separate commits so either half can be reverted. Keeps ships hidden under Option A.
2. Step 0 data PR, in parallel; the Keeps story appears by itself once enough MSRPs are sourced.
3. Code rollback: revert the code PR. No data format change, no URL change, no validator change. Data rollback: see Step 0.

## Out of scope

- The data-quality items from the same review (L2 time consistency, `charging_type` cleanup, text in numeric fields, provenance for older spec fields, EPA range mapping). Each deserves its own plan.
- Changing Speed Dating or the comparison tables.
- A price-over-time history store.
- Widening the source policy (Option B), unless the owner picks it.

## Revisions after Codex's critique (2026-11-23)

Full critique: `docs/reviews/insights-stories-v2-codex.md`.

| Codex finding | Change |
|---|---|
| P0: retention denominator accepted any non-`unknown` MSRP, not a sourced original MSRP | Denominator now requires `historical`/`current` **and** an MSRP provenance record quoting that year's base price. Coverage (N of M) is shown. This leaves 4 eligible rows today, so the story is gated, and an **open decision** asks the owner about sources. |
| P0: backfill fallback to "approved reference sites" breaks `data-contract` for Kia and Rivian | Step 0 is now opportunistic and follows `source-policy.json` (maker only, Car and Driver for Tesla). Unsourced values stay as they are. Base MSRP and destination must be quoted separately. |
| P0: "Now there are 41" implied current inventory (25 of 45 MY2026 rows are used-only); exclusions unspecified | Headline names model years. Choice rules are stated (watch list out, years ≤ data year, `new` + `used_only`). Headline and dek share one aggregation. |
| P0: a missing new dot doesn't mean "no longer sold new" | Label comes from `availability`. Two labels for the two cases. Endpoints are called "best new trim" / "best used trim", and the tooltip names both. |
| P0: 28 in called "adult-size" without support; unknown legroom admitted; `N/A` mislabelled; "ten inches" wrong | Called "28 in cutoff". Unknown legroom is out of the comparison set. `N/A` = "No third row", null = "Not published". Deterministic trim rule. Superlatives scoped to plotted models; 8.9 in. (Price headline now "three", not "four", because the VF9 drops out.) |
| P1: fixed 0–100% axis clips; seat layouts overweighted | Axis extends past 100% when needed. Unit is the distinct trim. `n` shown per point. |
| P1: empty-data cases uncovered; existing unseeded `reduce()` and `[0]` indexing | New "Empty and thin data" section: builders return `null`, page skips them, title counts rendered stories, teaser falls back. Fixture tests for each. |
| P1: rollback omitted the data PR; display of backfilled fields unchecked | Step 0 adds a display check and its own rollback. |

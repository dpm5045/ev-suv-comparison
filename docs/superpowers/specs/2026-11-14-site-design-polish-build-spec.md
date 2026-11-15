# Site Design Polish — Build Spec

**Date**: 2026-11-14
**Purpose**: Bring the rest of the site up to the visual standard of the redesigned Watch List tab, and fix four rendering bugs found in a screenshot review.
**Who this is for**: the engineer or coding agent doing the build. You need no context beyond this file and the repo.

## How to work

- Read `CLAUDE.md` at the repo root first. It describes the architecture and rules.
- Do the tasks in order. Each task is one commit. Do not combine tasks.
- After every task run the checks in "Verification". Do not move on while any check fails.
- Do not change anything this spec does not ask for. "Out of scope" at the end lists things that look tempting and must be left alone.
- If a task cannot be done as written (a file or class named here does not exist, or the change breaks something), stop and report what you found. Do not improvise a different design.
- Do not push. Commit locally only.

## Background

The site is a Next.js 14 App Router app. All styling is plain CSS in one file, `app/globals.css`, using CSS variables (`--bg`, `--surface`, `--surface2`, `--border`, `--border-light`, `--text`, `--text-muted`, `--text-dim`, `--accent`, `--green`, `--amber`, `--red`, `--font`, `--mono`, `--radius`). Dark is the default theme; light theme overrides the same variables under `html[data-theme="light"]`. Always use the variables, never hard-coded colours, so both themes work.

Per-vehicle colours come from badge classes (`.v-kia`, `.v-lexus`, …) looked up through `VEHICLE_CLASSES` in `lib/data.ts`.

**The reference implementation is the Watch List page.** Read these before starting, and copy their conventions:

- `components/tabs/WatchListTab.tsx`
- `lib/watchlist.ts`
- the `/* ── Watch List page ── */` block in `app/globals.css` (classes prefixed `wl-`)

Its look, which the rest of the site should move toward:

- cards: `1px solid var(--border)`, `border-radius: 16px`, `background: var(--surface)`, `padding: 24px`
- numbers in `var(--mono)`; small labels 12–13px in `var(--text-muted)`
- section headings 32px, weight 700, `letter-spacing: -0.02em`
- an uppercase mono "eyebrow" line above the page title, coloured `var(--accent)`
- no coloured left-border stripes on cards, no gradient glows

## Rules that apply to every task

- No hard-coded vehicle or trim counts. Derive them from `DATA` (see `CLAUDE.md`).
- Do not edit `lib/ev-data.json`.
- Do not use `var(--text-dim)` for text smaller than 18px. It fails contrast. Use `var(--text-muted)`.
- Interactive elements must be real `<a>`, `<Link>` or `<button>` elements.
- Keep every existing URL, query parameter and `onClick` behaviour working.
- New CSS goes in `app/globals.css` next to the rules it relates to. Do not add CSS files, CSS modules, Tailwind or new dependencies.

---

## Task 1 — Fix literal `0–60` label on Spec & Select cards

**Problem.** Every result card on `/spec-select` shows the label `0\U201360` instead of `0–60`.

**Cause.** `components/tabs/SpecSelectTab.tsx` line ~688 has `–` inside JSX text, where escape sequences are not processed:

```tsx
<span className="spec-card-stat-label">0–60</span>
```

**Change.** Replace the text with a real en dash: `0–60`.

Then search the repo for any other `–` or `’` that sits in JSX text rather than inside a quoted JavaScript string or template literal, and fix those the same way. Occurrences inside `'…'`, `"…"` or `` `…` `` strings are correct and must not be touched.

**Done when.** `/spec-select` cards show `0–60`, and no page shows a literal `\u`.

---

## Task 2 — Fix the vehicle page trim table

File: `app/vehicles/[slug]/page.tsx` and `app/globals.css`.

**Problem A — blank section rows.** The desktop "All Trims" table shows empty bands where the group labels (Pricing, Powertrain & Performance, …) should be. The label is rendered in one cell that spans every column and is centred, so on a 25-trim vehicle it sits thousands of pixels off-screen to the right.

**Change A.** In the two places that render `<tr className="compare-section-row">` (the spec sections and the Notes section), replace the single spanning cell with a sticky label cell plus a filler cell:

```tsx
<tr className="compare-section-row">
  <td className="col-sticky">{sec.title}</td>
  <td colSpan={trims.length} />
</tr>
```

In `app/globals.css`, in the `.trim-compare-table .compare-section-row td` rule, add `text-align: left;` and `white-space: nowrap;`.

**Problem B — the table borrows the Full Monty's fixed height.** The table is wrapped in `<div className="cmp-table-view"><div className="table-wrap">`. The rule `.cmp-table-view .table-wrap` was written for the Full Monty page and forces `height: calc(100vh - 160px)` with no border.

**Change B.** Give the vehicle table its own inner wrapper. Change the inner div to `<div className="table-wrap trim-table-wrap">` and add this rule directly after the `.cmp-table-view td.col-sticky` rule (it must come later in the file than `.cmp-table-view .table-wrap` so it wins):

```css
.cmp-table-view .trim-table-wrap {
  height: auto;
  max-height: 75vh;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
```

Keep the outer `cmp-table-view` class. It controls the desktop/mobile switch.

**Done when.** On `/vehicles/kia-ev9` at 1440px the group labels are visible at the left edge and stay visible while scrolling the table sideways; the table has a rounded border; short tables (for example `/vehicles/lexus-tz`) are only as tall as their content.

---

## Task 3 — Correct the active nav tab on non-tab pages

**Problem.** Vehicle pages, pairwise compare pages and the Data Explorer pass `activeTab="overview"`, so the "3RowEV" home tab is highlighted while the user is not on the home page.

**Changes.**

1. `components/Header.tsx`: add `'none'` to the `TabId` union.
2. Pass `activeTab="none"` in `app/vehicles/[slug]/page.tsx`, `app/compare/[slug]/page.tsx` and `app/explore/page.tsx`.
3. `components/DashboardNav.tsx`: the mobile bar label is currently
   `TABS.find(t => t.id === activeTab)?.label ?? 'Home'`. Change it so that `overview` gives `Home`, `about` gives `About`, a matching tab gives its label, and anything else gives `3RowEV`.

Do not change `app/tech-stack/page.tsx`, which renders `<Header />` with no tab on purpose.

**Done when.** On `/vehicles/kia-ev9`, `/compare/kia-ev9-vs-rivian-r1s` and `/explore` no nav tab has the `active` class. On `/` the 3RowEV tab is still active.

---

## Task 4 — One page width and a shared page header

**Problem.** Pages use four different content widths (Watch List 1200px centred, Explore 1100px, vehicle pages 900px, the other tabs about 1336px left-aligned), and the tab pages open with a small 22px `<h2>` and no `<h1>`.

### 4a. Width

In `app/globals.css`:

1. Add `--page-width: 1200px;` to `:root`.
2. Change `.main` to `max-width: var(--page-width);` (keep its margin and padding).
3. Add `.main--wide { max-width: var(--max-content, 1400px); }` directly after `.main`.
4. In the `.wl` rule remove `max-width: 1200px; margin: 0 auto;` (the page container now provides it). Keep `padding-bottom`.
5. In the `.explorer` rule remove `max-width: 1100px; margin: 0 auto;`.
6. Change the `.vehicle-page, .compare-page` rule so that only `.vehicle-page` gets `max-width: var(--page-width)`. `.compare-page` keeps `max-width: 900px` (it is a two-column reading layout). Both keep the same margin and padding.

In `components/pages/ComparisonClient.tsx`, change `<main className="main">` to `<main className="main main--wide">`. The Full Monty is a wide spreadsheet and keeps the full width. No other page gets `main--wide`.

Leave `.info-page` (About, Privacy) and the header and footer widths alone.

### 4b. Shared header component

Create `components/PageHeader.tsx`:

```tsx
interface Props {
  eyebrow?: string
  title: string
  children?: React.ReactNode // description
  actions?: React.ReactNode  // optional controls shown on the right
}

export default function PageHeader({ eyebrow, title, children, actions }: Props) {
  return (
    <div className="page-header">
      <div className="page-header-text">
        {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {children && <p className="page-desc">{children}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  )
}
```

Add to `app/globals.css`, directly after the `.section-desc` rule:

```css
.page-header {
  display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between;
  gap: 16px 32px; padding: 24px 0 28px;
}
.page-header-text { flex: 1 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.page-header-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.page-eyebrow {
  font-family: var(--mono); font-size: 12px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--accent);
}
.page-title { font-size: clamp(30px, 4vw, 44px); line-height: 1.05; letter-spacing: -0.03em; font-weight: 700; }
.page-desc { max-width: 640px; font-size: 17px; line-height: 1.55; color: var(--text-muted); }
```

In the existing `@media (max-width: 768px)` block that contains `.main { padding: 16px; }`, add `.page-header { padding: 8px 0 20px; }`.

### 4c. Use it

Replace the existing `<h2 className="section-title">` + `<p className="section-desc">` pair at the top of each of these with `<PageHeader>`. Keep the title and description wording exactly as it is today.

| File | Title | Eyebrow |
|---|---|---|
| `components/tabs/SpecSelectTab.tsx` | Spec & Select | trim/vehicle count (see below) |
| `components/tabs/SideBySideTab.tsx` | Side-by-Side | trim/vehicle count |
| `components/tabs/ComparisonV2Tab.tsx` | Detailed Comparison | trim/vehicle count |
| `components/tabs/GlossaryTab.tsx` | Glossary | `Reference` |
| `components/DataExplorer.tsx` | Data Explorer | trim/vehicle count |

The count eyebrow is derived, never typed in:

```ts
const vehicleCount = new Set(DATA.details.map((r) => r.vehicle)).size
const eyebrow = `${DATA.details.length} trims · ${vehicleCount} vehicles`
```

For `ComparisonV2Tab.tsx`: the title currently sits in an inline-styled flex row together with the "Clear all filters" button and the mobile Cards/Table toggle. Move those two controls, unchanged, into the `actions` prop and delete the inline-styled wrapper div. Their behaviour must not change.

For `DataExplorer.tsx`: find its existing page heading and intro paragraph and replace them. If its intro sentence contains counts, keep that sentence as the description.

Do not use `PageHeader` on the home page, the Watch List, vehicle pages, compare pages, About or Privacy.

**Done when.** The five pages above each have exactly one `<h1>`; at 1440px their content column is 1200px wide and centred (Full Monty stays wide); the Full Monty filter-clear button and mobile toggle still work.

---

## Task 5 — Home page: stat tiles and hero

File: `components/tabs/OverviewTab.tsx` (markup stays almost unchanged) and `app/globals.css`.

### 5a. Stat tiles

The six tiles under the filters (`.overview-stat`) use a coloured left stripe and a radial glow. Restyle them to match the Watch List jump tiles.

In `app/globals.css`:

- `.overview-stat`: remove `border-left` and the asymmetric `border-radius`; set `border-radius: 14px`. Keep the `--stat-color` variable, the reveal animation and the hover lift.
- Delete the `.overview-stat::before` rule and the `.overview-stat:hover::before` rule.
- Delete every `--stat-glow` declaration: the default in `.overview-stat`, the per-category ones, and the whole "Overview stat glows — light theme" block. Keep the per-category `--stat-color` declarations.
- `.overview-stat-label`: change `font-size` to `12px` and `color` to `var(--text-muted)`.
- `.overview-stat-value`: change `font-size` to `28px` and `font-weight` to `500`.

The value keeps its category colour, which is now the only colour cue.

### 5b. Hero

Today the title is small and centred above an image that fills most of the first screen. Make it a two-column hero on desktop: text on the left, image on the right.

**Do not touch the `<picture>` element, its sources, or the `onClick={toggleTheme}` on `.overview-hero-image`.** Clicking the image is a deliberate hidden theme switch.

In `OverviewTab.tsx`, wrap the existing `<h1>` and `<p className="overview-hero-sub">` in a new `<div className="overview-hero-text">`. Nothing else in the markup changes.

In `app/globals.css`:

```css
.overview-hero {
  display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  align-items: center; gap: 48px; padding: 2rem 0 2.5rem; text-align: left;
}
.overview-hero-text { display: flex; flex-direction: column; gap: 14px; }
.overview-hero-title { font-size: clamp(36px, 4.6vw, 60px); line-height: 1.02; letter-spacing: -0.04em; font-weight: 700; margin-bottom: 0; }
.overview-hero-sub { font-size: 18px; max-width: 420px; margin: 0; }
.overview-hero-image { margin: 0; aspect-ratio: 16 / 9; }
```

Keep the other existing declarations in those rules (colour, `position`, `overflow`, `border-radius`, the `img` and `::after` rules).

In the existing mobile block (`@media (max-width: 768px)`) replace the three `.overview-hero*` lines with:

```css
.overview-hero { grid-template-columns: 1fr; gap: 20px; padding: 1rem 0 1.5rem; }
.overview-hero-title { font-size: 34px; }
.overview-hero-image { aspect-ratio: 4 / 3; }
```

**Done when.** At 1440px the headline and image sit side by side and the "Let's Go Speed Dating" heading and filters are visible without scrolling on a 900px-tall window. At 390px the title is above the image and the car is still visible in the image (check the screenshot; if the car is cropped out, change the mobile `aspect-ratio` to `1 / 1`). Clicking the image still switches theme.

---

## Task 6 — Market Insights: remove the card-inside-a-card

File: `app/globals.css` only.

The `.mi-section` rule gives the whole Market Insights block a card background, border, radius and padding, and each chart inside is another bordered card (`.mi-chart-card`).

- `.mi-section`: remove `background`, `border`, `border-radius` and `padding`. Keep the margins.
- `.mi-chart-card`: change `background` to `var(--surface)` and `border-radius` to `16px`.
- `.mi-title`: change `font-size` to `32px`, `font-weight` to `700`, `letter-spacing` to `-0.02em`.
- `.mi-insights` (the "Key takeaways" panel): remove `border-left: 3px solid var(--accent);`.

Do not touch chart code or chart colours in `components/MarketInsights.tsx`.

**Done when.** On `/` the three charts are single bordered cards sitting directly on the page background, in both themes.

---

## Task 7 — Vehicle page polish

Files: `app/vehicles/[slug]/page.tsx`, `app/globals.css`.

### 7a. Stat band

Scope these to the vehicle page so the detail panel elsewhere is unaffected:

```css
.vehicle-stats-grid .detail-stat {
  background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px;
}
.vehicle-stats-grid .detail-stat-label { font-size: 12px; color: var(--text-muted); letter-spacing: 0.08em; }
.vehicle-stats-grid .detail-stat-value { font-family: var(--mono); font-size: 20px; font-weight: 500; }
```

### 7b. Watch-list status in the hero

For vehicles that have an entry in `WATCHLIST_META` (import it and `WATCH_STATUS_LABEL` from `@/lib/watchlist`), show the status chip and arrival note inside `.vehicle-hero`, directly after the `.vehicle-hero-sub` paragraph:

```tsx
{watchMeta && (
  <p className="vehicle-hero-watch">
    <span className={`wl-chip wl-chip--${watchMeta.status}`}>{WATCH_STATUS_LABEL[watchMeta.status]}</span>
    <span>{watchMeta.windowLabel}</span>
    <Link href="/watch-list">Watch List →</Link>
  </p>
)}
```

with `const watchMeta = WATCHLIST_META[vehicle]` and:

```css
.vehicle-hero-watch { margin-top: 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; font-size: 14px; color: var(--text-muted); }
.vehicle-hero-watch a { color: var(--accent); text-decoration: none; }
.vehicle-hero-watch a:hover { text-decoration: underline; }
```

### 7c. "Compare with" tiles

Each tile shows the other vehicle's badge and then the text "Kia EV9 vs Rivian R1S", which repeats the name and is truncated.

- Remove the `<span className="related-link-vs">…</span>` element.
- Add `aria-label={`Compare ${vehicle} with ${other}`}` to the `<Link>`.
- Add a trailing `<span className="related-link-arrow" aria-hidden="true">→</span>`.
- CSS: in `.related-links, .compare-links` change the grid to `repeat(auto-fill, minmax(210px, 1fr))`; add `justify-content: space-between;` to `.related-link-card`; add `.related-link-arrow { color: var(--text-muted); }`.

If `.related-link-vs` is also used in `app/compare/[slug]/page.tsx`, leave that usage and its CSS rule in place.

**Done when.** `/vehicles/lexus-tz` shows a "Priced" chip and arrival note; `/vehicles/kia-ev9` shows neither; the compare tiles show only a badge and an arrow.

---

## Task 8 — Watch List follow-ups

Files: `components/tabs/WatchListTab.tsx`, `app/globals.css`.

### 8a. Link arrival cards to vehicle pages

In the arrivals card, wrap the model name inside the `<h3 className="wl-h3">` in a link:

```tsx
<h3 className="wl-h3">
  <Link href={`/vehicles/${toSlug(a.vehicle)}`} className="wl-card-link">{a.meta.model || a.vehicle}</Link>
</h3>
```

```css
.wl-card-link { color: inherit; text-decoration: none; }
.wl-card-link:hover { color: var(--accent); }
```

Do the same in the Departures card, linking the model name to the vehicle page.

### 8b. Timeline name column

"Faraday Future FX Super One" wraps onto two lines. In `.wl-tl-row` change the first grid column from `190px` to `240px`, and add `white-space: nowrap;` to `.wl-tl-name`. Change `.wl-timeline`'s `min-width` from `820px` to `880px`.

### 8c. Phone layout

On a phone the timeline scrolls sideways and only its first column is visible, so most bars are hidden. On small screens hide the timeline and show each vehicle's arrival note on its card instead.

In the arrivals card, directly after the `.wl-card-title` div, add:

```tsx
<p className="wl-card-window">{a.meta.windowLabel}</p>
```

```css
.wl-card-window { display: none; font-family: var(--mono); font-size: 13px; color: var(--text-muted); }
```

and inside the existing mobile block (the one that contains `.wl-hero { padding: 24px 0 40px; … }`):

```css
.wl-timeline-box { display: none; }
.wl-card-window { display: block; }
```

**Done when.** At 390px the timeline is gone and every arrival card shows its arrival note; at 1440px the timeline is unchanged apart from the wider name column and the cards show no arrival note.

---

## Task 9 — Full Monty row height

File: `components/tabs/ComparisonV2Tab.tsx`, `app/globals.css`.

Long trim names wrap to four lines in the Trim column and make rows very tall.

In the desktop table, the trim cell is `<td>{r.trim || ''}</td>` (around line 444). Change it to:

```tsx
<td className="cmp-trim-cell" title={r.trim || undefined}>{r.trim || ''}</td>
```

```css
.cmp-trim-cell { max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cmp-table-view .cell-range { white-space: nowrap; }
```

Do not change the sticky Vehicle column, the column filters, or the mobile cards.

**Done when.** On `/comparison` at 1440px no row in the first screen is taller than two text lines, and hovering a truncated trim shows its full name.

---

## Verification

Run after every task, from the repo root:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

All three must finish with no errors. (`npm run build` also runs the data validator; it prints warnings about incomplete pre-release vehicles, which are expected. Errors are not.)

Then check visually. This needs Google Chrome installed:

```bash
npx next start -p 3917 &
node scripts/dev/screenshot-pages.cjs /tmp/3rowev-shots
pkill -f "next start -p 3917"
```

The script prints one line per page. Every line must end in `ok`; `OVERFLOW-X` means the page scrolls sideways and must be fixed. Open the screenshots for the pages your task touched, at both `-desk` and `-phone`, and for tasks 4–8 also `home-light` and `watch-light`. Compare against the "Done when" list for the task.

If Chrome is not available, say so in your report and list which "Done when" items you could not check. Do not claim a visual result you did not see.

The Playwright smoke tests (`npm run test:e2e`) need a browser download that has failed on this machine. Run them if they work; if the browser is missing, report that rather than treating it as a failure of your change. Task 4 changes page headings: `tests/e2e/smoke.spec.ts` checks that `/glossary` contains the text "glossary", which stays true.

## Commits

One commit per task, in order, with messages like `Fix blank section rows in vehicle trim table`. End each commit message with the attribution line your session is configured to use. Do not push.

## Final report

When finished, report:

- which tasks are done, with commit hashes
- for each task, which "Done when" items you verified and how (build output, screenshot, or not verified)
- anything you could not do as written, and why
- anything you changed that this spec did not ask for (there should be nothing)

## Out of scope

Leave these alone even if they look improvable:

- `lib/ev-data.json` and any vehicle data
- chart code, chart colours and chart legends
- the Side-by-Side empty state and its three selector cards
- the long list of trim pills on the mobile vehicle page, and the number of trims shown in the vehicle table
- the Spec & Select filter panels and result-card layout (apart from the Task 1 label)
- About, Privacy, Tech Stack and the pairwise compare page layout
- the footer and the header layout
- `.accessories-card` and `.news-li` (unused or unrelated left-border styles)
- moving inline `style={{…}}` props into CSS, beyond the one wrapper named in Task 4
- renaming routes, tabs, components or CSS classes

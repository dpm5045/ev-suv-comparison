# Speed Dating Ranked Results Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rank-order the Speed Dating Results table by user-selected preferences with explicit rank badges, priority-numbered pills, and a new Self-Driving preference option.

**Architecture:** All changes are in a single component (`OverviewTab.tsx`) and its stylesheet (`globals.css`). A scoring engine (pure functions) computes per-vehicle composite scores from the user's selected preferences, then the existing `vehicleSummaries` array is sorted by score and annotated with rank numbers before rendering.

**Tech Stack:** Next.js 14 App Router, TypeScript, CSS (no new dependencies)

**Spec:** `docs/superpowers/specs/2026-03-19-speed-dating-ranked-results-design.md`

---

### Task 1: Add Self-Driving preference option and tile generator

**Files:**
- Modify: `components/tabs/OverviewTab.tsx:54-60` (PREFERENCE_OPTIONS)
- Modify: `components/tabs/OverviewTab.tsx:201-207` (TILE_GENERATORS)

- [ ] **Step 1: Add `selfdriving` to PREFERENCE_OPTIONS**

In `components/tabs/OverviewTab.tsx`, find the `PREFERENCE_OPTIONS` array (line 54-60) and add the new option before `sixseat`:

```typescript
const PREFERENCE_OPTIONS = [
  { id: 'range', label: 'Range' },
  { id: 'storage', label: 'Storage' },
  { id: 'power', label: 'Horsepower' },
  { id: 'charging', label: 'Charging Speed' },
  { id: 'selfdriving', label: 'Self-Driving' },
  { id: 'sixseat', label: '6-Seat Options' },
] as const
```

- [ ] **Step 2: Add self-driving tier ordinal mapping and tile generator**

Add these right after the `tilesForSixSeat` function (after line 196), before the `TileGenerator` type:

```typescript
const SELF_DRIVING_TIER_ORDER: Record<string, number> = {
  'Basic L2': 1,
  'Advanced L2': 2,
  'L2+ Hands-Free': 3,
  'L2+ Point-to-Point': 4,
}

function selfDrivingOrdinal(tier: string | null): number {
  return tier ? (SELF_DRIVING_TIER_ORDER[tier] ?? 0) : 0
}

function tilesForSelfDriving(d: Row[], isPreowned: boolean): Tile[] {
  const tiles: Tile[] = []
  const withTier = d.filter((r) => r.self_driving_tier && selfDrivingOrdinal(r.self_driving_tier) > 0)
  if (!withTier.length) return tiles

  // Best Self-Driving — highest tier vehicle
  const best = withTier.reduce((a, b) => selfDrivingOrdinal(a.self_driving_tier) >= selfDrivingOrdinal(b.self_driving_tier) ? a : b)
  tiles.push({ label: 'Best Self-Driving', value: best.self_driving_tier!, detail: best.vehicle })

  // Best Self-Driving Value — highest tier at lowest price
  if (isPreowned) {
    const priced = withTier
      .filter((r) => hasPreowned(r))
      .map((r) => ({ ...r, prePrice: parsePrice(r.preowned_range)! }))
      .filter((r) => r.prePrice > 0)
    if (priced.length) {
      const maxTier = Math.max(...priced.map((r) => selfDrivingOrdinal(r.self_driving_tier)))
      const topTier = priced.filter((r) => selfDrivingOrdinal(r.self_driving_tier) === maxTier)
      const cheapest = topTier.reduce((a, b) => a.prePrice < b.prePrice ? a : b)
      tiles.push({ label: 'Best Self-Driving Value', value: cheapest.self_driving_tier!, detail: `${cheapest.vehicle} ${cheapest.trim} — ~$${Math.round(cheapest.prePrice / 1000)}k pre-owned` })
    }
  } else {
    const withMsrp = withTier.filter((r) => typeof r.msrp === 'number') as (Row & { msrp: number })[]
    if (withMsrp.length) {
      const maxTier = Math.max(...withMsrp.map((r) => selfDrivingOrdinal(r.self_driving_tier)))
      const topTier = withMsrp.filter((r) => selfDrivingOrdinal(r.self_driving_tier) === maxTier)
      const cheapest = topTier.reduce((a, b) => a.msrp < b.msrp ? a : b)
      tiles.push({ label: 'Best Self-Driving Value', value: cheapest.self_driving_tier!, detail: `${cheapest.vehicle} ${cheapest.trim} — $${Math.round(cheapest.msrp / 1000)}k MSRP` })
    }
  }
  return tiles
}
```

- [ ] **Step 3: Register in TILE_GENERATORS**

Update the `TILE_GENERATORS` object (line 201-207) to add the new generator:

```typescript
const TILE_GENERATORS: Record<string, TileGenerator> = {
  range: tilesForRange,
  storage: (d, _ip) => tilesForStorage(d),
  power: tilesForPower,
  charging: tilesForCharging,
  selfdriving: tilesForSelfDriving,
  sixseat: tilesForSixSeat,
}
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add components/tabs/OverviewTab.tsx
git commit -m "feat: add Self-Driving preference option and tile generator"
```

---

### Task 2: Add priority badges to preference pills

**Files:**
- Modify: `components/tabs/OverviewTab.tsx:460-469` (pill rendering in JSX)

- [ ] **Step 1: Update pill rendering to show ① / ② badges**

Find the preference pill rendering block (line 460-469) and update to:

```tsx
{PREFERENCE_OPTIONS.map((p) => {
  const isPref1 = activePref1 === p.id
  const isPref2 = activePref2 === p.id
  return (
    <button
      key={p.id}
      className={`insight-pill${isPref1 || isPref2 ? ' active' : ''}`}
      data-category={p.id}
      onClick={() => handlePref(p.id)}
    >
      {isPref1 && <span className="pref-badge">①</span>}
      {isPref2 && <span className="pref-badge">②</span>}
      {p.label}
    </button>
  )
})}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/tabs/OverviewTab.tsx
git commit -m "feat: add priority badges to preference pills"
```

---

### Task 3: Add CSS for priority badges, rank badges, and selfdriving category

**Files:**
- Modify: `app/globals.css:1245-1249` (pill category colors)
- Modify: `app/globals.css:1464-1469` (stat category colors)
- Add new styles after existing pill/stat styles

- [ ] **Step 1: Add selfdriving pill category color**

In `app/globals.css`, find the pill category color block (line 1245-1249) and add after the `sixseat` line:

```css
.insight-pill.active[data-category="selfdriving"]  { background: var(--red);    border-color: var(--red); }
```

- [ ] **Step 2: Add selfdriving stat category color**

Find the stat category color block (line 1464-1469) and add after the `sixseat` line:

```css
.overview-stat[data-category="selfdriving"]  { --stat-color: var(--red);    --stat-glow: rgba(248, 113, 113, 0.08); }
```

- [ ] **Step 3: Add priority badge styles**

Add these styles near the insight-pill styles (after line 1249):

```css
.pref-badge {
  margin-right: 4px;
  font-size: 14px;
}
```

- [ ] **Step 4: Add rank badge styles**

Add these styles in the glance table section (after the `.glance-row-dimmed` styles, around line 1258):

```css
.rank-badge {
  display: inline-block;
  background: var(--surface3);
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  color: var(--text-muted);
  margin-right: 8px;
  font-weight: 600;
  white-space: nowrap;
}
.col-sticky-ranked {
  display: flex;
  align-items: center;
}
```

- [ ] **Step 5: Verify build passes**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css
git commit -m "style: add rank badge, priority badge, and selfdriving category CSS"
```

---

### Task 4: Build the scoring engine

**Files:**
- Modify: `components/tabs/OverviewTab.tsx` — add scoring functions after the `selfDrivingOrdinal` helper (before the component function)

- [ ] **Step 1: Add the scoring and ranking functions**

Add these functions after `selfDrivingOrdinal` and before the component `export default function OverviewTab`:

```typescript
/* ── scoring engine ── */

type VehicleSummary = {
  vehicle: string
  rangeHigh: number | null
  hpHigh: number | null
  cargo3High: number | null
  cargo2High: number | null
  dcChargeMin: number | null
  selfDrivingMax: number
  [key: string]: unknown
}

function extractMetric(s: VehicleSummary, pref: string): number | null {
  switch (pref) {
    case 'range': return s.rangeHigh
    case 'power': return s.hpHigh
    case 'storage': return s.cargo3High ?? s.cargo2High
    case 'charging': return s.dcChargeMin
    case 'selfdriving': return s.selfDrivingMax
    default: return null
  }
}

function normalizeScores(
  summaries: VehicleSummary[],
  pref: string
): Map<string, number> {
  const scores = new Map<string, number>()
  const lowerIsBetter = pref === 'charging'
  const values: number[] = []

  for (const s of summaries) {
    const v = extractMetric(s, pref)
    if (v !== null && v !== 0) values.push(v)
  }

  if (!values.length) return scores

  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = max - min

  for (const s of summaries) {
    const v = extractMetric(s, pref)
    if (v === null || v === 0) {
      scores.set(s.vehicle, 0)
    } else if (spread === 0) {
      scores.set(s.vehicle, 1)
    } else {
      const norm = (v - min) / spread
      scores.set(s.vehicle, lowerIsBetter ? 1 - norm : norm)
    }
  }

  return scores
}

function computeRanks(
  summaries: VehicleSummary[],
  pref1: string,
  pref2: string
): Map<string, number> {
  const ranks = new Map<string, number>()
  if (!pref1 && !pref2) return ranks

  // Determine effective prefs (excluding sixseat which is a filter)
  const effectivePrefs: string[] = []
  if (pref1 && pref1 !== 'sixseat') effectivePrefs.push(pref1)
  if (pref2 && pref2 !== 'sixseat') effectivePrefs.push(pref2)

  if (!effectivePrefs.length) return ranks

  const scores1 = normalizeScores(summaries, effectivePrefs[0])
  const scores2 = effectivePrefs.length > 1 ? normalizeScores(summaries, effectivePrefs[1]) : null

  // Composite score
  const composites: { vehicle: string; score: number }[] = []
  for (const s of summaries) {
    const s1 = scores1.get(s.vehicle) ?? 0
    if (scores2) {
      const s2 = scores2.get(s.vehicle) ?? 0
      composites.push({ vehicle: s.vehicle, score: 0.6 * s1 + 0.4 * s2 })
    } else {
      composites.push({ vehicle: s.vehicle, score: s1 })
    }
  }

  // Sort descending
  composites.sort((a, b) => b.score - a.score)

  // Dense ranking
  let rank = 1
  for (let i = 0; i < composites.length; i++) {
    if (i > 0 && composites[i].score < composites[i - 1].score) rank++
    ranks.set(composites[i].vehicle, rank)
  }

  return ranks
}
```

Note: The `VehicleSummary` type here is used only by the scoring functions. The existing `vehicleSummaries` in the component will be extended to include `dcChargeMin` and `selfDrivingMax` in Task 5.

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds (functions exist but aren't called yet).

- [ ] **Step 3: Commit**

```bash
git add components/tabs/OverviewTab.tsx
git commit -m "feat: add scoring engine for preference-based vehicle ranking"
```

---

### Task 5: Extend vehicleSummaries and wire up scoring + sorting

**Files:**
- Modify: `components/tabs/OverviewTab.tsx:323-365` (vehicleSummaries useMemo)

- [ ] **Step 1: Extend vehicleSummaries to include DC charge time and self-driving tier**

Find the `vehicleSummaries` useMemo block (line 323-365). Update the inner mapping to add two new fields and compute ranks. Replace the entire useMemo:

```typescript
const { vehicleSummaries, vehiclesInBudget } = useMemo(() => {
  const d = DATA.details
  const allVehicles = [...new Set(d.map((r) => r.vehicle))].sort()

  const inBudget = new Set<string>()
  for (const r of filteredDetails) inBudget.add(r.vehicle)

  const rawSummaries = allVehicles.map((v) => {
    const rows = d.filter((r) => r.vehicle === v)
    const msrps = rows.map((r) => r.msrp).filter((x) => typeof x === 'number') as number[]
    const ranges = rows.map((r) => r.range_mi).filter((x) => typeof x === 'number') as number[]
    const hps = rows.map((r) => r.hp).filter((x) => typeof x === 'number') as number[]
    const bats = rows.map((r) => r.battery_kwh).filter((x) => typeof x === 'number') as number[]
    const preLows = rows.map((r) => parsePrice(r.preowned_range)).filter((x) => x !== null) as number[]
    const preHighs = rows.map((r) => {
      const parts = (r.preowned_range || '').split(/\s*[-\u2013]\s*/)
      return parts.length > 1 ? parsePrice(parts[1]) : parsePrice(r.preowned_range)
    }).filter((x) => x !== null) as number[]
    const cargo3s = rows.map((r) => r.cargo_behind_3rd_cu_ft).filter((x) => typeof x === 'number') as number[]
    const cargo2s = rows.map((r) => r.cargo_behind_2nd_cu_ft).filter((x) => typeof x === 'number') as number[]
    const dcChargeTimes = rows.map((r) => r.dc_fast_charge_10_80_min).filter((x) => typeof x === 'number') as number[]
    const sdTiers = rows.map((r) => selfDrivingOrdinal(r.self_driving_tier)).filter((x) => x > 0)
    return {
      vehicle: v,
      msrpLow: msrps.length ? Math.min(...msrps) : null,
      msrpHigh: msrps.length ? Math.max(...msrps) : null,
      rangeLow: ranges.length ? Math.min(...ranges) : null,
      rangeHigh: ranges.length ? Math.max(...ranges) : null,
      hpLow: hps.length ? Math.min(...hps) : null,
      hpHigh: hps.length ? Math.max(...hps) : null,
      battery: bats.length ? `${Math.min(...bats)}${Math.min(...bats) !== Math.max(...bats) ? `\u2013${Math.max(...bats)}` : ''}` : '\u2014',
      preLow: preLows.length ? Math.min(...preLows) : null,
      preHigh: preHighs.length ? Math.max(...preHighs) : null,
      cargo3Low: cargo3s.length ? Math.min(...cargo3s) : null,
      cargo3High: cargo3s.length ? Math.max(...cargo3s) : null,
      cargo2Low: cargo2s.length ? Math.min(...cargo2s) : null,
      cargo2High: cargo2s.length ? Math.max(...cargo2s) : null,
      dcChargeMin: dcChargeTimes.length ? Math.min(...dcChargeTimes) : null,
      selfDrivingMax: sdTiers.length ? Math.max(...sdTiers) : 0,
      selfDrivingLabel: sdTiers.length
        ? Object.entries(SELF_DRIVING_TIER_ORDER).find(([, ord]) => ord === Math.max(...sdTiers))?.[0] ?? '\u2014'
        : '\u2014',
      hasPreowned: rows.some(hasPreowned),
    }
  })

  // Compute ranks based on active prefs
  const ranks = computeRanks(rawSummaries as unknown as VehicleSummary[], activePref1, activePref2)

  // Sort by rank (ranked vehicles first, then alphabetical for unranked)
  const vehicleSummaries = [...rawSummaries].sort((a, b) => {
    const ra = ranks.get(a.vehicle)
    const rb = ranks.get(b.vehicle)
    if (ra !== undefined && rb !== undefined) return ra - rb
    if (ra !== undefined) return -1
    if (rb !== undefined) return 1
    return a.vehicle.localeCompare(b.vehicle)
  })

  return { vehicleSummaries, vehiclesInBudget: inBudget, ranks }
}, [filteredDetails, activePref1, activePref2])
```

Note: The destructured return now also includes `ranks`. Update the destructuring at the call site to:

```typescript
const { vehicleSummaries, vehiclesInBudget, ranks } = useMemo(() => {
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds. The `ranks` variable may show unused warning — that's OK, it's used in Task 6.

- [ ] **Step 3: Commit**

```bash
git add components/tabs/OverviewTab.tsx
git commit -m "feat: extend vehicleSummaries with DC charge time, self-driving tier, and ranking"
```

---

### Task 6: Update table and card rendering

**Files:**
- Modify: `components/tabs/OverviewTab.tsx:496-498` (card title / subtitle)
- Modify: `components/tabs/OverviewTab.tsx:504-514` (thead columns)
- Modify: `components/tabs/OverviewTab.tsx:522-541` (tbody cells)
- Modify: `components/tabs/OverviewTab.tsx:550-620` (mobile cards)

- [ ] **Step 1: Update the table subtitle**

Find the Speed Dating Results card title area (line 496-498). Replace:

```tsx
<div className="card-title">Speed Dating Results</div>
{showBudgetNote && <p className="count-note" style={{ marginBottom: 8 }}>Your best matches are highlighted.</p>}
{isPreowned && <p className="count-note" style={{ marginBottom: 8 }}>Showing pre-owned pricing. Your best matches are highlighted.</p>}
```

With:

```tsx
<div className="card-title">Speed Dating Results</div>
{(activePref1 || activePref2) && (() => {
  const effectivePrefs: string[] = []
  if (activePref1 && activePref1 !== 'sixseat') effectivePrefs.push(activePref1)
  if (activePref2 && activePref2 !== 'sixseat') effectivePrefs.push(activePref2)
  const prefLabel = (id: string) => PREFERENCE_OPTIONS.find((p) => p.id === id)?.label ?? id
  if (effectivePrefs.length === 2) {
    return <p className="count-note" style={{ marginBottom: 8 }}>Ranked by {prefLabel(effectivePrefs[0])} (primary) and {prefLabel(effectivePrefs[1])} (secondary)</p>
  } else if (effectivePrefs.length === 1) {
    return <p className="count-note" style={{ marginBottom: 8 }}>Ranked by {prefLabel(effectivePrefs[0])}</p>
  }
  return null
})()}
{showBudgetNote && <p className="count-note" style={{ marginBottom: 8 }}>Your best matches are highlighted.</p>}
{isPreowned && <p className="count-note" style={{ marginBottom: 8 }}>Showing pre-owned pricing.</p>}
```

- [ ] **Step 2: Update desktop table header columns**

Find the `<thead>` block (line 504-514). Replace with:

```tsx
<thead>
  <tr>
    <th className="col-sticky">Vehicle</th>
    <th className="num">{isPreowned ? 'Pre-Owned Price' : 'MSRP'}</th>
    <th className="num">Range (mi)</th>
    <th className="num">HP</th>
    <th className="num">Battery (kWh)</th>
    <th className="num">DC 10–80%</th>
    <th>Self-Driving Tier</th>
    <th className="num">Behind 3rd Row (cu ft)</th>
  </tr>
</thead>
```

- [ ] **Step 3: Update desktop table body cells**

Find the `<td>` rendering inside the `<tbody>` map (line 522-541). Replace the row content with:

```tsx
<tr key={s.vehicle} className={dimmed ? 'glance-row-dimmed' : ''}>
  <td className="col-sticky">
    <div className="col-sticky-ranked">
      {ranks.get(s.vehicle) !== undefined && (
        <span className="rank-badge">#{ranks.get(s.vehicle)}</span>
      )}
      {onVehicleClick
        ? <span style={{ cursor: 'pointer' }} onClick={() => onVehicleClick(s.vehicle)}><VehicleBadge vehicle={s.vehicle} /></span>
        : <Link href={`/vehicles/${toSlug(s.vehicle)}`}><VehicleBadge vehicle={s.vehicle} /></Link>
      }
    </div>
  </td>
  <td className="num">
    {isPreowned
      ? (s.preLow !== null ? `${fmtDollarK(s.preLow)}-${fmtDollarK(s.preHigh!)}` : '\u2014')
      : (s.msrpLow !== null ? `${fmtDollarK(s.msrpLow)}-${fmtDollarK(s.msrpHigh!)}` : '\u2014')
    }
  </td>
  <td className="num">{rangeStr(s.rangeLow, s.rangeHigh)}</td>
  <td className="num">{rangeStr(s.hpLow, s.hpHigh)}</td>
  <td className="num">{s.battery}</td>
  <td className="num">{s.dcChargeMin !== null ? `${s.dcChargeMin} min` : '\u2014'}</td>
  <td>{s.selfDrivingLabel}</td>
  <td className="num">{rangeStr(s.cargo3Low, s.cargo3High)}</td>
</tr>
```

- [ ] **Step 4: Update mobile card rendering**

Find the mobile card rendering (line 550-620). Update the card header to include rank badge, and replace the stat items to swap Charging/Behind 2nd Row for DC 10-80%/Self-Driving:

```tsx
<div className="cmp-card-view">
  <div className="cmp-cards">
    {vehicleSummaries.filter((s) => !WATCHLIST_VEHICLES.includes(s.vehicle)).map((s) => {
      const dimmed = isPreowned
        ? !s.hasPreowned || !vehiclesInBudget.has(s.vehicle)
        : !vehiclesInBudget.has(s.vehicle)
      const expanded = expandedVehicle === s.vehicle
      return (
        <div key={s.vehicle} className={`cmp-card glance-accordion${dimmed ? ' glance-row-dimmed' : ''}${expanded ? ' expanded' : ''}`}>
          <div className="cmp-card-header" onClick={() => setExpandedVehicle(expanded ? null : s.vehicle)}>
            {ranks.get(s.vehicle) !== undefined && (
              <span className="rank-badge">#{ranks.get(s.vehicle)}</span>
            )}
            <VehicleBadge vehicle={s.vehicle} />
            <Link
              href={`/vehicles/${toSlug(s.vehicle)}`}
              className="card-page-link"
              aria-label={`View ${s.vehicle} full page`}
              onClick={(e) => e.stopPropagation()}
            >
              <span aria-hidden="true">↗</span>
            </Link>
            <span className="accordion-chevron" />
          </div>
          <div className="cmp-card-stats">
            <div className="cmp-stat">
              <span className="cmp-stat-label">{isPreowned ? 'Pre-Owned Price' : 'MSRP'}</span>
              <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                {isPreowned
                  ? (s.preLow !== null ? `${fmtDollarK(s.preLow)}-${fmtDollarK(s.preHigh!)}` : '\u2014')
                  : (s.msrpLow !== null ? `${fmtDollarK(s.msrpLow)}-${fmtDollarK(s.msrpHigh!)}` : '\u2014')
                }
              </span>
            </div>
            <div className="cmp-stat">
              <span className="cmp-stat-label">Range</span>
              <span className="cmp-stat-value" style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                {rangeStr(s.rangeLow, s.rangeHigh, ' mi')}
              </span>
            </div>
            <div className="cmp-stat">
              <span className="cmp-stat-label">HP</span>
              <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                {rangeStr(s.hpLow, s.hpHigh)}
              </span>
            </div>
            <div className="cmp-stat">
              <span className="cmp-stat-label">Battery</span>
              <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                {s.battery} kWh
              </span>
            </div>
            <div className="cmp-stat">
              <span className="cmp-stat-label">DC 10–80%</span>
              <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                {s.dcChargeMin !== null ? `${s.dcChargeMin} min` : '\u2014'}
              </span>
            </div>
            <div className="cmp-stat">
              <span className="cmp-stat-label">Self-Driving</span>
              <span className="cmp-stat-value">{s.selfDrivingLabel}</span>
            </div>
            {s.cargo3Low !== null && (
              <div className="cmp-stat">
                <span className="cmp-stat-label">Behind 3rd Row</span>
                <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>{rangeStr(s.cargo3Low, s.cargo3High)} cu ft</span>
              </div>
            )}
          </div>
        </div>
      )
    })}
  </div>
</div>
```

- [ ] **Step 5: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 6: Visual verification**

Run: `npm run dev`
- Open http://localhost:3000
- On the Speed Dating tab, select two preferences (e.g., Range ① and Horsepower ②)
- Verify: pills show ① and ② badges
- Verify: table is sorted by rank with #1, #2, etc. badges
- Verify: subtitle reads "Ranked by Range (primary) and Horsepower (secondary)"
- Verify: table shows DC 10–80% and Self-Driving Tier columns (not Charge Tech or Behind 2nd Row)
- Verify: mobile cards show rank badges and updated stats
- Verify: selecting Self-Driving shows red pill color and Self-Driving insight tiles
- Verify: switching pref order (click to promote pref2 to pref1) re-sorts the table
- Verify: with no prefs selected, table is alphabetical with no rank badges

- [ ] **Step 7: Commit**

```bash
git add components/tabs/OverviewTab.tsx
git commit -m "feat: render ranked Speed Dating table with rank badges and updated columns"
```

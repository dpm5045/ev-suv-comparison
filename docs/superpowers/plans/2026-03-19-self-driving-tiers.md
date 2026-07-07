# Self-Driving Tiers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured `sae_level` and `self_driving_tier` fields to every vehicle entry, display them in Side-by-Side with winner highlighting, and add a Self-Driving glossary section.

**Architecture:** Add two fields to each of the 140 detail entries in `ev-data.json`, update the TypeScript type, replace the single "Self Driving" metric in Side-by-Side with two rows (tier with highlighting + system name), and add a new glossary card.

**Tech Stack:** Next.js 14, TypeScript, CSS (no new dependencies)

**Spec:** `docs/superpowers/specs/2026-03-19-self-driving-tiers-design.md`

---

### Task 1: Add fields to TypeScript type

**Files:**
- Modify: `lib/data.ts:26-71` (DetailRow interface)

- [ ] **Step 1: Add `sae_level` and `self_driving_tier` to DetailRow**

In `lib/data.ts`, add these two fields after `self_driving: string` (line 38):

```typescript
  sae_level: 2 | 3 | 4 | 5 | null
  self_driving_tier: 'Basic L2' | 'Advanced L2' | 'L2+ Hands-Free' | 'L2+ Point-to-Point' | null
```

- [ ] **Step 2: Verify build compiles (will fail — fields missing from data)**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: Type errors about missing fields in ev-data.json (this is fine — Task 2 fixes it)

- [ ] **Step 3: Commit**

```bash
git add lib/data.ts
git commit -m "feat: add sae_level and self_driving_tier to DetailRow type"
```

---

### Task 2: Add tier data to all 140 vehicle entries

**Files:**
- Modify: `lib/ev-data.json` (all 140 detail entries)

The tier assignment is determined by the existing `self_driving` text value. Use this mapping:

| `self_driving` value (or pattern) | `sae_level` | `self_driving_tier` |
|---|---|---|
| Contains "Kia Highway Driving Assist" | 2 | "Basic L2" |
| Contains "Hyundai Highway Driving Assist" | 2 | "Basic L2" |
| Contains "Volvo Pilot Assist" | 2 | "Basic L2" |
| Contains "VW IQ.DRIVE" or "IQ.DRIVE" | 2 | "Basic L2" |
| "Toyota Safety Sense 4.0" | 2 | "Basic L2" |
| Contains "Mercedes Driver Assistance" | 2 | "Basic L2" |
| Contains "VinFast Highway Assist" | 2 | "Basic L2" |
| "Driver+ (Gen1 hardware)" | 2 | "Advanced L2" |
| Contains "Autonomy+" (includes "Rivian Driver+ / Autonomy+" and "Rivian Autonomy+ capable hardware") | 2 | "Advanced L2" |
| Contains "Lucid DreamDrive" | 2 | "Advanced L2" |
| Contains "Super Cruise" | 2 | "L2+ Hands-Free" |
| Contains "Tesla Autopilot" or "Full Self-Driving" | 2 | "L2+ Point-to-Point" |
| "TBD" | null | null |

- [ ] **Step 1: Write a Node script to add fields to every entry**

Create a temporary script `scripts/add-tiers.mjs`:

```javascript
import { readFileSync, writeFileSync } from 'fs'

const data = JSON.parse(readFileSync('lib/ev-data.json', 'utf8'))

function getTier(selfDriving) {
  if (!selfDriving || selfDriving === 'TBD') return { sae_level: null, self_driving_tier: null }
  const s = selfDriving.toLowerCase()
  if (s.includes('super cruise')) return { sae_level: 2, self_driving_tier: 'L2+ Hands-Free' }
  if (s.includes('tesla') || s.includes('autopilot') || s.includes('full self-driving') || s.includes('fsd'))
    return { sae_level: 2, self_driving_tier: 'L2+ Point-to-Point' }
  if (s.includes('autonomy+')) return { sae_level: 2, self_driving_tier: 'Advanced L2' }
  if (s.includes('driver+') || s.includes('dreamdrive'))
    return { sae_level: 2, self_driving_tier: 'Advanced L2' }
  // Everything else is Basic L2
  return { sae_level: 2, self_driving_tier: 'Basic L2' }
}

for (const row of data.details) {
  const { sae_level, self_driving_tier } = getTier(row.self_driving)
  // Insert after self_driving field
  const entries = Object.entries(row)
  const idx = entries.findIndex(([k]) => k === 'self_driving')
  const newEntries = [
    ...entries.slice(0, idx + 1),
    ['sae_level', sae_level],
    ['self_driving_tier', self_driving_tier],
    ...entries.slice(idx + 1),
  ]
  Object.keys(row).forEach(k => delete row[k])
  newEntries.forEach(([k, v]) => { row[k] = v })
}

writeFileSync('lib/ev-data.json', JSON.stringify(data, null, 2) + '\n')
console.log(`Updated ${data.details.length} entries`)
```

- [ ] **Step 2: Run the script**

Run: `node scripts/add-tiers.mjs`
Expected: "Updated 140 entries"

- [ ] **Step 3: Verify the output**

Run: `node -e "const d=require('./lib/ev-data.json'); const tiers={}; d.details.forEach(r=>{const t=r.self_driving_tier||'null'; tiers[t]=(tiers[t]||0)+1}); console.log(tiers)"`
Expected: Counts for each tier — verify they look reasonable (most should be "Basic L2", a handful "Advanced L2", some "L2+ Hands-Free", some "L2+ Point-to-Point", a few null).

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Delete the temporary script**

```bash
rm scripts/add-tiers.mjs
```

- [ ] **Step 6: Commit**

```bash
git add lib/ev-data.json
git commit -m "data: add sae_level and self_driving_tier to all 140 vehicle entries"
```

---

### Task 3: Add glossary entries to ev-data.json

**Files:**
- Modify: `lib/ev-data.json` (glossary array)

- [ ] **Step 1: Add two glossary entries**

In the `glossary` array in `ev-data.json`, find the existing "Self Driving" entry and add two new entries immediately after it:

```json
{
  "field": "SAE Level",
  "meaning": "SAE J3016 driving automation level (0–5)",
  "notes": "Level 0 = no automation. Level 1 = one function automated (cruise OR lane keep). Level 2 = steering + speed automated but driver must supervise at all times. Level 3 = car drives in specific conditions, driver can look away. Level 4 = car drives itself in defined areas, no human needed. Level 5 = full automation everywhere. All vehicles in our dataset are currently Level 2."
},
{
  "field": "Self Driving Tier",
  "meaning": "Capability classification within SAE Level 2",
  "notes": "Basic L2: adaptive cruise + lane keep, hands-on required. Advanced L2: adds automated lane changes or multi-sensor suites, still hands-on. L2+ Hands-Free: hands-off on mapped highways, eyes-on required. L2+ Point-to-Point: city + highway navigation with automated turns and intersections, driver supervises."
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/ev-data.json
git commit -m "data: add SAE Level and Self Driving Tier glossary entries"
```

---

### Task 4: Update Side-by-Side tab metrics

**Files:**
- Modify: `components/tabs/SideBySideTab.tsx:89-98` (Technology & Features section)

- [ ] **Step 1: Add tier rank helper**

At the top of `SideBySideTab.tsx`, after the `cargoStr` helper function (around line 31), add:

```typescript
const TIER_RANK: Record<string, number> = {
  'Basic L2': 1,
  'Advanced L2': 2,
  'L2+ Hands-Free': 3,
  'L2+ Point-to-Point': 4,
}
```

- [ ] **Step 2: Replace the "Self Driving" metric with two metrics**

In the `SECTIONS` array, find the Technology & Features section. Replace:

```typescript
{ label: 'Self Driving', render: r => r.self_driving || '—' },
```

with:

```typescript
{
  label: 'Self Driving Tier',
  render: r => r.self_driving_tier || '—',
  rawNum: r => r.self_driving_tier ? (TIER_RANK[r.self_driving_tier] ?? null) : null,
  higherIsBetter: true,
},
{ label: 'Self Driving System', render: r => r.self_driving || '—' },
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add components/tabs/SideBySideTab.tsx
git commit -m "ui: show self-driving tier with winner highlighting in Side-by-Side"
```

---

### Task 5: Add Self-Driving glossary card to GlossaryTab

**Files:**
- Modify: `components/tabs/GlossaryTab.tsx`

- [ ] **Step 1: Add SAE_LEVELS and TIER_DEFS data arrays**

After the `COMMON_NOTATIONS` array (around line 50), add:

```typescript
const SAE_LEVELS = [
  { level: 'Level 0', name: 'No Automation', detail: 'Driver does everything. Basic cruise control (no steering assist).' },
  { level: 'Level 1', name: 'Driver Assistance', detail: 'One function automated — either adaptive cruise control OR lane keeping, but not both simultaneously.' },
  { level: 'Level 2', name: 'Partial Automation', detail: 'Steering AND speed automated simultaneously, but the driver must monitor and be ready to intervene at all times. All vehicles in our dataset are Level 2.' },
  { level: 'Level 3', name: 'Conditional Automation', detail: 'The vehicle drives itself in specific conditions. The driver can look away but must take over when the system requests. Only Mercedes DRIVE PILOT (sedan) is certified L3 in the US.' },
  { level: 'Level 4', name: 'High Automation', detail: 'The vehicle drives itself in defined areas with no human intervention needed. Examples: Waymo robotaxis operating in geofenced cities.' },
  { level: 'Level 5', name: 'Full Automation', detail: 'The vehicle can drive itself everywhere in all conditions. No steering wheel needed. Does not exist yet.' },
]

const SELF_DRIVING_TIERS = [
  { tier: 'Basic L2', detail: 'Adaptive cruise control + lane keeping. Driver must keep hands on wheel and eyes on road at all times. Examples: Kia HDA, Hyundai HDA, Volvo Pilot Assist, Toyota Safety Sense, Mercedes Driver Assistance.' },
  { tier: 'Advanced L2', detail: 'Adds automated highway lane changes, on/off-ramp handling, or advanced multi-sensor suites beyond basic L2. Still hands-on. Examples: Rivian Driver+, Lucid DreamDrive.' },
  { tier: 'L2+ Hands-Free', detail: 'Hands-off driving on mapped and geofenced highways. Driver must keep eyes on the road and remain attentive. Example: Cadillac Super Cruise.' },
  { tier: 'L2+ Point-to-Point', detail: 'City and highway navigation with automated turns, intersections, and lane changes. Driver supervises at all times. Example: Tesla Full Self-Driving.' },
]
```

- [ ] **Step 2: Add the card as the first section in the JSX**

In the return statement, immediately after the `<p className="section-desc">` paragraph and before the `{/* ── Charging Standards Explained ── */}` comment, add:

```tsx
{/* ── Self-Driving Levels & Tiers ── */}
<div className="card">
  <div className="card-title">Self-Driving Levels &amp; Tiers</div>
  <p className="section-desc" style={{ marginBottom: '1rem' }}>
    The SAE J3016 standard defines six levels of driving automation (0–5). Every vehicle in our dataset is Level 2 — but there&apos;s a wide range of capability within that level. We use a four-tier system to distinguish them.
  </p>
  <div className="glossary-items">
    <div style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: 13, letterSpacing: '0.05em' }}>SAE AUTOMATION LEVELS</div>
    {SAE_LEVELS.map((s) => (
      <div key={s.level} className="glossary-item">
        <div className="glossary-field">
          {s.level} <span className="glossary-full-name">&mdash; {s.name}</span>
        </div>
        <div className="glossary-meaning">{s.detail}</div>
      </div>
    ))}
  </div>
  <div className="glossary-items" style={{ marginTop: '1.5rem' }}>
    <div style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: 13, letterSpacing: '0.05em' }}>OUR LEVEL 2 TIERS</div>
    {SELF_DRIVING_TIERS.map((t) => (
      <div key={t.tier} className="glossary-item">
        <div className="glossary-field">{t.tier}</div>
        <div className="glossary-meaning">{t.detail}</div>
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add components/tabs/GlossaryTab.tsx
git commit -m "ui: add Self-Driving Levels & Tiers glossary card as first section"
```

---

### Task 6: Update data validator

**Files:**
- Modify: `scripts/lib/data-validator.mjs:117-122`

- [ ] **Step 1: Add new fields to completeness check**

In `data-validator.mjs`, find the `completenessFields` array (line 117). Add `'sae_level'` and `'self_driving_tier'` to the array:

```javascript
const completenessFields = [
  'onboard_ac_kw', 'l2_10_100', 'l2_10_80', 'charging_type',
  'frunk_cu_ft', 'cargo_behind_3rd_cu_ft', 'cargo_behind_2nd_cu_ft',
  'cargo_behind_1st_cu_ft', 'fold_flat', 'hp', 'battery_kwh', 'range_mi',
  'self_driving', 'car_software', 'main_display',
  'sae_level', 'self_driving_tier',
]
```

- [ ] **Step 2: Run validator**

Run: `node scripts/validate-data.mjs` (or however the validator is invoked)
Expected: No new errors. TBD vehicles (BMW iX7, Subaru 3-Row EV, Genesis GV90) will have null values for these fields, which should already trigger existing warnings.

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/data-validator.mjs
git commit -m "chore: add sae_level and self_driving_tier to data completeness check"
```

---

### Task 7: Final verification

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Clean build, no errors

- [ ] **Step 2: Visual verification**

Start dev server (`npm run dev`), navigate to Side-by-Side tab:
1. Select 3 vehicles with different tiers (e.g., Kia EV9 = Basic L2, Cadillac Escalade IQ = L2+ Hands-Free, Tesla Model X = L2+ Point-to-Point)
2. Verify "Self Driving Tier" row shows tiers with green background on winner (L2+ Point-to-Point)
3. Verify "Self Driving System" row shows OEM names with no highlighting
4. Check mobile view — same rows should appear with star indicator on winner

- [ ] **Step 3: Verify Glossary tab**

Navigate to Glossary tab:
1. Verify "Self-Driving Levels & Tiers" card appears as the **first** section
2. Verify SAE levels 0–5 are listed
3. Verify the four L2 tiers are listed below

- [ ] **Step 4: Spot-check other tabs**

Verify Overview, Spec & Select, and Full Monty tabs still render correctly (no regressions).

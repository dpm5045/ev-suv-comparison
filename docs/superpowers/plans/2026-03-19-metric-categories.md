# Metric Categories Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize metric sections from 7 awkwardly grouped sections to 8 intuitive, industry-standard categories across SideBySideTab, GlossaryTab, and DetailPanel.

**Architecture:** Three independent config/code updates — one per component. Each component defines its own section structure (no shared config), so they can be updated independently. The section names and field assignments must match across all three.

**Tech Stack:** Next.js 14 / TypeScript / React

**Spec:** `docs/superpowers/specs/2026-03-19-metric-categories-design.md`

---

### Task 1: Update SideBySideTab sections

**Files:**
- Modify: `components/tabs/SideBySideTab.tsx:40-131` (the `SECTIONS` array)

- [ ] **Step 1: Replace the SECTIONS array**

Replace the entire `SECTIONS` array (lines 40–131) with the new 8-section layout. Key changes:
- "Key Stats" → "Pricing" (remove Seats, Drivetrain, EPA Range, Horsepower, Battery; keep MSRP + Pre-Owned Price)
- "Performance" → "Powertrain & Performance" (add Drivetrain + Horsepower from old Key Stats)
- New "Range & Charging" section (EPA Range + Battery from old Key Stats, all fields from old "Drivetrain & Charging" except Drivetrain itself)
- "Dimensions" — add Seats at the top
- "Technology & Features" → split into "Self-Driving" (first 3 fields + new SAE Level) and "Infotainment" (remaining 7 fields)
- "Cargo & Storage" — unchanged
- "Notes" — unchanged

```typescript
const SECTIONS: SectionDef[] = [
  {
    title: 'Pricing',
    metrics: [
      { label: 'MSRP', render: r => fmtMoney(r.msrp).text, rawNum: r => nv(r.msrp), higherIsBetter: false },
      { label: 'Pre-Owned Price', render: r => r.preowned_range || '—' },
    ],
  },
  {
    title: 'Powertrain & Performance',
    metrics: [
      { label: 'Drivetrain', render: r => r.drivetrain || '—' },
      {
        label: 'Horsepower',
        render: r => { const f = fmtNum(r.hp); return f.text + (typeof r.hp === 'number' ? ' hp' : '') },
        rawNum: r => nv(r.hp), higherIsBetter: true,
      },
      { label: 'Torque', render: r => typeof r.torque_lb_ft === 'number' ? `${r.torque_lb_ft.toLocaleString()} lb-ft` : (r.torque_lb_ft || '—'), rawNum: r => nv(r.torque_lb_ft), higherIsBetter: true },
      { label: '0–60 mph', render: r => typeof r.zero_to_60_sec === 'number' ? `${r.zero_to_60_sec} sec` : (r.zero_to_60_sec || '—'), rawNum: r => nv(r.zero_to_60_sec), higherIsBetter: false },
      { label: 'Curb Weight', render: r => typeof r.curb_weight_lbs === 'number' ? `${r.curb_weight_lbs.toLocaleString()} lbs` : (r.curb_weight_lbs || '—') },
      { label: 'Towing Capacity', render: r => typeof r.towing_lbs === 'number' ? `${r.towing_lbs.toLocaleString()} lbs` : (r.towing_lbs || '—'), rawNum: r => nv(r.towing_lbs), higherIsBetter: true },
    ],
  },
  {
    title: 'Range & Charging',
    metrics: [
      {
        label: 'EPA Range',
        render: r => { const f = fmtNum(r.range_mi); return f.text + (typeof r.range_mi === 'number' ? ' mi' : '') },
        rawNum: r => nv(r.range_mi), higherIsBetter: true,
      },
      {
        label: 'Battery',
        render: r => { const f = fmtNum(r.battery_kwh); return f.text + (typeof r.battery_kwh === 'number' ? ' kWh' : '') },
        rawNum: r => nv(r.battery_kwh), higherIsBetter: true,
      },
      { label: 'Charging Type', render: r => r.charging_type || '—' },
      { label: 'DC Fast Charge', render: r => typeof r.dc_fast_charge_kw === 'number' ? `${r.dc_fast_charge_kw} kW` : (r.dc_fast_charge_kw || '—'), rawNum: r => nv(r.dc_fast_charge_kw), higherIsBetter: true },
      { label: 'DC 10–80%', render: r => typeof r.dc_fast_charge_10_80_min === 'number' ? `${r.dc_fast_charge_10_80_min} min` : (r.dc_fast_charge_10_80_min || '—'), rawNum: r => nv(r.dc_fast_charge_10_80_min), higherIsBetter: false },
      { label: 'Onboard AC', render: r => r.onboard_ac_kw ? `${r.onboard_ac_kw} kW` : '—', rawNum: r => nv(r.onboard_ac_kw), higherIsBetter: true },
      { label: 'L2 10–80%', render: r => r.l2_10_80 ? `${r.l2_10_80} hrs` : '—', rawNum: r => nv(r.l2_10_80), higherIsBetter: false },
      { label: 'L2 10–100%', render: r => r.l2_10_100 ? `${r.l2_10_100} hrs` : '—', rawNum: r => nv(r.l2_10_100), higherIsBetter: false },
    ],
  },
  {
    title: 'Dimensions',
    metrics: [
      { label: 'Seats', render: r => r.seats != null ? String(r.seats) : '—' },
      { label: 'Length', render: r => typeof r.length_in === 'number' ? `${r.length_in} in` : (r.length_in || '—') },
      { label: 'Width', render: r => typeof r.width_in === 'number' ? `${r.width_in} in` : (r.width_in || '—') },
      { label: 'Height', render: r => typeof r.height_in === 'number' ? `${r.height_in} in` : (r.height_in || '—') },
      { label: 'Ground Clearance', render: r => typeof r.ground_clearance_in === 'number' ? `${r.ground_clearance_in} in` : (r.ground_clearance_in || '—') },
      { label: '3rd Row Legroom', render: r => typeof r.third_row_legroom_in === 'number' ? `${r.third_row_legroom_in} in` : (r.third_row_legroom_in || '—'), rawNum: r => nv(r.third_row_legroom_in), higherIsBetter: true },
      { label: '3rd Row Headroom', render: r => typeof r.third_row_headroom_in === 'number' ? `${r.third_row_headroom_in} in` : (r.third_row_headroom_in || '—'), rawNum: r => nv(r.third_row_headroom_in), higherIsBetter: true },
    ],
  },
  {
    title: 'Self-Driving',
    metrics: [
      {
        label: 'Self Driving Tier',
        render: r => r.self_driving_tier || '—',
        rawNum: r => r.self_driving_tier ? (TIER_RANK[r.self_driving_tier] ?? null) : null,
        higherIsBetter: true,
      },
      { label: 'SAE Level', render: r => r.sae_level || '—' },
      { label: 'Self Driving System', render: r => r.self_driving || '—' },
    ],
  },
  {
    title: 'Infotainment',
    metrics: [
      { label: 'Car Software', render: r => r.car_software || '—' },
      { label: 'Center Display', render: r => r.center_display || '—' },
      { label: 'Gauge Cluster', render: r => r.gauge_cluster || '—' },
      { label: 'HUD', render: r => r.hud || '—' },
      { label: 'Other Displays', render: r => r.other_displays || '—' },
      { label: 'Audio', render: r => r.audio || '—' },
      { label: 'Driver Profiles', render: r => r.driver_profiles || '—' },
    ],
  },
  {
    title: 'Cargo & Storage',
    metrics: [
      { label: 'Frunk', render: r => cargoStr(r.frunk_cu_ft, 'cu ft'), rawNum: r => r.frunk_cu_ft, higherIsBetter: true },
      { label: 'Behind 3rd Row', render: r => cargoStr(r.cargo_behind_3rd_cu_ft, 'cu ft'), rawNum: r => nv(r.cargo_behind_3rd_cu_ft), higherIsBetter: true },
      { label: 'Behind 2nd Row', render: r => cargoStr(r.cargo_behind_2nd_cu_ft, 'cu ft'), rawNum: r => r.cargo_behind_2nd_cu_ft, higherIsBetter: true },
      { label: 'Fold Flat', render: r => r.fold_flat || '—' },
      { label: 'Floor Width (Wheel Wells)', render: r => cargoStr(r.cargo_floor_width_in, 'in'), rawNum: r => nv(r.cargo_floor_width_in), higherIsBetter: true },
    ],
  },
  {
    title: 'Notes',
    metrics: [
      { label: 'Notes', render: r => r.notes || '—' },
    ],
  },
]
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: No type errors. The SAE Level metric uses `r.sae_level` which exists on the `DetailRow` type.

- [ ] **Step 3: Commit**

```bash
git add components/tabs/SideBySideTab.tsx
git commit -m "refactor: reorganize SideBySideTab into 8 metric sections"
```

---

### Task 2: Update GlossaryTab sections

**Files:**
- Modify: `components/tabs/GlossaryTab.tsx:69-100` (the `GLOSSARY_SECTIONS` array)

- [ ] **Step 1: Replace the GLOSSARY_SECTIONS array**

Replace lines 69–100 with the new 8-section layout. The `extra` tags move to their new sections.

```typescript
const GLOSSARY_SECTIONS: { title: string; fields: string[]; extra?: 'self-driving' | 'charging' }[] = [
  {
    title: 'Pricing',
    fields: ['Model Year', 'Trim', 'MSRP ($)', 'Destination ($)', 'Pre-Owned Price Range'],
  },
  {
    title: 'Powertrain & Performance',
    fields: ['Drivetrain', 'Horsepower (hp)', 'Torque', '0\u201360 mph', 'Curb Weight', 'Towing Capacity'],
  },
  {
    title: 'Range & Charging',
    fields: ['EPA/Est Range (mi)', 'Battery (kWh)', 'Charging Type', 'DC Fast Charge (kW)', 'DC Fast Charge 10\u201380%', 'Onboard AC (kW)', 'L2 10\u201380% (hrs.)'],
    extra: 'charging',
  },
  {
    title: 'Dimensions',
    fields: ['Seats', 'Length', 'Width', 'Height', 'Ground Clearance', '3rd Row Legroom', '3rd Row Headroom'],
  },
  {
    title: 'Self-Driving',
    fields: ['Self Driving', 'SAE Level', 'Self Driving Tier'],
    extra: 'self-driving',
  },
  {
    title: 'Infotainment',
    fields: ['Car Software', 'Center Display', 'Gauge Cluster', 'HUD', 'Other Displays', 'Audio', 'Driver Profiles'],
  },
  {
    title: 'Cargo & Storage',
    fields: ['Frunk Volume (cu ft)', 'Behind 3rd Row (cu ft)', 'Behind 2nd Row (cu ft)', 'Behind 1st Row (cu ft)', 'Fold Flat', 'Cargo Floor Width (in)'],
  },
  {
    title: 'Notes',
    fields: ['Sources', 'Notes'],
  },
]
```

Also update the comment on line 68 from `// Map glossary field names to sections matching the Side-by-Side tab` to `// Glossary sections — matches Side-by-Side tab categories`.

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/tabs/GlossaryTab.tsx
git commit -m "refactor: reorganize GlossaryTab into 8 metric sections"
```

---

### Task 3: Update DetailPanel sections

**Files:**
- Modify: `components/DetailPanel.tsx:64-108` (the `SpecSection` calls)

- [ ] **Step 1: Replace SpecSection calls**

Replace lines 64–108 (the `SpecSection` calls after the detail-grid) with the new 8-section layout. The detail-grid (lines 48–62) stays unchanged.

Key changes:
- "Performance" → "Powertrain & Performance" (add Drivetrain + Horsepower rows)
- New "Range & Charging" section (EPA Range, Battery, then all charging fields from old "Drivetrain & Charging")
- "Dimensions" — add Seats row at top
- "Technology & Features" → split into "Self-Driving" (3 rows + new SAE Level) and "Infotainment" (7 rows)
- Remove Drivetrain from the old "Drivetrain & Charging" section (it moves to Powertrain)

Replace lines 64–108 with:

```tsx
            <SpecSection title="Powertrain & Performance" rows={[
              ['Drivetrain', r.drivetrain],
              ['Horsepower', (() => { const f = fmtNum(r.hp); return f.text + (typeof r.hp === 'number' ? ' hp' : '') })()],
              ['Torque', typeof r.torque_lb_ft === 'number' ? `${r.torque_lb_ft} lb-ft` : r.torque_lb_ft],
              ['0–60 mph', typeof r.zero_to_60_sec === 'number' ? `${r.zero_to_60_sec} sec` : r.zero_to_60_sec],
              ['Curb Weight', typeof r.curb_weight_lbs === 'number' ? `${r.curb_weight_lbs.toLocaleString()} lbs` : r.curb_weight_lbs],
              ['Towing Capacity', typeof r.towing_lbs === 'number' ? `${r.towing_lbs.toLocaleString()} lbs` : r.towing_lbs],
            ]} />

            <SpecSection title="Range & Charging" rows={[
              ['EPA Range', (() => { const f = fmtNum(r.range_mi); return f.text + (typeof r.range_mi === 'number' ? ' mi' : '') })()],
              ['Battery', (() => { const f = fmtNum(r.battery_kwh); return f.text + (typeof r.battery_kwh === 'number' ? ' kWh' : '') })()],
              ['Charging Type', r.charging_type],
              ['DC Fast Charge', typeof r.dc_fast_charge_kw === 'number' ? `${r.dc_fast_charge_kw} kW` : r.dc_fast_charge_kw],
              ['DC 10–80%', typeof r.dc_fast_charge_10_80_min === 'number' ? `${r.dc_fast_charge_10_80_min} min` : r.dc_fast_charge_10_80_min],
              ['Onboard AC', r.onboard_ac_kw ? `${r.onboard_ac_kw} kW` : '—'],
              ['L2 10–80%', r.l2_10_80 ? `${r.l2_10_80} hrs` : '—'],
              ['L2 10–100%', r.l2_10_100 ? `${r.l2_10_100} hrs` : '—'],
            ]} />

            <SpecSection title="Dimensions" rows={[
              ['Seats', r.seats ?? '—'],
              ['Length', typeof r.length_in === 'number' ? `${r.length_in} in` : r.length_in],
              ['Width', typeof r.width_in === 'number' ? `${r.width_in} in` : r.width_in],
              ['Height', typeof r.height_in === 'number' ? `${r.height_in} in` : r.height_in],
              ['Ground Clearance', typeof r.ground_clearance_in === 'number' ? `${r.ground_clearance_in} in` : r.ground_clearance_in],
              ['3rd Row Legroom', typeof r.third_row_legroom_in === 'number' ? `${r.third_row_legroom_in} in` : r.third_row_legroom_in],
              ['3rd Row Headroom', typeof r.third_row_headroom_in === 'number' ? `${r.third_row_headroom_in} in` : r.third_row_headroom_in],
            ]} />

            <SpecSection title="Self-Driving" rows={[
              ['Self Driving Tier', r.self_driving_tier],
              ['SAE Level', r.sae_level],
              ['Self Driving', r.self_driving],
            ]} />

            <SpecSection title="Infotainment" rows={[
              ['Car Software', r.car_software],
              ['Center Display', r.center_display],
              ['Gauge Cluster', r.gauge_cluster],
              ['HUD', r.hud],
              ['Other Displays', r.other_displays],
              ['Audio', r.audio],
              ['Driver Profiles', r.driver_profiles],
            ]} />

            <SpecSection title="Cargo & Storage" rows={[
              ['Frunk', typeof r.frunk_cu_ft === 'number' ? `${r.frunk_cu_ft} cu ft` : r.frunk_cu_ft],
              ['Behind 3rd Row', typeof r.cargo_behind_3rd_cu_ft === 'number' ? `${r.cargo_behind_3rd_cu_ft} cu ft` : r.cargo_behind_3rd_cu_ft],
              ['Behind 2nd Row', typeof r.cargo_behind_2nd_cu_ft === 'number' ? `${r.cargo_behind_2nd_cu_ft} cu ft` : r.cargo_behind_2nd_cu_ft],
              ['Fold Flat', r.fold_flat],
              ['Floor Width (Wheel Wells)', typeof r.cargo_floor_width_in === 'number' ? `${r.cargo_floor_width_in} in` : r.cargo_floor_width_in],
            ]} />
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add components/DetailPanel.tsx
git commit -m "refactor: reorganize DetailPanel into 8 metric sections"
```

---

### Task 4: Final verification

- [ ] **Step 1: Run production build**

Run: `npm run build`
Expected: Clean build, no errors.

- [ ] **Step 2: Visual verification at localhost:3000**

Check all three views:
1. **Side-by-Side tab** — 8 section headers visible: Pricing, Powertrain & Performance, Range & Charging, Dimensions, Self-Driving, Infotainment, Cargo & Storage, Notes
2. **Glossary tab** — 8 accordion sections with matching names. Self-Driving accordion shows SAE levels + tiers. Range & Charging accordion shows charging standards + notations.
3. **Detail Panel** (click any vehicle row) — detail-grid unchanged at top, then 8 SpecSection groups below with matching names. SAE Level row visible in Self-Driving section.

- [ ] **Step 3: Final commit (if any fixes needed) and push**

```bash
git push
```

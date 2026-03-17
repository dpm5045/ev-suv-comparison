# Accessories Tab — Design Spec

**Date:** 2026-03-17
**Status:** Approved
**Replaces:** `2026-03-17-affiliate-links-v2-design.md` (vehicle pages + Side-by-Side placements are no longer needed — this tab becomes the dedicated accessories destination)

## Overview

Add a new "Accessories" tab to the dashboard, positioned after "Glossary" in the tab order. The tab serves as the primary Amazon Associates affiliate destination, featuring:

1. **Must-Have section** — universal 3-row EV product categories, always visible
2. **Vehicle-specific section** — appears when a Make & Model + Year is selected via filters

All links are Amazon search URLs with `tag=threerowev-20`.

---

## Tab Integration

### Tab ID & Label

- Tab ID: `accessories`
- Tab label: `Accessories`
- Position: append to end of the `TABS` array (after `glossary`). About is rendered separately outside the TABS loop.
- Mobile drawer: Accessories should appear in the mobile drawer (it is not filtered out like Full Monty)

### Files that need tab registration

- `components/Header.tsx` — add `'accessories'` to the `TabId` type union
- `components/DashboardNav.tsx` — add `{ id: 'accessories', label: 'Accessories' }` to the end of the `TABS` array
- `components/Dashboard.tsx` — add `{tab === 'accessories' && <AccessoriesTab />}` to the tab rendering block, import the new component. **Do NOT** add `av`/`ay` param reading to Dashboard's param declarations — AccessoriesTab reads its own params internally.

### URL params

- `?tab=accessories` — shows the tab with default Must-Have products
- `?tab=accessories&av={vehicle}&ay={year}` — shows the tab with a vehicle pre-selected (`av` = accessories vehicle, `ay` = accessories year, prefixed to avoid collision with existing comparison filters). The `av` value uses the `vehicle` field from `DetailRow` (e.g., `Kia EV9`), URL-encoded.

---

## 1. Must-Have Section (always visible)

### Section Title
"Must-Have EV Accessories"

### Section Description
"Top-rated accessories for any 3-row electric SUV."

### Product Categories

Each category is a card with a title, brief description, and an Amazon search link pill.

| Category | Description | Search Query |
|----------|-------------|-------------|
| Level 2 Home Charger | Charge overnight at home with a 240V Level 2 charger | `Level 2 EV home charger 240V` |
| Portable EV Charger | Plug into any outlet on the go — essential for road trips | `portable EV charger Level 1 Level 2` |
| Charging Adapters | NACS, CCS, and J1772 adapters for universal charging access | `EV charging adapter NACS CCS` |
| All-Weather Floor Mats | Protect your interior from mud, snow, and spills | `3 row SUV all-weather floor mats` |
| Cargo Organizers | Keep your trunk tidy with collapsible organizers and nets | `SUV cargo organizer trunk` |
| Cargo Liner | Full-coverage trunk protection for hauling gear | `3 row SUV cargo liner` |
| Sunshades & Window Covers | Keep your cabin cool and protect the interior | `SUV windshield sunshade` |
| Tire Inflator | Portable tire inflator — a must for any EV without a spare | `portable tire inflator car` |

### Layout

- Cards arranged in a responsive grid (`auto-fill` with `minmax(280px, 1fr)` — typically 2 columns on desktop, may be 3 on wide screens, 1 on mobile)
- Each card contains:
  - Category name (bold)
  - One-line description (muted text)
  - Amazon pill link with `rel="noopener noreferrer sponsored"` and `target="_blank"`: `<span class="affiliate-link-amazon">Amazon</span> Shop {Category} <span class="affiliate-link-arrow">↗</span>`
- Cards use existing `.card` or similar styling from the site

---

## 2. Vehicle-Specific Section (shown when filtered)

### Filter Bar

Two dropdowns at the top of the tab, above the Must-Have section:

1. **Vehicle** dropdown — populated from `DATA.details` unique vehicle names, sorted alphabetically. Default placeholder: "Select a vehicle..."
2. **Year** dropdown — populated from years available for the selected vehicle. Disabled with placeholder "Select vehicle first" until a vehicle is chosen. When enabled, placeholder: "Select year..."

Filter state is URL-driven (`av` and `ay` params), matching the site's existing URL-driven pattern. Selecting a vehicle clears the year. Clearing the vehicle hides the vehicle-specific section.

### Section Title
"Accessories for {year} {vehicle}" (e.g., "Accessories for 2026 Kia EV9")

### Section Description
"Accessories designed to fit your {vehicle}."

### Vehicle-Specific Categories

| Category | Search Query |
|----------|-------------|
| Floor Mats | `{year} {vehicle} floor mats` |
| Cargo Liner | `{year} {vehicle} cargo liner` |
| Cargo Organizer | `{vehicle} cargo organizer` |
| Roof Rack / Cross Bars | `{vehicle} roof rack cross bars` |
| Mud Flaps | `{vehicle} mud flaps` |
| Screen Protector | `{vehicle} screen protector` |
| Center Console Organizer | `{vehicle} center console organizer` |
| Charging Adapter | Based on the vehicle's `charging_type`: use `getChargingLinks()` from `lib/affiliate.ts` but **only render the adapter link** (the first item if present). Skip the "Portable EV Charger" and "Level 2 Home Charger" entries that `getChargingLinks()` always appends — those are already in the Must-Have section. If `getChargingLinks()` returns no adapter (TBD vehicles), hide this card. |

### Layout

- Same card grid as Must-Have section
- Appears below the filter bar and above the Must-Have section (vehicle-specific is more relevant when filtered)
- When no vehicle is selected, this section is hidden entirely

---

## 3. Cross-Linking (from other tabs)

Other tabs can link to the Accessories tab with a vehicle pre-selected:

- **Side-by-Side column headers** — small "See Accessories" text link → `?tab=accessories&av={vehicle}&ay={year}`
- **Vehicle pages** (`/vehicles/[slug]`) — "Shop Accessories" CTA in Keep Exploring section → `/?tab=accessories&av={vehicle}`
- **DetailPanel** — the existing "Shop Compatible Accessories" section (V1) can be replaced or supplemented with a link to the Accessories tab

These cross-links are **deferred to a follow-up task** — get the tab working first, then add cross-links.

---

## 4. Disclosure

Amazon Associates disclosure appears once at the bottom of the tab:

```
As an Amazon Associate, we earn from qualifying purchases.
```

Uses existing `AFFILIATE_DISCLOSURE` from `lib/affiliate.ts`.

---

## 5. Component Structure

### New file: `components/tabs/AccessoriesTab.tsx`

Client component (`'use client'`). Receives no props — reads filter state from URL params via `useSearchParams()` and pushes updates via `useRouter()`, matching the site's existing URL-driven pattern.

### Imports from existing modules

- `DATA` from `@/lib/data` — for vehicle/year lists and `charging_type` lookup
- `amazonSearchUrl`, `getChargingLinks`, `AFFILIATE_DISCLOSURE` from `@/lib/affiliate`
- `useRouter`, `useSearchParams` from `next/navigation`

### Data constants

The Must-Have and Vehicle-Specific category definitions can be defined as arrays within `AccessoriesTab.tsx` (not in `lib/affiliate.ts`) since they're only used by this component. If they grow large, extract to a separate config file later.

---

## 6. Styling

Reuses existing CSS classes where possible:

- `.card` for category cards
- `.affiliate-link`, `.affiliate-link-amazon`, `.affiliate-link-arrow` for Amazon pills
- `.affiliate-disclosure` for the disclosure footnote
- `.filter-group`, `.filter-label` for the vehicle/year dropdowns (same pattern as comparison filters)
- `.section-title`, `.section-desc` for section headers

### New CSS (minimal)

```css
.accessories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.accessories-card {
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.accessories-card-title {
  font-weight: 600;
  font-size: 15px;
}
.accessories-card-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.4;
}
```

---

## 7. What Does NOT Change

- `lib/ev-data.json` — no schema changes
- `lib/affiliate.ts` — no new exports needed. The existing `getAccessoryLinks()` is used by `DetailPanel` and remains untouched; `AccessoriesTab` defines its own larger category set internally.
- Existing V1 placements (GlossaryTab, DetailPanel) — remain as-is for now
- Other tab components — untouched

---

## 8. Files Affected

| File | Change |
|------|--------|
| `components/tabs/AccessoriesTab.tsx` | **New** — the Accessories tab component |
| `components/Header.tsx` | Add `'accessories'` to `TabId` type |
| `components/DashboardNav.tsx` | Add Accessories entry to `TABS` array |
| `components/Dashboard.tsx` | Import and render `AccessoriesTab` |
| `app/globals.css` | Add `.accessories-grid`, `.accessories-card`, `.accessories-card-title`, `.accessories-card-desc` styles |

---

## 9. V2 Spec Superseded

The `2026-03-17-affiliate-links-v2-design.md` spec (vehicle page + Side-by-Side direct Amazon links) is superseded by this spec. Those placements will be reimagined as cross-links into this Accessories tab in a follow-up task.

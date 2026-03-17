# Accessories Tab Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated "Accessories" tab to the dashboard with universal Must-Have products and vehicle-specific accessories filtered by Make & Model + Year.

**Architecture:** New `AccessoriesTab` client component reads `av`/`ay` URL params for vehicle filter state. Category data is defined as constants within the component. All links use `amazonSearchUrl()` from the existing `lib/affiliate.ts`. Tab is registered in Header, DashboardNav, and Dashboard.

**Tech Stack:** TypeScript, Next.js 14, React (`useSearchParams`/`useRouter`), CSS

**Spec:** `docs/superpowers/specs/2026-03-17-accessories-tab-design.md`

---

### Task 1: Add CSS styles for accessories grid and cards

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add accessories CSS**

Find the existing `/* ── Affiliate links ── */` section in `globals.css`. Add the following new rules after the `.affiliate-disclosure` rule:

```css
/* ── Accessories tab ── */
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
.accessories-filters {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat: add accessories tab CSS styles"
```

---

### Task 2: Register the Accessories tab in navigation

**Files:**
- Modify: `components/Header.tsx:5`
- Modify: `components/DashboardNav.tsx:12`
- Modify: `components/Dashboard.tsx:12,114`

- [ ] **Step 1: Update `TabId` type in Header.tsx**

In `components/Header.tsx`, line 5, change:

```typescript
export type TabId = 'overview' | 'specselect' | 'comparison' | 'sidebyside' | 'glossary' | 'about'
```

to:

```typescript
export type TabId = 'overview' | 'specselect' | 'comparison' | 'sidebyside' | 'glossary' | 'accessories' | 'about'
```

- [ ] **Step 2: Add tab entry in DashboardNav.tsx**

In `components/DashboardNav.tsx`, line 12 (after the `glossary` entry in the `TABS` array), add:

```typescript
  { id: 'accessories', label: 'Accessories' },
```

The full TABS array should now be:
```typescript
const TABS: { id: TabId; label: string }[] = [
  { id: 'specselect', label: 'Spec & Select' },
  { id: 'sidebyside', label: 'Side-by-Side' },
  { id: 'comparison', label: 'The Full Monty' },
  { id: 'glossary', label: 'Glossary' },
  { id: 'accessories', label: 'Accessories' },
]
```

Note: The mobile drawer filters out `comparison` (line 62: `TABS.filter(t => t.id !== 'comparison')`). The Accessories tab is NOT filtered, so it will appear in the mobile drawer automatically.

- [ ] **Step 3: Add tab rendering in Dashboard.tsx**

In `components/Dashboard.tsx`, add the import at line 12 (after the GlossaryTab import):

```typescript
import AccessoriesTab from './tabs/AccessoriesTab'
```

Then add the tab rendering after the glossary line (after line 114):

```typescript
        {tab === 'accessories' && <AccessoriesTab />}
```

Do NOT add `av`/`ay` param reading to Dashboard's variable declarations — AccessoriesTab reads its own params internally.

- [ ] **Step 4: Commit**

```bash
git add components/Header.tsx components/DashboardNav.tsx components/Dashboard.tsx
git commit -m "feat: register Accessories tab in navigation"
```

---

### Task 3: Create the AccessoriesTab component

**Files:**
- Create: `components/tabs/AccessoriesTab.tsx`

- [ ] **Step 1: Create the component file**

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { DATA } from '@/lib/data'
import { amazonSearchUrl, getChargingLinks, AFFILIATE_DISCLOSURE } from '@/lib/affiliate'

// ── Must-Have categories (always shown) ──────────────────────────────────────

const MUST_HAVES: { title: string; desc: string; query: string }[] = [
  { title: 'Level 2 Home Charger', desc: 'Charge overnight at home with a 240V Level 2 charger.', query: 'Level 2 EV home charger 240V' },
  { title: 'Portable EV Charger', desc: 'Plug into any outlet on the go — essential for road trips.', query: 'portable EV charger Level 1 Level 2' },
  { title: 'Charging Adapters', desc: 'NACS, CCS, and J1772 adapters for universal charging access.', query: 'EV charging adapter NACS CCS' },
  { title: 'All-Weather Floor Mats', desc: 'Protect your interior from mud, snow, and spills.', query: '3 row SUV all-weather floor mats' },
  { title: 'Cargo Organizers', desc: 'Keep your trunk tidy with collapsible organizers and nets.', query: 'SUV cargo organizer trunk' },
  { title: 'Cargo Liner', desc: 'Full-coverage trunk protection for hauling gear.', query: '3 row SUV cargo liner' },
  { title: 'Sunshades & Window Covers', desc: 'Keep your cabin cool and protect the interior.', query: 'SUV windshield sunshade' },
  { title: 'Tire Inflator', desc: 'Portable tire inflator — a must for any EV without a spare.', query: 'portable tire inflator car' },
]

// ── Vehicle-specific category templates ──────────────────────────────────────

function getVehicleCategories(vehicle: string, year: string): { title: string; query: string }[] {
  return [
    { title: 'Floor Mats', query: `${year} ${vehicle} floor mats` },
    { title: 'Cargo Liner', query: `${year} ${vehicle} cargo liner` },
    { title: 'Cargo Organizer', query: `${vehicle} cargo organizer` },
    { title: 'Roof Rack / Cross Bars', query: `${vehicle} roof rack cross bars` },
    { title: 'Mud Flaps', query: `${vehicle} mud flaps` },
    { title: 'Screen Protector', query: `${vehicle} screen protector` },
    { title: 'Center Console Organizer', query: `${vehicle} center console organizer` },
  ]
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AccessoriesTab() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const av = searchParams.get('av') ?? ''
  const ay = searchParams.get('ay') ?? ''

  // Vehicle list and year list
  const allVehicles = [...new Set(DATA.details.map(d => d.vehicle))].sort()
  const yearsForVehicle = av
    ? ([...new Set(DATA.details.filter(d => d.vehicle === av).map(d => d.year))].sort((a, b) => a - b))
    : []

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    // Clear year when vehicle changes
    if (key === 'av') params.delete('ay')
    router.push(`?${params.toString()}`, { scroll: false })
  }

  // Vehicle-specific charging adapter link (only the adapter, not generic charger links)
  const adapterLink = av && ay
    ? (() => {
        const trim = DATA.details.find(d => d.vehicle === av && String(d.year) === ay)
        if (!trim) return null
        const links = getChargingLinks(trim.charging_type)
        // First link is the adapter (if any); skip the always-appended Portable/L2 links
        return links.length > 2 ? links[0] : null
      })()
    : null

  const showVehicleSection = av && ay

  return (
    <>
      <h2 className="section-title">Accessories</h2>
      <p className="section-desc">
        Curated accessories for 3-row electric SUVs. Shop by vehicle or browse must-haves for any EV.
      </p>

      {/* ── Filter bar ── */}
      <div className="accessories-filters">
        <div className="filter-group">
          <span className="filter-label">Vehicle</span>
          <select value={av} onChange={e => updateParam('av', e.target.value)}>
            <option value="">Select a vehicle...</option>
            {allVehicles.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <span className="filter-label">Year</span>
          <select value={ay} disabled={!av} onChange={e => updateParam('ay', e.target.value)}>
            <option value="">{av ? 'Select year...' : 'Select vehicle first'}</option>
            {yearsForVehicle.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* ── Vehicle-specific section ── */}
      {showVehicleSection && (
        <>
          <h3 className="section-title" style={{ fontSize: 18 }}>Accessories for {ay} {av}</h3>
          <p className="section-desc">Accessories designed to fit your {av}.</p>
          <div className="accessories-grid">
            {getVehicleCategories(av, ay).map(cat => (
              <div key={cat.title} className="accessories-card">
                <div className="accessories-card-title">{cat.title}</div>
                <a
                  href={amazonSearchUrl(cat.query)}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="affiliate-link"
                >
                  <span className="affiliate-link-amazon">Amazon</span> Shop {cat.title} <span className="affiliate-link-arrow" aria-hidden="true">↗</span>
                </a>
              </div>
            ))}
            {adapterLink && (
              <div className="accessories-card">
                <div className="accessories-card-title">Charging Adapter</div>
                <a
                  href={adapterLink.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="affiliate-link"
                >
                  <span className="affiliate-link-amazon">Amazon</span> {adapterLink.text} <span className="affiliate-link-arrow" aria-hidden="true">↗</span>
                </a>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Must-Have section ── */}
      <h3 className="section-title" style={{ fontSize: 18, marginTop: showVehicleSection ? 32 : 0 }}>Must-Have EV Accessories</h3>
      <p className="section-desc">Top-rated accessories for any 3-row electric SUV.</p>
      <div className="accessories-grid">
        {MUST_HAVES.map(cat => (
          <div key={cat.title} className="accessories-card">
            <div className="accessories-card-title">{cat.title}</div>
            <div className="accessories-card-desc">{cat.desc}</div>
            <a
              href={amazonSearchUrl(cat.query)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="affiliate-link"
            >
              <span className="affiliate-link-amazon">Amazon</span> Shop {cat.title} <span className="affiliate-link-arrow" aria-hidden="true">↗</span>
            </a>
          </div>
        ))}
      </div>

      <p className="affiliate-disclosure">{AFFILIATE_DISCLOSURE}</p>
    </>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds with no type errors

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`, navigate to `?tab=accessories`. Confirm:
- Filter bar appears with Vehicle and Year dropdowns
- Year dropdown is disabled and shows "Select vehicle first" when no vehicle is selected
- Must-Have section shows 8 cards in a responsive grid
- Selecting a vehicle + year shows the vehicle-specific section above Must-Haves
- Vehicle-specific section shows 7 generic cards + 1 charging adapter card (for NACS/CCS vehicles)
- TBD charging type vehicles show no charging adapter card
- All Amazon links include `tag=threerowev-20` in the URL
- Disclosure text appears at the bottom
- Tab appears in both desktop nav and mobile drawer

- [ ] **Step 4: Commit**

```bash
git add components/tabs/AccessoriesTab.tsx
git commit -m "feat: create AccessoriesTab component with must-have and vehicle-specific sections"
```

---

### Task 4: Build verification and lint

**Files:** None (verification only)

- [ ] **Step 1: Run production build**

Run: `npm run build`
Expected: Build succeeds, no errors

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No new lint errors

- [ ] **Step 3: Final commit (if any lint fixes needed)**

```bash
git add -A
git commit -m "fix: resolve lint issues from accessories tab implementation"
```

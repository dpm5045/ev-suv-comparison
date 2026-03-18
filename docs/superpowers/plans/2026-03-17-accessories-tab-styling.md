# Accessories Tab Styling Refresh Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add category accent colors, prominent CTA buttons, and visual distinction between Must-Have and vehicle-specific cards on the Accessories tab.

**Architecture:** Update `.accessories-card` base CSS to use `--card-accent`/`--card-tint` custom properties (matching the `overview-stat` pattern). Add `data-category` attributes to card divs in the component. Add `.accessories-cta` class for wider Amazon buttons.

**Tech Stack:** CSS custom properties, React `data-` attributes

**Spec:** `docs/superpowers/specs/2026-03-17-accessories-tab-styling-design.md`

---

### Task 1: Update CSS — card accent system and CTA button

**Files:**
- Modify: `app/globals.css:805-828`

- [ ] **Step 1: Update `.accessories-card` base rule**

Replace the existing `.accessories-card` block (lines 805-813):

```css
.accessories-card {
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```

with:

```css
.accessories-card {
  padding: 16px;
  --card-accent: transparent;
  --card-tint: transparent;
  border: 1px solid var(--border);
  border-left: 3px solid var(--card-accent);
  background: linear-gradient(var(--card-tint), var(--card-tint)), var(--surface);
  border-radius: 2px 10px 10px 2px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```

- [ ] **Step 2: Add category color rules**

After the `.accessories-filters` block (after line 828), add:

```css
.accessories-card[data-category="charging"] {
  --card-accent: var(--amber);
  --card-tint: rgba(251, 191, 36, 0.06);
}
.accessories-card[data-category="protection"] {
  --card-accent: var(--teal);
  --card-tint: rgba(45, 212, 191, 0.06);
}
.accessories-card[data-category="organization"] {
  --card-accent: var(--green);
  --card-tint: rgba(74, 222, 128, 0.06);
}
.accessories-card[data-category="essentials"] {
  --card-accent: var(--orange);
  --card-tint: rgba(251, 146, 60, 0.06);
}
.accessories-card[data-category="vehicle"] {
  --card-accent: var(--accent);
  --card-tint: rgba(91, 164, 245, 0.06);
}
.accessories-cta {
  width: 100%;
  justify-content: center;
  padding: 8px 16px;
  font-size: 13px;
  margin-top: auto;
  white-space: normal;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.accessories-cta:hover {
  background: rgba(251, 191, 36, 0.1);
  border-color: rgba(251, 191, 36, 0.25);
  color: var(--text);
}
```

Note: `.accessories-cta` MUST appear after the `.affiliate-link` rules (which are at lines 755-796) to ensure hover styles override correctly. Placing it here in the accessories section satisfies this requirement.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add accessories card accent colors and CTA button styles"
```

---

### Task 2: Update AccessoriesTab component — data-category attributes and CTA class

**Files:**
- Modify: `components/tabs/AccessoriesTab.tsx`

- [ ] **Step 1: Add `category` field to `MUST_HAVES` type and data**

Change the type on line 9 from:

```typescript
const MUST_HAVES: { title: string; desc: string; query: string }[] = [
```

to:

```typescript
const MUST_HAVES: { title: string; desc: string; query: string; category: string }[] = [
```

Then add the `category` field to each entry:

```typescript
const MUST_HAVES: { title: string; desc: string; query: string; category: string }[] = [
  { title: 'Level 2 Home Charger', desc: 'Charge overnight at home with a 240V Level 2 charger.', query: 'Level 2 EV home charger 240V', category: 'charging' },
  { title: 'Portable EV Charger', desc: 'Plug into any outlet on the go — essential for road trips.', query: 'portable EV charger Level 1 Level 2', category: 'charging' },
  { title: 'Charging Adapters', desc: 'NACS, CCS, and J1772 adapters for universal charging access.', query: 'EV charging adapter NACS CCS', category: 'charging' },
  { title: 'All-Weather Floor Mats', desc: 'Protect your interior from mud, snow, and spills.', query: '3 row SUV all-weather floor mats', category: 'protection' },
  { title: 'Cargo Organizers', desc: 'Keep your trunk tidy with collapsible organizers and nets.', query: 'SUV cargo organizer trunk', category: 'organization' },
  { title: 'Cargo Liner', desc: 'Full-coverage trunk protection for hauling gear.', query: '3 row SUV cargo liner', category: 'protection' },
  { title: 'Sunshades & Window Covers', desc: 'Keep your cabin cool and protect the interior.', query: 'SUV windshield sunshade', category: 'protection' },
  { title: 'Tire Inflator', desc: 'Portable tire inflator — a must for any EV without a spare.', query: 'portable tire inflator car', category: 'essentials' },
]
```

- [ ] **Step 2: Add `data-category` to Must-Have card divs and update CTA class**

Replace the Must-Have card rendering (lines 136-149):

```tsx
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
```

with:

```tsx
        {MUST_HAVES.map(cat => (
          <div key={cat.title} className="accessories-card" data-category={cat.category}>
            <div className="accessories-card-title">{cat.title}</div>
            <div className="accessories-card-desc">{cat.desc}</div>
            <a
              href={amazonSearchUrl(cat.query)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="affiliate-link accessories-cta"
            >
              <span className="affiliate-link-amazon">Amazon</span> Shop {cat.title} <span className="affiliate-link-arrow" aria-hidden="true">↗</span>
            </a>
          </div>
        ))}
```

Changes: added `data-category={cat.category}` to the div, changed `className="affiliate-link"` to `className="affiliate-link accessories-cta"`.

- [ ] **Step 3: Add `data-category="vehicle"` to vehicle-specific card divs and update CTA class**

Replace the vehicle-specific card rendering (lines 102-113):

```tsx
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
```

with:

```tsx
            {getVehicleCategories(av, ay).map(cat => (
              <div key={cat.title} className="accessories-card" data-category="vehicle">
                <div className="accessories-card-title">{cat.title}</div>
                <a
                  href={amazonSearchUrl(cat.query)}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="affiliate-link accessories-cta"
                >
                  <span className="affiliate-link-amazon">Amazon</span> Shop {cat.title} <span className="affiliate-link-arrow" aria-hidden="true">↗</span>
                </a>
              </div>
            ))}
```

- [ ] **Step 4: Add `data-category="vehicle"` to the charging adapter card and update CTA class**

Replace the adapter card rendering (lines 115-127):

```tsx
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
```

with:

```tsx
            {adapterLink && (
              <div className="accessories-card" data-category="vehicle">
                <div className="accessories-card-title">Charging Adapter</div>
                <a
                  href={adapterLink.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="affiliate-link accessories-cta"
                >
                  <span className="affiliate-link-amazon">Amazon</span> {adapterLink.text} <span className="affiliate-link-arrow" aria-hidden="true">↗</span>
                </a>
              </div>
            )}
```

- [ ] **Step 5: Verify in browser**

Run: `npm run dev`, navigate to `?tab=accessories`. Confirm:
- Must-Have cards have colored left borders: amber (charging), teal (protection), green (organization), orange (essentials)
- Cards have subtle background tints matching their category
- Vehicle-specific cards (select a vehicle + year) have blue left borders
- CTA buttons span the full card width, are bottom-aligned across cards
- Hover on CTA shows warm amber tint
- "AMAZON" prefix label is visible — **visually evaluate whether to keep or remove**

- [ ] **Step 6: Commit**

```bash
git add components/tabs/AccessoriesTab.tsx
git commit -m "feat: add category accents and prominent CTA to accessories cards"
```

---

### Task 3: Build verification

**Files:** None (verification only)

- [ ] **Step 1: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No new lint errors

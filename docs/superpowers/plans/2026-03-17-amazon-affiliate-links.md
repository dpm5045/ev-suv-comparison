# Amazon Affiliate Links Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Amazon Associates affiliate links to GlossaryTab and DetailPanel to start the 180-day qualifying sales clock.

**Architecture:** New `lib/affiliate.ts` config module provides URL builder and charging-type matching logic. GlossaryTab and DetailPanel import from it. No data schema changes.

**Tech Stack:** TypeScript, Next.js 14, React components, CSS

**Spec:** `docs/superpowers/specs/2026-03-17-amazon-affiliate-links-design.md`

---

### Task 1: Create `lib/affiliate.ts` — shared affiliate config

**Files:**
- Create: `lib/affiliate.ts`

- [ ] **Step 1: Create the affiliate config module**

```typescript
export const AMAZON_TAG = 'threerowev-20'

export const AFFILIATE_DISCLOSURE =
  'As an Amazon Associate, we earn from qualifying purchases.'

export function amazonSearchUrl(query: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${AMAZON_TAG}`
}

// Glossary charging standard → Amazon search query mapping
export const GLOSSARY_AMAZON_LINKS: Record<string, { text: string; query: string }> = {
  NACS:  { text: 'Shop NACS Adapters',           query: 'NACS to CCS adapter EV' },
  CCS1:  { text: 'Shop CCS Adapters',            query: 'CCS to NACS adapter EV' },
  J1772: { text: 'Shop J1772 Cables',            query: 'J1772 EV charging cable' },
  L2:    { text: 'Shop Level 2 Chargers',         query: 'Level 2 EV home charger' },
  DCFC:  { text: 'Shop DC Fast Charge Adapters',  query: 'DC fast charge adapter EV' },
}

interface AffiliateLink {
  text: string
  url: string
}

/**
 * Returns contextual affiliate links based on the vehicle's charging type.
 * Adapter direction: adapter converts the station's plug to fit the vehicle's port.
 */
export function getChargingLinks(chargingType: string): AffiliateLink[] {
  const links: AffiliateLink[] = []
  const ct = (chargingType || '').trim()

  if (ct.startsWith('NACS')) {
    links.push({ text: 'CCS to NACS Adapter', url: amazonSearchUrl('CCS to NACS adapter EV') })
  } else if (ct.startsWith('CCS')) {
    links.push({ text: 'NACS to CCS Adapter', url: amazonSearchUrl('NACS to CCS adapter EV') })
  } else if (ct.includes('pre-NACS')) {
    links.push({ text: 'Tesla to J1772 Adapter', url: amazonSearchUrl('Tesla to J1772 adapter') })
  }
  // TBD / empty → no adapter links

  // Always-shown charging links
  links.push({ text: 'Portable EV Charger', url: amazonSearchUrl('portable EV charger') })
  links.push({ text: 'Level 2 Home Charger', url: amazonSearchUrl('Level 2 EV home charger') })

  return links
}

/**
 * Returns vehicle-specific accessory links.
 */
export function getAccessoryLinks(vehicle: string, year: number | string): AffiliateLink[] {
  return [
    { text: 'Cargo Organizers', url: amazonSearchUrl(`${vehicle} cargo organizer`) },
    { text: 'All-Weather Floor Mats', url: amazonSearchUrl(`${year} ${vehicle} floor mats`) },
  ]
}
```

- [ ] **Step 2: Verify the module compiles**

Run: `npm run build`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add lib/affiliate.ts
git commit -m "feat: add affiliate link config module (lib/affiliate.ts)"
```

---

### Task 2: Add affiliate link styles to `globals.css`

**Files:**
- Modify: `app/globals.css` (add after the detail panel styles, around line 744)

- [ ] **Step 1: Add affiliate link CSS**

Add after the `.detail-row-value` rule block (line 744):

```css
/* ── Affiliate links ── */
.affiliate-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 20px;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
.affiliate-link:hover {
  background: var(--surface3);
  color: var(--text);
}
.affiliate-link-amazon {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.5;
  margin-right: 2px;
}
.affiliate-link-arrow {
  font-size: 10px;
  opacity: 0.6;
}
.affiliate-links-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.affiliate-disclosure {
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 10px;
  font-style: italic;
}
```

- [ ] **Step 2: Verify dev server renders without errors**

Run: `npm run dev` (check no CSS parse errors in console)

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add affiliate link pill styles"
```

---

### Task 3: Add Amazon links to GlossaryTab charging standards

**Files:**
- Modify: `components/tabs/GlossaryTab.tsx`

- [ ] **Step 1: Add import**

At the top of the file, add:

```typescript
import { GLOSSARY_AMAZON_LINKS, amazonSearchUrl, AFFILIATE_DISCLOSURE } from '@/lib/affiliate'
```

- [ ] **Step 2: Add Amazon link to each charging standard entry**

Replace the `CHARGING_STANDARDS.map` render block (lines 69–74) with:

```tsx
{CHARGING_STANDARDS.map((s) => (
  <div key={s.abbr} className="glossary-item">
    <div className="glossary-field">
      {s.abbr} <span className="glossary-full-name">&mdash; {s.name}</span>
      {GLOSSARY_AMAZON_LINKS[s.abbr] && (
        <a
          href={amazonSearchUrl(GLOSSARY_AMAZON_LINKS[s.abbr].query)}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="affiliate-link"
          style={{ marginLeft: 10, verticalAlign: 'middle' }}
        >
          <span className="affiliate-link-amazon">Amazon</span> {GLOSSARY_AMAZON_LINKS[s.abbr].text} <span className="affiliate-link-arrow" aria-hidden="true">↗</span>
        </a>
      )}
    </div>
    <div className="glossary-meaning">{s.detail}</div>
  </div>
))}
```

- [ ] **Step 3: Add disclosure footnote**

After the closing `</div>` of the glossary-items div (after the map), add:

```tsx
<p className="affiliate-disclosure">{AFFILIATE_DISCLOSURE}</p>
```

This goes inside the "Charging Standards & Terminology" card, after the `.glossary-items` div.

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`, navigate to the Reference tab → Glossary. Confirm:
- NACS, CCS1, J1772, L2, DCFC entries each have a pill link
- kW and kWh entries do NOT have links
- Links open Amazon in a new tab with `tag=threerowev-20` in the URL (hover a link to inspect the href)
- Each pill shows "AMAZON" prefix label
- Disclosure text appears at the bottom of the card

- [ ] **Step 5: Commit**

```bash
git add components/tabs/GlossaryTab.tsx
git commit -m "feat: add Amazon affiliate links to glossary charging standards"
```

---

### Task 4: Add "Shop Compatible Accessories" section to DetailPanel

**Files:**
- Modify: `components/DetailPanel.tsx`

- [ ] **Step 1: Add imports**

At the top of the file, add:

```typescript
import { getChargingLinks, getAccessoryLinks, AFFILIATE_DISCLOSURE } from '@/lib/affiliate'
```

- [ ] **Step 2: Add the accessories section**

After the "Cargo & Storage" `SpecSection` (line 105) and before the notes conditional (line 107), add:

```tsx
<div className="detail-section">
  <div className="detail-section-title">Shop Compatible Accessories</div>
  <div className="affiliate-links-wrap">
    {getChargingLinks(r.charging_type ?? '').map((link) => (
      <a
        key={link.text}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="affiliate-link"
      >
        <span className="affiliate-link-amazon">Amazon</span> {link.text} <span className="affiliate-link-arrow" aria-hidden="true">↗</span>
      </a>
    ))}
    {getAccessoryLinks(r.vehicle, r.year).map((link) => (
      <a
        key={link.text}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="affiliate-link"
      >
        <span className="affiliate-link-amazon">Amazon</span> {link.text} <span className="affiliate-link-arrow" aria-hidden="true">↗</span>
      </a>
    ))}
  </div>
  <p className="affiliate-disclosure">{AFFILIATE_DISCLOSURE}</p>
</div>
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`, click any vehicle row to open the DetailPanel. Confirm:
- "Shop Compatible Accessories" section appears after Cargo & Storage
- NACS vehicles show "CCS to NACS Adapter" (e.g., Rivian R1S, Tesla Model X 2025+)
- CCS vehicles show "NACS to CCS Adapter" (e.g., older Kia EV9)
- All vehicles show Portable EV Charger, Level 2 Home Charger, Cargo Organizers, Floor Mats
- Floor mats link includes year + vehicle name (e.g., "2026 Kia EV9 floor mats")
- Links open Amazon in new tab with correct tag
- Disclosure text appears below the links

- [ ] **Step 4: Verify edge cases**

Check these specific vehicles in the DetailPanel:
- A NACS vehicle (e.g., 2025 Tesla Model X) → should show "CCS to NACS Adapter"
- A CCS vehicle (e.g., 2024 Kia EV9) → should show "NACS to CCS Adapter"
- A vehicle with TBD charging type (if any exist) → should show NO adapter link, only universal links
- A vehicle with "TBD (NACS likely)" → should also show NO adapter link (must not trigger NACS match)

- [ ] **Step 5: Commit**

```bash
git add components/DetailPanel.tsx
git commit -m "feat: add Shop Compatible Accessories section to DetailPanel"
```

---

### Task 5: Build verification

**Files:** None (verification only)

- [ ] **Step 1: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No new lint errors

- [ ] **Step 3: Final commit (if any lint fixes needed)**

```bash
git add -A
git commit -m "fix: resolve lint issues from affiliate link implementation"
```

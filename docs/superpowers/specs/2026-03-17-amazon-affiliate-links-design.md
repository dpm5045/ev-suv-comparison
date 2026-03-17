# Amazon Affiliate Links — Design Spec

**Date:** 2026-03-17
**Status:** Approved

## Overview

Add Amazon Associates affiliate links to two locations on threerowev.com:
1. **GlossaryTab** — contextual links next to charging standard entries
2. **DetailPanel** — "Shop Compatible Accessories" section at the bottom

**Approach:** Amazon search URL links (`/s?k=...&tag=threerowev-20`). No curated ASINs — Amazon handles product ranking. Zero maintenance, never goes stale.

**Goal:** Start the 180-day qualifying clock (3 sales required to keep the Amazon Associates account active).

---

## Affiliate Tag

- Store ID: `threerowev-20`
- Link format: `https://www.amazon.com/s?k={search+terms}&tag=threerowev-20`

---

## 1. Shared Config: `lib/affiliate.ts`

Create a single source of truth for affiliate link generation. Both GlossaryTab and DetailPanel import from here.

**Exports:**
- `AMAZON_TAG` — `"threerowev-20"`
- `amazonSearchUrl(query: string): string` — builds the full Amazon search URL with tag
- `AFFILIATE_DISCLOSURE` — `"As an Amazon Associate, we earn from qualifying purchases."`
- Product category constants mapping category keys to search terms
- `getAdapterLinks(chargingType: string)` — returns the appropriate adapter links based on charging type (see matching rules in Section 3)

---

## 2. GlossaryTab Changes

Add a small "Shop on Amazon" link next to these charging standard entries in the existing `CHARGING_STANDARDS` section:

| Entry | Link Text | Search Query |
|-------|-----------|-------------|
| NACS | Shop NACS Adapters | `NACS to CCS adapter EV` |
| CCS1 | Shop CCS Adapters | `CCS to NACS adapter EV` |
| J1772 | Shop J1772 Cables | `J1772 EV charging cable` |
| L2 | Shop Level 2 Chargers | `Level 2 EV home charger` |
| DCFC | Shop DC Fast Charge Adapters | `DC fast charge adapter EV` |

**Styling:**
- Small text, muted color, inline with the charging standard entry
- External link indicator (arrow or icon)
- Does not overpower the educational content

**Disclosure:**
- Footnote at bottom of glossary section: "As an Amazon Associate, we earn from qualifying purchases."

---

## 3. DetailPanel Changes

New section after "Cargo & Storage", before "Notes".

### Section Title
"Shop Compatible Accessories"

### Contextual Links (based on `charging_type`)

**Matching rules for `charging_type` field:**
- **NACS vehicle:** `charging_type.startsWith("NACS")` — matches `"NACS"`, `"NACS (+CCS adpt)"`, `"NACS (+CCS incl)"`, `"NACS / GB-T"`. Does NOT match `"Tesla (pre-NACS)"`.
- **CCS vehicle:** `charging_type.startsWith("CCS")` — matches `"CCS1"`, `"CCS"`, `"CCS1 (+NACS adpt)"`, `"CCS (+NACS adpt)"`.
- **Pre-NACS Tesla:** `charging_type.includes("pre-NACS")` — show Tesla-specific adapter link instead.
- **TBD / unknown:** If `charging_type` starts with `"TBD"` or is empty, show no adapter links (only the "always" links below).

| Condition | Link Text | Search Query |
|-----------|-----------|-------------|
| NACS vehicle | CCS to NACS Adapter | `CCS to NACS adapter EV` |
| CCS vehicle | NACS to CCS Adapter | `NACS to CCS adapter EV` |
| Pre-NACS Tesla | Tesla to J1772 Adapter | `Tesla to J1772 adapter` |
| Always | Portable EV Charger | `portable EV charger` |
| Always | Level 2 Home Charger | `Level 2 EV home charger` |

> **Note on adapter direction:** The adapter converts the *station's* plug to fit the *vehicle's* port. A NACS vehicle at a CCS station needs a "CCS to NACS" adapter. A CCS vehicle at a Supercharger needs a "NACS to CCS" adapter.

### Generic Accessory Links (always shown)

Uses `vehicle` field (e.g., "Kia EV9") plus year from `year` field for vehicle-specific searches.

| Link Text | Search Query |
|-----------|-------------|
| Cargo Organizers | `{vehicle} cargo organizer` (e.g., `Kia EV9 cargo organizer`) |
| All-Weather Floor Mats | `{year} {vehicle} floor mats` (e.g., `2026 Kia EV9 floor mats`) |

### Layout
- Links rendered as subtle pill/button elements in a flex-wrap row
- Each opens Amazon in a new tab
- `target="_blank"` with `rel="noopener noreferrer"`

### Disclosure
- Small footnote at bottom of section: "As an Amazon Associate, we earn from qualifying purchases."

---

## 4. Styling

- Links visually distinct from internal navigation — include "Amazon" label or subtle icon so users know the destination
- Muted, non-aggressive appearance consistent with the rest of the UI
- No changes to existing component styles — additions only

---

## 5. What Does NOT Change

- `ev-data.json` — no schema changes
- `DetailRow` type — no new fields
- URL routing / filter state — unaffected
- Existing component structure — only additions

---

## 6. Files Affected

| File | Change |
|------|--------|
| `lib/affiliate.ts` | **New** — affiliate config, URL builder, disclosure text |
| `components/tabs/GlossaryTab.tsx` | Add Amazon links to charging standards, add disclosure |
| `components/DetailPanel.tsx` | Add "Shop Compatible Accessories" section |
| `app/globals.css` | Add styles for affiliate link pills and disclosure text |

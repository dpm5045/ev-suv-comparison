# Accessories Tab Styling Refresh — Design Spec

**Date:** 2026-03-17
**Status:** Approved
**Depends on:** `2026-03-17-accessories-tab-design.md` (already implemented)

## Overview

Refresh the Accessories tab's visual design to break up the monotone card grid with category-specific accent colors, a more prominent Amazon CTA button, and visual distinction between Must-Have and vehicle-specific sections.

**Principle:** Match the site's existing "just the facts" editorial tone. No emojis, no playfulness — use color and layout the same way the Overview tab uses category-colored stat cards.

---

## 1. Category Accent Colors on Must-Have Cards

Each Must-Have card gets a **3px colored left border** and a **subtle background tint** based on its category group.

| Category Group | Cards | CSS Variable | Tint |
|---------------|-------|-------------|------|
| Charging | Level 2 Home Charger, Portable EV Charger, Charging Adapters | `--amber` | `rgba(251, 191, 36, 0.06)` |
| Protection | All-Weather Floor Mats, Cargo Liner, Sunshades & Window Covers | `--teal` | `rgba(45, 212, 191, 0.06)` |
| Organization | Cargo Organizers | `--green` | `rgba(74, 222, 128, 0.06)` |
| Essentials | Tire Inflator | `--orange` | `rgba(251, 146, 60, 0.06)` |

### Implementation

Add a `data-category` attribute to each card div, then style with CSS custom properties (matching the `overview-stat` pattern from the Overview tab).

Update the base `.accessories-card` rule to use CSS custom properties and adjust left border-radius:

```css
.accessories-card {
  /* ... existing properties ... */
  --card-accent: transparent;
  --card-tint: transparent;
  border-left: 3px solid var(--card-accent);
  background: linear-gradient(var(--card-tint), var(--card-tint)), var(--surface);
  border-radius: 2px 10px 10px 2px;
}
```

Note: The `border-radius` changes to `2px` on the left to cleanly meet the colored left border (matching the `overview-stat` pattern: `border-radius: 2px var(--radius) var(--radius) 2px`). The `linear-gradient` layering ensures the tint overlays the opaque `--surface` background rather than replacing it.

Category-specific rules only set the custom properties:

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
```

### Data change

Add a `category` field to each entry in the `MUST_HAVES` array:

| Card | Category |
|------|----------|
| Level 2 Home Charger | `charging` |
| Portable EV Charger | `charging` |
| Charging Adapters | `charging` |
| All-Weather Floor Mats | `protection` |
| Cargo Organizers | `organization` |
| Cargo Liner | `protection` |
| Sunshades & Window Covers | `protection` |
| Tire Inflator | `essentials` |

---

## 2. Vehicle-Specific Card Accent

All vehicle-specific cards (including the charging adapter card) use `--accent` (blue) as their left border with a matching tint:

```css
.accessories-card[data-category="vehicle"] {
  --card-accent: var(--accent);
  --card-tint: rgba(91, 164, 245, 0.06);
}
```

Add `data-category="vehicle"` to all vehicle-specific card divs, including the charging adapter card. This visually groups them and distinguishes them from the Must-Have section.

---

## 3. More Prominent CTA Button

Replace the small inline affiliate pill with a wider button that spans the card width. This is the primary action on a tab whose purpose is driving Amazon clicks.

### Current state
- 12px font, inline pill, `--text-muted` color, `--surface2` background

### New state
- 13px font, full card width (`width: 100%`, `justify-content: center`)
- Slightly taller padding (`8px 16px` instead of `5px 12px`)
- On hover: subtle warm tint (`rgba(251, 191, 36, 0.1)` background) to evoke Amazon's brand without being garish
- Keep the `AMAZON` prefix label and `↗` arrow — **review visually in browser before finalizing** (may remove the prefix if it feels cluttered at the larger button size)

### CSS

New class `.accessories-cta` that extends `.affiliate-link`. **Must appear after `.affiliate-link` rules in `globals.css`** to ensure hover styles override correctly.

```css
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

Notes:
- `margin-top: auto` pushes the button to the bottom of the card (since `.accessories-card` is `display: flex; flex-direction: column`), keeping buttons aligned across cards of varying content height.
- `white-space: normal` overrides the base `.affiliate-link` `nowrap` to handle long product names (e.g., "Sunshades & Window Covers") on narrow screens.
- `transition` adds `border-color` to the transition list so the hover border change is smooth.

---

## 4. Files Affected

| File | Change |
|------|--------|
| `components/tabs/AccessoriesTab.tsx` | Add `category` field to `MUST_HAVES`, add `data-category` attributes to card divs, change affiliate-link class to `affiliate-link accessories-cta` |
| `app/globals.css` | Add category color rules, `.accessories-cta` styles |

---

## 5. What Does NOT Change

- `lib/affiliate.ts` — no changes
- Tab registration (Header, DashboardNav, Dashboard) — no changes
- URL params or filter behavior — no changes
- Must-Have/vehicle-specific product lists — no changes to categories or Amazon queries
- Card grid layout (`.accessories-grid`) — unchanged

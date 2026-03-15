# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint via Next.js
```

No test framework is configured.

## Architecture

This is a **Next.js 14 App Router** app (TypeScript, no testing framework) focused on comparing 3-row AWD electric SUVs.

### Data flow

All vehicle data lives in **`lib/ev-data.json`** and is typed + exported via **`lib/data.ts`** as a single `DATA` object with four keys:
- `DATA.details` — array of `DetailRow` (one entry per trim, 59 total)
- `DATA.counts` / `DATA.count_totals` — sales counts by model year
- `DATA.glossary` — field definitions
- `DATA.preowned` — pre-owned price rows
- `VEHICLE_CLASSES` — map of vehicle name → CSS class (for color-coded badges)

`lib/utils.ts` exports `fmtMoney` and `fmtNum`, which return `{ text, className }` objects used across all table/card rendering.

### Component structure

```
Dashboard (state + URL routing)
├── Header
├── NavTabs            — tab switcher; active tab stored in ?tab= URL param
├── OverviewTab        — key insights stats, glance table/cards, charging standards, AI news
├── ComparisonV2Tab    — filterable table + mobile cards; filters in URL params (?vehicle=, ?year=, ?q=)
├── GlossaryTab
├── AssumptionsTab
└── DetailPanel        — slide-in sidebar for full specs; opened via row/card click
```

**Filter state is URL-driven.** `Dashboard` reads all filter values from `useSearchParams()` and pushes updates via `router.push()`. This means filters survive page refresh and are shareable.

`DetailPanel` is controlled by local `detailIdx` state (index into `DATA.details`) since it doesn't need to be shareable.

### Responsive layout pattern

Both `OverviewTab` and `ComparisonV2Tab` use a dual-render pattern: a desktop `<table>` (`.cmp-table-view`) and a mobile card grid (`.cmp-card-view`). On mobile, a Cards/Table toggle button controls which is visible via CSS classes (`.cmp-table-forced` / `.cmp-card-hidden`). All styles are in `app/globals.css`.

### API route

`app/api/news/route.ts` — POST endpoint that proxies to the Anthropic API (`claude-sonnet-4-6` with `web_search` tool) to fetch live EV news summaries. Requires `ANTHROPIC_API_KEY` in `.env.local`. News results are cached in `localStorage` for 7 days.

# Git workflow

IMPORTANT: Maintain clean git hygiene throughout the session.
Aim to create a checkpoint commit roughly every 30–60 minutes of active coding, or sooner when a meaningful milestone is completed.
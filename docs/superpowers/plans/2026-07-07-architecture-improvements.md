# Architecture Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute all 5 roadmap steps from `architecture-plan-july-2026.html`: SEO route promotion + sitemap fixes, vehicle theme consolidation, data-model refactor with build-time validation, chart-library convergence on Chart.js, and hygiene sweep.

**Architecture:** The `?tab=` SPA dashboard is split into real routes (`/comparison`, `/side-by-side`, `/spec-select`, `/glossary`), each a thin server page with metadata wrapping a small client component. Vehicle colors get one TypeScript source of truth (`lib/vehicle-theme.ts`) consumed by both chart components and the OG route. Derived data (OTD prices, parsed pre-owned price numbers) is computed at load time in `lib/data.ts` instead of being stored in JSON. DataExplorer's scatter is ported from Observable Plot to Chart.js so `@observablehq/plot`, `d3`, and `@types/d3` can be dropped.

**Tech Stack:** Next.js 14 App Router, TypeScript, Chart.js 4 + react-chartjs-2, Playwright (smoke tests), plain CSS in `app/globals.css`.

## Global Constraints

- **NEVER add `Co-Authored-By` to commits** — it breaks Vercel Hobby plan deploys (user rule, overrides all defaults).
- Never hardcode model/vehicle/trim counts — always derive from `DATA` at runtime.
- `lib/ev-data.json` uses **2-space indent**; any script that rewrites it must use `JSON.stringify(data, null, 2)`.
- Protected fields (never auto-modify): `seats`, `cargo_behind_3rd_cu_ft`, `cargo_behind_2nd_cu_ft`, `cargo_behind_1st_cu_ft`, `fold_flat`, `cargo_floor_width_in`.
- OTD formula: `otd_new = (msrp + destination) * 1.06 + 905`; `otd_preowned = price * 1.06 + 905` (PA tax 6% + $905 fees).
- Platform is Windows; shell steps use Git Bash syntax (`npm`, `node`, `git` all work as shown).
- No test framework exists before Task 1. From Task 1 onward, the test cycle is: `npx playwright test` + `npm run build`.
- Site URL constant: import `SITE_URL` from `@/lib/slugs` — never hardcode `https://threerowev.com` in new code.

---

### Task 1: Playwright smoke-test harness

Foundation for every later task's verification. Tests assert the CURRENT app (tabs still under `?tab=`); Task 4 updates them to the new routes.

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/smoke.spec.ts`
- Modify: `package.json` (add script)
- Modify: `.gitignore`

**Interfaces:**
- Produces: `npm run test:e2e` command used by all later tasks.

- [ ] **Step 1: Create Playwright config**

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
```

- [ ] **Step 2: Write smoke tests (current URL scheme)**

```ts
// tests/e2e/smoke.spec.ts
import { test, expect } from '@playwright/test'

test('home renders overview', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.site-header')).toBeVisible()
  await expect(page.locator('main.main')).toBeVisible()
})

test('comparison tab renders a data table', async ({ page }) => {
  await page.goto('/?tab=comparison')
  await expect(page.locator('table').first()).toBeVisible()
})

test('glossary tab renders', async ({ page }) => {
  await page.goto('/?tab=glossary')
  await expect(page.locator('main.main')).toContainText(/glossary/i)
})

test('vehicle page renders hero and trim table', async ({ page }) => {
  await page.goto('/vehicles/kia-ev9')
  await expect(page.locator('.vehicle-hero')).toBeVisible()
  await expect(page.locator('.trim-compare-table')).toBeVisible()
})

test('compare page renders', async ({ page }) => {
  await page.goto('/compare/kia-ev9-vs-rivian-r1s')
  await expect(page.locator('main')).toContainText(/Kia EV9/i)
})

test('explore page renders a chart', async ({ page }) => {
  await page.goto('/explore')
  await expect(page.locator('.explorer')).toBeVisible()
  // Plot renders <svg> today; Chart.js renders <canvas> after Task 8 — accept either
  await expect(page.locator('.explorer svg, .explorer canvas').first()).toBeVisible({ timeout: 15_000 })
})
```

- [ ] **Step 3: Add npm script and gitignore entries**

In `package.json` `"scripts"`, add:

```json
"test:e2e": "playwright test"
```

Append to `.gitignore`:

```
# Playwright
test-results/
playwright-report/
```

- [ ] **Step 4: Install browser and run tests**

Run: `npx playwright install chromium` (one-time, may take a few minutes)
Run: `npm run test:e2e`
Expected: 6 passed. If the explore test is flaky on chart load, bump its timeout — do not weaken the assertion.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/smoke.spec.ts package.json .gitignore
git commit -m "test: add Playwright smoke-test harness"
```

---

### Task 2: Repo hygiene — gitignore, dead code, stray report files

**Files:**
- Modify: `.gitignore`
- Delete: `components/NavTabs.tsx` (dead code — grep confirms it is imported nowhere; only a text mention in `app/tech-stack/page.tsx:93`)
- Modify: `app/tech-stack/page.tsx:93`
- Move: root-level report HTMLs → `docs/reports/`, reference PDF + PNGs → `docs/reference/`

**Interfaces:**
- Produces: nothing consumed by later tasks; standalone cleanup.

- [ ] **Step 1: Ignore build info**

Append to `.gitignore`:

```
*.tsbuildinfo
```

- [ ] **Step 2: Move stray root files (they are untracked — plain `mv`, not `git mv`)**

```bash
mkdir -p docs/reports docs/reference
mv update-march-2026.html update-march-2026-v2.html update-march-2026-v3.html \
   update-may-19-2026.html update-june-21-2026.html \
   3-Row-EV-SUV-App-Monetization-Game-Plan_1.html mockup-approaches.html \
   tech-stack-summary.html architecture-plan-july-2026.html docs/reports/
mv "2026 Tesla Model X Ratings & Specs - Consumer Reports.pdf" \
   analytics.PNG discovered-not-indexed.PNG docs/reference/
```

Leave `Hero Imagery/` at root (working asset directory).

- [ ] **Step 3: Delete dead NavTabs component**

Verify it's unused, then delete:

```bash
grep -rn "from './NavTabs'\|from '@/components/NavTabs'" app components lib
# Expected: no output
rm components/NavTabs.tsx
```

In `app/tech-stack/page.tsx`, replace the line
`├── NavTabs            tab switcher via ?tab= URL param`
with
`├── DashboardNav       header nav (route links)`

- [ ] **Step 4: Verify build and tests still pass**

Run: `npm run build && npm run test:e2e`
Expected: build succeeds; 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove dead NavTabs, organize report files into docs/, ignore tsbuildinfo"
```

---

### Task 3: Promote tabs to real routes

Split `components/Dashboard.tsx` into per-route client components; convert DashboardNav from `?tab=` buttons to `<Link>`s. Filter updates switch from `router.push` to `router.replace` (kills back-button history spam — hygiene item folded in here since we're rewriting these call sites anyway).

**Files:**
- Create: `components/filter-types.ts`
- Create: `components/pages/HomeClient.tsx`
- Create: `components/pages/ComparisonClient.tsx`
- Create: `components/pages/SpecSelectClient.tsx`
- Create: `app/comparison/page.tsx`
- Create: `app/side-by-side/page.tsx`
- Create: `app/spec-select/page.tsx`
- Create: `app/glossary/page.tsx`
- Modify: `app/page.tsx` (render HomeClient instead of Dashboard)
- Modify: `components/DashboardNav.tsx` (Links instead of router.push)
- Modify: `components/tabs/OverviewTab.tsx:5` and `components/tabs/ComparisonV2Tab.tsx` (import filter types from new module)
- Delete: `components/Dashboard.tsx`

**Interfaces:**
- Consumes: existing tab components unchanged: `OverviewTab` props `{ condition, budget, pref1, pref2, onFiltersChange, onVehicleClick }`; `ComparisonV2Tab` props `{ filters, onFiltersChange, onRowClick }`; `SpecSelectTab` props `{ onRowClick }`; `SideBySideTab` (no props); `GlossaryTab` (no props); `DetailPanel` props `{ idx, onClose }`; `VehicleSummaryPanel` props `{ vehicle, onClose }`.
- Produces: routes `/comparison`, `/side-by-side`, `/spec-select`, `/glossary`; types `ComparisonFilters` and `InsightFilters` exported from `components/filter-types.ts`; `onFiltersChange` signatures unchanged from Dashboard's.

- [ ] **Step 1: Extract filter types**

```ts
// components/filter-types.ts
export interface ComparisonFilters {
  vehicle: string
  year: string
  trim: string
  q: string
  drivetrain: string
  seats: string
  charging: string
  foldFlat: string
}

export interface InsightFilters {
  condition: string
  budget: string
  pref1: string
  pref2: string
}
```

Update imports that currently point at Dashboard:
- `components/tabs/OverviewTab.tsx:5`: `import type { InsightFilters } from '../Dashboard'` → `import type { InsightFilters } from '../filter-types'`
- In `components/tabs/ComparisonV2Tab.tsx`, find the `ComparisonFilters` import from `'../Dashboard'` and change to `'../filter-types'`. (Grep the file for `from '../Dashboard'`.)

- [ ] **Step 2: Create HomeClient**

```tsx
// components/pages/HomeClient.tsx
'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '../Header'
import VehicleSummaryPanel from '../VehicleSummaryPanel'
import OverviewTab from '../tabs/OverviewTab'
import type { InsightFilters } from '../filter-types'

export default function HomeClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const condition = searchParams.get('condition') ?? ''
  const budget = searchParams.get('budget') ?? ''
  const pref1 = searchParams.get('pref1') ?? ''
  const pref2 = searchParams.get('pref2') ?? ''

  const [summaryVehicle, setSummaryVehicle] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const setInsightFilters = useCallback((f: Partial<InsightFilters>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const key of ['condition', 'budget', 'pref1', 'pref2'] as const) {
      if (key in f) {
        const v = f[key] ?? ''
        if (v) params.set(key, v)
        else params.delete(key)
      }
    }
    startTransition(() => router.replace(`?${params.toString()}`, { scroll: false }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <>
      <Header activeTab="overview" />
      <main className="main">
        <OverviewTab
          condition={condition}
          budget={budget}
          pref1={pref1}
          pref2={pref2}
          onFiltersChange={setInsightFilters}
          onVehicleClick={setSummaryVehicle}
        />
      </main>
      <VehicleSummaryPanel vehicle={summaryVehicle} onClose={() => setSummaryVehicle(null)} />
    </>
  )
}
```

Note: `OverviewTab`'s `onFiltersChange` may pass a second `replace` boolean argument (old Dashboard signature `(f, replace?)`). Extra arguments to `setInsightFilters` are simply ignored — no change needed. If TypeScript complains about the prop type, widen the callback to `(f: Partial<InsightFilters>, replace?: boolean) => void` in `HomeClient` (the parameter can be unused).

- [ ] **Step 3: Create ComparisonClient**

```tsx
// components/pages/ComparisonClient.tsx
'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '../Header'
import DetailPanel from '../DetailPanel'
import ComparisonTab from '../tabs/ComparisonV2Tab'
import type { ComparisonFilters } from '../filter-types'

const FILTER_KEYS = ['vehicle', 'year', 'trim', 'q', 'drivetrain', 'seats', 'charging', 'foldFlat'] as const

export default function ComparisonClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [detailIdx, setDetailIdx] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  const filters: ComparisonFilters = {
    vehicle: searchParams.get('vehicle') ?? '',
    year: searchParams.get('year') ?? '',
    trim: searchParams.get('trim') ?? '',
    q: searchParams.get('q') ?? '',
    drivetrain: searchParams.get('drivetrain') ?? '',
    seats: searchParams.get('seats') ?? '',
    charging: searchParams.get('charging') ?? '',
    foldFlat: searchParams.get('foldFlat') ?? '',
  }

  const setFilters = useCallback((f: Partial<ComparisonFilters>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const key of FILTER_KEYS) {
      if (key in f) {
        const v = f[key] ?? ''
        if (v) params.set(key, v)
        else params.delete(key)
      }
    }
    startTransition(() => router.replace(`?${params.toString()}`, { scroll: false }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <>
      <Header activeTab="comparison" />
      <main className="main">
        <ComparisonTab filters={filters} onFiltersChange={setFilters} onRowClick={setDetailIdx} />
      </main>
      <DetailPanel idx={detailIdx} onClose={() => setDetailIdx(null)} />
    </>
  )
}
```

- [ ] **Step 4: Create SpecSelectClient**

```tsx
// components/pages/SpecSelectClient.tsx
'use client'

import { useState } from 'react'
import Header from '../Header'
import DetailPanel from '../DetailPanel'
import SpecSelectTab from '../tabs/SpecSelectTab'

export default function SpecSelectClient() {
  const [detailIdx, setDetailIdx] = useState<number | null>(null)
  return (
    <>
      <Header activeTab="specselect" />
      <main className="main">
        <SpecSelectTab onRowClick={setDetailIdx} />
      </main>
      <DetailPanel idx={detailIdx} onClose={() => setDetailIdx(null)} />
    </>
  )
}
```

- [ ] **Step 5: Create the four route pages**

```tsx
// app/comparison/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import ComparisonClient from '@/components/pages/ComparisonClient'
import { SITE_URL } from '@/lib/slugs'

export const metadata: Metadata = {
  title: 'The Full Monty — Compare Every 3-Row EV Trim',
  description:
    'Filterable spreadsheet of every 3-row electric SUV trim: pricing, range, charging speed, cargo space, self-driving tier and more.',
  alternates: { canonical: `${SITE_URL}/comparison` },
}

export default function ComparisonPage() {
  return (
    <Suspense>
      <ComparisonClient />
    </Suspense>
  )
}
```

```tsx
// app/side-by-side/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import SideBySideTab from '@/components/tabs/SideBySideTab'
import { SITE_URL } from '@/lib/slugs'

export const metadata: Metadata = {
  title: 'Side-by-Side 3-Row EV Comparison',
  description:
    'Pick up to three 3-row electric SUV trims and compare their full specs side by side — pricing, range, charging, cargo and infotainment.',
  alternates: { canonical: `${SITE_URL}/side-by-side` },
}

export default function SideBySidePage() {
  return (
    <Suspense>
      <Header activeTab="sidebyside" />
      <main className="main">
        <SideBySideTab />
      </main>
    </Suspense>
  )
}
```

```tsx
// app/spec-select/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import SpecSelectClient from '@/components/pages/SpecSelectClient'
import { SITE_URL } from '@/lib/slugs'

export const metadata: Metadata = {
  title: 'Spec & Select — Filter 3-Row EVs by What Matters',
  description:
    'Narrow down 3-row electric SUVs by budget, condition, range, cargo and self-driving capability to find your shortlist.',
  alternates: { canonical: `${SITE_URL}/spec-select` },
}

export default function SpecSelectPage() {
  return (
    <Suspense>
      <SpecSelectClient />
    </Suspense>
  )
}
```

```tsx
// app/glossary/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import GlossaryTab from '@/components/tabs/GlossaryTab'
import { SITE_URL } from '@/lib/slugs'

export const metadata: Metadata = {
  title: 'EV Glossary & Methodology',
  description:
    'Definitions for every spec field in the 3-row EV comparison — charging standards, OTD pricing assumptions, cargo measurements and more.',
  alternates: { canonical: `${SITE_URL}/glossary` },
}

export default function GlossaryPage() {
  return (
    <Suspense>
      <Header activeTab="glossary" />
      <main className="main">
        <GlossaryTab />
      </main>
    </Suspense>
  )
}
```

- [ ] **Step 6: Point home page at HomeClient; delete Dashboard**

In `app/page.tsx`, change `import Dashboard from '@/components/Dashboard'` → `import HomeClient from '@/components/pages/HomeClient'` and `<Dashboard />` → `<HomeClient />`. Then:

```bash
rm components/Dashboard.tsx
grep -rn "from './Dashboard'\|components/Dashboard" app components
# Expected: no output (all imports updated in Steps 1–6)
```

- [ ] **Step 7: Convert DashboardNav to route links**

Replace the whole of `components/DashboardNav.tsx` with:

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { TabId } from './Header'

const TABS: { id: TabId; label: string; href: string }[] = [
  { id: 'specselect', label: 'Spec & Select', href: '/spec-select' },
  { id: 'sidebyside', label: 'Side-by-Side', href: '/side-by-side' },
  { id: 'comparison', label: 'The Full Monty', href: '/comparison' },
  { id: 'glossary', label: 'Glossary', href: '/glossary' },
]

interface Props {
  activeTab: TabId
}

export default function DashboardNav({ activeTab }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [themeUnlocked, setThemeUnlocked] = useState(false)

  useEffect(() => {
    function sync() {
      setThemeUnlocked(localStorage.getItem('theme-unlocked') === 'true')
    }
    sync()
    window.addEventListener('theme-change', sync)
    return () => window.removeEventListener('theme-change', sync)
  }, [])

  function handleSwitchMode() {
    const current = localStorage.getItem('theme') || 'dark'
    const next = current === 'dark' ? 'light' : 'dark'
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem('theme', next)
    window.dispatchEvent(new Event('theme-change'))
    setDrawerOpen(false)
  }

  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label ?? 'Home'

  return (
    <>
      {/* Desktop tabs */}
      <nav className="header-nav">
        <Link href="/" className={`nav-tab nav-tab-brand${activeTab === 'overview' ? ' active' : ''}`}>3RowEV</Link>
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            className={`nav-tab${activeTab === t.id ? ' active' : ''}`}
          >
            {t.label}
          </Link>
        ))}
        <Link href="/about" className={`nav-tab${activeTab === 'about' ? ' active' : ''}`}>About</Link>
      </nav>

      {/* Mobile hamburger */}
      <div className="nav-mobile-bar">
        <span className="nav-mobile-active">{activeTabLabel}</span>
        <button className="nav-hamburger" onClick={() => setDrawerOpen(!drawerOpen)}>
          {drawerOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && <div className="nav-drawer-overlay" onClick={() => setDrawerOpen(false)} />}
      <div className={`nav-drawer${drawerOpen ? ' open' : ''}`}>
        <Link href="/" className={`nav-drawer-item${activeTab === 'overview' ? ' active' : ''}`} onClick={() => setDrawerOpen(false)}>Home</Link>
        {TABS.filter(t => t.id !== 'comparison').map(t => (
          <Link
            key={t.id}
            href={t.href}
            className={`nav-drawer-item${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setDrawerOpen(false)}
          >
            {t.label}
          </Link>
        ))}
        <Link href="/about" className={`nav-drawer-item${activeTab === 'about' ? ' active' : ''}`} onClick={() => setDrawerOpen(false)}>About</Link>
        {themeUnlocked && (
          <button className="nav-drawer-item" onClick={handleSwitchMode}>Switch Mode</button>
        )}
      </div>
    </>
  )
}
```

Note: `DashboardNav` no longer uses `useSearchParams`, so `Header`'s `<Suspense>` wrapper becomes unnecessary but is harmless — leave `Header.tsx` unchanged.

- [ ] **Step 8: Verify manually with dev server**

Run: `npm run build`
Expected: build succeeds; `/comparison`, `/side-by-side`, `/spec-select`, `/glossary` appear in the route list as static (○) or dynamic (ƒ) pages.

Run: `npm run test:e2e`
Expected: the two `?tab=` tests still pass (Dashboard removed, but `/?tab=comparison` now renders the home overview — **these 2 tests will FAIL**). That is expected until Task 4 adds redirects. All other tests pass.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: promote dashboard tabs to real routes for SEO"
```

---

### Task 4: Redirects, internal links, updated tests + docs

**Files:**
- Modify: `next.config.mjs` (add `redirects()`)
- Modify: `app/vehicles/[slug]/page.tsx` (lines 188, 191, 302, 308)
- Modify: `app/compare/[slug]/page.tsx` (line 276)
- Modify: `components/VehicleSummaryPanel.tsx` (line 172)
- Modify: `app/about/page.tsx` (line 77)
- Modify: `app/page.tsx` (SearchAction target, line 21)
- Modify: `tests/e2e/smoke.spec.ts`
- Modify: `CLAUDE.md` (component-structure section)
- Modify: `app/tech-stack/page.tsx` (architecture diagram text)

**Interfaces:**
- Consumes: routes created in Task 3.
- Produces: permanent redirects from `/?tab=X` URLs; all internal links point at the new routes.

- [ ] **Step 1: Add redirects to next.config.mjs**

Inside the `config` object (sibling of `headers()`), add:

```js
async redirects() {
  const tabRoutes = [
    ['comparison', '/comparison'],
    ['sidebyside', '/side-by-side'],
    ['specselect', '/spec-select'],
    ['glossary', '/glossary'],
    ['reference', '/glossary'],
  ]
  return tabRoutes.map(([tab, destination]) => ({
    source: '/',
    has: [{ type: 'query', key: 'tab', value: tab }],
    destination,
    permanent: true,
  }))
},
```

Note: Next.js forwards unmatched query params automatically, so `/?tab=comparison&vehicle=Kia+EV9` lands on `/comparison?vehicle=Kia+EV9` (the `tab` param may be carried along — harmless; canonicals point at the clean URL).

- [ ] **Step 2: Update internal links**

- `app/vehicles/[slug]/page.tsx`: replace all occurrences:
  - `` `/?tab=comparison&vehicle=${encodeURIComponent(vehicle)}` `` → `` `/comparison?vehicle=${encodeURIComponent(vehicle)}` `` (2 occurrences)
  - `` `/?tab=sidebyside&v1=${encodeURIComponent(vehicle)}` `` → `` `/side-by-side?v1=${encodeURIComponent(vehicle)}` `` (2 occurrences)
- `app/compare/[slug]/page.tsx:276`: `` `/?tab=sidebyside&v1=${encodeURIComponent(nameA)}&v2=${encodeURIComponent(nameB)}` `` → `` `/side-by-side?v1=${encodeURIComponent(nameA)}&v2=${encodeURIComponent(nameB)}` ``
- `components/VehicleSummaryPanel.tsx:172`: `` `/?tab=comparison&vehicle=${encodeURIComponent(vehicle)}` `` → `` `/comparison?vehicle=${encodeURIComponent(vehicle)}` ``
- `app/about/page.tsx:77`: `href="/?tab=glossary"` → `href="/glossary"`
- `app/page.tsx:21`: SearchAction target `` `${SITE_URL}/?tab=comparison&q={search_term_string}` `` → `` `${SITE_URL}/comparison?q={search_term_string}` ``

Then verify nothing is left:

```bash
grep -rn "?tab=" app components lib
# Expected: no output
```

- [ ] **Step 3: Update smoke tests to new routes and add a redirect test**

In `tests/e2e/smoke.spec.ts`, replace the two tab tests with:

```ts
test('comparison route renders a data table', async ({ page }) => {
  await page.goto('/comparison')
  await expect(page.locator('table').first()).toBeVisible()
})

test('glossary route renders', async ({ page }) => {
  await page.goto('/glossary')
  await expect(page.locator('main.main')).toContainText(/glossary/i)
})

test('old ?tab= URL redirects to route', async ({ page }) => {
  await page.goto('/?tab=comparison&vehicle=Kia%20EV9')
  await expect(page).toHaveURL(/\/comparison/)
})

test('side-by-side route renders', async ({ page }) => {
  await page.goto('/side-by-side')
  await expect(page.locator('main.main')).toBeVisible()
})

test('spec-select route renders', async ({ page }) => {
  await page.goto('/spec-select')
  await expect(page.locator('main.main')).toBeVisible()
})
```

- [ ] **Step 4: Run tests**

Run: `npm run test:e2e`
Expected: all tests pass (restart the dev server if it was already running so `next.config.mjs` redirects load).

- [ ] **Step 5: Update CLAUDE.md and tech-stack page**

In `CLAUDE.md`, replace the "Component structure" tree and the "Filter state is URL-driven" paragraph with:

```markdown
### Component structure

```
app/
├── page.tsx            → HomeClient (OverviewTab + VehicleSummaryPanel)
├── comparison/         → ComparisonClient (ComparisonV2Tab + DetailPanel)
├── side-by-side/       → SideBySideTab
├── spec-select/        → SpecSelectClient (SpecSelectTab + DetailPanel)
├── glossary/           → GlossaryTab
├── explore/            → DataExplorer (scatter chart)
├── vehicles/[slug]/    → static per-vehicle page
└── compare/[slug]/     → static pairwise comparison page
```

**Filter state is URL-driven.** Each route's client component reads filter
values from `useSearchParams()` and applies updates via `router.replace()`
(no history entry per filter click). Filters survive refresh and are
shareable. Old `/?tab=X` URLs 301-redirect to the routes (next.config.mjs).

`DetailPanel` is controlled by local `detailIdx` state (index into
`DATA.details`) since it doesn't need to be shareable.
```

In `app/tech-stack/page.tsx`, update the architecture diagram block that describes `Dashboard` + `?tab=` to mirror the new route structure (same tree as above, plain text).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: 301 redirects from ?tab= URLs, update internal links and docs to routes"
```

---

### Task 5: Sitemap accuracy + data-driven lastModified

**Files:**
- Modify: `lib/ev-data.json` (add root-level `last_updated` key)
- Modify: `lib/data.ts` (add `last_updated` to `EVData`)
- Modify: `app/sitemap.ts`
- Modify: `.claude/commands/refresh.md`, `CLAUDE.md` (checklist item)

**Interfaces:**
- Produces: `DATA.last_updated: string` (ISO date, e.g. `"2026-07-07"`).

- [ ] **Step 1: Add last_updated to the data file**

Edit `lib/ev-data.json` — after the first line `{`, insert:

```json
  "last_updated": "2026-07-07",
```

(2-space indent, matching the file.) Set the value to the date of the most recent data refresh commit (July 2026 refresh → `2026-07-07` is acceptable).

In `lib/data.ts`, add to `interface EVData`:

```ts
  last_updated: string
```

- [ ] **Step 2: Rewrite sitemap.ts**

```ts
import type { MetadataRoute } from 'next'
import { DATA } from '@/lib/data'
import { SITE_URL, getUniqueVehicles, toSlug, getAllComparisonPairs } from '@/lib/slugs'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date(DATA.last_updated)

  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/comparison`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/spec-select`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/side-by-side`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/explore`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/glossary`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  for (const vehicle of getUniqueVehicles()) {
    pages.push({
      url: `${SITE_URL}/vehicles/${toSlug(vehicle)}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  for (const pair of getAllComparisonPairs()) {
    pages.push({
      url: `${SITE_URL}/compare/${pair.slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    })
  }

  return pages
}
```

- [ ] **Step 3: Wire into the refresh workflow docs**

- `.claude/commands/refresh.md`: in the final phase (apply/commit), add an instruction line: "Update the root-level `last_updated` field in `lib/ev-data.json` to today's date (YYYY-MM-DD)."
- `CLAUDE.md` "Data editing checklist": add bullet: "- `last_updated` bumped to today's date on any data change".

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: succeeds. Then `curl -s http://localhost:3000/sitemap.xml | grep -c "<url>"` against a dev/start server should show 8 static pages + vehicles + pairs (count > 80), and dates matching `last_updated`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: data-driven sitemap lastModified, add route + explore entries"
```

---

### Task 6: Vehicle theme consolidation + light-theme charts

One TypeScript source of truth for vehicle colors. CSS badge classes in `globals.css` stay (human-edited), but the TS map mirrors them with a cross-reference comment in each place. All JS consumers (both chart components, OG route) read from the new module.

**Files:**
- Create: `lib/vehicle-theme.ts`
- Create: `components/useIsLightTheme.ts`
- Modify: `lib/data.ts` (VEHICLE_CLASSES moves out, re-exported)
- Modify: `components/DataExplorer.tsx` (delete local `VEHICLE_COLORS`)
- Modify: `components/MarketInsights.tsx` (delete local `VEHICLE_COLORS`, theme-aware Chart.js defaults, remove local `useIsLightTheme`)
- Modify: `app/og/route.tsx` (delete `BRAND_COLORS`)
- Modify: `app/globals.css` (add cross-reference comment)
- Modify: `CLAUDE.md` (data editing checklist: new-vehicle steps)

**Interfaces:**
- Produces:
  - `CLASS_THEMES: Record<string, { darkBg: string; darkFg: string; lightBg: string; lightFg: string }>` (keyed by CSS class)
  - `VEHICLE_CLASSES: Record<string, string>` (vehicle name → CSS class; moved here, re-exported from `lib/data.ts` so existing imports keep working)
  - `chartColor(vehicle: string, light?: boolean): string` — returns the badge fg color; `#888888` fallback
  - `useIsLightTheme(): boolean` hook (from `components/useIsLightTheme.ts`)

- [ ] **Step 1: Create lib/vehicle-theme.ts**

```ts
/**
 * Single source of truth for per-vehicle visual identity in TypeScript.
 * The CSS badge classes in app/globals.css (".v-*" and their light-theme
 * overrides) mirror these values — if you change a color here, change it
 * there too, and vice versa.
 */

export interface ClassTheme {
  darkBg: string
  darkFg: string
  lightBg: string
  lightFg: string
}

/** Keyed by CSS badge class. Values mirror app/globals.css .v-* rules. */
export const CLASS_THEMES: Record<string, ClassTheme> = {
  'v-kia':      { darkBg: '#1a3a2a', darkFg: '#4ade80', lightBg: '#dcfce7', lightFg: '#16a34a' },
  'v-hyundai':  { darkBg: '#1a2a3a', darkFg: '#5ba4f5', lightBg: '#dbeafe', lightFg: '#2563eb' },
  'v-lucid':    { darkBg: '#2a1a3a', darkFg: '#a78bfa', lightBg: '#ede9fe', lightFg: '#7c3aed' },
  'v-rivian':   { darkBg: '#3a2a1a', darkFg: '#fb923c', lightBg: '#ffedd5', lightFg: '#ea580c' },
  'v-tesla':    { darkBg: '#3a1a1a', darkFg: '#f87171', lightBg: '#fee2e2', lightFg: '#dc2626' },
  'v-tesla-yl': { darkBg: '#3a1a28', darkFg: '#fb7185', lightBg: '#fce7f0', lightFg: '#be123c' },
  'v-toyota':   { darkBg: '#1a3a3a', darkFg: '#2dd4bf', lightBg: '#ccfbf1', lightFg: '#0d9488' },
  'v-vinfast':  { darkBg: '#2a1a1a', darkFg: '#f59e0b', lightBg: '#fef3c7', lightFg: '#b45309' },
  'v-vw':       { darkBg: '#2a2a1a', darkFg: '#fbbf24', lightBg: '#fef9c3', lightFg: '#a16207' },
  'v-volvo':    { darkBg: '#2a1a2a', darkFg: '#f472b6', lightBg: '#fce7f3', lightFg: '#db2777' },
  'v-cadillac': { darkBg: '#1a1a2a', darkFg: '#a78bfa', lightBg: '#ede9fe', lightFg: '#7c3aed' },
  'v-mercedes': { darkBg: '#2a2a2a', darkFg: '#d4d4d8', lightBg: '#f4f4f5', lightFg: '#52525b' },
  'v-subaru':   { darkBg: '#1a2a2a', darkFg: '#34d399', lightBg: '#d1fae5', lightFg: '#059669' },
  'v-bmw':      { darkBg: '#1a1a3a', darkFg: '#60a5fa', lightBg: '#dbeafe', lightFg: '#2563eb' },
  'v-genesis':  { darkBg: '#2a1a1a', darkFg: '#f97316', lightBg: '#ffedd5', lightFg: '#ea580c' },
  'v-faraday':  { darkBg: '#1a2a3a', darkFg: '#38bdf8', lightBg: '#e0f2fe', lightFg: '#0284c7' },
  'v-lexus':    { darkBg: '#1a1a1a', darkFg: '#fbbf24', lightBg: '#fefce8', lightFg: '#854d0e' },
}

/** Vehicle name → CSS badge class (moved from lib/data.ts). */
export const VEHICLE_CLASSES: Record<string, string> = {
  'Kia EV9': 'v-kia',
  'Hyundai IONIQ 9': 'v-hyundai',
  'Lucid Gravity': 'v-lucid',
  'Rivian R1S': 'v-rivian',
  'Tesla Model X': 'v-tesla',
  'Tesla Model Y Long (Asia)': 'v-tesla',
  'Tesla Model Y (3-Row)': 'v-tesla',
  'Tesla Model Y L': 'v-tesla-yl',
  'VinFast VF9': 'v-vinfast',
  'Toyota Highlander EV': 'v-toyota',
  'Volkswagen ID. Buzz': 'v-vw',
  'Volvo EX90': 'v-volvo',
  'Cadillac Escalade IQ': 'v-cadillac',
  'Cadillac VISTIQ': 'v-cadillac',
  'Mercedes-Benz EQS SUV': 'v-mercedes',
  'Subaru Getaway': 'v-subaru',
  'BMW iX7': 'v-bmw',
  'Genesis GV90': 'v-genesis',
  'Faraday Future FX Super One': 'v-faraday',
  'Lexus TZ': 'v-lexus',
}

export function vehicleTheme(vehicle: string): ClassTheme | null {
  return CLASS_THEMES[VEHICLE_CLASSES[vehicle] ?? ''] ?? null
}

/** Chart color for a vehicle — the badge foreground color for the theme. */
export function chartColor(vehicle: string, light = false): string {
  const t = vehicleTheme(vehicle)
  if (!t) return '#888888'
  return light ? t.lightFg : t.darkFg
}
```

- [ ] **Step 2: Re-export from lib/data.ts**

In `lib/data.ts`, delete the entire `export const VEHICLE_CLASSES ...` block (lines 151–172) and add at the bottom:

```ts
export { VEHICLE_CLASSES } from './vehicle-theme'
```

Verify all existing consumers still compile: `npm run build` (VEHICLE_CLASSES is imported from `@/lib/data` in `app/og/route.tsx`, `app/vehicles/[slug]/page.tsx`, `app/compare/[slug]/page.tsx`, and others — the re-export keeps them working).

- [ ] **Step 3: Create shared useIsLightTheme hook**

```ts
// components/useIsLightTheme.ts
'use client'

import { useEffect, useState } from 'react'

/** True when the html element carries data-theme="light". Reacts to toggles. */
export function useIsLightTheme(): boolean {
  const [light, setLight] = useState(false)
  useEffect(() => {
    function check() {
      setLight(document.documentElement.getAttribute('data-theme') === 'light')
    }
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return light
}
```

In `components/MarketInsights.tsx`, delete the local `useIsLightTheme` function (lines ~89–101) and add `import { useIsLightTheme } from './useIsLightTheme'`.

- [ ] **Step 4: Replace VEHICLE_COLORS in DataExplorer**

In `components/DataExplorer.tsx`:
- Delete the `VEHICLE_COLORS` constant (lines 9–22).
- Add imports: `import { chartColor } from '@/lib/vehicle-theme'` and `import { useIsLightTheme } from './useIsLightTheme'`.
- In the component, add `const isLight = useIsLightTheme()`.
- Replace every `VEHICLE_COLORS[v] || '#888'` with `chartColor(v, isLight)` (4 sites: two in plot color range config, one in legend items, one in vehicleOptions). Add `isLight` to the `renderChart` useCallback dependency array.

- [ ] **Step 5: Replace VEHICLE_COLORS + theme-blind defaults in MarketInsights**

In `components/MarketInsights.tsx`:
- Delete the `VEHICLE_COLORS` constant (lines ~51–64). Add `import { chartColor } from '@/lib/vehicle-theme'`.
- Replace every `VEHICLE_COLORS[x] ?? '#888888'` with `chartColor(x, isLightNow())` — but since each chart component already calls `useIsLightTheme()` (as `isLight`), pass that: `chartColor(row.model, isLight)` etc. Each of the 3+ usage sites is inside a chart component that either already has `const isLight = useIsLightTheme()` or must gain it.
- Replace the module-scope `ChartJS.defaults...` block (lines 36–48) with a function, and call it from the top-level exported component:

```ts
function applyChartJsTheme(light: boolean) {
  ChartJS.defaults.color = light ? '#5a5a72' : '#9898b0'
  ChartJS.defaults.borderColor = light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'
  ChartJS.defaults.font.family = "'JetBrains Mono', 'SF Mono', monospace"
  ChartJS.defaults.font.size = 12
  const tt = ChartJS.defaults.plugins.tooltip
  tt.backgroundColor = light ? 'rgba(255,255,255,0.97)' : 'rgba(19,19,25,0.95)'
  tt.borderColor = light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)'
  tt.borderWidth = 1
  tt.cornerRadius = 10
  tt.padding = 10
  tt.titleColor = light ? '#2a2a3a' : '#c8c8e0'
  tt.bodyColor = light ? '#5a5a72' : '#9898b0'
  ChartJS.defaults.plugins.legend.labels.usePointStyle = true
  ChartJS.defaults.plugins.legend.labels.pointStyle = 'circle'
}
applyChartJsTheme(false) // initial defaults (dark)
```

In the default-exported `MarketInsights` component (bottom of file), add:

```tsx
const isLight = useIsLightTheme()
applyChartJsTheme(isLight)
```

and wrap the returned JSX's outermost element with `key={isLight ? 'light' : 'dark'}` so all charts remount (and re-read defaults) when the theme flips.

- [ ] **Step 6: Replace BRAND_COLORS in the OG route**

In `app/og/route.tsx`, delete the `BRAND_COLORS` constant (lines 8–23) and change `getBrandColor` to:

```ts
import { CLASS_THEMES } from '@/lib/vehicle-theme'

function getBrandColor(vehicle: string) {
  const t = CLASS_THEMES[VEHICLE_CLASSES[vehicle] ?? '']
  return t ? { bg: t.darkBg, fg: t.darkFg } : { bg: '#1a2a3a', fg: '#5ba4f5' }
}
```

(Keep the existing `VEHICLE_CLASSES` import from `@/lib/data`.)

- [ ] **Step 7: Cross-reference comment in globals.css + CLAUDE.md checklist**

In `app/globals.css`, change the section comment at line 420 to:

```css
/* ── Vehicle badge colors — mirrored in lib/vehicle-theme.ts (keep in sync) ── */
```

In `CLAUDE.md` "Data editing checklist", replace the `VEHICLE_CLASSES` bullet with:

```markdown
- `VEHICLE_CLASSES` + `CLASS_THEMES` in `lib/vehicle-theme.ts` have entries for any new vehicle
- CSS class exists in `globals.css` for any new vehicle class (colors must match `CLASS_THEMES`)
```

- [ ] **Step 8: Verify**

```bash
grep -rn "VEHICLE_COLORS\|BRAND_COLORS" app components lib
# Expected: no output
npm run build && npm run test:e2e
```

Expected: build passes, all smoke tests pass. Manually check `/explore` — previously-gray vehicles (Tesla Model Y L, Toyota Highlander EV, Lexus TZ) now have distinct colors matching their badges.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor: single-source vehicle theme, fix light-theme charts and gray chart fallbacks"
```

---

### Task 7: Data model — computed OTD, structured pre-owned prices, build-time validation

Stored `otd_new` / `otd_preowned` are removed from the JSON and computed at load in `lib/data.ts`. `DetailRow` gains `preowned_low` / `preowned_high` numbers so components stop regex-parsing display strings. The validator runs on every build.

**Files:**
- Create: `scripts/remove-stored-otd.mjs` (one-shot migration)
- Modify: `lib/ev-data.json` (via migration script)
- Modify: `lib/data.ts` (enrichment at load)
- Modify: `components/tabs/OverviewTab.tsx` (drop `parsePrice`, use `preowned_low`)
- Modify: `components/tabs/ComparisonV2Tab.tsx` (drop `parsePreownedLow`, use `preowned_low`)
- Modify: `scripts/validate-data.js` (drop OTD checks, add exit code)
- Modify: `scripts/apply-refresh.js` (stop writing otd fields)
- Modify: `package.json` (`prebuild` script)
- Modify: `CLAUDE.md`, `.claude/commands/refresh.md`, `.claude/commands/update-pricing.md`, `.claude/commands/add-vehicle.md`, `.claude/commands/spot-check.md`, `.claude/commands/validate.md`

**Interfaces:**
- Consumes: raw JSON rows (now WITHOUT `otd_new`/`otd_preowned`).
- Produces on `DetailRow` (computed at load, same names/types as before plus two new fields):
  - `otd_new: number | string | null` — `(msrp + destination) * 1.06 + 905` when both numeric; msrp string sentinel passed through; else null
  - `otd_preowned: string` — `"$52,845 - $64,505"`-style, computed from parsed `preowned_range`; sentinel strings passed through unchanged
  - `preowned_low: number | null`, `preowned_high: number | null`
  - `parsePriceRange(s: string | null | undefined): { low: number; high: number } | null` exported from `lib/data.ts`
- `PreownedRow` loses `otd_preowned`.

- [ ] **Step 1: Write the migration script**

```js
// scripts/remove-stored-otd.mjs
// One-shot: delete stored otd_new / otd_preowned — they are now computed
// at load time in lib/data.ts from msrp/destination/preowned_range.
import fs from 'node:fs'

const path = 'lib/ev-data.json'
const data = JSON.parse(fs.readFileSync(path, 'utf8'))

let removed = 0
for (const d of data.details) {
  if ('otd_new' in d) { delete d.otd_new; removed++ }
  if ('otd_preowned' in d) { delete d.otd_preowned; removed++ }
}
for (const p of data.preowned) {
  if ('otd_preowned' in p) { delete p.otd_preowned; removed++ }
}

fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
console.log(`Removed ${removed} stored OTD fields from ${data.details.length} details + ${data.preowned.length} preowned rows`)
```

- [ ] **Step 2: Capture before/after OTD values for spot-check, then run migration**

Before migrating, snapshot a few stored values to verify the computed versions match:

```bash
node -e "const d=require('./lib/ev-data.json');const r=d.details.find(x=>x.name==='Kia EV9, 2026, GT-Line');console.log(r.otd_new, '|', r.otd_preowned)"
# Note the output, e.g.: 78862.7 | $52,845 - $64,505
node scripts/remove-stored-otd.mjs
git diff --stat lib/ev-data.json
# Expected: only lib/ev-data.json changed; hundreds of deletions, few insertions
```

- [ ] **Step 3: Rewrite lib/data.ts load path**

Update `DetailRow`: keep `otd_new: number | string | null` and `otd_preowned: string`; add:

```ts
  /** Parsed from preowned_range at load; null when no used market */
  preowned_low: number | null
  preowned_high: number | null
```

Update `PreownedRow`: remove the `otd_preowned` field.

Replace `export const DATA = rawData as EVData` with:

```ts
/* ── Derived pricing (computed at load; formula in CLAUDE.md) ── */

export const OTD_TAX_RATE = 1.06   // PA sales tax 6%
export const OTD_FIXED_FEES = 905  // doc $422 + title/reg $233 + EV fee $250

/** Raw JSON row: DetailRow minus the fields computed at load. */
type RawDetailRow = Omit<DetailRow, 'otd_new' | 'otd_preowned' | 'preowned_low' | 'preowned_high'>

interface RawEVData extends Omit<EVData, 'details'> {
  details: RawDetailRow[]
}

/** Parse "$49,000 - $60,000" / "$52,000" → { low, high }; null for N/A/TBD text. */
export function parsePriceRange(s: string | null | undefined): { low: number; high: number } | null {
  if (!s) return null
  const matches = s.replace(/,/g, '').match(/\$\s*\d+(?:\.\d+)?/g)
  if (!matches || matches.length === 0) return null
  const vals = matches.map(m => parseFloat(m.replace(/[^\d.]/g, '')))
  return { low: Math.min(...vals), high: Math.max(...vals) }
}

function otdPreownedPrice(price: number): number {
  return Math.round(price * OTD_TAX_RATE + OTD_FIXED_FEES)
}

function enrich(r: RawDetailRow): DetailRow {
  const range = parsePriceRange(r.preowned_range)
  const otd_new =
    typeof r.msrp === 'number' && typeof r.destination === 'number'
      ? (r.msrp + r.destination) * OTD_TAX_RATE + OTD_FIXED_FEES
      : typeof r.msrp === 'string'
        ? r.msrp
        : null
  const otd_preowned = range
    ? range.low === range.high
      ? `$${otdPreownedPrice(range.low).toLocaleString()}`
      : `$${otdPreownedPrice(range.low).toLocaleString()} - $${otdPreownedPrice(range.high).toLocaleString()}`
    : r.preowned_range || ''
  return {
    ...r,
    otd_new,
    otd_preowned,
    preowned_low: range ? range.low : null,
    preowned_high: range ? range.high : null,
  }
}

const raw = rawData as unknown as RawEVData

export const DATA: EVData = { ...raw, details: raw.details.map(enrich) }
```

(`EVData.details` stays `DetailRow[]`; `EVData.preowned` stays `PreownedRow[]` — raw pass-through.)

- [ ] **Step 4: Verify computed values match the old stored values**

`lib/data.ts` is TypeScript, so verify through the running app: `npm run dev`, open `/vehicles/kia-ev9`, and confirm OTD (New) for 2026 GT-Line displays `$78,863` (fmtMoney rounds 78862.7) and OTD (Pre-Owned) displays `$52,845 - $64,505` — identical to the snapshot taken in Step 2. Also check one sentinel row (a 2027 watchlist trim on `/comparison`) renders `—` / its TBD text, not `NaN` or `$NaN`.

- [ ] **Step 5: Replace regex price parsing in components**

- `components/tabs/OverviewTab.tsx`: delete the local `parsePrice` helper (lines 15–19). Grep for `parsePrice(` — each call site is `parsePrice(r.preowned_range)` (or on a spread alias); replace with the row's `preowned_low` field, e.g. line ~79: `.map((r) => ({ ...r, prePrice: r.preowned_low! })).filter((r) => r.prePrice > 0)`.
- `components/tabs/ComparisonV2Tab.tsx`: delete the local `parsePreownedLow` helper (near line 129) and replace its call at line ~328 with `r.preowned_low`:
  `rows = rows.filter((r) => matchesBuckets(r.preowned_low, PREOWNED_BUCKETS, bucketFilters.preowned))`
  (Adjust `matchesBuckets` param type to accept `number | null` if it currently takes `number | undefined` — check its signature in the same file.)

```bash
grep -rn "parsePrice\|parsePreownedLow" components app lib
# Expected: no output
```

- [ ] **Step 6: Update validator — drop OTD checks, add exit code, wire prebuild**

In `scripts/validate-data.js`:
- Grep for `otd` (4 occurrences): remove `otd_new`/`otd_preowned` from any required-field list and delete any OTD-recomputation consistency check.
- At the very end of the file, after the report printing, add:

```js
process.exit(errors.length ? 1 : 0)
```

In `package.json` scripts, add:

```json
"validate": "node scripts/validate-data.js",
"prebuild": "node scripts/validate-data.js"
```

In `scripts/apply-refresh.js`: remove the OTD computation and writes (lines 48–53 write `p.otd_preowned` / `d.otd_preowned`; line ~92 sets a sentinel `otd_preowned`). Delete the `calcOtdPreowned` import if now unused. The script keeps writing `preowned_range` only.

- [ ] **Step 7: Run validation + build + tests**

```bash
npm run validate
# Expected: exit 0, no NEW errors versus the pre-change baseline
# (known "(expected)" watchlist warnings for missing msrp remain INFO/WARN-level;
#  if msrp-missing entries are currently ERRORS, the validator treated stored otd
#  as required — confirm the error list is unchanged from before this task)
npm run build && npm run test:e2e
```

Expected: prebuild runs the validator automatically, build succeeds, all tests pass.

- [ ] **Step 8: Update docs and command skills**

- `CLAUDE.md`:
  - "Data flow" section: note that `otd_new`, `otd_preowned`, `preowned_low`, `preowned_high` are computed at load in `lib/data.ts` and are NOT stored in `ev-data.json`.
  - "Data editing checklist": remove the "OTD values recalculated if msrp/destination/preowned_range changed" bullet (no longer applicable).
  - "OTD formula" section: keep the formula, add "Implemented in `lib/data.ts` (`enrich`); never store OTD in the JSON."
- `.claude/commands/refresh.md`, `update-pricing.md`, `add-vehicle.md`, `spot-check.md`, `validate.md`: grep each for `otd`; delete/replace instructions about recalculating or checking stored OTD values with "OTD is computed at load in lib/data.ts — do not write otd fields to ev-data.json."

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor: compute OTD and preowned price numbers at load, validate data on every build"
```

---

### Task 8: Chart convergence — port DataExplorer to Chart.js, drop Plot + d3

DataExplorer's scatter (colored dots per vehicle, optional bubble sizing, median crosshairs with quadrant labels, currency ticks, self-driving-tier axis) is rebuilt with `react-chartjs-2`. Then `@observablehq/plot`, `d3`, `@types/d3` are uninstalled.

**Files:**
- Modify: `components/DataExplorer.tsx` (replace lines ~340–553: the libs state, dynamic imports, `renderChart` callback and its effects; keep all filter state, axis state, and JSX controls)
- Modify: `package.json` (remove 3 deps)

**Interfaces:**
- Consumes: `chartColor(vehicle, isLight)` from Task 6; existing `NUMERIC_FIELDS`, `FIELD_LABELS`, `SELF_DRIVING_TIERS`, `TIER_SHORT`, `getQuadrantLabels`, `ProcessedRow` in the same file.
- Produces: no external interface change; `/explore` renders a `<canvas>` instead of `<svg>`.

- [ ] **Step 1: Replace the chart engine**

At the top of `components/DataExplorer.tsx`, add:

```tsx
import { Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend } from 'chart.js'
import { Scatter } from 'react-chartjs-2'

ChartJS.register(LinearScale, PointElement, Tooltip, Legend)

/* ── Small math helpers (replacing d3.median / d3.extent) ── */
function median(vals: number[]): number | null {
  if (!vals.length) return null
  const s = [...vals].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function extent(vals: number[]): [number, number] {
  return [Math.min(...vals), Math.max(...vals)]
}

const fmtUsd = (v: number) => '$' + Math.round(v).toLocaleString()

/* ── Median crosshair + quadrant label plugin ── */
const quadrantPlugin = {
  id: 'quadrant',
  afterDatasetsDraw(chart: any, _args: any, opts: any) {
    if (!opts || opts.xMed == null || opts.yMed == null) return
    const { ctx, chartArea, scales } = chart
    const xp = scales.x.getPixelForValue(opts.xMed)
    const yp = scales.y.getPixelForValue(opts.yMed)
    ctx.save()
    ctx.strokeStyle = opts.lineColor || '#2a3347'
    ctx.setLineDash([6, 4])
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(xp, chartArea.top); ctx.lineTo(xp, chartArea.bottom); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(chartArea.left, yp); ctx.lineTo(chartArea.right, yp); ctx.stroke()
    ctx.setLineDash([])
    const labels = opts.labels
    if (labels) {
      ctx.fillStyle = opts.labelColor || '#5c6780'
      ctx.font = 'italic 13px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const midL = (chartArea.left + xp) / 2
      const midR = (xp + chartArea.right) / 2
      const midT = (chartArea.top + yp) / 2
      const midB = (yp + chartArea.bottom) / 2
      if (labels.topLeft) ctx.fillText(labels.topLeft, midL, midT)
      if (labels.topRight) ctx.fillText(labels.topRight, midR, midT)
      if (labels.bottomLeft) ctx.fillText(labels.bottomLeft, midL, midB)
      if (labels.bottomRight) ctx.fillText(labels.bottomRight, midR, midB)
    }
    ctx.restore()
  },
}
ChartJS.register(quadrantPlugin)
```

- [ ] **Step 2: Delete the Plot/d3 machinery, build Chart.js data + options**

Remove: the `libs` state + dynamic-import `useEffect` (lines ~345–361), the entire `renderChart` useCallback, both `useEffect`s that call it, the `chartRef` (keep the container div in JSX but it will now hold `<Scatter>`), and the `import type` references to `@observablehq/plot` / `d3`.

In the component body (after `filtered` is computed), add:

```tsx
const isLight = useIsLightTheme() // added in Task 6 Step 4 — reuse

const plotData = filtered.filter(d => d[xAxis] != null && d[yAxis] != null) as ProcessedRow[]
const visibleVehicles = [...new Set(plotData.map(d => d.vehicle))].sort()
const isCurrency = (f: string) => ['msrp', 'otd_new', 'destination'].includes(f)

// Bubble radius: linear scale over the size field's extent → [4, 20] px
const sizeVals = bubbleSize !== 'none'
  ? plotData.filter(d => d[bubbleSize] != null).map(d => d[bubbleSize] as number)
  : []
const [sMin, sMax] = sizeVals.length ? extent(sizeVals) : [0, 1]
const radiusFor = (d: ProcessedRow): number => {
  if (bubbleSize === 'none' || d[bubbleSize] == null) return 6
  const span = sMax - sMin || 1
  return 4 + 16 * (((d[bubbleSize] as number) - sMin) / span)
}

const chartData = {
  datasets: visibleVehicles.map(v => ({
    label: v,
    data: plotData
      .filter(d => d.vehicle === v)
      .map(d => ({ x: d[xAxis] as number, y: d[yAxis] as number, row: d })),
    backgroundColor: chartColor(v, isLight) + 'cc',
    borderColor: isLight ? '#ffffff' : '#151921',
    borderWidth: 1,
    pointRadius: (ctx: any) => (ctx.raw ? radiusFor(ctx.raw.row) : 6),
    pointHoverRadius: (ctx: any) => (ctx.raw ? radiusFor(ctx.raw.row) + 2 : 8),
  })),
}

const xVals = plotData.map(d => d[xAxis] as number)
const yVals = plotData.map(d => d[yAxis] as number)
const xMed = median(xVals)
const yMed = median(yVals)

const tierEntries = Object.entries(SELF_DRIVING_TIERS)
const tierTick = (v: number) => {
  const t = tierEntries.find(([, n]) => n === v)
  return t ? TIER_SHORT[t[0]] : ''
}

const axisScale = (field: string) => ({
  type: 'linear' as const,
  title: { display: true, text: FIELD_LABELS[field] },
  grid: { color: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)' },
  ...(field === 'self_driving_score'
    ? {
        min: 2.0,
        max: 2.5,
        ticks: { callback: tierTick, stepSize: 0.1 },
      }
    : {
        ticks: isCurrency(field)
          ? { callback: (v: any) => fmtUsd(Number(v)) }
          : {},
      }),
})

const fmtVal = (field: string, v: unknown) =>
  isCurrency(field) && typeof v === 'number' ? fmtUsd(v) : String(v)

const chartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  scales: { x: axisScale(xAxis), y: axisScale(yAxis) },
  plugins: {
    legend: { display: false }, // page renders its own legend
    quadrant: {
      xMed,
      yMed,
      labels: xMed != null && yMed != null ? getQuadrantLabels(xAxis, yAxis) : null,
      lineColor: isLight ? 'rgba(0,0,0,0.15)' : '#2a3347',
      labelColor: isLight ? '#9098a8' : '#5c6780',
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const d: ProcessedRow = ctx.raw.row
          const lines = [
            d.name,
            `${FIELD_LABELS[xAxis]}: ${fmtVal(xAxis, d[xAxis])}`,
            `${FIELD_LABELS[yAxis]}: ${fmtVal(yAxis, d[yAxis])}`,
          ]
          if (bubbleSize !== 'none' && d[bubbleSize] != null) {
            lines.push(`${FIELD_LABELS[bubbleSize]}: ${fmtVal(bubbleSize, d[bubbleSize])}`)
          }
          return lines
        },
      },
    },
  },
}
```

Replace the old chart container JSX (`<div ref={chartRef} ...>` or equivalent — find the element the old code appended the plot into, class `explorer-chart` or similar) with:

```tsx
<div className="explorer-chart" style={{ position: 'relative', height: 560 }}>
  {plotData.length === 0 ? (
    <p className="explorer-empty">No data for this combination.</p>
  ) : (
    <Scatter data={chartData} options={chartOptions} />
  )}
</div>
```

Keep the existing legend markup (it already uses `chartColor(v, isLight)` after Task 6). Preserve the wide-screen height behavior with CSS if the old code varied height by width (`height: 560` default; optionally add a `@media (min-width: 1200px)` rule setting `.explorer-chart { height: 700px; }` in `globals.css`).

Note: `self_driving_score` axis tick values are 2.1–2.4 with `stepSize: 0.1` — verify all four tier labels render; if Chart.js skips ticks, set `ticks: { autoSkip: false, callback: tierTick, stepSize: 0.1 }`.

- [ ] **Step 3: Verify the explorer works before removing deps**

Run: `npm run dev`, open `/explore`:
- dots colored per vehicle, tooltip shows name + axis values
- switch Y axis to "Self-Driving Tier" → tier labels on axis
- set bubble size to a field → radii vary
- median dashed crosshairs + quadrant labels visible (for label-supported axis pairs)

Run: `npm run test:e2e`
Expected: explore test passes (asserts `svg, canvas` — canvas now).

- [ ] **Step 4: Remove the dependencies**

```bash
npm uninstall @observablehq/plot d3 @types/d3
grep -rn "observablehq\|from 'd3'\|from \"d3\"" app components lib
# Expected: no output
npm run build
```

Expected: build succeeds. Note the `/explore` first-load JS drop in the build output (was loading Plot+d3 dynamically).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: port DataExplorer to Chart.js, drop @observablehq/plot and d3"
```

---

### Task 9: Final hygiene — shareable bucket filters, CSS pruning, full verification

**Files:**
- Modify: `components/pages/ComparisonClient.tsx` (read/write `bkt_*` params)
- Modify: `components/tabs/ComparisonV2Tab.tsx` (bucket state → props)
- Modify: `app/globals.css` (remove dead legacy + News sections)
- Modify: `tests/e2e/smoke.spec.ts` (bucket URL round-trip test)

**Interfaces:**
- Consumes: `ComparisonClient` from Task 3.
- Produces: `ComparisonV2Tab` gains props `bucketFilters: Record<string, string[]>` and `onBucketChange: (group: string, vals: string[]) => void`; URL params `bkt_<group>` with values joined by `|`.

- [ ] **Step 1: Lift bucket filters to URL params in ComparisonClient**

Add to `ComparisonClient`:

```tsx
// Bucket filters (MSRP/Range/HP/… buckets) — URL params prefixed bkt_
const bucketFilters: Record<string, string[]> = {}
searchParams.forEach((value, key) => {
  if (key.startsWith('bkt_') && value) {
    bucketFilters[key.slice(4)] = value.split('|')
  }
})

const setBucketFilter = useCallback((group: string, vals: string[]) => {
  const params = new URLSearchParams(searchParams.toString())
  if (vals.length) params.set(`bkt_${group}`, vals.join('|'))
  else params.delete(`bkt_${group}`)
  startTransition(() => router.replace(`?${params.toString()}`, { scroll: false }))
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [searchParams])
```

Pass both to the tab: `<ComparisonTab filters={filters} onFiltersChange={setFilters} bucketFilters={bucketFilters} onBucketChange={setBucketFilter} onRowClick={setDetailIdx} />`

- [ ] **Step 2: Convert ComparisonV2Tab bucket state to props**

In `components/tabs/ComparisonV2Tab.tsx`:
- Extend `Props`: add `bucketFilters: Record<string, string[]>` and `onBucketChange: (group: string, vals: string[]) => void`; destructure them in the component signature.
- Delete line 285: `const [bucketFilters, setBucketFilters] = useState<Record<string, string[]>>({})`.
- Find the `updateBucket` helper (used at lines 404–412) and reimplement it as a passthrough:

```tsx
const updateBucket = (group: string, vals: string[]) => onBucketChange(group, vals)
```

- If a "clear all filters" handler resets buckets via `setBucketFilters({})` (check the handler at line ~360), replace with clearing each active group: `Object.keys(bucketFilters).forEach(g => onBucketChange(g, []))`.

Note: bucket labels contain `$`, `–`, `+` but never `|` or `,` — the `|` separator is safe (verify by reading the `*_BUCKETS` constants in the file).

- [ ] **Step 3: Add a bucket round-trip smoke test**

```ts
test('bucket filter survives reload via URL', async ({ page }) => {
  await page.goto('/comparison')
  // Open the MSRP header filter and pick the first bucket
  await page.locator('th', { hasText: 'MSRP' }).locator('button').first().click()
  await page.locator('.filter-portal, [class*="dropdown"]').locator('input[type="checkbox"]').first().check()
  await expect(page).toHaveURL(/bkt_msrp=/)
  const url = page.url()
  await page.goto(url) // fresh load of the same URL
  await expect(page).toHaveURL(/bkt_msrp=/)
})
```

(Selector note: inspect the rendered filter dropdown classes with the dev server if `.filter-portal` doesn't match — the goal is checking one bucket checkbox and asserting the URL param appears and persists.)

- [ ] **Step 4: Prune dead CSS**

In `app/globals.css`:
- Delete the legacy block at ~line 177: `/* ── Nav wrap (legacy — tabs now in header) ── */` and the `.nav-tabs-wrap { display: none; }` rule. Also delete `.nav-tabs` selector rules IF grep shows no remaining users (`grep -rn "nav-tabs\b" app components` — note `.nav-tab` singular IS used by DashboardNav; only remove plural `.nav-tabs` and `.nav-tabs-wrap`).
- Delete the entire News section (comment `/* ── News ── */` through the last `news-*` rule before the next section comment, ~lines 1717–1784) after verifying: `grep -rn "news-" app components` returns nothing (the news API route is a disabled stub with no UI).

Run: `npm run build && npm run test:e2e` — all pass, pages visually unchanged.

- [ ] **Step 5: Full final verification**

```bash
npm run validate     # exit 0
npm run lint         # no errors
npm run build        # succeeds, prebuild validator runs
npm run test:e2e     # all tests pass
```

Manual spot-check on the dev server: home, `/comparison` (filters + buckets shareable via URL, back button doesn't step through filter clicks), `/side-by-side`, `/spec-select`, `/glossary`, `/explore` (Chart.js), a vehicle page, a compare page, light-theme toggle (badges + charts legible).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: shareable bucket filters via URL, prune dead CSS"
```

---

## Post-plan follow-ups (explicitly out of scope)

- Storing `preowned_low`/`preowned_high` as JSON fields (kept as strings + load-time parsing to avoid breaking the refresh/update-pricing skill workflows).
- Porting MarketInsights to a different chart library (stays on Chart.js — now the single chart library).
- Splitting `globals.css` into per-component files.
- The stale hardcoded counts inside the `scope`/`count_note` strings in `ev-data.json` (data-refresh concern; flag during next `/refresh`).

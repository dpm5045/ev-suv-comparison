# Light/Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a warm cream light mode theme toggled via an easter egg (clicking the hero car image), with a persistent header toggle that appears after discovery.

**Architecture:** CSS variable override on `html[data-theme="light"]`. An inline script in layout.tsx prevents flash. The easter egg click handler in OverviewTab toggles the attribute and persists to localStorage. Header.tsx conditionally renders a sun/moon icon once the easter egg has been discovered.

**Tech Stack:** Next.js 14 App Router, CSS custom properties, localStorage, no additional dependencies.

**Spec:** `docs/superpowers/specs/2026-03-19-light-dark-mode-design.md`

---

### Task 1: Prepare Light Hero Image Assets

**Files:**
- Source: `Hero Imagery/light-desktop.png`, `Hero Imagery/light-mobile.png`
- Create: `public/hero-sketch-light.png`
- Create: `public/hero-sketch-light.webp`
- Create: `public/hero-sketch-light-mobile.png`
- Create: `public/hero-sketch-light-mobile.webp`

- [ ] **Step 1: Copy desktop light image to public/**

```bash
cp "Hero Imagery/light-desktop.png" public/hero-sketch-light.png
```

- [ ] **Step 2: Convert desktop light image to webp**

Use cwebp (or sharp/squoosh CLI) to match the existing webp quality. The existing dark desktop webp is ~100KB from a 1.3MB PNG, so use quality ~80:

```bash
npx sharp-cli -i public/hero-sketch-light.png -o public/hero-sketch-light.webp --format webp --quality 80
```

If sharp-cli isn't available, use:
```bash
npx @aspect-build/cwebp public/hero-sketch-light.png -o public/hero-sketch-light.webp -q 80
```

Alternatively, use an online converter or any tool that produces webp. Target: under 150KB.

- [ ] **Step 3: Copy mobile light image to public/**

```bash
cp "Hero Imagery/light-mobile.png" public/hero-sketch-light-mobile.png
```

- [ ] **Step 4: Convert mobile light image to webp**

```bash
npx sharp-cli -i public/hero-sketch-light-mobile.png -o public/hero-sketch-light-mobile.webp --format webp --quality 80
```

Target: under 150KB.

- [ ] **Step 5: Verify all 8 hero images exist**

```bash
ls -la public/hero-sketch*
```

Expected: 8 files — 4 dark (existing) + 4 light (new):
- `hero-sketch-dark.png`, `hero-sketch-dark.webp`
- `hero-sketch-mobile.png`, `hero-sketch-mobile.webp`
- `hero-sketch-light.png`, `hero-sketch-light.webp`
- `hero-sketch-light-mobile.png`, `hero-sketch-light-mobile.webp`

- [ ] **Step 6: Commit**

```bash
git add public/hero-sketch-light.png public/hero-sketch-light.webp public/hero-sketch-light-mobile.png public/hero-sketch-light-mobile.webp
git commit -m "assets: add light mode hero images"
```

---

### Task 2: Add Light Theme CSS Variables

**Files:**
- Modify: `app/globals.css:3-26` (`:root` block — reference only, do not modify)
- Modify: `app/globals.css:53-60` (`.site-header` — extract hardcoded rgba to variable)
- Modify: `app/globals.css` (add new `html[data-theme="light"]` block after `:root`)

- [ ] **Step 1: Add `--header-bg` variable to `:root`**

In `app/globals.css`, add `--header-bg` to the existing `:root` block (after `--mono` on line 25):

```css
  --header-bg: rgba(12, 15, 20, 0.92);
```

- [ ] **Step 2: Update `.site-header` to use the variable**

In `app/globals.css:57`, replace the hardcoded background:

```css
/* Before */
background: rgba(12, 15, 20, 0.92);

/* After */
background: var(--header-bg);
```

- [ ] **Step 3: Add the light theme variable block**

In `app/globals.css`, immediately after the `:root { ... }` block (after line 26), add:

```css
/* ── Light theme ── */
html[data-theme="light"] {
  color-scheme: light;
  --bg: #faf8f5;
  --surface: #ffffff;
  --surface2: #f5f0eb;
  --surface3: #ede8e1;
  --border: #e0dbd3;
  --border-light: #d4cdc4;
  --text: #1c1917;
  --text-muted: #8c8279;
  --text-dim: #a39e97;
  --accent: #2563eb;
  --accent-dim: #93bbfd;
  --accent-glow: rgba(37, 99, 235, 0.08);
  --green: #16a34a;
  --amber: #b45309;
  --red: #dc2626;
  --teal: #0d9488;
  --purple: #7c3aed;
  --pink: #db2777;
  --orange: #ea580c;
  --header-bg: rgba(250, 248, 245, 0.92);
}
```

- [ ] **Step 4: Run dev server and manually verify**

```bash
npm run dev
```

Open browser, open DevTools, manually set `document.documentElement.setAttribute('data-theme', 'light')` in console. Verify:
- Page background changes to cream
- Text becomes dark
- Cards have white backgrounds
- Borders are warm taupe

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "feat: add light theme CSS variables and header-bg extraction"
```

---

### Task 3: Add Vehicle Badge Light Mode Overrides

**Files:**
- Modify: `app/globals.css:374-387` (vehicle badge classes — reference only)
- Modify: `app/globals.css` (add light overrides after badge block)

- [ ] **Step 1: Add vehicle badge light overrides**

In `app/globals.css`, immediately after the existing `.v-genesis` rule (line 387), add:

```css
/* ── Vehicle badges — light theme ── */
html[data-theme="light"] .v-kia { background: #dcfce7; color: #16a34a; }
html[data-theme="light"] .v-hyundai { background: #dbeafe; color: #2563eb; }
html[data-theme="light"] .v-lucid { background: #ede9fe; color: #7c3aed; }
html[data-theme="light"] .v-rivian { background: #ffedd5; color: #ea580c; }
html[data-theme="light"] .v-tesla { background: #fee2e2; color: #dc2626; }
html[data-theme="light"] .v-toyota { background: #ccfbf1; color: #0d9488; }
html[data-theme="light"] .v-vinfast { background: #fef3c7; color: #b45309; }
html[data-theme="light"] .v-vw { background: #fef9c3; color: #a16207; }
html[data-theme="light"] .v-volvo { background: #fce7f3; color: #db2777; }
html[data-theme="light"] .v-cadillac { background: #ede9fe; color: #7c3aed; }
html[data-theme="light"] .v-mercedes { background: #f4f4f5; color: #52525b; }
html[data-theme="light"] .v-subaru { background: #d1fae5; color: #059669; }
html[data-theme="light"] .v-bmw { background: #dbeafe; color: #2563eb; }
html[data-theme="light"] .v-genesis { background: #ffedd5; color: #ea580c; }
```

- [ ] **Step 2: Verify badges in light mode**

With dev server running, set `data-theme="light"` in DevTools console. Navigate to the Compare tab and verify vehicle badges have pastel backgrounds with dark text, all readable.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add vehicle badge light mode color overrides"
```

---

### Task 4: Add Data-Category Light Mode Overrides

**Files:**
- Modify: `app/globals.css:914-932` (accessories card data-category — reference)
- Modify: `app/globals.css:1294-1299` (insight pills — reference)
- Modify: `app/globals.css:1544-1550` (overview stats — reference)
- Modify: `app/globals.css` (add light overrides near each section)

The `data-category` styles use CSS custom property composition (`--card-accent: var(--amber)`), so the semantic color overrides from Task 2 automatically cascade. The only values that need explicit light overrides are the hardcoded `rgba()` tint values on `.accessories-card` and `.overview-stat`.

- [ ] **Step 1: Add accessories card tint light overrides**

After the existing `.accessories-card[data-category="vehicle"]` rule (~line 932), add:

```css
/* ── Accessories card tints — light theme ── */
html[data-theme="light"] .accessories-card[data-category="charging"]     { --card-tint: rgba(180, 83, 9, 0.06); }
html[data-theme="light"] .accessories-card[data-category="protection"]   { --card-tint: rgba(13, 148, 136, 0.06); }
html[data-theme="light"] .accessories-card[data-category="organization"] { --card-tint: rgba(22, 163, 74, 0.06); }
html[data-theme="light"] .accessories-card[data-category="essentials"]   { --card-tint: rgba(234, 88, 12, 0.06); }
html[data-theme="light"] .accessories-card[data-category="vehicle"]      { --card-tint: rgba(37, 99, 235, 0.06); }
```

- [ ] **Step 2: Add overview stat glow light overrides**

After the existing `.overview-stat[data-category="selfdriving"]` rule (~line 1550), add:

```css
/* ── Overview stat glows — light theme ── */
html[data-theme="light"] .overview-stat[data-category="count"]       { --stat-glow: rgba(37, 99, 235, 0.08); }
html[data-theme="light"] .overview-stat[data-category="range"]       { --stat-glow: rgba(13, 148, 136, 0.08); }
html[data-theme="light"] .overview-stat[data-category="storage"]     { --stat-glow: rgba(22, 163, 74, 0.08); }
html[data-theme="light"] .overview-stat[data-category="power"]       { --stat-glow: rgba(234, 88, 12, 0.08); }
html[data-theme="light"] .overview-stat[data-category="charging"]    { --stat-glow: rgba(180, 83, 9, 0.08); }
html[data-theme="light"] .overview-stat[data-category="sixseat"]     { --stat-glow: rgba(124, 58, 237, 0.08); }
html[data-theme="light"] .overview-stat[data-category="selfdriving"] { --stat-glow: rgba(220, 38, 38, 0.08); }
```

- [ ] **Step 3: Note on insight pills**

The `.insight-pill.active[data-category="..."]` rules use `var(--teal)`, `var(--green)`, etc. for background/border. These inherit the light values from Task 2 automatically. However, these pills have white text (`color: var(--bg)` is common for active states on colored backgrounds). Verify that active pill text is still readable in light mode — if `--bg` is cream (`#faf8f5`), it should still contrast well against the darker semantic colors. If not, add a `--pill-active-text` override. Check this during manual verification.

- [ ] **Step 4: Verify data-category styles in light mode**

With dev server running + `data-theme="light"` in DevTools:
- Overview tab: stat cards should have subtle colored glows
- Accessories section (if visible): cards should have light tints
- Insight pills: active pills should be readable

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "feat: add data-category light mode tint and glow overrides"
```

---

### Task 5: Add Flash Prevention Script to Layout

**Files:**
- Modify: `app/layout.tsx:44-54` (RootLayout component)

- [ ] **Step 1: Add inline theme script to layout**

In `app/layout.tsx`, add a `<script>` tag inside `<head>` that reads localStorage and sets the `data-theme` attribute before paint. In Next.js App Router, inject it via `<head>` in the html:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <GoogleAnalytics />
        {children}
        <Footer />
      </body>
    </html>
  )
}
```

Key details:
- `suppressHydrationWarning` on `<html>` prevents React warning about server/client attribute mismatch (server renders without `data-theme`, client may add it)
- The `try/catch` handles cases where localStorage is unavailable (private browsing, SSR)
- The script is inline and synchronous — it blocks paint until executed, which is what we want

- [ ] **Step 2: Run the build to verify no errors**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add inline theme script for flash prevention"
```

---

### Task 6: Add Easter Egg Toggle to Hero Image

**Files:**
- Modify: `components/tabs/OverviewTab.tsx:1-9` (imports)
- Modify: `components/tabs/OverviewTab.tsx:610-622` (hero section JSX)

- [ ] **Step 1: Add theme state and toggle handler**

At the top of the `OverviewTab` component function (which is a `'use client'` component), add state and a toggle function. Find the component function declaration and add near the top, after existing state declarations:

```tsx
const [theme, setTheme] = useState<'dark' | 'light'>('dark')

useEffect(() => {
  const saved = localStorage.getItem('theme') as 'dark' | 'light' | null
  if (saved === 'light') setTheme('light')
}, [])

function toggleTheme() {
  const next = theme === 'dark' ? 'light' : 'dark'
  setTheme(next)
  document.documentElement.setAttribute('data-theme', next === 'light' ? 'light' : '')
  if (next === 'dark') {
    document.documentElement.removeAttribute('data-theme')
  }
  localStorage.setItem('theme', next)
  localStorage.setItem('theme-unlocked', 'true')
  // Dispatch custom event so Header can pick up the unlock
  window.dispatchEvent(new Event('theme-change'))
}
```

- [ ] **Step 2: Update hero image JSX with click handler and dynamic sources**

Replace the hero image section (lines 614-621) with:

```tsx
<div className="overview-hero-image" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
  <picture>
    <source media="(max-width: 767px)" srcSet={theme === 'light' ? '/hero-sketch-light-mobile.webp' : '/hero-sketch-mobile.webp'} type="image/webp" />
    <source media="(max-width: 767px)" srcSet={theme === 'light' ? '/hero-sketch-light-mobile.png' : '/hero-sketch-mobile.png'} type="image/png" />
    <source srcSet={theme === 'light' ? '/hero-sketch-light.webp' : '/hero-sketch-dark.webp'} type="image/webp" />
    <img src={theme === 'light' ? '/hero-sketch-light.png' : '/hero-sketch-dark.png'} alt="3-Row EV concept sketch" width={800} height={450} loading="eager" fetchPriority="high" />
  </picture>
</div>
```

- [ ] **Step 3: Verify easter egg works**

With dev server running:
1. Open the site — should be dark mode
2. Hover over the hero car image — cursor changes to pointer
3. Click the image — theme flips to light, hero image swaps
4. Refresh the page — light mode persists (no flash)
5. Click the image again — flips back to dark

- [ ] **Step 4: Commit**

```bash
git add components/tabs/OverviewTab.tsx
git commit -m "feat: add easter egg theme toggle on hero car image"
```

---

### Task 7: Add Header Theme Toggle (Post-Discovery)

**Files:**
- Modify: `components/Header.tsx` (add theme toggle icon)
- Modify: `app/globals.css` (add toggle button styles)

- [ ] **Step 1: Convert Header to client component and add toggle**

Replace the full contents of `components/Header.tsx`:

```tsx
'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardNav from './DashboardNav'

export type TabId = 'overview' | 'specselect' | 'comparison' | 'sidebyside' | 'glossary' | 'about'

interface Props {
  activeTab?: TabId
}

function NavFallback() {
  return (
    <nav className="header-nav">
      <Link href="/" className="nav-tab nav-tab-brand">3RowEV</Link>
      <Link href="/about" className="nav-tab">About</Link>
    </nav>
  )
}

function ThemeToggle() {
  const [unlocked, setUnlocked] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    function sync() {
      setUnlocked(localStorage.getItem('theme-unlocked') === 'true')
      setTheme((localStorage.getItem('theme') as 'dark' | 'light') || 'dark')
    }
    sync()
    window.addEventListener('theme-change', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('theme-change', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  if (!unlocked) return null

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem('theme', next)
    window.dispatchEvent(new Event('theme-change'))
  }

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}

export default function Header({ activeTab }: Props) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="header-brand">3RowEV</Link>

        {activeTab ? (
          <Suspense fallback={<NavFallback />}>
            <DashboardNav activeTab={activeTab} />
          </Suspense>
        ) : (
          <NavFallback />
        )}

        <ThemeToggle />
      </div>
    </header>
  )
}
```

Key details:
- `ThemeToggle` is a separate component that reads `theme-unlocked` from localStorage
- It listens for the custom `theme-change` event dispatched by OverviewTab's toggle
- It also listens for `storage` events (for cross-tab sync)
- Uses emoji sun/moon icons — simple, no dependencies
- Returns `null` when not unlocked (invisible)

- [ ] **Step 2: Add theme toggle CSS**

In `app/globals.css`, after the `.header-brand` styles (around line 90), add:

```css
.theme-toggle {
  position: absolute;
  right: 32px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  color: var(--text-muted);
  transition: border-color 0.2s, background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.theme-toggle:hover {
  border-color: var(--border-light);
  background: var(--surface2);
}
```

- [ ] **Step 3: Verify header toggle behavior**

With dev server running:
1. Open the site — no toggle visible in header
2. Click the hero car image (easter egg) — theme flips to light
3. Sun/moon toggle now appears in header top-right
4. Navigate to Compare tab — toggle is still visible
5. Click the toggle — theme flips back to dark, icon changes
6. Refresh — toggle still visible (unlocked persists), theme persists

- [ ] **Step 4: Run build to verify no errors**

```bash
npm run build
```

Expected: build succeeds. The Header component is now a client component, which is fine since it was already wrapping `Suspense` and client components.

- [ ] **Step 5: Commit**

```bash
git add components/Header.tsx app/globals.css
git commit -m "feat: add header theme toggle (visible after easter egg discovery)"
```

---

### Task 8: Visual QA and Polish

**Files:**
- Potentially modify: `app/globals.css` (any missed overrides)

This task is a visual audit across all tabs in light mode. No code is pre-written — the implementer should identify and fix issues as they go.

- [ ] **Step 1: Audit Overview tab in light mode**

Check every element:
- Hero section background/text
- Stat cards (colored glows)
- Glance table headers, rows, alternating backgrounds
- Insight filter pills (active and inactive)
- Budget filter pills
- Watchlist section
- Mobile card view (resize to mobile width)

- [ ] **Step 2: Audit Compare tab in light mode**

Check:
- Filter bar (vehicle pills, search input)
- Table headers and rows
- Cell color coding (green/amber/red for values)
- Vehicle badges
- "NA" cells
- Mobile card view
- Detail panel (slide-in sidebar)

- [ ] **Step 3: Audit Side-by-Side tab in light mode**

Check:
- Vehicle selectors (dropdowns)
- Comparison table rows
- Highlight colors for best/worst values
- Empty state

- [ ] **Step 4: Audit Reference/About tab in light mode**

Check:
- Glossary table
- Methodology text
- Links

- [ ] **Step 5: Audit header and footer in both themes**

Check:
- Sticky header translucency/blur on scroll
- Footer text/links
- Theme toggle icon visibility and hover state

- [ ] **Step 6: Fix any issues found**

Common issues to watch for:
- Text that becomes invisible (same color as background)
- Borders that disappear
- Hover states that don't work
- Shadows that are too harsh or invisible
- Scrollbar colors
- Active pill text contrast (pills with colored backgrounds need readable text)

- [ ] **Step 7: Commit all fixes**

```bash
git add app/globals.css
git commit -m "fix: polish light mode visual issues from QA audit"
```

---

### Task 9: Final Build Verification

**Files:** None (read-only verification)

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: build succeeds with no errors or warnings related to our changes.

- [ ] **Step 3: Test production build locally**

```bash
npx next start
```

Verify:
1. Default is dark mode
2. Easter egg works (click car → light mode)
3. Header toggle appears after discovery
4. Theme persists across refresh (no flash)
5. Toggle works from non-Overview tabs

- [ ] **Step 4: Final commit if any remaining changes**

```bash
git status
```

If any uncommitted changes, commit them with an appropriate message.

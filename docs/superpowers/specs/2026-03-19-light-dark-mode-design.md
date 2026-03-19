# Light/Dark Mode — Design Spec

**Date:** 2026-03-19
**Status:** Approved

## Overview

Add a light mode theme to the app (currently dark-only) using a CSS variable override strategy. Dark remains the default. Light mode is discoverable via an easter egg: clicking the hero car image on the Overview tab. Once discovered, a persistent toggle appears in the site header.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Approach | CSS variable override (`data-theme` attribute) | All 26 color variables already in `:root`; zero component changes needed |
| Default theme | Dark | Current aesthetic, user preference |
| Light palette direction | Warm cream / off-white | Softer than stark white, complements the existing blue-tinted dark palette |
| Toggle location (initial) | Easter egg — click hero car image | Fun, discreet; dark mode is the "real" experience |
| Toggle location (post-discovery) | Small icon in site header | Accessible from any tab once unlocked |
| Persistence | `localStorage` | Survives refresh, no server needed |
| Hero images | Dedicated light variants | Highest quality; assets already exist in `Hero Imagery/` folder |
| Footer toggle | Deferred to later | Documented below for future implementation |

## Light Mode Color Palette

### Core Variables

| Variable | Dark (current) | Light (proposed) | Role |
|----------|---------------|-----------------|------|
| `--bg` | `#0c0f14` | `#faf8f5` | Page background |
| `--surface` | `#151921` | `#ffffff` | Cards, panels |
| `--surface2` | `#1c2230` | `#f5f0eb` | Headers, hover states |
| `--surface3` | `#242b3a` | `#ede8e1` | Highest elevation |
| `--border` | `#2a3347` | `#e0dbd3` | Standard border |
| `--border-light` | `#354059` | `#d4cdc4` | Hover/active borders |
| `--text` | `#e8ecf4` | `#1c1917` | Primary text |
| `--text-muted` | `#8b96ad` | `#8c8279` | Secondary text |
| `--text-dim` | `#5c6780` | `#a39e97` | Tertiary text |
| `--accent` | `#5ba4f5` | `#2563eb` | Primary blue accent |
| `--accent-dim` | `#2d5a9e` | `#93bbfd` | Accent hover/dim |
| `--accent-glow` | `rgba(91,164,245,0.12)` | `rgba(37,99,235,0.08)` | Accent overlay |

### Semantic Colors

Semantic colors get slightly darker/more saturated variants for light mode to maintain contrast against white/cream backgrounds.

| Variable | Dark | Light | Usage |
|----------|------|-------|-------|
| `--green` | `#4ade80` | `#16a34a` | Positive, best values |
| `--red` | `#f87171` | `#dc2626` | Negative, worst values |
| `--teal` | `#2dd4bf` | `#0d9488` | Links, alt accent |
| `--amber` | `#fbbf24` | `#b45309` | Warning, charging |
| `--orange` | `#fb923c` | `#ea580c` | Alerts, power |
| `--purple` | `#a78bfa` | `#7c3aed` | Premium |
| `--pink` | `#f472b6` | `#db2777` | Accent variant |

### Vehicle Badge Colors (Light Mode)

Badge backgrounds flip from dark-tinted to pastel tints; text colors get darker for contrast.

| Class | Dark bg → Light bg | Dark text → Light text |
|-------|-------------------|----------------------|
| `.v-kia` | `#1a3a2a` → `#dcfce7` | `#4ade80` → `#16a34a` |
| `.v-hyundai` | `#1a2a3a` → `#dbeafe` | `#5ba4f5` → `#2563eb` |
| `.v-lucid` | `#2a1a3a` → `#ede9fe` | `#a78bfa` → `#7c3aed` |
| `.v-rivian` | `#3a2a1a` → `#ffedd5` | `#fb923c` → `#ea580c` |
| `.v-tesla` | `#3a1a1a` → `#fee2e2` | `#f87171` → `#dc2626` |
| `.v-toyota` | `#1a3a3a` → `#ccfbf1` | `#2dd4bf` → `#0d9488` |
| `.v-vinfast` | `#2a1a1a` → `#fef3c7` | `#f59e0b` → `#b45309` |
| `.v-vw` | `#2a2a1a` → `#fef9c3` | `#fbbf24` → `#a16207` |
| `.v-volvo` | `#2a1a2a` → `#fce7f3` | `#f472b6` → `#db2777` |
| `.v-cadillac` | `#1a1a2a` → `#ede9fe` | `#a78bfa` → `#7c3aed` |
| `.v-mercedes` | `#2a2a2a` → `#f4f4f5` | `#d4d4d8` → `#52525b` |
| `.v-subaru` | `#1a2a2a` → `#d1fae5` | `#34d399` → `#059669` |
| `.v-bmw` | `#1a1a3a` → `#dbeafe` | `#60a5fa` → `#2563eb` |
| `.v-genesis` | `#2a1a1a` → `#ffedd5` | `#f97316` → `#ea580c` |

### Additional Hardcoded Values

| Location | Dark value | Light override | Notes |
|----------|-----------|---------------|-------|
| `.site-header` background | `rgba(12,15,20,0.92)` | `rgba(250,248,245,0.92)` | Convert to `--header-bg` variable |
| `html` `color-scheme` | `dark` | `light` | Override in `[data-theme="light"]` |
| `layout.tsx` `themeColor` | `#151921` | Stays as-is (meta tag, not dynamic) | Could be addressed later with JS |
| `data-category` dynamic properties | Various per-category colors | Need light variants | Overview stats, accessories cards |

## Easter Egg Mechanism

### Discovery Flow

1. User visits site → dark mode (default), no toggle visible
2. User clicks hero car image on Overview tab
3. Theme flips to light mode
4. `localStorage.setItem('theme', 'light')`
5. `localStorage.setItem('theme-unlocked', 'true')`
6. Sun/moon toggle icon appears in site header

### Hint

- `cursor: pointer` on the hero image on hover
- No other visual indication (no tooltip, no glow, no label)

### Header Toggle (Post-Discovery)

- Small sun/moon icon in the header, right-aligned
- Only renders when `localStorage.getItem('theme-unlocked') === 'true'`
- Clicking toggles between dark and light
- Subtle, no label — just the icon
- Once unlocked, stays visible permanently (even if user switches back to dark)

## Flash Prevention

An inline `<script>` in `layout.tsx` runs synchronously before React hydrates:

```js
(function(){
  var t = localStorage.getItem('theme');
  if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
})()
```

This prevents flash of wrong theme (FOUC) on page load.

## Hero Image Swap

### Assets

| Theme | Desktop | Mobile |
|-------|---------|--------|
| Dark (existing) | `hero-sketch-dark.png/webp` | `hero-sketch-mobile.png/webp` |
| Light (new) | `hero-sketch-light.png/webp` | `hero-sketch-light-mobile.png/webp` |

**Source files:** `Hero Imagery/light-desktop.png` and `Hero Imagery/light-mobile.png` — convert to webp and copy to `public/`.

### Swap Logic

The `<picture>` element in `OverviewTab.tsx` updates its `srcSet` and `src` attributes based on the current theme. Since the toggle handler lives in the same component, this is a direct state-driven update.

## Files Modified

| File | Change |
|------|--------|
| `app/globals.css` | Add `html[data-theme="light"]` variable overrides, vehicle badge light overrides, header bg variable |
| `app/layout.tsx` | Add inline `<script>` for flash prevention |
| `components/tabs/OverviewTab.tsx` | Add click handler on hero image, image source swap logic |
| `components/Header.tsx` | Add conditional sun/moon toggle icon |
| `public/` | Add 4 new hero image files (light desktop/mobile, png/webp) |

## Future: Footer Toggle

**Deferred — not part of initial implementation.**

For a later iteration, add a small theme toggle in the site footer as a more discoverable (but still subtle) alternative. This would coexist with the header toggle:

- Footer toggle is always visible (no unlocking required)
- Small text link or icon, styled to match footer aesthetic
- Same `localStorage` logic — also sets `theme-unlocked` so the header toggle appears

This provides an accessibility-friendly path for users who need light mode but wouldn't discover the easter egg.

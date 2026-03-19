# Metric Categories Redesign — Design Spec

**Date:** 2026-03-19
**Status:** Approved

## Problem

Metric groupings across the app evolved organically and have awkward pairings — notably "Drivetrain & Charging" combines two unrelated concerns. The current 7-section layout doesn't match how people think about EVs when shopping.

## Approved Design: 8 Sections

The new categorization splits "Drivetrain & Charging" apart (drivetrain → performance, charging → its own section with range/battery), splits "Self-Driving & Tech" into two distinct sections, and renames "Key Stats" to "Pricing."

### Section Layout

| # | Section | Fields |
|---|---------|--------|
| 1 | **Pricing** | Model Year, Trim, MSRP ($), Destination ($), Pre-Owned Price Range |
| 2 | **Powertrain & Performance** | Drivetrain, Horsepower (hp), Torque, 0–60 mph, Curb Weight, Towing Capacity |
| 3 | **Range & Charging** | EPA/Est Range (mi), Battery (kWh), Charging Type, DC Fast Charge (kW), DC Fast Charge 10–80%, Onboard AC (kW), L2 10–80% (hrs.), L2 10–100% |
| 4 | **Dimensions** | Seats, Length, Width, Height, Ground Clearance, 3rd Row Legroom, 3rd Row Headroom |
| 5 | **Self-Driving** | Self Driving, SAE Level, Self Driving Tier |
| 6 | **Infotainment** | Car Software, Center Display, Gauge Cluster, HUD, Other Displays, Audio, Driver Profiles |
| 7 | **Cargo & Storage** | Frunk Volume (cu ft), Behind 3rd Row (cu ft), Behind 2nd Row (cu ft), Behind 1st Row (cu ft), Fold Flat, Cargo Floor Width (in) |
| 8 | **Notes** | Sources, Notes |

### Glossary-Specific Extra Content

These reference tables are folded into their respective accordion sections in GlossaryTab only:

- **Range & Charging** includes: CHARGING_STANDARDS + COMMON_NOTATIONS
- **Self-Driving** includes: SAE_LEVELS + SELF_DRIVING_TIERS

### Section Order Rationale

Follows the EV shopping funnel: price → what's under the hood → range/charging → physical size → driver assistance → infotainment → cargo → notes.

### Glossary-Only Fields

Some fields appear in GlossaryTab definitions but are NOT rendered as metrics in SideBySideTab or DetailPanel:

- **Model Year, Trim** — displayed in vehicle selector/header, not as comparison metrics
- **Destination ($)** — used in OTD calculation; shown in Glossary for reference only
- **Sources** — glossary-only context; not rendered in SideBySideTab or DetailPanel

### Field Additions

- **SAE Level** — currently only in GlossaryTab. Add to SideBySideTab and DetailPanel under Self-Driving.
- **L2 10–100%** — currently in SideBySideTab and DetailPanel but missing from GlossaryTab. Add glossary definition.

## Affected Components

### SideBySideTab (`SECTIONS` array)

Current section names: Key Stats, Performance, Drivetrain & Charging, Dimensions, Technology & Features, Cargo & Storage, Notes (7 sections → 8).

Update the `SECTIONS` config to match the new 8-section layout. Fields that are glossary-only (Model Year, Trim, Destination, Sources) are excluded.

### GlossaryTab (`GLOSSARY_SECTIONS` array)

Current section names: Key Stats, Performance, Drivetrain & Charging, Dimensions, Self-Driving & Tech, Cargo & Storage, Notes (7 sections → 8).

Update `GLOSSARY_SECTIONS` to the new layout. Move `extra: 'charging'` to Range & Charging section, `extra: 'self-driving'` to Self-Driving section. All fields (including glossary-only ones) appear here.

### DetailPanel (hardcoded `SpecSection` calls)

Current section names: Quick Stats (grid), Performance, Drivetrain & Charging, Dimensions, Technology & Features, Cargo & Storage, Notes (7 sections → 8).

The **detail-grid** (top 6 quick stats) is preserved as a cross-section summary — it currently shows MSRP, Pre-Owned Price, EPA Range, Horsepower, Battery, Seats. Keep it as-is since it serves a different purpose (at-a-glance highlights, not categorization). The `SpecSection` groups below the grid adopt the new 8-section layout.

### Not Affected

- **ComparisonV2Tab** — uses per-field filter buckets, not section grouping
- **OverviewTab** — uses preference categories and budget buckets, independent of section structure

## Field Migration Summary

All fields not listed below remain in their current section (renamed: Key Stats → Pricing, Technology & Features / Self-Driving & Tech → split into Self-Driving + Infotainment, Drivetrain & Charging → dissolved).

| Field | From | To |
|-------|------|----|
| Drivetrain | Key Stats | Powertrain & Performance |
| Horsepower (hp) | Key Stats | Powertrain & Performance |
| EPA/Est Range (mi) | Key Stats | Range & Charging |
| Battery (kWh) | Key Stats | Range & Charging |
| Seats | Key Stats | Dimensions |
| Charging Type | Drivetrain & Charging | Range & Charging |
| DC Fast Charge (kW) | Drivetrain & Charging | Range & Charging |
| DC Fast Charge 10–80% | Drivetrain & Charging | Range & Charging |
| Onboard AC (kW) | Drivetrain & Charging | Range & Charging |
| L2 10–80% (hrs.) | Drivetrain & Charging | Range & Charging |
| L2 10–100% | Drivetrain & Charging | Range & Charging |
| Car Software | Self-Driving & Tech | Infotainment |
| Center Display | Self-Driving & Tech | Infotainment |
| Gauge Cluster | Self-Driving & Tech | Infotainment |
| HUD | Self-Driving & Tech | Infotainment |
| Other Displays | Self-Driving & Tech | Infotainment |
| Audio | Self-Driving & Tech | Infotainment |
| Driver Profiles | Self-Driving & Tech | Infotainment |

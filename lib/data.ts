import rawData from './ev-data.json'

export interface CountRow {
  model: string
  y2021: number
  y2022: number
  y2023: number
  y2024: number
  y2025: number
  y2026: number
  y2027: number
  total: number
}

export interface CountTotals {
  y2021: number
  y2022: number
  y2023: number
  y2024: number
  y2025: number
  y2026: number
  y2027: number
  total: number
}

import type { RawDetailRow } from './ev-data.types'

/*
 * Row types are GENERATED from the data contract (scripts/schema/ev-data.schema.mjs
 * → lib/ev-data.types.ts), so TypeScript and the build-time validator can't drift.
 * Notes on the stored fields:
 *   - name: display label "Vehicle, Year, Trim"; NOT unique (seat variants share it), never a key
 *   - id: stable configuration id; the key for provenance, accepted.json and fixes
 *   - availability: whether the configuration is sold new today; only 'new' is eligible for new-car results
 *   - msrp / msrp_status: the price (or null) and what it means (current, historical, announced, unknown)
 *   - range_basis: epa (reviewed mapping only), manufacturer_estimate, or unverified; null without a range
 */
export type { RawDetailRow }
export type Availability = RawDetailRow['availability']
export type MsrpStatus = RawDetailRow['msrp_status']
export type RangeBasis = NonNullable<RawDetailRow['range_basis']>

export interface DetailRow extends RawDetailRow {
  /** Computed at load: (msrp + destination) * 1.06 + 905 for a current or announced price; 'TBD' passthrough; null otherwise */
  otd_new: number | string | null
  /** Computed at load from preowned_range; sentinel text passed through */
  otd_preowned: string
  /** Parsed from preowned_range at load; null when no used market */
  preowned_low: number | null
  preowned_high: number | null
  /** Computed at load: tier rank (1–4), one lower on older hardware with the same tier as current hardware; null when no tier */
  self_driving_rank: number | null
  /** Computed at load: true when self_driving_rank was lowered for older hardware */
  adas_downgraded: boolean
}

export interface PreownedRow {
  name: string
  vehicle: string
  year: number
  trim: string
  preowned_range: string
}

export interface GlossaryRow {
  field: string
  meaning: string
  notes: string
}

export interface AssumptionRow {
  assumption: string
  value: string
  notes: string
}

export interface USEVSales {
  note: string
  y2021: number
  y2022: number
  y2023: number
  y2024: number
  y2025: number
  y2026: number | null
}

export interface USEVSalesNotes {
  y2026?: string
}

export interface EVData {
  /** Data schema version; publishers refuse data versions their code doesn't accept (scripts/refresh/compat.json) */
  schema_version: 2
  /** ISO date (YYYY-MM-DD) of the last data refresh — drives sitemap lastModified */
  last_updated: string
  scope: string
  count_note: string
  count_data: CountRow[]
  count_totals: CountTotals
  us_ev_sales: USEVSales
  us_ev_sales_notes: USEVSalesNotes
  details: DetailRow[]
  /** Parallel pre-owned table, being retired (no page reads it) */
  preowned?: PreownedRow[]
  glossary: GlossaryRow[]
  assumptions: AssumptionRow[]
}

/* ── Derived pricing (computed at load; formula documented in CLAUDE.md) ── */

export const OTD_TAX_RATE = 1.06   // PA sales tax 6%
export const OTD_FIXED_FEES = 905  // doc $422 + title/reg $233 + EV road-use fee $250

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

/** Self-driving tiers, lowest to highest. The one place tiers are ranked. */
export const TIER_RANK: Record<string, number> = {
  'Basic L2': 1,
  'Advanced L2': 2,
  'L2+ Hands-Free': 3,
  'L2+ Point-to-Point': 4,
}

/**
 * Rank each row's self-driving tier. Older hardware ("previous", or "mixed"
 * where the buyer can't be sure) that offers the same tier as that vehicle's
 * current hardware ranks one lower: same feature, measurably worse on older
 * hardware (Tesla HW3 vs HW4). Where older hardware already has a lower tier
 * (Rivian Gen 1), the tier says so and no further step is taken.
 */
export function rankSelfDriving<T extends Pick<DetailRow, 'vehicle' | 'self_driving_tier' | 'adas_hardware_gen'>>(rows: T[]) {
  const currentTiers = new Map<string, Set<string>>()
  for (const r of rows) {
    if (r.adas_hardware_gen !== 'current' || !r.self_driving_tier) continue
    if (!currentTiers.has(r.vehicle)) currentTiers.set(r.vehicle, new Set())
    currentTiers.get(r.vehicle)!.add(r.self_driving_tier)
  }
  return rows.map((r) => {
    const base = r.self_driving_tier ? TIER_RANK[r.self_driving_tier] ?? null : null
    const older = r.adas_hardware_gen === 'previous' || r.adas_hardware_gen === 'mixed'
    const downgraded = base !== null && older && !!currentTiers.get(r.vehicle)?.has(r.self_driving_tier as string)
    return { self_driving_rank: base === null ? null : downgraded ? base - 1 : base, adas_downgraded: downgraded }
  })
}

function enrich(r: RawDetailRow): Omit<DetailRow, 'self_driving_rank' | 'adas_downgraded'> {
  const range = parsePriceRange(r.preowned_range)
  // New-car OTD only for a price you can pay new (current or announced), never a historical one
  const newPrice = r.msrp_status === 'current' || r.msrp_status === 'announced'
  const otd_new =
    typeof r.msrp === 'number' && typeof r.destination === 'number' && newPrice
      ? (r.msrp + r.destination) * OTD_TAX_RATE + OTD_FIXED_FEES
      : r.msrp === null && (r.availability === 'announced' || r.availability === 'needs_review')
        ? 'TBD'
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

/**
 * The one cast in the data layer. JSON imports widen enums to string, so the
 * import can't be type-checked directly; instead every build validates the file
 * against the same schema these types are generated from (prebuild:
 * scripts/validate-data.js), and CI fails if the generated types are stale.
 */
function loadEvData(): RawEVData {
  return rawData as unknown as RawEVData
}

const raw = loadEvData()

const enriched = raw.details.map(enrich)
const ranks = rankSelfDriving(enriched)

export const DATA: EVData = { ...raw, details: enriched.map((r, i) => ({ ...r, ...ranks[i] })) }

/** Vehicles announced but not yet available in the US market */
export const WATCHLIST_VEHICLES = [
  'Toyota Highlander EV',
  'Lexus TZ',
  'Subaru Getaway',
  'BMW iX7',
  'Genesis GV90',
  'Faraday Future FX Super One',
  'Mercedes-Benz GLB Electric',
] as const satisfies readonly string[]

/** Type-safe check for watchlist membership */
export function isWatchlistVehicle(vehicle: string): boolean {
  return (WATCHLIST_VEHICLES as readonly string[]).includes(vehicle)
}

/** Vehicles that have been discontinued or are exiting the US market */
export const GOODBYELIST_VEHICLES: { vehicle: string; summary: string; years?: string }[] = [
  {
    vehicle: 'Tesla Model X',
    years: '2015–2026',
    summary: 'Tesla ended Model X production and custom orders in April 2026, and the last new cars have sold. It closes the book on the original 3-row electric SUV; used prices stay in the comparison.',
  },
]

// Vehicle → CSS class map lives in vehicle-theme.ts (single source for
// badge classes and chart colors); re-exported here for existing imports.
export { VEHICLE_CLASSES } from './vehicle-theme'


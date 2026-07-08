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

export interface DetailRow {
  name: string
  vehicle: string
  year: number
  trim: string
  seats: number | null
  drivetrain: string
  msrp: number | string | null
  destination: number | null
  /** Computed at load — (msrp + destination) * 1.06 + 905; 'TBD' passthrough; null when N/A */
  otd_new: number | string | null
  preowned_range: string
  /** Computed at load from preowned_range; sentinel text passed through */
  otd_preowned: string
  /** Parsed from preowned_range at load; null when no used market */
  preowned_low: number | null
  preowned_high: number | null
  self_driving: string
  sae_level: 2 | 3 | 4 | 5 | null
  self_driving_tier: 'Basic L2' | 'Advanced L2' | 'L2+ Hands-Free' | 'L2+ Point-to-Point' | null
  range_mi: number | string | null
  hp: number | string | null
  battery_kwh: number | string | null
  onboard_ac_kw: number | string | null
  l2_10_100: number | string | null
  l2_10_80: number | string | null
  charging_type: string
  car_software: string
  center_display: string
  gauge_cluster: string
  hud: string
  other_displays: string
  audio: string
  driver_profiles: string
  notes: string
  frunk_cu_ft: number | null
  cargo_behind_3rd_cu_ft: number | string | null
  cargo_behind_2nd_cu_ft: number | null
  cargo_behind_1st_cu_ft: number | null
  fold_flat: string | null
  cargo_floor_width_in: number | string | null
  // Tier 1 + select Tier 2 fields (added March 2026 audit)
  towing_lbs: number | string | null
  dc_fast_charge_kw: number | string | null
  dc_fast_charge_10_80_min: number | string | null
  curb_weight_lbs: number | string | null
  length_in: number | string | null
  width_in: number | string | null
  height_in: number | string | null
  third_row_legroom_in: number | string | null
  third_row_headroom_in: number | string | null
  torque_lb_ft: number | string | null
  zero_to_60_sec: number | string | null
  ground_clearance_in: number | string | null
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
  /** ISO date (YYYY-MM-DD) of the last data refresh — drives sitemap lastModified */
  last_updated: string
  scope: string
  count_note: string
  count_data: CountRow[]
  count_totals: CountTotals
  us_ev_sales: USEVSales
  us_ev_sales_notes: USEVSalesNotes
  details: DetailRow[]
  preowned: PreownedRow[]
  glossary: GlossaryRow[]
  assumptions: AssumptionRow[]
}

/* ── Derived pricing (computed at load; formula documented in CLAUDE.md) ── */

export const OTD_TAX_RATE = 1.06   // PA sales tax 6%
export const OTD_FIXED_FEES = 905  // doc $422 + title/reg $233 + EV road-use fee $250

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
      : typeof r.msrp === 'string' && r.msrp.toUpperCase().includes('TBD')
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

const raw = rawData as unknown as RawEVData

export const DATA: EVData = { ...raw, details: raw.details.map(enrich) }

/** Vehicles announced but not yet available in the US market */
export const WATCHLIST_VEHICLES = [
  'Toyota Highlander EV',
  'Lexus TZ',
  'Subaru Getaway',
  'BMW iX7',
  'Genesis GV90',
  'Faraday Future FX Super One',
] as const satisfies readonly string[]

/** Type-safe check for watchlist membership */
export function isWatchlistVehicle(vehicle: string): boolean {
  return (WATCHLIST_VEHICLES as readonly string[]).includes(vehicle)
}

/** Vehicles that have been discontinued or are exiting the US market */
export const GOODBYELIST_VEHICLES: { vehicle: string; summary: string }[] = [
  {
    vehicle: 'Tesla Model X',
    summary: 'Discontinued Q2 2026. Tesla announced the end of Model X production, closing the book on the original 3-row electric SUV.',
  },
]

// Vehicle → CSS class map lives in vehicle-theme.ts (single source for
// badge classes and chart colors); re-exported here for existing imports.
export { VEHICLE_CLASSES } from './vehicle-theme'


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
  otd_new: number | string | null
  preowned_range: string
  otd_preowned: string
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
  otd_preowned: string
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

export const DATA = rawData as EVData

/** Vehicles announced but not yet available in the US market */
export const WATCHLIST_VEHICLES = [
  'Toyota Highlander EV',
  'Subaru Getaway',
  'BMW iX7',
  'Genesis GV90',
  'Tesla Model Y Long (Asia)',
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

export const VEHICLE_CLASSES: Record<string, string> = {
  'Kia EV9': 'v-kia',
  'Hyundai IONIQ 9': 'v-hyundai',
  'Lucid Gravity': 'v-lucid',
  'Rivian R1S': 'v-rivian',
  'Tesla Model X': 'v-tesla',
  'Tesla Model Y Long (Asia)': 'v-tesla',
  'Tesla Model Y (3-Row)': 'v-tesla',
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
}


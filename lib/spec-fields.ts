/**
 * Centralized spec-field registry.
 *
 * Every rendering surface (vehicle page, compare page, DetailPanel,
 * SideBySideTab, VehicleSummaryPanel) imports from here so that adding
 * a new field is a single-file edit.
 */

import type { DetailRow } from './data'
import { fmtMoney, fmtNum } from './utils'

/* ── Types ─────────────────────────────────────────────────────────── */

export interface FieldDef {
  /** Display label shown in all tables / panels */
  label: string
  /** Return a formatted string for the given row */
  render: (r: DetailRow) => string
  /** Return a numeric value for comparison highlighting (optional) */
  rawNum?: (r: DetailRow) => number | null
  /** When two values are compared, is higher better? (optional) */
  higherIsBetter?: boolean
}

export interface SpecSection {
  title: string
  fields: FieldDef[]
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function nv(v: number | string | null | undefined): number | null {
  return typeof v === 'number' ? v : null
}

function cargoStr(v: number | string | null | undefined, unit: string): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return `${v} ${unit}`
  return String(v)
}

export const TIER_RANK: Record<string, number> = {
  'Basic L2': 1,
  'Advanced L2': 2,
  'L2+ Hands-Free': 3,
  'L2+ Point-to-Point': 4,
}

/* ── Sections ──────────────────────────────────────────────────────── */

export const SPEC_SECTIONS: SpecSection[] = [
  {
    title: 'Pricing',
    fields: [
      { label: 'MSRP', render: r => fmtMoney(r.msrp).text, rawNum: r => nv(r.msrp), higherIsBetter: false },
      { label: 'Pre-Owned Price', render: r => r.preowned_range || '—' },
      { label: 'Destination', render: r => typeof r.destination === 'number' ? `$${r.destination.toLocaleString()}` : '—' },
      { label: 'OTD (New)', render: r => fmtMoney(r.otd_new).text, rawNum: r => nv(r.otd_new), higherIsBetter: false },
      { label: 'OTD (Pre-Owned)', render: r => r.otd_preowned || '—' },
    ],
  },
  {
    title: 'Powertrain & Performance',
    fields: [
      { label: 'Drivetrain', render: r => r.drivetrain || '—' },
      {
        label: 'Horsepower',
        render: r => { const f = fmtNum(r.hp); return f.text + (typeof r.hp === 'number' ? ' hp' : '') },
        rawNum: r => nv(r.hp), higherIsBetter: true,
      },
      { label: 'Torque', render: r => typeof r.torque_lb_ft === 'number' ? `${r.torque_lb_ft.toLocaleString()} lb-ft` : (r.torque_lb_ft || '—'), rawNum: r => nv(r.torque_lb_ft), higherIsBetter: true },
      { label: '0–60 mph', render: r => typeof r.zero_to_60_sec === 'number' ? `${r.zero_to_60_sec} sec` : (r.zero_to_60_sec || '—'), rawNum: r => nv(r.zero_to_60_sec), higherIsBetter: false },
      { label: 'Curb Weight', render: r => typeof r.curb_weight_lbs === 'number' ? `${r.curb_weight_lbs.toLocaleString()} lbs` : (r.curb_weight_lbs || '—') },
      { label: 'Towing Capacity', render: r => typeof r.towing_lbs === 'number' ? `${r.towing_lbs.toLocaleString()} lbs` : (r.towing_lbs || '—'), rawNum: r => nv(r.towing_lbs), higherIsBetter: true },
    ],
  },
  {
    title: 'Range & Charging',
    fields: [
      {
        label: 'EPA Range',
        render: r => { const f = fmtNum(r.range_mi); return f.text + (typeof r.range_mi === 'number' ? ' mi' : '') },
        rawNum: r => nv(r.range_mi), higherIsBetter: true,
      },
      {
        label: 'Battery',
        render: r => { const f = fmtNum(r.battery_kwh); return f.text + (typeof r.battery_kwh === 'number' ? ' kWh' : '') },
        rawNum: r => nv(r.battery_kwh), higherIsBetter: true,
      },
      { label: 'Charging Type', render: r => r.charging_type || '—' },
      { label: 'DC Fast Charge', render: r => typeof r.dc_fast_charge_kw === 'number' ? `${r.dc_fast_charge_kw} kW` : (r.dc_fast_charge_kw || '—'), rawNum: r => nv(r.dc_fast_charge_kw), higherIsBetter: true },
      { label: 'DC 10–80%', render: r => typeof r.dc_fast_charge_10_80_min === 'number' ? `${r.dc_fast_charge_10_80_min} min` : (r.dc_fast_charge_10_80_min || '—'), rawNum: r => nv(r.dc_fast_charge_10_80_min), higherIsBetter: false },
      { label: 'Onboard AC', render: r => r.onboard_ac_kw ? `${r.onboard_ac_kw} kW` : '—', rawNum: r => nv(r.onboard_ac_kw), higherIsBetter: true },
      { label: 'L2 10–80%', render: r => r.l2_10_80 ? `${r.l2_10_80} hrs` : '—', rawNum: r => nv(r.l2_10_80), higherIsBetter: false },
      { label: 'L2 10–100%', render: r => r.l2_10_100 ? `${r.l2_10_100} hrs` : '—', rawNum: r => nv(r.l2_10_100), higherIsBetter: false },
    ],
  },
  {
    title: 'Dimensions',
    fields: [
      { label: 'Seats', render: r => r.seats != null ? String(r.seats) : '—' },
      { label: 'Length', render: r => typeof r.length_in === 'number' ? `${r.length_in} in` : (r.length_in || '—') },
      { label: 'Width', render: r => typeof r.width_in === 'number' ? `${r.width_in} in` : (r.width_in || '—') },
      { label: 'Height', render: r => typeof r.height_in === 'number' ? `${r.height_in} in` : (r.height_in || '—') },
      { label: 'Ground Clearance', render: r => typeof r.ground_clearance_in === 'number' ? `${r.ground_clearance_in} in` : (r.ground_clearance_in || '—') },
      { label: '3rd Row Legroom', render: r => typeof r.third_row_legroom_in === 'number' ? `${r.third_row_legroom_in} in` : (r.third_row_legroom_in || '—'), rawNum: r => nv(r.third_row_legroom_in), higherIsBetter: true },
      { label: '3rd Row Headroom', render: r => typeof r.third_row_headroom_in === 'number' ? `${r.third_row_headroom_in} in` : (r.third_row_headroom_in || '—'), rawNum: r => nv(r.third_row_headroom_in), higherIsBetter: true },
    ],
  },
  {
    title: 'Self-Driving',
    fields: [
      {
        label: 'Self Driving Tier',
        render: r => r.self_driving_tier || '—',
        rawNum: r => r.self_driving_tier ? (TIER_RANK[r.self_driving_tier] ?? null) : null,
        higherIsBetter: true,
      },
      { label: 'SAE Level', render: r => r.sae_level != null ? String(r.sae_level) : '—' },
      { label: 'Self Driving System', render: r => r.self_driving || '—' },
    ],
  },
  {
    title: 'Infotainment',
    fields: [
      { label: 'Car Software', render: r => r.car_software || '—' },
      { label: 'Center Display', render: r => r.center_display || '—' },
      { label: 'Gauge Cluster', render: r => r.gauge_cluster || '—' },
      { label: 'HUD', render: r => r.hud || '—' },
      { label: 'Other Displays', render: r => r.other_displays || '—' },
      { label: 'Audio', render: r => r.audio || '—' },
      { label: 'Driver Profiles', render: r => r.driver_profiles || '—' },
    ],
  },
  {
    title: 'Cargo & Storage',
    fields: [
      { label: 'Frunk', render: r => cargoStr(r.frunk_cu_ft, 'cu ft'), rawNum: r => r.frunk_cu_ft, higherIsBetter: true },
      { label: 'Behind 3rd Row', render: r => cargoStr(r.cargo_behind_3rd_cu_ft, 'cu ft'), rawNum: r => nv(r.cargo_behind_3rd_cu_ft), higherIsBetter: true },
      { label: 'Behind 2nd Row', render: r => cargoStr(r.cargo_behind_2nd_cu_ft, 'cu ft'), rawNum: r => r.cargo_behind_2nd_cu_ft, higherIsBetter: true },
      { label: 'Behind 1st Row', render: r => cargoStr(r.cargo_behind_1st_cu_ft, 'cu ft'), rawNum: r => nv(r.cargo_behind_1st_cu_ft), higherIsBetter: true },
      { label: 'Fold Flat', render: r => r.fold_flat || '—' },
      { label: 'Floor Width (Wheel Wells)', render: r => cargoStr(r.cargo_floor_width_in, 'in'), rawNum: r => nv(r.cargo_floor_width_in), higherIsBetter: true },
    ],
  },
]

/* ── Convenience helpers ───────────────────────────────────────────── */

/** Get a flat array of all field labels (useful for auditing) */
export function allFieldLabels(): string[] {
  return SPEC_SECTIONS.flatMap(s => s.fields.map(f => f.label))
}

/**
 * Filter sections to only include specific ones by title.
 * Useful when a surface wants to exclude e.g. Pricing from the main table
 * because it's already shown in a hero/stat grid.
 */
export function filterSections(include?: string[], exclude?: string[]): SpecSection[] {
  let sections = SPEC_SECTIONS
  if (include) sections = sections.filter(s => include.includes(s.title))
  if (exclude) sections = sections.filter(s => !exclude.includes(s.title))
  return sections
}

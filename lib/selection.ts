/**
 * Which configurations a shopper can be shown. Pure functions over rows
 * passed in (no DATA import), shared by Speed Dating and Spec Select.
 *
 * Condition (new or pre-owned) and budget are independent filters: choosing
 * "Any price" never lets a used-only configuration into the new-car results.
 */
import type { DetailRow } from './data'

export type Condition = 'new' | 'preowned'

/** Price buckets per condition. The id is what appears in the URL. */
export const NEW_BUDGET_BUCKETS = [
  { id: 'under60', label: 'Under $60k', filter: (v: number) => v < 60000 },
  { id: '60to90', label: '$60k–$90k', filter: (v: number) => v >= 60000 && v <= 90000 },
  { id: '90plus', label: '$90k+', filter: (v: number) => v > 90000 },
  { id: 'all', label: 'Any price', filter: () => true },
] as const

export const PREOWNED_BUDGET_BUCKETS = [
  { id: 'under40', label: 'Under $40k', filter: (v: number) => v < 40000 },
  { id: 'under60', label: 'Under $60k', filter: (v: number) => v < 60000 },
  { id: '60plus', label: '$60k+', filter: (v: number) => v >= 60000 },
  { id: 'all', label: 'Any price', filter: () => true },
] as const

export const budgetBuckets = (condition: Condition) => (condition === 'preowned' ? PREOWNED_BUDGET_BUCKETS : NEW_BUDGET_BUCKETS)

/** Speed Dating is a three-row shopping tool: only configurations known to seat six or more. */
export const MIN_SPEED_DATING_SEATS = 6

/** A usable pre-owned price range (not "No used market yet" and the like). */
export function hasPreowned(r: Pick<DetailRow, 'preowned_range'>): boolean {
  const p = r.preowned_range || ''
  return p.length > 0 && p.indexOf('N/A') < 0 && p.indexOf('No ') < 0
}

/**
 * Sold new today: the configuration's availability is "new" (schema_version 2).
 * Rows still marked needs_review are not eligible until resolved; a numeric
 * MSRP alone is never proof (it may be historical or announced).
 */
export function isSoldNew(r: Pick<DetailRow, 'availability'>, _dataYear?: number): boolean {
  return r.availability === 'new'
}

/** The price the budget applies to: lowest pre-owned price, or MSRP when new. */
export function budgetPrice(r: Pick<DetailRow, 'msrp' | 'preowned_low'>, condition: Condition): number | null {
  const v = condition === 'preowned' ? r.preowned_low : r.msrp
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export interface EligibilityOptions {
  condition: Condition
  budget: string
  /** Only six-seat configurations (the "6-Seat Options" pick) */
  sixSeat: boolean
  /** Year of the data's last update; see isSoldNew */
  dataYear: number
  /** Vehicles to leave out entirely (announced, not yet on sale) */
  exclude?: (vehicle: string) => boolean
  /** Minimum known seat count; rows with unknown seats are left out when set */
  minSeats?: number
}

export function eligibleRows<T extends DetailRow>(rows: T[], o: EligibilityOptions): T[] {
  const bucket = budgetBuckets(o.condition).find((b) => b.id === o.budget)
  return rows.filter((r) => {
    if (o.exclude?.(r.vehicle)) return false
    if (o.minSeats !== undefined && !(typeof r.seats === 'number' && r.seats >= o.minSeats)) return false
    if (o.sixSeat && r.seats !== 6) return false
    if (o.condition === 'new' ? !isSoldNew(r, o.dataYear) : !hasPreowned(r)) return false
    if (!bucket || bucket.id === 'all') return true
    const price = budgetPrice(r, o.condition)
    return price !== null && bucket.filter(price)
  })
}

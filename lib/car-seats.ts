import { DATA, isWatchlistVehicle } from './data'

/* ── Data types (stored in ev-data.json → car_seat_fit) ── */

/**
 * One rear seating position, listed left (driver side) to right.
 *  'LT' = lower anchors (LATCH) + top tether
 *  'T'  = top tether only (harnessed seats install with the seat belt)
 *  'L'  = lower anchors only
 *  '-'  = seat belt only, no anchors
 */
export type PositionCode = 'LT' | 'T' | 'L' | '-'
export type FitRating = 'yes' | 'tight' | 'no'

export interface CarSeatRow {
  row: 2 | 3
  positions: PositionCode[]
  /** Can a rear-facing seat go in this row? 'tight' = possible but legroom-limited / untested */
  rear_facing: FitRating
  /** Three car seats side by side (3-position rows only); null = untested */
  three_across: FitRating | null
  note: string
}

export interface CarSeatLayout {
  vehicle: string
  seats: number
  layout: string
  rows: CarSeatRow[]
  third_row_access: {
    type: 'pass-through' | 'tilt-slide'
    /**
     * Ways into the 3rd row. Each path lists the 2nd-row position indexes that
     * must be free of an installed harnessed seat. [[]] = always open.
     */
    paths: number[][]
    note: string
  }
  confidence: 'verified' | 'partial' | 'unverified'
  notes: string
  sources: { label: string; url: string }[]
}

/* ── Seat types the planner understands ── */

export type SeatType = 'rf' | 'ff' | 'hb' | 'bb'

export const SEAT_TYPES: { id: SeatType; label: string; short: string; desc: string }[] = [
  { id: 'rf', label: 'Rear-facing', short: 'RF', desc: 'Infant seat or convertible installed rear-facing' },
  { id: 'ff', label: 'Forward-facing', short: 'FF', desc: 'Harnessed seat installed forward-facing (needs a top tether)' },
  { id: 'hb', label: 'High-back booster', short: 'HB', desc: 'Booster with back, uses the vehicle seat belt' },
  { id: 'bb', label: 'Backless booster', short: 'BB', desc: 'Booster cushion, uses the vehicle seat belt' },
]

export const SEAT_TYPE_IDS = SEAT_TYPES.map(s => s.id)
export const isHarnessed = (t: SeatType) => t === 'rf' || t === 'ff'

/* ── Planner ── */

export type Occupant = { kind: 'kid'; seat: SeatType; kid: number } | { kind: 'adult' }

export interface PlanOptions {
  /** Riders besides the driver and the kids (the first sits up front) */
  otherRiders: number
  /** Only allow harnessed seats in positions with lower anchors */
  latchOnly: boolean
}

export interface PlanResult {
  status: 'fits' | 'tight' | 'no'
  /** occupants[rowIdx][posIdx] for the rear rows; null = empty */
  occupants: (Occupant | null)[][]
  frontPassenger: boolean
  caveats: string[]
  /** Neutral install notes (don't affect the fit status) */
  notes: string[]
  reason: string
}

interface Slot { r: number; p: number; row: CarSeatRow; code: PositionCode }

function slotCost(o: Occupant, s: Slot, latchOnly: boolean): number | null {
  if (o.kind === 'adult') return 0
  const { seat } = o
  if (isHarnessed(seat)) {
    if (latchOnly && !s.code.includes('L')) return null
    if (seat === 'rf' && s.row.rear_facing === 'no') return null
    if (seat === 'ff' && !s.code.includes('T')) return null
    let c = s.row.row === 3 ? 2 : 0
    if (seat === 'rf' && s.row.rear_facing === 'tight') c += 3
    if (!s.code.includes('L')) c += 1
    return c
  }
  return s.row.row === 3 ? 0.5 : 0
}

/** Row- and access-level caveats for a complete placement. */
function evaluate(layout: CarSeatLayout, grid: (Occupant | null)[][]) {
  const caveats: string[] = []
  let cost = 0
  grid.forEach((cells, r) => {
    const row = layout.rows[r]
    const carSeats = cells.filter(o => o?.kind === 'kid').length
    if (row.positions.length >= 3 && carSeats >= 3) {
      if (row.three_across === 'no') { cost = Infinity; return }
      if (row.three_across === 'tight') {
        caveats.push(`Three car seats across row ${row.row} is a squeeze — expect to need narrow seats.`)
        cost += 4
      } else if (row.three_across === null) {
        caveats.push(`Three car seats across row ${row.row} hasn't been tested — measure your seats.`)
        cost += 4
      }
    }
    cells.forEach(o => {
      if (o?.kind === 'kid' && o.seat === 'rf' && row.rear_facing === 'tight') {
        caveats.push(`Rear-facing in row ${row.row} is tight — check legroom with your seat.`)
      }
    })
  })

  const row2Idx = layout.rows.findIndex(r => r.row === 2)
  const row3Idx = layout.rows.findIndex(r => r.row === 3)
  if (row2Idx >= 0 && row3Idx >= 0 && grid[row3Idx].some(Boolean)) {
    const blocked = (p: number) => {
      const o = grid[row2Idx][p]
      return o?.kind === 'kid' && isHarnessed(o.seat)
    }
    const open = layout.third_row_access.paths.some(path => path.every(p => !blocked(p)))
    if (!open) {
      caveats.push('Installed 2nd-row seats block the way into the 3rd row — riders there must climb over or a seat has to come out.')
      cost += 5
    }
  }
  return { caveats: [...new Set(caveats)], cost }
}

export function planLayout(layout: CarSeatLayout, kids: SeatType[], opts: PlanOptions): PlanResult {
  const slots: Slot[] = layout.rows.flatMap((row, r) =>
    row.positions.map((code, p) => ({ r, p, row, code })))
  const frontPassenger = opts.otherRiders > 0
  const rearAdults = Math.max(0, opts.otherRiders - 1)

  // Most constrained first so the search prunes early
  const order: SeatType[] = ['rf', 'ff', 'hb', 'bb']
  const occupants: Occupant[] = [
    ...kids.map((seat, kid) => ({ kind: 'kid' as const, seat, kid }))
      .sort((a, b) => order.indexOf(a.seat) - order.indexOf(b.seat)),
    ...Array.from({ length: rearAdults }, () => ({ kind: 'adult' as const })),
  ]
  const emptyGrid = () => layout.rows.map(row => row.positions.map(() => null as Occupant | null))

  const fail = (reason: string): PlanResult =>
    ({ status: 'no', occupants: emptyGrid(), frontPassenger, caveats: [], notes: [], reason })

  if (occupants.length > slots.length) {
    return fail(`Only ${slots.length} rear seats for ${occupants.length} riders.`)
  }

  let best: { grid: (Occupant | null)[][]; cost: number; caveats: string[] } | null = null
  const grid = emptyGrid()
  const used = new Array(slots.length).fill(false)

  function dfs(i: number, cost: number) {
    if (best && cost >= best.cost) return
    if (i === occupants.length) {
      const ev = evaluate(layout, grid)
      const total = cost + ev.cost
      if (total !== Infinity && (!best || total < best.cost)) {
        best = { grid: grid.map(r => [...r]), cost: total, caveats: ev.caveats }
      }
      return
    }
    const o = occupants[i]
    let lastAdultSlot = -1
    if (o.kind === 'adult' && i > 0 && occupants[i - 1].kind === 'adult') {
      // Adults are interchangeable — only try slots after the previous adult
      lastAdultSlot = slots.findIndex(s => grid[s.r][s.p] === occupants[i - 1])
    }
    slots.forEach((s, si) => {
      if (used[si] || si <= lastAdultSlot) return
      const c = slotCost(o, s, opts.latchOnly)
      if (c === null) return
      used[si] = true
      grid[s.r][s.p] = o
      dfs(i + 1, cost + c)
      grid[s.r][s.p] = null
      used[si] = false
    })
  }
  dfs(0, 0)

  if (!best) return fail(explainFailure(layout, kids, opts))
  const b = best as { grid: (Occupant | null)[][]; cost: number; caveats: string[] }
  const notes: string[] = []
  b.grid.forEach((cells, r) => cells.forEach((o, p) => {
    if (o?.kind === 'kid' && isHarnessed(o.seat) && !layout.rows[r].positions[p].includes('L')) {
      notes.push(`Kid ${o.kid + 1} installs with the seat belt — no lower anchors at that seat.`)
    }
  }))
  notes.sort()
  return {
    status: b.caveats.length ? 'tight' : 'fits',
    occupants: b.grid,
    frontPassenger,
    caveats: b.caveats,
    notes,
    reason: '',
  }
}

function explainFailure(layout: CarSeatLayout, kids: SeatType[], opts: PlanOptions): string {
  const slots = layout.rows.flatMap(row => row.positions.map(code => ({ row, code })))
  const rf = kids.filter(k => k === 'rf').length
  const harnessed = kids.filter(isHarnessed).length
  const rfOk = slots.filter(s => s.row.rear_facing !== 'no' && (!opts.latchOnly || s.code.includes('L'))).length
  if (rf > rfOk) return `Only ${rfOk} seat${rfOk === 1 ? '' : 's'} can take a rear-facing car seat.`
  const ffOk = slots.filter(s => s.code.includes('T') && (!opts.latchOnly || s.code.includes('L'))).length
  if (harnessed > Math.max(rfOk, ffOk)) {
    return opts.latchOnly
      ? `Only ${ffOk} seats have lower anchors (LATCH) for harnessed seats.`
      : `Only ${ffOk} seats have the top tether a forward-facing harness needs.`
  }
  return 'Not enough room for this many car seats side by side.'
}

/* ── Data helpers ── */

export function getCarSeatLayouts(): CarSeatLayout[] {
  return DATA.car_seat_fit.filter(l => !isWatchlistVehicle(l.vehicle))
}

/** Lowest MSRP among the newest model year's trims for this vehicle + seat count. */
export function layoutPrice(layout: CarSeatLayout): { msrp: number; year: number } | null {
  const rows = DATA.details.filter(d => d.vehicle === layout.vehicle && d.seats === layout.seats && typeof d.msrp === 'number')
  if (!rows.length) return null
  const year = Math.max(...rows.map(r => r.year))
  const msrp = Math.min(...rows.filter(r => r.year === year).map(r => r.msrp as number))
  return { msrp, year }
}

export function countAnchors(row: CarSeatRow) {
  return {
    latch: row.positions.filter(p => p.includes('L')).length,
    tether: row.positions.filter(p => p.includes('T')).length,
  }
}

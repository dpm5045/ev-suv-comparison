/**
 * Editorial metadata for the Watch List page.
 *
 * Specs and prices are NOT stored here — they are derived from
 * `lib/ev-data.json` at render time. This file only holds what the dataset
 * has no field for: arrival windows, announcement status, short blurbs, and
 * the "what's new" copy for model-year announcements. Update it alongside
 * data refreshes (see /scan-watchlist and /refresh).
 */

/** Columns of the arrivals timeline, in order. */
export const ARRIVAL_WINDOWS = ['Late 2026', 'Early 2027', 'Mid 2027', 'Late 2027 +'] as const

/**
 * priced    — official US pricing published
 * revealed  — officially revealed, US pricing not yet published
 * reported  — press reports only, nothing official
 * uncertain — announced, but the program or US launch is in doubt
 */
export type WatchStatus = 'priced' | 'revealed' | 'reported' | 'uncertain'

export const WATCH_STATUS_LABEL: Record<WatchStatus, string> = {
  priced: 'Priced',
  revealed: 'Revealed',
  reported: 'Reported',
  uncertain: 'Uncertain',
}

export interface WatchMeta {
  make: string
  model: string
  status: WatchStatus
  /** [first column index, number of columns] in ARRIVAL_WINDOWS; null = no firm window */
  window: [number, number] | null
  windowLabel: string
  blurb: string
  /** Shown in place of a price when the dataset has no MSRP */
  priceNote?: string
}

/** Keyed by vehicle name as used in ev-data.json / WATCHLIST_VEHICLES. */
export const WATCHLIST_META: Record<string, WatchMeta> = {
  'Lexus TZ': {
    make: 'Lexus',
    model: 'TZ',
    status: 'priced',
    window: [0, 2],
    windowLabel: 'Premium first, then Touring and Luxury',
    blurb: 'Lexus’s first three-row EV. Three grades, all-wheel drive standard, built in Kentucky.',
  },
  'Toyota Highlander EV': {
    make: 'Toyota',
    model: 'Highlander EV',
    status: 'revealed',
    window: [0, 2],
    windowLabel: 'On sale late 2026 into early 2027',
    blurb: 'The Highlander goes fully electric. XLE and Limited, two battery sizes, NACS port.',
  },
  'Subaru Getaway': {
    make: 'Subaru',
    model: 'Getaway',
    status: 'revealed',
    window: [0, 2],
    windowLabel: 'Long range first, standard range after',
    blurb: 'Subaru’s biggest EV yet, sharing its platform and Kentucky plant with the Highlander EV.',
  },
  'Genesis GV90': {
    make: 'Genesis',
    model: 'GV90',
    status: 'revealed',
    window: [1, 3],
    windowLabel: 'US arrival during 2027, date not set',
    blurb: 'The flagship, with the largest battery in the Hyundai group and coach doors on the Neolun.',
  },
  'BMW iX7': {
    make: 'BMW',
    model: 'iX7',
    status: 'reported',
    window: [3, 1],
    windowLabel: 'Built from Aug 2027',
    blurb: 'BMW’s first full-size three-row EV, planned for Spartanburg. Nothing here is official yet.',
    priceNote: 'Press estimate ~$100,000',
  },
  'Mercedes-Benz GLB Electric': {
    make: 'Mercedes-Benz',
    model: 'GLB Electric',
    status: 'revealed',
    window: [0, 1],
    windowLabel: 'On sale fall 2026',
    blurb: 'The compact GLB goes electric. Seven seats are an option, and the third row is for occasional use.',
  },
  'Faraday Future FX Super One': {
    make: 'Faraday Future',
    model: 'FX Super One',
    status: 'uncertain',
    window: null,
    windowLabel: 'Program re-planned around an 800V build · no firm US date',
    blurb: 'A three-row electric van. The original program was paused and deliveries now depend on financing.',
  },
}

export interface ModelYearNews {
  vehicle: string
  year: number
  tag: string
  headline: string
  bullets: string[]
}

/** Model-year announcements for vehicles already on sale. Trim prices come from ev-data.json. */
export const MODEL_YEAR_NEWS: ModelYearNews[] = [
  {
    vehicle: 'Kia EV9',
    year: 2027,
    tag: 'Announced Oct 27',
    headline: 'Nightfall styling goes standard, and the Land gets a big torque bump.',
    bullets: ['Land torque rises to 516 lb-ft', 'Base price up just $90', 'Wolf Gray paint added'],
  },
  {
    vehicle: 'Rivian R1S',
    year: 2027,
    tag: 'New trim names',
    headline: 'Captain’s chairs arrive, and the lineup is now Premium, Performance and Quad.',
    bullets: ['Six-seat layout with a center pass-through', 'Quad makes 1,025 hp', 'Up to 410 miles with Long Range'],
  },
  {
    vehicle: 'Lucid Gravity',
    year: 2027,
    tag: 'New top trim',
    headline: 'A 1,070 hp GT-S joins, while Touring and Grand Touring hold their prices.',
    bullets: ['GT-S range projected at 373 miles, EPA pending', 'Grand Touring keeps its 450-mile rating', 'More features standard across the line'],
  },
]

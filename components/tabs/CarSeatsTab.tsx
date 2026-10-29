'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import VehicleBadge from '../VehicleBadge'
import { toSlug } from '@/lib/slugs'
import {
  SEAT_TYPES, SEAT_TYPE_IDS, countAnchors, getCarSeatLayouts, layoutPrice, planLayout,
  type CarSeatLayout, type Occupant, type PlanResult, type SeatType, type FitRating,
} from '@/lib/car-seats'

const DEFAULT_KIDS: SeatType[] = ['rf', 'ff', 'hb']
const MAX_KIDS = 7

const PRESETS: { label: string; kids: SeatType[] }[] = [
  { label: 'Baby + toddler + booster', kids: ['rf', 'ff', 'hb'] },
  { label: '3 in harnesses', kids: ['rf', 'ff', 'ff'] },
  { label: '2 babies + 2 boosters', kids: ['rf', 'rf', 'hb', 'hb'] },
  { label: '4 kids, mixed', kids: ['rf', 'ff', 'hb', 'bb'] },
]

const STATUS_META: Record<PlanResult['status'], { label: string; cls: string }> = {
  fits: { label: 'Fits', cls: 'cs-status-fits' },
  tight: { label: 'Fits with caveats', cls: 'cs-status-tight' },
  no: { label: "Doesn't fit", cls: 'cs-status-no' },
}

const CONFIDENCE_META: Record<CarSeatLayout['confidence'], { label: string; title: string }> = {
  verified: { label: 'Tested', title: 'Based on an independent hands-on car seat test of this layout' },
  partial: { label: 'Partly tested', title: 'Some rows tested; others inferred from a similar layout' },
  unverified: { label: 'Unverified', title: 'No independent test yet — based on owner reports and federal minimums' },
}

const STATUS_ORDER = { fits: 0, tight: 1, no: 2 } as const
const CONF_ORDER = { verified: 0, partial: 1, unverified: 2 } as const

function parseKids(raw: string | null): SeatType[] {
  if (raw === null) return DEFAULT_KIDS
  return raw.split(',').filter((k): k is SeatType => (SEAT_TYPE_IDS as string[]).includes(k)).slice(0, MAX_KIDS)
}

const seatShort = (t: SeatType) => SEAT_TYPES.find(s => s.id === t)!.short
const seatLabel = (t: SeatType) => SEAT_TYPES.find(s => s.id === t)!.label

function ratingText(r: FitRating | null) {
  if (r === null) return 'Untested'
  return { yes: 'Yes', tight: 'Tight', no: 'No' }[r]
}

/* ── Seat map ── */

function SeatBox({ code, occ, label }: { code?: string; occ: Occupant | null | 'driver' | 'adult-front' | 'empty-front'; label?: string }) {
  let content: React.ReactNode = <span className="cs-seat-empty">—</span>
  let cls = 'cs-seat'
  if (occ === 'driver') { content = 'Driver'; cls += ' cs-seat-adult' }
  else if (occ === 'adult-front') { content = 'Adult'; cls += ' cs-seat-adult' }
  else if (occ === 'empty-front') { cls += ' cs-seat-front-empty' }
  else if (occ?.kind === 'adult') { content = 'Adult'; cls += ' cs-seat-adult' }
  else if (occ?.kind === 'kid') {
    content = <><strong>Kid {occ.kid + 1}</strong><span>{seatShort(occ.seat)}</span></>
    cls += ` cs-seat-kid cs-seat-${occ.seat}`
  }
  return (
    <div className={cls} title={label}>
      <div className="cs-seat-body">{content}</div>
      {code && (
        <div className="cs-seat-anchors" aria-label={label}>
          {code.includes('L') && <span className="cs-anchor cs-anchor-l" title="Lower anchors (LATCH)">L</span>}
          {code.includes('T') && <span className="cs-anchor cs-anchor-t" title="Top tether">T</span>}
          {code === '-' && <span className="cs-anchor" title="Seat belt only">belt</span>}
        </div>
      )}
    </div>
  )
}

function anchorLabel(code: string) {
  if (code === 'LT') return 'Lower anchors + top tether'
  if (code === 'T') return 'Top tether only (seat-belt install)'
  if (code === 'L') return 'Lower anchors only'
  return 'Seat belt only'
}

function SeatMap({ layout, plan }: { layout: CarSeatLayout; plan: PlanResult }) {
  return (
    <div className="cs-map" aria-label="Seat map, front of vehicle at top">
      <div className="cs-map-row">
        <span className="cs-map-label">1</span>
        <div className="cs-map-seats">
          <SeatBox occ="driver" />
          <SeatBox occ={plan.frontPassenger ? 'adult-front' : 'empty-front'} />
        </div>
      </div>
      {layout.rows.map((row, r) => (
        <div className="cs-map-row" key={row.row}>
          <span className="cs-map-label">{row.row}</span>
          <div className={`cs-map-seats cs-map-seats-${row.positions.length}`}>
            {row.positions.map((code, p) => (
              <SeatBox key={p} code={code} occ={plan.occupants[r]?.[p] ?? null} label={anchorLabel(code)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Result card ── */

function ResultCard({ layout, plan }: { layout: CarSeatLayout; plan: PlanResult }) {
  const [open, setOpen] = useState(false)
  const price = layoutPrice(layout)
  const status = STATUS_META[plan.status]
  const conf = CONFIDENCE_META[layout.confidence]
  return (
    <div className={`cs-card ${status.cls}`}>
      <div className="cs-card-head">
        <div>
          <VehicleBadge vehicle={layout.vehicle} />
          <div className="cs-card-layout">{layout.seats} seats · {layout.layout}</div>
        </div>
        <div className="cs-card-tags">
          <span className="cs-status">{status.label}</span>
          <span className={`cs-conf cs-conf-${layout.confidence}`} title={conf.title}>{conf.label}</span>
        </div>
      </div>

      <SeatMap layout={layout} plan={plan} />

      {plan.status === 'no' && <p className="cs-reason">{plan.reason}</p>}
      {plan.caveats.length > 0 && (
        <ul className="cs-caveats">
          {plan.caveats.map(c => <li key={c}>{c}</li>)}
        </ul>
      )}
      {plan.notes.length > 0 && (
        <ul className="cs-notes">
          {plan.notes.map(n => <li key={n}>{n}</li>)}
        </ul>
      )}

      <div className="cs-card-foot">
        {price && <span className="cs-price">{price.year} MSRP from ${price.msrp.toLocaleString()}</span>}
        <button className="cs-more" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'Hide details' : 'Row details & sources'}
        </button>
      </div>

      {open && (
        <div className="cs-details">
          {layout.rows.map(row => {
            const a = countAnchors(row)
            return (
              <p key={row.row}>
                <strong>Row {row.row}:</strong> {a.latch} with lower anchors, {a.tether} with tethers · rear-facing: {ratingText(row.rear_facing)}
                {row.positions.length >= 3 && <> · 3 across: {ratingText(row.three_across)}</>}
                {row.note && <> — {row.note}</>}
              </p>
            )
          })}
          <p>
            <strong>3rd-row access:</strong> {layout.third_row_access.type === 'pass-through' ? 'walk-through between 2nd-row seats' : '2nd-row seats tilt/slide'}
            {layout.third_row_access.note && <> — {layout.third_row_access.note}</>}
          </p>
          {layout.notes && <p>{layout.notes}</p>}
          {layout.sources.length > 0 ? (
            <p className="cs-sources">
              Sources: {layout.sources.map((s, i) => (
                <span key={s.url}>{i > 0 && ' · '}<a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></span>
              ))}
            </p>
          ) : <p className="cs-sources">No published test yet — confirm in the owner&apos;s manual.</p>}
          <Link className="cs-vehicle-link" href={`/vehicles/${toSlug(layout.vehicle)}`}>See all {layout.vehicle} trims →</Link>
        </div>
      )}
    </div>
  )
}

/* ── Page ── */

export default function CarSeatsTab() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const kids = parseKids(searchParams.get('kids'))
  const otherRiders = Math.min(4, Math.max(0, parseInt(searchParams.get('riders') ?? '1', 10) || 0))
  const latchOnly = searchParams.get('latch') === '1'
  const [showNo, setShowNo] = useState(false)

  function update(next: { kids?: SeatType[]; riders?: number; latch?: boolean }) {
    const params = new URLSearchParams(searchParams.toString())
    if (next.kids) params.set('kids', next.kids.join(','))
    if (next.riders !== undefined) params.set('riders', String(next.riders))
    if (next.latch !== undefined) { if (next.latch) params.set('latch', '1'); else params.delete('latch') }
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const layouts = useMemo(() => getCarSeatLayouts(), [])
  const results = useMemo(() => {
    return layouts
      .map(layout => ({ layout, plan: planLayout(layout, kids, { otherRiders, latchOnly }), price: layoutPrice(layout) }))
      .sort((a, b) =>
        STATUS_ORDER[a.plan.status] - STATUS_ORDER[b.plan.status] ||
        CONF_ORDER[a.layout.confidence] - CONF_ORDER[b.layout.confidence] ||
        (a.price?.msrp ?? Infinity) - (b.price?.msrp ?? Infinity))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layouts, kids.join(','), otherRiders, latchOnly])

  const counts = { fits: 0, tight: 0, no: 0 }
  results.forEach(r => counts[r.plan.status]++)
  const shown = results.filter(r => showNo || r.plan.status !== 'no')

  return (
    <div className="cs-page">
      <h1 className="section-title section-title--hero">Car Seat Fit Planner</h1>
      <p className="section-desc">
        Tell us what car seats your kids ride in. We&apos;ll place them in every 3-row EV — using each seat&apos;s
        LATCH anchors, top tethers and 3rd-row access — and show you which layouts work.
      </p>

      <div className="card cs-builder">
        <div className="card-title">Your kids</div>
        {kids.length === 0 && <p className="cs-hint">Add a car seat below to get started.</p>}
        <ol className="cs-kids">
          {kids.map((k, i) => (
            <li key={i} className={`cs-kid cs-seat-${k}`}>
              <span className="cs-kid-num">Kid {i + 1}</span>
              <select
                value={k}
                aria-label={`Kid ${i + 1} seat type`}
                onChange={e => update({ kids: kids.map((x, j) => j === i ? e.target.value as SeatType : x) })}
              >
                {SEAT_TYPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <button
                className="cs-kid-remove"
                aria-label={`Remove kid ${i + 1}`}
                onClick={() => update({ kids: kids.filter((_, j) => j !== i) })}
              >✕</button>
            </li>
          ))}
        </ol>

        {kids.length < MAX_KIDS && (
          <div className="cs-add">
            {SEAT_TYPES.map(s => (
              <button key={s.id} className="cs-add-btn" title={s.desc} onClick={() => update({ kids: [...kids, s.id] })}>
                + {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="cs-presets">
          <span className="cs-presets-label">Quick picks:</span>
          {PRESETS.map(p => (
            <button key={p.label} className="cs-preset" onClick={() => update({ kids: p.kids })}>{p.label}</button>
          ))}
        </div>

        <div className="cs-options">
          <label>
            Other riders besides the driver
            <select value={otherRiders} onChange={e => update({ riders: Number(e.target.value) })}>
              {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="cs-check">
            <input type="checkbox" checked={latchOnly} onChange={e => update({ latch: e.target.checked })} />
            Harnessed seats must use lower anchors (no seat-belt installs)
          </label>
        </div>
        <p className="cs-hint">The first extra rider takes the front passenger seat; kids always ride in back.</p>
      </div>

      {kids.length > 0 && (
        <>
          <p className="cs-summary">
            <strong>{counts.fits}</strong> layouts fit · <strong>{counts.tight}</strong> fit with caveats · <strong>{counts.no}</strong> don&apos;t fit
            {' '}— {kids.map(seatLabel).join(', ')}{otherRiders > 0 && ` + ${otherRiders} other rider${otherRiders > 1 ? 's' : ''}`}
          </p>
          <div className="cs-legend">
            <span><span className="cs-anchor cs-anchor-l">L</span> lower anchors (LATCH)</span>
            <span><span className="cs-anchor cs-anchor-t">T</span> top tether</span>
            {SEAT_TYPES.map(s => <span key={s.id}><span className={`cs-legend-swatch cs-seat-${s.id}`}>{s.short}</span> {s.label}</span>)}
          </div>
          <div className="cs-grid">
            {shown.map(r => <ResultCard key={`${r.layout.vehicle}-${r.layout.seats}`} layout={r.layout} plan={r.plan} />)}
          </div>
          {counts.no > 0 && (
            <button className="cs-show-no" onClick={() => setShowNo(!showNo)}>
              {showNo ? 'Hide' : 'Show'} the {counts.no} layout{counts.no > 1 ? 's' : ''} that don&apos;t fit
            </button>
          )}
        </>
      )}

      <div className="card cs-reference">
        <div className="card-title">Anchor guide by vehicle</div>
        <div className="table-wrap">
          <table className="cs-table">
            <thead>
              <tr>
                <th>Vehicle</th><th>Layout</th>
                <th>Row 2 LATCH / tethers</th><th>Row 2 three-across</th>
                <th>Row 3 LATCH / tethers</th><th>Row 3 rear-facing</th>
                <th>3rd-row access</th><th>Data</th>
              </tr>
            </thead>
            <tbody>
              {layouts.map(l => {
                const r2 = l.rows.find(r => r.row === 2)
                const r3 = l.rows.find(r => r.row === 3)
                const a2 = r2 && countAnchors(r2)
                const a3 = r3 && countAnchors(r3)
                return (
                  <tr key={`${l.vehicle}-${l.seats}`}>
                    <td><VehicleBadge vehicle={l.vehicle} /></td>
                    <td>{l.seats} seats{l.layout.includes('captain') ? ' (captains)' : ' (bench)'}</td>
                    <td>{a2 ? `${a2.latch} / ${a2.tether}` : '—'}</td>
                    <td>{r2 && r2.positions.length >= 3 ? ratingText(r2.three_across) : 'n/a'}</td>
                    <td>{a3 ? `${a3.latch} / ${a3.tether}` : '—'}</td>
                    <td>{r3 ? ratingText(r3.rear_facing) : '—'}</td>
                    <td>{l.third_row_access.type === 'pass-through' ? 'Walk-through' : 'Tilt/slide'}</td>
                    <td><span className={`cs-conf cs-conf-${l.confidence}`} title={CONFIDENCE_META[l.confidence].title}>{CONFIDENCE_META[l.confidence].label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="cs-disclaimer">
        This is a planning aid, not installation advice. Anchor layouts change by model year and trim, and every car seat
        fits differently. Check the vehicle and car seat manuals, and have your install checked by a certified
        child passenger safety technician (<a href="https://www.nhtsa.gov/equipment/car-seats-and-booster-seats" target="_blank" rel="noopener noreferrer">find one via NHTSA</a>).
        Test-fit your actual seats before you buy.
      </p>
    </div>
  )
}

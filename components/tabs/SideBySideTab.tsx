'use client'

import { Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DATA, type DetailRow } from '@/lib/data'
import { fmtMoney, fmtNum } from '@/lib/utils'
import VehicleBadge from '../VehicleBadge'

// ── Metric definitions ───────────────────────────────────────────────────────

interface MetricDef {
  label: string
  render: (r: DetailRow) => string
  rawNum?: (r: DetailRow) => number | null
  higherIsBetter?: boolean
}

interface SectionDef {
  title: string
  metrics: MetricDef[]
}

function nv(v: number | string | null | undefined): number | null {
  return typeof v === 'number' ? v : null
}

function cargoStr(v: number | string | null | undefined, unit: string): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return `${v} ${unit}`
  return String(v)
}

const TIER_RANK: Record<string, number> = {
  'Basic L2': 1,
  'Advanced L2': 2,
  'L2+ Hands-Free': 3,
  'L2+ Point-to-Point': 4,
}

const SECTIONS: SectionDef[] = [
  {
    title: 'Key Stats',
    metrics: [
      { label: 'MSRP', render: r => fmtMoney(r.msrp).text, rawNum: r => nv(r.msrp), higherIsBetter: false },
      { label: 'Pre-Owned Price', render: r => r.preowned_range || '—' },
      { label: 'Seats', render: r => r.seats != null ? String(r.seats) : '—' },
      { label: 'Drivetrain', render: r => r.drivetrain || '—' },
      {
        label: 'EPA Range',
        render: r => { const f = fmtNum(r.range_mi); return f.text + (typeof r.range_mi === 'number' ? ' mi' : '') },
        rawNum: r => nv(r.range_mi), higherIsBetter: true,
      },
      {
        label: 'Horsepower',
        render: r => { const f = fmtNum(r.hp); return f.text + (typeof r.hp === 'number' ? ' hp' : '') },
        rawNum: r => nv(r.hp), higherIsBetter: true,
      },
      {
        label: 'Battery',
        render: r => { const f = fmtNum(r.battery_kwh); return f.text + (typeof r.battery_kwh === 'number' ? ' kWh' : '') },
        rawNum: r => nv(r.battery_kwh), higherIsBetter: true,
      },
    ],
  },
  {
    title: 'Performance',
    metrics: [
      { label: 'Torque', render: r => typeof r.torque_lb_ft === 'number' ? `${r.torque_lb_ft.toLocaleString()} lb-ft` : (r.torque_lb_ft || '—'), rawNum: r => nv(r.torque_lb_ft), higherIsBetter: true },
      { label: '0–60 mph', render: r => typeof r.zero_to_60_sec === 'number' ? `${r.zero_to_60_sec} sec` : (r.zero_to_60_sec || '—'), rawNum: r => nv(r.zero_to_60_sec), higherIsBetter: false },
      { label: 'Curb Weight', render: r => typeof r.curb_weight_lbs === 'number' ? `${r.curb_weight_lbs.toLocaleString()} lbs` : (r.curb_weight_lbs || '—') },
      { label: 'Towing Capacity', render: r => typeof r.towing_lbs === 'number' ? `${r.towing_lbs.toLocaleString()} lbs` : (r.towing_lbs || '—'), rawNum: r => nv(r.towing_lbs), higherIsBetter: true },
    ],
  },
  {
    title: 'Drivetrain & Charging',
    metrics: [
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
    metrics: [
      { label: 'Length', render: r => typeof r.length_in === 'number' ? `${r.length_in} in` : (r.length_in || '—') },
      { label: 'Width', render: r => typeof r.width_in === 'number' ? `${r.width_in} in` : (r.width_in || '—') },
      { label: 'Height', render: r => typeof r.height_in === 'number' ? `${r.height_in} in` : (r.height_in || '—') },
      { label: 'Ground Clearance', render: r => typeof r.ground_clearance_in === 'number' ? `${r.ground_clearance_in} in` : (r.ground_clearance_in || '—') },
      { label: '3rd Row Legroom', render: r => typeof r.third_row_legroom_in === 'number' ? `${r.third_row_legroom_in} in` : (r.third_row_legroom_in || '—'), rawNum: r => nv(r.third_row_legroom_in), higherIsBetter: true },
      { label: '3rd Row Headroom', render: r => typeof r.third_row_headroom_in === 'number' ? `${r.third_row_headroom_in} in` : (r.third_row_headroom_in || '—'), rawNum: r => nv(r.third_row_headroom_in), higherIsBetter: true },
    ],
  },
  {
    title: 'Technology & Features',
    metrics: [
      {
        label: 'Self Driving Tier',
        render: r => r.self_driving_tier || '—',
        rawNum: r => r.self_driving_tier ? (TIER_RANK[r.self_driving_tier] ?? null) : null,
        higherIsBetter: true,
      },
      { label: 'Self Driving System', render: r => r.self_driving || '—' },
      { label: 'Car Software', render: r => r.car_software || '—' },
      { label: 'Main Display', render: r => r.main_display || '—' },
      { label: 'Additional Displays', render: r => r.additional_displays || '—' },
      { label: 'Audio', render: r => r.audio || '—' },
      { label: 'Driver Profiles', render: r => r.driver_profiles || '—' },
    ],
  },
  {
    title: 'Cargo & Storage',
    metrics: [
      { label: 'Frunk', render: r => cargoStr(r.frunk_cu_ft, 'cu ft'), rawNum: r => r.frunk_cu_ft, higherIsBetter: true },
      { label: 'Behind 3rd Row', render: r => cargoStr(r.cargo_behind_3rd_cu_ft, 'cu ft'), rawNum: r => nv(r.cargo_behind_3rd_cu_ft), higherIsBetter: true },
      { label: 'Behind 2nd Row', render: r => cargoStr(r.cargo_behind_2nd_cu_ft, 'cu ft'), rawNum: r => r.cargo_behind_2nd_cu_ft, higherIsBetter: true },
      { label: 'Fold Flat', render: r => r.fold_flat || '—' },
      { label: 'Floor Width (Wheel Wells)', render: r => cargoStr(r.cargo_floor_width_in, 'in'), rawNum: r => nv(r.cargo_floor_width_in), higherIsBetter: true },
    ],
  },
  {
    title: 'Notes',
    metrics: [
      { label: 'Notes', render: r => r.notes || '—' },
    ],
  },
]

// ── Highlight helper ─────────────────────────────────────────────────────────

function getCellClasses(metric: MetricDef, rows: (DetailRow | null)[]): string[] {
  if (!metric.rawNum || metric.higherIsBetter === undefined) return rows.map(() => 'sbs-cell')
  const populated = rows.filter((r): r is DetailRow => r !== null)
  if (populated.length < 2) return rows.map(() => 'sbs-cell')
  const nums = populated.map(r => metric.rawNum!(r))
  if (nums.some(v => v === null)) return rows.map(() => 'sbs-cell')
  const valid = nums as number[]
  const best = metric.higherIsBetter ? Math.max(...valid) : Math.min(...valid)
  const worst = metric.higherIsBetter ? Math.min(...valid) : Math.max(...valid)
  if (best === worst) return rows.map(() => 'sbs-cell')
  return rows.map(r => {
    if (!r) return 'sbs-cell'
    const v = metric.rawNum!(r)
    if (v === best) return 'sbs-cell sbs-cell-best'
    if (v === worst) return 'sbs-cell sbs-cell-worst'
    return 'sbs-cell'
  })
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SideBySideTab() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 4-level slot state: vehicle → year → seats → trim
  const slots = [0, 1, 2].map(i => ({
    vehicle: searchParams.get(`v${i + 1}`) ?? '',
    year:    searchParams.get(`y${i + 1}`) ?? '',
    seats:   searchParams.get(`s${i + 1}`) ?? '',
    trim:    searchParams.get(`t${i + 1}`) ?? '',
  }))

  function updateSlot(i: number, key: 'vehicle' | 'year' | 'seats' | 'trim', value: string) {
    const params = new URLSearchParams(searchParams.toString())
    const n = i + 1
    if (key === 'vehicle') {
      if (value) params.set(`v${n}`, value); else params.delete(`v${n}`)
      params.delete(`y${n}`); params.delete(`s${n}`); params.delete(`t${n}`)
    } else if (key === 'year') {
      if (value) params.set(`y${n}`, value); else params.delete(`y${n}`)
      params.delete(`s${n}`); params.delete(`t${n}`)
    } else if (key === 'seats') {
      if (value) params.set(`s${n}`, value); else params.delete(`s${n}`)
      params.delete(`t${n}`)
    } else {
      if (value) params.set(`t${n}`, value); else params.delete(`t${n}`)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }

  function clearSlot(i: number) {
    const params = new URLSearchParams(searchParams.toString())
    const n = i + 1
    params.delete(`v${n}`); params.delete(`y${n}`); params.delete(`s${n}`); params.delete(`t${n}`)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const allVehicles = [...new Set(DATA.details.map(d => d.vehicle))].sort()

  const slotData = slots.map(slot => {
    const years = slot.vehicle
      ? ([...new Set(DATA.details.filter(d => d.vehicle === slot.vehicle).map(d => d.year))].sort() as number[])
      : []

    const seatOptions = slot.vehicle && slot.year
      ? ([...new Set(
          DATA.details
            .filter(d => d.vehicle === slot.vehicle && String(d.year) === slot.year && d.seats != null)
            .map(d => d.seats as number)
        )].sort((a, b) => a - b))
      : []

    const trims = slot.vehicle && slot.year && slot.seats
      ? DATA.details
          .filter(d => d.vehicle === slot.vehicle && String(d.year) === slot.year && String(d.seats) === slot.seats)
          .map(d => d.trim)
      : []

    const row = slot.vehicle && slot.year && slot.seats && slot.trim
      ? (DATA.details.find(d =>
          d.vehicle === slot.vehicle &&
          String(d.year) === slot.year &&
          String(d.seats) === slot.seats &&
          d.trim === slot.trim
        ) ?? null)
      : null

    return { years, seatOptions, trims, row }
  })

  const rows = slotData.map(s => s.row)
  const hasAny = rows.some(r => r !== null)

  return (
    <>
      <h2 className="section-title">Side-by-Side</h2>
      <p className="section-desc">Select up to 3 configurations to compare every metric side by side.</p>

      {/* ── Slot selectors ── */}
      <div className="sbs-selectors">
        {[0, 1, 2].map(i => (
          <div key={i} className={`sbs-slot-card${!slots[i].vehicle ? ' sbs-slot-empty' : ''}`}>
            <div className="sbs-slot-header">
              {slots[i].vehicle
                ? <VehicleBadge vehicle={slots[i].vehicle} />
                : <span className="sbs-slot-placeholder">+ Add Vehicle</span>
              }
              {slots[i].vehicle && (
                <button className="sbs-clear-btn" onClick={() => clearSlot(i)}>Clear</button>
              )}
            </div>
            <div className="sbs-slot-selects">
              <div className="filter-group">
                <span className="filter-label">Vehicle</span>
                <select value={slots[i].vehicle} onChange={e => updateSlot(i, 'vehicle', e.target.value)}>
                  <option value="">Select vehicle…</option>
                  {allVehicles.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <span className="filter-label">Year</span>
                <select value={slots[i].year} disabled={!slots[i].vehicle} onChange={e => updateSlot(i, 'year', e.target.value)}>
                  <option value="">Select year…</option>
                  {slotData[i].years.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <span className="filter-label">Seats</span>
                <select value={slots[i].seats} disabled={!slots[i].year} onChange={e => updateSlot(i, 'seats', e.target.value)}>
                  <option value="">Select seats…</option>
                  {slotData[i].seatOptions.map(s => <option key={s} value={String(s)}>{s}-seat</option>)}
                </select>
              </div>
              <div className="filter-group">
                <span className="filter-label">Trim</span>
                <select value={slots[i].trim} disabled={!slots[i].seats} onChange={e => updateSlot(i, 'trim', e.target.value)}>
                  <option value="">Select trim…</option>
                  {slotData[i].trims.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasAny ? (
        <>
          {/* ── Desktop: comparison table ── */}
          <div className="sbs-table-wrap">
            <table className="sbs-table">
              <thead>
                <tr>
                  <th className="sbs-metric-label">Metric</th>
                  {rows.map((row, i) => (
                    <th key={i}>
                      {row ? (
                        <div className="sbs-col-header">
                          <VehicleBadge vehicle={slots[i].vehicle} style={{ fontSize: 13 }} />
                          <span className="sbs-col-year-trim">{slots[i].year} · {slots[i].seats}-seat · {slots[i].trim}</span>
                        </div>
                      ) : slots[i].vehicle ? (
                        <div className="sbs-col-header">
                          <VehicleBadge vehicle={slots[i].vehicle} style={{ fontSize: 13 }} />
                          <span className="sbs-col-year-trim" style={{ color: 'var(--text-dim)' }}>Finish selecting…</span>
                        </div>
                      ) : (
                        <span className="sbs-col-empty">Slot {i + 1}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SECTIONS.map(section => (
                  <Fragment key={section.title}>
                    <tr className="sbs-section-header">
                      <td className="sbs-metric-label">{section.title}</td>
                      <td colSpan={3} />
                    </tr>
                    {section.metrics.map(metric => {
                      const cellClasses = getCellClasses(metric, rows)
                      return (
                        <tr key={`${section.title}-${metric.label}`}>
                          <td className="sbs-metric-label">{metric.label}</td>
                          {rows.map((row, i) => (
                            <td key={i} className={cellClasses[i]}>
                              {row ? metric.render(row) : '—'}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile: metric card feed ── */}
          <div className="sbs-mobile-view">
            {SECTIONS.map(section => (
              <div key={section.title} className="sbs-mobile-section">
                <div className="sbs-mobile-section-title">{section.title}</div>
                {section.metrics.map(metric => {
                  const cellClasses = getCellClasses(metric, rows)
                  const populatedEntries = rows.map((row, i) => ({ row, i })).filter(e => e.row !== null)
                  if (populatedEntries.length === 0) return null
                  return (
                    <div key={metric.label} className="sbs-mobile-metric-card">
                      <div className="sbs-mobile-metric-label">{metric.label}</div>
                      {populatedEntries.map(({ row, i }) => (
                        <div key={i} className="sbs-mobile-row">
                          <div className="sbs-mobile-id">
                            <VehicleBadge vehicle={slots[i].vehicle} style={{ fontSize: 12, padding: '2px 7px' }} />
                            <span className="sbs-mobile-trim">{slots[i].year} · {slots[i].seats}-seat · {slots[i].trim}</span>
                          </div>
                          <span className={`sbs-mobile-val ${cellClasses[i]}`}>
                            {metric.render(row!)}
                          </span>
                          {cellClasses[i].includes('sbs-cell-best') && <span className="sbs-indicator-best">★</span>}
                          {cellClasses[i].includes('sbs-cell-worst') && <span className="sbs-indicator-worst">●</span>}
                          {!cellClasses[i].includes('sbs-cell-best') && !cellClasses[i].includes('sbs-cell-worst') && (
                            <span className="sbs-indicator-placeholder" />
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="sbs-empty-state">
          Select a vehicle above to begin comparing.
        </div>
      )}
    </>
  )
}

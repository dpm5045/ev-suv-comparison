'use client'

import { Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DATA, type DetailRow } from '@/lib/data'
import { SPEC_SECTIONS, type SpecSection as SpecSectionDef, type FieldDef } from '@/lib/spec-fields'
import VehicleBadge from '../VehicleBadge'

// ── Notes section (not in the shared registry) ───────────────────────────────

const NOTES_SECTION: SpecSectionDef = {
  title: 'Notes',
  fields: [
    { label: 'Notes', render: r => r.notes || '—' },
  ],
}

const ALL_SECTIONS: SpecSectionDef[] = [...SPEC_SECTIONS, NOTES_SECTION]

// ── Highlight helper ─────────────────────────────────────────────────────────

function getCellClasses(metric: FieldDef, rows: (DetailRow | null)[]): string[] {
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
                {ALL_SECTIONS.map(section => (
                  <Fragment key={section.title}>
                    <tr className="sbs-section-header">
                      <td className="sbs-metric-label">{section.title}</td>
                      <td colSpan={3} />
                    </tr>
                    {section.fields.map(metric => {
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
            {ALL_SECTIONS.map(section => (
              <div key={section.title} className="sbs-mobile-section">
                <div className="sbs-mobile-section-title">{section.title}</div>
                {section.fields.map(metric => {
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

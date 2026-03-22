'use client'

import { useEffect, useMemo, useState } from 'react'
import { DATA } from '@/lib/data'
import { fmtMoney, fmtNum } from '@/lib/utils'
import Link from 'next/link'
import VehicleBadge from './VehicleBadge'
import SpecSection from './SpecSection'
import { SPEC_SECTIONS } from '@/lib/spec-fields'

interface Props {
  vehicle: string | null
  onClose: () => void
}

export default function VehicleSummaryPanel({ vehicle, onClose }: Props) {
  const open = vehicle !== null

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // All trims for this vehicle
  const trims = useMemo(
    () => (vehicle
      ? DATA.details
          .filter(d => d.vehicle === vehicle)
          .sort((a, b) => b.year - a.year || a.trim.localeCompare(b.trim))
      : []),
    [vehicle]
  )

  // Trim selector state — auto-select if only one trim
  const [selectedTrimIdx, setSelectedTrimIdx] = useState<number | null>(null)

  // Reset selection when vehicle changes; auto-select single-trim vehicles
  useEffect(() => {
    if (trims.length === 1) {
      setSelectedTrimIdx(DATA.details.indexOf(trims[0]))
    } else {
      setSelectedTrimIdx(null)
    }
  }, [vehicle, trims])

  const selectedTrim = selectedTrimIdx !== null ? DATA.details[selectedTrimIdx] : null

  // Aggregate stats across all trims
  const summary = useMemo(() => {
    if (!trims.length) return null

    const ranges = trims.map(t => t.range_mi).filter((v): v is number => typeof v === 'number')
    const cargos = trims.map(t => t.cargo_behind_3rd_cu_ft).filter((v): v is number => typeof v === 'number')
    const accel = trims.map(t => t.zero_to_60_sec).filter((v): v is number => typeof v === 'number')
    const dcCharge = trims.map(t => t.dc_fast_charge_10_80_min).filter((v): v is number => typeof v === 'number')
    const selfDriving = [...new Set(trims.map(t => t.self_driving_tier).filter(Boolean))]
    const seats = [...new Set(trims.map(t => t.seats).filter(Boolean))]

    function rangeText(nums: number[], suffix: string) {
      if (!nums.length) return '—'
      const lo = Math.min(...nums)
      const hi = Math.max(...nums)
      return lo === hi
        ? `${lo.toLocaleString()}${suffix}`
        : `${lo.toLocaleString()} – ${hi.toLocaleString()}${suffix}`
    }

    return {
      range: rangeText(ranges, ' mi'),
      cargo: rangeText(cargos, ' cu ft'),
      accel: rangeText(accel, ' sec'),
      dcCharge: rangeText(dcCharge, ' min'),
      selfDriving: selfDriving.join(', ') || '—',
      seats: seats.join(', ') || '—',
    }
  }, [trims])

  return (
    <>
      <div className={`overlay${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`vehicle-summary-panel${open ? ' open' : ''}`}>
        <button className="detail-close" onClick={onClose} aria-label="Close">×</button>
        {vehicle && summary && (
          <>
            <div className="vsp-header">
              <div className="detail-vehicle-name">
                <VehicleBadge vehicle={vehicle} style={{ fontSize: 14, padding: '4px 12px' }} />
              </div>
            </div>

            {/* Vehicle Summary */}
            <div className="vsp-summary-grid">
              {([
                ['EPA Range', summary.range],
                ['Cargo (3rd Row)', summary.cargo],
                ['0–60 mph', summary.accel],
                ['DC 10–80%', summary.dcCharge],
                ['Self-Driving', summary.selfDriving],
                ['Seats', summary.seats],
              ] as [string, string][]).map(([label, val]) => (
                <div key={label} className="vsp-stat">
                  <div className="vsp-stat-label">{label}</div>
                  <div className="vsp-stat-value">{val}</div>
                </div>
              ))}
            </div>

            {/* Trim Selector */}
            {trims.length > 1 && (
              <div className="vsp-trim-selector">
                <label htmlFor="vsp-trim-select">Select a year &amp; trim for detailed specs</label>
                <select
                  id="vsp-trim-select"
                  value={selectedTrimIdx ?? ''}
                  onChange={e => setSelectedTrimIdx(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">— Choose trim —</option>
                  {trims.map(t => {
                    const idx = DATA.details.indexOf(t)
                    return (
                      <option key={idx} value={idx}>
                        {t.year} {t.trim} ({t.seats})
                      </option>
                    )
                  })}
                </select>
              </div>
            )}

            {/* Trim Detail (inline below summary) */}
            {selectedTrim && (
              <div className="vsp-trim-detail">
                <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 16 }}>
                  {selectedTrim.year} {selectedTrim.trim}
                </div>

                <div className="detail-grid">
                  {([
                    ['EPA Range', (() => { const f = fmtNum(selectedTrim.range_mi); return f.text + (typeof selectedTrim.range_mi === 'number' ? ' mi' : '') })()],
                    ['Cargo (3rd Row)', (() => { const f = fmtNum(selectedTrim.cargo_behind_3rd_cu_ft); return f.text + (typeof selectedTrim.cargo_behind_3rd_cu_ft === 'number' ? ' cu ft' : '') })()],
                    ['0–60 mph', (() => { const f = fmtNum(selectedTrim.zero_to_60_sec); return f.text + (typeof selectedTrim.zero_to_60_sec === 'number' ? ' sec' : '') })()],
                    ['DC 10–80%', (() => { const f = fmtNum(selectedTrim.dc_fast_charge_10_80_min); return f.text + (typeof selectedTrim.dc_fast_charge_10_80_min === 'number' ? ' min' : '') })()],
                    ['Self-Driving', selectedTrim.self_driving_tier ?? '—'],
                    ['Seats', selectedTrim.seats ?? '—'],
                  ] as [string, React.ReactNode][]).map(([label, val]) => (
                    <div key={label} className="detail-stat">
                      <div className="detail-stat-label">{label}</div>
                      <div className="detail-stat-value">{val}</div>
                    </div>
                  ))}
                </div>

                {SPEC_SECTIONS.map(sec => (
                  <SpecSection key={sec.title} title={sec.title} rows={
                    sec.fields.map(f => [f.label, f.render(selectedTrim)] as [string, string])
                  } />
                ))}

                {selectedTrim.notes && (
                  <div className="detail-section">
                    <div className="detail-section-title">Notes</div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedTrim.notes}</p>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link href={`/?tab=comparison&vehicle=${encodeURIComponent(vehicle)}`} className="vsp-fullpage-link" onClick={onClose}>
                Compare all trims <span aria-hidden="true">→</span>
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  )
}

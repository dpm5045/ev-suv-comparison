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
    () => (vehicle ? DATA.details.filter(d => d.vehicle === vehicle) : []),
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

    const msrps = trims.map(t => t.msrp).filter((v): v is number => typeof v === 'number')
    const ranges = trims.map(t => t.range_mi).filter((v): v is number => typeof v === 'number')
    const hps = trims.map(t => t.hp).filter((v): v is number => typeof v === 'number')
    const batteries = trims.map(t => t.battery_kwh).filter((v): v is number => typeof v === 'number')
    const seats = [...new Set(trims.map(t => t.seats).filter(Boolean))]
    const drivetrains = [...new Set(trims.map(t => t.drivetrain).filter(Boolean))]
    const chargingTypes = [...new Set(trims.map(t => t.charging_type).filter(Boolean))]

    function rangeText(nums: number[], suffix: string) {
      if (!nums.length) return '—'
      const lo = Math.min(...nums)
      const hi = Math.max(...nums)
      return lo === hi
        ? `${lo.toLocaleString()}${suffix}`
        : `${lo.toLocaleString()} – ${hi.toLocaleString()}${suffix}`
    }

    function moneyRange(nums: number[]) {
      if (!nums.length) return '—'
      const lo = Math.min(...nums)
      const hi = Math.max(...nums)
      const fLo = fmtMoney(lo)
      const fHi = fmtMoney(hi)
      return lo === hi ? fLo.text : `${fLo.text} – ${fHi.text}`
    }

    return {
      msrp: moneyRange(msrps),
      range: rangeText(ranges, ' mi'),
      hp: rangeText(hps, ' hp'),
      battery: rangeText(batteries, ' kWh'),
      seats: seats.join(', ') || '—',
      drivetrain: drivetrains.join(', ') || '—',
      charging: chargingTypes.join(', ') || '—',
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
                ['MSRP Range', summary.msrp],
                ['EPA Range', summary.range],
                ['Horsepower', summary.hp],
                ['Battery', summary.battery],
                ['Seating', summary.seats],
                ['Drivetrain / Charging', `${summary.drivetrain} / ${summary.charging}`],
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
                    ['MSRP', (() => { const f = fmtMoney(selectedTrim.msrp); return <span className={f.className}>{f.text}</span> })()],
                    ['Pre-Owned', selectedTrim.preowned_range || '—'],
                    ['EPA Range', (() => { const f = fmtNum(selectedTrim.range_mi); return f.text + (typeof selectedTrim.range_mi === 'number' ? ' mi' : '') })()],
                    ['HP', (() => { const f = fmtNum(selectedTrim.hp); return f.text + (typeof selectedTrim.hp === 'number' ? ' hp' : '') })()],
                    ['Battery', (() => { const f = fmtNum(selectedTrim.battery_kwh); return f.text + (typeof selectedTrim.battery_kwh === 'number' ? ' kWh' : '') })()],
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

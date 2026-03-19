'use client'

import { useEffect, useMemo, useState } from 'react'
import { DATA } from '@/lib/data'
import { fmtMoney, fmtNum } from '@/lib/utils'
import Link from 'next/link'
import VehicleBadge from './VehicleBadge'
import SpecSection from './SpecSection'

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
              <Link href={`/?tab=comparison&vehicle=${encodeURIComponent(vehicle)}`} className="vsp-fullpage-link">
                Compare all trims <span aria-hidden="true">→</span>
              </Link>
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

                <SpecSection title="Performance" rows={[
                  ['Torque', typeof selectedTrim.torque_lb_ft === 'number' ? `${selectedTrim.torque_lb_ft} lb-ft` : selectedTrim.torque_lb_ft],
                  ['0–60 mph', typeof selectedTrim.zero_to_60_sec === 'number' ? `${selectedTrim.zero_to_60_sec} sec` : selectedTrim.zero_to_60_sec],
                  ['Curb Weight', typeof selectedTrim.curb_weight_lbs === 'number' ? `${selectedTrim.curb_weight_lbs.toLocaleString()} lbs` : selectedTrim.curb_weight_lbs],
                  ['Towing Capacity', typeof selectedTrim.towing_lbs === 'number' ? `${selectedTrim.towing_lbs.toLocaleString()} lbs` : selectedTrim.towing_lbs],
                ]} />

                <SpecSection title="Drivetrain & Charging" rows={[
                  ['Drivetrain', selectedTrim.drivetrain],
                  ['Charging Type', selectedTrim.charging_type],
                  ['DC Fast Charge', typeof selectedTrim.dc_fast_charge_kw === 'number' ? `${selectedTrim.dc_fast_charge_kw} kW` : selectedTrim.dc_fast_charge_kw],
                  ['DC 10–80%', typeof selectedTrim.dc_fast_charge_10_80_min === 'number' ? `${selectedTrim.dc_fast_charge_10_80_min} min` : selectedTrim.dc_fast_charge_10_80_min],
                  ['Onboard AC', selectedTrim.onboard_ac_kw ? `${selectedTrim.onboard_ac_kw} kW` : '—'],
                  ['L2 10–80%', selectedTrim.l2_10_80 ? `${selectedTrim.l2_10_80} hrs` : '—'],
                  ['L2 10–100%', selectedTrim.l2_10_100 ? `${selectedTrim.l2_10_100} hrs` : '—'],
                ]} />

                <SpecSection title="Dimensions" rows={[
                  ['Length', typeof selectedTrim.length_in === 'number' ? `${selectedTrim.length_in} in` : selectedTrim.length_in],
                  ['Width', typeof selectedTrim.width_in === 'number' ? `${selectedTrim.width_in} in` : selectedTrim.width_in],
                  ['Height', typeof selectedTrim.height_in === 'number' ? `${selectedTrim.height_in} in` : selectedTrim.height_in],
                  ['Ground Clearance', typeof selectedTrim.ground_clearance_in === 'number' ? `${selectedTrim.ground_clearance_in} in` : selectedTrim.ground_clearance_in],
                  ['3rd Row Legroom', typeof selectedTrim.third_row_legroom_in === 'number' ? `${selectedTrim.third_row_legroom_in} in` : selectedTrim.third_row_legroom_in],
                  ['3rd Row Headroom', typeof selectedTrim.third_row_headroom_in === 'number' ? `${selectedTrim.third_row_headroom_in} in` : selectedTrim.third_row_headroom_in],
                ]} />

                <SpecSection title="Technology & Features" rows={[
                  ['Self Driving Tier', selectedTrim.self_driving_tier],
                  ['Self Driving', selectedTrim.self_driving],
                  ['Car Software', selectedTrim.car_software],
                  ['Main Display', selectedTrim.main_display],
                  ['Additional Displays', selectedTrim.additional_displays],
                  ['Audio', selectedTrim.audio],
                  ['Driver Profiles', selectedTrim.driver_profiles],
                ]} />

                <SpecSection title="Cargo & Storage" rows={[
                  ['Frunk', typeof selectedTrim.frunk_cu_ft === 'number' ? `${selectedTrim.frunk_cu_ft} cu ft` : selectedTrim.frunk_cu_ft],
                  ['Behind 3rd Row', typeof selectedTrim.cargo_behind_3rd_cu_ft === 'number' ? `${selectedTrim.cargo_behind_3rd_cu_ft} cu ft` : selectedTrim.cargo_behind_3rd_cu_ft],
                  ['Behind 2nd Row', typeof selectedTrim.cargo_behind_2nd_cu_ft === 'number' ? `${selectedTrim.cargo_behind_2nd_cu_ft} cu ft` : selectedTrim.cargo_behind_2nd_cu_ft],
                  ['Fold Flat', selectedTrim.fold_flat],
                  ['Floor Width (Wheel Wells)', typeof selectedTrim.cargo_floor_width_in === 'number' ? `${selectedTrim.cargo_floor_width_in} in` : selectedTrim.cargo_floor_width_in],
                ]} />

                <SpecSection title="Pricing & OTD" rows={[
                  ['MSRP', (() => { const f = fmtMoney(selectedTrim.msrp); return f.text })()],
                  ['Destination', typeof selectedTrim.destination === 'number' ? `$${selectedTrim.destination.toLocaleString()}` : selectedTrim.destination],
                  ['OTD (New)', (() => { const f = fmtMoney(selectedTrim.otd_new); return f.text })()],
                  ['Pre-Owned Range', selectedTrim.preowned_range || '—'],
                  ['OTD (Pre-Owned)', (() => { const f = fmtMoney(selectedTrim.otd_preowned); return f.text })()],
                ]} />

                {selectedTrim.notes && (
                  <div className="detail-section">
                    <div className="detail-section-title">Notes</div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedTrim.notes}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </aside>
    </>
  )
}

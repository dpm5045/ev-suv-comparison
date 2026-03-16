'use client'

import { useEffect } from 'react'
import { DATA, VEHICLE_CLASSES } from '@/lib/data'
import { fmtMoney, fmtNum } from '@/lib/utils'
import VehicleBadge from './VehicleBadge'
import SpecSection from './SpecSection'

interface Props {
  idx: number | null
  onClose: () => void
}

export default function DetailPanel({ idx, onClose }: Props) {
  const open = idx !== null
  const r = open ? DATA.details[idx] : null

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const cls = r ? (VEHICLE_CLASSES[r.vehicle] ?? '') : ''

  return (
    <>
      <div className={`overlay${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`detail-panel${open ? ' open' : ''}`}>
        <button className="detail-close" onClick={onClose} aria-label="Close">×</button>
        {r && (
          <>
            <div className="detail-vehicle-name">
              <VehicleBadge vehicle={r.vehicle} style={{ fontSize: 14, padding: '4px 12px' }} />
            </div>
            <div className="detail-trim">{r.year} {r.trim}</div>

            <div className="detail-grid">
              {([
                ['MSRP', (() => { const f = fmtMoney(r.msrp); return <span className={f.className}>{f.text}</span> })()],
                ['Pre-Owned Price', r.preowned_range || '—'],
                ['EPA Range', (() => { const f = fmtNum(r.range_mi); return f.text + (typeof r.range_mi === 'number' ? ' mi' : '') })()],
                ['Horsepower', (() => { const f = fmtNum(r.hp); return f.text + (typeof r.hp === 'number' ? ' hp' : '') })()],
                ['Battery', (() => { const f = fmtNum(r.battery_kwh); return f.text + (typeof r.battery_kwh === 'number' ? ' kWh' : '') })()],
                ['Seats', r.seats ?? '—'],
              ] as [string, React.ReactNode][]).map(([label, val]) => (
                <div key={label} className="detail-stat">
                  <div className="detail-stat-label">{label}</div>
                  <div className="detail-stat-value">{val}</div>
                </div>
              ))}
            </div>

            <SpecSection title="Drivetrain & Charging" rows={[
              ['Drivetrain', r.drivetrain],
              ['Charging Type', r.charging_type],
              ['Onboard AC', r.onboard_ac_kw ? `${r.onboard_ac_kw} kW` : '—'],
              ['L2 10–80%', r.l2_10_80 ? `${r.l2_10_80} hrs` : '—'],
              ['L2 10–100%', r.l2_10_100 ? `${r.l2_10_100} hrs` : '—'],
            ]} />

            <SpecSection title="Technology & Features" rows={[
              ['Self Driving', r.self_driving],
              ['Car Software', r.car_software],
              ['Main Display', r.main_display],
              ['Additional Displays', r.additional_displays],
              ['Audio', r.audio],
              ['Driver Profiles', r.driver_profiles],
            ]} />

            <SpecSection title="Cargo & Storage" rows={[
              ['Frunk', typeof r.frunk_cu_ft === 'number' ? `${r.frunk_cu_ft} cu ft` : r.frunk_cu_ft],
              ['Behind 3rd Row', typeof r.cargo_behind_3rd_cu_ft === 'number' ? `${r.cargo_behind_3rd_cu_ft} cu ft` : r.cargo_behind_3rd_cu_ft],
              ['Behind 2nd Row', typeof r.cargo_behind_2nd_cu_ft === 'number' ? `${r.cargo_behind_2nd_cu_ft} cu ft` : r.cargo_behind_2nd_cu_ft],
              ['Fold Flat', r.fold_flat],
              ['Floor Width (Wheel Wells)', typeof r.cargo_floor_width_in === 'number' ? `${r.cargo_floor_width_in} in` : r.cargo_floor_width_in],
            ]} />

            {r.notes && (
              <div className="detail-section">
                <div className="detail-section-title">Notes</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.notes}</p>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  )
}


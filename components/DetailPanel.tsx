'use client'

import { useEffect } from 'react'
import { DATA, VEHICLE_CLASSES } from '@/lib/data'
import { fmtMoney, fmtNum } from '@/lib/utils'
import Link from 'next/link'
import { toSlug } from '@/lib/slugs'
import VehicleBadge from './VehicleBadge'
import SpecSection from './SpecSection'
import { getChargingLinks, getAccessoryLinks, AFFILIATE_DISCLOSURE } from '@/lib/affiliate'

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
            <Link
              href={`/vehicles/${toSlug(r.vehicle)}`}
              className="detail-fullpage-link"
            >
              View full page <span aria-hidden="true">↗</span>
            </Link>

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

            <SpecSection title="Performance" rows={[
              ['Torque', typeof r.torque_lb_ft === 'number' ? `${r.torque_lb_ft} lb-ft` : r.torque_lb_ft],
              ['0–60 mph', typeof r.zero_to_60_sec === 'number' ? `${r.zero_to_60_sec} sec` : r.zero_to_60_sec],
              ['Curb Weight', typeof r.curb_weight_lbs === 'number' ? `${r.curb_weight_lbs.toLocaleString()} lbs` : r.curb_weight_lbs],
              ['Towing Capacity', typeof r.towing_lbs === 'number' ? `${r.towing_lbs.toLocaleString()} lbs` : r.towing_lbs],
            ]} />

            <SpecSection title="Drivetrain & Charging" rows={[
              ['Drivetrain', r.drivetrain],
              ['Charging Type', r.charging_type],
              ['DC Fast Charge', typeof r.dc_fast_charge_kw === 'number' ? `${r.dc_fast_charge_kw} kW` : r.dc_fast_charge_kw],
              ['DC 10–80%', typeof r.dc_fast_charge_10_80_min === 'number' ? `${r.dc_fast_charge_10_80_min} min` : r.dc_fast_charge_10_80_min],
              ['Onboard AC', r.onboard_ac_kw ? `${r.onboard_ac_kw} kW` : '—'],
              ['L2 10–80%', r.l2_10_80 ? `${r.l2_10_80} hrs` : '—'],
              ['L2 10–100%', r.l2_10_100 ? `${r.l2_10_100} hrs` : '—'],
            ]} />

            <SpecSection title="Dimensions" rows={[
              ['Length', typeof r.length_in === 'number' ? `${r.length_in} in` : r.length_in],
              ['Width', typeof r.width_in === 'number' ? `${r.width_in} in` : r.width_in],
              ['Height', typeof r.height_in === 'number' ? `${r.height_in} in` : r.height_in],
              ['Ground Clearance', typeof r.ground_clearance_in === 'number' ? `${r.ground_clearance_in} in` : r.ground_clearance_in],
              ['3rd Row Legroom', typeof r.third_row_legroom_in === 'number' ? `${r.third_row_legroom_in} in` : r.third_row_legroom_in],
              ['3rd Row Headroom', typeof r.third_row_headroom_in === 'number' ? `${r.third_row_headroom_in} in` : r.third_row_headroom_in],
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

            <div className="detail-section">
              <div className="detail-section-title">Shop Compatible Accessories</div>
              <div className="affiliate-links-wrap">
                {getChargingLinks(r.charging_type ?? '').map((link) => (
                  <a
                    key={link.text}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="affiliate-link"
                  >
                    <span className="affiliate-link-amazon">Amazon</span> {link.text} <span className="affiliate-link-arrow" aria-hidden="true">↗</span>
                  </a>
                ))}
                {getAccessoryLinks(r.vehicle, r.year).map((link) => (
                  <a
                    key={link.text}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="affiliate-link"
                  >
                    <span className="affiliate-link-amazon">Amazon</span> {link.text} <span className="affiliate-link-arrow" aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
              <p className="affiliate-disclosure">{AFFILIATE_DISCLOSURE}</p>
            </div>

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


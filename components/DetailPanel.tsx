'use client'

import { useEffect } from 'react'
import { DATA, VEHICLE_CLASSES } from '@/lib/data'
import { fmtMoney, fmtNum } from '@/lib/utils'
import Link from 'next/link'
import { toSlug } from '@/lib/slugs'
import VehicleBadge from './VehicleBadge'
import SpecSection from './SpecSection'
import { filterSections } from '@/lib/spec-fields'

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
                ['EPA Range', (() => { const f = fmtNum(r.range_mi); return f.text + (typeof r.range_mi === 'number' ? ' mi' : '') })()],
                ['Cargo (3rd Row)', (() => { const f = fmtNum(r.cargo_behind_3rd_cu_ft); return f.text + (typeof r.cargo_behind_3rd_cu_ft === 'number' ? ' cu ft' : '') })()],
                ['0–60 mph', (() => { const f = fmtNum(r.zero_to_60_sec); return f.text + (typeof r.zero_to_60_sec === 'number' ? ' sec' : '') })()],
                ['DC 10–80%', (() => { const f = fmtNum(r.dc_fast_charge_10_80_min); return f.text + (typeof r.dc_fast_charge_10_80_min === 'number' ? ' min' : '') })()],
                ['Self-Driving', r.self_driving_tier ?? '—'],
                ['Seats', r.seats ?? '—'],
              ] as [string, React.ReactNode][]).map(([label, val]) => (
                <div key={label} className="detail-stat">
                  <div className="detail-stat-label">{label}</div>
                  <div className="detail-stat-value">{val}</div>
                </div>
              ))}
            </div>

            {filterSections(undefined, ['Pricing']).map(sec => (
              <SpecSection key={sec.title} title={sec.title} rows={
                sec.fields.map(f => [f.label, f.render(r)] as [string, string])
              } />
            ))}


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


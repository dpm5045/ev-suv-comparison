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


'use client'

import { useMemo } from 'react'
import { DATA, WATCHLIST_VEHICLES, GOODBYELIST_VEHICLES } from '@/lib/data'
import VehicleBadge from '../VehicleBadge'

export default function WatchListTab() {
  const watchlistEntries = useMemo(() => {
    return WATCHLIST_VEHICLES.map((v) => {
      const rows = DATA.details.filter((r) => r.vehicle === v)
      if (!rows.length) return { vehicle: v, summary: 'Details TBD.' }
      const first = rows[0]
      const notes = first.notes || ''
      const summary = notes.split('. ').slice(0, 3).join('. ').replace(/\.?$/, '.')
      return { vehicle: v, summary }
    })
  }, [])

  return (
    <div className="card watchlist-card">
      <h2 className="section-title section-title--hero">Watchlist&hellip;and Goodbyelist</h2>

      <p className="count-note" style={{ marginBottom: 12 }}>
        Announced but not yet available in the US market:
      </p>
      <div className="watchlist" style={{ marginBottom: 28 }}>
        {watchlistEntries.map((w) => (
          <div key={w.vehicle} className="watchlist-item">
            <VehicleBadge vehicle={w.vehicle} />
            <span className="watchlist-summary">{w.summary}</span>
          </div>
        ))}
      </div>

      <p className="count-note" style={{ marginBottom: 12 }}>
        Discontinued — no longer available new in the US:
      </p>
      <div className="watchlist">
        {GOODBYELIST_VEHICLES.map((g) => (
          <div key={g.vehicle} className="watchlist-item watchlist-item--goodbye">
            <VehicleBadge vehicle={g.vehicle} />
            <span className="watchlist-summary">{g.summary}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

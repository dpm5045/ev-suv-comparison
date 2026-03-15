'use client'

import { useState } from 'react'
import { DATA } from '@/lib/data'
import VehicleBadge from '../VehicleBadge'

const APPROACH_BULLETS = [
  'Prioritized manufacturer data first. OEM sources were used as the primary basis for trim structure, seating, drivetrain, range, battery, charging, displays, software, and feature availability.',
  'Used trusted third-party auto sources to close gaps. When OEM data was incomplete or inconsistent by year or trim, reputable references such as Car and Driver, Edmunds, Kelley Blue Book, and CARFAX were used to fill blanks and normalize trim naming.',
  'Separated new and pre-owned pricing methods. New pricing was estimated as Delaware County, PA out-the-door cost using MSRP, destination, and local tax/fee assumptions. Pre-owned pricing was based on used-market listings and pricing aggregators, then converted into an estimated used OTD range using the same framework.',
  'Mapped Consumer Reports fields from the provided reference. CR score inputs were populated from the supplied screenshot rather than inferred, with unsupported entries left blank or handled conservatively.',
  'Flagged uncertainty explicitly. Vehicles that were too new, unreleased, region-specific, or lacking a meaningful used market were marked as TBD, N/A, or "No meaningful used market yet" rather than assigned weak estimates.',
  'Refreshed the dataset iteratively to match the current schema. As the master workbook evolved, the dataset was reworked to align with the latest structure and remaining blanks were filled field-by-field using the best available published source.',
]

export default function AssumptionsTab() {
  const { count_data, count_totals, count_note } = DATA
  const [open, setOpen] = useState<Set<number>>(new Set())

  function toggle(i: number) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <>
      <h2 className="section-title">Approach & Assumptions</h2>

      {/* ── Approach ── */}
      <div className="card">
        <div className="card-title">Approach</div>
        <div className="approach-accordions">
          {APPROACH_BULLETS.map((b, i) => {
            const dotIdx = b.indexOf('.')
            const lead = b.slice(0, dotIdx + 1)
            const rest = b.slice(dotIdx + 1).trim()
            const isOpen = open.has(i)
            return (
              <button
                key={i}
                className={`approach-accordion${isOpen ? ' open' : ''}`}
                onClick={() => toggle(i)}
              >
                <div className="approach-accordion-header">
                  <strong>{lead}</strong>
                  <span className={`approach-chevron${isOpen ? ' open' : ''}`}>&#9662;</span>
                </div>
                {isOpen && (
                  <div className="approach-accordion-body">{rest}</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Models Analyzed ── */}
      <div className="card">
        <div className="card-title">Models Analyzed by Year</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Car Model</th>
                <th className="num">2023</th>
                <th className="num">2024</th>
                <th className="num">2025</th>
                <th className="num">2026</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {count_data.map((r) => (
                <tr key={r.model}>
                  <td><VehicleBadge vehicle={r.model} /></td>
                  <td className="num">{r.y2023 || <span className="cell-na">—</span>}</td>
                  <td className="num">{r.y2024 || <span className="cell-na">—</span>}</td>
                  <td className="num">{r.y2025 || <span className="cell-na">—</span>}</td>
                  <td className="num">{r.y2026 || <span className="cell-na">—</span>}</td>
                  <td className="num" style={{ fontWeight: 700, color: 'var(--accent)' }}>{r.total}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td style={{ fontWeight: 700 }}>Grand Total</td>
                <td className="num">{count_totals.y2023}</td>
                <td className="num">{count_totals.y2024}</td>
                <td className="num">{count_totals.y2025}</td>
                <td className="num">{count_totals.y2026}</td>
                <td className="num" style={{ color: 'var(--accent)' }}>{count_totals.total}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="count-note">{count_note}</p>
      </div>

      {/* ── Assumptions ── */}
      <div className="card">
        <div className="card-title">Pricing Assumptions</div>
        <p className="section-desc" style={{ margin: '0 0 16px' }}>
          Values used to estimate out-the-door pricing for Delaware County, PA.
        </p>
        {DATA.assumptions.map((a) => (
          <div key={a.assumption} className="assumption-row">
            <span className="assumption-name">{a.assumption}</span>
            <span className="assumption-val">{a.value}</span>
            <span className="assumption-note">{a.notes || ''}</span>
          </div>
        ))}
      </div>
    </>
  )
}

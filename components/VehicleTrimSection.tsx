'use client'

import { useState } from 'react'

interface TrimSpec {
  label: string
  value: string
}

interface TrimSection {
  title: string
  rows: TrimSpec[]
}

interface TrimData {
  id: string
  year: number
  trim: string
  msrp: string
  range: string
  hp: string
  seats: string
  notes: string
  sections: TrimSection[]
}

interface Props {
  trims: TrimData[]
}

export default function VehicleTrimSection({ trims }: Props) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  function toggleSection(key: string) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function scrollToTrim(id: string) {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      {/* Trim navigator pills (visible on mobile only via parent .cmp-card-view) */}
      <div className="trim-nav">
        {trims.map(t => (
          <button
            key={t.id}
            className="trim-nav-pill"
            onClick={() => scrollToTrim(t.id)}
          >
            {t.year} {t.trim}
          </button>
        ))}
      </div>

      {/* Accordion cards */}
      <div className="cmp-cards">
        {trims.map(t => (
          <div key={t.id} id={t.id} className="trim-accordion-card">
            <div className="trim-accordion-header">
              <div className="trim-accordion-title">{t.year} {t.trim}</div>
              <div className="trim-accordion-stats">
                <span>{t.msrp}</span>
                <span>{t.range}</span>
                <span>{t.hp}</span>
                <span>{t.seats}</span>
              </div>
            </div>
            {t.sections.map(sec => {
              const key = `${t.id}-${sec.title}`
              const isOpen = openSections[key] ?? false
              return (
                <div key={sec.title}>
                  <button
                    className={`trim-section-toggle${isOpen ? ' open' : ''}`}
                    onClick={() => toggleSection(key)}
                    aria-expanded={isOpen}
                  >
                    {sec.title}
                    <span className="chevron" aria-hidden="true">&#9662;</span>
                  </button>
                  <div className={`trim-section-content${isOpen ? ' open' : ''}`}>
                    {sec.rows.map(row => (
                      <div key={row.label} className="detail-row">
                        <span className="detail-row-label">{row.label}</span>
                        <span className="detail-row-value">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {t.notes && (
              <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                {t.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

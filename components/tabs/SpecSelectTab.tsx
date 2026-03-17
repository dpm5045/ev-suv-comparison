'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { DATA } from '@/lib/data'
import { fmtMoney, fmtNum } from '@/lib/utils'
import VehicleBadge from '../VehicleBadge'

/* ── helpers ── */

function parsePrice(s: string | null | undefined): number | null {
  if (!s) return null
  const m = s.replace(/[$,]/g, '').match(/[\d.]+/)
  return m ? parseFloat(m[0]) : null
}

function hasPreowned(r: Row): boolean {
  const p = r.preowned_range || ''
  return p.length > 0 && p.indexOf('N/A') < 0 && p.indexOf('No ') < 0
}

type Row = (typeof DATA.details)[number]

/* ── filter definitions ── */

interface FilterDef {
  key: string
  label: string
  options: { id: string; label: string }[]
  test: (r: Row, selected: string[], isPreowned: boolean) => boolean
}

const SECTIONS: { title: string; filters: FilterDef[] }[] = [
  {
    title: 'Pricing',
    filters: [
      {
        key: 'condition',
        label: 'Condition',
        options: [
          { id: 'new', label: 'New' },
          { id: 'preowned', label: 'Pre-Owned' },
        ],
        test: (r, sel) => {
          if (!sel.length) return true
          if (sel.includes('new')) return typeof r.msrp === 'number'
          if (sel.includes('preowned')) return hasPreowned(r)
          return true
        },
      },
      {
        key: 'msrp',
        label: 'MSRP',
        options: [
          { id: 'under60', label: 'Under $60k' },
          { id: '60to90', label: '$60k\u2013$90k' },
          { id: '90plus', label: '$90k+' },
        ],
        test: (r, sel) => {
          if (!sel.length) return true
          const v = r.msrp
          if (typeof v !== 'number') return false
          return sel.some(id => {
            if (id === 'under60') return v < 60000
            if (id === '60to90') return v >= 60000 && v <= 90000
            if (id === '90plus') return v > 90000
            return false
          })
        },
      },
      {
        key: 'preowned',
        label: 'Pre-Owned Price',
        options: [
          { id: 'under40', label: 'Under $40k' },
          { id: '40to55', label: '$40k\u2013$55k' },
          { id: '55plus', label: '$55k+' },
        ],
        test: (r, sel) => {
          if (!sel.length) return true
          const v = parsePrice(r.preowned_range)
          if (v === null) return false
          return sel.some(id => {
            if (id === 'under40') return v < 40000
            if (id === '40to55') return v >= 40000 && v <= 55000
            if (id === '55plus') return v > 55000
            return false
          })
        },
      },
    ],
  },
  {
    title: 'Performance & Range',
    filters: [
      {
        key: 'range',
        label: 'EPA Range',
        options: [
          { id: 'under275', label: 'Under 275 mi' },
          { id: '275to325', label: '275\u2013325 mi' },
          { id: '325plus', label: '325+ mi' },
        ],
        test: (r, sel) => {
          if (!sel.length) return true
          const v = r.range_mi
          if (typeof v !== 'number') return false
          return sel.some(id => {
            if (id === 'under275') return v < 275
            if (id === '275to325') return v >= 275 && v <= 325
            if (id === '325plus') return v > 325
            return false
          })
        },
      },
      {
        key: 'hp',
        label: 'Horsepower',
        options: [
          { id: 'under400', label: 'Under 400' },
          { id: '400to650', label: '400\u2013650' },
          { id: '650plus', label: '650+' },
        ],
        test: (r, sel) => {
          if (!sel.length) return true
          const v = r.hp
          if (typeof v !== 'number') return false
          return sel.some(id => {
            if (id === 'under400') return v < 400
            if (id === '400to650') return v >= 400 && v <= 650
            if (id === '650plus') return v > 650
            return false
          })
        },
      },
      {
        key: 'battery',
        label: 'Battery',
        options: [
          { id: 'under90', label: 'Under 90 kWh' },
          { id: '90to110', label: '90\u2013110 kWh' },
          { id: '110plus', label: '110+ kWh' },
        ],
        test: (r, sel) => {
          if (!sel.length) return true
          const v = r.battery_kwh
          if (typeof v !== 'number') return false
          return sel.some(id => {
            if (id === 'under90') return v < 90
            if (id === '90to110') return v >= 90 && v <= 110
            if (id === '110plus') return v > 110
            return false
          })
        },
      },
    ],
  },
  {
    title: 'Charging',
    filters: [
      {
        key: 'chargingType',
        label: 'Charging Type',
        options: [
          { id: 'nacs', label: 'NACS' },
          { id: 'ccs', label: 'CCS' },
        ],
        test: (r, sel) => {
          if (!sel.length) return true
          const c = r.charging_type.toLowerCase()
          return sel.some(id => {
            if (id === 'nacs') return c.startsWith('nacs') || c.includes('tesla')
            if (id === 'ccs') return c.startsWith('ccs')
            return false
          })
        },
      },
      {
        key: 'l2speed',
        label: 'L2 Charge (10\u201380%)',
        options: [
          { id: 'under5', label: 'Under 5 hrs' },
          { id: '5to8', label: '5\u20138 hrs' },
          { id: '8plus', label: '8+ hrs' },
        ],
        test: (r, sel) => {
          if (!sel.length) return true
          const v = r.l2_10_80
          if (typeof v !== 'number') return false
          return sel.some(id => {
            if (id === 'under5') return v < 5
            if (id === '5to8') return v >= 5 && v <= 8
            if (id === '8plus') return v > 8
            return false
          })
        },
      },
    ],
  },
  {
    title: 'Seating',
    filters: [
      {
        key: 'seats',
        label: 'Seats',
        options: [
          { id: '5', label: '5-seat' },
          { id: '6', label: '6-seat' },
          { id: '7', label: '7-seat' },
        ],
        test: (r, sel) => {
          if (!sel.length) return true
          return sel.includes(String(r.seats))
        },
      },
      {
        key: 'foldFlat',
        label: 'Fold Flat',
        options: [
          { id: 'Yes', label: 'Yes' },
          { id: 'No', label: 'No' },
          { id: 'Partial', label: 'Partial' },
        ],
        test: (r, sel) => {
          if (!sel.length) return true
          return sel.includes(r.fold_flat || '')
        },
      },
    ],
  },
  {
    title: 'Cargo',
    filters: [
      {
        key: 'cargo2',
        label: 'Cargo (2nd Row Folded)',
        options: [
          { id: '40plus', label: '40+ cu ft' },
          { id: '55plus', label: '55+ cu ft' },
        ],
        test: (r, sel) => {
          if (!sel.length) return true
          const v = r.cargo_behind_2nd_cu_ft
          if (typeof v !== 'number') return false
          return sel.some(id => {
            if (id === '40plus') return v >= 40
            if (id === '55plus') return v >= 55
            return false
          })
        },
      },
      {
        key: 'frunk',
        label: 'Frunk',
        options: [
          { id: 'has', label: 'Has Frunk' },
          { id: 'no', label: 'No Frunk' },
        ],
        test: (r, sel) => {
          if (!sel.length) return true
          const hasFrunk = typeof r.frunk_cu_ft === 'number' && r.frunk_cu_ft > 0
          return sel.some(id => {
            if (id === 'has') return hasFrunk
            if (id === 'no') return !hasFrunk
            return false
          })
        },
      },
    ],
  },
  {
    title: 'Technology',
    filters: [
      {
        key: 'software',
        label: 'Infotainment',
        options: [
          { id: 'carplay', label: 'CarPlay & Android Auto' },
          { id: 'oem', label: 'OEM Software Only' },
          { id: 'hybrid', label: 'Hybrid (OEM + CarPlay/Google)' },
        ],
        test: (r, sel) => {
          if (!sel.length) return true
          const sw = r.car_software.toLowerCase()
          const hasCarPlay = (sw.includes('carplay') || sw.includes('android auto')) && !sw.includes('no native') && !sw.includes('no carplay') && !sw.includes('varies')
          const isOemOnly = sw.includes('no native') || sw.includes('no carplay')
          const isHybrid = sw.includes('varies') || (sw.includes('google') && !hasCarPlay && !isOemOnly)
          return sel.some(id => {
            if (id === 'carplay') return hasCarPlay
            if (id === 'oem') return isOemOnly
            if (id === 'hybrid') return isHybrid
            return false
          })
        },
      },
      {
        key: 'drivetrain',
        label: 'Drivetrain',
        options: [
          { id: 'AWD', label: 'AWD' },
          { id: 'RWD', label: 'RWD' },
        ],
        test: (r, sel) => {
          if (!sel.length) return true
          return sel.some(id => r.drivetrain.includes(id))
        },
      },
    ],
  },
]

/* ── MultiSelect dropdown ── */

function MultiSelect({ label, allLabel, options, selected, onChange }: {
  label: string
  allLabel: string
  options: { id: string; label: string }[]
  selected: string[]
  onChange: (vals: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey) }
  }, [])

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter(v => v !== id) : [...selected, id]
    onChange(next)
  }

  const btnLabel = selected.length === 0
    ? allLabel
    : selected.length === 1
      ? options.find(o => o.id === selected[0])?.label ?? selected[0]
      : `${selected.length} selected`

  return (
    <div className="multi-select" ref={ref}>
      <button className="multi-select-btn" onClick={() => setOpen(!open)}>
        <span className="multi-select-text">{btnLabel}</span>
        <span className="multi-select-arrow">{open ? '\u25B4' : '\u25BE'}</span>
      </button>
      {open && (
        <div className="multi-select-dropdown">
          {selected.length > 0 && (
            <button className="multi-select-clear" onClick={() => onChange([])}>Select all</button>
          )}
          {options.map(opt => (
            <label key={opt.id} className="multi-select-option">
              <input type="checkbox" checked={selected.includes(opt.id)} onChange={() => toggle(opt.id)} />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── component ── */

interface Props {
  onRowClick: (idx: number) => void
}

export default function SpecSelectTab({ onRowClick }: Props) {
  const [filters, setFilters] = useState<Record<string, string[]>>({})

  const isPreowned = (filters.condition || []).includes('preowned')

  function updateFilter(key: string, vals: string[]) {
    if (key === 'condition') {
      // Single-select: keep only the last picked value, and clear price filter when switching
      const val = vals.length ? [vals[vals.length - 1]] : []
      const switchedToPreowned = val.includes('preowned')
      setFilters(prev => ({ ...prev, condition: val, msrp: switchedToPreowned ? [] : prev.msrp || [], preowned: switchedToPreowned ? prev.preowned || [] : [] }))
      return
    }
    setFilters(prev => ({ ...prev, [key]: vals }))
  }

  function resetAll() {
    setFilters({})
  }

  const activeFilterCount = Object.values(filters).filter(a => a.length > 0).length

  const filtered = useMemo(() => {
    let rows = DATA.details as Row[]
    for (const section of SECTIONS) {
      for (const f of section.filters) {
        const conditionSel = filters.condition || []
        const isNew = conditionSel.includes('new')
        const isPre = conditionSel.includes('preowned')
        // Only apply the price filter that matches the selected condition
        if (f.key === 'msrp' && !isNew) continue
        if (f.key === 'preowned' && !isPre) continue
        const sel = filters[f.key] || []
        if (sel.length) {
          rows = rows.filter(r => f.test(r, sel, isPreowned))
        }
      }
    }
    return rows
  }, [filters, isPreowned])

  return (
    <>
      <h2 className="section-title">Spec &amp; Select</h2>
      <p className="section-desc">
        Build your dream spec sheet. Select your criteria and see matching vehicles update live.
      </p>

      {/* ── Reset button ── */}
      {activeFilterCount > 0 && (
        <div className="spec-controls">
          <button className="spec-reset" onClick={resetAll}>Reset all filters</button>
        </div>
      )}

      {/* ── Filter sections with dropdowns ── */}
      <div className="spec-sections">
        {SECTIONS.map(section => {
          const conditionSel = filters.condition || []
          const isNew = conditionSel.includes('new')
          const isPre = conditionSel.includes('preowned')
          const sectionFilters = section.filters.filter(f => {
            if (f.key === 'msrp' && !isNew) return false
            if (f.key === 'preowned' && !isPre) return false
            return true
          })
          if (!sectionFilters.length) return null
          return (
            <div key={section.title} className="spec-section">
              <div className="spec-section-title">{section.title}</div>
              <div className="spec-section-body">
                {sectionFilters.map(f => {
                  const sel = filters[f.key] || []
                  return (
                    <div key={f.key} className="spec-filter-row">
                      <span className="spec-filter-label">{f.label}</span>
                      <MultiSelect
                        label={f.label}
                        allLabel={`All`}
                        options={f.options}
                        selected={sel}
                        onChange={(vals) => updateFilter(f.key, vals)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Results ── */}
      <div className="spec-results-header">
        <span className="spec-results-count">
          {filtered.length} of {DATA.details.length} trims match
          {activeFilterCount > 0 ? ' your criteria' : ''}
        </span>
      </div>

      {filtered.length > 0 ? (
        <div className="spec-results">
          {filtered.map(r => {
            const origIdx = DATA.details.indexOf(r)
            const msrp = fmtMoney(r.msrp)
            const range = fmtNum(r.range_mi)
            return (
              <div key={origIdx} className="spec-card" onClick={() => onRowClick(origIdx)}>
                <div className="spec-card-top">
                  <VehicleBadge vehicle={r.vehicle} />
                  <span className="spec-card-hint">Tap for specs &rarr;</span>
                </div>
                <div className="spec-card-trim">{r.year} {r.trim}</div>
                <div className="spec-card-stats">
                  <div className="spec-card-stat">
                    <span className="spec-card-stat-label">{isPreowned ? 'Pre-Owned' : 'MSRP'}</span>
                    <span className="spec-card-stat-value">
                      {isPreowned
                        ? (hasPreowned(r) ? r.preowned_range.replace(/\$[\d,]+/g, (m: string) => `$${Math.round(parseInt(m.replace(/[$,]/g, '')) / 1000)}k`) : '\u2014')
                        : (typeof r.msrp === 'number' ? `$${Math.round(r.msrp / 1000)}k` : msrp.text)
                      }
                    </span>
                  </div>
                  <div className="spec-card-stat">
                    <span className="spec-card-stat-label">Range</span>
                    <span className="spec-card-stat-value" style={{ color: 'var(--teal)' }}>
                      {range.text}{typeof r.range_mi === 'number' ? ' mi' : ''}
                    </span>
                  </div>
                  <div className="spec-card-stat">
                    <span className="spec-card-stat-label">HP</span>
                    <span className="spec-card-stat-value">{typeof r.hp === 'number' ? Math.round(r.hp).toLocaleString() : '\u2014'}</span>
                  </div>
                  <div className="spec-card-stat">
                    <span className="spec-card-stat-label">Seats</span>
                    <span className="spec-card-stat-value">{r.seats ?? '\u2014'}</span>
                  </div>
                  <div className="spec-card-stat">
                    <span className="spec-card-stat-label">Charging</span>
                    <span className="spec-card-stat-value">{r.charging_type || '\u2014'}</span>
                  </div>
                  <div className="spec-card-stat">
                    <span className="spec-card-stat-label">Drivetrain</span>
                    <span className="spec-card-stat-value">{r.drivetrain || '\u2014'}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ marginBottom: 12 }}>No trims match your criteria.</p>
          <button className="insight-pill active" onClick={resetAll}>Reset all filters</button>
        </div>
      )}
    </>
  )
}

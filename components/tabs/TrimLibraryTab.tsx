'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { DATA, type DetailRow } from '@/lib/data'
import { fmtMoney, fmtNum } from '@/lib/utils'
import VehicleBadge from '../VehicleBadge'

// ── Narrative builder ────────────────────────────────────────────────────────

function hasVal(v: unknown): boolean {
  if (v == null || v === '' || v === '—') return false
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (s === 'n/a' || s.startsWith('tbd') || s.startsWith('no meaningful')) return false
  }
  return true
}

function moneyStr(v: number | string | null | undefined): string | null {
  const f = fmtMoney(v)
  return f.className === 'cell-na' ? null : f.text
}

function numStr(v: number | string | null | undefined, unit: string): string | null {
  const f = fmtNum(v)
  if (f.className === 'cell-na' || f.text === '—') return null
  return `${f.text} ${unit}`
}

interface ParagraphParts {
  intro: string
  pricing: string
  performance: string
  charging: string
  tech: string
  cargo: string
  notes: string | null
}

function buildNarrative(r: DetailRow): ParagraphParts {
  // ── Intro
  const seatsStr = r.seats != null ? `${r.seats}-seat` : ''
  const dtStr = r.drivetrain || ''
  const descriptor = [seatsStr, dtStr].filter(Boolean).join(' ')
  const intro = `The ${r.year} ${r.vehicle} ${r.trim} is a${descriptor ? ` ${descriptor}` : ''} electric SUV.`

  // ── Pricing
  const priceParts: string[] = []
  const msrp = moneyStr(r.msrp)
  const otdNew = moneyStr(r.otd_new)
  if (msrp) priceParts.push(`It has an MSRP of ${msrp}`)
  if (otdNew) priceParts.push(`${msrp ? ', with' : 'With'} an estimated new out-the-door price of ${otdNew}`)
  if (hasVal(r.preowned_range) && hasVal(r.otd_preowned)) {
    priceParts.push(`. Pre-owned examples range from ${r.preowned_range}, with an estimated OTD around ${r.otd_preowned}`)
  } else if (hasVal(r.otd_preowned)) {
    priceParts.push(`. Estimated pre-owned OTD is ${r.otd_preowned}`)
  }
  const pricing = priceParts.length > 0 ? priceParts.join('') + '.' : ''

  // ── Performance
  const perfParts: string[] = []
  const range = numStr(r.range_mi, 'miles')
  const battery = numStr(r.battery_kwh, 'kWh')
  const hp = numStr(r.hp, 'hp')
  if (range || battery || hp) {
    const delivers: string[] = []
    if (range) delivers.push(`an EPA-rated range of ${range}`)
    if (battery) delivers.push(`a ${battery} battery`)
    if (hp) delivers.push(`${hp}`)
    perfParts.push(`It delivers ${delivers.join(', producing ')}`)
  }
  const performance = perfParts.length > 0 ? perfParts.join('') + '.' : ''

  // ── Charging
  const chargeParts: string[] = []
  if (hasVal(r.charging_type)) {
    chargeParts.push(`Charging is handled via ${r.charging_type}`)
  }
  if (hasVal(r.onboard_ac_kw)) {
    chargeParts.push(`${chargeParts.length ? ', with' : 'With'} a ${r.onboard_ac_kw} kW onboard AC charger`)
  }
  if (hasVal(r.l2_10_80)) {
    chargeParts.push(` — expect about ${r.l2_10_80} hours from 10–80% on Level 2`)
  }
  const charging = chargeParts.length > 0 ? chargeParts.join('') + '.' : ''

  // ── Technology
  const techParts: string[] = []
  if (hasVal(r.self_driving)) techParts.push(`${r.self_driving} driver assistance`)
  if (hasVal(r.car_software)) techParts.push(`${r.car_software} software`)
  if (hasVal(r.main_display)) techParts.push(`a ${r.main_display} main display`)
  if (hasVal(r.additional_displays)) techParts.push(`${r.additional_displays}`)
  if (hasVal(r.audio)) techParts.push(`${r.audio} audio`)
  if (hasVal(r.driver_profiles)) techParts.push(`${r.driver_profiles} driver profiles`)
  const tech = techParts.length > 0
    ? `On the tech side, it features ${techParts.join(', ')}.`
    : ''

  // ── Cargo
  const cargoParts: string[] = []
  if (r.frunk_cu_ft != null) cargoParts.push(`a ${r.frunk_cu_ft} cu ft frunk`)
  if (typeof r.cargo_behind_2nd_cu_ft === 'number') cargoParts.push(`${r.cargo_behind_2nd_cu_ft} cu ft behind the second row`)
  if (typeof r.cargo_behind_3rd_cu_ft === 'number') cargoParts.push(`${r.cargo_behind_3rd_cu_ft} cu ft behind the third row`)
  if (hasVal(r.cargo_floor_width_in)) cargoParts.push(`a cargo floor width of ${r.cargo_floor_width_in} inches between wheel wells`)
  let cargoStr = ''
  if (cargoParts.length > 0) {
    cargoStr = `For cargo, it offers ${cargoParts.join(', ')}.`
    if (r.fold_flat === 'Yes') cargoStr += ' The seats fold flat.'
    else if (r.fold_flat === 'Partial') cargoStr += ' The seats partially fold flat.'
    else if (r.fold_flat === 'No') cargoStr += ' The seats do not fold flat.'
  }

  // ── Notes
  const notes = hasVal(r.notes) ? r.notes : null

  return { intro, pricing, performance, charging, tech, cargo: cargoStr, notes }
}

// ── Quick Stats ──────────────────────────────────────────────────────────────

interface StatItem { label: string; value: string }

function quickStats(r: DetailRow): StatItem[] {
  const stats: StatItem[] = []
  const otd = moneyStr(r.otd_new)
  if (otd) stats.push({ label: 'Est. OTD New', value: otd })
  const range = numStr(r.range_mi, 'mi')
  if (range) stats.push({ label: 'Range', value: range })
  const hp = numStr(r.hp, 'hp')
  if (hp) stats.push({ label: 'Horsepower', value: hp })
  const batt = numStr(r.battery_kwh, 'kWh')
  if (batt) stats.push({ label: 'Battery', value: batt })
  if (r.seats != null) stats.push({ label: 'Seats', value: String(r.seats) })
  if (hasVal(r.charging_type)) stats.push({ label: 'Charging', value: r.charging_type })
  return stats
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TrimLibraryTab() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const vehicleFilter = searchParams.get('vehicle') ?? ''

  function setVehicle(v: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (v) params.set('vehicle', v)
    else params.delete('vehicle')
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const allVehicles = [...new Set(DATA.details.map(d => d.vehicle))].sort()

  // Group entries by vehicle, then sort by year then trim within each vehicle
  const filtered = vehicleFilter
    ? DATA.details.filter(d => d.vehicle === vehicleFilter)
    : DATA.details

  const grouped: Record<string, DetailRow[]> = {}
  for (const r of filtered) {
    if (!grouped[r.vehicle]) grouped[r.vehicle] = []
    grouped[r.vehicle].push(r)
  }
  for (const v of Object.keys(grouped)) {
    grouped[v].sort((a, b) => a.year - b.year || a.trim.localeCompare(b.trim))
  }
  const vehicleNames = Object.keys(grouped).sort()

  return (
    <>
      <h2 className="section-title">Trim Library</h2>
      <p className="section-desc">Browse detailed profiles for every trim and model year.</p>

      {/* ── Vehicle filter ── */}
      <div className="tl-filter-bar">
        <div className="filter-group">
          <span className="filter-label">Vehicle</span>
          <select value={vehicleFilter} onChange={e => setVehicle(e.target.value)}>
            <option value="">All Vehicles</option>
            {allVehicles.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* ── Vehicle sections ── */}
      {vehicleNames.map(vehicle => (
        <section key={vehicle} className="tl-vehicle-section">
          <div className="tl-vehicle-header">
            <VehicleBadge vehicle={vehicle} style={{ fontSize: 16, padding: '6px 16px' }} />
            <span className="tl-vehicle-count">{grouped[vehicle].length} trim{grouped[vehicle].length !== 1 ? 's' : ''}</span>
          </div>

          <div className="tl-cards">
            {grouped[vehicle].map(r => {
              const narrative = buildNarrative(r)
              const stats = quickStats(r)
              return (
                <article key={r.name} className="tl-card">
                  <div className="tl-card-header">
                    <span className="tl-card-year-trim">{r.year} · {r.trim}</span>
                    <div className="tl-card-badges">
                      {r.seats != null && <span className="tl-badge">{r.seats}-seat</span>}
                      {r.drivetrain && <span className="tl-badge">{r.drivetrain}</span>}
                    </div>
                  </div>

                  <div className="tl-card-narrative">
                    <p>{narrative.intro}</p>
                    {narrative.pricing && <p>{narrative.pricing}</p>}
                    {narrative.performance && <p>{narrative.performance}</p>}
                    {narrative.charging && <p>{narrative.charging}</p>}
                    {narrative.tech && <p>{narrative.tech}</p>}
                    {narrative.cargo && <p>{narrative.cargo}</p>}
                    {narrative.notes && <p className="tl-card-notes"><strong>Note:</strong> {narrative.notes}</p>}
                  </div>

                  {stats.length > 0 && (
                    <div className="tl-quick-stats">
                      {stats.map(s => (
                        <div key={s.label} className="tl-stat">
                          <span className="tl-stat-label">{s.label}</span>
                          <span className="tl-stat-value">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </>
  )
}

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { DATA } from '@/lib/data'
import { amazonSearchUrl, getChargingLinks, AFFILIATE_DISCLOSURE } from '@/lib/affiliate'

// ── Must-Have categories (always shown) ──────────────────────────────────────

const MUST_HAVES: { title: string; desc: string; query: string; category: string }[] = [
  { title: 'Level 2 Home Charger', desc: 'Charge overnight at home with a 240V Level 2 charger.', query: 'Level 2 EV home charger 240V', category: 'charging' },
  { title: 'Portable EV Charger', desc: 'Plug into any outlet on the go — essential for road trips.', query: 'portable EV charger Level 1 Level 2', category: 'charging' },
  { title: 'Charging Adapters', desc: 'NACS, CCS, and J1772 adapters for universal charging access.', query: 'EV charging adapter NACS CCS', category: 'charging' },
  { title: 'All-Weather Floor Mats', desc: 'Protect your interior from mud, snow, and spills.', query: '3 row SUV all-weather floor mats', category: 'protection' },
  { title: 'Cargo Organizers', desc: 'Keep your trunk tidy with collapsible organizers and nets.', query: 'SUV cargo organizer trunk', category: 'organization' },
  { title: 'Cargo Liner', desc: 'Full-coverage trunk protection for hauling gear.', query: '3 row SUV cargo liner', category: 'protection' },
  { title: 'Sunshades & Window Covers', desc: 'Keep your cabin cool and protect the interior.', query: 'SUV windshield sunshade', category: 'protection' },
  { title: 'Tire Inflator', desc: 'Portable tire inflator — a must for any EV without a spare.', query: 'portable tire inflator car', category: 'essentials' },
]

// ── Vehicle-specific category templates ──────────────────────────────────────

function getVehicleCategories(vehicle: string, year: string): { title: string; query: string }[] {
  return [
    { title: 'Floor Mats', query: `${year} ${vehicle} floor mats` },
    { title: 'Cargo Liner', query: `${year} ${vehicle} cargo liner` },
    { title: 'Cargo Organizer', query: `${vehicle} cargo organizer` },
    { title: 'Roof Rack / Cross Bars', query: `${vehicle} roof rack cross bars` },
    { title: 'Mud Flaps', query: `${vehicle} mud flaps` },
    { title: 'Screen Protector', query: `${vehicle} screen protector` },
    { title: 'Center Console Organizer', query: `${vehicle} center console organizer` },
  ]
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AccessoriesTab() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const av = searchParams.get('av') ?? ''
  const ay = searchParams.get('ay') ?? ''

  // Vehicle list and year list
  const allVehicles = [...new Set(DATA.details.map(d => d.vehicle))].sort()
  const yearsForVehicle = av
    ? ([...new Set(DATA.details.filter(d => d.vehicle === av).map(d => d.year))].sort((a, b) => a - b))
    : []

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    // Clear year when vehicle changes
    if (key === 'av') params.delete('ay')
    router.push(`?${params.toString()}`, { scroll: false })
  }

  // Vehicle-specific charging adapter link (only the adapter, not generic charger links)
  const adapterLink = av && ay
    ? (() => {
        const trim = DATA.details.find(d => d.vehicle === av && String(d.year) === ay)
        if (!trim) return null
        const links = getChargingLinks(trim.charging_type)
        // First link is the adapter (if any); skip the always-appended Portable/L2 links
        return links.length > 2 ? links[0] : null
      })()
    : null

  const showVehicleSection = av && ay

  return (
    <>
      <h2 className="section-title">Accessories</h2>
      <p className="section-desc">
        Curated accessories for 3-row electric SUVs. Shop by vehicle or browse EV must-haves.
      </p>

      {/* ── Filter bar ── */}
      <div className="accessories-filters">
        <div className="filter-group">
          <span className="filter-label">Vehicle</span>
          <select value={av} onChange={e => updateParam('av', e.target.value)}>
            <option value="">Select a vehicle...</option>
            {allVehicles.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <span className="filter-label">Year</span>
          <select value={ay} disabled={!av} onChange={e => updateParam('ay', e.target.value)}>
            <option value="">{av ? 'Select year...' : 'Select vehicle first'}</option>
            {yearsForVehicle.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* ── Vehicle-specific section ── */}
      {showVehicleSection && (
        <>
          <h3 className="section-title" style={{ fontSize: 18 }}>Accessories for {ay} {av}</h3>
          <p className="section-desc">Accessories designed to fit your {av}.</p>
          <div className="accessories-grid">
            {getVehicleCategories(av, ay).map(cat => (
              <div key={cat.title} className="accessories-card" data-category="vehicle">
                <div className="accessories-card-title">{cat.title}</div>
                <a
                  href={amazonSearchUrl(cat.query)}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="affiliate-link accessories-cta"
                >
                  <span className="affiliate-link-amazon">Amazon</span> Shop {cat.title} <span className="affiliate-link-arrow" aria-hidden="true">↗</span>
                </a>
              </div>
            ))}
            {adapterLink && (
              <div className="accessories-card" data-category="vehicle">
                <div className="accessories-card-title">Charging Adapter</div>
                <a
                  href={adapterLink.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="affiliate-link accessories-cta"
                >
                  <span className="affiliate-link-amazon">Amazon</span> {adapterLink.text} <span className="affiliate-link-arrow" aria-hidden="true">↗</span>
                </a>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Must-Have section ── */}
      <h3 className="section-title" style={{ fontSize: 18, marginTop: showVehicleSection ? 32 : 0 }}>Must-Have EV Accessories</h3>
      <p className="section-desc">Top-rated accessories for any 3-row electric SUV.</p>
      <div className="accessories-grid">
        {MUST_HAVES.map(cat => (
          <div key={cat.title} className="accessories-card" data-category={cat.category}>
            <div className="accessories-card-title">{cat.title}</div>
            <div className="accessories-card-desc">{cat.desc}</div>
            <a
              href={amazonSearchUrl(cat.query)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="affiliate-link accessories-cta"
            >
              <span className="affiliate-link-amazon">Amazon</span> Shop {cat.title} <span className="affiliate-link-arrow" aria-hidden="true">↗</span>
            </a>
          </div>
        ))}
      </div>

      <p className="affiliate-disclosure">{AFFILIATE_DISCLOSURE}</p>
    </>
  )
}

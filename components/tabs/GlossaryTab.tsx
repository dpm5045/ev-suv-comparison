'use client'

import { useState } from 'react'
import { DATA } from '@/lib/data'

const CHARGING_STANDARDS = [
  {
    abbr: 'NACS',
    name: 'North American Charging Standard',
    detail: 'Originally developed by Tesla and opened to the industry in 2022. NACS uses a compact, lightweight connector and is the native port on all Tesla vehicles. Starting in 2025, most major automakers are adopting NACS as their standard connector for new models, giving access to Tesla\u2019s Supercharger network without an adapter.',
  },
  {
    abbr: 'CCS1',
    name: 'Combined Charging System (Combo 1)',
    detail: 'The previous North American DC fast-charging standard, combining a J1772 AC plug with two DC pins below it. CCS1 was the dominant connector for non-Tesla EVs from roughly 2018\u20132024. Vehicles with CCS1 ports can still use the growing NACS network via a CCS-to-NACS adapter.',
  },
  {
    abbr: 'J1772',
    name: 'SAE J1772',
    detail: 'The standard Level 1 and Level 2 AC charging connector used across North America. Nearly every public Level 2 station and home charger uses a J1772 plug. NACS vehicles include a J1772 adapter; CCS1 vehicles use J1772 natively for AC charging.',
  },
  {
    abbr: 'L2',
    name: 'Level 2 Charging',
    detail: 'AC charging at 240V, typically 7\u201319 kW depending on the vehicle\u2019s onboard charger. This is the most common home and workplace charging method. A full charge usually takes 6\u201312 hours. The \u201cL2 10\u201380%\u201d column in our tables shows this window.',
  },
  {
    abbr: 'DCFC',
    name: 'DC Fast Charging',
    detail: 'High-power DC charging (50\u2013350 kW) that bypasses the onboard charger and feeds the battery directly. Typically adds 100\u2013200 miles of range in 20\u201340 minutes. Available at Supercharger, Electrify America, EVgo, and other public networks.',
  },
  {
    abbr: 'kW',
    name: 'Kilowatt',
    detail: 'A unit of power. In the context of EV charging, kW measures how fast energy flows into the battery. A 19.2 kW onboard charger accepts AC power faster than an 11 kW one. For DC fast charging, peak rates of 150\u2013350 kW are common.',
  },
  {
    abbr: 'kWh',
    name: 'Kilowatt-hour',
    detail: 'A unit of energy and the standard measure of EV battery capacity. A larger kWh pack generally means more range. For example, a 100 kWh battery stores roughly twice the energy of a 50 kWh pack.',
  },
]

const COMMON_NOTATIONS = [
  { notation: 'NACS (+CCS adpt)', meaning: 'Native NACS port; a CCS1 adapter is included or available for backward compatibility with older CCS stations.' },
  { notation: 'NACS (+CCS incl)', meaning: 'Native NACS port; a CCS1 adapter is included in the box at purchase.' },
  { notation: 'CCS (+NACS adpt)', meaning: 'Native CCS1 port; a NACS adapter is available (sometimes included) for access to Tesla Superchargers.' },
  { notation: 'CCS1', meaning: 'Native CCS1 port only. A NACS adapter may be purchased separately.' },
  { notation: 'TBD', meaning: 'Charging connector not yet confirmed by the manufacturer.' },
]

const SAE_LEVELS = [
  { level: 'Level 0', name: 'No Automation', detail: 'Driver does everything. Basic cruise control (no steering assist).' },
  { level: 'Level 1', name: 'Driver Assistance', detail: 'One function automated — either adaptive cruise control OR lane keeping, but not both simultaneously.' },
  { level: 'Level 2', name: 'Partial Automation', detail: 'Steering AND speed automated simultaneously, but the driver must monitor and be ready to intervene at all times. All vehicles in our dataset are Level 2.' },
  { level: 'Level 3', name: 'Conditional Automation', detail: 'The vehicle drives itself in specific conditions. The driver can look away but must take over when the system requests. Only Mercedes DRIVE PILOT (sedan) is certified L3 in the US.' },
  { level: 'Level 4', name: 'High Automation', detail: 'The vehicle drives itself in defined areas with no human intervention needed. Examples: Waymo robotaxis operating in geofenced cities.' },
  { level: 'Level 5', name: 'Full Automation', detail: 'The vehicle can drive itself everywhere in all conditions. No steering wheel needed. Does not exist yet.' },
]

const SELF_DRIVING_TIERS = [
  { tier: 'Basic L2', detail: 'Adaptive cruise control + lane keeping. Driver must keep hands on wheel and eyes on road at all times. Examples: Kia HDA, Hyundai HDA, Volvo Pilot Assist, Toyota Safety Sense, Mercedes Driver Assistance.' },
  { tier: 'Advanced L2', detail: 'Adds automated highway lane changes, on/off-ramp handling, or advanced multi-sensor suites beyond basic L2. Still hands-on. Examples: Rivian Driver+, Lucid DreamDrive.' },
  { tier: 'L2+ Hands-Free', detail: 'Hands-off driving on mapped and geofenced highways. Driver must keep eyes on the road and remain attentive. Example: Cadillac Super Cruise.' },
  { tier: 'L2+ Point-to-Point', detail: 'City and highway navigation with automated turns, intersections, and lane changes. Driver supervises at all times. Example: Tesla Full Self-Driving.' },
]

// Map glossary field names to sections matching the Side-by-Side tab
const GLOSSARY_SECTIONS: { title: string; fields: string[]; extra?: 'self-driving' | 'charging' }[] = [
  {
    title: 'Key Stats',
    fields: ['Model Year', 'Trim', 'Seats', 'Drivetrain', 'MSRP ($)', 'Destination ($)', 'Pre-Owned Price Range', 'EPA/Est Range (mi)', 'Horsepower (hp)', 'Battery (kWh)'],
  },
  {
    title: 'Performance',
    fields: ['Torque', '0\u201360 mph', 'Curb Weight', 'Towing Capacity'],
  },
  {
    title: 'Drivetrain & Charging',
    fields: ['Charging Type', 'DC Fast Charge (kW)', 'DC Fast Charge 10\u201380%', 'Onboard AC (kW)', 'L2 10\u201380% (hrs.)'],
    extra: 'charging',
  },
  {
    title: 'Dimensions',
    fields: ['Length', 'Width', 'Height', 'Ground Clearance', '3rd Row Legroom', '3rd Row Headroom'],
  },
  {
    title: 'Technology & Features',
    fields: ['Self Driving', 'SAE Level', 'Self Driving Tier', 'Car Software', 'Center Display', 'Gauge Cluster', 'HUD', 'Other Displays', 'Audio', 'Driver Profiles'],
    extra: 'self-driving',
  },
  {
    title: 'Cargo & Storage',
    fields: ['Frunk Volume (cu ft)', 'Behind 3rd Row (cu ft)', 'Behind 2nd Row (cu ft)', 'Behind 1st Row (cu ft)', 'Fold Flat', 'Cargo Floor Width (in)'],
  },
  {
    title: 'Notes',
    fields: ['Sources', 'Notes'],
  },
]

export default function GlossaryTab() {
  const { glossary } = DATA
  const [openSections, setOpenSections] = useState<Set<number>>(new Set())

  const toggle = (idx: number) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  // Build a map for quick lookup
  const glossaryMap = new Map(glossary.map(g => [g.field, g]))

  return (
    <>
      <h2 className="section-title">Glossary</h2>
      <p className="section-desc">
        Definitions, charging standards, and notation used throughout the comparison tables. Click a section to expand.
      </p>

      <div className="glossary-accordions">
        {GLOSSARY_SECTIONS.map((section, idx) => {
          const isOpen = openSections.has(idx)
          const entries = section.fields.map(f => glossaryMap.get(f)).filter(Boolean)

          return (
            <div key={section.title} className={`glossary-accordion ${isOpen ? 'open' : ''}`}>
              <button className="glossary-accordion-header" onClick={() => toggle(idx)}>
                <strong>{section.title}</strong>
                <span className={`approach-chevron ${isOpen ? 'open' : ''}`}>&#9662;</span>
              </button>

              {isOpen && (
                <div className="glossary-accordion-body">
                  {/* Extra content for Technology & Features: SAE levels + tiers */}
                  {section.extra === 'self-driving' && (
                    <>
                      <p className="section-desc" style={{ marginBottom: '1rem' }}>
                        The SAE J3016 standard defines six levels of driving automation (0–5). Every vehicle in our dataset is Level 2 — but there&apos;s a wide range of capability within that level. We use a four-tier system to distinguish them.
                      </p>
                      <div className="glossary-items">
                        <div style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: 13, letterSpacing: '0.05em' }}>SAE AUTOMATION LEVELS</div>
                        {SAE_LEVELS.map((s) => (
                          <div key={s.level} className="glossary-item">
                            <div className="glossary-field">
                              {s.level} <span className="glossary-full-name">&mdash; {s.name}</span>
                            </div>
                            <div className="glossary-meaning">{s.detail}</div>
                          </div>
                        ))}
                      </div>
                      <div className="glossary-items" style={{ marginTop: '1.5rem' }}>
                        <div style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: 13, letterSpacing: '0.05em' }}>OUR LEVEL 2 TIERS</div>
                        {SELF_DRIVING_TIERS.map((t) => (
                          <div key={t.tier} className="glossary-item">
                            <div className="glossary-field">{t.tier}</div>
                            <div className="glossary-meaning">{t.detail}</div>
                          </div>
                        ))}
                      </div>
                      <div className="glossary-items" style={{ marginTop: '1.5rem' }}>
                        <div style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: 13, letterSpacing: '0.05em' }}>FIELD DEFINITIONS</div>
                      </div>
                    </>
                  )}

                  {/* Extra content for Drivetrain & Charging: standards + notations */}
                  {section.extra === 'charging' && (
                    <>
                      <p className="section-desc" style={{ marginBottom: '1rem' }}>
                        EV charging has its own alphabet soup. Here&apos;s what each acronym means and why it matters.
                      </p>
                      <div className="glossary-items">
                        <div style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: 13, letterSpacing: '0.05em' }}>CHARGING STANDARDS</div>
                        {CHARGING_STANDARDS.map((s) => (
                          <div key={s.abbr} className="glossary-item">
                            <div className="glossary-field">
                              {s.abbr} <span className="glossary-full-name">&mdash; {s.name}</span>
                            </div>
                            <div className="glossary-meaning">{s.detail}</div>
                          </div>
                        ))}
                      </div>
                      <div className="glossary-items" style={{ marginTop: '1.5rem' }}>
                        <div style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: 13, letterSpacing: '0.05em' }}>TABLE NOTATION</div>
                        {COMMON_NOTATIONS.map((n) => (
                          <div key={n.notation} className="glossary-item">
                            <div className="glossary-field">{n.notation}</div>
                            <div className="glossary-meaning">{n.meaning}</div>
                          </div>
                        ))}
                      </div>
                      <div className="glossary-items" style={{ marginTop: '1.5rem' }}>
                        <div style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: 13, letterSpacing: '0.05em' }}>FIELD DEFINITIONS</div>
                      </div>
                    </>
                  )}

                  {/* Glossary field definitions for this section */}
                  {entries.map((g) => (
                    <div key={g!.field} className="glossary-item">
                      <div className="glossary-field">{g!.field}</div>
                      <div className="glossary-meaning">{g!.meaning}</div>
                      {g!.notes && <div className="glossary-notes">{g!.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

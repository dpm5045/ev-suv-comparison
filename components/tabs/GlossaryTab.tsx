'use client'

import { DATA } from '@/lib/data'
import VehicleBadge from '../VehicleBadge'

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

export default function GlossaryTab() {
  const { count_data, count_totals, count_note, glossary } = DATA

  return (
    <>
      <h2 className="section-title">Glossary</h2>
      <p className="section-desc">
        Definitions, charging standards, and notation used throughout the comparison tables.
      </p>

      {/* ── Self-Driving Levels & Tiers ── */}
      <div className="card">
        <div className="card-title">Self-Driving Levels &amp; Tiers</div>
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
      </div>

      {/* ── Charging Standards Explained ── */}
      <div className="card">
        <div className="card-title">Charging Standards &amp; Terminology</div>
        <p className="section-desc" style={{ marginBottom: '1rem' }}>
          EV charging has its own alphabet soup. Here&apos;s what each acronym means and why it matters.
        </p>
        <div className="glossary-items">
          {CHARGING_STANDARDS.map((s) => (
            <div key={s.abbr} className="glossary-item">
              <div className="glossary-field">
                {s.abbr} <span className="glossary-full-name">&mdash; {s.name}</span>
              </div>
              <div className="glossary-meaning">{s.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Charging Notation in Our Tables ── */}
      <div className="card">
        <div className="card-title">Charging Notation in Our Tables</div>
        <p className="section-desc" style={{ marginBottom: '1rem' }}>
          The &ldquo;Charging Type&rdquo; column uses shorthand to show both the native port and adapter situation.
        </p>
        <div className="glossary-items">
          {COMMON_NOTATIONS.map((n) => (
            <div key={n.notation} className="glossary-item">
              <div className="glossary-field">{n.notation}</div>
              <div className="glossary-meaning">{n.meaning}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Full Field Glossary ── */}
      <div className="card">
        <div className="card-title">Field Definitions</div>
        <p className="section-desc" style={{ marginBottom: '1rem' }}>Definitions for all fields used in the comparison tables.</p>
        {glossary.map((g) => (
          <div key={g.field} className="glossary-item">
            <div className="glossary-field">{g.field}</div>
            <div className="glossary-meaning">{g.meaning}</div>
            {g.notes && <div className="glossary-notes">{g.notes}</div>}
          </div>
        ))}
      </div>

      {/* ── Models Analyzed ── */}
      <div className="card">
        <div className="card-title">Models Analyzed by Year</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Car Model</th>
                <th className="num">2021</th>
                <th className="num">2022</th>
                <th className="num">2023</th>
                <th className="num">2024</th>
                <th className="num">2025</th>
                <th className="num">2026</th>
                <th className="num">2027</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {count_data.map((r) => (
                <tr key={r.model}>
                  <td><VehicleBadge vehicle={r.model} /></td>
                  <td className="num">{r.y2021 || <span className="cell-na">&mdash;</span>}</td>
                  <td className="num">{r.y2022 || <span className="cell-na">&mdash;</span>}</td>
                  <td className="num">{r.y2023 || <span className="cell-na">&mdash;</span>}</td>
                  <td className="num">{r.y2024 || <span className="cell-na">&mdash;</span>}</td>
                  <td className="num">{r.y2025 || <span className="cell-na">&mdash;</span>}</td>
                  <td className="num">{r.y2026 || <span className="cell-na">&mdash;</span>}</td>
                  <td className="num">{r.y2027 || <span className="cell-na">&mdash;</span>}</td>
                  <td className="num" style={{ fontWeight: 700, color: 'var(--accent)' }}>{r.total}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td style={{ fontWeight: 700 }}>Grand Total</td>
                <td className="num">{count_totals.y2021}</td>
                <td className="num">{count_totals.y2022}</td>
                <td className="num">{count_totals.y2023}</td>
                <td className="num">{count_totals.y2024}</td>
                <td className="num">{count_totals.y2025}</td>
                <td className="num">{count_totals.y2026}</td>
                <td className="num">{count_totals.y2027}</td>
                <td className="num" style={{ color: 'var(--accent)' }}>{count_totals.total}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="count-note">{count_note}</p>
      </div>
    </>
  )
}

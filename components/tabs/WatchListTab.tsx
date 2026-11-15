'use client'

import Link from 'next/link'
import { DATA, WATCHLIST_VEHICLES, GOODBYELIST_VEHICLES, VEHICLE_CLASSES, type DetailRow } from '@/lib/data'
import { toSlug } from '@/lib/slugs'
import {
  ARRIVAL_WINDOWS,
  MODEL_YEAR_NEWS,
  WATCHLIST_META,
  WATCH_STATUS_LABEL,
  type WatchMeta,
} from '@/lib/watchlist'

/* ── helpers (all values derived from ev-data.json) ── */

const nums = (vals: unknown[]): number[] =>
  vals.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

function spanText(vals: number[]): string {
  if (!vals.length) return 'TBD'
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  return lo === hi ? lo.toLocaleString('en-US') : `${lo.toLocaleString('en-US')}–${hi.toLocaleString('en-US')}`
}

function batteryText(vals: number[]): string {
  const uniq = [...new Set(vals)].sort((a, b) => a - b)
  if (!uniq.length) return 'TBD'
  if (uniq.length === 1) return String(Math.round(uniq[0] * 10) / 10)
  return uniq.map((v) => Math.round(v)).join(' / ')
}

const money = (n: number) => `$${n.toLocaleString('en-US')}`

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function arrivalCard(vehicle: string) {
  const rows = DATA.details.filter((r) => r.vehicle === vehicle)
  const meta: WatchMeta = WATCHLIST_META[vehicle] ?? {
    make: vehicle,
    model: '',
    status: 'revealed',
    window: null,
    windowLabel: 'Timing not announced',
    blurb: rows[0]?.notes?.split('. ').slice(0, 2).join('. ') ?? '',
  }
  const priced = rows
    .map((r) => (typeof r.msrp === 'number' ? r.msrp + (typeof r.destination === 'number' ? r.destination : 0) : null))
    .filter((v): v is number => v !== null)
  return {
    vehicle,
    meta,
    cls: VEHICLE_CLASSES[vehicle] ?? '',
    range: spanText(nums(rows.map((r) => r.range_mi))),
    hp: spanText(nums(rows.map((r) => r.hp))),
    battery: batteryText(nums(rows.map((r) => r.battery_kwh))),
    price: priced.length ? money(Math.min(...priced)) : null,
  }
}

function trimList(vehicle: string, year: number) {
  return DATA.details
    .filter((r: DetailRow) => r.vehicle === vehicle && r.year === year)
    .map((r) => ({ trim: r.trim, msrp: typeof r.msrp === 'number' ? r.msrp : null }))
    .sort((a, b) => (a.msrp ?? Infinity) - (b.msrp ?? Infinity))
}

/* ── page ── */

export default function WatchListTab() {
  const arrivals = WATCHLIST_VEHICLES.map(arrivalCard)
  const newsYear = Math.max(...MODEL_YEAR_NEWS.map((n) => n.year))
  const news = MODEL_YEAR_NEWS.filter((n) => n.year === newsYear).map((n) => ({
    ...n,
    cls: VEHICLE_CLASSES[n.vehicle] ?? '',
    trims: trimList(n.vehicle, n.year),
  }))
  const newTrimCount = news.reduce((s, n) => s + n.trims.length, 0)

  return (
    <div className="wl">
      {/* Hero */}
      <section className="wl-hero">
        <div className="wl-hero-copy">
          <div className="wl-eyebrow">Updated {fmtDate(DATA.last_updated)}</div>
          <h1 className="wl-hero-title">
            What&rsquo;s coming.<br />
            What&rsquo;s changing.<br />
            <span className="wl-muted">What&rsquo;s gone.</span>
          </h1>
          <p className="wl-hero-desc">
            Every three-row EV headed for US driveways, the model-year updates to the ones already here, and the
            ones that have left the market.
          </p>
        </div>
        <nav className="wl-jump" aria-label="Jump to section">
          <a href="#arrivals" className="wl-jump-tile">
            <span className="wl-jump-num wl-num--green">{arrivals.length}</span>
            <span className="wl-jump-label">arriving</span>
          </a>
          <a href="#new-model-year" className="wl-jump-tile">
            <span className="wl-jump-num wl-num--accent">{newTrimCount}</span>
            <span className="wl-jump-label">new {newsYear} trims</span>
          </a>
          <a href="#departures" className="wl-jump-tile">
            <span className="wl-jump-num wl-num--red">{GOODBYELIST_VEHICLES.length}</span>
            <span className="wl-jump-label">departed</span>
          </a>
        </nav>
      </section>

      {/* Arrivals */}
      <section id="arrivals" className="wl-section">
        <div className="wl-section-head">
          <h2 className="wl-h2">Arrivals</h2>
          <p className="wl-section-desc">Announced, not yet on sale in the US. Windows are the makers&rsquo; own.</p>
        </div>

        <div className="wl-timeline-box">
          <div className="wl-timeline" role="table" aria-label="Expected US arrival windows">
            <div className="wl-tl-row wl-tl-head" role="row">
              <div role="columnheader">Model</div>
              {ARRIVAL_WINDOWS.map((w) => (
                <div key={w} role="columnheader">{w}</div>
              ))}
            </div>
            {arrivals.map((a) => (
              <div key={a.vehicle} className="wl-tl-row" role="row">
                <div className="wl-tl-name" role="rowheader">{a.vehicle}</div>
                {a.meta.window ? (
                  <div
                    role="cell"
                    className={`wl-tl-bar ${a.cls}`}
                    style={{ gridColumn: `${a.meta.window[0] + 2} / span ${a.meta.window[1]}` }}
                  >
                    {a.meta.windowLabel}
                  </div>
                ) : (
                  <div
                    role="cell"
                    className="wl-tl-bar wl-tl-bar--unknown"
                    style={{ gridColumn: `2 / span ${ARRIVAL_WINDOWS.length}` }}
                  >
                    {a.meta.windowLabel}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="wl-grid">
          {arrivals.map((a) => (
            <article key={a.vehicle} className="wl-card">
              <div className="wl-card-top">
                <span className={`wl-make ${a.cls}`}>{a.meta.make}</span>
                <span className={`wl-chip wl-chip--${a.meta.status}`}>{WATCH_STATUS_LABEL[a.meta.status]}</span>
              </div>
              <div className="wl-card-title">
                <h3 className="wl-h3">
                  <Link href={`/vehicles/${toSlug(a.vehicle)}`} className="wl-card-link">{a.meta.model || a.vehicle}</Link>
                </h3>
                <p className="wl-card-blurb">{a.meta.blurb}</p>
              </div>
              <p className="wl-card-window">{a.meta.windowLabel}</p>
              <div className="wl-stats">
                <div className="wl-stat">
                  <span className={`wl-stat-val${a.range === 'TBD' ? ' wl-muted' : ''}`}>{a.range}</span>
                  <span className="wl-stat-label">mi range</span>
                </div>
                <div className="wl-stat">
                  <span className={`wl-stat-val${a.hp === 'TBD' ? ' wl-muted' : ''}`}>{a.hp}</span>
                  <span className="wl-stat-label">hp</span>
                </div>
                <div className="wl-stat">
                  <span className={`wl-stat-val${a.battery === 'TBD' ? ' wl-muted' : ''}`}>{a.battery}</span>
                  <span className="wl-stat-label">kWh</span>
                </div>
              </div>
              <div className="wl-price-row">
                {a.price ? (
                  <>
                    <span className="wl-price-label">From, with delivery</span>
                    <span className={`wl-price ${a.cls}`}>{a.price}</span>
                  </>
                ) : (
                  <>
                    <span className="wl-price-label">{a.meta.priceNote ? 'Press estimate' : 'Price'}</span>
                    <span className="wl-price wl-muted">
                      {a.meta.priceNote ? a.meta.priceNote.replace(/^Press estimate\s*/, '') : 'Not announced'}
                    </span>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* New model year */}
      <section id="new-model-year" className="wl-section wl-section--spaced">
        <div className="wl-section-head">
          <h2 className="wl-h2">
            New for <span className="wl-year">{newsYear}</span>
          </h2>
          <p className="wl-section-desc">Model-year announcements for vehicles already on sale. Prices exclude destination.</p>
        </div>
        <div className="wl-grid">
          {news.map((n) => (
            <article key={n.vehicle} className="wl-card wl-card--news">
              <div className="wl-news-body">
                <div className="wl-card-top">
                  <Link href={`/vehicles/${toSlug(n.vehicle)}`} className={`wl-make ${n.cls}`}>{n.vehicle}</Link>
                  <span className="wl-news-tag">{n.tag}</span>
                </div>
                <p className="wl-news-headline">{n.headline}</p>
                <ul className="wl-news-bullets">
                  {n.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
              <div className="wl-trims">
                {n.trims.map((t) => (
                  <div key={t.trim} className="wl-trim-row">
                    <span>{t.trim}</span>
                    <span>{t.msrp !== null ? money(t.msrp) : 'TBD'}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Departures */}
      <section id="departures" className="wl-section wl-section--spaced">
        <div className="wl-section-head">
          <h2 className="wl-h2">Departures</h2>
          <p className="wl-section-desc">No longer built for the US. Used pricing stays in the comparison.</p>
        </div>
        {GOODBYELIST_VEHICLES.map((g) => (
          <article key={g.vehicle} className="wl-card wl-departure">
            <div className="wl-departure-copy">
              <div className="wl-card-top wl-card-top--start">
                <span className={`wl-make ${VEHICLE_CLASSES[g.vehicle] ?? ''}`}>{g.vehicle.split(' ')[0]}</span>
                <span className="wl-chip wl-chip--gone">Discontinued</span>
              </div>
              <h3 className="wl-h3">
                <Link href={`/vehicles/${toSlug(g.vehicle)}`} className="wl-card-link">{g.vehicle.split(' ').slice(1).join(' ') || g.vehicle}</Link>
              </h3>
              <p className="wl-card-blurb">{g.summary}</p>
            </div>
            <div className="wl-departure-side">
              {g.years && <span className="wl-departure-years">{g.years}</span>}
              <Link href={`/vehicles/${toSlug(g.vehicle)}`} className="wl-link">
                See used {g.vehicle} pricing
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

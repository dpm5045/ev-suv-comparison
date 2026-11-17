'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { DATA, isWatchlistVehicle } from '@/lib/data'
import type { InsightFilters } from '../filter-types'
import VehicleBadge from '../VehicleBadge'
import { toSlug } from '@/lib/slugs'
import { chartColor } from '@/lib/vehicle-theme'
import { useIsLightTheme } from '../useIsLightTheme'
import {
  PREFERENCE_OPTIONS,
  SPEED_DATING_DEFAULTS,
  formatMetric,
  parseSpeedDatingParams,
  rankConfigurations,
  type ScoredConfig,
} from '@/lib/speed-dating'
import { MIN_SPEED_DATING_SEATS, budgetBuckets as bucketsFor, eligibleRows } from '@/lib/selection'
import { dataYear } from '@/lib/data-stories'
import { COST_PER_MILE_DEK, RANGE_STORY_HEADLINE, choiceHeadline, priceHeadline } from '@/lib/data-stories'
import { CostPerMileChart, costPerMileHeadline, costPerMileSource } from '../DataStories'

type Row = (typeof DATA.details)[number]

/** Lower-case pick names for the verdict sentence. */
const PICK_NOUN: Record<string, string> = {
  range: 'range',
  storage: 'storage',
  power: 'acceleration',
  charging: 'charging speed',
  selfdriving: 'self-driving',
}

const prefLabel = (id: string) => PREFERENCE_OPTIONS.find((p) => p.id === id)?.label ?? id
const dollarsK = (n: number) => `$${Math.round(n / 1000)}k`

interface Bar {
  pref: string
  label: string
  value: string
  fraction: number
  tone: 'first' | 'second'
}

interface Ranked {
  match: ScoredConfig
  rank: number
  score: number
  bars: Bar[]
}

/* ── component ── */

interface OverviewTabProps {
  condition: string
  budget: string
  pref1: string
  pref2: string
  onFiltersChange: (f: Partial<InsightFilters>, replace?: boolean) => void
  onVehicleClick?: (vehicle: string) => void
}

export default function OverviewTab({ condition, budget, pref1, pref2, onFiltersChange, onVehicleClick }: OverviewTabProps) {
  // Fill in the default picks once, on first load (a ref, not state: nothing re-renders)
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const defaults: Partial<InsightFilters> = {}
    if (!condition) defaults.condition = SPEED_DATING_DEFAULTS.condition
    if (!budget) defaults.budget = SPEED_DATING_DEFAULTS.budget
    if (!pref1 && !pref2) {
      defaults.pref1 = SPEED_DATING_DEFAULTS.pref1
      defaults.pref2 = SPEED_DATING_DEFAULTS.pref2
    }
    if (Object.keys(defaults).length) {
      onFiltersChange({
        condition: condition || SPEED_DATING_DEFAULTS.condition,
        budget: budget || SPEED_DATING_DEFAULTS.budget,
        pref1: pref1 || defaults.pref1 || '',
        pref2: pref2 || defaults.pref2 || '',
      }, true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Unknown URL values fall back to the documented defaults
  const settings = parseSpeedDatingParams({ condition, budget, pref1, pref2 }, bucketsFor)
  const activeCondition = settings.condition
  const isPreowned = activeCondition === 'preowned'
  const activePref1 = settings.pref1
  const activePref2 = settings.pref2
  const budgetBuckets = bucketsFor(activeCondition)
  const activeBudget: string = settings.budget
  const sixSeatPicked = activePref1 === 'sixseat' || activePref2 === 'sixseat'

  // Computed each render: ~165 rows, well under a millisecond, so no manual
  // memoization (which React 19's compiler rules can't verify here).

  /* --- eligible configurations: condition and budget apply independently --- */
  const filteredDetails = eligibleRows(DATA.details as Row[], {
    condition: activeCondition,
    budget: activeBudget,
    sixSeat: sixSeatPicked,
    dataYear,
    exclude: isWatchlistVehicle,
    minSeats: MIN_SPEED_DATING_SEATS,
  })

  /* --- ranked: each vehicle by its best real configuration --- */
  const matches = rankConfigurations(filteredDetails, activePref1, activePref2, activeCondition)
  const effectivePrefs: string[] = matches[0]?.metrics.map((m) => m.pref) ?? []
  const ranked: Ranked[] = matches.map((m) => ({
    match: m,
    rank: m.rank,
    score: Math.round(m.composite * 100),
    bars: m.metrics.map((x, i) => ({
      pref: x.pref,
      label: prefLabel(x.pref),
      value: formatMetric(x.pref, x.value, m.row),
      fraction: x.share,
      tone: i === 0 ? 'first' : 'second',
    })),
  }))

  const isLight = useIsLightTheme()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    function sync() {
      const t = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
      setTheme(t)
    }
    sync()
    window.addEventListener('theme-change', sync)
    return () => window.removeEventListener('theme-change', sync)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem('theme', next)
    localStorage.setItem('theme-unlocked', 'true')
    // Dispatch custom event so Header can pick up the unlock
    window.dispatchEvent(new Event('theme-change'))
  }

  function handleCondition(id: string) {
    onFiltersChange({ condition: id, budget: 'all' })
  }

  function handleBudget(id: string) {
    onFiltersChange({ budget: id })
  }

  function handlePref(id: string) {
    if (id === activePref1) {
      onFiltersChange({ pref1: activePref2, pref2: '' })
    } else if (id === activePref2) {
      onFiltersChange({ pref2: '' })
    } else if (!activePref1) {
      onFiltersChange({ pref1: id })
    } else if (!activePref2) {
      onFiltersChange({ pref2: id })
    } else {
      onFiltersChange({ pref1: activePref2, pref2: id })
    }
  }

  /* --- display helpers --- */

  /** Price of the configuration shown (the one every bar describes). */
  function priceText(m: ScoredConfig, top: boolean): string {
    const r = m.row
    if (isPreowned) {
      if (r.preowned_low === null) return '—'
      const span = r.preowned_high !== null && r.preowned_high !== r.preowned_low ? `${dollarsK(r.preowned_low)}–${dollarsK(r.preowned_high)}` : dollarsK(r.preowned_low)
      return `${span}${top ? ' pre-owned' : ''}`
    }
    return typeof r.msrp === 'number' ? `${dollarsK(r.msrp)} MSRP` : '—'
  }

  /** Which configuration this is, e.g. "2024 Pro S RWD · 7 seats". */
  function configText(m: ScoredConfig): string {
    const r = m.row
    return `${r.year} ${r.trim}${typeof r.seats === 'number' ? ` · ${r.seats} seats` : ''}`
  }

  /** Model-level context, labelled as such. */
  function fitText(m: ScoredConfig): string {
    const n = m.trimCount
    const lo = m.priceLow
    const hi = m.priceHigh
    const span = lo === null ? '' : hi !== null && hi !== lo ? `${dollarsK(lo)}–${dollarsK(hi)}` : dollarsK(lo)
    const what = isPreowned ? 'starting at' : 'MSRP'
    return `${n} ${n === 1 ? 'trim fits' : 'trims fit'} your budget${span ? ` · ${what} ${span}` : ''}`
  }

  function compareHref(m: ScoredConfig): string {
    const r = m.row
    const q = new URLSearchParams({ v1: r.vehicle, y1: String(r.year), t1: r.trim })
    if (typeof r.seats === 'number') q.set('s1', String(r.seats))
    return `/side-by-side?${q.toString()}`
  }

  function verdict(top: Ranked): string {
    const [p1, p2] = effectivePrefs
    const bestOn = (p: string) => (top.bars.find((b) => b.pref === p)?.fraction ?? 0) >= 0.9999
    if (!p2) return `The best ${PICK_NOUN[p1]} in your budget.`
    const b1 = bestOn(p1)
    const b2 = bestOn(p2)
    if (b1 && b2) return 'Leads the field on both of your picks.'
    if (b1) return `The best ${PICK_NOUN[p1]} in your budget.`
    if (b2) return `The best ${PICK_NOUN[p2]} of the bunch, with the ${PICK_NOUN[p1]} to match.`
    return `The best balance of ${PICK_NOUN[p1]} and ${PICK_NOUN[p2]} in your budget.`
  }

  function badge(vehicle: string) {
    return onVehicleClick ? (
      <button type="button" className="sd-badge-btn" onClick={() => onVehicleClick(vehicle)} aria-label={`${vehicle} summary`}>
        <VehicleBadge vehicle={vehicle} />
      </button>
    ) : (
      <VehicleBadge vehicle={vehicle} />
    )
  }

  function bars(r: Ranked, size: 'lg' | 'md' | 'sm') {
    return (
      <div className={`sd-bars sd-bars--${size}`}>
        {r.bars.map((b) => (
          <div key={b.pref} className="sd-bar-row">
            {size !== 'sm' && <span className="sd-bar-label">{b.label}</span>}
            <div className="sd-bar-track">
              <div className={`sd-bar-fill sd-bar-fill--${b.tone}`} style={{ width: `${Math.round(b.fraction * 100)}%` }} />
            </div>
            <span className="sd-bar-value">{b.value}</span>
          </div>
        ))}
      </div>
    )
  }

  const top = ranked[0]
  const runnersUp = ranked.slice(1, 3)
  const rest = ranked.slice(3)
  const topColor = top ? chartColor(top.match.vehicle, isLight) : ''

  return (
    <>
      <div className="overview-hero">
        <div className="overview-hero-text">
          <div className="page-eyebrow">Let&apos;s go speed dating</div>
          <h1 className="overview-hero-title">Find your perfect 3-row EV.</h1>
          <p className="overview-hero-sub">
            Shopping for a family hauler shouldn&apos;t take forty browser tabs. Answer three questions and we&apos;ll play matchmaker.
          </p>
        </div>
        <div className="overview-hero-image" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
          <picture>
            <source media="(max-width: 767px)" srcSet={theme === 'light' ? '/hero-sketch-light-mobile.webp' : '/hero-sketch-mobile.webp'} type="image/webp" />
            <source media="(max-width: 767px)" srcSet={theme === 'light' ? '/hero-sketch-light-mobile.png' : '/hero-sketch-mobile.png'} type="image/png" />
            <source srcSet={theme === 'light' ? '/hero-sketch-light.webp' : '/hero-sketch-dark.webp'} type="image/webp" />
            <img src={theme === 'light' ? '/hero-sketch-light.png' : '/hero-sketch-dark.png'} alt="3-Row EV concept sketch" width={800} height={450} loading="eager" fetchPriority="high" />
          </picture>
        </div>
      </div>

      <div className="sd-layout">
        {/* ── Questions ── */}
        <div className="sd-panel">
          <div className="sd-question">
            <div className="sd-q-head"><span className="sd-q-num">1</span><span className="sd-q-label">New or pre-owned?</span></div>
            <div className="sd-pills">
              {[{ id: 'new', label: 'New' }, { id: 'preowned', label: 'Pre-owned' }].map((c) => (
                <button key={c.id} type="button" aria-pressed={activeCondition === c.id}
                  className={`sd-pill${activeCondition === c.id ? ' sd-pill--on' : ''}`} onClick={() => handleCondition(c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sd-question">
            <div className="sd-q-head"><span className="sd-q-num">2</span><span className="sd-q-label">What&apos;s the budget?</span></div>
            <div className="sd-pills">
              {budgetBuckets.map((b) => (
                <button key={b.id} type="button" aria-pressed={activeBudget === b.id}
                  className={`sd-pill${activeBudget === b.id ? ' sd-pill--on' : ''}`} onClick={() => handleBudget(b.id)}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sd-question">
            <div className="sd-q-head"><span className="sd-q-num">3</span><span className="sd-q-label">What&apos;s most important?</span></div>
            <p className="sd-q-help">Pick two, in order. Your first pick counts for 60% of the score.</p>
            <div className="sd-pills">
              {PREFERENCE_OPTIONS.map((p) => {
                const isFirst = activePref1 === p.id
                const isSecond = activePref2 === p.id
                return (
                  <button key={p.id} type="button" aria-pressed={isFirst || isSecond}
                    className={`sd-pill${isFirst ? ' sd-pill--first' : ''}${isSecond ? ' sd-pill--second' : ''}`}
                    onClick={() => handlePref(p.id)}>
                    {(isFirst || isSecond) && <span className="sd-pill-num">{isFirst ? 1 : 2}</span>}
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="sd-panel-foot">
            <span>
              <span className="sd-num">{ranked.length}</span> models and <span className="sd-num">{filteredDetails.length}</span> trims are still in the room.
            </span>
            <details className="sd-math">
              <summary>How is the math mathing?</summary>
              <p>
                Every trim that fits your budget is scored on its own specs: the best value in the room gets full marks, and the rest get their share of it (for 0&ndash;60 and charging time, quicker is better). Storage is the space behind the third row. Self-driving is ranked by tier, one tier lower on older hardware. Each model is then shown by its best-scoring trim, so the numbers on a card all belong to one car you can buy.{' '}
                {effectivePrefs.length === 2
                  ? `Your first pick (${prefLabel(effectivePrefs[0])}) counts 60%, your second (${prefLabel(effectivePrefs[1])}) counts 40%.`
                  : effectivePrefs.length === 1
                    ? `Ranked by ${prefLabel(effectivePrefs[0])} only.`
                    : 'Pick at least one priority to rank the field.'}
                {sixSeatPicked && ' Filtered to 6-seat vehicles only.'}
              </p>
            </details>
          </div>
        </div>

        {/* ── Results ── */}
        <div className="sd-results">
          {filteredDetails.length === 0 ? (
            <div className="sd-card sd-empty">
              <p>No trims match this {isPreowned ? 'pre-owned price' : 'budget'} range.</p>
              <button type="button" className="sd-pill sd-pill--on" onClick={() => handleBudget('all')}>Show any price</button>
            </div>
          ) : !top ? (
            <div className="sd-card sd-empty">
              <p>Pick at least one thing that matters to you and we&apos;ll rank the field.</p>
            </div>
          ) : (
            <>
              <article
                className="sd-top"
                style={{
                  background: `color-mix(in srgb, ${topColor} 10%, var(--surface))`,
                  borderColor: `color-mix(in srgb, ${topColor} 35%, var(--border))`,
                }}
              >
                <div className="sd-top-main">
                  <div className="sd-top-head">
                    <span className="sd-rank">#{top.rank}</span>
                    {badge(top.match.vehicle)}
                    <span className="sd-match-chip">It&apos;s a match</span>
                  </div>
                  <p className="sd-config">{configText(top.match)}</p>
                  <p className="sd-verdict">{verdict(top)}</p>
                  {bars(top, 'lg')}
                  <div className="sd-top-foot">
                    <span className="sd-price">{priceText(top.match, true)}</span>
                    <Link href={`/vehicles/${toSlug(top.match.vehicle)}`} className="sd-link">See trims</Link>
                    <Link href={compareHref(top.match)} className="sd-link">Compare</Link>
                  </div>
                  <p className="sd-fit">{fitText(top.match)}</p>
                </div>
                <div className="sd-top-score">
                  <span className="sd-score-big">{top.score}</span>
                  <span className="sd-score-caption">match score</span>
                </div>
              </article>

              {runnersUp.length > 0 && (
                <>
                  <h2 className="sd-subhead">Also worth a second date</h2>
                  <div className="sd-cards">
                    {runnersUp.map((r) => (
                      <article key={r.match.vehicle} className="sd-card">
                        <div className="sd-card-head">
                          <div className="sd-card-id"><span className="sd-rank">#{r.rank}</span>{badge(r.match.vehicle)}</div>
                          <span className="sd-score-md">{r.score}</span>
                        </div>
                        <p className="sd-config">{configText(r.match)}</p>
                        {bars(r, 'md')}
                        <div className="sd-card-foot">
                          <span className="sd-price">{priceText(r.match, false)}</span>
                          <Link href={`/vehicles/${toSlug(r.match.vehicle)}`} className="sd-link">See trims</Link>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}

              {rest.length > 0 && (
                <div className="sd-rest-box">
                  <div className="sd-rest">
                    <div className="sd-rest-row sd-rest-head" style={{ gridTemplateColumns: `36px 210px 120px repeat(${effectivePrefs.length}, minmax(0, 1fr))` }}>
                      <span />
                      <span>Still in the running</span>
                      <span>Price</span>
                      {effectivePrefs.map((p) => <span key={p}>{prefLabel(p)}</span>)}
                    </div>
                    {rest.map((r) => (
                      <div key={r.match.vehicle} className="sd-rest-row" style={{ gridTemplateColumns: `36px 210px 120px repeat(${effectivePrefs.length}, minmax(0, 1fr))` }}>
                        <span className="sd-rank">#{r.rank}</span>
                        <span>{badge(r.match.vehicle)}<span className="sd-config sd-config--sm">{configText(r.match)}</span></span>
                        <span className="sd-price">{priceText(r.match, false)}</span>
                        {r.bars.map((b) => (
                          <div key={b.pref} className="sd-bar-row sd-bar-row--cell">
                            <div className="sd-bar-track">
                              <div className={`sd-bar-fill sd-bar-fill--${b.tone}`} style={{ width: `${Math.round(b.fraction * 100)}%` }} />
                            </div>
                            <span className="sd-bar-value">{b.value}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    <p className="sd-rest-note">Each model is shown by its best trim that fits your budget; bars compare that trim with the best in the room.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Chart teaser ── */}
      <section className="sd-teaser">
        <div className="sd-teaser-story">
          <div className="ds-rule" />
          <div className="ds-kicker">Something we noticed</div>
          <h2 className="ds-headline">{costPerMileHeadline()}</h2>
          <p className="ds-dek">{COST_PER_MILE_DEK}</p>
          <figure className="ds-figure" role="img" aria-label="Bar chart of MSRP per mile of rated range for each model.">
            <CostPerMileChart />
          </figure>
          <p className="ds-source">{costPerMileSource()}</p>
        </div>
        <div className="sd-teaser-more">
          <div className="ds-kicker">More in Market Insights</div>
          <Link href="/market-insights" className="sd-more-link">{choiceHeadline()}</Link>
          <Link href="/market-insights" className="sd-more-link">{priceHeadline()}</Link>
          <Link href="/market-insights" className="sd-more-link">{RANGE_STORY_HEADLINE}</Link>
          <Link href="/market-insights" className="sd-open-data">Open Market Insights</Link>
        </div>
      </section>
    </>
  )
}

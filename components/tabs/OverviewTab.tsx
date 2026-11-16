'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DATA, isWatchlistVehicle } from '@/lib/data'
import type { InsightFilters } from '../filter-types'
import VehicleBadge from '../VehicleBadge'
import { toSlug } from '@/lib/slugs'
import { chartColor } from '@/lib/vehicle-theme'
import { useIsLightTheme } from '../useIsLightTheme'
import {
  NEW_BUDGET_BUCKETS,
  PREOWNED_BUDGET_BUCKETS,
  PREFERENCE_OPTIONS,
  SPEED_DATING_DEFAULTS,
  computeRanks,
  extractMetric,
  formatRawMetric,
  hasPreowned,
  summarizeInBudget,
  type SpeedDatingMatch,
} from '@/lib/speed-dating'
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

/** Picks where a smaller number is better. */
const LOWER_IS_BETTER = new Set(['power', 'charging'])

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
  match: SpeedDatingMatch
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
  const [initialized, setInitialized] = useState(false)
  useEffect(() => {
    if (initialized) return
    setInitialized(true)
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

  const activeCondition = condition || SPEED_DATING_DEFAULTS.condition
  const isPreowned = activeCondition === 'preowned'
  const activePref1 = pref1
  const activePref2 = pref2

  const budgetBuckets = isPreowned ? PREOWNED_BUDGET_BUCKETS : NEW_BUDGET_BUCKETS
  const requestedBudget = budget || SPEED_DATING_DEFAULTS.budget
  const activeBudget: string = budgetBuckets.some((b) => b.id === requestedBudget) ? requestedBudget : 'all'

  /* --- filtered details --- */
  const filteredDetails = useMemo(() => {
    const bucketFilter = budgetBuckets.find((b) => b.id === activeBudget)?.filter ?? (() => true)
    let rows = (DATA.details as Row[]).filter((r) => !isWatchlistVehicle(r.vehicle))
    if (isPreowned) {
      // Only trims with valid pre-owned data
      rows = rows.filter(hasPreowned)
      if (activeBudget !== 'all') {
        rows = rows.filter((r) => {
          const price = r.preowned_low
          return price !== null && bucketFilter(price)
        })
      }
    } else {
      if (activeBudget !== 'all') {
        rows = rows.filter((r) => typeof r.msrp === 'number' && bucketFilter(r.msrp as number))
      }
    }
    if (activePref1 === 'sixseat' || activePref2 === 'sixseat') {
      rows = rows.filter((r) => r.seats === 6)
    }
    return rows
  }, [activeBudget, budgetBuckets, isPreowned, activePref1, activePref2])

  /* --- ranked matches (scored only on in-budget trims) --- */
  const { ranked, effectivePrefs } = useMemo(() => {
    const matches = summarizeInBudget(filteredDetails, isPreowned)
    const result = computeRanks(matches, activePref1, activePref2)
    const prefs = result.effectivePrefs

    // Best value among the matches for each pick (bars are drawn relative to it)
    const best = new Map<string, number>()
    for (const p of prefs) {
      const vals = matches.map((m) => extractMetric(m, p)).filter((v): v is number => v !== null && v !== 0)
      if (vals.length) best.set(p, LOWER_IS_BETTER.has(p) ? Math.min(...vals) : Math.max(...vals))
    }

    const list: Ranked[] = matches
      .filter((m) => result.ranks.has(m.vehicle))
      .map((m) => ({
        match: m,
        rank: result.ranks.get(m.vehicle)!,
        score: Math.round((result.composites.get(m.vehicle) ?? 0) * 100),
        bars: prefs.map((p, i) => {
          const v = extractMetric(m, p)
          const b = best.get(p)
          const has = v !== null && v !== 0 && b !== undefined
          const fraction = has ? (LOWER_IS_BETTER.has(p) ? b! / v! : v! / b!) : 0
          return { pref: p, label: prefLabel(p), value: formatRawMetric(p, v), fraction, tone: i === 0 ? 'first' : 'second' } as Bar
        }),
      }))
      .sort((a, b) => a.rank - b.rank || a.match.vehicle.localeCompare(b.match.vehicle))

    return { ranked: list, effectivePrefs: prefs }
  }, [filteredDetails, isPreowned, activePref1, activePref2])

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

  function priceText(m: SpeedDatingMatch, top: boolean): string {
    if (m.priceLow === null) return '—'
    if (isPreowned) return `From ${dollarsK(m.priceLow)}${top ? ' pre-owned' : ''}`
    if (m.priceHigh === null || m.priceLow === m.priceHigh) return dollarsK(m.priceLow)
    return `${dollarsK(m.priceLow)}–${dollarsK(m.priceHigh)}`
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
  const sixSeatPicked = activePref1 === 'sixseat' || activePref2 === 'sixseat'
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
                Each metric is normalized 0&ndash;1 across the vehicles in your budget.{' '}
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
                  <p className="sd-verdict">{verdict(top)}</p>
                  {bars(top, 'lg')}
                  <div className="sd-top-foot">
                    <span className="sd-price">{priceText(top.match, true)}</span>
                    <Link href={`/vehicles/${toSlug(top.match.vehicle)}`} className="sd-link">See trims</Link>
                    <Link href={`/side-by-side?v1=${encodeURIComponent(top.match.vehicle)}`} className="sd-link">Compare</Link>
                  </div>
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
                        <span>{badge(r.match.vehicle)}</span>
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
                    <p className="sd-rest-note">Bars show each model against the best in your budget, counting only the trims that fit it.</p>
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

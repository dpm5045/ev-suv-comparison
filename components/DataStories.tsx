/**
 * The chart stories on the Market Insights tab. Charts are plain elements sized
 * with percentages — no canvas, SVG or chart library — so they render on the
 * server and follow the site theme through CSS variables.
 *
 * Colour rule: marks are --chart-muted; only the marks a headline talks about
 * are --accent. Text never takes a mark colour.
 *
 * This module is also imported by the home page (a client component), so it must
 * never import the provenance file. The Keeps story lives in KeepsStory.tsx, and
 * the page assembles the stories in MarketStories.tsx.
 */
import {
  bestValueTrims,
  choiceDek,
  choiceHeadline,
  comparisonExclusions,
  COST_PER_MILE_DEK,
  costPerMileHeadline,
  dollars,
  dollarsK,
  MIN_THIRD_ROW_LEGROOM_IN,
  PRICE_THRESHOLD,
  priceDek,
  priceHeadline,
  priceRanges,
  RANGE_BAND,
  RANGE_STORY_HEADLINE,
  rangeDek,
  recentYearsLabel,
  THIRD_ROW_DEK,
  thirdRowData,
  thirdRowHeadline,
  trimsByYear,
  USED_DEK,
  usedHeadline,
  usedVsNew,
} from '@/lib/data-stories'

export { costPerMileHeadline, usedHeadline }

export const pct = (n: number) => `${n.toFixed(2)}%`

/** " Left out: RWD trims; …" — appended to the source line of comparison-set charts. */
const leftOut = () => {
  const s = comparisonExclusions()
  return s ? ` ${s}` : ''
}

/* ── shared frame ── */

interface StoryProps {
  kicker: string
  headline: string
  dek: string
  source: string
  label: string
  children: React.ReactNode
}

export function Story({ kicker, headline, dek, source, label, children }: StoryProps) {
  return (
    <section className="ds-story">
      <div className="ds-rule" />
      <div className="ds-kicker">{kicker}</div>
      <h2 className="ds-headline">{headline}</h2>
      <p className="ds-dek">{dek}</p>
      <figure className="ds-figure" role="img" aria-label={label}>
        {children}
      </figure>
      <p className="ds-source">{source}</p>
    </section>
  )
}

/** Props every story takes: its number on the page. */
export interface StoryNumber {
  n: number
}

/* ── Choice (two column charts) ── */

function ColumnChart({ title, values }: { title: string; values: { year: number; value: number }[] }) {
  const max = Math.max(...values.map((v) => v.value), 1)
  return (
    <div className="ds-colchart">
      <div className="ds-chart-title">{title}</div>
      <div className="ds-cols" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
        {values.map((v, i) => (
          <div key={v.year} className="ds-col" title={`${v.year}: ${v.value}`}>
            <span className="ds-col-value">{v.value}</span>
            <div
              className={`ds-col-bar${i === 0 || i === values.length - 1 ? ' ds-mark--hi' : ''}`}
              style={{ height: pct((v.value / max) * 100) }}
            />
          </div>
        ))}
      </div>
      <div className="ds-col-axis" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
        {values.map((v) => (
          <span key={v.year}>{v.year}</span>
        ))}
      </div>
    </div>
  )
}

export function ChoiceStory({ n }: StoryNumber) {
  const ys = trimsByYear()
  const first = ys[0]
  const last = ys[ys.length - 1]
  return (
    <Story
      kicker={`${n} · Choice`}
      headline={choiceHeadline()!}
      dek={choiceDek()!}
      source="Source: 3RowEV dataset. Counts US-market trims with three rows by model year; seat layouts of the same trim count once. Includes trims no longer sold new; announced models are on the News Radar."
      label={`Column charts: trims offered grew from ${first.trims} in model year ${first.year} to ${last.trims} in ${last.year}; models from ${first.models} to ${last.models}.`}
    >
      <div className="ds-colcharts">
        <ColumnChart title="Trims offered, by model year" values={ys.map((y) => ({ year: y.year, value: y.trims }))} />
        <ColumnChart title="Models offered, by model year" values={ys.map((y) => ({ year: y.year, value: y.models }))} />
      </div>
    </Story>
  )
}

/* ── Price (range bars) ── */

export function PriceStory({ n }: StoryNumber) {
  const rows = priceRanges()
  const top = Math.max(...rows.map((r) => r.high))
  const lo = 40000
  const hi = Math.ceil(top / 10000) * 10000
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100
  const ticks: number[] = []
  // A tick label at the right edge would hang half outside the chart and make it scroll
  for (let t = 50000; t < hi; t += 50000) ticks.push(t)
  return (
    <Story
      kicker={`${n} · Price`}
      headline={priceHeadline()!}
      dek={priceDek()!}
      source={`Source: 3RowEV dataset, model years ${recentYearsLabel()}, AWD trims with at least ${MIN_THIRD_ROW_LEGROOM_IN} in of third-row legroom. MSRP excludes destination. Highlighted: models starting under ${dollars(PRICE_THRESHOLD)}.${leftOut()}`}
      label={`Range bars of MSRP for ${rows.length} models, from ${dollarsK(rows[0].low)} to ${dollarsK(top)}.`}
    >
      <div className="ds-scroll">
        <div className="ds-hbars ds-hbars--price">
          <div className="ds-hbar-row ds-hbar-axis">
            <span />
            <div className="ds-hbar-track">
              {ticks.map((t) => (
                <span key={t} className="ds-tick-label" style={{ left: pct(x(t)) }}>{dollarsK(t)}</span>
              ))}
            </div>
          </div>
          {rows.map((r) => {
            const left = x(r.low)
            const width = Math.max(x(r.high) - left, 1.2)
            const single = r.low === r.high
            const text = single ? dollarsK(r.low) : `${dollarsK(r.low)}–${dollarsK(r.high)}`
            return (
              <div key={r.vehicle} className="ds-hbar-row">
                <span className="ds-hbar-name">{r.vehicle}</span>
                <div className="ds-hbar-track ds-hbar-track--bg">
                  {ticks.map((t) => (
                    <div key={t} className="ds-gridline-v" style={{ left: pct(x(t)) }} />
                  ))}
                  <div
                    className={`ds-range-bar${r.low < PRICE_THRESHOLD ? ' ds-mark--hi' : ''}`}
                    style={{ left: pct(left), width: pct(width) }}
                    title={`${r.vehicle}: ${text}`}
                  />
                  <span
                    className="ds-range-label"
                    style={
                      left + width > 80
                        ? { right: `calc(${pct(100 - left)} + 8px)` }
                        : { left: `calc(${pct(left + width)} + 8px)` }
                    }
                  >
                    {text}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Story>
  )
}

/* ── Range (scatter) ── */

export function RangeStory({ n }: StoryNumber) {
  const pts = bestValueTrims()
  const xLo = 40000
  const xHi = Math.ceil(Math.max(...pts.map((p) => p.msrp)) / 20000) * 20000
  const yLo = 200
  const yHi = 500
  const x = (v: number) => ((v - xLo) / (xHi - xLo)) * 100
  const y = (v: number) => ((v - yLo) / (yHi - yLo)) * 100
  const xTicks: number[] = []
  for (let t = 50000; t <= xHi; t += 25000) xTicks.push(t)
  const yTicks = [250, 300, 350, 400, 450]

  // Label the three longest ranges, the shortest range and the cheapest.
  const byRange = [...pts].sort((a, b) => b.range - a.range)
  const labelled = new Set([
    ...byRange.slice(0, 3).map((p) => p.vehicle),
    byRange[byRange.length - 1].vehicle,
    [...pts].sort((a, b) => a.msrp - b.msrp)[0].vehicle,
  ])

  return (
    <Story
      kicker={`${n} · Range`}
      headline={RANGE_STORY_HEADLINE}
      dek={rangeDek()!}
      source={`Vertical axis: rated range in miles. One dot per model, plotted at its best-value AWD trim with at least ${MIN_THIRD_ROW_LEGROOM_IN} in of third-row legroom. Source: 3RowEV dataset, model years ${recentYearsLabel()}.${leftOut()}`}
      label={`Scatter plot of range against MSRP for ${pts.length} models; most sit between ${RANGE_BAND[0]} and ${RANGE_BAND[1]} miles.`}
    >
      <div className="ds-scatter">
        <div className="ds-scatter-y">
          {yTicks.map((t) => (
            <span key={t} style={{ bottom: pct(y(t)) }}>{t}</span>
          ))}
        </div>
        <div className="ds-scatter-plot">
          {yTicks.map((t) => (
            <div key={t} className="ds-gridline-h" style={{ bottom: pct(y(t)) }} />
          ))}
          <div
            className="ds-band"
            style={{ bottom: pct(y(RANGE_BAND[0])), height: pct(y(RANGE_BAND[1]) - y(RANGE_BAND[0])) }}
          />
          <span className="ds-band-label" style={{ bottom: `calc(${pct(y(RANGE_BAND[1]))} + 4px)` }}>
            {RANGE_BAND[0]}–{RANGE_BAND[1]} miles
          </span>
          {pts.map((p) => {
            const px = x(p.msrp)
            const py = y(p.range)
            const onRight = px > 75
            const inBand = p.range >= RANGE_BAND[0] - 15 && p.range <= RANGE_BAND[1] + 15
            return (
              <div key={p.vehicle}>
                <div
                  className={`ds-dot${p.range >= 400 ? ' ds-mark--hi' : ''}`}
                  style={{ left: pct(px), bottom: pct(py) }}
                  title={`${p.vehicle} (${p.year} ${p.trim}): ${dollarsK(p.msrp)}, ${p.range} mi`}
                />
                {labelled.has(p.vehicle) && inBand && (
                  <>
                    <div className="ds-leader" style={{ left: pct(px), bottom: `calc(${pct(py)} + 8px)` }} />
                    <span className="ds-dot-label ds-dot-label--above" style={{ left: `calc(${pct(px)} - 6px)`, bottom: `calc(${pct(py)} + 36px)` }}>
                      {p.vehicle}
                    </span>
                  </>
                )}
                {labelled.has(p.vehicle) && !inBand && (
                  <span
                    className="ds-dot-label"
                    style={
                      onRight
                        ? { right: `calc(${pct(100 - px)} + 12px)`, bottom: pct(py) }
                        : { left: `calc(${pct(px)} + 12px)`, bottom: pct(py) }
                    }
                  >
                    {p.vehicle}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <span />
        <div className="ds-scatter-x">
          {xTicks.map((t) => (
            <span key={t} style={{ left: pct(x(t)) }}>{dollarsK(t)}</span>
          ))}
          <span className="ds-axis-title">MSRP</span>
        </div>
      </div>
    </Story>
  )
}

/* ── Value (cost per mile bars) ── */

/** Cost per mile of range, one bar per model. Reused on the home page. */
export function CostPerMileChart() {
  const rows = bestValueTrims()
  const max = Math.max(...rows.map((r) => r.perMile)) * 1.07
  return (
    <div className="ds-hbars">
      {rows.map((r, i) => (
        <div key={r.vehicle} className="ds-hbar-row">
          <span className="ds-hbar-name">{r.vehicle}</span>
          <div className="ds-cpm">
            <div
              className={`ds-cpm-bar${i === 0 || i === rows.length - 1 ? ' ds-mark--hi' : ''}`}
              style={{ width: `calc((100% - 52px) * ${(r.perMile / max).toFixed(4)})` }}
              title={`${r.vehicle} (${r.year} ${r.trim}): $${r.perMile} per mile`}
            />
            <span className="ds-cpm-value">${r.perMile}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export const costPerMileSource = () =>
  `Source: 3RowEV dataset, model years ${recentYearsLabel()}. MSRP excludes destination.${leftOut()}`

export function ValueStory({ n }: StoryNumber) {
  const rows = bestValueTrims()
  return (
    <Story
      kicker={`${n} · Value`}
      headline={costPerMileHeadline()!}
      dek={COST_PER_MILE_DEK}
      source={costPerMileSource()}
      label={`Bar chart of MSRP per mile of range, from $${rows[0].perMile} to $${rows[rows.length - 1].perMile}.`}
    >
      <CostPerMileChart />
    </Story>
  )
}

/* ── Used market (dumbbells) ── */

/** Best new trim against best used trim, per model. Reused on the home page when the Value story is empty. */
export function UsedChart() {
  const rows = usedVsNew()
  const both = rows.filter((r) => r.newBest)
  const top = both.reduce<(typeof both)[number] | null>(
    (a, b) => (!a || b.newBest!.perMile - b.used.perMile > a.newBest!.perMile - a.used.perMile ? b : a),
    null,
  )
  // Headroom past the largest value so its dot and the last tick label stay inside the chart
  const hi = Math.ceil((Math.max(...rows.map((r) => Math.max(r.used.perMile, r.newBest?.perMile ?? 0))) + 10) / 50) * 50
  const x = (v: number) => (v / hi) * 100
  const ticks: number[] = []
  for (let t = 50; t < hi; t += 50) ticks.push(t)
  return (
    <div className="ds-scroll">
      <div className="ds-hbars ds-hbars--used">
        <div className="ds-legend">
          <span><span className="ds-key ds-key--new" /> Best new trim</span>
          <span><span className="ds-key ds-key--used" /> Best used trim</span>
        </div>
        <div className="ds-hbar-row ds-hbar-axis">
          <span />
          <div className="ds-hbar-track">
            {ticks.map((t) => (
              <span key={t} className="ds-tick-label" style={{ left: pct(x(t)) }}>${t}</span>
            ))}
          </div>
        </div>
        {rows.map((r) => {
          const hiMark = r.vehicle === top?.vehicle ? ' ds-mark--hi' : ''
          const u = x(r.used.perMile)
          const nw = r.newBest ? x(r.newBest.perMile) : null
          const usedText = `best used: ${r.used.year} ${r.used.trim}, $${r.used.perMile} per mile`
          const newText = r.newBest ? `best new: ${r.newBest.year} ${r.newBest.trim}, $${r.newBest.perMile} per mile` : r.newLabel
          return (
            <div key={r.vehicle} className="ds-hbar-row">
              <span className="ds-hbar-name">{r.vehicle}</span>
              <div className="ds-hbar-track ds-hbar-track--bg" title={`${r.vehicle}: ${usedText}; ${newText}`}>
                {ticks.map((t) => (
                  <div key={t} className="ds-gridline-v" style={{ left: pct(x(t)) }} />
                ))}
                {nw !== null && (
                  <div className={`ds-dumbbell-line${hiMark}`} style={{ left: pct(Math.min(u, nw)), width: pct(Math.abs(nw - u)) }} />
                )}
                <div className={`ds-dumbbell-dot${hiMark}`} style={{ left: pct(u) }} />
                {nw !== null ? (
                  <div className={`ds-dumbbell-dot ds-dumbbell-dot--new${hiMark ? ' ds-dumbbell-dot--hi' : ''}`} style={{ left: pct(nw) }} />
                ) : (
                  <span className="ds-range-label" style={{ left: `calc(${pct(u)} + 12px)` }}>{r.newLabel}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const usedSource = () =>
  `Used prices are estimated ranges for each trim, refreshed weekly from CarGurus market averages; each dot uses the middle of the range. Range is the rating when new, before any battery wear. New: MSRP excludes destination. AWD trims with at least ${MIN_THIRD_ROW_LEGROOM_IN} in of third-row legroom.${leftOut()}`

export function UsedStory({ n }: StoryNumber) {
  const rows = usedVsNew()
  return (
    <Story
      kicker={`${n} · Used`}
      headline={usedHeadline()!}
      dek={USED_DEK}
      source={usedSource()}
      label={`Dumbbell chart of cost per mile of range for ${rows.length} models, best used trim against best new trim.`}
    >
      <UsedChart />
    </Story>
  )
}

/* ── Third row (scatter) ── */

export function ThirdRowStory({ n }: StoryNumber) {
  const t = thirdRowData()!
  const pts = t.points
  const xLo = Math.floor(Math.min(24, ...pts.map((p) => p.legroom)) / 2) * 2
  const xHi = Math.ceil(Math.max(...pts.map((p) => p.legroom)) / 2) * 2 + 2
  const yHi = Math.ceil(Math.max(...pts.map((p) => p.cargo)) / 5) * 5 + 5
  const x = (v: number) => ((v - xLo) / (xHi - xLo)) * 100
  const y = (v: number) => (v / yHi) * 100
  const xTicks: number[] = []
  for (let v = Math.ceil(xLo / 4) * 4; v <= xHi; v += 4) xTicks.push(v)
  const yTicks: number[] = []
  for (let v = 5; v < yHi; v += 5) yTicks.push(v)

  const byLeg = [...pts].sort((a, b) => b.legroom - a.legroom)
  const leastCargo = pts.reduce((a, b) => (b.cargo < a.cargo ? b : a), pts[0])
  const hi = new Set([byLeg[0].vehicle, leastCargo.vehicle])
  const labelled = new Set([...hi, ...pts.filter((p) => p.legroom < MIN_THIRD_ROW_LEGROOM_IN).map((p) => p.vehicle)])

  const missing = [
    t.notPublished.length ? `Not published: ${t.notPublished.join(', ')}.` : '',
    t.noThirdRow.length ? `No third row: ${t.noThirdRow.join(', ')}.` : '',
  ].filter(Boolean).join(' ')

  return (
    <Story
      kicker={`${n} · Third row`}
      headline={thirdRowHeadline(t)}
      dek={THIRD_ROW_DEK}
      source={`Source: 3RowEV dataset, manufacturer-published dimensions. Every model sold new, any drivetrain, at the newest model year's cheapest trim with both figures.${missing ? ` ${missing}` : ''}`}
      label={`Scatter plot of third-row legroom against cargo behind the third row for ${pts.length} models.`}
    >
      <div className="ds-scatter">
        <div className="ds-scatter-y">
          {yTicks.map((v) => (
            <span key={v} style={{ bottom: pct(y(v)) }}>{v}</span>
          ))}
        </div>
        <div className="ds-scatter-plot">
          {yTicks.map((v) => (
            <div key={v} className="ds-gridline-h" style={{ bottom: pct(y(v)) }} />
          ))}
          <div className="ds-cutoff" style={{ left: pct(x(MIN_THIRD_ROW_LEGROOM_IN)) }} />
          <span className="ds-cutoff-label" style={{ left: `calc(${pct(x(MIN_THIRD_ROW_LEGROOM_IN))} + 6px)` }}>
            {MIN_THIRD_ROW_LEGROOM_IN} in cutoff used in the other charts
          </span>
          {pts.map((p) => {
            const px = x(p.legroom)
            const py = y(p.cargo)
            const onRight = px > 70
            return (
              <div key={p.vehicle}>
                <div
                  className={`ds-dot ds-dot--muted${hi.has(p.vehicle) ? ' ds-mark--hi' : ''}`}
                  style={{ left: pct(px), bottom: pct(py) }}
                  title={`${p.vehicle} (${p.year} ${p.trim}): ${p.legroom} in legroom, ${p.cargo} cu ft behind the third row`}
                />
                {labelled.has(p.vehicle) && (
                  <span
                    className="ds-dot-label"
                    style={
                      onRight
                        ? { right: `calc(${pct(100 - px)} + 12px)`, bottom: pct(py) }
                        : { left: `calc(${pct(px)} + 12px)`, bottom: pct(py) }
                    }
                  >
                    {p.vehicle}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <span />
        <div className="ds-scatter-x">
          {xTicks.map((v) => (
            <span key={v} style={{ left: pct(x(v)) }}>{v}</span>
          ))}
          <span className="ds-axis-title">Third-row legroom (in)</span>
        </div>
      </div>
      <div className="ds-axis-note">Vertical axis: cargo behind the third row (cu ft)</div>
    </Story>
  )
}

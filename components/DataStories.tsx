/**
 * The four chart stories on the Market Insights tab. Charts are plain elements sized
 * with percentages — no canvas, SVG or chart library — so they render on the
 * server and follow the site theme through CSS variables.
 *
 * Colour rule: marks are --chart-muted; only the marks a headline talks about
 * are --accent. Text never takes a mark colour.
 */
import {
  bestValueTrims,
  choiceDek,
  choiceHeadline,
  COST_PER_MILE_DEK,
  costPerMileHeadline,
  dollars,
  dollarsK,
  PRICE_THRESHOLD,
  priceDek,
  priceHeadline,
  priceRanges,
  RANGE_BAND,
  RANGE_STORY_HEADLINE,
  rangeDek,
  recentYearsLabel,
  trimsByYear,
} from '@/lib/data-stories'

export { costPerMileHeadline }

const pct = (n: number) => `${n.toFixed(2)}%`

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

/* ── Story 1: choice (two column charts) ── */

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
              className={`ds-col-bar${i === values.length - 1 ? ' ds-mark--hi' : ''}`}
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

function ChoiceStory() {
  const ys = trimsByYear()
  const first = ys[0]
  const last = ys[ys.length - 1]
  return (
    <Story
      kicker="1 · Choice"
      headline={choiceHeadline()}
      dek={choiceDek()}
      source="Source: 3RowEV dataset. Counts US-market trims with three rows; announced models are on the News Radar."
      label={`Column charts: trims on sale grew from ${first.trims} in ${first.year} to ${last.trims} in ${last.year}; models from ${first.models} to ${last.models}.`}
    >
      <div className="ds-colcharts">
        <ColumnChart title="Trims on sale, by model year" values={ys.map((y) => ({ year: y.year, value: y.trims }))} />
        <ColumnChart title="Models on sale, by model year" values={ys.map((y) => ({ year: y.year, value: y.models }))} />
      </div>
    </Story>
  )
}

/* ── Story 2: price (range bars) ── */

function PriceStory() {
  const rows = priceRanges()
  const lo = 40000
  const hi = Math.ceil(Math.max(...rows.map((r) => r.high)) / 10000) * 10000
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100
  const ticks: number[] = []
  for (let t = 50000; t <= hi; t += 50000) ticks.push(t)
  return (
    <Story
      kicker="2 · Price"
      headline={priceHeadline()}
      dek={priceDek()}
      source={`Source: 3RowEV dataset, model years ${recentYearsLabel()}. MSRP excludes destination. Highlighted: models starting under ${dollars(PRICE_THRESHOLD)}.`}
      label={`Range bars of MSRP for ${rows.length} models, from ${dollarsK(rows[0].low)} to ${dollarsK(Math.max(...rows.map((r) => r.high)))}.`}
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

/* ── Story 3: range (scatter) ── */

function RangeStory() {
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
      kicker="3 · Range"
      headline={RANGE_STORY_HEADLINE}
      dek={rangeDek()}
      source={`Vertical axis: rated range in miles. One dot per model, plotted at its best-value trim. Source: 3RowEV dataset, model years ${recentYearsLabel()}.`}
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

/* ── Story 4: value (cost per mile bars) ── */

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
  `Source: 3RowEV dataset, model years ${recentYearsLabel()}. MSRP excludes destination.`

function ValueStory() {
  const rows = bestValueTrims()
  return (
    <Story
      kicker="4 · Value"
      headline={costPerMileHeadline()}
      dek={COST_PER_MILE_DEK}
      source={costPerMileSource()}
      label={`Bar chart of MSRP per mile of range, from $${rows[0].perMile} to $${rows[rows.length - 1].perMile}.`}
    >
      <CostPerMileChart />
    </Story>
  )
}

export default function DataStories() {
  return (
    <>
      <ChoiceStory />
      <PriceStory />
      <RangeStory />
      <ValueStory />
    </>
  )
}

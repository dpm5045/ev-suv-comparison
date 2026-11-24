/**
 * "What a car keeps": used price as a share of a sourced original MSRP.
 * Server-only (reads provenance through lib/msrp-sources.ts); never import it from
 * a client component. Same chart conventions as DataStories.tsx.
 */
import { DATA } from '@/lib/data'
import { keepsData, keepsHeadline, MIN_THIRD_ROW_LEGROOM_IN, type KeepsData } from '@/lib/data-stories'
import { hasSourcedMsrp } from '@/lib/msrp-sources'
import { pct, Story, type StoryNumber } from './DataStories'

export const liveKeepsData = (): KeepsData | null => keepsData(DATA.details, hasSourcedMsrp)

function Panel({ vehicle, points, axisMax, hiYear }: KeepsData['panels'][number] & { axisMax: number; hiYear: number | null }) {
  const ticks: number[] = []
  for (let t = 25; t <= axisMax; t += 25) ticks.push(t)
  return (
    <div className="ds-keeps-panel">
      <div className="ds-chart-title">{vehicle}</div>
      <div className="ds-keeps-plot">
        {ticks.map((t) => (
          <div key={t} className={`ds-gridline-h${t === 100 ? ' ds-gridline-h--strong' : ''}`} style={{ bottom: pct((t / axisMax) * 100) }}>
            <span className="ds-keeps-tick">{t}%</span>
          </div>
        ))}
        <div className="ds-keeps-cols" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
          {points.map((p) => (
            <div key={p.year} className="ds-col" title={`${vehicle} ${p.year}: about ${p.pct}% of original MSRP (${p.n} trim${p.n === 1 ? '' : 's'})`}>
              <span className="ds-col-value">{p.pct}%</span>
              <div className={`ds-col-bar${p.year === hiYear ? ' ds-mark--hi' : ''}`} style={{ height: pct((p.pct / axisMax) * 100) }} />
            </div>
          ))}
        </div>
      </div>
      <div className="ds-col-axis ds-keeps-axis" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
        {points.map((p) => (
          <span key={p.year}>
            {p.year}
            <br />
            n={p.n}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function KeepsStory({ n }: StoryNumber) {
  const k = liveKeepsData()!
  return (
    <Story
      kicker={`${n} · Keeps`}
      headline={keepsHeadline(k)}
      dek="What each model year sells for today, as a share of what it cost new. A snapshot of today's prices, not one car's value over time."
      source={`Used prices: CarGurus market averages, refreshed weekly (middle of each trim's range). Original MSRP: the maker's published price for that model year, excluding destination. Based on ${k.covered} of ${k.total} used trims (AWD, at least ${MIN_THIRD_ROW_LEGROOM_IN} in of third-row legroom); the rest have no sourced original MSRP. n = trims behind each bar; seat layouts of one trim count once.`}
      label={`Column charts of used price as a share of original MSRP by model year, for ${k.panels.map((p) => p.vehicle).join(', ')}.`}
    >
      <div className="ds-keeps">
        {k.panels.map((p, i) => (
          <Panel key={p.vehicle} {...p} axisMax={k.axisMax} hiYear={i === 0 ? p.points[0].year : null} />
        ))}
      </div>
      {k.strip.length > 0 && (
        <p className="ds-keeps-strip">
          One model year so far:{' '}
          {k.strip.map((s, i) => (
            <span key={s.vehicle}>
              {i > 0 && '; '}
              {s.vehicle} {s.year}, about {s.pct}%
            </span>
          ))}
          .
        </p>
      )}
    </Story>
  )
}

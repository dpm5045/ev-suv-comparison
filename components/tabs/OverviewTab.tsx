'use client'

import { useEffect, useMemo, useState } from 'react'
import { DATA } from '@/lib/data'
import VehicleBadge from '../VehicleBadge'

const GLANCE_EXCLUDED = ['Tesla Model Y Long (Asia)', 'Toyota Highlander EV']

/* ── helpers ── */

function parsePrice(s: string): number | null {
  const m = s.replace(/[$,]/g, '').match(/[\d.]+/)
  return m ? parseFloat(m[0]) : null
}

interface NewsCard {
  label: string
  body: string
  sources: string[]
}

/** Lightweight markdown → JSX for API-returned news text */
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (line === '---' || line === '***') continue // skip dividers

    // Headings
    const hMatch = line.match(/^(#{1,4})\s+(.*)/)
    if (hMatch) {
      const content = inlineFormat(hMatch[2])
      elements.push(<h4 key={key++} className="news-heading">{content}</h4>)
      continue
    }

    // Numbered list items: "1. **Title** body"
    const liMatch = line.match(/^\d+\.\s+(.*)/)
    if (liMatch) {
      elements.push(<p key={key++} className="news-li">{inlineFormat(liMatch[1])}</p>)
      continue
    }

    // Regular paragraph
    elements.push(<p key={key++}>{inlineFormat(line)}</p>)
  }
  return elements
}

/** Handle **bold**, [links](url), and bare URLs */
function inlineFormat(text: string): React.ReactNode[] {
  // First pass: convert bare URLs (not already in markdown link) into markdown links
  const withLinks = text.replace(
    /(?<!\()(https?:\/\/[^\s,)]+)/g,
    (url) => {
      let domain = url
      try { domain = new URL(url).hostname.replace('www.', '') } catch { /* noop */ }
      return `[${domain}](${url})`
    },
  )

  // Tokenize on **bold** and [text](url)
  const parts: React.ReactNode[] = []
  const re = /(\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\))/g
  let last = 0
  let match: RegExpExecArray | null
  let k = 0
  while ((match = re.exec(withLinks)) !== null) {
    if (match.index > last) parts.push(withLinks.slice(last, match.index))
    if (match[2]) {
      // bold
      parts.push(<strong key={k++}>{match[2]}</strong>)
    } else if (match[3] && match[4]) {
      // link
      parts.push(<a key={k++} href={match[4]} target="_blank" rel="noopener noreferrer">{match[3]}</a>)
    }
    last = match.index + match[0].length
  }
  if (last < withLinks.length) parts.push(withLinks.slice(last))
  return parts
}

async function fetchQuery(query: string): Promise<NewsCard> {
  const label = query
  try {
    const res = await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      return { label, body: `API error (${res.status}): ${err.error ?? 'unknown'}`, sources: [] }
    }
    const data = await res.json()
    if (!data?.content || !Array.isArray(data.content)) {
      return { label, body: 'Unexpected response format.', sources: [] }
    }
    const textParts: string[] = []
    const urls: string[] = []
    for (const block of data.content) {
      if (block.type === 'text') {
        textParts.push(block.text)
        if (Array.isArray(block.citations)) {
          for (const c of block.citations) { if (c.url) urls.push(c.url) }
        }
      }
      if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
        for (const r of block.content) {
          if (r.type === 'web_search_result' && r.url) urls.push(r.url)
        }
      }
    }
    let body = textParts.join('\n').trim() || 'No content found.'
    // Strip trailing "Sources:" section (AI sometimes appends one)
    body = body.replace(/\n+[-*]*\s*\*{0,2}Sources:?\*{0,2}[\s\S]*$/i, '').trim()
    const sources = [...new Set(urls)].slice(0, 4)
    return { label, body, sources }
  } catch {
    return { label, body: 'Network error fetching news.', sources: [] }
  }
}

/* ── component ── */

export default function OverviewTab() {
  const { count_totals } = DATA

  /* --- derived insights --- */
  const insights = useMemo(() => {
    const d = DATA.details
    const vehicles = [...new Set(d.map((r) => r.vehicle))].sort()

    // OTD new price range
    const otdNums = d.filter((r) => typeof r.otd_new === 'number') as (typeof d[number] & { otd_new: number })[]
    const otdMin = otdNums.reduce((a, b) => (a.otd_new < b.otd_new ? a : b), otdNums[0])
    const otdMax = otdNums.reduce((a, b) => (a.otd_new > b.otd_new ? a : b), otdNums[0])

    // Range leader
    const rangeNums = d.filter((r) => typeof r.range_mi === 'number') as (typeof d[number] & { range_mi: number })[]
    const rangeLeader = rangeNums.reduce((a, b) => (a.range_mi > b.range_mi ? a : b), rangeNums[0])

    // HP leader
    const hpNums = d.filter((r) => typeof r.hp === 'number') as (typeof d[number] & { hp: number })[]
    const hpLeader = hpNums.reduce((a, b) => (a.hp > b.hp ? a : b), hpNums[0])

    // Pre-owned OTD range
    const preowned = d.map((r) => ({ row: r, low: parsePrice(r.otd_preowned) })).filter((x) => x.low !== null) as { row: typeof d[number]; low: number }[]

    // Best NACS native value (cheapest OTD new with native NACS port)
    const nacsNative = otdNums.filter((r) => {
      const c = r.charging_type.toLowerCase()
      return c.includes('nacs') && !c.startsWith('ccs')
    })
    const bestNacs = nacsNative.length ? nacsNative.reduce((a, b) => (a.otd_new < b.otd_new ? a : b)) : null
    // Parse high values from ranges like "$38,005–$52,115"
    const preownedWithHigh = d.map((r) => {
      const parts = r.otd_preowned.split('–')
      const high = parts.length > 1 ? parsePrice(parts[1]) : parsePrice(r.otd_preowned)
      return { row: r, high }
    }).filter((x) => x.high !== null) as { row: typeof d[number]; high: number }[]
    const preownedMin = preowned.length ? Math.min(...preowned.map((p) => p.low)) : null
    const preownedMinRow = preowned.length ? preowned.reduce((a, b) => (a.low < b.low ? a : b)).row : null
    const preownedMax = preownedWithHigh.length ? Math.max(...preownedWithHigh.map((p) => p.high)) : null
    const preownedMaxRow = preownedWithHigh.length ? preownedWithHigh.reduce((a, b) => (a.high > b.high ? a : b)).row : null

    // Per-vehicle summary
    const vehicleSummaries = vehicles.map((v) => {
      const rows = d.filter((r) => r.vehicle === v)
      const otds = rows.map((r) => r.otd_new).filter((x) => typeof x === 'number') as number[]
      const ranges = rows.map((r) => r.range_mi).filter((x) => typeof x === 'number') as number[]
      const hps = rows.map((r) => r.hp).filter((x) => typeof x === 'number') as number[]
      const bats = rows.map((r) => r.battery_kwh).filter((x) => typeof x === 'number') as number[]
      const types = [...new Set(rows.map((r) => r.charging_type).filter(Boolean))]
      const preLows = rows.map((r) => parsePrice(r.otd_preowned)).filter((x) => x !== null) as number[]
      const preHighs = rows.map((r) => {
        const parts = r.otd_preowned.split('–')
        return parts.length > 1 ? parsePrice(parts[1]) : parsePrice(r.otd_preowned)
      }).filter((x) => x !== null) as number[]
      return {
        vehicle: v,
        otdLow: otds.length ? Math.min(...otds) : null,
        otdHigh: otds.length ? Math.max(...otds) : null,
        rangeLow: ranges.length ? Math.min(...ranges) : null,
        rangeHigh: ranges.length ? Math.max(...ranges) : null,
        hpLow: hps.length ? Math.min(...hps) : null,
        hpHigh: hps.length ? Math.max(...hps) : null,
        battery: bats.length ? `${Math.min(...bats)}${Math.min(...bats) !== Math.max(...bats) ? `–${Math.max(...bats)}` : ''}` : '—',
        charging: types.join(' / ') || '—',
        preLow: preLows.length ? Math.min(...preLows) : null,
        preHigh: preHighs.length ? Math.max(...preHighs) : null,
      }
    })

    // Charging landscape — categorize into NACS / CCS1 / Transitioning
    // Look at individual rows to determine if a vehicle has both CCS1-era and NACS-era trims
    const chargingMap = new Map<string, string[]>()
    for (const s of vehicleSummaries) {
      const rows = d.filter((r) => r.vehicle === s.vehicle)
      const types = rows.map((r) => r.charging_type.toLowerCase())
      const hasNacsNative = types.some((t) => t.startsWith('nacs'))
      const hasCcsNative = types.some((t) => t.startsWith('ccs'))
      let category: string
      if (s.charging === '—' || types.every((t) => t === 'tbd')) category = 'TBD'
      else if (hasNacsNative && hasCcsNative) category = 'CCS1 + NACS (transitioning)'
      else if (hasNacsNative) {
        // Check if "CCS adapter" is mentioned — means transitioning from CCS ecosystem
        const mentionsCcsAdapter = types.some((t) => t.includes('ccs adapter'))
        category = mentionsCcsAdapter ? 'CCS1 + NACS (transitioning)' : 'NACS'
      }
      else if (hasCcsNative) category = 'CCS1'
      else category = s.charging
      if (!chargingMap.has(category)) chargingMap.set(category, [])
      chargingMap.get(category)!.push(s.vehicle)
    }

    // Cargo & Storage insights
    const frunkRows = d.filter((r) => typeof r.frunk_cu_ft === 'number' && r.frunk_cu_ft > 0)
    const largestFrunk = frunkRows.length ? frunkRows.reduce((a, b) => ((a.frunk_cu_ft as number) > (b.frunk_cu_ft as number) ? a : b)) : null

    const cargo2Rows = d.filter((r) => typeof r.cargo_behind_2nd_cu_ft === 'number' && r.cargo_behind_2nd_cu_ft > 0)
    const mostCargo2 = cargo2Rows.length ? cargo2Rows.reduce((a, b) => ((a.cargo_behind_2nd_cu_ft as number) > (b.cargo_behind_2nd_cu_ft as number) ? a : b)) : null

    const cargo3Rows = d.filter((r) => typeof r.cargo_behind_3rd_cu_ft === 'number' && r.cargo_behind_3rd_cu_ft > 0)
    const mostCargo3 = cargo3Rows.length ? cargo3Rows.reduce((a, b) => ((a.cargo_behind_3rd_cu_ft as number) > (b.cargo_behind_3rd_cu_ft as number) ? a : b)) : null

    return { vehicles, otdMin, otdMax, rangeLeader, hpLeader, bestNacs, preownedMin, preownedMinRow, preownedMax, preownedMaxRow, vehicleSummaries, chargingMap, largestFrunk, mostCargo2, mostCargo3 }
  }, [])

  /* --- news state --- */
  const CACHE_KEY = 'ev-news-cache'
  const STALE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

  const [newsCards, setNewsCards] = useState<NewsCard[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsStatus, setNewsStatus] = useState('')
  const [newsFetchedAt, setNewsFetchedAt] = useState<string | null>(null)

  // Load cached news on mount; auto-fetch if stale or missing
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const cached = JSON.parse(raw) as { cards: NewsCard[]; fetchedAt: string }
        if (cached.cards?.length) {
          setNewsCards(cached.cards)
          setNewsFetchedAt(cached.fetchedAt)
          const age = Date.now() - new Date(cached.fetchedAt).getTime()
          if (age < STALE_MS) return // fresh enough
        }
      }
    } catch { /* ignore corrupt cache */ }
    // No cache or stale — auto-fetch
    fetchNews()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchNews() {
    setNewsLoading(true)
    setNewsStatus('Searching for latest EV SUV news…')
    // Run sequentially to avoid hitting API rate limits
    const r1 = await fetchQuery('biggest 3-row electric SUV news this week 2026')
    await new Promise((res) => setTimeout(res, 5000)) // 5s gap between calls
    const r2 = await fetchQuery('3-row electric SUV market news and trends this month 2026')
    const results: PromiseSettledResult<NewsCard>[] = [
      { status: 'fulfilled', value: r1 },
      { status: 'fulfilled', value: r2 },
    ]
    const cards: NewsCard[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') cards.push(r.value)
    }
    if (cards.length > 0) {
      cards[0].label = 'This Week'
      if (cards[1]) cards[1].label = 'This Month'
    }
    const now = new Date().toISOString()
    setNewsCards(cards)
    setNewsFetchedAt(now)
    setNewsStatus(cards.length ? `Loaded ${cards.length} news summaries.` : 'Failed to fetch news.')
    setNewsLoading(false)
    // Persist to localStorage
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ cards, fetchedAt: now }))
    } catch { /* storage full — ignore */ }
  }

  const [glanceView, setGlanceView] = useState<'cards' | 'table'>('cards')

  const fmt = (n: number) => Math.round(n).toLocaleString()
  const fmtDollar = (n: number) => `$${Math.round(n).toLocaleString()}`
  const fmtDollarK = (n: number) => `$${Math.round(n / 1000)}k`
  const rangeStr = (lo: number | null, hi: number | null, unit = '') => {
    if (lo === null) return '—'
    if (lo === hi) return `${fmt(lo!)}${unit}`
    return `${fmt(lo!)}–${fmt(hi!)}${unit}`
  }

  return (
    <>
      <h2 className="section-title">Key Insights</h2>
      <p className="section-desc">
        Key insights from 66 3-Row AWD electric SUV configurations across 9 models.
      </p>

      {/* ── At a Glance ── */}
      <div className="overview-stats">
        <div className="overview-stat">
          <div className="overview-stat-label">Models Analyzed</div>
          <div className="overview-stat-value">66</div>
          <div className="overview-stat-detail">{insights.vehicles.length} vehicles, 4 model years</div>
        </div>
        {insights.rangeLeader && (
          <div className="overview-stat">
            <div className="overview-stat-label">Range Leader</div>
            <div className="overview-stat-value">{insights.rangeLeader.range_mi} mi</div>
            <div className="overview-stat-detail">{insights.rangeLeader.vehicle} {insights.rangeLeader.trim}</div>
          </div>
        )}
        {insights.hpLeader && (
          <div className="overview-stat">
            <div className="overview-stat-label">Most Powerful</div>
            <div className="overview-stat-value">{fmt(insights.hpLeader.hp as number)} HP</div>
            <div className="overview-stat-detail">{insights.hpLeader.vehicle} {insights.hpLeader.trim}</div>
          </div>
        )}
        {insights.otdMin && (
          <div className="overview-stat">
            <div className="overview-stat-label">New OTD Price Range</div>
            <div className="overview-stat-value">{fmtDollarK(insights.otdMin.otd_new as number)} to {fmtDollarK(insights.otdMax.otd_new as number)}</div>
            <div className="overview-stat-detail">{insights.otdMin.vehicle} to {insights.otdMax.vehicle}</div>
          </div>
        )}
        {insights.preownedMin !== null && (
          <div className="overview-stat">
            <div className="overview-stat-label">Pre-Owned OTD Range</div>
            <div className="overview-stat-value">{fmtDollarK(insights.preownedMin)} to {fmtDollarK(insights.preownedMax!)}</div>
            <div className="overview-stat-detail">{insights.preownedMinRow?.vehicle} to {insights.preownedMaxRow?.vehicle}</div>
          </div>
        )}
        {insights.bestNacs && (
          <div className="overview-stat">
            <div className="overview-stat-label">Best NACS Native Value</div>
            <div className="overview-stat-value">{fmtDollarK(insights.bestNacs.otd_new)}</div>
            <div className="overview-stat-detail">{insights.bestNacs.vehicle} {insights.bestNacs.year} {insights.bestNacs.trim} — Est. New OTD Price</div>
          </div>
        )}
        {insights.largestFrunk && (
          <div className="overview-stat">
            <div className="overview-stat-label">Largest Frunk</div>
            <div className="overview-stat-value">{insights.largestFrunk.frunk_cu_ft} cu ft</div>
            <div className="overview-stat-detail">{insights.largestFrunk.vehicle}</div>
          </div>
        )}
        {insights.mostCargo2 && (
          <div className="overview-stat">
            <div className="overview-stat-label">Most Cargo (2nd Row)</div>
            <div className="overview-stat-value">{insights.mostCargo2.cargo_behind_2nd_cu_ft} cu ft</div>
            <div className="overview-stat-detail">{insights.mostCargo2.vehicle} — behind 2nd row, seats folded</div>
          </div>
        )}
        {insights.mostCargo3 && (
          <div className="overview-stat">
            <div className="overview-stat-label">Most Cargo (3rd Row)</div>
            <div className="overview-stat-value">{insights.mostCargo3.cargo_behind_3rd_cu_ft} cu ft</div>
            <div className="overview-stat-detail">{insights.mostCargo3.vehicle} — behind 3rd row, seats up</div>
          </div>
        )}
      </div>

      {/* ── Vehicle Comparison Summary ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Vehicle Comparison at a Glance</div>
          <div className="mobile-view-toggle">
            <button className={`view-toggle-btn${glanceView === 'cards' ? ' active' : ''}`} onClick={() => setGlanceView('cards')}>Cards</button>
            <button className={`view-toggle-btn${glanceView === 'table' ? ' active' : ''}`} onClick={() => setGlanceView('table')}>Table</button>
          </div>
        </div>

        {/* Desktop table (+ mobile when Table toggled) */}
        <div className={glanceView === 'table' ? 'cmp-table-view cmp-table-forced' : 'cmp-table-view'}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="col-sticky">Vehicle</th>
                  <th className="num">Est. OTD New</th>
                  <th className="num">Est. OTD Pre-Owned</th>
                  <th className="num">Range (mi)</th>
                  <th className="num">HP</th>
                  <th className="num">Battery (kWh)</th>
                  <th>Charging</th>
                </tr>
              </thead>
              <tbody>
                {insights.vehicleSummaries.filter((s) => !GLANCE_EXCLUDED.includes(s.vehicle)).map((s) => (
                  <tr key={s.vehicle}>
                    <td className="col-sticky"><VehicleBadge vehicle={s.vehicle} /></td>
                    <td className="num">{s.otdLow !== null ? `${fmtDollarK(s.otdLow)}-${fmtDollarK(s.otdHigh!)}` : '—'}</td>
                    <td className="num">{s.preLow !== null ? `${fmtDollarK(s.preLow)}-${fmtDollarK(s.preHigh!)}` : '—'}</td>
                    <td className="num">{rangeStr(s.rangeLow, s.rangeHigh, ' mi')}</td>
                    <td className="num">{rangeStr(s.hpLow, s.hpHigh)}</td>
                    <td className="num">{s.battery}</td>
                    <td>{s.charging}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile card layout */}
        <div className={glanceView === 'cards' ? 'cmp-card-view' : 'cmp-card-view cmp-card-hidden'}>
          <div className="cmp-cards">
            {insights.vehicleSummaries.filter((s) => !GLANCE_EXCLUDED.includes(s.vehicle)).map((s) => (
              <div key={s.vehicle} className="cmp-card">
                <div className="cmp-card-header">
                  <VehicleBadge vehicle={s.vehicle} />
                </div>
                <div className="cmp-card-stats">
                  <div className="cmp-stat">
                    <span className="cmp-stat-label">Est. OTD New</span>
                    <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                      {s.otdLow !== null ? `${fmtDollarK(s.otdLow)}-${fmtDollarK(s.otdHigh!)}` : '—'}
                    </span>
                  </div>
                  <div className="cmp-stat">
                    <span className="cmp-stat-label">Est. OTD Pre-Owned</span>
                    <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                      {s.preLow !== null ? `${fmtDollarK(s.preLow)}-${fmtDollarK(s.preHigh!)}` : '—'}
                    </span>
                  </div>
                  <div className="cmp-stat">
                    <span className="cmp-stat-label">Range</span>
                    <span className="cmp-stat-value" style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                      {rangeStr(s.rangeLow, s.rangeHigh, ' mi')}
                    </span>
                  </div>
                  <div className="cmp-stat">
                    <span className="cmp-stat-label">HP</span>
                    <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                      {rangeStr(s.hpLow, s.hpHigh)}
                    </span>
                  </div>
                  <div className="cmp-stat">
                    <span className="cmp-stat-label">Battery</span>
                    <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                      {s.battery} kWh
                    </span>
                  </div>
                  <div className="cmp-stat" style={{ gridColumn: '1 / -1' }}>
                    <span className="cmp-stat-label">Charging</span>
                    <span className="cmp-stat-value">{s.charging}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="count-note">The Tesla Model Y Long (Asia) and Toyota Highlander EV are not yet on the US market.</p>
      </div>

      {/* ── Charging Landscape ── */}
      <div className="card">
        <div className="card-title">Charging Standards</div>
        <div className="charging-cards">
          {[...insights.chargingMap.entries()].map(([standard, vehicles]) => (
            <div key={standard} className="charging-card">
              <div className="charging-card-label">{standard}</div>
              <div className="charging-card-vehicles">
                {vehicles.map((v) => (
                  <VehicleBadge key={v} vehicle={v} />
                ))}
              </div>
              <div className="charging-card-count">{vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── EV SUV News ── */}
      <div className="card">
        <div className="card-title">EV SUV News</div>
        {newsFetchedAt && (
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
            News from {new Date(newsFetchedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(newsFetchedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </p>
        )}
        {newsLoading && (
          <div className="news-progress" style={{ marginTop: 12 }}>
            <div className="news-progress-bar" style={{ width: '100%', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        )}
        {newsStatus && <div className="news-status" style={{ marginTop: 8 }}>{newsStatus}</div>}

        {newsCards.length > 0 && (
          <div className="news-results" style={{ marginTop: 16 }}>
            {newsCards.map((card) => (
              <article key={card.label} className="news-card">
                <div className="news-card-header">
                  <strong style={{ fontSize: 14, color: 'var(--accent)' }}>{card.label}</strong>
                </div>
                <div className="news-card-body">
                  {renderMarkdown(card.body)}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

'use client'

import { useCallback, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from './Header'
import type { TabId } from './Header'
import DetailPanel from './DetailPanel'
import OverviewTab from './tabs/OverviewTab'
import ComparisonTab from './tabs/ComparisonV2Tab'
import SideBySideTab from './tabs/SideBySideTab'
import SpecSelectTab from './tabs/SpecSelectTab'
import ReferenceTab from './tabs/ReferenceTab'

export interface ComparisonFilters {
  vehicle: string
  year: string
  trim: string
  q: string
  drivetrain: string
  seats: string
  charging: string
  foldFlat: string
}

export interface InsightFilters {
  condition: string
  budget: string
  pref1: string
  pref2: string
}

export default function Dashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read all filter state from URL
  const tab = (searchParams.get('tab') as TabId) || 'overview'
  const cmpVehicle = searchParams.get('vehicle') ?? ''
  const cmpYear = searchParams.get('year') ?? ''
  const cmpQ = searchParams.get('q') ?? ''
  const cmpTrim = searchParams.get('trim') ?? ''
  const cmpDrivetrain = searchParams.get('drivetrain') ?? ''
  const cmpSeats = searchParams.get('seats') ?? ''
  const cmpCharging = searchParams.get('charging') ?? ''
  const cmpFoldFlat = searchParams.get('foldFlat') ?? ''
  const insightCondition = searchParams.get('condition') ?? ''
  const insightBudget = searchParams.get('budget') ?? ''
  const insightPref1 = searchParams.get('pref1') ?? ''
  const insightPref2 = searchParams.get('pref2') ?? ''
const [detailIdx, setDetailIdx] = useState<number | null>(null)

  function updateParams(updates: Record<string, string>, replace = false) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    const url = `?${params.toString()}`
    if (replace) router.replace(url, { scroll: false })
    else router.push(url, { scroll: false })
  }

  const setCmpFilters = useCallback((f: Partial<ComparisonFilters>) => {
    const updates: Record<string, string> = {}
    if ('vehicle' in f) updates.vehicle = f.vehicle ?? ''
    if ('year' in f) updates.year = f.year ?? ''
    if ('q' in f) updates.q = f.q ?? ''
    if ('trim' in f) updates.trim = f.trim ?? ''
    if ('drivetrain' in f) updates.drivetrain = f.drivetrain ?? ''
    if ('seats' in f) updates.seats = f.seats ?? ''
    if ('charging' in f) updates.charging = f.charging ?? ''
    if ('foldFlat' in f) updates.foldFlat = f.foldFlat ?? ''
    updateParams(updates)
  // Intentionally omit updateParams — it's stable but derived from router/searchParams,
  // and including it causes infinite re-render loops with router.push().
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const setInsightFilters = useCallback((f: Partial<InsightFilters>, replace = false) => {
    const updates: Record<string, string> = {}
    if ('condition' in f) updates.condition = f.condition ?? ''
    if ('budget' in f) updates.budget = f.budget ?? ''
    if ('pref1' in f) updates.pref1 = f.pref1 ?? ''
    if ('pref2' in f) updates.pref2 = f.pref2 ?? ''
    updateParams(updates, replace)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <>
      <Header activeTab={tab} />
      <main className="main">
        {tab === 'overview' && (
          <OverviewTab
            condition={insightCondition}
            budget={insightBudget}
            pref1={insightPref1}
            pref2={insightPref2}
            onFiltersChange={setInsightFilters}
          />
        )}
        {tab === 'comparison' && (
          <ComparisonTab
            filters={{ vehicle: cmpVehicle, year: cmpYear, trim: cmpTrim, q: cmpQ, drivetrain: cmpDrivetrain, seats: cmpSeats, charging: cmpCharging, foldFlat: cmpFoldFlat }}
            onFiltersChange={setCmpFilters}
            onRowClick={setDetailIdx}
          />
        )}
        {tab === 'specselect' && <SpecSelectTab onRowClick={setDetailIdx} />}
        {tab === 'sidebyside' && <SideBySideTab />}
        {tab === 'reference' && <ReferenceTab />}
      </main>
      <DetailPanel idx={detailIdx} onClose={() => setDetailIdx(null)} />
    </>
  )
}

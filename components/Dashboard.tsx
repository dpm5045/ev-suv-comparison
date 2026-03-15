'use client'

import { useCallback, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from './Header'
import NavTabs, { type TabId } from './NavTabs'
import DetailPanel from './DetailPanel'
import OverviewTab from './tabs/OverviewTab'
import ComparisonTab from './tabs/ComparisonV2Tab'
import SideBySideTab from './tabs/SideBySideTab'
import GlossaryTab from './tabs/GlossaryTab'
import AssumptionsTab from './tabs/AssumptionsTab'

export interface ComparisonFilters {
  vehicle: string
  year: string
  q: string
}

export default function Dashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read all filter state from URL
  const tab = (searchParams.get('tab') as TabId) || 'overview'
  const cmpVehicle = searchParams.get('vehicle') ?? ''
  const cmpYear = searchParams.get('year') ?? ''
  const cmpQ = searchParams.get('q') ?? ''
const [detailIdx, setDetailIdx] = useState<number | null>(null)

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const setCmpFilters = useCallback((f: Partial<ComparisonFilters>) => {
    const updates: Record<string, string> = {}
    if ('vehicle' in f) updates.vehicle = f.vehicle ?? ''
    if ('year' in f) updates.year = f.year ?? ''
    if ('q' in f) updates.q = f.q ?? ''
    updateParams(updates)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <>
      <Header />
      <NavTabs activeTab={tab} />
      <main className="main">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'comparison' && (
          <ComparisonTab
            filters={{ vehicle: cmpVehicle, year: cmpYear, q: cmpQ }}
            onFiltersChange={setCmpFilters}
            onRowClick={setDetailIdx}
          />
        )}
        {tab === 'sidebyside' && <SideBySideTab />}
        {tab === 'glossary' && <GlossaryTab />}
        {tab === 'assumptions' && <AssumptionsTab />}
      </main>
      <DetailPanel idx={detailIdx} onClose={() => setDetailIdx(null)} />
    </>
  )
}

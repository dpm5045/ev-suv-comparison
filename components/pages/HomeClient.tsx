'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '../Header'
import VehicleSummaryPanel from '../VehicleSummaryPanel'
import OverviewTab from '../tabs/OverviewTab'
import type { InsightFilters } from '../filter-types'

export default function HomeClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const condition = searchParams.get('condition') ?? ''
  const budget = searchParams.get('budget') ?? ''
  const pref1 = searchParams.get('pref1') ?? ''
  const pref2 = searchParams.get('pref2') ?? ''

  const [summaryVehicle, setSummaryVehicle] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const setInsightFilters = useCallback((f: Partial<InsightFilters>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const key of ['condition', 'budget', 'pref1', 'pref2'] as const) {
      if (key in f) {
        const v = f[key] ?? ''
        if (v) params.set(key, v)
        else params.delete(key)
      }
    }
    startTransition(() => router.replace(`?${params.toString()}`, { scroll: false }))
  // Intentionally omit router — including it causes re-render loops with replace().
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <>
      <Header activeTab="overview" />
      <main className="main">
        <OverviewTab
          condition={condition}
          budget={budget}
          pref1={pref1}
          pref2={pref2}
          onFiltersChange={setInsightFilters}
          onVehicleClick={setSummaryVehicle}
        />
      </main>
      <VehicleSummaryPanel vehicle={summaryVehicle} onClose={() => setSummaryVehicle(null)} />
    </>
  )
}

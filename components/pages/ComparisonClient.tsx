'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '../Header'
import DetailPanel from '../DetailPanel'
import ComparisonTab from '../tabs/ComparisonV2Tab'
import type { ComparisonFilters } from '../filter-types'

const FILTER_KEYS = ['vehicle', 'year', 'trim', 'q', 'drivetrain', 'seats', 'charging', 'foldFlat'] as const

export default function ComparisonClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [detailIdx, setDetailIdx] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  const filters: ComparisonFilters = {
    vehicle: searchParams.get('vehicle') ?? '',
    year: searchParams.get('year') ?? '',
    trim: searchParams.get('trim') ?? '',
    q: searchParams.get('q') ?? '',
    drivetrain: searchParams.get('drivetrain') ?? '',
    seats: searchParams.get('seats') ?? '',
    charging: searchParams.get('charging') ?? '',
    foldFlat: searchParams.get('foldFlat') ?? '',
  }

  const setFilters = useCallback((f: Partial<ComparisonFilters>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const key of FILTER_KEYS) {
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
      <Header activeTab="comparison" />
      <main className="main">
        <ComparisonTab filters={filters} onFiltersChange={setFilters} onRowClick={setDetailIdx} />
      </main>
      <DetailPanel idx={detailIdx} onClose={() => setDetailIdx(null)} />
    </>
  )
}

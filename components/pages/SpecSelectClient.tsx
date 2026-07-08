'use client'

import { useState } from 'react'
import Header from '../Header'
import DetailPanel from '../DetailPanel'
import SpecSelectTab from '../tabs/SpecSelectTab'

export default function SpecSelectClient() {
  const [detailIdx, setDetailIdx] = useState<number | null>(null)
  return (
    <>
      <Header activeTab="specselect" />
      <main className="main">
        <SpecSelectTab onRowClick={setDetailIdx} />
      </main>
      <DetailPanel idx={detailIdx} onClose={() => setDetailIdx(null)} />
    </>
  )
}

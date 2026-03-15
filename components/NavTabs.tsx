'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export type TabId = 'overview' | 'comparison' | 'sidebyside' | 'glossary' | 'assumptions'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'comparison', label: 'Detailed Comparison' },
  { id: 'sidebyside', label: 'Side-by-Side' },
  { id: 'assumptions', label: 'Approach & Assumptions' },
  { id: 'glossary', label: 'Glossary' },
]

interface Props {
  activeTab: TabId
}

export default function NavTabs({ activeTab }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleTab(id: TabId) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', id)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="nav-tabs-wrap">
      <nav className="nav-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`nav-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => handleTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

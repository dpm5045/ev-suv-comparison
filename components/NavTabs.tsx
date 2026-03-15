'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export type TabId = 'overview' | 'comparison' | 'trimlibrary' | 'sidebyside' | 'glossary' | 'assumptions'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sidebyside', label: 'Side-by-Side' },
  { id: 'trimlibrary', label: 'Trim Library' },
  { id: 'comparison', label: 'Detailed Comparison' },
  { id: 'assumptions', label: 'Approach & Assumptions' },
  { id: 'glossary', label: 'Glossary' },
]

interface Props {
  activeTab: TabId
}

export default function NavTabs({ activeTab }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label ?? 'Menu'

  function handleTab(id: TabId) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', id)
    router.push(`?${params.toString()}`, { scroll: false })
    setDrawerOpen(false)
  }

  return (
    <div className="nav-tabs-wrap">
      {/* ── Mobile: hamburger bar + drawer ── */}
      <div className="nav-mobile-bar">
        <button className="nav-hamburger" onClick={() => setDrawerOpen(!drawerOpen)}>
          {drawerOpen ? '\u2715' : '\u2630'}
        </button>
        <span className="nav-mobile-active">{activeTabLabel}</span>
      </div>
      {drawerOpen && <div className="nav-drawer-overlay" onClick={() => setDrawerOpen(false)} />}
      <div className={`nav-drawer${drawerOpen ? ' open' : ''}`}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`nav-drawer-item${activeTab === t.id ? ' active' : ''}`}
            onClick={() => handleTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Desktop: horizontal tabs (unchanged) ── */}
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

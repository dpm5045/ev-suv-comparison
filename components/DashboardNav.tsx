'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { TabId } from './Header'

const TABS: { id: TabId; label: string }[] = [
  { id: 'specselect', label: 'Spec & Select' },
  { id: 'sidebyside', label: 'Side-by-Side' },
  { id: 'comparison', label: 'The Full Monty' },
  { id: 'glossary', label: 'Glossary' },
]

interface Props {
  activeTab: TabId
}

export default function DashboardNav({ activeTab }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [themeUnlocked, setThemeUnlocked] = useState(false)

  useEffect(() => {
    function sync() {
      setThemeUnlocked(localStorage.getItem('theme-unlocked') === 'true')
    }
    sync()
    window.addEventListener('theme-change', sync)
    return () => window.removeEventListener('theme-change', sync)
  }, [])

  function handleSwitchMode() {
    const current = localStorage.getItem('theme') || 'dark'
    const next = current === 'dark' ? 'light' : 'dark'
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem('theme', next)
    window.dispatchEvent(new Event('theme-change'))
    setDrawerOpen(false)
  }

  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label ?? 'Home'

  function handleTab(id: TabId) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', id)
    router.push(`/?${params.toString()}`, { scroll: false })
    window.scrollTo(0, 0)
    setDrawerOpen(false)
  }

  return (
    <>
      {/* Desktop tabs */}
      <nav className="header-nav">
        <Link href="/" className={`nav-tab nav-tab-brand${activeTab === 'overview' ? ' active' : ''}`}>3RowEV</Link>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`nav-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => handleTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <Link href="/about" className={`nav-tab${activeTab === 'about' ? ' active' : ''}`}>About</Link>
      </nav>

      {/* Mobile hamburger */}
      <div className="nav-mobile-bar">
        <span className="nav-mobile-active">{activeTabLabel}</span>
        <button className="nav-hamburger" onClick={() => setDrawerOpen(!drawerOpen)}>
          {drawerOpen ? '\u2715' : '\u2630'}
        </button>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && <div className="nav-drawer-overlay" onClick={() => setDrawerOpen(false)} />}
      <div className={`nav-drawer${drawerOpen ? ' open' : ''}`}>
        <Link href="/" className={`nav-drawer-item${activeTab === 'overview' ? ' active' : ''}`} onClick={() => setDrawerOpen(false)}>Home</Link>
        {TABS.filter(t => t.id !== 'comparison').map(t => (
          <button
            key={t.id}
            className={`nav-drawer-item${activeTab === t.id ? ' active' : ''}`}
            onClick={() => handleTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <Link href="/about" className={`nav-drawer-item${activeTab === 'about' ? ' active' : ''}`} onClick={() => setDrawerOpen(false)}>About</Link>
        {themeUnlocked && (
          <button className="nav-drawer-item" onClick={handleSwitchMode}>Switch Mode</button>
        )}
      </div>
    </>
  )
}

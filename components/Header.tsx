'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardNav from './DashboardNav'

export type TabId = 'overview' | 'specselect' | 'comparison' | 'sidebyside' | 'glossary' | 'about'

interface Props {
  activeTab?: TabId
}

function NavFallback() {
  return (
    <nav className="header-nav">
      <Link href="/" className="nav-tab nav-tab-brand">3RowEV</Link>
      <Link href="/about" className="nav-tab">About</Link>
    </nav>
  )
}

function ThemeToggle() {
  const [unlocked, setUnlocked] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    function sync() {
      setUnlocked(localStorage.getItem('theme-unlocked') === 'true')
      setTheme((localStorage.getItem('theme') as 'dark' | 'light') || 'dark')
    }
    sync()
    window.addEventListener('theme-change', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('theme-change', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  if (!unlocked) return null

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem('theme', next)
    window.dispatchEvent(new Event('theme-change'))
  }

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}

export default function Header({ activeTab }: Props) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="header-brand">3RowEV</Link>

        {activeTab ? (
          <Suspense fallback={<NavFallback />}>
            <DashboardNav activeTab={activeTab} />
          </Suspense>
        ) : (
          <NavFallback />
        )}

        <ThemeToggle />
      </div>
    </header>
  )
}

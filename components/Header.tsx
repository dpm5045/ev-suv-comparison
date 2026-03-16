import { Suspense } from 'react'
import Link from 'next/link'
import DashboardNav from './DashboardNav'

export type TabId = 'overview' | 'specselect' | 'comparison' | 'sidebyside' | 'reference' | 'about'

interface Props {
  activeTab?: TabId
}

function NavFallback() {
  return (
    <nav className="header-nav">
      <Link href="/" className="nav-tab">Overview</Link>
      <Link href="/about" className="nav-tab">About</Link>
    </nav>
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
      </div>
    </header>
  )
}

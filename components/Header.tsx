import Link from 'next/link'

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="header-home-link">
          <span className="header-badge">EV Analysis</span>
          <span className="header-title">3-Row EV Market Comparison</span>
        </Link>
      </div>
    </header>
  )
}

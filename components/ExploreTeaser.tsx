import Link from 'next/link'

export default function ExploreTeaser() {
  return (
    <Link href="/explore" className="card explore-teaser">
      <svg viewBox="0 0 160 120" className="explore-teaser-svg" aria-hidden="true">
        {/* Background */}
        <rect x="0" y="0" width="160" height="120" rx="6" fill="var(--surface2)" />
        {/* Dashed crosshair lines */}
        <line x1="80" y1="10" x2="80" y2="110" stroke="var(--border)" strokeWidth="1" strokeDasharray="4,3" />
        <line x1="10" y1="60" x2="150" y2="60" stroke="var(--border)" strokeWidth="1" strokeDasharray="4,3" />
        {/* Scattered dots in quadrants */}
        <circle cx="35" cy="30" r="5" fill="#4ade80" opacity="0.8" />
        <circle cx="55" cy="42" r="7" fill="#5ba4f5" opacity="0.8" />
        <circle cx="45" cy="85" r="4" fill="#fb923c" opacity="0.8" />
        <circle cx="65" cy="95" r="6" fill="#f87171" opacity="0.8" />
        <circle cx="110" cy="25" r="6" fill="#a78bfa" opacity="0.8" />
        <circle cx="130" cy="38" r="4" fill="#fbbf24" opacity="0.8" />
        <circle cx="100" cy="80" r="5" fill="#f472b6" opacity="0.8" />
        <circle cx="125" cy="90" r="7" fill="#f59e0b" opacity="0.8" />
        {/* Subtle quadrant label */}
        <text x="40" y="22" fill="var(--text-dim)" fontSize="7" fontStyle="italic" textAnchor="middle" opacity="0.5">Best Value</text>
      </svg>
      <div className="card-title">Plot Your Data</div>
      <p className="count-note">Visualize any metric, side by side</p>
    </Link>
  )
}

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-col">
            <span className="footer-brand">3-Row EV Comparison</span>
            <p className="footer-tagline">
              Independent research tool for comparing every 3-row electric vehicle on the market.
            </p>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Site</h4>
            <nav className="footer-links">
              <Link href="/">Home</Link>
              <Link href="/about">About</Link>
              <Link href="/explore">Data Explorer</Link>
              <Link href="/privacy">Privacy Policy</Link>
            </nav>
          </div>

          <div className="footer-col">
            <h4 className="footer-heading">Contact</h4>
            <nav className="footer-links">
              <a href="mailto:contact@threerowev.com">contact@threerowev.com</a>
            </nav>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} threerowev.com. All rights reserved.</p>
          <p className="footer-disclaimer">
            Not affiliated with any automaker. Data sourced from public manufacturer specifications.
          </p>
        </div>
      </div>
    </footer>
  )
}

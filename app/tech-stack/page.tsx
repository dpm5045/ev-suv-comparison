import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL } from '@/lib/slugs'
import { DATA } from '@/lib/data'
import Header from '@/components/Header'
import Breadcrumb from '@/components/Breadcrumb'
import styles from './tech-stack.module.css'

export const metadata: Metadata = {
  title: 'Tech Stack & Data Pipeline',
  description: 'How ThreeRowEV.com is built — Next.js, TypeScript, Claude Code, and an automated data pipeline for 3-row electric vehicle specs.',
  alternates: { canonical: `${SITE_URL}/tech-stack` },
}

const TRIM_COUNT = DATA.details.length
const VEHICLE_COUNT = new Set(DATA.details.map((d) => d.vehicle)).size
const FIELD_COUNT = new Set(DATA.details.flatMap((d) => Object.keys(d))).size

export default function TechStackPage() {
  return (
    <>
      <Header />
      <main className="info-page" style={{ maxWidth: 920 }}>
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Tech Stack' },
        ]} />

        <h1 className="section-title">Tech Stack &amp; Data Pipeline</h1>
        <p className={styles.subtitle}>
          How we built and maintain a comprehensive comparison platform for 3-row electric SUVs — from live research to production deployment.
        </p>

        {/* ── TOC ── */}
        <nav className={styles.toc}>
          <div className={styles.tocTitle}>Contents</div>
          <ol className={styles.tocList}>
            <li><a href="#stack">Tech Stack</a></li>
            <li><a href="#architecture">Data Architecture</a></li>
            <li><a href="#sources">Data Sources</a></li>
            <li><a href="#pipeline">Automated Data Pipeline</a></li>
            <li><a href="#skills">Skill Commands</a></li>
            <li><a href="#guardrails">Guardrails &amp; Constraints</a></li>
            <li><a href="#deployment">Deployment &amp; Integrations</a></li>
          </ol>
        </nav>

        {/* ── 01 TECH STACK ── */}
        <section id="stack" className="info-section">
          <div className={styles.sectionNum}>01</div>
          <h2>Tech Stack</h2>
          <div className={styles.techGrid}>
            <TechCard label="Framework" value="Next.js 14" detail="App Router with TypeScript. Server & client components, URL-driven filter state via useSearchParams()." />
            <TechCard label="Language" value="TypeScript 5" detail="Typed interfaces for every data shape — DetailRow, PreownedRow, CountRow, GlossaryRow, and more." />
            <TechCard label="Styling" value="Custom CSS" detail="CSS variables for dark/light theming. DM Sans + JetBrains Mono fonts. Responsive dual-render pattern." />
            <TechCard label="Visualization" value="Chart.js" detail="Chart.js with react-chartjs-2 for every chart — bar, line, mixed, and the Explore scatter with a custom quadrant plugin." />
            <TechCard label="Deployment" value="Vercel" detail="Zero-config deploys from Git. HSTS, X-Frame-Options: DENY, strict referrer policy, permissions restrictions." />
            <TechCard label="Automation" value="GitHub Actions" detail="Weekly scripts reprice used vehicles and check EPA ranges and price pages; a Claude Code agent researches what they can't settle." />
          </div>
        </section>

        {/* ── 02 DATA ARCHITECTURE ── */}
        <section id="architecture" className="info-section">
          <div className={styles.sectionNum}>02</div>
          <h2>Data Architecture</h2>
          <p>
            All vehicle data lives in a single source of truth: <code className={styles.code}>lib/ev-data.json</code>.
            TypeScript interfaces in <code className={styles.code}>lib/data.ts</code> export a typed <code className={styles.code}>DATA</code> singleton consumed by every component.
          </p>

          <div className={styles.schemaBlock}>
            <div className={styles.schemaBrace}>{'{'}</div>
            <SchemaLine k="details" type="DetailRow[]" comment={`${TRIM_COUNT} trims across ${VEHICLE_COUNT} vehicles, ${FIELD_COUNT} fields each`} />
            <SchemaLine k="preowned" type="PreownedRow[]" comment="pre-owned pricing, synced with details" />
            <SchemaLine k="count_data" type="CountRow[]" comment="sales & availability by model year (2021–2027)" />
            <SchemaLine k="count_totals" type="CountTotals" comment="annual sums" />
            <SchemaLine k="us_ev_sales" type="USEVSales" comment="market context (630K–1.3M vehicles/year)" />
            <SchemaLine k="glossary" type="GlossaryRow[]" comment="field definitions" />
            <SchemaLine k="assumptions" type="AssumptionRow[]" comment="PA tax 6%, fees $905" />
            <div className={styles.schemaBrace}>{'}'}</div>
          </div>

          <h3>Out-the-Door Price Formula</h3>
          <div className={styles.formula}>
            <div className={styles.formulaLabel}>New vehicle:</div>
            <div>otd_new = (msrp + destination) &times; 1.06 + $905</div>
            <br />
            <div className={styles.formulaLabel}>Pre-owned vehicle:</div>
            <div>otd_preowned = price &times; 1.06 + $905</div>
            <br />
            <div className={styles.formulaLabel}>Fee breakdown:</div>
            <div>$905 = $422 doc + $233 title/reg + $250 EV road-use fee</div>
          </div>

          <h3>Component Structure</h3>
          <pre className={styles.pre}><code>{`app/ (each tab is a real route)
├── /                  OverviewTab — Speed Dating matches
├── /comparison        ComparisonV2Tab — filterable table
├── /side-by-side      SideBySideTab — compare up to 3 trims
├── /spec-select       SpecSelectTab — guided filtering
├── /glossary          GlossaryTab — field definitions
├── /market-insights   DataStories + DataExplorer — charts
└── DetailPanel        slide-in sidebar for full specs`}</code></pre>
        </section>

        {/* ── 03 DATA SOURCES ── */}
        <section id="sources" className="info-section">
          <div className={styles.sectionNum}>03</div>
          <h2>Data Sources</h2>
          <p>
            Facts that come in a fixed, machine-readable form are read by <strong>scripts</strong>: used-car
            price trends from CarGurus and EPA range ratings from the fueleconomy.gov vehicle file. Everything
            else is researched by <strong>Claude Code</strong> against the sources below. Every value it changes
            must come from a page it actually fetched, and that page, the date and a short quote are recorded
            in a provenance file next to the data. No source, no change.
          </p>

          <h3>OEM Sites <span className={`${styles.badge} ${styles.badgeBlue}`}>Official Specs &amp; MSRP</span></h3>
          <div className={styles.sourceTags}>
            {['tesla.com','rivian.com','kia.com','hyundaiusa.com','cadillac.com','mbusa.com','volvocars.com','lucidmotors.com','vw.com','subaru.com','toyota.com'].map(s =>
              <span key={s} className={`${styles.sourceTag} ${styles.tagOem}`}>{s}</span>
            )}
          </div>

          <h3>Automotive Reference <span className={`${styles.badge} ${styles.badgeGreen}`}>Pricing &amp; Reviews</span></h3>
          <div className={styles.sourceTags}>
            {['edmunds.com','kbb.com','cars.com','caranddriver.com','truecar.com','carfax.com','carbuzz.com','insideevs.com','electrek.co','topspeed.com'].map(s =>
              <span key={s} className={`${styles.sourceTag} ${styles.tagRef}`}>{s}</span>
            )}
          </div>

          <h3>Specs Databases <span className={`${styles.badge} ${styles.badgeAmber}`}>EPA &amp; Technical</span></h3>
          <div className={styles.sourceTags}>
            {['evkx.net','evspecifications.com','fueleconomy.gov','en.wikipedia.org','usnews.com/cars'].map(s =>
              <span key={s} className={`${styles.sourceTag} ${styles.tagSpecs}`}>{s}</span>
            )}
          </div>
        </section>

        {/* ── 04 PIPELINE ── */}
        <section id="pipeline" className="info-section">
          <div className={styles.sectionNum}>04</div>
          <h2>Automated Data Pipeline</h2>
          <p>
            The pipeline runs on its own in <strong>GitHub Actions</strong>. Rule-based scripts handle what
            can be decided by fixed rules; a <strong>Claude Code agent</strong> handles what needs reading and
            judgment; a person reviews everything the agent writes before it goes live.
          </p>

          <div className={styles.pipeline}>
            <PipelineStep label="Weekly Used-Price Repricing" desc="Every Monday a script reads CarGurus price trends per vehicle and model year. A group is repriced when its average has moved 3% or more since the last reprice; moves over 15% are held for review. The change merges automatically once validation passes." />
            <PipelineStep label="Weekly Data Watch" desc="A second script checks every stored range against the EPA vehicle file, correcting it where an earlier EPA match shows which variant the trim is, and watches manufacturer and Car and Driver pages for price changes." />
            <PipelineStep label="Data Inbox" desc="Whatever the scripts can't settle on their own lands in one inbox: a large price move, a range EPA disagrees with, a price page that changed." />
            <PipelineStep label="Data Agent" desc="Claude Code runs unattended after the watch and once a month for a full pass: it researches each inbox item, adds new model years when manufacturers publish prices, and records a source for every value. Items it can't confirm are set aside, never guessed." />
            <PipelineStep label="Review" desc="The agent's changes arrive as a pull request that a person reviews. Rule-based script changes merge on their own." />
            <PipelineStep label="Validation" desc="Required fields, numeric sanity ranges, count totals, details↔preowned sync, provenance entries, unit tests and a full production build run before anything merges." />
            <PipelineStep label="Deploy & Backup" desc="Vercel deploys on merge. A Claude Sheet keeps a browsable backup of every table, including the sources." last />
          </div>
        </section>

        {/* ── 05 SKILL COMMANDS ── */}
        <section id="skills" className="info-section">
          <div className={styles.sectionNum}>05</div>
          <h2>Skill Commands</h2>
          <p>Each slash command is a structured Claude Code skill with defined phases, guardrails, and output expectations.</p>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Command</th>
                  <th>Purpose</th>
                  <th>Key Behavior</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.cellCmd}>/refresh</td>
                  <td>Full 5-phase data refresh</td>
                  <td>Pre-owned pricing &rarr; TBD resolution &rarr; spec corrections &rarr; new vehicle detection &rarr; gap filling.</td>
                </tr>
                <tr>
                  <td className={styles.cellCmd}>/add-vehicle</td>
                  <td>Add a new 3-row EV</td>
                  <td>Researches all trims, populates all fields, updates 4 files (data, types, CSS, glossary), calculates OTD.</td>
                </tr>
                <tr>
                  <td className={styles.cellCmd}>/update-pricing</td>
                  <td>MSRP &amp; pre-owned updates</td>
                  <td>New prices from manufacturer pages; used prices from the CarGurus repricing script.</td>
                </tr>
                <tr>
                  <td className={styles.cellCmd}>/scan-watchlist</td>
                  <td>Monitor unreleased vehicles</td>
                  <td>Update existing watchlist &rarr; scan for new 3-row EVs &rarr; check graduation criteria.</td>
                </tr>
                <tr>
                  <td className={styles.cellCmd}>/spot-check</td>
                  <td>Quick manual audit</td>
                  <td>User-directed verification of specific vehicles or fields against live sources.</td>
                </tr>
                <tr>
                  <td className={styles.cellCmd}>/validate</td>
                  <td>Read-only integrity check</td>
                  <td>Required fields, OTD consistency, numeric ranges, count totals, array sync, TypeScript build.</td>
                </tr>
                <tr>
                  <td className={styles.cellCmd}>/add-field</td>
                  <td>Extend the data model</td>
                  <td>Adds a new spec field to DetailRow across all entries, updates interfaces and UI registry.</td>
                </tr>
                <tr>
                  <td className={styles.cellCmd}>/sync-sheet</td>
                  <td>Refresh the backup Sheet</td>
                  <td>Exports every table, sources included, and replaces the tabs of the backup Claude Sheet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 06 GUARDRAILS ── */}
        <section id="guardrails" className="info-section">
          <div className={styles.sectionNum}>06</div>
          <h2>Guardrails &amp; Constraints</h2>
          <ul className={styles.guardrails}>
            <li><strong>Never hardcode counts.</strong> Vehicle and trim counts are always derived from DATA at runtime — no hardcoded numbers anywhere.</li>
            <li><strong>Protected fields.</strong> Seats, cargo dimensions (behind 3rd/2nd/1st row), fold-flat, and cargo floor width are never auto-modified.</li>
            <li><strong>Array sync.</strong> The details and preowned arrays must stay in sync: same vehicle names, matching preowned_range values.</li>
            <li><strong>OTD is computed, never stored.</strong> Out-the-door prices are worked out from MSRP, destination and used-price ranges when the data loads, so they can&apos;t drift.</li>
            <li><strong>No source, no change.</strong> Every researched value records the page it came from, the date and a quote. A source that can&apos;t be reached changes nothing.</li>
            <li><strong>Count totals.</strong> Year-column sums in count_data are reconciled against count_totals after every vehicle add or remove.</li>
            <li><strong>TBD vs. null vs. N/A.</strong> null = field doesn&apos;t apply. &quot;TBD&quot; = not yet found. &quot;N/A&quot; = not applicable for this trim.</li>
            <li><strong>Review gate.</strong> Changes researched by the agent go live only after a person reviews them. Only rule-based script changes merge on their own.</li>
          </ul>
        </section>

        {/* ── 07 DEPLOYMENT ── */}
        <section id="deployment" className="info-section">
          <div className={styles.sectionNum}>07</div>
          <h2>Deployment &amp; Integrations</h2>
          <div className={styles.techGrid}>
            <TechCard label="Hosting" value="Vercel" detail="Auto-deploys from Git on push. Domain: threerowev.com." />
            <TechCard label="Data Backup" value="Claude Sheets" detail="Every table, including sources and used-price baselines, in a browsable spreadsheet refreshed with /sync-sheet." />
            <TechCard label="AI Integration" value="Claude API" detail="News endpoint (currently paused) proxies to Claude with web_search tool for live EV news summaries." />
            <TechCard label="Monetization" value="Amazon Associates" detail="Context-aware affiliate links: charging adapters matched to NACS/CCS, portable chargers, accessories." />
            <TechCard label="Email" value="Cloudflare Routing" detail="contact@threerowev.com routes to Gmail via Cloudflare email routing." />
            <TechCard label="Security" value="Hardened Headers" detail="HSTS with preload, X-Frame-Options: DENY, strict referrer policy, camera/mic/geo blocked." />
          </div>
        </section>

        <div style={{ marginTop: '2rem' }}>
          <Link href="/" className="back-link">&larr; Back to comparison tool</Link>
        </div>
      </main>
    </>
  )
}

/* ── Helper components ── */

function TechCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className={styles.techCard}>
      <div className={styles.techCardLabel}>{label}</div>
      <div className={styles.techCardValue}>{value}</div>
      <div className={styles.techCardDetail}>{detail}</div>
    </div>
  )
}

function SchemaLine({ k, type, comment }: { k: string; type: string; comment: string }) {
  return (
    <div className={styles.schemaLine}>
      <span className={styles.schemaKey}>{k}</span>: <span className={styles.schemaType}>{type}</span>
      {' '}<span className={styles.schemaComment}>{'// '}{comment}</span>
    </div>
  )
}

function PipelineStep({ label, desc, last }: { label: string; desc: string; last?: boolean }) {
  return (
    <div className={styles.pipelineStep}>
      <div className={styles.pipelineTrack}>
        <div className={styles.pipelineDot} />
        {!last && <div className={styles.pipelineLine} />}
      </div>
      <div className={styles.pipelineContent}>
        <div className={styles.pipelineLabel}>{label}</div>
        <div className={styles.pipelineDesc}>{desc}</div>
      </div>
    </div>
  )
}

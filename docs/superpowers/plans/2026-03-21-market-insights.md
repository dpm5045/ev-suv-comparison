# Market Insights Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone HTML page (`market-insights.html`) with 5 chart sections analyzing the 3-row EV market at the macro level using Chart.js.

**Architecture:** Single standalone HTML file loading `lib/ev-data.json` via fetch. Chart.js loaded via CDN. All data filtering, aggregation, and chart rendering in inline `<script>`. Dark theme matching `explore.html`. No build step, no framework — just open in a browser.

**Tech Stack:** HTML, Chart.js (CDN), vanilla JS, CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-21-market-insights-design.md`

**No test framework** is configured for this project. Each task includes a manual verification step instead.

---

## File Structure

- **Create:** `market-insights.html` — the entire page (HTML + CSS + JS in a single file, matching the `explore.html` pattern)

No other files are created or modified.

---

## Task 1: Page Shell — HTML, CSS, Data Loading, and Section Navigation

**Files:**
- Create: `market-insights.html`

This task creates the full page skeleton: dark-themed layout, sticky section nav, data loading with watchlist filtering, vehicle color palette, and 5 empty section placeholders. Every subsequent task adds charts into these placeholders.

- [ ] **Step 1: Create `market-insights.html` with full page shell**

```html
<!-- Key structural elements (not full code — implementer builds the complete file): -->

<!-- Head: Chart.js CDN, Google Fonts (DM Sans, Libre Franklin), CSS custom properties -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>

<!-- CSS: Copy the CSS custom property block from explore.html (lines 13-25) for consistent theming:
  --bg-primary: #0f0f1a;
  --bg-elevated: #171726;
  --bg-surface: #1e1e32;
  --border-subtle: rgba(255,255,255,0.06);
  --border-medium: rgba(255,255,255,0.12);
  --text-primary: #e8e8f0;
  --text-secondary: #9898b0;
  --accent: #6b8afd;
  --font-sans: 'Libre Franklin', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
-->

<!-- Body structure: -->
<div class="content" style="max-width:1100px; margin:0 auto;">
  <header>
    <h1>3-Row EV Market Insights</h1>
    <p class="byline">A data-driven look at the 3-row electric SUV segment</p>
  </header>

  <!-- Sticky section nav -->
  <nav class="section-nav" id="section-nav">
    <a href="#growth">Market Growth</a>
    <a href="#price">Price Landscape</a>
    <a href="#capability">Capability Evolution</a>
    <a href="#tradeoffs">Market Trade-offs</a>
    <a href="#tech">Tech Adoption</a>
  </nav>

  <!-- 5 section containers with id anchors -->
  <section id="growth" class="chart-section">
    <h2>Market Growth</h2>
    <p class="section-subtitle">How the 3-row EV segment exploded from one vehicle to a full market</p>
    <div class="stat-callouts" id="growth-stats"></div>
    <div class="chart-wrap"><canvas id="chart-growth"></canvas></div>
  </section>

  <section id="price" class="chart-section">
    <h2>Price Landscape</h2>
    <p class="section-subtitle">What the market looks like when you shop by budget</p>
    <div class="chart-wrap"><canvas id="chart-price-range"></canvas></div>
    <div class="chart-wrap"><canvas id="chart-price-segment"></canvas></div>
  </section>

  <section id="capability" class="chart-section">
    <h2>Capability Evolution</h2>
    <p class="section-subtitle">How range, charging, and performance have improved over time</p>
    <div class="stat-callouts" id="capability-stats"></div>
    <div class="chart-wrap"><canvas id="chart-capability"></canvas></div>
  </section>

  <section id="tradeoffs" class="chart-section">
    <h2>Market Trade-offs</h2>
    <p class="section-subtitle">What the market forces you to give up</p>
    <div class="chart-wrap"><canvas id="chart-range-vs-price"></canvas></div>
    <div class="chart-wrap"><canvas id="chart-cargo-vs-speed"></canvas></div>
  </section>

  <section id="tech" class="chart-section">
    <h2>Tech Adoption</h2>
    <p class="section-subtitle">How key technologies have spread across the segment</p>
    <div class="chart-wrap"><canvas id="chart-charging"></canvas></div>
    <div class="chart-wrap"><canvas id="chart-self-driving"></canvas></div>
    <div class="chart-wrap"><canvas id="chart-seats"></canvas></div>
  </section>
</div>
```

- [ ] **Step 2: Add CSS styling**

Style the following elements to match `explore.html` dark theme:
- `body` — `background: var(--bg-primary)`, font, antialiasing
- `.content` — max-width 1100px, centered, padding
- `header h1` — DM Sans, 32px, font-weight 800, letter-spacing -0.03em
- `.section-nav` — sticky top, flex row, dark background, border-bottom, z-index 100. Links styled as pill-shaped anchor buttons. Active state via scroll spy (JS in step 4).
- `.chart-section` — margin-bottom 3rem, padding-top to offset sticky nav
- `.chart-wrap` — background `var(--bg-elevated)`, border-radius 12px, padding 1.5rem, margin-bottom 1.5rem
- `.stat-callouts` — flex row of stat cards (value + label), gap 1rem, wrap on mobile
- Each stat card: bg `var(--bg-surface)`, border-radius 10px, padding, large number + small label below
- `h2` — DM Sans, 24px weight 700
- `.section-subtitle` — font-size 0.9rem, `var(--text-secondary)`, margin-bottom 1rem
- Responsive: at max-width 768px, stat callouts become a 2-column grid, section nav scrolls horizontally

- [ ] **Step 3: Add JavaScript — data loading, filtering, constants**

```javascript
// Vehicle color palette (copied from explore.html line 271-284)
const VEHICLE_COLORS = {
  "Kia EV9":               "#4ade80",
  "Hyundai IONIQ 9":       "#5ba4f5",
  "Lucid Gravity":         "#a78bfa",
  "Rivian R1S":            "#fb923c",
  "Tesla Model X":         "#f87171",
  "Tesla Model Y (3-Row)": "#f87171",
  "Volkswagen ID. Buzz":   "#fbbf24",
  "VinFast VF9":           "#f59e0b",
  "Volvo EX90":            "#f472b6",
  "Cadillac Escalade IQ":  "#a78bfa",
  "Cadillac VISTIQ":       "#c084fc",
  "Mercedes-Benz EQS SUV": "#d4d4d8",
};

const WATCHLIST = [
  "Subaru 3-Row EV", "BMW iX7", "Genesis GV90",
  "Toyota Highlander EV", "Tesla Model Y Long (Asia)",
];

const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];
const YEAR_KEYS = YEARS.map(y => `y${y}`);

// Charging type category mapping (from spec)
const CHARGING_CATEGORIES = {
  "NACS":              "Native NACS",
  "NACS (+CCS adpt)":  "Native NACS",
  "NACS (+CCS incl)":  "Native NACS",
  "NACS / GB-T":       "Native NACS",
  "Tesla (pre-NACS)":  "Native NACS",
  "CCS (+NACS adpt)":  "CCS (NACS adapter)",
  "CCS1 (+NACS adpt)": "CCS (NACS adapter)",
  "CCS":               "CCS Only",
  "CCS1":              "CCS Only",
  "TBD":               "TBD",
  "TBD (NACS likely)": "TBD",
};

// Chart.js dark theme defaults
Chart.defaults.color = '#9898b0';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Libre Franklin', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

async function loadData() {
  const res = await fetch("lib/ev-data.json");
  const raw = await res.json();

  // Filter details: exclude watchlist and year >= 2027
  const details = raw.details.filter(d =>
    !WATCHLIST.includes(d.vehicle) && d.year < 2027
  );

  // Filter count_data: exclude watchlist models
  const countData = raw.count_data.filter(d =>
    !WATCHLIST.includes(d.model)
  );

  return { details, countData };
}
```

- [ ] **Step 4: Add scroll-spy for sticky nav active state**

```javascript
// Intersection Observer to highlight active section in nav
function initScrollSpy() {
  const sections = document.querySelectorAll('.chart-section');
  const navLinks = document.querySelectorAll('.section-nav a');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => link.classList.remove('active'));
        const active = document.querySelector(`.section-nav a[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });

  sections.forEach(s => observer.observe(s));
}
```

- [ ] **Step 5: Wire up main() function and verify page loads**

```javascript
async function main() {
  try {
    const { details, countData } = await loadData();
    initScrollSpy();

    // Each renderSection function will be added in subsequent tasks
    renderGrowth(details, countData);
    renderPrice(details);
    renderCapability(details);
    renderTradeoffs(details);
    renderTech(details);
  } catch (err) {
    document.querySelector('.content').innerHTML =
      `<p style="color:#f87171;text-align:center;padding:4rem;">Failed to load data: ${err.message}</p>`;
  }
}

// Stub all render functions so page loads without errors
function renderGrowth() {}
function renderPrice() {}
function renderCapability() {}
function renderTradeoffs() {}
function renderTech() {}

main();
```

- [ ] **Step 6: Verify page shell loads**

Open `market-insights.html` in browser (via the existing HTTP server or directly). Verify:
- Dark theme renders correctly
- Header, sticky nav, and 5 section placeholders visible
- Sticky nav links scroll to correct sections
- No console errors
- Data loads without errors (check Network tab)

- [ ] **Step 7: Commit**

```bash
git add market-insights.html
git commit -m "feat(insights): page shell with data loading, nav, and section placeholders"
```

---

## Task 2: Section 1 — Market Growth (Stacked Bar + Stat Callouts)

**Files:**
- Modify: `market-insights.html`

Replace the `renderGrowth` stub with the full implementation.

- [ ] **Step 1: Implement stat callouts**

Compute dynamically from data (never hardcode counts per CLAUDE.md):
- **Distinct models**: count unique `vehicle` values in `details` for the earliest year with data vs. latest year (2026)
- **Available trims**: sum from `countData` — for earliest year vs. latest year
- **Price range**: `min(msrp)` and `max(msrp)` from `details` filtered to earliest year vs. latest year

Render as HTML stat cards into `#growth-stats`:
```javascript
function renderGrowth(details, countData) {
  // --- Stat callouts ---
  const statsEl = document.getElementById('growth-stats');

  // Models per year (from details)
  const modelsByYear = {};
  YEARS.forEach(y => {
    modelsByYear[y] = new Set(details.filter(d => d.year === y).map(d => d.vehicle)).size;
  });
  const firstYearWithData = YEARS.find(y => modelsByYear[y] > 0);
  const latestYear = YEARS[YEARS.length - 1];

  // Trims per year (from countData)
  const trimsByYear = {};
  YEARS.forEach(y => {
    trimsByYear[y] = countData.reduce((sum, row) => sum + (row[`y${y}`] || 0), 0);
  });

  // Price range per year (from details)
  const priceFirstYear = details.filter(d => d.year === firstYearWithData).map(d => d.msrp).filter(Boolean);
  const priceLatestYear = details.filter(d => d.year === latestYear).map(d => d.msrp).filter(Boolean);

  statsEl.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${modelsByYear[firstYearWithData]} → ${modelsByYear[latestYear]}</div>
      <div class="stat-label">Models Available</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${trimsByYear[firstYearWithData]} → ${trimsByYear[latestYear]}</div>
      <div class="stat-label">Trims Analyzed</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">$${Math.round(Math.min(...priceFirstYear)/1000)}k–$${Math.round(Math.max(...priceFirstYear)/1000)}k → $${Math.round(Math.min(...priceLatestYear)/1000)}k–$${Math.round(Math.max(...priceLatestYear)/1000)}k</div>
      <div class="stat-label">MSRP Range</div>
    </div>
  `;
  // ... chart rendering in next step
}
```

- [ ] **Step 2: Implement stacked bar chart**

Build a Chart.js stacked bar chart inside `renderGrowth`:

```javascript
  // --- Stacked bar chart ---
  // One dataset per vehicle, each with 6 data points (one per year)
  const vehicles = [...new Set(countData.map(d => d.model))].sort();

  const datasets = vehicles
    .filter(v => YEAR_KEYS.some(k => countData.find(d => d.model === v)?.[k] > 0))
    .map(vehicle => ({
      label: vehicle,
      data: YEAR_KEYS.map(k => {
        const row = countData.find(d => d.model === vehicle);
        return row ? (row[k] || 0) : 0;
      }),
      backgroundColor: VEHICLE_COLORS[vehicle] || '#888',
    }));

  new Chart(document.getElementById('chart-growth'), {
    type: 'bar',
    data: {
      labels: YEARS.map(String),
      datasets,
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
        tooltip: { mode: 'index' },
      },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, title: { display: true, text: 'Number of Trims' }, beginAtZero: true },
      },
    },
  });
```

- [ ] **Step 3: Verify Section 1**

Open page in browser. Verify:
- Three stat cards display with correct dynamic values
- Stacked bar chart shows 2021–2026, bars colored per vehicle
- Chart legend lists all non-watchlist vehicles
- Hovering shows tooltip with per-vehicle breakdown
- No console errors

- [ ] **Step 4: Commit**

```bash
git add market-insights.html
git commit -m "feat(insights): section 1 — market growth stacked bar chart and stat callouts"
```

---

## Task 3: Section 2 — Price Landscape (Horizontal Range + Grouped Bar)

**Files:**
- Modify: `market-insights.html`

Replace the `renderPrice` stub.

- [ ] **Step 1: Implement horizontal floating bar chart (Chart A)**

For each non-watchlist vehicle, find its latest model year, then compute min/max MSRP across trims for that year. Use Chart.js floating bar: `type: 'bar'` with `indexAxis: 'y'` and data as `[min, max]` tuples.

```javascript
function renderPrice(details) {
  // --- Chart A: Horizontal price ranges ---
  const vehicles = [...new Set(details.map(d => d.vehicle))].sort();

  const priceData = vehicles.map(v => {
    const vTrims = details.filter(d => d.vehicle === v && d.msrp != null);
    // Latest year for this vehicle
    const latestYear = Math.max(...vTrims.map(d => d.year));
    const latestTrims = vTrims.filter(d => d.year === latestYear);
    const prices = latestTrims.map(d => d.msrp);
    return {
      vehicle: v,
      min: Math.min(...prices),
      max: Math.max(...prices),
      year: latestYear,
    };
  }).sort((a, b) => a.min - b.min); // sort by lowest price

  new Chart(document.getElementById('chart-price-range'), {
    type: 'bar',
    data: {
      labels: priceData.map(d => d.vehicle),
      datasets: [{
        data: priceData.map(d => [d.min, d.max]),
        backgroundColor: priceData.map(d => VEHICLE_COLORS[d.vehicle] || '#888'),
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const [min, max] = ctx.raw;
              return `$${(min/1000).toFixed(0)}k – $${(max/1000).toFixed(0)}k`;
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'MSRP ($)' },
          ticks: { callback: v => `$${(v/1000).toFixed(0)}k` },
        },
        y: { grid: { display: false } },
      },
    },
  });

  // Chart B rendered in next step...
}
```

- [ ] **Step 2: Implement grouped bar chart by price segment (Chart B)**

Append to `renderPrice`:

```javascript
  // --- Chart B: Trims by price segment ---
  const segments = [
    { label: 'Under $60k', min: 0, max: 60000 },
    { label: '$60k–$90k', min: 60000, max: 90000 },
    { label: '$90k+', min: 90000, max: Infinity },
  ];

  // Reuse priceData from Chart A to get latest-year trims (same filter logic)
  const latestYearTrims = [];
  priceData.forEach(pd => {
    latestYearTrims.push(
      ...details.filter(d => d.vehicle === pd.vehicle && d.year === pd.year && d.msrp != null)
    );
  });

  const segVehicles = vehicles.filter(v =>
    latestYearTrims.some(d => d.vehicle === v)
  );

  const segmentDatasets = segVehicles.map(v => ({
    label: v,
    data: segments.map(seg =>
      latestYearTrims.filter(d =>
        d.vehicle === v && d.msrp >= seg.min && d.msrp < seg.max
      ).length
    ),
    backgroundColor: VEHICLE_COLORS[v] || '#888',
  }));

  new Chart(document.getElementById('chart-price-segment'), {
    type: 'bar',
    data: {
      labels: segments.map(s => s.label),
      datasets: segmentDatasets,
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { title: { display: true, text: 'Number of Trims' }, beginAtZero: true },
      },
    },
  });
```

- [ ] **Step 3: Verify Section 2**

Open page in browser. Verify:
- Chart A: Horizontal bars show min–max MSRP per vehicle, sorted by price, colored correctly
- Chart B: Grouped bars show trim counts in each price segment, colored by vehicle
- Tooltips display dollar amounts correctly
- No console errors

- [ ] **Step 4: Commit**

```bash
git add market-insights.html
git commit -m "feat(insights): section 2 — price landscape (horizontal range + grouped bar)"
```

---

## Task 4: Section 3 — Capability Evolution (Normalized Multi-Line + Stats)

**Files:**
- Modify: `market-insights.html`

Replace the `renderCapability` stub.

- [ ] **Step 1: Implement normalized multi-line chart and stat callouts**

Compute the segment average per year for each metric. Normalize as % change from 2021 baseline. For DC fast charge time, invert so improvement shows upward.

```javascript
function renderCapability(details) {
  const metrics = [
    { field: 'range_mi', label: 'EPA Range', color: '#4ade80', invert: false },
    { field: 'dc_fast_charge_10_80_min', label: 'DC Fast Charge (10-80%)', color: '#5ba4f5', invert: true },
    { field: 'hp', label: 'Horsepower', color: '#fb923c', invert: false },
    { field: 'battery_kwh', label: 'Battery Capacity', color: '#a78bfa', invert: false },
  ];

  // Compute average per year for each metric (skip nulls)
  function avgByYear(field) {
    return YEARS.map(y => {
      const vals = details.filter(d => d.year === y && d[field] != null).map(d => d[field]);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    });
  }

  const rawAverages = {};
  metrics.forEach(m => { rawAverages[m.field] = avgByYear(m.field); });

  // Normalize to % change from 2021 baseline
  const datasets = metrics.map(m => {
    const avgs = rawAverages[m.field];
    const baseline = avgs[0]; // 2021
    if (baseline == null || baseline === 0) return null;

    const normalized = avgs.map(v => {
      if (v == null) return null;
      const pctChange = ((v - baseline) / baseline) * 100;
      return m.invert ? -pctChange : pctChange; // invert: decrease = improvement
    });

    return {
      label: m.label,
      data: normalized,
      borderColor: m.color,
      backgroundColor: m.color + '22',
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6,
      spanGaps: true,
    };
  }).filter(Boolean);

  // --- Stat callouts ---
  const statsEl = document.getElementById('capability-stats');
  const statItems = metrics.map(m => {
    const avgs = rawAverages[m.field];
    const first = avgs[0];
    const last = avgs[avgs.length - 1];
    if (first == null || last == null) return '';
    const pctChange = ((last - first) / first) * 100;
    // For inverted metrics (charge time), show the improvement as a positive "up" value
    // matching the chart where the inverted line goes UP for improvements
    const displayPct = m.invert ? -pctChange : pctChange;
    const isImprovement = displayPct > 0;
    const arrow = isImprovement ? '↑' : '↓';
    return `
      <div class="stat-card">
        <div class="stat-value" style="color: ${isImprovement ? '#4ade80' : '#f87171'}">${arrow} ${Math.abs(displayPct).toFixed(0)}%</div>
        <div class="stat-label">${m.label}</div>
      </div>
    `;
  }).join('');
  statsEl.innerHTML = statItems;

  // --- Line chart ---
  // Add sample size annotation per year
  const sampleSizes = YEARS.map(y => details.filter(d => d.year === y).length);

  new Chart(document.getElementById('chart-capability'), {
    type: 'line',
    data: {
      labels: YEARS.map((y, i) => `${y} (n=${sampleSizes[i]})`),
      datasets,
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y >= 0 ? '+' : ''}${ctx.parsed.y.toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          title: { display: true, text: '% Change from 2021 Baseline' },
          ticks: { callback: v => `${v >= 0 ? '+' : ''}${v}%` },
        },
      },
    },
  });
}
```

- [ ] **Step 2: Verify Section 3**

Open page. Verify:
- 4 stat cards show % change with green (improvement) or red (regression) coloring
- Line chart shows 4 colored lines, all starting at 0% in 2021
- X-axis labels include sample sizes (e.g., "2021 (n=6)")
- DC fast charge line goes UP when charge times decrease (inversion works)
- Hover tooltips show % values with +/- sign
- No console errors

- [ ] **Step 3: Commit**

```bash
git add market-insights.html
git commit -m "feat(insights): section 3 — capability evolution (normalized multi-line + stats)"
```

---

## Task 5: Section 4 — Market Trade-offs (Two Scatter Plots)

**Files:**
- Modify: `market-insights.html`

Replace the `renderTradeoffs` stub.

- [ ] **Step 1: Implement both scatter plots**

Chart.js scatter charts use `type: 'scatter'` with `{x, y}` data points. Create one dataset per vehicle so each gets its own color.

```javascript
function renderTradeoffs(details) {
  // Helper: build per-vehicle scatter datasets
  function buildScatterDatasets(data, xField, yField) {
    const vehicles = [...new Set(data.map(d => d.vehicle))].sort();
    return vehicles.map(v => {
      const points = data
        .filter(d => d.vehicle === v && d[xField] != null && d[yField] != null)
        .map(d => ({ x: d[xField], y: d[yField], name: d.name }));
      return {
        label: v,
        data: points,
        backgroundColor: VEHICLE_COLORS[v] || '#888',
        pointRadius: 6,
        pointHoverRadius: 9,
      };
    }).filter(ds => ds.data.length > 0);
  }

  // --- Chart A: Range vs MSRP ---
  new Chart(document.getElementById('chart-range-vs-price'), {
    type: 'scatter',
    data: { datasets: buildScatterDatasets(details, 'msrp', 'range_mi') },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const pt = ctx.raw;
              return `${pt.name}: $${(pt.x/1000).toFixed(0)}k, ${pt.y} mi`;
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'MSRP ($)' },
          ticks: { callback: v => `$${(v/1000).toFixed(0)}k` },
        },
        y: { title: { display: true, text: 'EPA Range (mi)' } },
      },
    },
  });

  // --- Chart B: Cargo vs 0-60 ---
  new Chart(document.getElementById('chart-cargo-vs-speed'), {
    type: 'scatter',
    data: { datasets: buildScatterDatasets(details, 'zero_to_60_sec', 'cargo_behind_3rd_cu_ft') },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const pt = ctx.raw;
              return `${pt.name}: ${pt.x}s, ${pt.y} cu ft`;
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: '0–60 Time (sec)' },
          reverse: true, // faster (lower) on right feels more intuitive
        },
        y: { title: { display: true, text: 'Cargo Behind 3rd Row (cu ft)' } },
      },
    },
  });
}
```

- [ ] **Step 2: Verify Section 4**

Open page. Verify:
- Chart A: Scatter shows dots colored by vehicle, x=MSRP, y=Range
- Chart B: Scatter shows dots colored by vehicle, x=0-60 time (reversed), y=Cargo
- Hover tooltips show trim name, x and y values
- Legend matches both charts
- No console errors

- [ ] **Step 3: Commit**

```bash
git add market-insights.html
git commit -m "feat(insights): section 4 — market trade-offs (range vs price, cargo vs speed)"
```

---

## Task 6: Section 5 — Tech Adoption (Charging, Self-Driving, Seats)

**Files:**
- Modify: `market-insights.html`

Replace the `renderTech` stub.

- [ ] **Step 1: Implement charging standard stacked bar (Chart A)**

Use the `CHARGING_CATEGORIES` mapping defined in Task 1. Group trims by year and mapped category.

```javascript
function renderTech(details) {
  const chargingOrder = ['Native NACS', 'CCS (NACS adapter)', 'CCS Only', 'TBD'];
  const chargingColors = {
    'Native NACS':       '#4ade80',
    'CCS (NACS adapter)': '#fbbf24',
    'CCS Only':          '#f87171',
    'TBD':               '#6b7280',
  };

  const chargingDatasets = chargingOrder.map(cat => ({
    label: cat,
    data: YEARS.map(y => {
      return details.filter(d =>
        d.year === y && CHARGING_CATEGORIES[d.charging_type] === cat
      ).length;
    }),
    backgroundColor: chargingColors[cat],
  }));

  // Remove TBD dataset if all zeros
  const filteredChargingDatasets = chargingDatasets.filter(ds => ds.data.some(v => v > 0));

  new Chart(document.getElementById('chart-charging'), {
    type: 'bar',
    data: { labels: YEARS.map(String), datasets: filteredChargingDatasets },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
        tooltip: { mode: 'index' },
      },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, title: { display: true, text: 'Number of Trims' }, beginAtZero: true },
      },
    },
  });

  // Charts B and C in next steps...
}
```

- [ ] **Step 2: Implement self-driving tier stacked bar (Chart B)**

Append to `renderTech`:

```javascript
  // --- Chart B: Self-driving tiers by year ---
  const tierOrder = ['Basic L2', 'Advanced L2', 'L2+ Hands-Free', 'L2+ Point-to-Point'];
  const tierColors = {
    'Basic L2':            '#6b7280',
    'Advanced L2':         '#fbbf24',
    'L2+ Hands-Free':     '#5ba4f5',
    'L2+ Point-to-Point': '#4ade80',
  };

  const tierDatasets = tierOrder.map(tier => ({
    label: tier,
    data: YEARS.map(y =>
      details.filter(d => d.year === y && d.self_driving_tier === tier).length
    ),
    backgroundColor: tierColors[tier],
  }));

  new Chart(document.getElementById('chart-self-driving'), {
    type: 'bar',
    data: { labels: YEARS.map(String), datasets: tierDatasets },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
        tooltip: { mode: 'index' },
      },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, title: { display: true, text: 'Number of Trims' }, beginAtZero: true },
      },
    },
  });
```

- [ ] **Step 3: Implement seat configuration bar chart (Chart C)**

Append to `renderTech`:

```javascript
  // --- Chart C: Seat configs by vehicle (latest year per vehicle) ---
  const vehicles = [...new Set(details.map(d => d.vehicle))].sort();

  const seatData = vehicles.map(v => {
    const vTrims = details.filter(d => d.vehicle === v);
    const latestYear = Math.max(...vTrims.map(d => d.year));
    const latest = vTrims.filter(d => d.year === latestYear);
    return {
      vehicle: v,
      sixSeat: latest.filter(d => d.seats === 6).length,
      sevenSeat: latest.filter(d => d.seats === 7).length,
    };
  }).filter(d => d.sixSeat + d.sevenSeat > 0);

  new Chart(document.getElementById('chart-seats'), {
    type: 'bar',
    data: {
      labels: seatData.map(d => d.vehicle),
      datasets: [
        {
          label: '6-Seat',
          data: seatData.map(d => d.sixSeat),
          backgroundColor: '#5ba4f5',
        },
        {
          label: '7-Seat',
          data: seatData.map(d => d.sevenSeat),
          backgroundColor: '#4ade80',
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { title: { display: true, text: 'Number of Trims' }, beginAtZero: true },
      },
    },
  });
}
```

- [ ] **Step 4: Verify Section 5**

Open page. Verify:
- Chart A: Stacked bars show charging standard evolution (green NACS growing, red CCS shrinking)
- Chart B: Stacked bars show self-driving tier distribution by year
- Chart C: Grouped bars show 6-seat vs 7-seat trims per vehicle
- All three charts have correct legends and tooltips
- No console errors

- [ ] **Step 5: Commit**

```bash
git add market-insights.html
git commit -m "feat(insights): section 5 — tech adoption (charging, self-driving, seats)"
```

---

## Task 7: Polish — Responsive Layout, Chart Sizing, and Final Review

**Files:**
- Modify: `market-insights.html`

- [ ] **Step 1: Tune chart heights and spacing**

Chart.js canvases may render too tall or too short. Set `maintainAspectRatio: false` and explicit container heights:
- Stacked bars and grouped bars: `height: 400px`
- Horizontal range chart: `height: ${numVehicles * 45}px` (dynamic based on vehicle count)
- Line chart: `height: 400px`
- Scatter plots: `height: 450px`
- Seat config bar: `height: 350px`

Apply via CSS on `.chart-wrap canvas` or inline on each `<canvas>` parent div.

- [ ] **Step 2: Test responsive layout**

Resize browser to ~375px width. Verify:
- Stat callouts wrap into 2-column grid
- Section nav scrolls horizontally (no wrapping/overflow)
- Charts resize without overlapping or clipping
- Legends remain readable
- No horizontal scrollbar on the page body

- [ ] **Step 3: Test on iPad via network**

Serve the page on `0.0.0.0:8099` and access from iPad at `http://192.168.1.216:8099/market-insights.html`. Verify:
- All 8 charts render correctly
- Touch tooltips work
- Scroll between sections is smooth
- Sticky nav works on mobile Safari

- [ ] **Step 4: Commit final polish**

```bash
git add market-insights.html
git commit -m "feat(insights): polish — responsive layout, chart sizing, and mobile tuning"
```

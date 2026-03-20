# EV Data Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single `explore.html` file that loads `lib/ev-data.json` and renders 12 interactive charts across 4 sections for exploring 3-row EV SUV data.

**Architecture:** A standalone HTML file at the repo root with no build step. Uses Observable Plot v0.6 and D3 v7 from CDN. All logic — data loading, preprocessing, chart rendering, interactivity — lives in a single `<script type="module">` block. Dark theme, sidebar nav, global filters.

**Tech Stack:** HTML, vanilla JS (ES modules), Observable Plot v0.6 (CDN), D3 v7 (CDN)

**Spec:** `docs/superpowers/specs/2026-03-20-ev-data-explorer-design.md`

---

## File Structure

```
ev-app/
  explore.html          <-- CREATE (the entire tool, single file)
  lib/ev-data.json      <-- EXISTS (fetched at runtime, no changes)
```

One file. No new dependencies. No build changes.

---

## Task 1: HTML Shell, Styles, and Layout

**Files:**
- Create: `explore.html`

Build the static HTML structure: dark-themed page with sidebar nav, sticky global filter bar, and placeholder sections for each chart group.

- [ ] **Step 1: Create `explore.html` with HTML boilerplate and CDN imports**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EV Data Explorer</title>
  <script type="module">
    import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";
    import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
    window.Plot = Plot;
    window.d3 = d3;
    console.log("Plot and D3 loaded", Plot.version, d3.version);
  </script>
</head>
<body>
  <div class="layout">
    <nav class="sidebar">
      <h2>EV Explorer</h2>
      <a href="#value">Value Analysis</a>
      <a href="#market">Market Evolution</a>
      <a href="#size">Size & Practicality</a>
      <a href="#charging">Charging & Efficiency</a>
    </nav>
    <main class="content">
      <div class="filters" id="filters">
        <!-- filters go here in Task 2 -->
      </div>
      <section id="value"><h2>Section 1: Value Analysis</h2></section>
      <section id="market"><h2>Section 2: Market Evolution</h2></section>
      <section id="size"><h2>Section 3: Size & Practicality</h2></section>
      <section id="charging"><h2>Section 4: Charging & Efficiency</h2></section>
    </main>
  </div>
</body>
</html>
```

- [ ] **Step 2: Add all CSS styles inside a `<style>` block in `<head>`**

Styles to include:
- CSS reset (`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`)
- Body: `background: #1a1a2e; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;`
- `.layout`: CSS grid — `grid-template-columns: 220px 1fr;` full viewport height
- `.sidebar`: `position: sticky; top: 0; height: 100vh; overflow-y: auto; background: #16162a; padding: 1.5rem 1rem;` with nav links styled as block elements, `color: #a0a0c0;` hover `color: #fff;`
- `.content`: `padding: 1.5rem 2rem; max-width: 1200px;`
- `.filters`: `position: sticky; top: 0; z-index: 10; background: #1a1a2e; padding: 1rem 0; border-bottom: 1px solid #2a2a4e; display: flex; gap: 1rem; align-items: center;`
- `section`: `margin-bottom: 3rem;`
- `.chart-card`: `background: #22223a; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;`
- `.chart-card h3`: chart title styling
- `.chart-card .insight`: `color: #8888aa; font-size: 0.9rem; margin-top: 0.5rem; font-style: italic;`
- Tooltip styles: `position: absolute; background: #2a2a4e; border: 1px solid #4a4a6e; border-radius: 4px; padding: 8px 12px; font-size: 0.85rem; pointer-events: none; z-index: 100;`
- Filter select/button styles matching dark theme

- [ ] **Step 3: Verify — serve and open in browser**

Run: `cd C:\Users\dpm50\Documents\Claude-Code\ev-app && npx serve . -l 3000`
Open: `http://localhost:3000/explore.html`
Expected: Dark page with sidebar nav on left, four empty sections on right, "Plot and D3 loaded" in console.

- [ ] **Step 4: Commit**

```bash
git add explore.html
git commit -m "feat(explorer): scaffold HTML shell with dark theme layout and CDN imports"
```

---

## Task 2: Data Loading, Preprocessing, and Vehicle Color Map

**Files:**
- Modify: `explore.html`

Add the data loading logic, numeric coercion, watchlist filtering, self-driving tier encoding, and the vehicle color constant.

- [ ] **Step 1: Add vehicle color map constant**

Inside the `<script type="module">`, add:

```js
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
  "Subaru 3-Row EV",
  "BMW iX7",
  "Genesis GV90",
  "Toyota Highlander EV",
  "Tesla Model Y Long (Asia)",
];

const SELF_DRIVING_TIERS = {
  "Basic L2":           2.1,
  "Advanced L2":        2.2,
  "L2+ Hands-Free":     2.3,
  "L2+ Point-to-Point": 2.4,
};

const NUMERIC_FIELDS = [
  "msrp", "otd_new", "range_mi", "hp", "battery_kwh", "towing_lbs",
  "dc_fast_charge_kw", "dc_fast_charge_10_80_min", "curb_weight_lbs",
  "length_in", "width_in", "height_in", "third_row_legroom_in",
  "third_row_headroom_in", "torque_lb_ft", "zero_to_60_sec",
  "ground_clearance_in", "cargo_behind_3rd_cu_ft", "cargo_behind_2nd_cu_ft",
  "cargo_behind_1st_cu_ft", "cargo_floor_width_in", "frunk_cu_ft",
  "onboard_ac_kw", "l2_10_100", "l2_10_80", "destination",
];
```

- [ ] **Step 2: Add data fetching and preprocessing function**

```js
async function loadData() {
  const res = await fetch("lib/ev-data.json");
  const raw = await res.json();
  const details = raw.details
    .filter(d => !WATCHLIST.includes(d.vehicle))
    .map(d => {
      const row = { ...d };
      for (const f of NUMERIC_FIELDS) {
        const v = Number(row[f]);
        row[f] = Number.isNaN(v) ? null : v;
      }
      row.self_driving_score = SELF_DRIVING_TIERS[row.self_driving_tier] ?? null;
      return row;
    });
  return details;
}
```

- [ ] **Step 3: Add main initialization that calls loadData and logs results**

```js
async function main() {
  const data = await loadData();
  console.log(`Loaded ${data.length} trims across ${new Set(data.map(d => d.vehicle)).size} vehicles`);
  console.log("Vehicles:", [...new Set(data.map(d => d.vehicle))]);
  console.log("Years:", [...new Set(data.map(d => d.year))].sort());
  // Charts will be rendered here in subsequent tasks
}

main();
```

- [ ] **Step 4: Verify — check console output**

Serve and open. Console should show:
- "Loaded NN trims across NN vehicles" (no watchlist vehicles)
- Vehicle list without Subaru 3-Row EV, BMW iX7, Genesis GV90, Toyota Highlander EV, Tesla Model Y Long (Asia)
- Year list sorted

- [ ] **Step 5: Commit**

```bash
git add explore.html
git commit -m "feat(explorer): data loading with numeric coercion, watchlist filter, self-driving tiers"
```

---

## Task 3: Global Filters (Vehicle Multi-Select and Year Dropdown)

**Files:**
- Modify: `explore.html`

Build the filter UI and the reactive re-render pipeline.

- [ ] **Step 1: Add filter rendering function**

```js
function buildFilters(data) {
  const vehicles = [...new Set(data.map(d => d.vehicle))].sort();
  const years = [...new Set(data.map(d => d.year))].sort();
  const filtersEl = document.getElementById("filters");

  // Vehicle multi-select as checkboxes in a dropdown
  const vehicleDiv = document.createElement("div");
  vehicleDiv.className = "filter-group";
  vehicleDiv.innerHTML = `
    <label>Vehicles</label>
    <div class="dropdown">
      <button class="dropdown-btn" id="vehicle-btn">All Vehicles ▼</button>
      <div class="dropdown-content" id="vehicle-dropdown">
        <button class="select-all-btn" id="vehicle-select-all">Select All</button>
        ${vehicles.map(v => `
          <label class="checkbox-label">
            <input type="checkbox" value="${v}" checked>
            <span class="color-dot" style="background:${VEHICLE_COLORS[v] || '#888'}"></span>
            ${v}
          </label>
        `).join("")}
      </div>
    </div>
  `;
  filtersEl.appendChild(vehicleDiv);

  // Year dropdown
  const yearDiv = document.createElement("div");
  yearDiv.className = "filter-group";
  yearDiv.innerHTML = `
    <label>Year</label>
    <select id="year-select">
      <option value="all">All Years</option>
      ${years.map(y => `<option value="${y}">${y}</option>`).join("")}
    </select>
  `;
  filtersEl.appendChild(yearDiv);
}
```

- [ ] **Step 2: Add CSS for dropdown and checkbox styles**

Add to `<style>`:
- `.filter-group`: `display: flex; align-items: center; gap: 0.5rem;`
- `.filter-group label`: `font-weight: 600; font-size: 0.85rem; color: #a0a0c0;`
- `.dropdown`: `position: relative;`
- `.dropdown-btn`: dark-themed button, `background: #22223a; color: #e0e0e0; border: 1px solid #4a4a6e; border-radius: 4px; padding: 6px 12px; cursor: pointer;`
- `.dropdown-content`: `display: none; position: absolute; background: #22223a; border: 1px solid #4a4a6e; border-radius: 4px; padding: 8px; min-width: 250px; max-height: 400px; overflow-y: auto; z-index: 20;` Show on `.dropdown.open .dropdown-content { display: block; }`
- `.checkbox-label`: `display: flex; align-items: center; gap: 6px; padding: 4px 0; cursor: pointer;`
- `.color-dot`: `width: 10px; height: 10px; border-radius: 50%; display: inline-block;`
- `.select-all-btn`: small link-styled button
- `#year-select`: dark-themed select matching `.dropdown-btn`

- [ ] **Step 3: Add filter state management and event wiring**

```js
function getFilteredData(data) {
  const checkboxes = document.querySelectorAll("#vehicle-dropdown input[type=checkbox]");
  const selectedVehicles = new Set([...checkboxes].filter(c => c.checked).map(c => c.value));
  const yearVal = document.getElementById("year-select").value;

  return data.filter(d => {
    if (!selectedVehicles.has(d.vehicle)) return false;
    if (yearVal !== "all" && d.year !== Number(yearVal)) return false;
    return true;
  });
}

function wireFilters(data, renderCharts) {
  // Toggle dropdown open/close
  const btn = document.getElementById("vehicle-btn");
  const dropdown = btn.closest(".dropdown");
  btn.addEventListener("click", () => dropdown.classList.toggle("open"));
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) dropdown.classList.remove("open");
  });

  // Select all button
  document.getElementById("vehicle-select-all").addEventListener("click", () => {
    const boxes = document.querySelectorAll("#vehicle-dropdown input[type=checkbox]");
    const allChecked = [...boxes].every(c => c.checked);
    boxes.forEach(c => c.checked = !allChecked);
    updateVehicleButtonLabel();
    renderCharts(getFilteredData(data));
  });

  // Individual checkbox changes
  document.querySelectorAll("#vehicle-dropdown input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", () => {
      updateVehicleButtonLabel();
      renderCharts(getFilteredData(data));
    });
  });

  // Year dropdown
  document.getElementById("year-select").addEventListener("change", () => {
    renderCharts(getFilteredData(data));
  });
}

function updateVehicleButtonLabel() {
  const boxes = document.querySelectorAll("#vehicle-dropdown input[type=checkbox]");
  const checked = [...boxes].filter(c => c.checked);
  const btn = document.getElementById("vehicle-btn");
  if (checked.length === boxes.length) btn.textContent = "All Vehicles ▼";
  else if (checked.length === 0) btn.textContent = "None Selected ▼";
  else if (checked.length <= 2) btn.textContent = checked.map(c => c.value.split(" ")[0]).join(", ") + " ▼";
  else btn.textContent = `${checked.length} Vehicles ▼`;
}
```

- [ ] **Step 4: Wire filters into main() with a placeholder renderCharts**

Update `main()`:

```js
async function main() {
  const data = await loadData();
  buildFilters(data);

  function renderCharts(filtered) {
    console.log(`Rendering ${filtered.length} trims`);
    // Chart rendering will be added in Tasks 4-7
  }

  wireFilters(data, renderCharts);
  renderCharts(data); // initial render
}
```

- [ ] **Step 5: Verify — filters work in browser**

Serve and open. Verify:
- Vehicle dropdown opens/closes, checkboxes toggle, button label updates
- Year dropdown changes, console logs filtered count
- "Select All" toggles all checkboxes

- [ ] **Step 6: Commit**

```bash
git add explore.html
git commit -m "feat(explorer): global vehicle multi-select and year dropdown filters"
```

---

## Task 4: Chart Helper Functions and Tooltip System

**Files:**
- Modify: `explore.html`

Create reusable helpers for rendering charts into sections and showing tooltips on hover.

- [ ] **Step 1: Add chart container helper**

```js
function chartCard(sectionId, { title, insight }) {
  const section = document.getElementById(sectionId);
  const card = document.createElement("div");
  card.className = "chart-card";
  card.innerHTML = `<h3>${title}</h3><div class="chart-container"></div><p class="insight">${insight}</p>`;
  section.appendChild(card);
  return card.querySelector(".chart-container");
}

function clearCharts() {
  document.querySelectorAll(".chart-card").forEach(c => c.remove());
}
```

- [ ] **Step 2: Add Observable Plot color scale helper**

```js
function vehicleColorScale(data) {
  const vehicles = [...new Set(data.map(d => d.vehicle))].sort();
  return Plot.scale({
    color: {
      type: "categorical",
      domain: vehicles,
      range: vehicles.map(v => VEHICLE_COLORS[v] || "#888"),
    }
  });
}
```

Note: Observable Plot v0.6 has built-in tooltip support via `tip: true` on marks. We use that directly in each chart — no custom tooltip system needed. The tooltip CSS in Task 1 provides fallback styling.

- [ ] **Step 3: Verify — chartCard creates DOM elements correctly**

Add a test call in renderCharts: `chartCard("value", { title: "Test Chart", insight: "Test insight" });`
Serve and verify the card appears with title and insight text in the Value section.
Remove the test call after verification.

- [ ] **Step 4: Commit**

```bash
git add explore.html
git commit -m "feat(explorer): chart container helpers and color scale utility"
```

---

## Task 5: Section 1 — Value Analysis Charts (5 charts)

**Files:**
- Modify: `explore.html`

Render all 5 Value Analysis charts using Observable Plot.

- [ ] **Step 1: Add Chart 1.1 — MSRP vs. Range (scatter, dot size = battery)**

```js
function chart1_1(data) {
  const container = chartCard("value", {
    title: "MSRP vs. Range",
    insight: "Who gives you the most miles per dollar?",
  });
  const filtered = data.filter(d => d.msrp != null && d.range_mi != null);
  const plot = Plot.plot({
    width: container.clientWidth || 900,
    height: 500,
    style: { background: "transparent", color: "#e0e0e0" },
    x: { label: "MSRP ($)", tickFormat: d3.format("$,.0f") },
    y: { label: "Range (miles)" },
    color: { domain: [...new Set(filtered.map(d => d.vehicle))].sort(), range: [...new Set(filtered.map(d => d.vehicle))].sort().map(v => VEHICLE_COLORS[v] || "#888") },
    r: { domain: d3.extent(filtered, d => d.battery_kwh), range: [4, 18] },
    marks: [
      Plot.dot(filtered, {
        x: "msrp", y: "range_mi", fill: "vehicle", r: "battery_kwh",
        fillOpacity: 0.8, stroke: "#1a1a2e", strokeWidth: 1,
        tip: true, title: d => `${d.name}\n$${d3.format(",")(d.msrp)} | ${d.range_mi} mi | ${d.battery_kwh} kWh`,
      }),
      Plot.ruleY([0]),
    ],
  });
  container.appendChild(plot);
}
```

- [ ] **Step 2: Add Chart 1.2 — MSRP vs. Horsepower (scatter)**

```js
function chart1_2(data) {
  const container = chartCard("value", {
    title: "MSRP vs. Horsepower",
    insight: "Performance per dollar across the segment.",
  });
  const filtered = data.filter(d => d.msrp != null && d.hp != null);
  const plot = Plot.plot({
    width: container.clientWidth || 900,
    height: 500,
    style: { background: "transparent", color: "#e0e0e0" },
    x: { label: "MSRP ($)", tickFormat: d3.format("$,.0f") },
    y: { label: "Horsepower" },
    color: { domain: [...new Set(filtered.map(d => d.vehicle))].sort(), range: [...new Set(filtered.map(d => d.vehicle))].sort().map(v => VEHICLE_COLORS[v] || "#888") },
    marks: [
      Plot.dot(filtered, {
        x: "msrp", y: "hp", fill: "vehicle", r: 6,
        fillOpacity: 0.8, stroke: "#1a1a2e", strokeWidth: 1,
        tip: true, title: d => `${d.name}\n$${d3.format(",")(d.msrp)} | ${d.hp} hp`,
      }),
    ],
  });
  container.appendChild(plot);
}
```

- [ ] **Step 3: Add Chart 1.3 — MSRP vs. Cargo behind 2nd row (scatter)**

```js
function chart1_3(data) {
  const container = chartCard("value", {
    title: "MSRP vs. Cargo (Behind 2nd Row)",
    insight: "Practicality per dollar.",
  });
  const filtered = data.filter(d => d.msrp != null && d.cargo_behind_2nd_cu_ft != null);
  const plot = Plot.plot({
    width: container.clientWidth || 900,
    height: 500,
    style: { background: "transparent", color: "#e0e0e0" },
    x: { label: "MSRP ($)", tickFormat: d3.format("$,.0f") },
    y: { label: "Cargo behind 2nd row (cu ft)" },
    color: { domain: [...new Set(filtered.map(d => d.vehicle))].sort(), range: [...new Set(filtered.map(d => d.vehicle))].sort().map(v => VEHICLE_COLORS[v] || "#888") },
    marks: [
      Plot.dot(filtered, {
        x: "msrp", y: "cargo_behind_2nd_cu_ft", fill: "vehicle", r: 6,
        fillOpacity: 0.8, stroke: "#1a1a2e", strokeWidth: 1,
        tip: true, title: d => `${d.name}\n$${d3.format(",")(d.msrp)} | ${d.cargo_behind_2nd_cu_ft} cu ft`,
      }),
    ],
  });
  container.appendChild(plot);
}
```

- [ ] **Step 4: Add Chart 1.4 — MSRP vs. Self-Driving Tier (scatter with custom Y axis)**

```js
function chart1_4(data) {
  const container = chartCard("value", {
    title: "MSRP vs. Self-Driving Tier",
    insight: "Does paying more get you better autonomy, or do some vehicles punch above their price class?",
  });
  const filtered = data.filter(d => d.msrp != null && d.self_driving_score != null);
  const tierLabels = Object.entries(SELF_DRIVING_TIERS);
  const plot = Plot.plot({
    width: container.clientWidth || 900,
    height: 400,
    style: { background: "transparent", color: "#e0e0e0" },
    x: { label: "MSRP ($)", tickFormat: d3.format("$,.0f") },
    y: {
      label: "Self-Driving Tier",
      domain: [2.0, 2.5],
      ticks: tierLabels.map(([, v]) => v),
      tickFormat: v => tierLabels.find(([, n]) => n === v)?.[0] ?? "",
    },
    color: { domain: [...new Set(filtered.map(d => d.vehicle))].sort(), range: [...new Set(filtered.map(d => d.vehicle))].sort().map(v => VEHICLE_COLORS[v] || "#888") },
    marks: [
      Plot.dot(filtered, {
        x: "msrp", y: "self_driving_score", fill: "vehicle", r: 7,
        fillOpacity: 0.8, stroke: "#1a1a2e", strokeWidth: 1,
        tip: true, title: d => `${d.name}\n$${d3.format(",")(d.msrp)} | ${d.self_driving_tier}`,
      }),
    ],
  });
  container.appendChild(plot);
}
```

- [ ] **Step 5: Add Chart 1.5 — OTD New Price Spread (dot/strip plot)**

```js
function chart1_5(data) {
  const container = chartCard("value", {
    title: "OTD New Price Spread by Vehicle",
    insight: "Which models span a wide price range vs. are tightly clustered?",
  });
  const filtered = data.filter(d => d.otd_new != null);
  // Sort vehicles by median OTD
  const medians = d3.rollup(filtered, v => d3.median(v, d => d.otd_new), d => d.vehicle);
  const sortedVehicles = [...medians.entries()].sort((a, b) => a[1] - b[1]).map(d => d[0]);
  const plot = Plot.plot({
    width: container.clientWidth || 900,
    height: 400,
    style: { background: "transparent", color: "#e0e0e0" },
    x: { label: "OTD New Price ($)", tickFormat: d3.format("$,.0f") },
    y: { label: null, domain: sortedVehicles },
    color: { domain: sortedVehicles, range: sortedVehicles.map(v => VEHICLE_COLORS[v] || "#888") },
    marks: [
      Plot.dot(filtered, {
        x: "otd_new", y: "vehicle", fill: "vehicle", r: 5,
        fillOpacity: 0.8, stroke: "#1a1a2e", strokeWidth: 1,
        tip: true, title: d => `${d.name}\nOTD: $${d3.format(",")(Math.round(d.otd_new))}`,
      }),
    ],
  });
  container.appendChild(plot);
}
```

- [ ] **Step 6: Wire all Section 1 charts into renderCharts**

Update `renderCharts`:

```js
function renderCharts(filtered) {
  clearCharts();
  // Section 1: Value Analysis
  chart1_1(filtered);
  chart1_2(filtered);
  chart1_3(filtered);
  chart1_4(filtered);
  chart1_5(filtered);
}
```

- [ ] **Step 7: Verify — all 5 Value Analysis charts render correctly**

Serve and open. Verify:
- All 5 charts appear in Section 1 with correct titles and insight captions
- Dots are colored by vehicle with correct colors
- Chart 1.1 dot sizes vary by battery kWh
- Chart 1.4 Y-axis shows tier labels, not raw numbers
- Chart 1.5 vehicles sorted by median OTD price
- Tooltips appear on hover
- Filters work: unchecking vehicles removes their dots, changing year filters data

- [ ] **Step 8: Commit**

```bash
git add explore.html
git commit -m "feat(explorer): section 1 — value analysis charts (MSRP vs range/hp/cargo/self-driving, OTD spread)"
```

---

## Task 6: Section 2 — Market Evolution Charts (2 charts)

**Files:**
- Modify: `explore.html`

- [ ] **Step 1: Add Chart 2.1 — Average MSRP by Vehicle Over Model Years (line chart)**

```js
function chart2_1(data) {
  const container = chartCard("market", {
    title: "Average MSRP by Vehicle Over Model Years",
    insight: "Who's getting cheaper? Who's climbing?",
  });
  const filtered = data.filter(d => d.msrp != null && d.year != null);
  // Compute average MSRP per vehicle per year
  const grouped = d3.flatRollup(
    filtered,
    v => d3.mean(v, d => d.msrp),
    d => d.vehicle,
    d => d.year,
  ).map(([vehicle, year, avg]) => ({ vehicle, year, avg }));

  const vehicles = [...new Set(grouped.map(d => d.vehicle))].sort();
  const plot = Plot.plot({
    width: container.clientWidth || 900,
    height: 500,
    style: { background: "transparent", color: "#e0e0e0" },
    x: { label: "Model Year", tickFormat: d3.format("d") },
    y: { label: "Average MSRP ($)", tickFormat: d3.format("$,.0f") },
    color: { domain: vehicles, range: vehicles.map(v => VEHICLE_COLORS[v] || "#888") },
    marks: [
      Plot.line(grouped, { x: "year", y: "avg", stroke: "vehicle", strokeWidth: 2, tip: true }),
      Plot.dot(grouped, {
        x: "year", y: "avg", fill: "vehicle", r: 4,
        tip: true, title: d => `${d.vehicle} ${d.year}\nAvg MSRP: $${d3.format(",")(Math.round(d.avg))}`,
      }),
    ],
  });
  container.appendChild(plot);
}
```

- [ ] **Step 2: Add Chart 2.2 — Range Improvement Slope Chart**

```js
function chart2_2(data) {
  const container = chartCard("market", {
    title: "Range Improvement (Earliest vs. Latest Year)",
    insight: "Which models have gained the most range over time?",
  });
  const filtered = data.filter(d => d.range_mi != null && d.year != null);
  // Get earliest and latest year per vehicle
  const byVehicle = d3.group(filtered, d => d.vehicle);
  const slopeData = [];
  for (const [vehicle, rows] of byVehicle) {
    const years = [...new Set(rows.map(d => d.year))].sort();
    if (years.length < 2) continue; // skip single-year vehicles
    const earliest = years[0];
    const latest = years[years.length - 1];
    const earlyAvg = d3.mean(rows.filter(d => d.year === earliest), d => d.range_mi);
    const lateAvg = d3.mean(rows.filter(d => d.year === latest), d => d.range_mi);
    slopeData.push({ vehicle, year: earliest, range: earlyAvg, endpoint: "earliest" });
    slopeData.push({ vehicle, year: latest, range: lateAvg, endpoint: "latest" });
  }

  if (slopeData.length === 0) {
    container.textContent = "Not enough multi-year data for slope chart.";
    return;
  }

  const vehicles = [...new Set(slopeData.map(d => d.vehicle))].sort();
  const plot = Plot.plot({
    width: container.clientWidth || 900,
    height: 400,
    style: { background: "transparent", color: "#e0e0e0" },
    x: { label: "Model Year", tickFormat: d3.format("d"), domain: d3.extent(slopeData, d => d.year) },
    y: { label: "Average Range (miles)" },
    color: { domain: vehicles, range: vehicles.map(v => VEHICLE_COLORS[v] || "#888") },
    marks: [
      Plot.line(slopeData, { x: "year", y: "range", stroke: "vehicle", strokeWidth: 2, z: "vehicle" }),
      Plot.dot(slopeData, {
        x: "year", y: "range", fill: "vehicle", r: 5,
        tip: true, title: d => `${d.vehicle} ${d.year}\nAvg Range: ${Math.round(d.range)} mi`,
      }),
      Plot.text(slopeData.filter(d => d.endpoint === "latest"), {
        x: "year", y: "range", text: "vehicle", fill: "vehicle",
        dx: 10, textAnchor: "start", fontSize: 11,
      }),
    ],
  });
  container.appendChild(plot);
}
```

- [ ] **Step 3: Wire Section 2 charts into renderCharts**

Add to `renderCharts` after Section 1 calls:

```js
  // Section 2: Market Evolution
  chart2_1(filtered);
  chart2_2(filtered);
```

- [ ] **Step 4: Verify — line chart and slope chart render**

Serve and verify:
- Chart 2.1 shows lines connecting average MSRP per year per vehicle
- Chart 2.2 shows slope lines only for vehicles with 2+ model years
- Vehicle labels appear at the right end of slope lines
- Filters update both charts

- [ ] **Step 5: Commit**

```bash
git add explore.html
git commit -m "feat(explorer): section 2 — market evolution (MSRP trends, range slope chart)"
```

---

## Task 7: Section 3 — Size & Practicality Charts (3 charts)

**Files:**
- Modify: `explore.html`

- [ ] **Step 1: Add Chart 3.1 — Curb Weight vs. Range (scatter)**

```js
function chart3_1(data) {
  const container = chartCard("size", {
    title: "Curb Weight vs. Range",
    insight: "Does heavier = worse range, or do bigger batteries compensate?",
  });
  const filtered = data.filter(d => d.curb_weight_lbs != null && d.range_mi != null);
  const vehicles = [...new Set(filtered.map(d => d.vehicle))].sort();
  const plot = Plot.plot({
    width: container.clientWidth || 900,
    height: 500,
    style: { background: "transparent", color: "#e0e0e0" },
    x: { label: "Curb Weight (lbs)", tickFormat: d3.format(",") },
    y: { label: "Range (miles)" },
    color: { domain: vehicles, range: vehicles.map(v => VEHICLE_COLORS[v] || "#888") },
    marks: [
      Plot.dot(filtered, {
        x: "curb_weight_lbs", y: "range_mi", fill: "vehicle", r: 6,
        fillOpacity: 0.8, stroke: "#1a1a2e", strokeWidth: 1,
        tip: true, title: d => `${d.name}\n${d3.format(",")(d.curb_weight_lbs)} lbs | ${d.range_mi} mi`,
      }),
    ],
  });
  container.appendChild(plot);
}
```

- [ ] **Step 2: Add Chart 3.2 — Cargo Behind 3rd Row (bar chart with trim dots)**

```js
function chart3_2(data) {
  const container = chartCard("size", {
    title: "Cargo Behind 3rd Row by Vehicle",
    insight: "How usable is that third row in practice?",
  });
  const filtered = data.filter(d => d.cargo_behind_3rd_cu_ft != null);
  // Compute median per vehicle
  const medians = d3.flatRollup(filtered, v => d3.median(v, d => d.cargo_behind_3rd_cu_ft), d => d.vehicle)
    .map(([vehicle, median]) => ({ vehicle, median }))
    .sort((a, b) => b.median - a.median);
  const sortedVehicles = medians.map(d => d.vehicle);
  const plot = Plot.plot({
    width: container.clientWidth || 900,
    height: 400,
    style: { background: "transparent", color: "#e0e0e0" },
    x: { label: null, domain: sortedVehicles, padding: 0.3 },
    y: { label: "Cargo behind 3rd row (cu ft)" },
    color: { domain: sortedVehicles, range: sortedVehicles.map(v => VEHICLE_COLORS[v] || "#888") },
    marks: [
      Plot.barY(medians, {
        x: "vehicle", y: "median", fill: "vehicle", fillOpacity: 0.4,
      }),
      Plot.dot(filtered, {
        x: "vehicle", y: "cargo_behind_3rd_cu_ft", fill: "vehicle", r: 5,
        fillOpacity: 0.9, stroke: "#1a1a2e", strokeWidth: 1,
        tip: true, title: d => `${d.name}\n${d.cargo_behind_3rd_cu_ft} cu ft`,
      }),
    ],
  });
  container.appendChild(plot);
}
```

- [ ] **Step 3: Add Chart 3.3 — Length vs. Third-Row Legroom (scatter)**

```js
function chart3_3(data) {
  const container = chartCard("size", {
    title: "Length vs. Third-Row Legroom",
    insight: "Are bigger vehicles actually giving you more third-row space?",
  });
  const filtered = data.filter(d => d.length_in != null && d.third_row_legroom_in != null);
  const vehicles = [...new Set(filtered.map(d => d.vehicle))].sort();
  const plot = Plot.plot({
    width: container.clientWidth || 900,
    height: 500,
    style: { background: "transparent", color: "#e0e0e0" },
    x: { label: "Overall Length (inches)" },
    y: { label: "Third-Row Legroom (inches)" },
    color: { domain: vehicles, range: vehicles.map(v => VEHICLE_COLORS[v] || "#888") },
    marks: [
      Plot.dot(filtered, {
        x: "length_in", y: "third_row_legroom_in", fill: "vehicle", r: 6,
        fillOpacity: 0.8, stroke: "#1a1a2e", strokeWidth: 1,
        tip: true, title: d => `${d.name}\n${d.length_in}" long | ${d.third_row_legroom_in}" legroom`,
      }),
    ],
  });
  container.appendChild(plot);
}
```

- [ ] **Step 4: Wire Section 3 charts into renderCharts**

Add to `renderCharts`:

```js
  // Section 3: Size & Practicality
  chart3_1(filtered);
  chart3_2(filtered);
  chart3_3(filtered);
```

- [ ] **Step 5: Verify — all 3 charts render, bar chart has overlaid dots**

Serve and verify:
- Chart 3.2 shows translucent bars (median) with individual trim dots on top
- Vehicles sorted by median cargo
- All scatter plots have correct axes and colors

- [ ] **Step 6: Commit**

```bash
git add explore.html
git commit -m "feat(explorer): section 3 — size & practicality (weight/range, cargo bars, length/legroom)"
```

---

## Task 8: Section 4 — Charging & Efficiency Charts (2 charts)

**Files:**
- Modify: `explore.html`

- [ ] **Step 1: Add Chart 4.1 — Battery kWh vs. DC Fast Charge Speed (scatter)**

```js
function chart4_1(data) {
  const container = chartCard("charging", {
    title: "Battery kWh vs. DC Fast Charge Speed",
    insight: "Who charges fastest relative to battery size?",
  });
  const filtered = data.filter(d => d.battery_kwh != null && d.dc_fast_charge_kw != null);
  const vehicles = [...new Set(filtered.map(d => d.vehicle))].sort();
  const plot = Plot.plot({
    width: container.clientWidth || 900,
    height: 500,
    style: { background: "transparent", color: "#e0e0e0" },
    x: { label: "Battery Capacity (kWh)" },
    y: { label: "DC Fast Charge Peak (kW)" },
    color: { domain: vehicles, range: vehicles.map(v => VEHICLE_COLORS[v] || "#888") },
    marks: [
      Plot.dot(filtered, {
        x: "battery_kwh", y: "dc_fast_charge_kw", fill: "vehicle", r: 6,
        fillOpacity: 0.8, stroke: "#1a1a2e", strokeWidth: 1,
        tip: true, title: d => `${d.name}\n${d.battery_kwh} kWh | ${d.dc_fast_charge_kw} kW`,
      }),
    ],
  });
  container.appendChild(plot);
}
```

- [ ] **Step 2: Add Chart 4.2 — DC Fast Charge 10–80% Time (bar chart with trim dots)**

```js
function chart4_2(data) {
  const container = chartCard("charging", {
    title: "DC Fast Charge 10–80% Time by Vehicle",
    insight: "The real-world question — how long am I waiting?",
  });
  const filtered = data.filter(d => d.dc_fast_charge_10_80_min != null);
  const medians = d3.flatRollup(filtered, v => d3.median(v, d => d.dc_fast_charge_10_80_min), d => d.vehicle)
    .map(([vehicle, median]) => ({ vehicle, median }))
    .sort((a, b) => a.median - b.median); // fastest first
  const sortedVehicles = medians.map(d => d.vehicle);
  const plot = Plot.plot({
    width: container.clientWidth || 900,
    height: 400,
    style: { background: "transparent", color: "#e0e0e0" },
    x: { label: null, domain: sortedVehicles, padding: 0.3 },
    y: { label: "10–80% Charge Time (minutes)" },
    color: { domain: sortedVehicles, range: sortedVehicles.map(v => VEHICLE_COLORS[v] || "#888") },
    marks: [
      Plot.barY(medians, {
        x: "vehicle", y: "median", fill: "vehicle", fillOpacity: 0.4,
      }),
      Plot.dot(filtered, {
        x: "vehicle", y: "dc_fast_charge_10_80_min", fill: "vehicle", r: 5,
        fillOpacity: 0.9, stroke: "#1a1a2e", strokeWidth: 1,
        tip: true, title: d => `${d.name}\n${d.dc_fast_charge_10_80_min} min`,
      }),
    ],
  });
  container.appendChild(plot);
}
```

- [ ] **Step 3: Wire Section 4 charts into renderCharts**

Final `renderCharts`:

```js
function renderCharts(filtered) {
  clearCharts();
  // Section 1: Value Analysis
  chart1_1(filtered);
  chart1_2(filtered);
  chart1_3(filtered);
  chart1_4(filtered);
  chart1_5(filtered);
  // Section 2: Market Evolution
  chart2_1(filtered);
  chart2_2(filtered);
  // Section 3: Size & Practicality
  chart3_1(filtered);
  chart3_2(filtered);
  chart3_3(filtered);
  // Section 4: Charging & Efficiency
  chart4_1(filtered);
  chart4_2(filtered);
}
```

- [ ] **Step 4: Verify — all 12 charts render, full page works end-to-end**

Serve and verify:
- All 12 charts present across 4 sections
- Sidebar nav links scroll to correct sections
- Global filters update all charts
- Tooltips work on all charts
- Colors consistent across all charts
- Bar charts (3.2, 4.2) show median bars with trim dots overlaid

- [ ] **Step 5: Commit**

```bash
git add explore.html
git commit -m "feat(explorer): section 4 — charging charts; all 12 charts complete"
```

---

## Task 9: Polish and Final Verification

**Files:**
- Modify: `explore.html`

- [ ] **Step 1: Add a color legend below the filters**

Add a horizontal legend showing all active vehicles with their color dots, so the user doesn't have to cross-reference chart colors.

```js
function renderLegend(data) {
  let legend = document.getElementById("legend");
  if (!legend) {
    legend = document.createElement("div");
    legend.id = "legend";
    legend.className = "legend";
    document.querySelector(".filters").after(legend);
  }
  const vehicles = [...new Set(data.map(d => d.vehicle))].sort();
  legend.innerHTML = vehicles.map(v =>
    `<span class="legend-item"><span class="color-dot" style="background:${VEHICLE_COLORS[v] || '#888'}"></span>${v}</span>`
  ).join("");
}
```

Add CSS:
```css
.legend { display: flex; flex-wrap: wrap; gap: 0.75rem; padding: 0.75rem 0; }
.legend-item { display: flex; align-items: center; gap: 4px; font-size: 0.85rem; color: #a0a0c0; }
```

Call `renderLegend(filtered)` at the start of `renderCharts`.

- [ ] **Step 2: Add smooth scroll behavior for sidebar nav**

Add to CSS: `html { scroll-behavior: smooth; }`

Adjust section padding-top to account for sticky filter bar:
```css
section { scroll-margin-top: 80px; }
```

- [ ] **Step 3: Add active state highlighting for sidebar nav**

```js
function setupScrollSpy() {
  const sections = document.querySelectorAll("main section");
  const navLinks = document.querySelectorAll(".sidebar a");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(a => a.classList.remove("active"));
        const active = document.querySelector(`.sidebar a[href="#${entry.target.id}"]`);
        if (active) active.classList.add("active");
      }
    });
  }, { rootMargin: "-20% 0px -80% 0px" });
  sections.forEach(s => observer.observe(s));
}
```

Add CSS: `.sidebar a.active { color: #fff; border-left: 2px solid #5ba4f5; padding-left: calc(1rem - 2px); }`

Call `setupScrollSpy()` at end of `main()`.

- [ ] **Step 4: Add loading state**

Show "Loading data..." while fetching, replace with charts when ready:

```js
document.querySelector(".content").insertAdjacentHTML("afterbegin",
  '<div id="loading" style="text-align:center;padding:4rem;color:#8888aa;">Loading data...</div>');
// In main(), after data loads:
document.getElementById("loading")?.remove();
```

- [ ] **Step 5: Full end-to-end verification**

Serve and verify:
- Page loads, shows "Loading..." briefly, then all 12 charts
- Sidebar nav scrolls smoothly, active section highlighted
- Legend shows all vehicles with colors
- Vehicle filter: unchecking a vehicle hides it from all charts and legend
- Year filter: selecting a year filters all data
- All tooltips work
- Page scrolls smoothly between sections
- No console errors

- [ ] **Step 6: Commit**

```bash
git add explore.html
git commit -m "feat(explorer): polish — legend, scroll spy, loading state, smooth scroll"
```

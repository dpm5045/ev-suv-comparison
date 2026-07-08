const fs = require('fs');
const data = JSON.parse(fs.readFileSync('lib/ev-data.json','utf-8'));

function calcOtdPreowned(range) {
  const m = range.match(/\$([\d,]+)\s*-\s*\$([\d,]+)/);
  if (!m) return 'No meaningful used market yet';
  const low = parseInt(m[1].replace(/,/g,''));
  const high = parseInt(m[2].replace(/,/g,''));
  const lo = Math.round(low * 1.06 + 905);
  const hi = Math.round(high * 1.06 + 905);
  return '$' + lo.toLocaleString() + ' - $' + hi.toLocaleString();
}

let p1Count = 0, p2Count = 0, p3Count = 0, p5Count = 0;

// ======= PHASE 1: Pre-owned pricing =======
const p1Updates = [
  {name: 'Kia EV9, 2024, Land', range: '$40,000 - $47,000'},
  {name: 'Kia EV9, 2025, Light RWD', range: '$37,000 - $43,000'},
  {name: 'Kia EV9, 2025, Light Long Range RWD', range: '$40,000 - $46,000'},
  {name: 'Kia EV9, 2025, Wind', range: '$40,000 - $47,000'},
  {name: 'Kia EV9, 2026, Light RWD', range: '$40,000 - $44,000'},
  {name: 'Kia EV9, 2026, Land', range: '$50,000 - $52,000'},
  {name: 'Kia EV9, 2026, Land Nightfall Edition (6-pass)', range: '$50,000 - $54,000'},
  {name: 'Kia EV9, 2026, Land Nightfall Edition (7-pass)', range: '$50,000 - $54,000'},
  {name: 'Hyundai IONIQ 9, 2026, S RWD', range: '$49,000 - $54,000'},
  {name: 'Hyundai IONIQ 9, 2026, SE', range: '$45,000 - $56,000'},
  {name: 'Hyundai IONIQ 9, 2026, Performance Limited', range: '$55,000 - $59,000'},
  {name: 'Volvo EX90, 2025, Twin Motor Plus 7-Seater', range: '$48,000 - $60,000'},
  {name: 'Volvo EX90, 2025, Twin Motor Plus 6-Seater', range: '$48,000 - $60,000'},
  {name: 'Volvo EX90, 2025, Twin Motor Ultra 7-Seater', range: '$57,000 - $60,000'},
  {name: 'Volvo EX90, 2025, Twin Motor Ultra 6-Seater', range: '$57,000 - $60,000'},
  {name: 'Volvo EX90, 2025, Twin Motor Performance Plus 7-Seater', range: '$55,000 - $63,000'},
  {name: 'Volvo EX90, 2025, Twin Motor Performance Plus 6-Seater', range: '$55,000 - $63,000'},
  {name: 'Volvo EX90, 2025, Twin Motor Performance Ultra 7-Seater', range: '$57,000 - $65,000'},
  {name: 'Volvo EX90, 2025, Twin Motor Performance Ultra 6-Seater', range: '$57,000 - $65,000'},
  {name: 'Rivian R1S, 2025, Ascend Tri Max', range: '$80,000 - $92,000'},
  {name: 'Rivian R1S, 2026, Tri Max', range: '$90,000 - $102,000'},
  {name: 'Tesla Model X, 2023, Plaid', range: '$65,000 - $74,000'},
  {name: 'Tesla Model X, 2024, Plaid', range: '$74,000 - $86,000'},
  {name: 'Tesla Model X, 2025, Plaid', range: '$86,000 - $98,000'},
  {name: 'Tesla Model X, 2026, Base', range: '$105,000 - $135,000'},
  {name: 'Tesla Model X, 2026, Plaid', range: '$118,000 - $158,000'},
  {name: 'Lucid Gravity, 2026, Grand Touring', range: '$85,000 - $97,000'},
];

p1Updates.forEach(u => {
  const otd = calcOtdPreowned(u.range);
  const p = data.preowned.find(x => x.name === u.name);
  if (p) { p.preowned_range = u.range; p.otd_preowned = otd; p1Count++; }
  else console.warn('WARN preowned not found:', u.name);
  const d = data.details.find(x => x.name === u.name);
  if (d) { d.preowned_range = u.range; d.otd_preowned = otd; }
  else console.warn('WARN details not found:', u.name);
});

// ======= PHASE 2: TBD Resolution =======
const lexusBase = data.details.find(d => d.name === 'Lexus TZ, 2027, Base (expected)');
if (lexusBase) {
  lexusBase.range_mi = 300;
  lexusBase.hud = 'Available (select trims)';
  lexusBase.zero_to_60_sec = 5.4;
  p2Count += 3;
}
const lexusSel = data.details.find(d => d.name === 'Lexus TZ, 2027, Select (expected)');
if (lexusSel) { lexusSel.hud = 'Available (select trims)'; p2Count++; }

// ======= PHASE 3: Remove MB EQS 2026 duplicates =======
const eqs400 = data.details.find(d => d.name === 'Mercedes-Benz EQS SUV, 2026, EQS 400 4MATIC');
const eqs550 = data.details.find(d => d.name === 'Mercedes-Benz EQS SUV, 2026, EQS 550 4MATIC');
if (eqs400) eqs400.notes = 'Optional 3rd-row seating. Replaces EQS 450+ naming for 2026. On sale.';
if (eqs550) eqs550.notes = 'Optional 3rd-row seating. Replaces EQS 580 naming for 2026. Performance variant.';

const before = data.details.length;
data.details = data.details.filter(d =>
  !(d.vehicle === 'Mercedes-Benz EQS SUV' && d.year === 2026 &&
    (d.trim === 'EQS 450+ 4MATIC' || d.trim === 'EQS 580 4MATIC'))
);
p3Count = before - data.details.length;

// Rename preowned entries for old trim names
const po450 = data.preowned.find(p => p.name === 'Mercedes-Benz EQS SUV, 2026, EQS 450+ 4MATIC');
if (po450) po450.name = 'Mercedes-Benz EQS SUV, 2026, EQS 400 4MATIC';
const po580 = data.preowned.find(p => p.name === 'Mercedes-Benz EQS SUV, 2026, EQS 580 4MATIC');
if (po580) po580.name = 'Mercedes-Benz EQS SUV, 2026, EQS 550 4MATIC';

// Add missing Maybach 2026 preowned entry
if (!data.preowned.find(p => p.name === 'Mercedes-Benz EQS SUV, 2026, Maybach EQS 680 4MATIC')) {
  data.preowned.push({
    name: 'Mercedes-Benz EQS SUV, 2026, Maybach EQS 680 4MATIC',
    preowned_range: 'No meaningful used market yet',
    otd_preowned: 'No meaningful used market yet'
  });
}

// Update count_data for MB EQS
const mbEqsCt = data.count_data.find(c => c.model === 'Mercedes-Benz EQS SUV');
if (mbEqsCt) { mbEqsCt.y2026 -= 2; mbEqsCt.total -= 2; }

// ======= PHASE 5: Better TBD estimates =======
const ix7_50 = data.details.find(d => d.name === 'BMW iX7, 2027, xDrive50 (expected)');
if (ix7_50) {
  ix7_50.hp = 'TBD (~570 est)';
  ix7_50.battery_kwh = 'TBD (~150+ est)';
  ix7_50.center_display = 'TBD (17.9" expected)';
  ix7_50.gauge_cluster = 'TBD (BMW Panoramic Vision expected)';
  ix7_50.hud = 'TBD (3D HUD expected)';
  ix7_50.car_software = 'TBD (BMW OS X expected)';
  ix7_50.other_displays = 'TBD (14.6" passenger display expected)';
  p5Count += 7;
}
const ix7_m70 = data.details.find(d => d.name === 'BMW iX7, 2027, M70 (expected)');
if (ix7_m70) {
  ix7_m70.battery_kwh = 'TBD (~150+ est)';
  ix7_m70.center_display = 'TBD (17.9" expected)';
  ix7_m70.gauge_cluster = 'TBD (BMW Panoramic Vision expected)';
  ix7_m70.hud = 'TBD (3D HUD expected)';
  ix7_m70.car_software = 'TBD (BMW OS X expected)';
  ix7_m70.other_displays = 'TBD (14.6" passenger display expected)';
  p5Count += 6;
}
const gv90 = data.details.find(d => d.name === 'Genesis GV90, 2027, Base (expected)');
if (gv90) {
  gv90.battery_kwh = 'TBD (~113 est)';
  gv90.range_mi = 'TBD (~350 est)';
  gv90.dc_fast_charge_kw = 350;
  gv90.center_display = 'TBD (25" OLED expected)';
  p5Count += 4;
}

// ======= Update count_totals =======
data.count_totals.y2026 = data.count_data.reduce((s,r) => s + (r.y2026||0), 0);
data.count_totals.total = data.count_data.reduce((s,r) => s + (r.total||0), 0);

// Update scope note
const newTotal = data.count_totals.total;
data.scope = data.scope.replace(/\d+ trims were analyzed/, newTotal + ' trims were analyzed');

fs.writeFileSync('lib/ev-data.json', JSON.stringify(data, null, 2) + '\n');
console.log('Phase 1:', p1Count, 'preowned pricing updates');
console.log('Phase 2:', p2Count, 'TBD fields resolved');
console.log('Phase 3:', p3Count, 'duplicate trim entries removed');
console.log('Phase 4: 1 detected (Nissan unnamed 3-row BEV 2028) - not auto-added');
console.log('Phase 5:', p5Count, 'fields updated with better estimates');
console.log('New total trims:', newTotal);

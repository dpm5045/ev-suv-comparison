const fs = require('fs');
const data = JSON.parse(fs.readFileSync('lib/ev-data.json','utf-8'));

const errors = [];
const warnings = [];
const info = [];

// === Required fields ===
// otd_new / otd_preowned are computed at load in lib/data.ts — not stored, not required.
const required = ['name','vehicle','year','trim','seats','drivetrain','msrp','preowned_range','range_mi','hp','battery_kwh','charging_type'];
// Pre-release rows (2027+, "(expected)" trims) and non-US rows (Asia-market)
// may legitimately lack US pricing/specs.
const isPreRelease = d => d.year >= 2027 || /\(expected\)/i.test(d.trim || '') || /\bAsia\b/i.test(d.trim || '');
data.details.forEach(d => {
  required.forEach(f => {
    if (d[f] === null || d[f] === undefined || d[f] === '') {
      if (isPreRelease(d)) warnings.push('Missing field on pre-release row [' + f + ']: ' + d.name);
      else errors.push('Missing required field [' + f + ']: ' + d.name);
    }
  });
});

// === Duplicate names ===
const nameCount = {};
data.details.forEach(d => { nameCount[d.name] = (nameCount[d.name]||0)+1; });
Object.entries(nameCount).filter(([k,v])=>v>1).forEach(([k,v]) => {
  warnings.push('Duplicate name (x'+v+'): ' + k);
});

// === Stored OTD guard (OTD must NOT be stored — computed at load in lib/data.ts) ===
data.details.forEach(d => {
  if ('otd_new' in d || 'otd_preowned' in d) errors.push('Stored OTD field found (must be computed, not stored): ' + d.name);
});
data.preowned.forEach(p => {
  if ('otd_preowned' in p) errors.push('Stored OTD field found in preowned (must be computed, not stored): ' + p.name);
});

// === Numeric range sanity ===
data.details.forEach(d => {
  if (typeof d.range_mi === 'number' && (d.range_mi < 150 || d.range_mi > 500)) warnings.push('range_mi out of range ['+d.range_mi+']: ' + d.name);
  if (typeof d.hp === 'number' && (d.hp < 200 || d.hp > 1200)) warnings.push('hp out of range ['+d.hp+']: ' + d.name);
  if (typeof d.battery_kwh === 'number' && (d.battery_kwh < 50 || d.battery_kwh > 250)) warnings.push('battery_kwh out of range ['+d.battery_kwh+']: ' + d.name);
  if (typeof d.msrp === 'number' && (d.msrp < 30000 || d.msrp > 200000)) warnings.push('msrp out of range ['+d.msrp+']: ' + d.name);
});

// === Count totals consistency ===
const yearCols = ['y2021','y2022','y2023','y2024','y2025','y2026','y2027'];
yearCols.forEach(y => {
  const sum = data.count_data.reduce((s,r) => s+(r[y]||0), 0);
  if (sum !== (data.count_totals[y]||0)) errors.push('count_totals mismatch for '+y+': sum='+sum+' stored='+data.count_totals[y]);
});
const totalSum = data.count_data.reduce((s,r) => s+(r.total||0), 0);
if (totalSum !== data.count_totals.total) errors.push('count_totals.total mismatch: sum='+totalSum+' stored='+data.count_totals.total);

// === Preowned <-> details sync ===
const detailNames = new Set(data.details.map(d => d.name));
data.preowned.forEach(p => {
  if (!detailNames.has(p.name)) warnings.push('Preowned entry has no details match: ' + p.name);
});

// === Data completeness ===
const completenessFields = ['onboard_ac_kw','l2_10_100','l2_10_80','charging_type','frunk_cu_ft','cargo_behind_3rd_cu_ft','cargo_behind_2nd_cu_ft','cargo_behind_1st_cu_ft','fold_flat','hp','battery_kwh','range_mi','self_driving','car_software','center_display'];
let fullyPop = 0;
data.details.forEach(d => {
  const missing = completenessFields.filter(f => {
    const v = d[f];
    return v === null || v === undefined || v === '' || (typeof v === 'string' && v.toLowerCase().startsWith('tbd'));
  });
  if (missing.length === 0) fullyPop++;
  else if (missing.length >= 5) info.push('Low completeness ('+missing.length+' missing) ['+missing.join(',')+'] — ' + d.name);
});
info.push('Data completeness: ' + fullyPop + '/' + data.details.length + ' entries fully populated');

// === Car seat fit (car_seat_fit) ===
const WATCHLIST = ['Toyota Highlander EV','Lexus TZ','Subaru Getaway','BMW iX7','Genesis GV90','Faraday Future FX Super One'];
const csf = data.car_seat_fit || [];
const csKeys = new Set();
csf.forEach(l => {
  const key = l.vehicle + ' / ' + l.seats + ' seats';
  if (csKeys.has(key)) errors.push('Duplicate car_seat_fit layout: ' + key);
  csKeys.add(key);
  if (!data.details.some(d => d.vehicle === l.vehicle && d.seats === l.seats)) warnings.push('car_seat_fit layout has no matching detail trims: ' + key);
  const rearSeats = (l.rows || []).reduce((s, r) => s + r.positions.length, 0);
  if (rearSeats + 2 !== l.seats) errors.push('car_seat_fit seat count mismatch (' + (rearSeats + 2) + ' positions vs seats=' + l.seats + '): ' + key);
  (l.rows || []).forEach(r => {
    r.positions.forEach(p => { if (!['LT','T','L','-'].includes(p)) errors.push('car_seat_fit invalid position code "' + p + '": ' + key); });
    if (!['yes','tight','no'].includes(r.rear_facing)) errors.push('car_seat_fit invalid rear_facing: ' + key);
    if (r.three_across !== null && !['yes','tight','no'].includes(r.three_across)) errors.push('car_seat_fit invalid three_across: ' + key);
  });
  if (!['verified','partial','unverified'].includes(l.confidence)) errors.push('car_seat_fit invalid confidence: ' + key);
  const row2 = (l.rows || []).find(r => r.row === 2);
  (l.third_row_access?.paths || []).flat().forEach(i => { if (!row2 || i >= row2.positions.length) errors.push('car_seat_fit access path index out of range: ' + key); });
});
// Every on-sale 3-row seat configuration should have a car seat layout
[...new Set(data.details.filter(d => d.seats >= 6 && !WATCHLIST.includes(d.vehicle)).map(d => d.vehicle + ' / ' + d.seats + ' seats'))]
  .filter(k => !csKeys.has(k))
  .forEach(k => warnings.push('No car_seat_fit layout for: ' + k));

// === Print report ===
console.log('=== EV Data Validation Report ===');
console.log(errors.length + ' errors, ' + warnings.length + ' warnings, ' + info.length + ' info items');
if (errors.length) { console.log('\nERRORS:'); errors.forEach(e => console.log('  - ' + e)); }
if (warnings.length) { console.log('\nWARNINGS:'); warnings.forEach(w => console.log('  - ' + w)); }
if (info.length) { console.log('\nINFO:'); info.forEach(i => console.log('  - ' + i)); }
if (errors.length === 0) console.log('\nAll checks passed (no errors).');
process.exit(errors.length ? 1 : 0);

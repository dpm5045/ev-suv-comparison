const fs = require('fs');
const data = JSON.parse(fs.readFileSync('lib/ev-data.json','utf-8'));

const errors = [];
const warnings = [];
const info = [];

// === Required fields ===
const required = ['name','vehicle','year','trim','seats','drivetrain','msrp','otd_new','preowned_range','otd_preowned','range_mi','hp','battery_kwh','charging_type'];
data.details.forEach(d => {
  required.forEach(f => {
    if (d[f] === null || d[f] === undefined || d[f] === '') {
      errors.push('Missing required field [' + f + ']: ' + d.name);
    }
  });
});

// === Duplicate names ===
const nameCount = {};
data.details.forEach(d => { nameCount[d.name] = (nameCount[d.name]||0)+1; });
Object.entries(nameCount).filter(([k,v])=>v>1).forEach(([k,v]) => {
  warnings.push('Duplicate name (x'+v+'): ' + k);
});

// === OTD new consistency ===
data.details.forEach(d => {
  if (typeof d.msrp === 'number' && typeof d.destination === 'number') {
    const expected = Math.round(((d.msrp + d.destination) * 1.06 + 905) * 10) / 10;
    const stored = Math.round((d.otd_new||0) * 10) / 10;
    const diff = Math.abs(expected - stored);
    if (diff > 10) errors.push('OTD new mismatch [expected ' + expected + ' got ' + stored + ']: ' + d.name);
    else if (diff > 1) warnings.push('OTD new small diff [expected ' + expected + ' got ' + stored + ']: ' + d.name);
  }
});

// === OTD preowned consistency ===
const rangeRe = /\$([\d,]+)\s*-\s*\$([\d,]+)/;
data.details.forEach(d => {
  const m = (d.preowned_range||'').match(rangeRe);
  if (!m) return;
  const low = parseInt(m[1].replace(/,/g,''));
  const expLow = Math.round(low * 1.06 + 905);
  const storedM = (d.otd_preowned||'').match(/\$([\d,]+)/);
  if (!storedM) return;
  const storedLow = parseInt(storedM[1].replace(/,/g,''));
  if (Math.abs(expLow - storedLow) > 5) {
    warnings.push('OTD preowned mismatch [low: expected ' + expLow + ' got ' + storedLow + ']: ' + d.name);
  }
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

// === Print report ===
console.log('=== EV Data Validation Report ===');
console.log(errors.length + ' errors, ' + warnings.length + ' warnings, ' + info.length + ' info items');
if (errors.length) { console.log('\nERRORS:'); errors.forEach(e => console.log('  - ' + e)); }
if (warnings.length) { console.log('\nWARNINGS:'); warnings.forEach(w => console.log('  - ' + w)); }
if (info.length) { console.log('\nINFO:'); info.forEach(i => console.log('  - ' + i)); }
if (errors.length === 0) console.log('\nAll checks passed (no errors).');

const fs = require('fs');
const data = JSON.parse(fs.readFileSync('lib/ev-data.json','utf-8'));

const errors = [];
const warnings = [];
const info = [];

// === Required fields ===
// otd_new / otd_preowned are computed at load in lib/data.ts — not stored, not required.
// msrp may be null (not sold new / unknown): availability says why, so it is not in this list.
const required = ['name','id','vehicle','year','trim','seats','drivetrain','availability','msrp_status','preowned_range','range_mi','hp','battery_kwh','charging_type'];
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

// === Schema version and identity (schema_version 2) ===
// `id` is the key for provenance, accepted.json and range fixes. `name` is a
// display label and is not unique (seat variants share it).
if (data.schema_version !== 2) errors.push('schema_version must be 2 (see scripts/refresh/compat.json), found: ' + data.schema_version);
const idCount = {};
data.details.forEach(d => {
  if (typeof d.id !== 'string' || !/^[a-z0-9-]+$/.test(d.id)) errors.push('id must match ^[a-z0-9-]+$: ' + d.name + ' [' + d.id + ']');
  idCount[d.id] = (idCount[d.id] || 0) + 1;
});
Object.entries(idCount).filter(([, n]) => n > 1).forEach(([id, n]) => errors.push('Duplicate id (x' + n + '): ' + id));
const nameCount = {};
data.details.forEach(d => { nameCount[d.name] = (nameCount[d.name]||0)+1; });
const sharedNames = Object.values(nameCount).filter(n => n > 1).length;
if (sharedNames) info.push(sharedNames + ' display name(s) shared by seat variants (expected; ids are unique)');

// === Availability, price meaning, range basis ===
const AVAIL = new Set(['new', 'used_only', 'announced', 'needs_review']);
const STATUS = new Set(['current', 'historical', 'announced', 'unknown']);
const BASIS = new Set(['epa', 'manufacturer_estimate', 'unverified']);
// Which msrp_status values each availability allows
const STATUS_FOR = {
  new: ['current', 'unknown'],
  used_only: ['historical', 'unknown'],
  announced: ['announced', 'unknown'],
  needs_review: ['current', 'historical', 'announced', 'unknown'],
};
let needsReview = 0;
data.details.forEach(d => {
  if (!AVAIL.has(d.availability)) errors.push('availability must be new, used_only, announced or needs_review [' + d.availability + ']: ' + d.id);
  if (!STATUS.has(d.msrp_status)) errors.push('msrp_status must be current, historical, announced or unknown [' + d.msrp_status + ']: ' + d.id);
  if (d.msrp !== null && !(typeof d.msrp === 'number' && Number.isFinite(d.msrp))) errors.push('msrp must be a number or null (no text sentinels) [' + d.msrp + ']: ' + d.id);
  if ((d.msrp === null) !== (d.msrp_status === 'unknown')) errors.push('msrp is null exactly when msrp_status is unknown: ' + d.id);
  if (AVAIL.has(d.availability) && !STATUS_FOR[d.availability].includes(d.msrp_status)) errors.push('msrp_status ' + d.msrp_status + ' does not fit availability ' + d.availability + ': ' + d.id);
  if (d.availability === 'needs_review') needsReview++;
  if (!('range_basis' in d)) errors.push('Missing field [range_basis] (null when there is no range): ' + d.id);
  else if (typeof d.range_mi === 'number' ? !BASIS.has(d.range_basis) : d.range_basis !== null) errors.push('range_basis must be epa, manufacturer_estimate or unverified when range_mi is a number, else null [' + d.range_basis + ']: ' + d.id);
  // EPA identity needs a reviewed EPA mapping (build spec WP-J.3); none exist yet
  if (d.range_basis === 'epa') errors.push('range_basis epa requires a reviewed EPA mapping (scripts/refresh/epa-map.json, WP-J.3): ' + d.id);
});
if (needsReview) warnings.push(needsReview + ' configuration(s) have availability needs_review: they are excluded from new-car results until resolved');

// accepted.json (manufacturer range estimates) is keyed by id and must agree with range_basis
if (fs.existsSync('scripts/refresh/accepted.json')) {
  const acc = JSON.parse(fs.readFileSync('scripts/refresh/accepted.json', 'utf-8')).range_mi || {};
  const byId = new Map(data.details.map(d => [d.id, d]));
  Object.keys(acc).forEach(id => {
    const d = byId.get(id);
    if (!d) errors.push('accepted.json entry for unknown id: ' + id);
    else if (d.range_basis !== 'manufacturer_estimate') errors.push('accepted.json lists ' + id + ' but its range_basis is ' + d.range_basis);
  });
  data.details.filter(d => d.range_basis === 'manufacturer_estimate' && !(d.id in acc)).forEach(d => errors.push('range_basis manufacturer_estimate without an accepted.json reason: ' + d.id));
}

// === Stored OTD guard (OTD must NOT be stored — computed at load in lib/data.ts) ===
data.details.forEach(d => {
  if ('otd_new' in d || 'otd_preowned' in d) errors.push('Stored OTD field found (must be computed, not stored): ' + d.name);
});
data.preowned.forEach(p => {
  if ('otd_preowned' in p) errors.push('Stored OTD field found in preowned (must be computed, not stored): ' + p.name);
});

// === Driver-assist hardware ===
// adas_hardware_gen feeds the self-driving rank (lib/data.ts rankSelfDriving).
const ADAS_GENS = new Set(['current', 'previous', 'mixed']);
data.details.forEach(d => {
  ['adas_hardware', 'adas_hardware_gen', 'adas_hardware_note'].forEach(f => {
    if (!(f in d)) errors.push('Missing field [' + f + '] (use null when not applicable): ' + d.name);
  });
  const gen = d.adas_hardware_gen;
  if (gen != null && !ADAS_GENS.has(gen)) errors.push('adas_hardware_gen must be current, previous, mixed or null [' + gen + ']: ' + d.name);
  if (gen != null && !d.adas_hardware) errors.push('adas_hardware_gen is set but adas_hardware is empty: ' + d.name);
});
data.details.filter(d => d.adas_hardware_gen === 'previous' || d.adas_hardware_gen === 'mixed').forEach(d => {
  if (!data.details.some(o => o.vehicle === d.vehicle && o.adas_hardware_gen === 'current')) {
    warnings.push('Older driver-assist hardware but no "current" row for the vehicle to rank against: ' + d.name);
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
// The parallel preowned table has no ids yet (WP-G derives it); it matches by display name.
const detailNames = new Set(data.details.map(d => d.name));
data.preowned.forEach(p => {
  if (!detailNames.has(p.name)) warnings.push('Preowned entry has no details match: ' + p.name);
});

// === Provenance sidecar (lib/ev-data.provenance.json) ===
// Optional file. `preowned` holds the CarGurus baselines written by
// scripts/refresh/preowned.mjs; `fields` holds per-row, per-field sources.
if (fs.existsSync('lib/ev-data.provenance.json')) {
  const prov = JSON.parse(fs.readFileSync('lib/ev-data.provenance.json','utf-8'));
  const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const isUrl = v => typeof v === 'string' && /^https:\/\//.test(v);
  const vehicles = new Set(data.details.map(d => d.vehicle));
  const fieldNames = new Set(data.details.flatMap(d => Object.keys(d)));
  Object.entries(prov.preowned || {}).forEach(([vehicle, v]) => {
    if (!vehicles.has(vehicle)) warnings.push('Provenance baseline for unknown vehicle: ' + vehicle);
    if (!isUrl(v.source_url)) errors.push('Provenance baseline missing https source_url: ' + vehicle);
    Object.entries(v.years || {}).forEach(([year, b]) => {
      if (typeof b.avg_price !== 'number' || !isDate(b.as_of) || !['model_year','model'].includes(b.basis)) {
        errors.push('Malformed provenance baseline: ' + vehicle + ' ' + year);
      }
    });
  });
  const detailIds = new Set(data.details.map(d => d.id));
  if (prov.schema_version !== 2) errors.push('Provenance schema_version must be 2 (fields keyed by id)');
  Object.entries(prov.fields || {}).forEach(([name, fields]) => {
    if (!detailIds.has(name)) errors.push('Provenance entry for unknown id: ' + name);
    Object.entries(fields).forEach(([field, p]) => {
      if (!fieldNames.has(field)) errors.push('Provenance entry for unknown field [' + field + ']: ' + name);
      if (!isUrl(p.source_url) || !isDate(p.verified_on)) errors.push('Provenance entry needs https source_url and YYYY-MM-DD verified_on [' + field + ']: ' + name);
    });
  });
  const provCount = Object.values(prov.fields || {}).reduce((n, f) => n + Object.keys(f).length, 0);
  info.push('Provenance: ' + provCount + ' field source(s) recorded, ' + Object.keys(prov.preowned || {}).length + ' vehicle(s) with pre-owned baselines');
}

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
process.exit(errors.length ? 1 : 0);

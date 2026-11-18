// Full-state data validation (runs before every build and in CI).
// Every rule lives in scripts/schema/ev-data.schema.mjs; this is the runner.
// Changes between revisions are checked by scripts/validate-diff.mjs.
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const read = (p, fallback) => {
  const f = path.join(ROOT, p)
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf-8')) : fallback
}

;(async () => {
  const schema = await import(path.join(ROOT, 'scripts/schema/ev-data.schema.mjs'))
  const input = {
    data: read('lib/ev-data.json'),
    prov: read('lib/ev-data.provenance.json', {}),
    accepted: read('scripts/refresh/accepted.json', {}),
    retired: read('scripts/refresh/retired-ids.json', { ids: [] }),
  }
  const { errors, warnings: known } = schema.applyBaseline(schema.checkState(input), read('scripts/schema/known-violations.json', { violations: [] }))
  const { warnings, info } = schema.advisories(input)
  if (known.length) warnings.unshift(`${known.length} known violation(s) listed in scripts/schema/known-violations.json (fixed in WP-F step 3)`)

  console.log('=== EV Data Validation Report ===')
  console.log(`${errors.length} errors, ${warnings.length} warnings, ${info.length} info items`)
  if (errors.length) { console.log('\nERRORS:'); errors.forEach((e) => console.log(`  - [${e.rule}] ${e.id} ${e.field}: ${e.msg}`)) }
  if (warnings.length) { console.log('\nWARNINGS:'); warnings.forEach((w) => console.log(`  - ${w}`)) }
  if (info.length) { console.log('\nINFO:'); info.forEach((i) => console.log(`  - ${i}`)) }
  if (!errors.length) console.log('\nAll checks passed (no errors).')
  process.exit(errors.length ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })

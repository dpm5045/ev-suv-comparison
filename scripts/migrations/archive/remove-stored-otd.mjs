// One-shot: delete stored otd_new / otd_preowned — they are now computed
// at load time in lib/data.ts from msrp/destination/preowned_range.
import fs from 'node:fs'

const path = 'lib/ev-data.json'
const data = JSON.parse(fs.readFileSync(path, 'utf8'))

let removed = 0
for (const d of data.details) {
  if ('otd_new' in d) { delete d.otd_new; removed++ }
  if ('otd_preowned' in d) { delete d.otd_preowned; removed++ }
}
for (const p of data.preowned) {
  if ('otd_preowned' in p) { delete p.otd_preowned; removed++ }
}

fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
console.log(`Removed ${removed} stored OTD fields from ${data.details.length} details + ${data.preowned.length} preowned rows`)

#!/usr/bin/env node
// A stand-in for the `gh` CLI in the publish-pr.sh / tidy-prs.sh tests. It logs every call
// (one JSON array per line to $FAKE_GH_LOG) and answers from the scenario in $FAKE_GH_STATE.
// Answers are what the real command prints AFTER its --jq filter.
//   paused:   [bool, ...]  successive reads of publish-control.json (the last value repeats)
//   build:    "completed:success" (check-runs), contract: "success" (commit status)
//   labels:   "a,b"        heads: [sha, ...] successive headRefOid reads
//   mergeFails, updateFails: bool    prs: "tsv lines" (gh pr list)
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
appendFileSync(process.env.FAKE_GH_LOG, JSON.stringify(args) + '\n')
const statePath = process.env.FAKE_GH_STATE
const st = JSON.parse(readFileSync(statePath, 'utf8'))
const save = () => writeFileSync(statePath, JSON.stringify(st))
const next = (k, dflt) => { const v = st[k]; if (!Array.isArray(v)) return v ?? dflt; const x = v.length > 1 ? v.shift() : v[0]; save(); return x }
const print = (s) => process.stdout.write(`${s}\n`)
const [cmd, sub] = args

if (cmd === 'api') {
  const path = sub
  if (path.includes('/contents/scripts/refresh/publish-control.json')) print(JSON.stringify({ paused: next('paused', false), reason: 'test' }))
  else if (path.endsWith('/check-runs')) print(st.build ?? 'completed:success')
  else if (path.endsWith('/status')) print(st.contract ?? 'success')
  else if (/\/commits\/[^/]+$/.test(path)) print('0123456789abcdef0123456789abcdef01234567')
  else if (/^repos\/[^/]+\/[^/]+$/.test(path)) print('master')
  else print('')
} else if (cmd === 'pr') {
  if (sub === 'create') print('https://github.com/o/r/pull/7')
  else if (sub === 'view' && args.includes('labels')) print(st.labels ?? '')
  else if (sub === 'view' && args.includes('headRefOid')) print(next('heads', 'aaa'))
  else if (sub === 'merge') process.exit(st.mergeFails ? 1 : 0)
  else if (sub === 'update-branch') process.exit(st.updateFails ? 1 : 0)
  else if (sub === 'list') { if (st.prs) print(st.prs) }
}

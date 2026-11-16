#!/usr/bin/env node
/**
 * Which research sources answer from this machine right now?
 *
 *   node scripts/refresh/probe-sources.mjs > reachable.md
 *
 * Cloud runners get blocked by some sites (Tesla, Edmunds, KBB) and not by
 * others, and that changes over time. The data agent reads this table at the
 * start of every run so it plans around what is reachable today instead of
 * burning turns on blocked sites. Same request as fetch-page.mjs.
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const sources = JSON.parse(readFileSync(join(ROOT, 'scripts/refresh/sources.json'), 'utf-8'))

// One representative page per site; registered pages first.
const pages = new Map()
const add = (url) => {
  const host = new URL(url).hostname.replace(/^www\./, '')
  if (!pages.has(host)) pages.set(host, url)
}
for (const url of Object.values(sources.pricing_pages)) add(url)
add(Object.values(sources.cargurus_price_trends)[0])
add(Object.values(sources.third_party_pages)[0])
for (const url of sources.probe_extra ?? []) add(url)

const results = await Promise.all(
  [...pages].map(async ([host, url]) => {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'data-refresh-script/1.0' }, signal: AbortSignal.timeout(20000) })
      await res.arrayBuffer()
      return { host, url, ok: res.ok, status: `HTTP ${res.status}` }
    } catch (e) {
      return { host, url, ok: false, status: e.name === 'TimeoutError' ? 'timed out' : e.message }
    }
  }),
)

const today = new Date().toISOString().slice(0, 10)
console.log(`# Sources reachable from this runner — ${today}\n`)
console.log('| Site | Reachable | Result | Probed page |\n|---|---|---|---|')
for (const r of results.sort((a, b) => Number(b.ok) - Number(a.ok) || a.host.localeCompare(b.host))) {
  console.log(`| ${r.host} | ${r.ok ? 'yes' : '**no**'} | ${r.status} | ${r.url} |`)
}

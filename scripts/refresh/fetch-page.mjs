#!/usr/bin/env node
/**
 * Fetch a page as plain text, for research by the data agent (and by hand).
 *
 *   node scripts/refresh/fetch-page.mjs <url>                     # page text, first 15,000 chars
 *   node scripts/refresh/fetch-page.mjs <url> --grep 'MSRP|\$\d'  # only matching lines, with context
 *   node scripts/refresh/fetch-page.mjs <url> --raw --grep 'msrp' # search the HTML itself (prices in JSON)
 *   node scripts/refresh/fetch-page.mjs <url> --max 40000
 *
 * Why not WebFetch: several sites block the agent's built-in fetcher but
 * serve this plain request from GitHub's runners (Car and Driver, CarGurus,
 * most manufacturer sites). Only domains on the allowlist below are fetched,
 * and a redirect may not leave the site.
 *
 * Exit codes: 0 fetched, 2 blocked or failed (the message says which), 1 usage.
 */

const ALLOWED = [
  // Manufacturers
  'rivian.com', 'tesla.com', 'kia.com', 'hyundaiusa.com', 'cadillac.com', 'mbusa.com', 'volvocars.com',
  'lucidmotors.com', 'vw.com', 'subaru.com', 'toyota.com', 'lexus.com', 'genesis.com', 'bmwusa.com',
  'vinfastauto.us', 'ff.com', 'gm.com', 'kiamedia.com', 'hyundainews.com', 'media.cadillac.com', 'pressroom.toyota.com',
  // Reference and press
  'caranddriver.com', 'motortrend.com', 'edmunds.com', 'kbb.com', 'cars.com', 'truecar.com', 'carfax.com',
  'carbuzz.com', 'insideevs.com', 'electrek.co', 'topspeed.com', 'cargurus.com', 'evkx.net',
  'evspecifications.com', 'fueleconomy.gov', 'epa.gov', 'wikipedia.org', 'usnews.com',
]

const USER_AGENT = 'data-refresh-script/1.0'
const TIMEOUT_MS = 30000

const args = process.argv.slice(2)
const url = args.find((a) => /^https?:\/\//.test(a))
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null)
const raw = args.includes('--raw')
const grep = option('--grep')
const max = Number(option('--max') ?? 15000)

if (!url) {
  console.error('usage: fetch-page.mjs <https url> [--grep regex] [--raw] [--max chars]')
  process.exit(1)
}

const allowed = (host) => ALLOWED.some((d) => host === d || host.endsWith('.' + d))
const site = (host) => ALLOWED.find((d) => host === d || host.endsWith('.' + d))

function fail(msg) {
  console.log(`NOT FETCHED: ${msg}`)
  console.log('Treat this source as unavailable: change nothing on its account, and say so in the changelog.')
  process.exit(2)
}

const start = new URL(url)
if (start.protocol !== 'https:') fail('only https URLs are fetched')
if (!allowed(start.hostname)) fail(`${start.hostname} is not on the allowlist in scripts/refresh/fetch-page.mjs`)

let res
try {
  res = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/json;q=0.9,*/*;q=0.8' }, signal: AbortSignal.timeout(TIMEOUT_MS) })
} catch (e) {
  fail(`${e.name === 'TimeoutError' ? 'timed out' : e.message}`)
}
const end = new URL(res.url)
if (site(end.hostname) !== site(start.hostname)) fail(`redirected off-site to ${end.hostname}`)
if (!res.ok) fail(`HTTP ${res.status}${[401, 403, 406, 429].includes(res.status) ? ' (the site blocks automated requests)' : ''}`)

const body = await res.text()

function toText(html) {
  return html
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/section|\/article|\/td|\/th)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&rsquo;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&ndash;|&mdash;/g, '–')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

let out
if (raw) {
  if (grep) {
    const re = new RegExp(grep, 'gi')
    const hits = []
    for (const m of body.matchAll(re)) {
      hits.push('…' + body.slice(Math.max(0, m.index - 150), m.index + m[0].length + 150).replace(/\s+/g, ' ') + '…')
      if (hits.length >= 60) break
    }
    out = hits.length ? hits.join('\n') : `(no match for /${grep}/)`
  } else out = body
} else {
  const text = toText(body)
  if (grep) {
    const re = new RegExp(grep, 'i')
    const lines = text.split('\n')
    const keep = new Set()
    lines.forEach((l, i) => { if (re.test(l)) for (let j = i - 1; j <= i + 1; j++) if (j >= 0 && j < lines.length) keep.add(j) })
    out = keep.size ? [...keep].sort((a, b) => a - b).map((i) => lines[i]).join('\n') : `(no match for /${grep}/)`
  } else out = text
}

console.log(`URL: ${res.url}`)
console.log(`HTTP ${res.status}, fetched ${new Date().toISOString().slice(0, 10)}`)
console.log('---')
console.log(out.length > max ? out.slice(0, max) + `\n… (truncated at ${max} of ${out.length} chars; use --grep or --max)` : out)

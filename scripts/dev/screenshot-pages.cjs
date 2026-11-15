/**
 * Visual check helper. Captures the top 2000px of every main route at
 * desktop (1440) and phone (390) width in dark theme, plus home and
 * Watch List in light theme, and reports horizontal overflow.
 *
 * Requires Google Chrome installed (Playwright's bundled Chromium is not
 * used) and a production build being served on port 3917:
 *
 *   npm run build
 *   npx next start -p 3917 &
 *   node scripts/dev/screenshot-pages.cjs /path/to/output-dir
 *   pkill -f "next start -p 3917"
 */
const { chromium } = require(process.cwd() + '/node_modules/playwright')

const out = process.argv[2]
if (!out) {
  console.error('usage: node scripts/dev/screenshot-pages.cjs <output-dir>')
  process.exit(1)
}

const routes = [
  ['home', '/'],
  ['watch', '/watch-list'],
  ['spec', '/spec-select'],
  ['sbs', '/side-by-side'],
  ['full', '/comparison'],
  ['glossary', '/glossary'],
  ['vehicle', '/vehicles/kia-ev9'],
  ['vehicle-watch', '/vehicles/lexus-tz'],
  ['compare', '/compare/kia-ev9-vs-rivian-r1s'],
  ['about', '/about'],
  ['explore', '/explore'],
]

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome' })

  async function run(tag, width, theme, list) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } })
    await ctx.addInitScript((t) => {
      try {
        localStorage.setItem('theme', t)
        localStorage.setItem('theme-unlocked', 'true')
      } catch (e) {}
    }, theme)
    for (const [name, path] of list) {
      const page = await ctx.newPage()
      try {
        await page.goto('http://localhost:3917' + path, { waitUntil: 'networkidle', timeout: 30000 })
        if (theme === 'light') {
          await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'))
        }
        await page.waitForTimeout(600)
        const m = await page.evaluate(() => ({
          sw: document.documentElement.scrollWidth,
          iw: window.innerWidth,
          h: document.documentElement.scrollHeight,
        }))
        await page.screenshot({
          path: `${out}/${name}-${tag}.png`,
          fullPage: true,
          clip: { x: 0, y: 0, width, height: Math.min(m.h, 2000) },
        })
        console.log(name, tag, 'height', m.h, m.sw > m.iw ? 'OVERFLOW-X ' + m.sw : 'ok')
      } catch (e) {
        console.log(name, tag, 'FAILED', e.message.split('\n')[0])
      }
      await page.close()
    }
    await ctx.close()
  }

  await run('desk', 1440, 'dark', routes)
  await run('phone', 390, 'dark', routes)
  await run('light', 1440, 'light', routes.slice(0, 2))
  await browser.close()
})()

import { test, expect } from '@playwright/test'

test('home renders speed dating', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.site-header')).toBeVisible()
  await expect(page.locator('h1')).toHaveText('Find your perfect 3-row EV.')
  await expect(page.locator('main.main')).toContainText("It's a match")
})

test('comparison route renders a data table', async ({ page }) => {
  await page.goto('/comparison')
  await expect(page.locator('table').first()).toBeVisible()
})

test('glossary route renders', async ({ page }) => {
  await page.goto('/glossary')
  await expect(page.locator('main.main')).toContainText(/glossary/i)
})

test('news radar route renders and is the first tab after the brand', async ({ page }) => {
  await page.goto('/news-radar')
  await expect(page.locator('main.main')).toContainText(/arrivals/i)
  await expect(page.locator('main.main')).toContainText(/departures/i)
  const tabs = page.locator('nav.header-nav a.nav-tab')
  await expect(tabs.nth(0)).toHaveText('3RowEV')
  await expect(tabs.nth(1)).toHaveText('News Radar')
})

test('old /explore and /data URLs redirect to market insights', async ({ page }) => {
  await page.goto('/explore')
  await expect(page).toHaveURL(/\/market-insights/)
  await page.goto('/data')
  await expect(page).toHaveURL(/\/market-insights/)
})

test('old /watch-list URL redirects to news radar', async ({ page }) => {
  await page.goto('/watch-list')
  await expect(page).toHaveURL(/\/news-radar/)
})

test('old ?tab= URL redirects to route', async ({ page }) => {
  await page.goto('/?tab=comparison&vehicle=Kia%20EV9')
  await expect(page).toHaveURL(/\/comparison/)
})

test('side-by-side route renders', async ({ page }) => {
  await page.goto('/side-by-side')
  await expect(page.locator('main.main')).toBeVisible()
})

test('spec-select route renders', async ({ page }) => {
  await page.goto('/spec-select')
  await expect(page.locator('main.main')).toBeVisible()
})

test('vehicle page renders hero and trim table', async ({ page }) => {
  await page.goto('/vehicles/kia-ev9')
  await expect(page.locator('.vehicle-hero')).toBeVisible()
  await expect(page.locator('.trim-compare-table')).toBeVisible()
})

test('compare page renders', async ({ page }) => {
  await page.goto('/compare/kia-ev9-vs-rivian-r1s')
  await expect(page.locator('main')).toContainText(/Kia EV9/i)
})

test('market insights page renders stories and the explorer chart', async ({ page }) => {
  await page.goto('/market-insights')
  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
  const stories = await page.locator('.ds-story').count()
  // Stories with thin data are skipped by design; the title must count what renders
  expect(stories).toBeGreaterThanOrEqual(1)
  await expect(page.locator('main.main')).toContainText(`in ${WORDS[stories]} charts`)
  await expect(page.locator('.explorer')).toBeVisible()
  // Plot renders <svg> today; Chart.js renders <canvas> after the chart port — accept either
  await expect(page.locator('.explorer svg, .explorer canvas').first()).toBeVisible({ timeout: 15_000 })
})

test('speed dating fits a phone screen with a long self-driving label', async ({ page }) => {
  // Pre-owned, under $40k, self-driving first: the Model X card shows "L2+ Point-to-Point (older hardware)"
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?condition=preowned&budget=under40&pref1=selfdriving&pref2=sixseat')
  await expect(page.locator('.sd-bar-value', { hasText: 'older hardware' }).first()).toBeVisible()
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }))
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
})

test('market insights fits a phone screen and shows every story headline', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/market-insights')
  const headlines = page.locator('.ds-story .ds-headline')
  expect(await headlines.count()).toBeGreaterThanOrEqual(1)
  for (const h of await headlines.all()) await expect(h).toBeVisible()
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }))
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
})

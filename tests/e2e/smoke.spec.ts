import { test, expect } from '@playwright/test'

test('home renders overview', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.site-header')).toBeVisible()
  await expect(page.locator('main.main')).toBeVisible()
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

test('old /explore URL redirects to data', async ({ page }) => {
  await page.goto('/explore')
  await expect(page).toHaveURL(/\/data/)
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

test('data page renders stories and the explorer chart', async ({ page }) => {
  await page.goto('/data')
  await expect(page.locator('main.main')).toContainText('in four charts')
  await expect(page.locator('.explorer')).toBeVisible()
  // Plot renders <svg> today; Chart.js renders <canvas> after the chart port — accept either
  await expect(page.locator('.explorer svg, .explorer canvas').first()).toBeVisible({ timeout: 15_000 })
})

import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/** Is keyboard focus inside the element matched by the selector? */
const focusInside = (page: Page, selector: string) =>
  page.evaluate((sel) => !!document.querySelector(sel)?.contains(document.activeElement), selector)

test.describe('detail drawer (keyboard)', () => {
  test('opens from the Details button, traps focus, closes on Escape and returns focus', async ({ page }) => {
    await page.goto('/comparison')
    await page.waitForLoadState('networkidle') // wait for hydration before using the keyboard
    const trigger = page.locator('.view-details-btn').first()
    await expect(trigger).toHaveAccessibleName(/^Details ?: \d{4} /)
    await trigger.focus()
    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    // Focus moves into the drawer, onto its heading
    await expect.poll(() => focusInside(page, '[role="dialog"]')).toBe(true)

    // Tab and Shift+Tab never leave the drawer
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab')
      expect(await focusInside(page, '[role="dialog"]')).toBe(true)
    }
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Shift+Tab')
      expect(await focusInside(page, '[role="dialog"]')).toBe(true)
    }

    // The page behind is inert while the drawer is open
    expect(await page.evaluate(() => [...document.body.children].some((el) => el.hasAttribute('inert')))).toBe(true)

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(trigger).toBeFocused()
    expect(await page.evaluate(() => [...document.body.children].filter((el) => !el.querySelector('[role="dialog"]')).some((el) => el.hasAttribute('inert')))).toBe(false)
  })

  test('a closed drawer has nothing focusable', async ({ page }) => {
    await page.goto('/comparison')
    await page.waitForLoadState('networkidle') // wait for hydration before using the keyboard
    // The closed drawer is inert: Tab through the start of the page and never land inside it
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab')
      expect(await focusInside(page, '.detail-panel')).toBe(false)
    }
    expect(await page.locator('.detail-panel').getAttribute('inert')).not.toBeNull()
  })

  test('the home page summary drawer opens from a vehicle badge and closes with Escape', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle') // wait for hydration before using the keyboard
    const badge = page.locator('.sd-badge-btn').first()
    await badge.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(badge).toBeFocused()
  })
})

test('side-by-side selects have labels', async ({ page }) => {
  await page.goto('/side-by-side')
  await page.waitForLoadState('networkidle') // wait for hydration before using the keyboard
  await expect(page.getByLabel('Car 1 Vehicle')).toBeVisible()
  await expect(page.getByLabel('Car 2 Vehicle')).toBeVisible()
})

test('spec select sections toggle from the keyboard', async ({ page }) => {
  await page.goto('/spec-select')
  await page.waitForLoadState('networkidle') // wait for hydration before using the keyboard
  const toggle = page.locator('button.spec-section-title').first()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.focus()
  await page.keyboard.press('Enter')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
})

// Automated pass: no serious or critical violations on any route
const ROUTES = ['/', '/comparison', '/side-by-side', '/spec-select', '/market-insights', '/news-radar', '/glossary', '/vehicles/kia-ev9', '/compare/kia-ev9-vs-rivian-r1s']
for (const route of ROUTES) {
  test(`axe: ${route}`, async ({ page }) => {
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serious.map((v) => `${v.id} (${v.nodes.length}): ${v.help}`)).toEqual([])
  })
}

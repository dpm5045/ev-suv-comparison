import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DATA } from '@/lib/data'
import { CLASS_THEMES, VEHICLE_CLASSES } from '@/lib/vehicle-theme'

// The three places a vehicle's colours live must agree: VEHICLE_CLASSES,
// CLASS_THEMES, and the badge classes in globals.css (dark and light).
const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')
const rule = (selector: string) => {
  const m = css.match(new RegExp(`(^|\\n)${selector.replace(/[.[\]="]/g, '\\$&')} \\{([^}]*)\\}`))
  return m?.[2] ?? null
}
const colours = (body: string) => ({
  bg: body.match(/background:\s*(#[0-9a-fA-F]{6})/)?.[1]?.toLowerCase(),
  fg: body.match(/(?:^|;)\s*color:\s*(#[0-9a-fA-F]{6})/)?.[1]?.toLowerCase(),
})

describe('vehicle theme registry', () => {
  it('every vehicle in the data has a class', () => {
    for (const v of new Set(DATA.details.map((r) => r.vehicle))) expect(VEHICLE_CLASSES[v], v).toBeTruthy()
  })

  it.each(Object.entries(CLASS_THEMES))('%s has dark and light CSS that matches its theme colours', (cls, t) => {
    const dark = rule(`.${cls}`)
    const light = rule(`html[data-theme="light"] .${cls}`)
    expect(dark, `.${cls} missing in globals.css`).not.toBeNull()
    expect(light, `light .${cls} missing in globals.css`).not.toBeNull()
    expect(colours(dark!)).toEqual({ bg: t.darkBg.toLowerCase(), fg: t.darkFg.toLowerCase() })
    expect(colours(light!)).toEqual({ bg: t.lightBg.toLowerCase(), fg: t.lightFg.toLowerCase() })
  })

  it('every class a vehicle uses has a theme', () => {
    for (const cls of Object.values(VEHICLE_CLASSES)) expect(CLASS_THEMES[cls], cls).toBeTruthy()
  })
})

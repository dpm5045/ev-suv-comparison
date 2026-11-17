import { describe, expect, it } from 'vitest'
import { fmtMsrp } from '@/lib/utils'

// One formatter for every MSRP shown on the site: full (tables, panels) and compact (cards)
describe('fmtMsrp', () => {
  const current = { msrp: 62500, availability: 'new', msrp_status: 'current' }
  const announced = { msrp: 79000, availability: 'announced', msrp_status: 'announced' }
  const historical = { msrp: 90000, availability: 'used_only', msrp_status: 'historical' }
  const usedNoPrice = { msrp: null, availability: 'used_only', msrp_status: 'unknown' }
  const unknown = { msrp: null, availability: 'announced', msrp_status: 'unknown' }

  it('shows current and announced prices', () => {
    expect(fmtMsrp(current).text).toBe('$62,500')
    expect(fmtMsrp(current, { compact: true }).text).toBe('$63k')
    expect(fmtMsrp(announced, { compact: true }).text).toBe('$79k')
  })

  it('never shows a historical price as current', () => {
    expect(fmtMsrp(historical).text).toBe('Not sold new (was $90,000)')
    expect(fmtMsrp(historical, { compact: true }).text).toBe('Used only')
    expect(fmtMsrp(historical).className).toBe('cell-na')
  })

  it('labels used-only and unknown prices', () => {
    expect(fmtMsrp(usedNoPrice).text).toBe('Not sold new')
    expect(fmtMsrp(usedNoPrice, { compact: true }).text).toBe('Used only')
    expect(fmtMsrp(unknown).text).toBe('TBD')
    expect(fmtMsrp(unknown, { compact: true }).text).toBe('TBD')
  })
})

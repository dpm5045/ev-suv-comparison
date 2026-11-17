export function fmtMoney(v: number | string | null | undefined): { text: string; className: string } {
  if (v == null || v === '' || v === '-' || v === 'None') return { text: '—', className: 'cell-na' }
  if (typeof v === 'string' && v.startsWith('$')) return { text: v, className: 'cell-price' }
  if (typeof v === 'string' && (v.includes('N/A') || v.includes('TBD') || v.includes('No meaningful')))
    return { text: v, className: 'cell-na' }
  if (typeof v === 'number') return { text: '$' + Math.round(v).toLocaleString(), className: 'cell-price' }
  return { text: String(v), className: '' }
}

/**
 * MSRP for display, from the row's price and availability: a current or
 * announced price; "Not sold new" for used-only configurations (an older price
 * is shown as "was $X"); "TBD" when unknown.
 */
export function fmtMsrp(r: { msrp: number | null; availability: string; msrp_status: string }): { text: string; className: string } {
  if (typeof r.msrp === 'number') {
    if (r.msrp_status === 'historical') return { text: `Not sold new (was $${Math.round(r.msrp).toLocaleString()})`, className: 'cell-na' }
    return { text: '$' + Math.round(r.msrp).toLocaleString(), className: 'cell-price' }
  }
  if (r.availability === 'used_only') return { text: 'Not sold new', className: 'cell-na' }
  return { text: 'TBD', className: 'cell-na' }
}

export function fmtNum(v: number | string | null | undefined): { text: string; className: string } {
  if (v == null || v === '' || v === '-' || v === 'None') return { text: '—', className: 'cell-na' }
  if (typeof v === 'number') return { text: v.toLocaleString(), className: '' }
  return { text: String(v), className: '' }
}

export function isNaLike(s: string): boolean {
  return s.includes('N/A') || s.includes('TBD') || s.includes('No ') || s === '-' || s === ''
}

/** "Nov 14, 2026" from an ISO date (YYYY-MM-DD); returns the input if unparseable. */
export function fmtDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

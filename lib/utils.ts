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
export function fmtMsrp(
  r: { msrp: number | null; availability: string; msrp_status: string },
  opts: { compact?: boolean } = {},
): { text: string; className: string } {
  // compact (cards): "$62k" / "Used only" / "TBD"; full (tables, panels): "$62,500" / "Not sold new (was $X)" / "TBD"
  if (typeof r.msrp === 'number' && r.msrp_status !== 'historical') {
    return { text: opts.compact ? `$${Math.round(r.msrp / 1000)}k` : '$' + Math.round(r.msrp).toLocaleString(), className: 'cell-price' }
  }
  if (r.availability === 'used_only' || r.msrp_status === 'historical') {
    if (opts.compact) return { text: 'Used only', className: 'cell-na' }
    return { text: typeof r.msrp === 'number' ? `Not sold new (was $${Math.round(r.msrp).toLocaleString()})` : 'Not sold new', className: 'cell-na' }
  }
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

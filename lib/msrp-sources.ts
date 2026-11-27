/**
 * Which stored MSRPs have a matching source record. Server-only: it reads
 * lib/ev-data.provenance.json at build time, so it must never be imported by a
 * client component (the home page imports lib/data-stories.ts and
 * components/DataStories.tsx, which is why this lives on its own).
 */
import provenance from './ev-data.provenance.json'
import type { DetailRow } from './data'

interface MsrpRecord {
  value?: unknown
  legacy?: unknown
}

const fields = (provenance as unknown as { fields: Record<string, { msrp?: MsrpRecord }> }).fields

/**
 * True when the row's MSRP has a full (non-legacy) provenance record whose value
 * equals the stored MSRP. The data contract only admits full records whose
 * evidence quotes the number, so a match means the price is sourced.
 */
export function hasSourcedMsrp(r: Pick<DetailRow, 'id' | 'msrp'>): boolean {
  const rec = fields[r.id]?.msrp
  return !!rec && !rec.legacy && typeof r.msrp === 'number' && rec.value === r.msrp
}

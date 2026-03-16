import { DATA, type DetailRow } from './data'

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://threerowev.com'

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.\(\)]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

export function getUniqueVehicles(): string[] {
  return [...new Set(DATA.details.map(d => d.vehicle))].sort()
}

export function getVehicleBySlug(slug: string): string | undefined {
  return getUniqueVehicles().find(v => toSlug(v) === slug)
}

export function getTrimsForVehicle(vehicle: string): DetailRow[] {
  return DATA.details.filter(d => d.vehicle === vehicle)
}

export function getBrandFromVehicle(vehicle: string): string {
  return vehicle.split(' ')[0]
}

export interface ComparisonPair {
  slug: string
  slugA: string
  slugB: string
  nameA: string
  nameB: string
}

export function getAllComparisonPairs(): ComparisonPair[] {
  const vehicles = getUniqueVehicles()
  const pairs: ComparisonPair[] = []
  for (let i = 0; i < vehicles.length; i++) {
    for (let j = i + 1; j < vehicles.length; j++) {
      const slugA = toSlug(vehicles[i])
      const slugB = toSlug(vehicles[j])
      pairs.push({
        slug: `${slugA}-vs-${slugB}`,
        slugA,
        slugB,
        nameA: vehicles[i],
        nameB: vehicles[j],
      })
    }
  }
  return pairs
}

export function parseComparisonSlug(slug: string): { slugA: string; slugB: string } | null {
  const idx = slug.indexOf('-vs-')
  if (idx === -1) return null
  // Try all possible split positions for "-vs-" in case a vehicle slug contains "vs"
  const parts = []
  let pos = 0
  while (true) {
    const i = slug.indexOf('-vs-', pos)
    if (i === -1) break
    parts.push({ slugA: slug.slice(0, i), slugB: slug.slice(i + 4) })
    pos = i + 1
  }
  // Find the split where both slugs resolve to real vehicles
  for (const { slugA, slugB } of parts) {
    if (getVehicleBySlug(slugA) && getVehicleBySlug(slugB)) {
      return { slugA, slugB }
    }
  }
  return parts[0] || null
}

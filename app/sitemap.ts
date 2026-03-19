import type { MetadataRoute } from 'next'
import { SITE_URL, getUniqueVehicles, toSlug, getAllComparisonPairs } from '@/lib/slugs'

export default function sitemap(): MetadataRoute.Sitemap {
  // Use a fixed date — update when ev-data.json changes meaningfully
  const now = new Date('2026-03-19')

  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  for (const vehicle of getUniqueVehicles()) {
    pages.push({
      url: `${SITE_URL}/vehicles/${toSlug(vehicle)}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  for (const pair of getAllComparisonPairs()) {
    pages.push({
      url: `${SITE_URL}/compare/${pair.slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    })
  }

  return pages
}

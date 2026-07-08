import type { MetadataRoute } from 'next'
import { DATA } from '@/lib/data'
import { SITE_URL, getUniqueVehicles, toSlug, getAllComparisonPairs } from '@/lib/slugs'

export default function sitemap(): MetadataRoute.Sitemap {
  // Driven by the data refresh date — bumped by the /refresh workflow
  const now = new Date(DATA.last_updated)

  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/comparison`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/spec-select`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/side-by-side`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/explore`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/glossary`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
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

export const AMAZON_TAG = 'threerowev-20'

export const AFFILIATE_DISCLOSURE =
  'As an Amazon Associate, we earn from qualifying purchases.'

export function amazonSearchUrl(query: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${AMAZON_TAG}`
}

// Glossary charging standard → Amazon search query mapping
export const GLOSSARY_AMAZON_LINKS: Record<string, { text: string; query: string }> = {
  NACS:  { text: 'Shop NACS Adapters',           query: 'NACS to CCS adapter EV' },
  CCS1:  { text: 'Shop CCS Adapters',            query: 'CCS to NACS adapter EV' },
  J1772: { text: 'Shop J1772 Cables',            query: 'J1772 EV charging cable' },
  L2:    { text: 'Shop Level 2 Chargers',         query: 'Level 2 EV home charger' },
  DCFC:  { text: 'Shop DC Fast Charge Adapters',  query: 'DC fast charge adapter EV' },
}

interface AffiliateLink {
  text: string
  url: string
}

/**
 * Returns contextual affiliate links based on the vehicle's charging type.
 * Adapter direction: adapter converts the station's plug to fit the vehicle's port.
 */
export function getChargingLinks(chargingType: string): AffiliateLink[] {
  const links: AffiliateLink[] = []
  const ct = (chargingType || '').trim()

  if (ct.startsWith('NACS')) {
    links.push({ text: 'CCS to NACS Adapter', url: amazonSearchUrl('CCS to NACS adapter EV') })
  } else if (ct.startsWith('CCS')) {
    links.push({ text: 'NACS to CCS Adapter', url: amazonSearchUrl('NACS to CCS adapter EV') })
  } else if (ct.includes('pre-NACS')) {
    links.push({ text: 'Tesla to J1772 Adapter', url: amazonSearchUrl('Tesla to J1772 adapter') })
  }
  // TBD / empty → no adapter links

  // Always-shown charging links
  links.push({ text: 'Portable EV Charger', url: amazonSearchUrl('portable EV charger') })
  links.push({ text: 'Level 2 Home Charger', url: amazonSearchUrl('Level 2 EV home charger') })

  return links
}

/**
 * Returns vehicle-specific accessory links.
 */
export function getAccessoryLinks(vehicle: string, year: number | string): AffiliateLink[] {
  return [
    { text: 'Cargo Organizers', url: amazonSearchUrl(`${vehicle} cargo organizer`) },
    { text: 'All-Weather Floor Mats', url: amazonSearchUrl(`${year} ${vehicle} floor mats`) },
  ]
}

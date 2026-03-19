import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { DATA, VEHICLE_CLASSES } from '@/lib/data'
import { getVehicleBySlug, getTrimsForVehicle, getUniqueVehicles, toSlug } from '@/lib/slugs'

export const runtime = 'edge'

const BRAND_COLORS: Record<string, { bg: string; fg: string }> = {
  'v-kia':      { bg: '#1a3a2a', fg: '#4ade80' },
  'v-hyundai':  { bg: '#1a2a3a', fg: '#5ba4f5' },
  'v-lucid':    { bg: '#2a1a3a', fg: '#a78bfa' },
  'v-rivian':   { bg: '#3a2a1a', fg: '#fb923c' },
  'v-tesla':    { bg: '#3a1a1a', fg: '#f87171' },
  'v-toyota':   { bg: '#1a3a3a', fg: '#2dd4bf' },
  'v-vinfast':  { bg: '#2a1a1a', fg: '#f59e0b' },
  'v-vw':       { bg: '#2a2a1a', fg: '#fbbf24' },
  'v-volvo':    { bg: '#2a1a2a', fg: '#f472b6' },
  'v-cadillac': { bg: '#1a1a2a', fg: '#a78bfa' },
  'v-mercedes': { bg: '#2a2a2a', fg: '#d4d4d8' },
  'v-subaru':   { bg: '#1a2a2a', fg: '#34d399' },
  'v-bmw':      { bg: '#1a1a3a', fg: '#60a5fa' },
  'v-genesis':  { bg: '#2a1a1a', fg: '#f97316' },
}

function getBrandColor(vehicle: string) {
  const cls = VEHICLE_CLASSES[vehicle] ?? ''
  return BRAND_COLORS[cls] ?? { bg: '#1a2a3a', fg: '#5ba4f5' }
}

function HomeImage() {
  const vehicleCount = getUniqueVehicles().length
  const trimCount = DATA.details.length
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      width: '100%', height: '100%', background: '#151921', padding: '60px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px',
      }}>
        <div style={{
          display: 'flex', fontSize: '48px', fontWeight: 700, color: '#5ba4f5',
          background: '#1a2a3a', borderRadius: '12px', padding: '8px 20px',
        }}>EV</div>
      </div>
      <div style={{
        display: 'flex', fontSize: '52px', fontWeight: 700, color: '#ffffff',
        textAlign: 'center', lineHeight: 1.2,
      }}>3-Row EV Comparison Tool</div>
      <div style={{
        display: 'flex', fontSize: '26px', color: '#9ca3af', marginTop: '16px',
      }}>{trimCount} trims across {vehicleCount} vehicles</div>
      <div style={{
        display: 'flex', width: '120px', height: '4px', background: '#5ba4f5',
        borderRadius: '2px', marginTop: '32px',
      }} />
      <div style={{
        display: 'flex', fontSize: '22px', color: '#5ba4f5', marginTop: '24px',
        padding: '10px 28px', border: '2px solid #5ba4f5', borderRadius: '8px',
      }}>Compare Side by Side →</div>
      <div style={{
        display: 'flex', fontSize: '18px', color: '#6b7280',
        position: 'absolute', bottom: '30px', right: '40px',
      }}>threerowev.com</div>
    </div>
  )
}

function VehicleImage({ vehicle }: { vehicle: string }) {
  const trims = getTrimsForVehicle(vehicle)
  const { fg } = getBrandColor(vehicle)

  const prices = trims.map(t => t.msrp).filter((p): p is number => typeof p === 'number')
  const ranges = trims.map(t => t.range_mi).filter((r): r is number => typeof r === 'number')
  const seatsList = [...new Set(trims.map(t => t.seats).filter((s): s is number => s !== null))]

  const priceRange = prices.length
    ? `$${Math.min(...prices).toLocaleString()}–$${Math.max(...prices).toLocaleString()}`
    : 'TBD'
  const maxRange = ranges.length ? `${Math.max(...ranges)} mi` : '—'
  const seatsText = seatsList.length ? seatsList.join('/') + ' seats' : '—'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      width: '100%', height: '100%', background: '#151921', padding: '60px',
    }}>
      <div style={{
        display: 'flex', fontSize: '18px', color: '#6b7280', marginBottom: '12px',
      }}>threerowev.com</div>
      <div style={{
        display: 'flex', fontSize: '52px', fontWeight: 700, color: '#ffffff',
        lineHeight: 1.2, marginBottom: '8px',
      }}>{vehicle}</div>
      <div style={{
        display: 'flex', width: '80px', height: '4px', background: fg,
        borderRadius: '2px', marginBottom: '40px',
      }} />
      <div style={{ display: 'flex', gap: '40px' }}>
        <Stat label="Price" value={priceRange} color={fg} />
        <Stat label="EPA Range" value={maxRange} color={fg} />
        <Stat label="Seating" value={seatsText} color={fg} />
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', fontSize: '16px', color: '#6b7280', marginBottom: '4px' }}>{label}</div>
      <div style={{ display: 'flex', fontSize: '28px', fontWeight: 600, color }}>{value}</div>
    </div>
  )
}

function CompareImage({ nameA, nameB }: { nameA: string; nameB: string }) {
  const { fg: fgA } = getBrandColor(nameA)
  const { fg: fgB } = getBrandColor(nameB)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      width: '100%', height: '100%', background: '#151921', padding: '60px',
    }}>
      <div style={{
        display: 'flex', fontSize: '18px', color: '#6b7280', marginBottom: '32px',
      }}>threerowev.com</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '32px',
      }}>
        <div style={{
          display: 'flex', fontSize: '40px', fontWeight: 700, color: fgA,
          textAlign: 'right', maxWidth: '400px',
        }}>{nameA}</div>
        <div style={{
          display: 'flex', fontSize: '36px', fontWeight: 300, color: '#4b5563',
        }}>vs</div>
        <div style={{
          display: 'flex', fontSize: '40px', fontWeight: 700, color: fgB,
          textAlign: 'left', maxWidth: '400px',
        }}>{nameB}</div>
      </div>
      <div style={{
        display: 'flex', width: '200px', height: '4px',
        background: 'linear-gradient(90deg, ' + fgA + ', ' + fgB + ')',
        borderRadius: '2px', marginTop: '32px',
      }} />
      <div style={{
        display: 'flex', fontSize: '24px', color: '#9ca3af', marginTop: '20px',
      }}>Side-by-Side Comparison</div>
    </div>
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const type = searchParams.get('type') ?? 'home'

  let element: JSX.Element

  if (type === 'vehicle') {
    const name = searchParams.get('name') ?? ''
    // Try matching by slug first, then by exact name
    const vehicle = getVehicleBySlug(toSlug(name)) ?? getVehicleBySlug(name)
    if (!vehicle) {
      element = <HomeImage />
    } else {
      element = <VehicleImage vehicle={vehicle} />
    }
  } else if (type === 'compare') {
    const a = searchParams.get('a') ?? ''
    const b = searchParams.get('b') ?? ''
    const nameA = getVehicleBySlug(toSlug(a)) ?? a
    const nameB = getVehicleBySlug(toSlug(b)) ?? b
    element = <CompareImage nameA={nameA} nameB={nameB} />
  } else {
    element = <HomeImage />
  }

  return new ImageResponse(element, {
    width: 1200,
    height: 630,
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
    },
  })
}

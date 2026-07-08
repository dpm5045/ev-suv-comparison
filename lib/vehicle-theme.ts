/**
 * Single source of truth for per-vehicle visual identity in TypeScript.
 * The CSS badge classes in app/globals.css (".v-*" and their light-theme
 * overrides) mirror these values — if you change a color here, change it
 * there too, and vice versa.
 */

export interface ClassTheme {
  darkBg: string
  darkFg: string
  lightBg: string
  lightFg: string
}

/** Keyed by CSS badge class. Values mirror app/globals.css .v-* rules. */
export const CLASS_THEMES: Record<string, ClassTheme> = {
  'v-kia':      { darkBg: '#1a3a2a', darkFg: '#4ade80', lightBg: '#dcfce7', lightFg: '#16a34a' },
  'v-hyundai':  { darkBg: '#1a2a3a', darkFg: '#5ba4f5', lightBg: '#dbeafe', lightFg: '#2563eb' },
  'v-lucid':    { darkBg: '#2a1a3a', darkFg: '#a78bfa', lightBg: '#ede9fe', lightFg: '#7c3aed' },
  'v-rivian':   { darkBg: '#3a2a1a', darkFg: '#fb923c', lightBg: '#ffedd5', lightFg: '#ea580c' },
  'v-tesla':    { darkBg: '#3a1a1a', darkFg: '#f87171', lightBg: '#fee2e2', lightFg: '#dc2626' },
  'v-tesla-yl': { darkBg: '#3a1a28', darkFg: '#fb7185', lightBg: '#fce7f0', lightFg: '#be123c' },
  'v-toyota':   { darkBg: '#1a3a3a', darkFg: '#2dd4bf', lightBg: '#ccfbf1', lightFg: '#0d9488' },
  'v-vinfast':  { darkBg: '#2a1a1a', darkFg: '#f59e0b', lightBg: '#fef3c7', lightFg: '#b45309' },
  'v-vw':       { darkBg: '#2a2a1a', darkFg: '#fbbf24', lightBg: '#fef9c3', lightFg: '#a16207' },
  'v-volvo':    { darkBg: '#2a1a2a', darkFg: '#f472b6', lightBg: '#fce7f3', lightFg: '#db2777' },
  'v-cadillac': { darkBg: '#1a1a2a', darkFg: '#a78bfa', lightBg: '#ede9fe', lightFg: '#7c3aed' },
  'v-mercedes': { darkBg: '#2a2a2a', darkFg: '#d4d4d8', lightBg: '#f4f4f5', lightFg: '#52525b' },
  'v-subaru':   { darkBg: '#1a2a2a', darkFg: '#34d399', lightBg: '#d1fae5', lightFg: '#059669' },
  'v-bmw':      { darkBg: '#1a1a3a', darkFg: '#60a5fa', lightBg: '#dbeafe', lightFg: '#2563eb' },
  'v-genesis':  { darkBg: '#2a1a1a', darkFg: '#f97316', lightBg: '#ffedd5', lightFg: '#ea580c' },
  'v-faraday':  { darkBg: '#1a2a3a', darkFg: '#38bdf8', lightBg: '#e0f2fe', lightFg: '#0284c7' },
  'v-lexus':    { darkBg: '#1a1a1a', darkFg: '#fbbf24', lightBg: '#fefce8', lightFg: '#854d0e' },
}

/** Vehicle name → CSS badge class. */
export const VEHICLE_CLASSES: Record<string, string> = {
  'Kia EV9': 'v-kia',
  'Hyundai IONIQ 9': 'v-hyundai',
  'Lucid Gravity': 'v-lucid',
  'Rivian R1S': 'v-rivian',
  'Tesla Model X': 'v-tesla',
  'Tesla Model Y (3-Row)': 'v-tesla',
  'Tesla Model Y L': 'v-tesla-yl',
  'VinFast VF9': 'v-vinfast',
  'Toyota Highlander EV': 'v-toyota',
  'Volkswagen ID. Buzz': 'v-vw',
  'Volvo EX90': 'v-volvo',
  'Cadillac Escalade IQ': 'v-cadillac',
  'Cadillac VISTIQ': 'v-cadillac',
  'Mercedes-Benz EQS SUV': 'v-mercedes',
  'Subaru Getaway': 'v-subaru',
  'BMW iX7': 'v-bmw',
  'Genesis GV90': 'v-genesis',
  'Faraday Future FX Super One': 'v-faraday',
  'Lexus TZ': 'v-lexus',
}

export function vehicleTheme(vehicle: string): ClassTheme | null {
  return CLASS_THEMES[VEHICLE_CLASSES[vehicle] ?? ''] ?? null
}

/** Chart color for a vehicle — the badge foreground color for the theme. */
export function chartColor(vehicle: string, light = false): string {
  const t = vehicleTheme(vehicle)
  if (!t) return '#888888'
  return light ? t.lightFg : t.darkFg
}

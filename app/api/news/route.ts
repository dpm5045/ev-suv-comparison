import { NextResponse } from 'next/server'

// AI news feature is disabled until the UI is ready.
// Re-enable by restoring the Anthropic API call (see git history).
export async function POST() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

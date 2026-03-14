import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it to ev-app/.env.local' },
      { status: 500 },
    )
  }

  const { query } = await req.json()
  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [
        {
          role: 'user',
          content: `Search the web and provide a concise summary. Do NOT include a "Sources" section at the end — URLs will be hyperlinked automatically. Query: ${query}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json(
      { error: `Anthropic API error ${response.status}: ${err}` },
      { status: response.status },
    )
  }

  const data = await response.json()
  return NextResponse.json(data)
}

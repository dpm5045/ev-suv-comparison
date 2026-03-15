/**
 * Thin Claude API client for the data refresh pipeline.
 * Mirrors the pattern from app/api/news/route.ts.
 */

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 30_000
const CALL_DELAY_MS = 5_000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Call Claude with web search and extract JSON from the response.
 * @param {object} opts
 * @param {string} opts.systemPrompt
 * @param {string} opts.userMessage
 * @param {number} [opts.maxTokens=4000]
 * @returns {Promise<{json: any, inputTokens: number, outputTokens: number}>}
 */
export async function callClaude({ systemPrompt, userMessage, maxTokens = 4000 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set')

  let lastError = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`  Retry ${attempt}/${MAX_RETRIES} after ${RETRY_DELAY_MS / 1000}s...`)
      await sleep(RETRY_DELAY_MS)
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: maxTokens,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`API ${response.status}: ${errText}`)
      }

      const result = await response.json()

      // Extract usage
      const inputTokens = result.usage?.input_tokens ?? 0
      const outputTokens = result.usage?.output_tokens ?? 0

      // Extract the last text block (Claude interleaves tool_use/tool_result with text)
      const textBlocks = (result.content || []).filter((b) => b.type === 'text')
      if (textBlocks.length === 0) {
        throw new Error('No text blocks in Claude response')
      }

      const lastText = textBlocks[textBlocks.length - 1].text

      // Parse JSON from fenced code block or raw JSON
      const json = extractJson(lastText)

      return { json, inputTokens, outputTokens }
    } catch (err) {
      lastError = err
      console.error(`  API call failed: ${err.message}`)
    }
  }

  throw lastError
}

/**
 * Extract JSON from a string that may contain a fenced code block.
 */
function extractJson(text) {
  // Try fenced code block first
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenced) {
    return JSON.parse(fenced[1].trim())
  }
  // Try raw JSON (array or object)
  const raw = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)
  if (raw) {
    return JSON.parse(raw[1].trim())
  }
  throw new Error(`Could not extract JSON from response: ${text.slice(0, 200)}...`)
}

/**
 * Delay between API calls to avoid rate limits.
 */
export async function delayCalls() {
  await sleep(CALL_DELAY_MS)
}

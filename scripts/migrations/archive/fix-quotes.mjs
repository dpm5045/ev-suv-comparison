import { readFileSync, writeFileSync } from 'fs'

const PATH = './lib/ev-data.json'
let s = readFileSync(PATH, 'utf-8')

// Step 1: Replace smart single quotes with ASCII apostrophe (safe, no escaping issues)
s = s.replace(/[\u2018\u2019]/g, "'")

// Step 2: Replace smart double quotes that are INSIDE string values (not structural JSON quotes)
// Strategy: find all smart double quotes and replace with escaped ASCII \"
// But structural JSON quotes are always ASCII " already, so smart quotes are always inside strings
s = s.replace(/\u201C/g, '\\"')
s = s.replace(/\u201D/g, '\\"')

// Step 3: But wait - my new glossary entries from Edit tool used smart quotes AS structural quotes
// Those need to be plain " not \"
// The issue is lines 6975+ where the Edit tool wrote smart quotes for JSON structure
// Let me re-examine: after step 2, structural smart quotes became \" which breaks JSON

// Better approach: read the file, identify the glossary section, and rebuild it properly
// Actually the simplest fix: just replace the corrupted glossary with clean JSON

try {
  JSON.parse(s)
  console.log('JSON is valid after quote replacement')
  writeFileSync(PATH, s)
} catch (e) {
  console.log('Still invalid after simple replacement:', e.message)
  console.log('Trying structural fix...')

  // The problem: Edit tool wrote smart quotes for JSON structural quotes in the new glossary entries
  // Solution: find lines where smart quotes were used structurally and fix them
  // After step 2, these became \" when they should be "

  // Undo the escaping for structural positions: lines that look like  \"field\": \"...\"
  // These should be "field": "..."
  const lines = s.split('\n')
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    // Fix structural quotes that got over-escaped
    // Pattern: starts with whitespace, then \"field\" or \"meaning\" or \"notes\"
    if (/^\s+\\"(field|meaning|notes)\\"/.test(line)) {
      // This line has structural quotes that were smart quotes and got escaped
      // We need to unescape the structural ones but keep inner ones escaped
      // Simplest: rebuild the line
      const trimmed = line.trim()
      // Extract key and value from the over-escaped line
      const keyMatch = trimmed.match(/^\\"(\w+)\\":\s*\\"(.*)\\"(,?)$/)
      if (keyMatch) {
        const [, key, value, comma] = keyMatch
        const indent = line.match(/^\s*/)[0]
        lines[i] = `${indent}"${key}": "${value}"${comma}`
      }
    }
  }

  s = lines.join('\n')

  try {
    JSON.parse(s)
    console.log('JSON is valid after structural fix')
    writeFileSync(PATH, s)
  } catch (e2) {
    console.log('Still invalid:', e2.message)
    // Write to temp for inspection
    writeFileSync(PATH + '.tmp', s)
    console.log('Wrote to', PATH + '.tmp')
  }
}

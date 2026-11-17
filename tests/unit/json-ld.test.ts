import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import JsonLd, { serializeJsonLd } from '@/components/JsonLd'

describe('JSON-LD output', () => {
  const hostile = { name: '</script><script>alert(1)</script>', note: 'a < b' }

  it('escapes every "<" so a value cannot close the script element', () => {
    const s = serializeJsonLd(hostile)
    expect(s).not.toContain('<')
    expect(JSON.parse(s)).toEqual(hostile)
  })

  it('renders exactly one script element that parses back to the input', () => {
    const html = renderToStaticMarkup(createElement(JsonLd, { data: hostile }))
    expect(html.match(/<script/g)).toHaveLength(1)
    expect(html.match(/<\/script>/g)).toHaveLength(1)
    const body = html.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')
    expect(JSON.parse(body)).toEqual(hostile)
  })
})

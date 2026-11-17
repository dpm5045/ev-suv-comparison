/**
 * JSON for a <script type="application/ld+json"> element. "<" is escaped so
 * that no value (for example "</script>") can end the element early; the
 * JSON still parses to the same object.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}

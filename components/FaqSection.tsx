import type { Faq } from '@/lib/compare-text'

/**
 * The FAQ shown on the page. It renders the same entries as the FAQPage
 * structured data, so what search engines read is what visitors see.
 */
export default function FaqSection({ entries, title = 'Common questions' }: { entries: Faq[]; title?: string }) {
  if (!entries.length) return null
  return (
    <section className="faq-section" aria-labelledby="faq-title">
      <h2 id="faq-title" className="section-title">{title}</h2>
      <dl className="faq-list">
        {entries.map((f) => (
          <div key={f.q} className="faq-item">
            <dt className="faq-q">{f.q}</dt>
            <dd className="faq-a">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

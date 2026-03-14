import { DATA } from '@/lib/data'

export default function GlossaryTab() {
  return (
    <>
      <h2 className="section-title">Glossary</h2>
      <p className="section-desc">Definitions for all fields used in the comparison tables.</p>
      <div className="card">
        {DATA.glossary.map((g) => (
          <div key={g.field} className="glossary-item">
            <div className="glossary-field">{g.field}</div>
            <div className="glossary-meaning">{g.meaning}</div>
            {g.notes && <div className="glossary-notes">{g.notes}</div>}
          </div>
        ))}
      </div>
    </>
  )
}

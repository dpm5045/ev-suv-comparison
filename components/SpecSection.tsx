export default function SpecSection({ title, rows }: { title: string; rows: [string, string | number | null | undefined][] }) {
  return (
    <div className="detail-section">
      <div className="detail-section-title">{title}</div>
      {rows.map(([label, val]) => (
        <div key={label} className="detail-row">
          <span className="detail-row-label">{label}</span>
          <span className="detail-row-value">{val || '—'}</span>
        </div>
      ))}
    </div>
  )
}

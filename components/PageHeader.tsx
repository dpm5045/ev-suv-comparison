import { DATA } from '@/lib/data'

/** "153 trims · 19 vehicles" — always derived from the dataset. */
export const dataCountEyebrow = (): string =>
  `${DATA.details.length} trims · ${new Set(DATA.details.map((r) => r.vehicle)).size} vehicles`

interface Props {
  eyebrow?: string
  title: string
  children?: React.ReactNode // description
  actions?: React.ReactNode // optional controls shown on the right
}

export default function PageHeader({ eyebrow, title, children, actions }: Props) {
  return (
    <div className="page-header">
      <div className="page-header-text">
        {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {children && <p className="page-desc">{children}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  )
}

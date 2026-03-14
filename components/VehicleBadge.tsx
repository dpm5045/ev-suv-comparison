import { VEHICLE_CLASSES } from '@/lib/data'

interface Props {
  vehicle: string
  style?: React.CSSProperties
}

export default function VehicleBadge({ vehicle, style }: Props) {
  const cls = VEHICLE_CLASSES[vehicle] ?? ''
  return (
    <span className={`vehicle-badge ${cls}`} style={style}>
      {vehicle}
    </span>
  )
}

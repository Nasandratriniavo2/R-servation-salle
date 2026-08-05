import { statusLabel } from '../lib/db.js'

const CLASSES = {
  confirmee: 'badge-confirmed',
  en_attente: 'badge-pending',
  refusee: 'badge-rejected',
  annulee: 'badge-cancelled',
}

export default function StatusBadge({ status }) {
  return <span className={CLASSES[status] || 'badge-cancelled'}>{statusLabel(status)}</span>
}

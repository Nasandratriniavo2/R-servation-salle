export function formatDateFR(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatDateShort(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function todayISO(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

export const EQUIPMENT_LABELS = {
  videoprojecteur: 'Vidéoprojecteur',
  visio: 'Visioconférence',
  tableau: 'Tableau',
  sono: 'Sonorisation',
  ordinateurs: 'Postes informatiques',
}

export function classNames(...args) {
  return args.filter(Boolean).join(' ')
}

export function timeOptions() {
  const opts = []
  for (let h = 7; h <= 21; h++) {
    for (const m of [0, 30]) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return opts
}

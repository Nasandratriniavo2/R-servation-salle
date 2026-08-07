/**
 * Couche metier cote frontend — appelle l'API Express / MySQL.
 * L'interface exportee reste la meme que la version Supabase
 * pour ne pas casser les pages.
 */
import { api } from './api.js'
import { notifyDataChange } from './store.js'
import { sendMail } from './mailer.js'

// ---------------------------------------------------------------------------
// Mapping roles
// ---------------------------------------------------------------------------
export const ROLE_CODE_TO_UI = {
  enseignant: 'enseignant',
  etudiant_association: 'etudiant',
  admin_logistique: 'admin',
}

export const ROLE_UI_TO_CODE = {
  enseignant: 'enseignant',
  etudiant: 'etudiant_association',
  admin: 'admin_logistique',
}

// ---------------------------------------------------------------------------
// Utilitaires temps
// ---------------------------------------------------------------------------
function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}

export function overlaps(startA, endA, startB, endB) {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(startB) < toMinutes(endA)
}

// ---------------------------------------------------------------------------
// Utilisateurs
// ---------------------------------------------------------------------------
export async function getUsers() {
  return api.get('/api/users')
}

// ---------------------------------------------------------------------------
// Salles
// ---------------------------------------------------------------------------
export async function getRooms({ includeInactive = false } = {}) {
  const q = includeInactive ? '?includeInactive=1' : ''
  return api.get(`/api/rooms${q}`)
}

export async function getRoom(roomId) {
  return api.get(`/api/rooms/${roomId}`)
}

export async function createRoom(form) {
  const room = await api.post('/api/rooms', form)
  notifyDataChange()
  return room
}

export async function updateRoom(roomId, form) {
  await api.put(`/api/rooms/${roomId}`, form)
  notifyDataChange()
}

export async function deleteRoom(roomId) {
  await api.delete(`/api/rooms/${roomId}`)
  notifyDataChange()
}

// ---------------------------------------------------------------------------
// Recherche + anti-conflit
// ---------------------------------------------------------------------------
export async function searchRooms({
  capaciteMin,
  equipements = [],
  date,
  heureDebut,
  heureFin,
} = {}) {
  const rooms = await getRooms()
  let results = rooms

  if (capaciteMin) {
    results = results.filter((r) => r.capacite >= Number(capaciteMin))
  }
  if (equipements.length) {
    results = results.filter((r) => equipements.every((eq) => r.equipements.includes(eq)))
  }
  if (date && heureDebut && heureFin) {
    const available = []
    for (const r of results) {
      const ok = await isRoomAvailable(r.id, date, heureDebut, heureFin)
      if (ok) available.push(r)
    }
    return available
  }
  return results
}

export async function isRoomAvailable(roomId, date, heureDebut, heureFin, ignoreReservationId = null) {
  const conflits = await getConflicts(roomId, date, heureDebut, heureFin, ignoreReservationId)
  return conflits.length === 0
}

export async function getConflicts(roomId, date, heureDebut, heureFin, ignoreReservationId = null) {
  const params = new URLSearchParams({
    roomId,
    date,
    heureDebut,
    heureFin,
  })
  if (ignoreReservationId) params.set('ignoreReservationId', ignoreReservationId)
  return api.get(`/api/conflicts?${params.toString()}`)
}

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------
export async function getReservations() {
  return api.get('/api/reservations')
}

export async function getReservationsForUser(userId) {
  return api.get(`/api/reservations?userId=${encodeURIComponent(userId)}`)
}

export async function getPendingReservations() {
  return api.get('/api/reservations?statut=en_attente')
}

/**
 * Creation de reservation (US-01 / US-02 / US-05).
 * - Enseignant  -> statut confirmee
 * - Etudiant    -> statut en_attente
 * Double filet : controle applicatif + trigger MySQL.
 */
export async function createReservation({ roomId, user, titre, date, heureDebut, heureFin }) {
  try {
    // L'API utilise le JWT pour identifier l'utilisateur (user reste utile pour l'affichage local)
    const result = await api.post('/api/reservations', {
      roomId,
      titre,
      date,
      heureDebut,
      heureFin,
    })

    // Simulation email cote client (le log est deja en base via l'API)
    if (result.ok && result.reservation) {
      const r = result.reservation
      const roomName = r.salleNom || 'salle'
      if (user.role === 'enseignant') {
        sendMail({
          to: user.email,
          subject: `Reservation confirmee — ${roomName}`,
          body: `Bonjour ${user.name},\n\nVotre reservation de la salle ${roomName} le ${date} de ${heureDebut} a ${heureFin} est confirmee.\n\nService Logistique`,
        })
      } else {
        sendMail({
          to: user.email,
          subject: `Demande de reservation recue — ${roomName}`,
          body: `Bonjour ${user.name},\n\nVotre demande a bien ete transmise au service Logistique.\n\nService Logistique`,
        })
      }
    }

    notifyDataChange()
    return result
  } catch (err) {
    if (err.body && err.body.ok === false) {
      return err.body
    }
    return { ok: false, error: err.message || 'Erreur lors de la creation de la reservation.' }
  }
}

export async function validateReservation(reservationId, adminUser) {
  try {
    const result = await api.post(`/api/reservations/${reservationId}/validate`, {})
    notifyDataChange()
    return result
  } catch (err) {
    if (err.body && err.body.ok === false) return err.body
    return { ok: false, error: err.message }
  }
}

export async function rejectReservation(reservationId, adminUser, motif = '') {
  try {
    const result = await api.post(`/api/reservations/${reservationId}/reject`, {
      motif,
    })
    notifyDataChange()
    return result
  } catch (err) {
    if (err.body && err.body.ok === false) return err.body
    return { ok: false, error: err.message }
  }
}

export async function cancelReservation(reservationId, byUser) {
  try {
    const result = await api.post(`/api/reservations/${reservationId}/cancel`, {})
    notifyDataChange()
    return result
  } catch (err) {
    if (err.body && err.body.ok === false) return err.body
    return { ok: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// Statistiques (US-07)
// ---------------------------------------------------------------------------
export async function computeStats() {
  const [rooms, reservations] = await Promise.all([
    getRooms({ includeInactive: true }),
    getReservations(),
  ])
  const actives = reservations.filter((r) => r.statut === 'confirmee')

  const parSalle = rooms
    .map((room) => {
      const resasSalle = actives.filter((r) => r.roomId === room.id)
      const heuresOccupees = resasSalle.reduce(
        (sum, r) => sum + (toMinutes(r.heureFin) - toMinutes(r.heureDebut)) / 60,
        0,
      )
      return {
        salle: room.name,
        reservations: resasSalle.length,
        heures: Math.round(heuresOccupees * 10) / 10,
      }
    })
    .sort((a, b) => b.heures - a.heures)

  const heuresPointe = Array.from({ length: 24 }, (_, h) => ({
    heure: `${String(h).padStart(2, '0')}h`,
    count: 0,
  }))
  actives.forEach((r) => {
    const startH = Math.floor(toMinutes(r.heureDebut) / 60)
    const endH = Math.ceil(toMinutes(r.heureFin) / 60)
    for (let h = startH; h < endH && h < 24; h++) {
      heuresPointe[h].count += 1
    }
  })

  const parRole = [
    {
      role: 'Enseignants',
      count: reservations.filter((r) => r.userRole === 'enseignant' && r.statut !== 'annulee').length,
    },
    {
      role: 'Etudiants / Associations',
      count: reservations.filter((r) => r.userRole === 'etudiant' && r.statut !== 'annulee').length,
    },
  ]

  const parStatut = ['confirmee', 'en_attente', 'refusee', 'annulee'].map((statut) => ({
    statut,
    count: reservations.filter((r) => r.statut === statut).length,
  }))

  const capaciteTotale = rooms.reduce((s, r) => s + r.capacite, 0)
  const nonAnnulees = reservations.filter((r) => r.statut !== 'annulee')

  return {
    parSalle,
    heuresPointe,
    parRole,
    parStatut,
    capaciteTotale,
    totalReservations: reservations.length,
    totalSalles: rooms.filter((r) => r.actif).length,
    tauxValidation: nonAnnulees.length
      ? Math.round((actives.length / nonAnnulees.length) * 100)
      : 0,
  }
}

// ---------------------------------------------------------------------------
// Export CSV (US-08)
// ---------------------------------------------------------------------------
export function statusLabel(statut) {
  return (
    {
      confirmee: 'Confirmee',
      en_attente: 'En attente',
      refusee: 'Refusee',
      annulee: 'Annulee',
    }[statut] || statut
  )
}

export async function exportReservationsCSV(reservations) {
  const header = [
    'ID',
    'Salle',
    'Demandeur',
    'Role',
    'Date',
    'Debut',
    'Fin',
    'Statut',
    'Motif de refus',
    'Creee le',
  ]
  const rows = reservations.map((r) => [
    r.id,
    r.salleNom || 'Salle supprimee',
    r.userName,
    r.userRole === 'enseignant'
      ? 'Enseignant'
      : r.userRole === 'etudiant'
        ? 'Etudiant / Association'
        : 'Admin',
    r.date,
    r.heureDebut,
    r.heureFin,
    statusLabel(r.statut),
    r.motifRefus || '',
    r.createdAt ? new Date(r.createdAt).toLocaleString('fr-FR') : '',
  ])

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reservations_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Journal des emails (tableau de bord admin) */
export async function getEmailLogs() {
  return api.get('/api/logs-emails')
}

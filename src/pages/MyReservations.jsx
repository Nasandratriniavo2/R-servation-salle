import { useEffect, useState } from 'react'
import { getReservationsForUser, cancelReservation } from '../lib/db.js'
import { useDBVersion } from '../lib/useStore.js'
import { useAuth } from '../lib/auth.jsx'
import { useToast } from '../lib/toast.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Modal from '../components/Modal.jsx'
import { formatDateFR } from '../lib/utils.js'

export default function MyReservations() {
  const version = useDBVersion()
  const { currentUser } = useAuth()
  const { push } = useToast()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toCancel, setToCancel] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const list = await getReservationsForUser(currentUser.id)
        if (!cancelled) setReservations(list)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Erreur de chargement')
          setReservations([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [currentUser?.id, version])

  const confirmCancel = async () => {
    if (!toCancel || !currentUser) return
    setCancelling(true)
    try {
      const result = await cancelReservation(toCancel.id, currentUser)
      if (!result.ok) {
        push(result.error, 'error')
        return
      }
      push(
        `Reservation annulee pour ${toCancel.salleNom || 'la salle'}. Le creneau est de nouveau libre.`,
        'success',
      )
      push(`Email de confirmation d'annulation envoye a ${currentUser.email}.`, 'mail')
      setToCancel(null)
    } catch (err) {
      push(err.message || 'Erreur lors de l\'annulation', 'error')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ink-900">Mes reservations</h1>
        <p className="text-sm text-ink-500 mt-1">
          Historique de vos demandes et reservations, les plus recentes en premier.
        </p>
      </div>

      {error && (
        <div className="card p-4 text-sm text-rose-text bg-rose-soft">{error}</div>
      )}

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-500">Chargement...</div>
      ) : reservations.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Aucune reservation pour le moment"
            description="Rendez-vous sur la page Rechercher pour reserver votre premiere salle."
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1.4fr_1fr_0.8fr_0.9fr_0.9fr] gap-3 px-4 py-2.5 bg-ink-100/60 text-xs font-semibold text-ink-500 uppercase tracking-wide">
            <span>Salle / Intitule</span>
            <span>Date</span>
            <span>Creneau</span>
            <span>Statut</span>
            <span className="text-right">Action</span>
          </div>
          <ul className="divide-y divide-ink-100">
            {reservations.map((r) => {
              const cancellable = r.statut === 'confirmee' || r.statut === 'en_attente'
              return (
                <li
                  key={r.id}
                  className="px-4 py-3 grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_0.8fr_0.9fr_0.9fr] gap-1.5 sm:gap-3 sm:items-center"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{r.salleNom || 'Salle supprimee'}</p>
                    <p className="text-xs text-ink-500">{r.titre}</p>
                  </div>
                  <p className="text-sm text-ink-700 capitalize">{formatDateFR(r.date)}</p>
                  <p className="text-sm text-ink-700">
                    {r.heureDebut}–{r.heureFin}
                  </p>
                  <div>
                    <StatusBadge status={r.statut} />
                    {r.statut === 'refusee' && r.motifRefus && (
                      <p className="text-xs text-ink-500 mt-1">Motif : {r.motifRefus}</p>
                    )}
                  </div>
                  <div className="sm:text-right">
                    {cancellable ? (
                      <button className="btn-danger" onClick={() => setToCancel(r)}>
                        Annuler
                      </button>
                    ) : (
                      <span className="text-xs text-ink-500">—</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <Modal open={!!toCancel} onClose={() => setToCancel(null)} title="Annuler la reservation">
        {toCancel && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-700">
              Confirmez-vous l'annulation de la reservation de{' '}
              <span className="font-semibold">{toCancel.salleNom}</span> le{' '}
              <span className="font-semibold">{formatDateFR(toCancel.date)}</span> de{' '}
              <span className="font-semibold">
                {toCancel.heureDebut} a {toCancel.heureFin}
              </span>{' '}
              ? Le creneau sera immediatement libere.
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setToCancel(null)} disabled={cancelling}>
                Retour
              </button>
              <button className="btn-danger" onClick={confirmCancel} disabled={cancelling}>
                {cancelling ? 'Annulation...' : "Confirmer l'annulation"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

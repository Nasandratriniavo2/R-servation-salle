import { useEffect, useState } from 'react'
import { getPendingReservations, validateReservation, rejectReservation } from '../lib/db.js'
import { useDBVersion } from '../lib/useStore.js'
import { useAuth } from '../lib/auth.jsx'
import { useToast } from '../lib/toast.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Modal from '../components/Modal.jsx'
import { formatDateFR } from '../lib/utils.js'

export default function AdminQueue() {
  const version = useDBVersion()
  const { currentUser } = useAuth()
  const { push } = useToast()
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [motif, setMotif] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const list = await getPendingReservations()
        if (!cancelled) setPending(list)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Erreur de chargement')
          setPending([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [version])

  const handleValidate = async (res) => {
    if (!currentUser) return
    setBusy(true)
    try {
      const result = await validateReservation(res.id, currentUser)
      if (!result.ok) {
        push(result.error, 'error')
        return
      }
      push(`Reservation validee pour ${res.salleNom}.`, 'success')
      push('Email de confirmation envoye au demandeur.', 'mail')
    } catch (err) {
      push(err.message || 'Erreur', 'error')
    } finally {
      setBusy(false)
    }
  }

  const openReject = (res) => {
    setRejectTarget(res)
    setMotif('')
  }

  const confirmReject = async () => {
    if (!rejectTarget || !currentUser) return
    setBusy(true)
    try {
      const result = await rejectReservation(rejectTarget.id, currentUser, motif.trim())
      if (!result.ok) {
        push(result.error, 'error')
        return
      }
      push(`Demande refusee pour ${rejectTarget.salleNom}.`, 'success')
      push('Email de refus envoye au demandeur.', 'mail')
      setRejectTarget(null)
    } catch (err) {
      push(err.message || 'Erreur', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ink-900">File d'attente des demandes</h1>
        <p className="text-sm text-ink-500 mt-1">
          Validez ou refusez les demandes de reservation des etudiants et associations.
        </p>
      </div>

      {error && (
        <div className="card p-4 text-sm text-rose-text bg-rose-soft">{error}</div>
      )}

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-500">Chargement...</div>
      ) : pending.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Aucune demande en attente"
            description="Toutes les demandes ont ete traitees. Les nouvelles apparaitront ici."
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1.3fr_1fr_0.9fr_1fr_1.2fr] gap-3 px-4 py-2.5 bg-ink-100/60 text-xs font-semibold text-ink-500 uppercase tracking-wide">
            <span>Salle / Intitule</span>
            <span>Demandeur</span>
            <span>Date</span>
            <span>Creneau</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y divide-ink-100">
            {pending.map((r) => (
              <li
                key={r.id}
                className="px-4 py-3 grid grid-cols-1 sm:grid-cols-[1.3fr_1fr_0.9fr_1fr_1.2fr] gap-1.5 sm:gap-3 sm:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-ink-900">{r.salleNom}</p>
                  <p className="text-xs text-ink-500">{r.titre}</p>
                </div>
                <div>
                  <p className="text-sm text-ink-700">{r.userName}</p>
                  <p className="text-xs text-ink-500">
                    {r.userRole === 'enseignant' ? 'Enseignant' : 'Etudiant / Association'}
                  </p>
                </div>
                <p className="text-sm text-ink-700 capitalize">{formatDateFR(r.date)}</p>
                <p className="text-sm text-ink-700">
                  {r.heureDebut}–{r.heureFin}
                </p>
                <div className="flex gap-2 sm:justify-end">
                  <button
                    className="btn-primary text-xs"
                    disabled={busy}
                    onClick={() => handleValidate(r)}
                  >
                    Valider
                  </button>
                  <button
                    className="btn-danger text-xs"
                    disabled={busy}
                    onClick={() => openReject(r)}
                  >
                    Refuser
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Refuser la demande">
        {rejectTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-700">
              Refus de la demande de <span className="font-semibold">{rejectTarget.userName}</span> pour{' '}
              <span className="font-semibold">{rejectTarget.salleNom}</span> le{' '}
              <span className="font-semibold">{formatDateFR(rejectTarget.date)}</span> (
              {rejectTarget.heureDebut}–{rejectTarget.heureFin}).
            </p>
            <div>
              <label className="label" htmlFor="motif">
                Motif du refus (facultatif)
              </label>
              <textarea
                id="motif"
                className="input min-h-[80px]"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Ex : salle mobilisee pour un examen..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setRejectTarget(null)} disabled={busy}>
                Retour
              </button>
              <button className="btn-danger" onClick={confirmReject} disabled={busy}>
                {busy ? 'Traitement...' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

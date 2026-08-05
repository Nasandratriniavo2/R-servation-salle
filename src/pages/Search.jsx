import { useEffect, useState } from 'react'
import { searchRooms, createReservation, getConflicts } from '../lib/db.js'
import { useDBVersion } from '../lib/useStore.js'
import { useAuth } from '../lib/auth.jsx'
import { useToast } from '../lib/toast.jsx'
import Modal from '../components/Modal.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { EQUIPMENT_LABELS, todayISO, timeOptions, classNames } from '../lib/utils.js'

const EQUIPMENT_OPTIONS = Object.keys(EQUIPMENT_LABELS)

export default function Search() {
  const version = useDBVersion()
  const { currentUser, isAdmin } = useAuth()
  const { push } = useToast()

  const [capaciteMin, setCapaciteMin] = useState('')
  const [equipements, setEquipements] = useState([])
  const [date, setDate] = useState(todayISO())
  const [heureDebut, setHeureDebut] = useState('09:00')
  const [heureFin, setHeureFin] = useState('11:00')
  const [checkAvailability, setCheckAvailability] = useState(true)

  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bookingRoom, setBookingRoom] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const rooms = await searchRooms({
          capaciteMin: capaciteMin || undefined,
          equipements,
          date: checkAvailability ? date : undefined,
          heureDebut: checkAvailability ? heureDebut : undefined,
          heureFin: checkAvailability ? heureFin : undefined,
        })
        if (!cancelled) setResults(rooms)
      } catch (err) {
        if (!cancelled) {
          console.error(err)
          setError(err.message || 'Erreur lors de la recherche')
          setResults([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [capaciteMin, equipements, date, heureDebut, heureFin, checkAvailability, version])

  const toggleEquipement = (eq) => {
    setEquipements((cur) => (cur.includes(eq) ? cur.filter((e) => e !== eq) : [...cur, eq]))
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ink-900">Rechercher une salle</h1>
        <p className="text-sm text-ink-500 mt-1">
          Filtrez par capacite, equipements et creneau pour trouver une salle disponible.
        </p>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label" htmlFor="capacite">Capacite minimale</label>
            <input
              id="capacite"
              type="number"
              min="0"
              placeholder="Ex : 30"
              className="input"
              value={capaciteMin}
              onChange={(e) => setCapaciteMin(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="debut">Heure de debut</label>
            <select id="debut" className="input" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)}>
              {timeOptions().map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="fin">Heure de fin</label>
            <select id="fin" className="input" value={heureFin} onChange={(e) => setHeureFin(e.target.value)}>
              {timeOptions().map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="label mb-2">Equipements requis</label>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((eq) => (
              <button
                key={eq}
                type="button"
                onClick={() => toggleEquipement(eq)}
                className={classNames(
                  'px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
                  equipements.includes(eq)
                    ? 'bg-accent text-white border-accent'
                    : 'bg-white text-ink-700 border-ink-200 hover:bg-ink-100',
                )}
              >
                {EQUIPMENT_LABELS[eq]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            id="check-dispo"
            type="checkbox"
            checked={checkAvailability}
            onChange={(e) => setCheckAvailability(e.target.checked)}
            className="w-4 h-4 rounded border-ink-300 accent-ink-700"
          />
          <label htmlFor="check-dispo" className="text-sm text-ink-700">
            N'afficher que les salles disponibles sur ce creneau
          </label>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink-900">
            {loading
              ? 'Recherche en cours...'
              : `${results.length} salle${results.length > 1 ? 's' : ''} trouvee${results.length > 1 ? 's' : ''}`}
          </h2>
        </div>

        {error && (
          <div className="card p-4 mb-4 text-sm text-rose-text bg-rose-soft border border-rose-soft">
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 ? (
          <div className="card">
            <EmptyState
              title="Aucune salle ne correspond a votre recherche"
              description="Essayez d'assouplir les filtres : reduisez la capacite minimale, retirez un equipement ou changez de creneau."
              icon={
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((room) => (
              <div key={room.id} className="card p-4 flex flex-col gap-3">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-ink-900 leading-snug">{room.name}</h3>
                    <span className="badge bg-ink-100 text-ink-700 shrink-0">{room.capacite} pl.</span>
                  </div>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {room.batiment} · Etage {room.etage}
                  </p>
                </div>

                {room.notes && <p className="text-sm text-ink-500">{room.notes}</p>}

                <div className="flex flex-wrap gap-1.5">
                  {room.equipements.map((eq) => (
                    <span key={eq} className="badge bg-ink-100 text-ink-500 font-medium">
                      {EQUIPMENT_LABELS[eq] || eq}
                    </span>
                  ))}
                </div>

                <button
                  className="btn-primary mt-1 w-full"
                  onClick={() => setBookingRoom(room)}
                  disabled={isAdmin || !currentUser}
                  title={isAdmin ? 'Le profil Service Logistique ne reserve pas de salle' : undefined}
                >
                  Reserver ce creneau
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <BookingModal
        room={bookingRoom}
        onClose={() => setBookingRoom(null)}
        defaultDate={date}
        defaultDebut={heureDebut}
        defaultFin={heureFin}
        user={currentUser}
        push={push}
      />
    </div>
  )
}

function BookingModal({ room, onClose, defaultDate, defaultDebut, defaultFin, user, push }) {
  const [titre, setTitre] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [heureDebut, setHeureDebut] = useState(defaultDebut)
  const [heureFin, setHeureFin] = useState(defaultFin)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [conflitsLive, setConflitsLive] = useState([])

  useEffect(() => {
    if (!room) return
    setDate(defaultDate)
    setHeureDebut(defaultDebut)
    setHeureFin(defaultFin)
    setTitre('')
    setError('')
  }, [room, defaultDate, defaultDebut, defaultFin])

  useEffect(() => {
    if (!room || !date || !heureDebut || !heureFin) {
      setConflitsLive([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const c = await getConflicts(room.id, date, heureDebut, heureFin)
        if (!cancelled) setConflitsLive(c)
      } catch {
        if (!cancelled) setConflitsLive([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [room, date, heureDebut, heureFin])

  const resetAndClose = () => {
    setTitre('')
    setError('')
    onClose()
  }

  if (!room || !user) return null

  const isEnseignant = user.role === 'enseignant'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const result = await createReservation({
        roomId: room.id,
        user,
        titre: titre.trim() || `Reservation — ${room.name}`,
        date,
        heureDebut,
        heureFin,
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      push(
        isEnseignant
          ? `Reservation confirmee pour ${room.name} le ${date} de ${heureDebut} a ${heureFin}.`
          : `Demande envoyee pour ${room.name}. Elle sera examinee par le service Logistique.`,
        'success',
      )
      push(`Email envoye a ${user.email}.`, 'mail')
      resetAndClose()
    } catch (err) {
      setError(err.message || 'Erreur inattendue')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={!!room} onClose={resetAndClose} title={`Reserver — ${room.name}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="rounded-md bg-accent-soft border border-ink-200 px-3 py-2.5 text-xs text-ink-700">
          {isEnseignant
            ? "En tant qu'Enseignant, votre reservation sera confirmee instantanement."
            : 'Votre demande sera soumise a la validation du service Logistique avant confirmation.'}
        </div>

        <div>
          <label className="label" htmlFor="titre">
            Intitule (facultatif)
          </label>
          <input
            id="titre"
            className="input"
            placeholder="Ex : Cours de comptabilite, reunion association…"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="b-date">
              Date
            </label>
            <input
              id="b-date"
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="b-debut">
              Debut
            </label>
            <select
              id="b-debut"
              className="input"
              value={heureDebut}
              onChange={(e) => setHeureDebut(e.target.value)}
            >
              {timeOptions().map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="b-fin">
              Fin
            </label>
            <select
              id="b-fin"
              className="input"
              value={heureFin}
              onChange={(e) => setHeureFin(e.target.value)}
            >
              {timeOptions().map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {conflitsLive.length > 0 && !error && (
          <div className="rounded-md bg-rose-soft border border-rose-soft px-3 py-2.5 text-sm text-rose-text">
            Attention : ce creneau chevauche une reservation existante (
            {conflitsLive[0].heureDebut}–{conflitsLive[0].heureFin}). La soumission sera refusee.
          </div>
        )}

        {error && (
          <div className="rounded-md bg-rose-soft border border-rose-soft px-3 py-2.5 text-sm text-rose-text">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={resetAndClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting
              ? 'Envoi...'
              : isEnseignant
                ? 'Confirmer la reservation'
                : 'Envoyer la demande'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

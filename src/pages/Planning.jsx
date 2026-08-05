import { useEffect, useState } from 'react'
import { getRooms, getReservations } from '../lib/db.js'
import { useDBVersion } from '../lib/useStore.js'
import StatusBadge from '../components/StatusBadge.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { todayISO, formatDateFR, classNames } from '../lib/utils.js'

const START_HOUR = 7
const END_HOUR = 21
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}

export default function Planning() {
  const version = useDBVersion()
  const [rooms, setRooms] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [roomId, setRoomId] = useState('')
  const [date, setDate] = useState(todayISO())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [rList, resList] = await Promise.all([getRooms(), getReservations()])
        if (!cancelled) {
          setRooms(rList)
          setReservations(resList)
          setRoomId((prev) => prev || rList[0]?.id || '')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Erreur de chargement')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [version])

  const room = rooms.find((r) => r.id === roomId)

  const dayReservations = reservations.filter(
    (r) => r.roomId === roomId && r.date === date && (r.statut === 'confirmee' || r.statut === 'en_attente'),
  )

  const totalMinutes = (END_HOUR - START_HOUR) * 60

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ink-900">Planning des salles</h1>
        <p className="text-sm text-ink-500 mt-1">
          Visualisez les creneaux deja occupes avant de choisir votre horaire.
        </p>
      </div>

      {error && (
        <div className="card p-4 text-sm text-rose-text bg-rose-soft">{error}</div>
      )}

      <div className="card p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="p-salle">
              Salle
            </label>
            <select
              id="p-salle"
              className="input"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              disabled={loading}
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.batiment}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-date">
              Date
            </label>
            <input
              id="p-date"
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-500">Chargement...</div>
      ) : (
        room && (
          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-ink-900">{room.name}</h2>
                <p className="text-xs text-ink-500 capitalize">{formatDateFR(date)}</p>
              </div>
              <span className="badge bg-ink-100 text-ink-700">{room.capacite} places</span>
            </div>

            {dayReservations.length === 0 ? (
              <EmptyState
                title="Aucun creneau reserve ce jour-la"
                description="Toute la journee est disponible pour cette salle."
              />
            ) : null}

            <div className="relative border border-ink-200 rounded-md overflow-hidden">
              {HOURS.map((h, idx) => (
                <div
                  key={h}
                  className={classNames(
                    'flex items-stretch text-xs text-ink-500 h-10',
                    idx !== 0 && 'border-t border-ink-100',
                  )}
                >
                  <div className="w-14 shrink-0 flex items-start justify-end pr-2 pt-1 border-r border-ink-100 font-medium">
                    {String(h).padStart(2, '0')}:00
                  </div>
                  <div className="flex-1 relative" />
                </div>
              ))}

              <div className="absolute inset-0 left-14">
                {dayReservations.map((r) => {
                  const start = Math.max(toMinutes(r.heureDebut), START_HOUR * 60)
                  const end = Math.min(toMinutes(r.heureFin), END_HOUR * 60)
                  const top = ((start - START_HOUR * 60) / totalMinutes) * 100
                  const height = ((end - start) / totalMinutes) * 100
                  return (
                    <div
                      key={r.id}
                      style={{ top: `${top}%`, height: `${height}%` }}
                      className={classNames(
                        'absolute left-1.5 right-1.5 rounded-md px-2.5 py-1.5 overflow-hidden border',
                        r.statut === 'confirmee'
                          ? 'bg-emerald-soft border-emerald-text/20'
                          : 'bg-amber-soft border-amber-text/20',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={classNames(
                            'text-xs font-semibold truncate',
                            r.statut === 'confirmee' ? 'text-emerald-text' : 'text-amber-text',
                          )}
                        >
                          {r.titre}
                        </p>
                        <StatusBadge status={r.statut} />
                      </div>
                      <p
                        className={classNames(
                          'text-[11px] truncate',
                          r.statut === 'confirmee' ? 'text-emerald-text' : 'text-amber-text',
                        )}
                      >
                        {r.heureDebut}–{r.heureFin} · {r.userName}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}

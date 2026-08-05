import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { computeStats, getReservations, exportReservationsCSV, statusLabel, getEmailLogs } from '../lib/db.js'
import { getEmails } from '../lib/mailer.js'
import { useDBVersion } from '../lib/useStore.js'
import { useToast } from '../lib/toast.jsx'
import EmptyState from '../components/EmptyState.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { formatDateShort } from '../lib/utils.js'

const STATUS_COLORS = {
  confirmee: '#059669',
  en_attente: '#D97706',
  refusee: '#DC2626',
  annulee: '#94A3B8',
}

function Kpi({ label, value, sub }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-ink-900 mt-1.5">{value}</p>
      {sub && <p className="text-xs text-ink-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const version = useDBVersion()
  const { push } = useToast()
  const [stats, setStats] = useState(null)
  const [allReservations, setAllReservations] = useState([])
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statutFilter, setStatutFilter] = useState('all')
  const [tab, setTab] = useState('stats')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [s, res, logs] = await Promise.all([
          computeStats(),
          getReservations(),
          getEmailLogs().catch(() => []),
        ])
        if (!cancelled) {
          setStats(s)
          setAllReservations(res)
          // Prefer logs from MySQL; fallback to in-memory simulation
          const fromDb = (logs || []).map((l) => ({
            id: l.id,
            to: l.destinataire,
            subject: l.sujet,
            body: l.corps,
            sentAt: l.envoyeAt,
          }))
          setEmails(fromDb.length ? fromDb : getEmails())
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

  const filteredReservations = useMemo(() => {
    return allReservations
      .filter((r) => statutFilter === 'all' || r.statut === statutFilter)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }, [allReservations, statutFilter])

  const handleExport = async () => {
    await exportReservationsCSV(filteredReservations)
    push(
      `Export CSV genere (${filteredReservations.length} reservation${filteredReservations.length > 1 ? 's' : ''}).`,
      'success',
    )
  }

  if (loading || !stats) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl sm:text-2xl font-bold text-ink-900">Tableau de bord</h1>
        <div className="card p-8 text-center text-sm text-ink-500">Chargement des statistiques...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl sm:text-2xl font-bold text-ink-900">Tableau de bord</h1>
        <div className="card p-4 text-sm text-rose-text bg-rose-soft">{error}</div>
      </div>
    )
  }

  const heuresPointeData = stats.heuresPointe.filter((_, i) => i >= 7 && i <= 21)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink-900">Tableau de bord</h1>
          <p className="text-sm text-ink-500 mt-1">
            Occupation des salles, heures de pointe et export des donnees.
          </p>
        </div>
        <div className="flex gap-1 bg-ink-100 p-1 rounded-md w-fit">
          <button
            className={`px-3 py-1.5 text-sm font-medium rounded ${tab === 'stats' ? 'bg-white shadow-card text-ink-900' : 'text-ink-500'}`}
            onClick={() => setTab('stats')}
          >
            Statistiques
          </button>
          <button
            className={`px-3 py-1.5 text-sm font-medium rounded ${tab === 'donnees' ? 'bg-white shadow-card text-ink-900' : 'text-ink-500'}`}
            onClick={() => setTab('donnees')}
          >
            Donnees & export
          </button>
          <button
            className={`px-3 py-1.5 text-sm font-medium rounded ${tab === 'emails' ? 'bg-white shadow-card text-ink-900' : 'text-ink-500'}`}
            onClick={() => setTab('emails')}
          >
            Journal des emails
          </button>
        </div>
      </div>

      {tab === 'stats' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi label="Reservations totales" value={stats.totalReservations} />
            <Kpi
              label="Salles referencees"
              value={stats.totalSalles}
              sub={`${stats.capaciteTotale} places au total`}
            />
            <Kpi label="Taux de validation" value={`${stats.tauxValidation}%`} sub="Reservations confirmees" />
            <Kpi
              label="Demandes en attente"
              value={allReservations.filter((r) => r.statut === 'en_attente').length}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-ink-900 mb-1">Occupation par salle</h3>
              <p className="text-xs text-ink-500 mb-4">Heures cumulees de reservations confirmees</p>
              {stats.parSalle.every((s) => s.heures === 0) ? (
                <EmptyState
                  title="Pas encore de donnees"
                  description="Les statistiques apparaitront des que des reservations seront confirmees."
                />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.parSalle.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                    <YAxis dataKey="salle" type="category" width={110} tick={{ fontSize: 11, fill: '#334155' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: '#F1F5F9' }}
                      contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
                      formatter={(value) => [`${value} h`, 'Occupation']}
                    />
                    <Bar dataKey="heures" fill="#1E293B" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-ink-900 mb-1">Heures de pointe</h3>
              <p className="text-xs text-ink-500 mb-4">Nombre de reservations confirmees par heure de la journee</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={heuresPointeData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="heure" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} interval={1} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: '#F1F5F9' }}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
                    formatter={(value) => [value, 'Reservations']}
                  />
                  <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-ink-900 mb-1">Reservations par profil</h3>
              <p className="text-xs text-ink-500 mb-4">Repartition Enseignants / Etudiants et associations</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.parRole} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="role" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                  <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
                  <Bar dataKey="count" fill="#1E293B" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-ink-900 mb-1">Repartition par statut</h3>
              <p className="text-xs text-ink-500 mb-4">Vue d'ensemble de toutes les reservations</p>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={stats.parStatut.filter((s) => s.count > 0)}
                    dataKey="count"
                    nameKey="statut"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {stats.parStatut
                      .filter((s) => s.count > 0)
                      .map((entry) => (
                        <Cell key={entry.statut} fill={STATUS_COLORS[entry.statut]} />
                      ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
                    formatter={(value, _name, entry) => [value, statusLabel(entry.payload.statut)]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {stats.parStatut
                  .filter((s) => s.count > 0)
                  .map((s) => (
                    <span key={s.statut} className="flex items-center gap-1.5 text-xs text-ink-500">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[s.statut] }} />
                      {statusLabel(s.statut)} ({s.count})
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'donnees' && (
        <div className="card overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-ink-200">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-ink-500 uppercase tracking-wide" htmlFor="statut-filter">
                Filtrer
              </label>
              <select
                id="statut-filter"
                className="input w-auto"
                value={statutFilter}
                onChange={(e) => setStatutFilter(e.target.value)}
              >
                <option value="all">Tous les statuts</option>
                <option value="confirmee">Confirmees</option>
                <option value="en_attente">En attente</option>
                <option value="refusee">Refusees</option>
                <option value="annulee">Annulees</option>
              </select>
            </div>
            <button className="btn-primary" onClick={handleExport}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Exporter en CSV ({filteredReservations.length})
            </button>
          </div>

          {filteredReservations.length === 0 ? (
            <EmptyState title="Aucune reservation pour ce filtre" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-ink-100/60 text-xs font-semibold text-ink-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5">Salle</th>
                    <th className="text-left px-4 py-2.5">Demandeur</th>
                    <th className="text-left px-4 py-2.5">Date</th>
                    <th className="text-left px-4 py-2.5">Creneau</th>
                    <th className="text-left px-4 py-2.5">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {filteredReservations.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2.5 font-medium text-ink-900">{r.salleNom || 'Salle supprimee'}</td>
                      <td className="px-4 py-2.5 text-ink-700">{r.userName}</td>
                      <td className="px-4 py-2.5 text-ink-700">{formatDateShort(r.date)}</td>
                      <td className="px-4 py-2.5 text-ink-700">
                        {r.heureDebut}–{r.heureFin}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={r.statut} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'emails' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-ink-200">
            <h3 className="text-sm font-semibold text-ink-900">Journal des notifications envoyees</h3>
            <p className="text-xs text-ink-500 mt-0.5">
              Simulation du service SMTP (TECH-04) declenche a chaque changement de statut. Les
              entrees sont egalement journalisees dans la table logs_emails.
            </p>
          </div>
          {emails.length === 0 ? (
            <EmptyState title="Aucun email envoye pour le moment" />
          ) : (
            <ul className="divide-y divide-ink-100">
              {emails.map((mail) => (
                <li key={mail.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-900">{mail.subject}</p>
                    <p className="text-xs text-ink-500 shrink-0">
                      {new Date(mail.sentAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <p className="text-xs text-ink-500 mt-0.5">A : {mail.to}</p>
                  <p className="text-sm text-ink-700 mt-1.5 whitespace-pre-line">{mail.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

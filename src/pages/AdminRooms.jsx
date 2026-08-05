import { useEffect, useState } from 'react'
import { getRooms, createRoom, updateRoom, deleteRoom } from '../lib/db.js'
import { useDBVersion } from '../lib/useStore.js'
import { useToast } from '../lib/toast.jsx'
import Modal from '../components/Modal.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { EQUIPMENT_LABELS, classNames } from '../lib/utils.js'

const EQUIPMENT_OPTIONS = Object.keys(EQUIPMENT_LABELS)
const EMPTY_FORM = { name: '', batiment: '', etage: '', capacite: '', equipements: [], notes: '' }

export default function AdminRooms() {
  const version = useDBVersion()
  const { push } = useToast()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [toDelete, setToDelete] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const list = await getRooms({ includeInactive: false })
        if (!cancelled) setRooms(list)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Erreur de chargement')
          setRooms([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [version])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (room) => {
    setEditingId(room.id)
    setForm({
      name: room.name,
      batiment: room.batiment || '',
      etage: String(room.etage ?? ''),
      capacite: String(room.capacite),
      equipements: [...room.equipements],
      notes: room.notes || '',
    })
    setFormOpen(true)
  }

  const toggleEq = (eq) => {
    setForm((f) => ({
      ...f,
      equipements: f.equipements.includes(eq)
        ? f.equipements.filter((e) => e !== eq)
        : [...f.equipements, eq],
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.capacite) {
      push('Nom et capacite sont obligatoires.', 'error')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await updateRoom(editingId, form)
        push(`Salle « ${form.name} » mise a jour.`, 'success')
      } else {
        await createRoom(form)
        push(`Salle « ${form.name} » creee.`, 'success')
      }
      setFormOpen(false)
    } catch (err) {
      push(err.message || 'Erreur lors de l\'enregistrement', 'error')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setSaving(true)
    try {
      await deleteRoom(toDelete.id)
      push(
        `Salle « ${toDelete.name} » desactivee (ou supprimee si aucun historique).`,
        'success',
      )
      setToDelete(null)
    } catch (err) {
      push(err.message || 'Erreur lors de la suppression', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink-900">Gestion des salles</h1>
          <p className="text-sm text-ink-500 mt-1">
            Creer, modifier ou desactiver les salles du referentiel (US-10).
          </p>
        </div>
        <button className="btn-primary shrink-0" onClick={openCreate}>
          Nouvelle salle
        </button>
      </div>

      {error && (
        <div className="card p-4 text-sm text-rose-text bg-rose-soft">{error}</div>
      )}

      {loading ? (
        <div className="card p-8 text-center text-sm text-ink-500">Chargement...</div>
      ) : rooms.length === 0 ? (
        <div className="card">
          <EmptyState title="Aucune salle active" description="Creez la premiere salle." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1.4fr_1fr_0.6fr_0.6fr_1.4fr_0.9fr] gap-3 px-4 py-2.5 bg-ink-100/60 text-xs font-semibold text-ink-500 uppercase tracking-wide">
            <span>Nom</span>
            <span>Batiment</span>
            <span>Etage</span>
            <span>Capacite</span>
            <span>Equipements</span>
            <span className="text-right">Actions</span>
          </div>
          <ul className="divide-y divide-ink-100">
            {rooms.map((room) => (
              <li
                key={room.id}
                className="px-4 py-3 grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_0.6fr_0.6fr_1.4fr_0.9fr] gap-1.5 sm:gap-3 sm:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-ink-900">{room.name}</p>
                  {room.notes && <p className="text-xs text-ink-500">{room.notes}</p>}
                </div>
                <p className="text-sm text-ink-700">{room.batiment}</p>
                <p className="text-sm text-ink-700">{room.etage}</p>
                <p className="text-sm text-ink-700">{room.capacite}</p>
                <div className="flex flex-wrap gap-1">
                  {room.equipements.map((eq) => (
                    <span key={eq} className="badge bg-ink-100 text-ink-500 text-[11px]">
                      {EQUIPMENT_LABELS[eq] || eq}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 sm:justify-end">
                  <button className="btn-secondary text-xs" onClick={() => openEdit(room)}>
                    Modifier
                  </button>
                  <button className="btn-danger text-xs" onClick={() => setToDelete(room)}>
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Modifier la salle' : 'Nouvelle salle'}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="r-name">
              Nom *
            </label>
            <input
              id="r-name"
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="r-bat">
                Batiment
              </label>
              <input
                id="r-bat"
                className="input"
                value={form.batiment}
                onChange={(e) => setForm((f) => ({ ...f, batiment: e.target.value }))}
              />
            </div>
            <div>
              <label className="label" htmlFor="r-etage">
                Etage
              </label>
              <input
                id="r-etage"
                type="number"
                className="input"
                value={form.etage}
                onChange={(e) => setForm((f) => ({ ...f, etage: e.target.value }))}
              />
            </div>
            <div>
              <label className="label" htmlFor="r-cap">
                Capacite *
              </label>
              <input
                id="r-cap"
                type="number"
                min="1"
                className="input"
                value={form.capacite}
                onChange={(e) => setForm((f) => ({ ...f, capacite: e.target.value }))}
                required
              />
            </div>
          </div>
          <div>
            <label className="label mb-2">Equipements</label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((eq) => (
                <button
                  key={eq}
                  type="button"
                  onClick={() => toggleEq(eq)}
                  className={classNames(
                    'px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
                    form.equipements.includes(eq)
                      ? 'bg-accent text-white border-accent'
                      : 'bg-white text-ink-700 border-ink-200 hover:bg-ink-100',
                  )}
                >
                  {EQUIPMENT_LABELS[eq]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="r-notes">
              Notes
            </label>
            <textarea
              id="r-notes"
              className="input min-h-[60px]"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Creer'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Supprimer la salle">
        {toDelete && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-700">
              Confirmez-vous la suppression de <span className="font-semibold">{toDelete.name}</span> ?
              Si la salle a un historique de reservations, elle sera desactivee (suppression logique)
              afin de preserver l'integrite referentielle.
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setToDelete(null)} disabled={saving}>
                Retour
              </button>
              <button className="btn-danger" onClick={confirmDelete} disabled={saving}>
                {saving ? 'Suppression...' : 'Confirmer'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

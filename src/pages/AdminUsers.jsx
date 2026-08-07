import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { useAuth, ROLE_LABELS } from '../lib/auth.jsx'
import { useToast } from '../lib/toast.jsx'
import Modal from '../components/Modal.jsx'
import EmptyState from '../components/EmptyState.jsx'

const ROLE_OPTIONS = [
  { value: 'enseignant', label: 'Enseignant' },
  { value: 'etudiant', label: 'Etudiant / Association' },
  { value: 'admin', label: 'Service Logistique' },
]

const emptyForm = { name: '', email: '', password: '', role: 'etudiant' }

export default function AdminUsers() {
  const { currentUser } = useAuth()
  const { push } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState({ role: '', actif: true, password: '', name: '' })

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await api.get('/api/users?includeInactive=1')
      setUsers(list)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/users', form)
      push('Utilisateur cree.', 'success')
      setShowCreate(false)
      setForm(emptyForm)
      await load()
    } catch (err) {
      push(err.message || 'Erreur a la creation.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (u) => {
    setEditUser(u)
    setEditForm({ role: u.role, actif: u.actif, password: '', name: u.name })
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    if (!editUser) return
    setSaving(true)
    try {
      const payload = { name: editForm.name, role: editForm.role, actif: editForm.actif }
      if (editForm.password) payload.password = editForm.password
      await api.patch(`/api/users/${editUser.id}`, payload)
      push('Utilisateur mis a jour.', 'success')
      setEditUser(null)
      await load()
    } catch (err) {
      push(err.message || 'Erreur de mise a jour.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActif = async (u) => {
    if (u.id === currentUser?.id) {
      push('Vous ne pouvez pas desactiver votre propre compte.', 'error')
      return
    }
    try {
      await api.patch(`/api/users/${u.id}`, { actif: !u.actif })
      push(u.actif ? 'Compte desactive.' : 'Compte reactive.', 'success')
      await load()
    } catch (err) {
      push(err.message, 'error')
    }
  }

  if (loading) return <p className="text-ink-500 text-sm">Chargement des utilisateurs...</p>
  if (error) return <div className="card p-4 text-red-700 text-sm">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Utilisateurs</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Creer des comptes, attribuer les roles, activer ou desactiver un acces.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          Ajouter un utilisateur
        </button>
      </div>

      {users.length === 0 ? (
        <EmptyState title="Aucun utilisateur" description="Creez le premier compte." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3 font-semibold">Nom</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-ink-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-ink-900">{u.name}</td>
                    <td className="px-4 py-3 text-ink-600">{u.email}</td>
                    <td className="px-4 py-3">{ROLE_LABELS[u.role] || u.role}</td>
                    <td className="px-4 py-3">
                      <span className={u.actif
                        ? 'inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700'
                        : 'inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-ink-100 text-ink-500'}>
                        {u.actif ? 'Actif' : 'Desactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button className="btn-ghost text-xs" onClick={() => openEdit(u)}>Modifier</button>
                      <button className="btn-ghost text-xs" onClick={() => toggleActif(u)} disabled={u.id === currentUser?.id}>
                        {u.actif ? 'Desactiver' : 'Reactiver'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvel utilisateur">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nom</label>
            <input className="input w-full" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" className="input w-full" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mot de passe initial</label>
            <input type="password" className="input w-full" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select className="input w-full" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creation...' : 'Creer'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(editUser)} onClose={() => setEditUser(null)} title="Modifier l'utilisateur">
        {editUser && (
          <form onSubmit={handleEdit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nom</label>
              <input className="input w-full" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <p className="text-xs text-ink-500">{editUser.email}</p>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select className="input w-full" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nouveau mot de passe (optionnel)</label>
              <input type="password" className="input w-full" minLength={6} value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Laisser vide pour ne pas changer" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editForm.actif} onChange={(e) => setEditForm({ ...editForm, actif: e.target.checked })} disabled={editUser.id === currentUser?.id} />
              Compte actif
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setEditUser(null)}>Annuler</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

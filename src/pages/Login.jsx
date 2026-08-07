import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'

export default function Login() {
  const { login, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-500 text-sm">Chargement...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email.trim(), password)
      if (user.role === 'admin') {
        navigate('/admin/tableau-de-bord', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex w-12 h-12 rounded-xl bg-accent items-center justify-center mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 21V7a2 2 0 012-2h12a2 2 0 012 2v14M4 21h16M4 21v-4a2 2 0 012-2h2a2 2 0 012 2v4m4 0v-4a2 2 0 012-2h2a2 2 0 012 2v4"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-ink-900">SalleLibre</h1>
            <p className="text-sm text-ink-500 mt-1">
              Connectez-vous pour reserver une salle
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                className="input w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@etablissement.fr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1" htmlFor="password">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="input w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-500">
            Pas de compte ? Contactez le service Logistique pour obtenir un acces.
          </p>
        </div>
      </div>
    </div>
  )
}

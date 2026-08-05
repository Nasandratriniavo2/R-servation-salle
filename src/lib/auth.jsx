import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getUsers } from './db.js'
import { getCurrentUserId, setCurrentUserId } from './store.js'
import { useDBVersion } from './useStore.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const version = useDBVersion()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const list = await getUsers()
        if (!cancelled) {
          setUsers(list)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[Auth] Impossible de charger les utilisateurs :', err)
          setError(err.message || 'Erreur de connexion a la base')
          setUsers([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [version])

  const currentUserId = getCurrentUserId()
  const currentUser = users.find((u) => u.id === currentUserId) || users[0] || null

  const switchUser = (userId) => {
    setCurrentUserId(userId)
  }

  const value = useMemo(
    () => ({
      currentUser,
      users,
      switchUser,
      loading,
      error,
      isAdmin: currentUser?.role === 'admin',
      isEnseignant: currentUser?.role === 'enseignant',
      isEtudiant: currentUser?.role === 'etudiant',
    }),
    [currentUser, users, loading, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit etre utilise dans un AuthProvider')
  return ctx
}

export const ROLE_LABELS = {
  enseignant: 'Enseignant',
  etudiant: 'Etudiant / Association',
  admin: 'Service Logistique',
}

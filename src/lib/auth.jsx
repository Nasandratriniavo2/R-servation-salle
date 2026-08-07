import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadMe = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setCurrentUser(null)
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const data = await api.get('/api/auth/me')
      setCurrentUser(data.user)
      setError(null)
    } catch (err) {
      console.error('[Auth] Session invalide :', err)
      setToken(null)
      setCurrentUser(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMe()
  }, [loadMe])

  const login = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password })
    setToken(data.token)
    setCurrentUser(data.user)
    setError(null)
    return data.user
  }

  const logout = () => {
    setToken(null)
    setCurrentUser(null)
  }

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      error,
      login,
      logout,
      refresh: loadMe,
      isAuthenticated: Boolean(currentUser),
      isAdmin: currentUser?.role === 'admin',
      isEnseignant: currentUser?.role === 'enseignant',
      isEtudiant: currentUser?.role === 'etudiant',
    }),
    [currentUser, loading, error, loadMe],
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

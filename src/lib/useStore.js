import { useEffect, useState, useCallback } from 'react'
import { subscribe } from './store.js'

/**
 * Force le re-render des composants abonnes a chaque mutation
 * (changement d'utilisateur ou ecriture en base).
 * Les pages utilisent ensuite useEffect([version], ...) pour recharger les donnees.
 */
export function useDBVersion() {
  const [tick, setTick] = useState(0)
  const bump = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    const unsubscribe = subscribe(bump)
    return unsubscribe
  }, [bump])

  return tick
}

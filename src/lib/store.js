// Persistance legere : uniquement l'identifiant de l'utilisateur actif (mock auth)
// et un systeme de publication/abonnement pour forcer le rechargement des
// composants apres une mutation en base.

const CURRENT_USER_KEY = 'sallelibre_current_user_id'

const listeners = new Set()

export function subscribe(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function emit() {
  listeners.forEach((cb) => cb())
}

/** UUID de l'utilisateur mock actuellement selectionne. */
export function getCurrentUserId() {
  return (
    localStorage.getItem(CURRENT_USER_KEY) ||
    '00000000-0000-0000-0000-000000000001'
  )
}

export function setCurrentUserId(id) {
  localStorage.setItem(CURRENT_USER_KEY, id)
  emit()
}

/** Declenche un re-fetch global apres une ecriture en base. */
export function notifyDataChange() {
  emit()
}

// Pub/sub leger : force le rechargement des pages apres une mutation en base.

const listeners = new Set()

export function subscribe(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function emit() {
  listeners.forEach((cb) => cb())
}

/** Declenche un re-fetch global apres une ecriture en base. */
export function notifyDataChange() {
  emit()
}

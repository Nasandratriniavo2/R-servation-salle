/**
 * Client HTTP vers l'API Express (MySQL).
 * En dev, Vite proxy /api -> http://localhost:3001
 */
const BASE = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  let body = null
  const text = await res.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: text }
    }
  }

  if (!res.ok) {
    const message = body?.error || body?.message || `Erreur HTTP ${res.status}`
    const err = new Error(message)
    err.status = res.status
    err.body = body
    throw err
  }

  return body
}

export const api = {
  get: (path) => request(path),
  post: (path, data) =>
    request(path, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  put: (path, data) =>
    request(path, { method: 'PUT', body: JSON.stringify(data ?? {}) }),
  delete: (path) => request(path, { method: 'DELETE' }),
}

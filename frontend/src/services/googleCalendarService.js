import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

async function authedFetch(path, opts = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(`${API_BASE}/api/google-calendar${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Error ${res.status}`)
  }
  return res.status === 204 ? null : res.json()
}

export async function getConnectionStatus(proyectoId) {
  return authedFetch(`/${proyectoId}/status`)
}

// Redirige la pestaña al consentimiento de Google — mismo patrón que
// initiateLogin() en spotifyService.js (window.location.href completo).
export async function startConnect(proyectoId) {
  const { authUrl } = await authedFetch(`/${proyectoId}/oauth/start`)
  window.location.href = authUrl
}

export async function syncNow(proyectoId) {
  return authedFetch(`/${proyectoId}/sync-now`, { method: 'POST' })
}

export async function disconnect(proyectoId) {
  return authedFetch(`/${proyectoId}`, { method: 'DELETE' })
}

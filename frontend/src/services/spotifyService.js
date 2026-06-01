// Spotify PKCE OAuth + Web API + Web Playback SDK
// Docs: https://developer.spotify.com/documentation/web-api

const CLIENT_ID   = import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''
const REDIRECT_URI = `${window.location.origin}/callback`
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
].join(' ')

const SK = {
  TOKEN:    'sp_token',
  REFRESH:  'sp_refresh',
  EXPIRES:  'sp_expires',
  VERIFIER: 'sp_verifier',
}

// ── PKCE helpers ─────────────────────────────────────────────
function randomString(len) {
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '').slice(0, len)
}

async function sha256b64url(str) {
  const data = new TextEncoder().encode(str)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// ── Auth ─────────────────────────────────────────────────────
export async function initiateLogin() {
  if (!CLIENT_ID) throw new Error('VITE_SPOTIFY_CLIENT_ID no configurado en .env.local')
  const verifier  = randomString(64)
  const challenge = await sha256b64url(verifier)
  localStorage.setItem(SK.VERIFIER, verifier)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })
  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

export async function exchangeCode(code) {
  const verifier = localStorage.getItem(SK.VERIFIER)
  if (!verifier) throw new Error('Verifier no encontrado — intenta de nuevo')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error_description || `Error ${res.status}`)
  }
  const data = await res.json()
  _saveTokens(data)
  localStorage.removeItem(SK.VERIFIER)
  return data.access_token
}

function _saveTokens({ access_token, refresh_token, expires_in }) {
  localStorage.setItem(SK.TOKEN,   access_token)
  if (refresh_token) localStorage.setItem(SK.REFRESH, refresh_token)
  localStorage.setItem(SK.EXPIRES, Date.now() + expires_in * 1000)
}

async function _doRefresh() {
  const refresh = localStorage.getItem(SK.REFRESH)
  if (!refresh) return null
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh,
      client_id: CLIENT_ID,
    }),
  })
  if (!res.ok) { disconnectSpotify(); return null }
  const data = await res.json()
  _saveTokens(data)
  return data.access_token
}

export async function getToken() {
  const token   = localStorage.getItem(SK.TOKEN)
  const expires = Number(localStorage.getItem(SK.EXPIRES))
  if (!token) return null
  if (Date.now() > expires - 300_000) return _doRefresh()
  return token
}

export function isConnected() {
  return !!localStorage.getItem(SK.TOKEN)
}

export function disconnectSpotify() {
  Object.values(SK).forEach(k => localStorage.removeItem(k))
  if (_player) { _player.disconnect(); _player = null }
}

// ── Web API ──────────────────────────────────────────────────
async function api(path, opts = {}) {
  const token = await getToken()
  if (!token) throw new Error('No autenticado con Spotify')
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  })
  if (res.status === 204) return null
  if (res.status === 401) { disconnectSpotify(); throw new Error('Sesión expirada') }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error?.message || `Spotify error ${res.status}`)
  }
  return res.json()
}

export const getMe        = ()          => api('/me')
export const getPlaylists = ()          => api('/me/playlists?limit=50').then(d => d?.items || [])
export const getPlayback  = ()          => api('/me/player?market=ES')
export const pauseApi     = (deviceId)  => api(`/me/player/pause${_dq(deviceId)}`,    { method: 'PUT'  })
export const resumeApi    = (deviceId)  => api(`/me/player/play${_dq(deviceId)}`,     { method: 'PUT'  })
export const nextApi      = (deviceId)  => api(`/me/player/next${_dq(deviceId)}`,     { method: 'POST' })
export const prevApi      = (deviceId)  => api(`/me/player/previous${_dq(deviceId)}`, { method: 'POST' })
export const setVolumeApi = (pct, deviceId) =>
  api(`/me/player/volume?volume_percent=${pct}${deviceId ? `&device_id=${deviceId}` : ''}`, { method: 'PUT' })

export async function playPlaylist(contextUri, deviceId) {
  return api(`/me/player/play${_dq(deviceId)}`, {
    method: 'PUT',
    body: JSON.stringify({ context_uri: contextUri }),
  })
}

function _dq(deviceId) { return deviceId ? `?device_id=${deviceId}` : '' }

// ── Web Playback SDK ─────────────────────────────────────────
let _player  = null
let _sdkReady = false

export function loadSDK() {
  if (_sdkReady || window.Spotify) return Promise.resolve()
  return new Promise(resolve => {
    window.onSpotifyWebPlaybackSDKReady = () => { _sdkReady = true; resolve() }
    const s   = document.createElement('script')
    s.src     = 'https://sdk.scdn.co/spotify-player.js'
    s.onerror = () => resolve()
    document.head.appendChild(s)
  })
}

export async function initSDKPlayer({ onReady, onStateChange, onError }) {
  await loadSDK()
  if (!window.Spotify?.Player) { onError?.('SDK no disponible'); return null }

  if (_player) {
    try { _player.disconnect() } catch (_) {}
    _player = null
  }

  _player = new window.Spotify.Player({
    name: 'KAIROS',
    getOAuthToken: async cb => { cb((await getToken()) || '') },
    volume: 0.65,
  })

  _player.addListener('ready',                ({ device_id }) => onReady?.(device_id))
  _player.addListener('not_ready',            ()              => onReady?.(null))
  _player.addListener('player_state_changed', state           => onStateChange?.(state))
  _player.addListener('initialization_error', ({ message })   => onError?.(message))
  _player.addListener('authentication_error', ({ message })   => onError?.(message))
  _player.addListener('account_error',        ()              => onError?.('Se requiere Spotify Premium'))

  const ok = await _player.connect()
  return ok ? _player : null
}

export function getSDKPlayer() { return _player }

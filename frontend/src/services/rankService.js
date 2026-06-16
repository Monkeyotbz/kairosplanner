import { getMySessions } from './statsService'

// Escalera de rangos Kairós — por horas de flow acumuladas.
export const RANKS = [
  { name: 'Iniciado',            minHours: 0,   icon: '◔', color: '#9ca3af' },
  { name: 'Aprendiz',           minHours: 1,   icon: '◑', color: '#7F77DD' },
  { name: 'Enfocado',           minHours: 5,   icon: '◕', color: '#534AB7' },
  { name: 'Artesano del Tiempo', minHours: 15,  icon: '✦', color: '#378ADD' },
  { name: 'Guardián del Kairós', minHours: 40,  icon: '❂', color: '#f59e0b' },
  { name: 'Maestro del Kairós',  minHours: 100, icon: '☀', color: '#fbbf24' },
]

// minutos acumulados -> { current, next, progress, xpInRank, xpForNext, minToNext }
export function computeRank(totalMinutes) {
  const totalHours = totalMinutes / 60
  let idx = 0
  for (let i = 0; i < RANKS.length; i++) {
    if (totalHours >= RANKS[i].minHours) idx = i
  }
  const current = RANKS[idx]
  const next = RANKS[idx + 1] || null
  const curMin = current.minHours * 60
  const nextMin = next ? next.minHours * 60 : null
  const xpInRank  = Math.round(totalMinutes - curMin)
  const xpForNext = next ? Math.round(nextMin - curMin) : null
  const progress  = next ? Math.min(1, (totalMinutes - curMin) / (nextMin - curMin)) : 1
  const minToNext = next ? Math.max(0, Math.ceil(nextMin - totalMinutes)) : 0
  return {
    current, next, progress, xpInRank, xpForNext, minToNext,
    totalMinutes: Math.round(totalMinutes),
    totalHours: parseFloat(totalHours.toFixed(1)),
  }
}

// Días consecutivos (hasta hoy) con al menos una sesión completada.
export function computeStreak(sessions, includeToday = false) {
  const days = new Set(sessions.map(s => new Date(s.inicio).toDateString()))
  if (includeToday) days.add(new Date().toDateString())
  let streak = 0
  const d = new Date()
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1) // gracia: aún cuenta desde ayer
  while (days.has(d.toDateString())) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

const RANK_LS_KEY = 'kairos-rank-sessions'

export async function getFocusProgress({ excludeSessionId = null, earnedSeconds = 0 } = {}) {
  let sessions = []
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000)
    )
    sessions = await Promise.race([getMySessions(), timeout])
    // Persist for offline / timeout fallback (only for the base case)
    if (!excludeSessionId && !earnedSeconds) {
      try { localStorage.setItem(RANK_LS_KEY, JSON.stringify(sessions)) } catch (_) {}
    }
  } catch (e) {
    console.error('[rank] getMySessions falló:', e.message)
    // Use last-known sessions so the UI doesn't freeze with zeros
    try {
      const cached = JSON.parse(localStorage.getItem(RANK_LS_KEY) || 'null')
      if (Array.isArray(cached)) sessions = cached
    } catch (_) {}
  }

  const baseSeconds = sessions
    .filter(s => s.id !== excludeSessionId)
    .reduce((sum, s) => sum + (s.segundos_reales || 0), 0)

  const before = computeRank(baseSeconds / 60)
  const after  = computeRank((baseSeconds + earnedSeconds) / 60)
  const streak = computeStreak(sessions, earnedSeconds > 0)

  return {
    before,
    after,
    earnedMinutes: Math.max(0, Math.round(earnedSeconds / 60)),
    streak,
    leveledUp: after.current.name !== before.current.name,
  }
}

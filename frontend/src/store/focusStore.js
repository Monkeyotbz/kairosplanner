import { create } from 'zustand'
import { createSession, completeSession, cancelSession, createPausa, endPausa } from '../services/focusService'

const CHECKPOINT_KEY = 'kairos-focus-checkpoint'

export function saveCheckpoint(data) {
  try { localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(data)) } catch (_) {}
}
export function loadCheckpoint() {
  try { return JSON.parse(localStorage.getItem(CHECKPOINT_KEY)) } catch { return null }
}
export function clearCheckpoint() {
  try { localStorage.removeItem(CHECKPOINT_KEY) } catch (_) {}
}

// phase: 'idle' | 'active' | 'break' | 'complete'
export const useFocusStore = create((set, get) => ({
  phase: 'idle',
  session: null,
  currentPausa: null,
  tipo: 'libre',
  duracion_plan_min: null,
  proyecto_id: null,
  elapsedSeconds: 0,
  breakSeconds: 0,
  totalBreaks: 0,

  // Timing por ancla: elapsedSeconds = elapsedOffset + floor((now - startedAtMs) / 1000)
  // Esto hace el timer inmune al throttling de setInterval en tabs en segundo plano.
  startedAtMs: null,  // wall-clock ms cuando inició (o retomó) la fase activa
  elapsedOffset: 0,   // segundos acumulados antes de la fase activa actual

  // Modo Enfoque Inmersivo
  immersive: false,
  activeTask: null,

  startSession: async ({ tipo, duracion_plan_min, proyecto_id }) => {
    const session = await createSession({ tipo, duracion_plan_min, proyecto_id })
    const startedAtMs = Date.now()
    set({
      phase: 'active', session, tipo, duracion_plan_min, proyecto_id,
      elapsedSeconds: 0, totalBreaks: 0,
      startedAtMs, elapsedOffset: 0,
    })
    saveCheckpoint({ sessionId: session.id, startedAtMs, elapsedOffset: 0, savedAt: startedAtMs })
  },

  // Tick ancla: calcula el tiempo real desde el reloj de pared, no por conteo
  tick: () => set(s => {
    if (!s.startedAtMs) return {}
    return { elapsedSeconds: s.elapsedOffset + Math.floor((Date.now() - s.startedAtMs) / 1000) }
  }),

  tickBreak: () => set(s => ({ breakSeconds: s.breakSeconds + 1 })),

  enterImmersive: (task = null) => set(s => ({ immersive: true, activeTask: task ?? s.activeTask })),
  exitImmersive:  () => set({ immersive: false }),
  setActiveTask:  (task) => set({ activeTask: task }),

  startBreak: async () => {
    const { session, elapsedSeconds } = get()
    // Guardar los segundos acumulados y detener el ancla
    set(s => ({
      phase: 'break', breakSeconds: 0, totalBreaks: s.totalBreaks + 1,
      startedAtMs: null, elapsedOffset: elapsedSeconds,
    }))
    if (!session) return
    try {
      const pausa = await createPausa(session.id, 'corta')
      set({ currentPausa: pausa })
    } catch (e) { console.error('[focus] createPausa falló:', e.message) }
  },

  resumeSession: async (videoId = null) => {
    const { currentPausa, elapsedSeconds } = get()
    const startedAtMs = Date.now()
    // Reanudar el ancla desde los segundos actuales
    set({ phase: 'active', currentPausa: null, startedAtMs, elapsedOffset: elapsedSeconds })
    if (!currentPausa) return
    try { await endPausa(currentPausa.id, videoId) }
    catch (e) { console.error('[focus] endPausa falló:', e.message) }
  },

  finishSession: async () => {
    const { session, currentPausa } = get()
    set({ phase: 'complete', startedAtMs: null })
    clearCheckpoint()
    try {
      if (currentPausa) await endPausa(currentPausa.id)
      if (session) await completeSession(session.id)
    } catch (e) { console.error('[focus] completeSession falló:', e.message) }
  },

  abandonSession: async () => {
    const { session, currentPausa } = get()
    set({
      phase: 'idle', session: null, currentPausa: null,
      elapsedSeconds: 0, breakSeconds: 0, totalBreaks: 0,
      immersive: false, activeTask: null, startedAtMs: null, elapsedOffset: 0,
    })
    clearCheckpoint()
    try {
      if (currentPausa) await endPausa(currentPausa.id)
      if (session) await cancelSession(session.id)
    } catch (e) { console.error('[focus] cancelSession falló:', e.message) }
  },

  reset: () => set({
    phase: 'idle', session: null, currentPausa: null,
    elapsedSeconds: 0, breakSeconds: 0, totalBreaks: 0,
    immersive: false, activeTask: null, startedAtMs: null, elapsedOffset: 0,
  }),
}))

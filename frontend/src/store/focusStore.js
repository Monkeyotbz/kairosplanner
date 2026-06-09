import { create } from 'zustand'
import { createSession, completeSession, cancelSession, createPausa, endPausa } from '../services/focusService'

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

  // Modo Enfoque Inmersivo
  immersive: false,
  activeTask: null,   // { id, titulo, descripcion, prioridad, ... } tarjeta enfocada

  startSession: async ({ tipo, duracion_plan_min, proyecto_id }) => {
    const session = await createSession({ tipo, duracion_plan_min, proyecto_id })
    set({ phase: 'active', session, tipo, duracion_plan_min, proyecto_id, elapsedSeconds: 0, totalBreaks: 0 })
  },

  tick:      () => set(s => ({ elapsedSeconds: s.elapsedSeconds + 1 })),
  tickBreak: () => set(s => ({ breakSeconds: s.breakSeconds + 1 })),

  // Inmersivo: enfocar opcionalmente una tarjeta y ocultar todo el chrome
  enterImmersive: (task = null) => set(s => ({ immersive: true, activeTask: task ?? s.activeTask })),
  exitImmersive:  () => set({ immersive: false }),
  setActiveTask:  (task) => set({ activeTask: task }),

  // Optimista: la UI cambia de fase al instante; la DB se persiste en segundo
  // plano. Si Supabase falla, lo registramos pero NO bloqueamos el enfoque.
  startBreak: async () => {
    const { session } = get()
    set(s => ({ phase: 'break', breakSeconds: 0, totalBreaks: s.totalBreaks + 1 }))
    if (!session) return
    try {
      const pausa = await createPausa(session.id, 'corta')
      set({ currentPausa: pausa })
    } catch (e) { console.error('[focus] createPausa falló:', e.message) }
  },

  resumeSession: async (videoId = null) => {
    const { currentPausa } = get()
    set({ phase: 'active', currentPausa: null })
    if (!currentPausa) return
    try { await endPausa(currentPausa.id, videoId) }
    catch (e) { console.error('[focus] endPausa falló:', e.message) }
  },

  finishSession: async () => {
    const { session, currentPausa } = get()
    set({ phase: 'complete' })
    try {
      if (currentPausa) await endPausa(currentPausa.id)
      if (session) await completeSession(session.id)
    } catch (e) { console.error('[focus] completeSession falló:', e.message) }
  },

  abandonSession: async () => {
    const { session, currentPausa } = get()
    set({ phase: 'idle', session: null, currentPausa: null, elapsedSeconds: 0, breakSeconds: 0, totalBreaks: 0, immersive: false, activeTask: null })
    try {
      if (currentPausa) await endPausa(currentPausa.id)
      if (session) await cancelSession(session.id)
    } catch (e) { console.error('[focus] cancelSession falló:', e.message) }
  },

  reset: () => set({ phase: 'idle', session: null, currentPausa: null, elapsedSeconds: 0, breakSeconds: 0, totalBreaks: 0, immersive: false, activeTask: null }),
}))

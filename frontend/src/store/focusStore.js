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

  startSession: async ({ tipo, duracion_plan_min, proyecto_id }) => {
    const session = await createSession({ tipo, duracion_plan_min, proyecto_id })
    set({ phase: 'active', session, tipo, duracion_plan_min, proyecto_id, elapsedSeconds: 0, totalBreaks: 0 })
  },

  tick:      () => set(s => ({ elapsedSeconds: s.elapsedSeconds + 1 })),
  tickBreak: () => set(s => ({ breakSeconds: s.breakSeconds + 1 })),

  startBreak: async () => {
    const { session } = get()
    const pausa = await createPausa(session.id, 'corta')
    set(s => ({ phase: 'break', currentPausa: pausa, breakSeconds: 0, totalBreaks: s.totalBreaks + 1 }))
  },

  resumeSession: async (videoId = null) => {
    const { currentPausa } = get()
    if (currentPausa) await endPausa(currentPausa.id, videoId)
    set({ phase: 'active', currentPausa: null })
  },

  finishSession: async () => {
    const { session, currentPausa } = get()
    if (currentPausa) await endPausa(currentPausa.id)
    await completeSession(session.id)
    set({ phase: 'complete' })
  },

  abandonSession: async () => {
    const { session, currentPausa } = get()
    if (currentPausa) await endPausa(currentPausa.id)
    if (session) await cancelSession(session.id)
    set({ phase: 'idle', session: null, currentPausa: null, elapsedSeconds: 0, breakSeconds: 0, totalBreaks: 0 })
  },

  reset: () => set({ phase: 'idle', session: null, currentPausa: null, elapsedSeconds: 0, breakSeconds: 0, totalBreaks: 0 }),
}))

import { create } from 'zustand'

// Estado visible de la cola de escrituras (SyncIndicator).
// phase: 'idle' (nada pendiente) | 'saving' (vaciando cola) | 'waiting' (sin conexión, reintentando)
export const useSyncStore = create((set) => ({
  pending: 0,
  phase: 'idle',
  savedFlash: false,

  _update: (pending, phase) => set({ pending, phase }),
  _flashSaved: () => {
    set({ savedFlash: true })
    setTimeout(() => set({ savedFlash: false }), 2500)
  },
}))

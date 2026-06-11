import { create } from 'zustand'

const DONE_KEY = 'kairos-profile-done'

export function isPerfilDone() {
  try { return !!localStorage.getItem(DONE_KEY) } catch { return false }
}

export const usePerfilKairosStore = create((set) => ({
  isOpen: false,

  open: () => set({ isOpen: true }),

  close: () => {
    try { localStorage.setItem(DONE_KEY, '1') } catch (_) {}
    set({ isOpen: false })
  },
}))

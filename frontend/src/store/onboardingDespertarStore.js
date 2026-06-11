import { create } from 'zustand'

const DONE_KEY = 'kairos-despertar-done'

// Considera "hecho" si completó el nuevo Despertar O el onboarding anterior
function isDone() {
  try {
    return !!localStorage.getItem(DONE_KEY) || !!localStorage.getItem('kairos-onboarded')
  } catch { return false }
}

export function marcarDespertarDone() {
  try { localStorage.setItem(DONE_KEY, '1') } catch (_) {}
}

export const useOnboardingDespertarStore = create((set) => ({
  isOpen: !isDone(),
  open:  () => set({ isOpen: true }),
  close: () => {
    marcarDespertarDone()
    set({ isOpen: false })
  },
}))

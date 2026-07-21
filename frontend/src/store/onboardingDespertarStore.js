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

// Desactivado temporalmente (jul-19): no debe aparecer solo para perfiles
// nuevos mientras se revisa el flujo. Se puede seguir probando en
// /onboarding-preview (modo preview, no usa este store). Para reactivar
// el auto-disparo, volver a: isOpen: !isDone()
export const useOnboardingDespertarStore = create((set) => ({
  isOpen: false,
  open:  () => set({ isOpen: true }),
  close: () => {
    marcarDespertarDone()
    set({ isOpen: false })
  },
}))

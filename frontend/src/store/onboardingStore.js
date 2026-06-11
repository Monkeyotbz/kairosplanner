import { create } from 'zustand'
import { usePerfilKairosStore, isPerfilDone } from './perfilKairosStore'

const KEY = 'kairos-onboarded'

function seen() {
  try { return !!localStorage.getItem(KEY) } catch { return false }
}

export const useOnboardingStore = create((set) => ({
  // Se abre solo la primera vez (si nunca se ha visto)
  isOpen: !seen(),

  // Re-disparable (para feedback / volver a verlo)
  open:  () => set({ isOpen: true }),
  close: () => {
    const firstTime = !seen()
    try { localStorage.setItem(KEY, '1') } catch (_) {}
    set({ isOpen: false })
    // Tras el primer onboarding, lanzar la conversación de perfil si no se ha hecho
    if (firstTime && !isPerfilDone()) {
      usePerfilKairosStore.getState().open()
    }
  },
}))

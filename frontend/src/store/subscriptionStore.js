import { create } from 'zustand'
import { getSubscriptionInfo } from '../services/subscriptionService'

export const useSubscriptionStore = create((set) => ({
  info:    null,
  loading: true,

  load: async () => {
    set({ loading: true })
    try {
      const info = await getSubscriptionInfo()
      set({ info, loading: false })
    } catch (_) {
      // Error de red → no bloquear al usuario (fail-open)
      set({ info: null, loading: false })
    }
  },
}))

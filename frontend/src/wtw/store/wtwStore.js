import { create } from 'zustand'

const TOKEN_KEY = 'kairos-wtw-ms-token'

export const useWTWStore = create((set, get) => ({
  msToken: null,
  msUser: null,
  isConnected: false,

  init() {
    try {
      const raw = localStorage.getItem(TOKEN_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      if (data.expires_at && Date.now() > data.expires_at) {
        localStorage.removeItem(TOKEN_KEY)
        return
      }
      set({ msToken: data.access_token, msUser: data.user, isConnected: true })
    } catch (_) {
      localStorage.removeItem(TOKEN_KEY)
    }
  },

  setToken(data) {
    const payload = {
      access_token: data.access_token,
      user:         data.user,
      expires_at:   Date.now() + (data.expires_in || 3600) * 1000,
    }
    localStorage.setItem(TOKEN_KEY, JSON.stringify(payload))
    set({ msToken: data.access_token, msUser: data.user, isConnected: true })
  },

  disconnect() {
    localStorage.removeItem(TOKEN_KEY)
    set({ msToken: null, msUser: null, isConnected: false })
  },
}))

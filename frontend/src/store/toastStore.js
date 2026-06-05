import { create } from 'zustand'

let nextId = 1

export const useToastStore = create((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = nextId++
    set(s => ({ toasts: [...s.toasts, { id, ...toast }] }))
    const duration = toast.duration ?? 7000
    if (duration > 0) {
      setTimeout(() => {
        set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
      }, duration)
    }
    return id
  },

  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

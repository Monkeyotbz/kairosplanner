import { create } from 'zustand'

// Historial persistido en localStorage (sin middleware — patrón manual de KAIROS)
const KEY = 'kairos-abad-chat'
function loadMessages() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function saveMessages(msgs) {
  try { localStorage.setItem(KEY, JSON.stringify(msgs.slice(-50))) } catch (_) {}
}

let nextId = 1

export const useAbadStore = create((set) => ({
  isOpen: false,
  thinking: false,
  messages: loadMessages(),   // { id, role: 'user' | 'abad', text }

  open:   () => set({ isOpen: true }),
  close:  () => set({ isOpen: false }),
  toggle: () => set(s => ({ isOpen: !s.isOpen })),
  setThinking: (v) => set({ thinking: v }),

  addMessage: (role, text, toolMeta = null) => set(s => {
    const msg = { id: `${Date.now()}-${nextId++}`, role, text }
    if (toolMeta) msg.toolMeta = toolMeta
    const messages = [...s.messages, msg]
    saveMessages(messages)
    return { messages }
  }),

  clear: () => { saveMessages([]); set({ messages: [] }) },
}))

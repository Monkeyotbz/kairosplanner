import { create } from 'zustand'
import { supabase } from '../services/supabase'

async function fetchProfile(userId) {
  const { data } = await supabase
    .from('usuarios')
    .select('id, email, nombre, avatar_url')
    .eq('id', userId)
    .single()
  return data || null
}

export const useAuthStore = create((set) => ({
  user:    null,
  profile: null,
  loading: true,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const profile = session?.user ? await fetchProfile(session.user.id) : null
    set({ user: session?.user ?? null, profile, loading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = session?.user ? await fetchProfile(session.user.id) : null
      set({ user: session?.user ?? null, profile })
    })
  },

  setUser:    (user)    => set({ user }),
  clearUser:  ()        => set({ user: null }),
  setProfile: (profile) => set({ profile }),
}))

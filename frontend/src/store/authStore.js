import { create } from 'zustand'
import { supabase, withTimeout } from '../services/supabase'

async function fetchProfile(userId) {
  try {
    const { data } = await withTimeout(
      supabase
        .from('usuarios')
        .select('id, email, nombre, avatar_url')
        .eq('id', userId)
        .single(),
      8000, 'fetchProfile'
    )
    return data || null
  } catch (err) {
    console.error('[auth] fetchProfile falló:', err)
    return null
  }
}

export const useAuthStore = create((set) => ({
  user:    null,
  profile: null,
  loading: true,

  init: async () => {
    try {
      const { data: { session } } = await withTimeout(supabase.auth.getSession(), 8000, 'getSession')
      const profile = session?.user ? await fetchProfile(session.user.id) : null
      set({ user: session?.user ?? null, profile, loading: false })
    } catch (err) {
      console.error('[auth] init falló:', err)
      set({ user: null, profile: null, loading: false })
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = session?.user ? await fetchProfile(session.user.id) : null
      set({ user: session?.user ?? null, profile })
    })
  },

  setUser:    (user)    => set({ user }),
  clearUser:  ()        => set({ user: null }),
  setProfile: (profile) => set({ profile }),
}))
